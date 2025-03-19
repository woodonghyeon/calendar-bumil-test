from flask import Blueprint, request, jsonify
from db import get_db_connection
from datetime import datetime, timezone
from config import SECRET_KEY
from blueprints.auth import verify_and_refresh_token
import logging, jwt

notice_bp = Blueprint('notice', __name__, url_prefix='/notice')
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# 공지사항 목록 조회 (삭제되지 않은 공지만)
@notice_bp.route('/get_notice_list', methods=['GET', 'OPTIONS'])
def get_notices():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'})
    
    # verify_and_refresh_token 사용하여 토큰 검증 및 자동 갱신
    user_id, user_name, role_id, refresh_response, status_code = verify_and_refresh_token(request)
    if refresh_response:
        return refresh_response, status_code  # 자동 토큰 갱신 응답 반환
    
    if user_id is None:
        return jsonify({'message': '토큰 인증 실패'}), 401

    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': '데이터베이스 연결 실패!'}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        # 작성자 이름을 함께 조회하도록 수정
        sql = """
        SELECT n.*, u.name AS created_by_name
        FROM tb_notice n
        LEFT JOIN tb_user u ON n.user_id = u.id
        WHERE n.is_delete_yn = 'N'
        ORDER BY n.created_at DESC"""
        cursor.execute(sql)

        notices = cursor.fetchall()
        return jsonify({'notices': notices}), 200
    except Exception as e:
        return jsonify({'message': f'공지사항 조회 실패: {str(e)}'}), 500
    finally:
        cursor.close()
        conn.close()

# 특정 공지사항 조회 (삭제되지 않은 공지만)
@notice_bp.route('/get_notice/<int:notice_id>', methods=['GET', 'OPTIONS'])
def get_notice(notice_id):
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'})
    
    # verify_and_refresh_token 사용하여 토큰 검증 및 자동 갱신
    user_id, user_name, role_id, refresh_response, status_code = verify_and_refresh_token(request)
    if refresh_response:
        return refresh_response, status_code  # 자동 토큰 갱신 응답 반환
    
    if user_id is None:
        return jsonify({'message': '토큰 인증 실패'}), 401

    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': '데이터베이스 연결 실패!'}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        sql = """
        SELECT * FROM tb_notice 
        WHERE id = %s AND is_delete_yn = 'N'"""
        cursor.execute(sql, (notice_id,))
        logger.info(f"[SQL/SELECT] {sql} | PARAMS: {notice_id}")
        
        notice = cursor.fetchone()
        if notice:
            return jsonify({'notice': notice}), 200
        return jsonify({'message': '공지사항을 찾을 수 없습니다.'}), 404
    except Exception as e:
        logger.error(f"공지사항 조회 오류: {e}")
        return jsonify({'message': '공지사항 조회 실패!'}), 500
    finally:
        cursor.close()
        conn.close()

# 공지사항 생성
@notice_bp.route('/create_notice', methods=['POST', 'OPTIONS'])
def create_notice():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'})
    
    # verify_and_refresh_token 사용하여 토큰 검증 및 자동 갱신
    user_id, user_name, role_id, refresh_response, status_code = verify_and_refresh_token(request)
    if refresh_response:
        return refresh_response, status_code  # 자동 토큰 갱신 응답 반환
    
    if user_id is None:
        return jsonify({'message': '토큰 인증 실패'}), 401

    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': '데이터베이스 연결 실패!'}), 500

    cursor = conn.cursor(dictionary=True)

    try:
        # 작성자의 이름 가져오기
        cursor.execute("SELECT name FROM tb_user WHERE id = %s", (user_id,))
        user_data = cursor.fetchone()
        if not user_data:
            return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404

        created_by = user_data["name"]  # 실제 작성자 이름

        data = request.get_json()
        title = data.get('title')
        content = data.get('content')

        if not title or not content:
            return jsonify({'message': '제목과 내용을 입력해야 합니다.'}), 400

        # 공지사항 생성 시 작성자 이름 저장
        sql = """
        INSERT INTO tb_notice (title, content, user_id, created_by, updated_by)
        VALUES (%s, %s, %s, %s, %s)"""
        cursor.execute(sql, (title, content, user_id, created_by, created_by))
        conn.commit()

        return jsonify({'message': '공지사항이 성공적으로 등록되었습니다.'}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({'message': f'공지사항 등록 실패: {str(e)}'}), 500
    finally:
        cursor.close()
        conn.close()


# 공지사항 수정
@notice_bp.route('/update_notice/<int:notice_id>', methods=['PUT', 'OPTIONS'])
def update_notice(notice_id):
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'})
    
    # verify_and_refresh_token 사용하여 토큰 검증 및 자동 갱신
    user_id, user_name, role_id, refresh_response, status_code = verify_and_refresh_token(request)
    if refresh_response:
        return refresh_response, status_code  # 자동 토큰 갱신 응답 반환
    
    if user_id is None:
        return jsonify({'message': '토큰 인증 실패'}), 401

    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': '데이터베이스 연결 실패!'}), 500

    data = request.get_json()
    title = data.get('title')
    content = data.get('content')
    updated_by = user_name or 'SYSTEM'

    if not title or not content:
        return jsonify({'message': '제목과 내용을 입력해야 합니다.'}), 400

    cursor = conn.cursor()
    try:
        sql = """
        UPDATE tb_notice 
        SET title = %s, content = %s, updated_by = %s, updated_at = NOW()
        WHERE id = %s AND is_delete_yn = 'N'"""
        cursor.execute(sql, (title, content, updated_by, notice_id))
        conn.commit()
        logger.info(f"[SQL/UPDATE] {sql} | PARAMS: ({title}, {content}, {updated_by}, {notice_id})")

        if cursor.rowcount == 0:
            return jsonify({'message': '공지사항을 찾을 수 없거나 삭제된 상태입니다.'}), 404

        return jsonify({'message': '공지사항이 성공적으로 수정되었습니다.'}), 200
    except Exception as e:
        logger.error(f"공지사항 수정 오류: {e}")
        return jsonify({'message': '공지사항 수정 실패!'}), 500
    finally:
        cursor.close()
        conn.close()

# 공지사항 삭제 (논리 삭제)
@notice_bp.route('/delete_notice/<int:notice_id>', methods=['DELETE', 'OPTIONS'])
def delete_notice(notice_id):
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'})
    
    # verify_and_refresh_token 사용하여 토큰 검증 및 자동 갱신
    user_id, user_name, role_id, refresh_response, status_code = verify_and_refresh_token(request)
    if refresh_response:
        return refresh_response, status_code  # 자동 토큰 갱신 응답 반환
    
    if user_id is None:
        return jsonify({'message': '토큰 인증 실패'}), 401

    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': '데이터베이스 연결 실패!'}), 500

    data = request.get_json()
    updated_by = user_name or 'SYSTEM'

    cursor = conn.cursor()
    try:
        sql = """
        UPDATE tb_notice 
        SET is_delete_yn = 'Y', updated_by = %s, updated_at = NOW()
        WHERE id = %s AND is_delete_yn = 'N'"""
        cursor.execute(sql, (updated_by, notice_id))
        conn.commit()
        logger.info(f"[SQL/UPDATE] {sql} | PARAMS: ({updated_by}, {notice_id})")

        if cursor.rowcount == 0:
            return jsonify({'message': '공지사항을 찾을 수 없거나 이미 삭제되었습니다.'}), 404

        return jsonify({'message': '공지사항이 성공적으로 삭제(비활성화)되었습니다.'}), 200
    except Exception as e:
        logger.error(f"공지사항 삭제 오류: {e}")
        return jsonify({'message': '공지사항 삭제 실패!'}), 500
    finally:
        cursor.close()
        conn.close()

# 공지사항 복구
@notice_bp.route('/restore_notice/<int:notice_id>', methods=['PUT', 'OPTIONS'])
def restore_notice(notice_id):
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'})
    
    # verify_and_refresh_token 사용하여 토큰 검증 및 자동 갱신
    user_id, user_name, role_id, refresh_response, status_code = verify_and_refresh_token(request)
    if refresh_response:
        return refresh_response, status_code  # 자동 토큰 갱신 응답 반환
    
    if user_id is None:
        return jsonify({'message': '토큰 인증 실패'}), 401

    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': '데이터베이스 연결 실패!'}), 500

    data = request.get_json()
    updated_by = user_name or 'SYSTEM'

    cursor = conn.cursor()
    try:
        sql = """
        UPDATE tb_notice 
        SET is_delete_yn = 'N', updated_by = %s, updated_at = NOW()
        WHERE id = %s AND is_delete_yn = 'Y'"""
        cursor.execute(sql, (updated_by, notice_id))
        conn.commit()
        logger.info(f"[SQL/UPDATE] {sql} | PARAMS: ({updated_by}, {notice_id})")

        if cursor.rowcount == 0:
            return jsonify({'message': '삭제된 공지사항을 찾을 수 없습니다.'}), 404

        return jsonify({'message': '공지사항이 성공적으로 복구되었습니다.'}), 200
    except Exception as e:
        logger.error(f"공지사항 복구 오류: {e}")
        return jsonify({'message': '공지사항 복구 실패!'}), 500
    finally:
        cursor.close()
        conn.close()
