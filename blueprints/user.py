from flask import Blueprint, request, jsonify
import logging
from db import get_db_connection
from config import SECRET_KEY
from .auth import decrypt_aes, decrypt_deterministic, encrypt_deterministic

user_bp = Blueprint('user', __name__, url_prefix='/user')
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# 첫 로그인 사용자 목록 조회
@user_bp.route('/get_pending_users', methods=['GET', 'OPTIONS'])
def get_pending_users():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'})
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500
        cursor = conn.cursor(dictionary=True)
        sql = """
            SELECT id, name, position, department, phone_number 
            FROM tb_user 
            WHERE first_login_yn = 'N' AND is_delete_yn = 'N'"""
        cursor.execute(sql)
        logger.info(f"[SQL/SELECT] tb_user /get_pending_users{sql}")

        pending_users = cursor.fetchall()
        
        return jsonify({'users': pending_users}), 200
    except Exception as e:
        print(f"미승인 사용자 목록 가져오기 오류: {e}")
        return jsonify({'message': '미승인 사용자 목록 가져오기 오류'}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass

# 모든 사용자 목록 조회
@user_bp.route('/get_users', methods=['GET'])
def get_users():
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500
        cursor = conn.cursor(dictionary=True)
        sql = """
            SELECT 
                tu.id, 
                tu.name, 
                tu.position, 
                td.dpr_nm AS department_name,  -- 부서명 가져오기
                td.team_nm AS team_name,  -- 팀명 가져오기
                tu.phone_number, 
                tu.role_id, 
                tu.status, 
                ts.comment, 
                tu.first_login_yn 
            FROM tb_user AS tu 
            LEFT JOIN tb_status AS ts ON tu.status = ts.id
            LEFT JOIN tb_department AS td ON tu.department = td.dpr_id  -- 부서 매핑
            WHERE tu.is_delete_yn = 'N'
            ORDER BY tu.name ASC"""
        cursor.execute(sql)
        logger.info(f"[SQL/SELECT] tb_user, tb_status /get_users{sql}")
        
        users = cursor.fetchall()
        for user in users:
            try:
                user['phone_number'] = decrypt_aes(user['phone_number'])
            except Exception as e:
                print(f"복호화 오류 (user id {user['id']}): {e}")
                user['phone_number'] = None
        return jsonify({'users': users}), 200
    except Exception as e:
        print(f"사용자 목록 조회 오류: {e}")
        return jsonify({'message': '사용자 목록 조회 오류'}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass

# user_id로 tb_user 테이블 조회
@user_bp.route('/get_user', methods=['GET', 'OPTIONS'])
def get_user():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'})
    
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'message': 'user_id 파라미터가 제공되지 않았습니다.'}), 400

    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500
        cursor = conn.cursor(dictionary=True)
        
        sql = """
            SELECT 
                tu.id, 
                tu.name, 
                tu.position, 
                td.dpr_nm AS department_name,
                td.team_nm AS team_name,
                tu.phone_number, 
                tu.role_id, 
                tu.status, 
                tu.is_delete_yn, 
                tu.first_login_yn
            FROM tb_user AS tu
            LEFT JOIN tb_department AS td ON tu.department = td.dpr_id  -- 부서 매핑
            WHERE tu.id = %s AND tu.is_delete_yn = 'N'"""
        cursor.execute(sql, (user_id,))
        logger.info(f"[SQL/SELECT] tb_user, tb_department /get_user {sql}")

        user_info = cursor.fetchone()

        if not user_info:
            return jsonify({'message': '사용자 정보를 찾을 수 없습니다.'}), 404

        try:
            user_info['phone_number'] = decrypt_aes(user_info['phone_number'])
        except Exception as decryption_error:
            print(f"📛 전화번호 복호화 오류: {decryption_error}")
            user_info['phone_number'] = "복호화 실패"

        return jsonify({'user': user_info}), 200

    except Exception as e:
        print(f"사용자 조회 오류: {e}")
        return jsonify({'message': '사용자 조회 오류'}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass

