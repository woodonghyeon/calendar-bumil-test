from flask import Blueprint, request, jsonify
import jwt, logging
from db import get_db_connection
from config import SECRET_KEY
from blueprints.auth import decrypt_aes, decrypt_deterministic, encrypt_deterministic  # 이메일 복호화 함수
from blueprints.auth import verify_and_refresh_token

favorite_bp = Blueprint('favorite', __name__, url_prefix='/favorite')
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

@favorite_bp.route('/toggle_favorite', methods=['POST', 'OPTIONS'])
def toggle_favorite():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'})
    
    # verify_and_refresh_token 사용하여 토큰 검증 및 자동 갱신
    user_id, user_name, role_id, refresh_response, status_code = verify_and_refresh_token(request)
    if refresh_response:
        return refresh_response, status_code  # 자동 토큰 갱신 응답 반환
    
    if user_id is None:
        return jsonify({'message': '토큰 인증 실패'}), 401
    
    try:
        data = request.get_json()
        # 클라이언트에서 전달받은 값
        user_id = data.get('user_id')
        favorite_user_id = data.get('favorite_user_id')

        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500
        cursor = conn.cursor()

        # 암호화된 ID를 사용하여 즐겨찾기 여부 확인
        sql_tb_favorite_select = """
            SELECT * FROM tb_favorite 
            WHERE user_id = %s AND favorite_user_id = %s"""
        cursor.execute(sql_tb_favorite_select, (user_id, favorite_user_id))
        logger.info(f"[SQL/SELECT] tb_favorite /toggle_favorite{sql_tb_favorite_select}")
        
        favorite = cursor.fetchone()
        if favorite:
            # 이미 즐겨찾기 상태이면 삭제 (즐겨찾기 해제)
            sql_tb_favorite_delete = "DELETE FROM tb_favorite WHERE user_id = %s AND favorite_user_id = %s"
            cursor.execute(sql_tb_favorite_delete, (user_id, favorite_user_id))
            logger.info(f"[SQL/DELETE] tb_favorite /toggle_favorite{sql_tb_favorite_delete}")
            conn.commit()
            response_message = '즐겨찾기가 삭제되었습니다.'
        else:
            # 즐겨찾기가 없으면 새로 추가
            sql_tb_favorite_insert = """
                INSERT INTO tb_favorite (user_id, favorite_user_id, is_favorite_yn) 
                VALUES (%s, %s, 'y')"""
            cursor.execute(sql_tb_favorite_insert, (user_id, favorite_user_id))
            logger.info(f"[SQL/INSERT] tb_favorite /toggle_favorite{sql_tb_favorite_insert}")
            conn.commit()
            response_message = '즐겨찾기가 추가되었습니다.'
        return jsonify({'message': response_message}), 200
    except Exception as e:
        print(f"즐겨찾기 오류: {e}")
        return jsonify({'message': f'오류: {e}'}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass

@favorite_bp.route('/get_favorites', methods=['GET', 'OPTIONS'])
def get_favorites():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'})
    
    # verify_and_refresh_token 사용하여 토큰 검증 및 자동 갱신
    user_id, user_name, role_id, refresh_response, status_code = verify_and_refresh_token(request)
    if refresh_response:
        return refresh_response, status_code  # 자동 토큰 갱신 응답 반환
    
    if user_id is None:
        return jsonify({'message': '토큰 인증 실패'}), 401
    
    try:
        user_id = request.args.get('user_id')
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500
        cursor = conn.cursor(dictionary=True)
        # tb_favorite와 tb_user를 조인하여 필요한 정보를 가져옵니다.
        # 기존의 u.email 대신 u.id를 사용합니다.
        sql = """
        SELECT 
            u.id, 
            u.name, 
            u.position, 
            d.dpr_nm AS department_name, 
            d.team_nm AS team_name, 
            u.phone_number,
            COALESCE(u.status, 'NULL') AS status
        FROM 
            tb_favorite f
        JOIN 
            tb_user u ON f.favorite_user_id = u.id
        LEFT JOIN 
            tb_department d ON u.department = d.dpr_id
        WHERE 
            f.user_id = %s"""

        cursor.execute(sql, (user_id,))
        logger.info(f"[SQL/SELECT] tb_favorite, tb_user /get_favorites{sql}")
        favorites = cursor.fetchall()

        for fav in favorites:
            try:
                fav['phone_number'] = decrypt_aes(fav['phone_number'])
            except Exception as decryption_error:
                print(f"복호화 오류: {decryption_error}")
                return jsonify({'message': '사용자 정보 복호화 실패'}), 500

        return jsonify({'favorite': favorites}), 200
    except Exception as e:
        print(f"즐겨찾기 목록 조회 오류: {e}")
        return jsonify({'message': '즐겨찾기 목록 조회 오류'}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass
