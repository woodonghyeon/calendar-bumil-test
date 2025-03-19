from flask import Blueprint, request, jsonify
import jwt, logging
from db import get_db_connection
from config import SECRET_KEY
from blueprints.auth import decrypt_deterministic  # 이메일 복호화 함수
from blueprints.auth import verify_and_refresh_token

schedule_bp = Blueprint('schedule', __name__, url_prefix='/schedule')
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

@schedule_bp.route('/get_schedule', methods=['GET', 'OPTIONS'])
def get_schedule():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'})
    
    # verify_and_refresh_token 사용하여 토큰 검증 및 자동 갱신
    user_id, user_name, role_id, refresh_response, status_code = verify_and_refresh_token(request)
    if refresh_response:
        return refresh_response, status_code  # 자동 토큰 갱신 응답 반환
    
    if user_id is None:
        return jsonify({'message': '토큰 인증 실패'}), 401
    
    date = request.args.get('date')
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500
        cursor = conn.cursor(dictionary=True)
        sql = """
            SELECT id, task, start_date, end_date, status
            FROM tb_schedule
            WHERE user_id = %s AND DATE(start_date) <= %s AND DATE(end_date) >= %s"""
        cursor.execute(sql, (user_id, date, date))
        logger.info(f"[SQL/SELECT] tb_schedule /get_schedule{sql}")

        schedules = cursor.fetchall()
        return jsonify({'schedules': schedules}), 200
    except Exception as e:
        print(f"일정 가져오기 오류: {e}")
        return jsonify({'message': '일정 가져오기 오류'}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass

@schedule_bp.route('/get_other_users_schedule', methods=['GET', 'OPTIONS'])
def get_other_users_schedule():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'})
    
    # verify_and_refresh_token 사용하여 토큰 검증 및 자동 갱신
    user_id, user_name, role_id, refresh_response, status_code = verify_and_refresh_token(request)
    if refresh_response:
        return refresh_response, status_code  # 자동 토큰 갱신 응답 반환
    
    if user_id is None:
        return jsonify({'message': '토큰 인증 실패'}), 401

    date = request.args.get('date')
    if not date:
        return jsonify({'message': '날짜가 제공되지 않았습니다.'}), 400

    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500
        cursor = conn.cursor(dictionary=True)
        sql = """
            SELECT s.id AS schedule_id, s.task, s.start_date, s.end_date, s.status, u.id AS user_id, u.name
            FROM tb_schedule s
            JOIN tb_user u 
            ON s.user_id = u.id
            WHERE DATE(s.start_date) <= %s AND DATE(s.end_date) >= %s"""
        cursor.execute(sql, (date, date))
        logger.info(f"[SQL/SELECT] tb_schedule, tb_user /get_other_users_schedule{sql}")

        schedules = cursor.fetchall()
        
        # 현재 사용자의 일정은 제외
        filtered_schedules = [sched for sched in schedules if sched['user_id'] != user_id]

        return jsonify({'schedules': filtered_schedules}), 200
    except Exception as e:
        print(f"다른 사용자 일정 가져오기 오류: {e}")
        return jsonify({'message': '다른 사용자 일정 가져오기 오류'}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass

@schedule_bp.route('/add-schedule', methods=['POST', 'OPTIONS'])
def add_schedule():
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
        start_date = data.get('start')
        end_date = data.get('end')
        task = data.get('task')
        status = data.get('status')

        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500
        cursor = conn.cursor()
        sql = """
            INSERT INTO tb_schedule 
            (user_id, start_date, end_date, task, status)
            VALUES (%s, %s, %s, %s, %s)"""
        values = (user_id, start_date, end_date, task, status)
        cursor.execute(sql, values)
        logger.info(f"[SQL/INSERT] tb_schedule /add-schedule{sql}")

        conn.commit()
        return jsonify({'message': '일정이 추가되었습니다.'}), 200
    except Exception as e:
        print(f"일정 추가 오류: {e}")
        return jsonify({'message': f'일정 추가 중 오류 발생: {e}'}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass

@schedule_bp.route('/edit-schedule/<int:schedule_id>', methods=['PUT', 'OPTIONS'])
def edit_schedule(schedule_id):
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
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        task = data.get('task')
        status = data.get('status')
        
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500
        cursor = conn.cursor()
        
        sql_user_id_select = "SELECT user_id FROM tb_schedule WHERE id = %s"
        cursor.execute(sql_user_id_select, (schedule_id,))
        logger.info(f"[SQL/SELECT] tb_schedule /edit-schedule{sql_user_id_select}")

        schedule_owner = cursor.fetchone()
        if schedule_owner and schedule_owner[0] != user_id:
            return jsonify({'message': '일정을 수정할 권한이 없습니다.'}), 403
        
        sql_schedule_update = """
            UPDATE tb_schedule
            SET start_date = %s, end_date = %s, task = %s, status = %s
            WHERE id = %s"""
        values = (start_date, end_date, task, status, schedule_id)
        cursor.execute(sql_schedule_update, values)
        logger.info(f"[SQL/UPDATE] tb_schedule /edit-schedule{sql_schedule_update}")

        conn.commit()
        return jsonify({'message': '일정이 수정되었습니다.'}), 200
    except jwt.ExpiredSignatureError:
        return jsonify({'message': '토큰이 만료되었습니다.'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'message': '유효하지 않은 토큰입니다.'}), 401
    except Exception as e:
        print(f"일정 수정 오류: {e}")
        return jsonify({'message': '일정 수정 오류'}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass

# 일정 삭제
@schedule_bp.route('/delete-schedule/<int:schedule_id>', methods=['DELETE', 'OPTIONS'])
def delete_schedule(schedule_id):
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'})
    
    # verify_and_refresh_token 사용하여 토큰 검증 및 자동 갱신
    user_id, user_name, role_id, refresh_response, status_code = verify_and_refresh_token(request)
    if refresh_response:
        return refresh_response, status_code  # 자동 토큰 갱신 응답 반환
    
    if user_id is None:
        return jsonify({'message': '토큰 인증 실패'}), 401

    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500
        cursor = conn.cursor()

        # 삭제하려는 일정의 user_id 가져오기
        sql_user_id_select = """
            SELECT user_id FROM tb_schedule WHERE id = %s"""
        cursor.execute(sql_user_id_select, (schedule_id,))
        logger.info(f"[SQL/SELECT] tb_schedule /delete-schedule{sql_user_id_select}")

        schedule_owner = cursor.fetchone()

        # 🔹 일정 소유자이거나 `AD_ADMIN`이면 삭제 가능
        ADMIN_ROLES = ['AD_ADMIN']
        if schedule_owner and (schedule_owner[0] != user_id and role_id not in ADMIN_ROLES):
            return jsonify({'message': '일정을 삭제할 권한이 없습니다.'}), 403

        # 삭제 실행
        sql_schedule_id_delete = "DELETE FROM tb_schedule WHERE id = %s"
        cursor.execute(sql_schedule_id_delete, (schedule_id,))
        logger.info(f"[SQL/DELETE] tb_schedule /delete-schedule{sql_schedule_id_delete}")

        conn.commit()
        return jsonify({'message': '일정이 삭제되었습니다.'}), 200
    except jwt.ExpiredSignatureError:
        return jsonify({'message': '토큰이 만료되었습니다.'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'message': '유효하지 않은 토큰입니다.'}), 401
    except Exception as e:
        print(f"일정 삭제 오류: {e}")
        return jsonify({'message': '일정 삭제 오류'}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass

@schedule_bp.route('/get_all_schedule', methods=['GET', 'OPTIONS'])
def get_all_schedule():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'})
    
    # verify_and_refresh_token 사용하여 토큰 검증 및 자동 갱신
    user_id, user_name, role_id, refresh_response, status_code = verify_and_refresh_token(request)
    if refresh_response:
        return refresh_response, status_code  # 자동 토큰 갱신 응답 반환
    
    if user_id is None:
        return jsonify({'message': '토큰 인증 실패'}), 401
    
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500
        cursor = conn.cursor(dictionary=True)
        sql = """
            SELECT * FROM tb_schedule"""
        cursor.execute(sql)
        logger.info(f"[SQL/SELECT] tb_schedule /get_all_schedule{sql}")

        schedules = cursor.fetchall()
        return jsonify({'schedules': schedules}), 200
    except Exception as e:
        print(f"일정 가져오기 오류: {e}")
        return jsonify({'message': '일정 가져오기 오류'}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass
