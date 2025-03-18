from flask import Blueprint, request, jsonify
import jwt, logging
from db import get_db_connection
from config import SECRET_KEY

status_bp = Blueprint('status', __name__, url_prefix='/status')
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# 전체 상태 목록 조회
@status_bp.route('/get_all_status', methods=['GET', 'OPTIONS'])
def get_all_status():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'}), 200
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500
        cursor = conn.cursor(dictionary=True)
        sql = """
            SELECT id, comment FROM tb_status"""
        cursor.execute(sql)
        logger.info(f"[SQL/SELECT] tb_status /get_all_status{sql}")

        statuses = cursor.fetchall()
        return jsonify({'statuses': statuses}), 200
    except Exception as e:
        print(f"상태 목록 조회 오류: {e}")
        return jsonify({'message': '상태 목록 조회 오류'}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass

@status_bp.route('/get_status_list', methods=['GET', 'OPTIONS'])
def get_status_list():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'})
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500
        cursor = conn.cursor(dictionary=True)
        
        sql = """
            SELECT id, comment FROM tb_status ORDER BY comment"""
        cursor.execute(sql)
        logger.info(f"[SQL/SELECT] tb_status /get_status_list{sql}")

        statuses = cursor.fetchall()
        return jsonify({'statuses': statuses}), 200
    except Exception as e:
        print(f"상태 목록 조회 오류: {e}")
        return jsonify({'message': '상태 목록 조회 오류'}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass

# 특정 사용자들의 상태 조회
@status_bp.route('/get_users_status', methods=['POST', 'OPTIONS'])
def get_users_status():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'}), 200
    data = request.get_json()
    user_ids = data.get("user_ids", [])
    if not user_ids:
        return jsonify({'message': 'user_ids가 제공되지 않았습니다.'}), 400
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500
        cursor = conn.cursor(dictionary=True)
        format_strings = ','.join(['%s'] * len(user_ids))
        sql = f"""
            SELECT id, status 
            FROM tb_user 
            WHERE id IN ({format_strings})"""
        cursor.execute(sql, tuple(user_ids))
        logger.info(f"[SQL/SELECT] tb_user /get_users_status{sql}")
        
        statuses = cursor.fetchall()
        statuses_dict = {user["id"]: user["status"] for user in statuses}
        return jsonify({'statuses': statuses_dict}), 200
    except Exception as e:
        print(f"사용자 상태 조회 오류: {e}")
        return jsonify({'message': '사용자 상태 조회 오류'}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass

# 상태 목록 추가
@status_bp.route('/add_status', methods=['POST', 'OPTIONS'])
def add_status():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'})
    data = request.get_json()
    new_status = data.get('status')
    comment = data.get('comment', '')
    if not new_status:
        return jsonify({'message': '상태 ID가 제공되지 않았습니다.'}), 400
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500
        cursor = conn.cursor()
        
        sql = """
            INSERT INTO tb_status (id, comment)
            VALUES (%s, %s)"""
        cursor.execute(sql, (new_status, comment))
        logger.info(f"[SQL/INSERT] tb_status /add_status{sql}")
        
        conn.commit()
        return jsonify({'message': '상태가 추가되었습니다.'}), 201
    except Exception as e:
        print(f"상태 추가 오류: {e}")
        return jsonify({'message': '상태 추가 오류'}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass

# 상태 목록 수정
@status_bp.route('/edit_status/<string:status_id>', methods=['PUT', 'OPTIONS'])
def edit_status(status_id):
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'}), 200

    try:
        data = request.get_json()
        new_comment = data.get('comment')

        if not new_comment:
            return jsonify({'message': '새로운 comment가 제공되지 않았습니다.'}), 400

        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500

        cursor = conn.cursor()
        sql_select = """
            SELECT * FROM tb_status WHERE id = %s"""
        cursor.execute(sql_select, (status_id,))
        logger.info(f"[SQL/SELECT] tb_status /edit_status{sql_select}")
        
        existing_status = cursor.fetchone()

        if not existing_status:
            return jsonify({'message': '상태를 찾을 수 없습니다.'}), 404
        
        sql_update = "UPDATE tb_status SET comment = %s WHERE id = %s"
        cursor.execute(sql_update, (new_comment, status_id))
        logger.info(f"[SQL/UPDATE] tb_status /edit_status{sql_update}")

        conn.commit()

        return jsonify({'message': '상태가 성공적으로 수정되었습니다.'}), 200

    except Exception as e:
        print(f"상태 수정 오류: {e}")
        return jsonify({'message': '상태 수정 오류', 'error': str(e)}), 500

    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass

# 상태 목록 삭제
@status_bp.route('/delete_status/<string:status>', methods=['DELETE', 'OPTIONS'])
def delete_status(status):
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'})
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500
        cursor = conn.cursor()

        sql = """
            DELETE FROM tb_status WHERE id = %s"""
        cursor.execute(sql, (status,))
        logger.info(f"[SQL/DELETE] tb_status /delete_status{sql}")

        conn.commit()
        return jsonify({'message': '상태가 삭제되었습니다.'}), 200
    except Exception as e:
        print(f"상태 삭제 오류: {e}")
        return jsonify({'message': '상태 삭제 오류'}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass

# 유저 상태 업데이트
@status_bp.route('/update_status', methods=['PUT', 'OPTIONS'])
def update_status():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'}), 200

    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'message': '토큰이 없습니다.'}), 401
    token = token.split(" ")[1]

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        requester_user_id = payload['user_id']
        requester_role = payload.get('role_id')

        # 데이터베이스 커넥션과 커서를 여기서 생성
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500
        cursor = conn.cursor(dictionary=True)

        # role_id가 없으면 DB에서 조회
        if not requester_role:
            user_id = requester_user_id
            sql_role_select = """
                SELECT role_id FROM tb_user WHERE id = %s"""
            cursor.execute(sql_role_select, (user_id,))
            result = cursor.fetchone()
            logger.info(f"[SQL/SELECT] tb_status /update_status{sql_role_select}")
            
            requester_role = result.get('role_id') if result else None

        data = request.get_json()
        new_status = data.get('status')
        target_user_id = data.get('user_id', requester_user_id)

        sql_status_select = """
            SELECT status FROM tb_user WHERE id = %s"""
        cursor.execute(sql_status_select, (target_user_id,))
        logger.info(f"[SQL/SELECT] tb_status /update_status{sql_status_select}")

        user_info = cursor.fetchone()
        if not user_info:
            return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404

        old_status = user_info.get('status')
        if old_status == new_status:
            return jsonify({'message': '상태가 변경되지 않았습니다.'}), 200

        # 상태 업데이트
        sql_status_update = """
            UPDATE tb_user SET status = %s WHERE id = %s"""
        cursor.execute(sql_status_update, (new_status, target_user_id))
        logger.info(f"[SQL/UPDATE] tb_status /update_status{sql_status_update}")

        # 변경 이력 기록
        sql_status_log_insert = """
            INSERT INTO tb_user_status_log (recorded_at, status_id, user_id, created_by)
            VALUES (NOW(3), %s, %s, %s)"""
        cursor.execute(sql_status_log_insert, (new_status, target_user_id, requester_user_id))
        logger.info(f"[SQL/INSERT] tb_user_status_log /update_status{sql_status_log_insert}")

        conn.commit()
        return jsonify({'message': '상태가 업데이트되었습니다.'}), 200

    except jwt.ExpiredSignatureError:
        return jsonify({'message': '토큰이 만료되었습니다.'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'message': '유효하지 않은 토큰입니다.'}), 401
    except Exception as e:
        print(f"상태 업데이트 오류: {e}")
        return jsonify({'message': '상태 업데이트 오류'}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass

        except Exception:
            pass