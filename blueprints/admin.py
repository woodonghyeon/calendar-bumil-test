from flask import Blueprint, request, jsonify
import jwt, logging
from flask_bcrypt import Bcrypt
from db import get_db_connection
from config import SECRET_KEY
from .auth import encrypt_deterministic, encrypt_aes

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')
bcrypt = Bcrypt()
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# 유저 생성 API (관리자용)
@admin_bp.route('/add_user', methods=['POST', 'OPTIONS'])
def create_user():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'}), 200

    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'message': '토큰이 없습니다.'}), 401
    token = token.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        created_by = payload.get('name', 'SYSTEM')
    except jwt.ExpiredSignatureError:
        return jsonify({'message': '토큰이 만료되었습니다.'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'message': '유효하지 않은 토큰입니다.'}), 401
    except Exception as e:
        return jsonify({'message': '토큰 검증 오류'}), 401

    data = request.get_json() or {}
    # 필수 항목 확인
    required_fields = ['id', 'username', 'position', 'department', 'phone', 'password', 'role_id']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'message': f'{field} 필드가 누락되었습니다.'}), 400

    # 암호화
    id = data.get('id')
    name = data.get('username')
    position = data.get('position')
    department = data.get('department')
    phone = encrypt_aes(data.get('phone'))
    password = data.get('password')
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    role_id = data.get('role_id')
    first_login_yn = data.get('first_login_yn', 'N')

    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': '데이터베이스 연결 실패!'}), 500
    cursor = conn.cursor(dictionary=True)

    try:
        # 이미 사용중인 이메일 확인
        sql_tb_user_select = "SELECT * FROM tb_user WHERE id = %s"
        cursor.execute(sql_tb_user_select, (id,))
        logger.info(f"[SQL/SELECT] tb_user /add_user {sql_tb_user_select}")
        if cursor.fetchone():
            return jsonify({'message': '이미 사용 중인 이메일입니다.'}), 400

        # ✅ HQ 상태가 존재하는지 확인
        sql_check_hq = "SELECT id FROM tb_status WHERE id = 'HQ' LIMIT 1"
        cursor.execute(sql_check_hq)
        hq_status = cursor.fetchone()

        if hq_status:
            default_status_id = "HQ"
        else:
            # ✅ HQ가 없다면, tb_status에서 가장 첫 번째 상태 값을 가져옴
            sql_default_status = "SELECT id FROM tb_status ORDER BY id LIMIT 1"
            cursor.execute(sql_default_status)
            default_status = cursor.fetchone()
            default_status_id = default_status["id"] if default_status else None

        # 사용자가 `status`를 전달하지 않으면 자동으로 기본 상태 값 사용
        status = data.get('status', default_status_id)

        if not status:
            return jsonify({'message': '기본 상태 값이 설정되지 않았습니다. tb_status 테이블을 확인하세요.'}), 500

        sql_tb_user_insert = """
        INSERT INTO tb_user 
        (name, position, department, id, phone_number, password, role_id, status, first_login_yn, created_at, updated_at, created_by, updated_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW(), %s, %s)"""
        values = (name, position, department, id, phone, hashed_password, role_id, status, first_login_yn, created_by, created_by)
        cursor.execute(sql_tb_user_insert, values)
        logger.info(f"[SQL/INSERT] tb_user /add_user {sql_tb_user_insert}")

        conn.commit()
        return jsonify({'message': '유저 생성 성공!'}), 201
    except Exception as e:
        conn.rollback()
        print(f"유저 생성 오류: {e}")
        return jsonify({'message': f'유저 생성 중 오류 발생: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

# 유저 정보 수정 API (날짜 관련 컬럼 제외)
@admin_bp.route('/update_user', methods=['PUT', 'OPTIONS'])
def update_user():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'}), 200

    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'message': '토큰이 없습니다.'}), 401
    token = token.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        updated_by = payload.get('name', 'SYSTEM')
    except jwt.ExpiredSignatureError:
        return jsonify({'message': '토큰이 만료되었습니다.'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'message': '유효하지 않은 토큰입니다.'}), 401
    except Exception as e:
        return jsonify({'message': '토큰 검증 오류'}), 401

    data = request.get_json() or {}
    if not data.get('id'):
        return jsonify({'message': '유저 id가 제공되지 않았습니다.'}), 400
    user_id = data.get('id')

    fields = []
    values = []
    if 'username' in data:
        fields.append("name = %s")
        values.append(data['username'])
    if 'position' in data:
        fields.append("position = %s")
        values.append(data['position'])
    if 'department' in data:
        fields.append("department = %s")
        values.append(data['department'])
    if 'id' in data:
        fields.append("id = %s")
        values.append(data['id'])
    if 'phone' in data:
        fields.append("phone_number = %s")
        values.append(encrypt_aes(data['phone']))
    if 'password' in data:
        new_pass = data['password']
        hashed_password = bcrypt.generate_password_hash(new_pass).decode('utf-8')
        fields.append("password = %s")
        values.append(hashed_password)
    if 'role_id' in data:
        fields.append("role_id = %s")
        values.append(data['role_id'])
    if 'status' in data:
        fields.append("status = %s")
        values.append(data['status'])
    if 'first_login_yn' in data:
        fields.append("first_login_yn = %s")
        values.append(data['first_login_yn'])

    if not fields:
        return jsonify({'message': '수정할 필드가 제공되지 않았습니다.'}), 400

    fields.append("updated_by = %s")
    values.append(updated_by)
    values.append(user_id)

    set_clause = ", ".join(fields)

    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': '데이터베이스 연결 실패!'}), 500
    cursor = conn.cursor()
    try:
        sql = f"""
            UPDATE tb_user 
            SET {set_clause} 
            WHERE id = %s AND is_delete_yn = 'N'"""
        cursor.execute(sql, tuple(values))
        logger.info(f"[SQL/UPDATE] tb_user /update_user{sql}")

        conn.commit()
        return jsonify({'message': '유저 정보가 업데이트되었습니다.'}), 200
    except Exception as e:
        conn.rollback()
        print(f"유저 정보 업데이트 오류: {e}")
        return jsonify({'message': f'유저 정보 업데이트 오류: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


# 유저 삭제 API (논리 삭제)
@admin_bp.route('/delete_user/<string:user_id>', methods=['DELETE', 'OPTIONS'])
def delete_user(user_id):
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'}), 200

    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'message': '토큰이 없습니다.'}), 401
    token = token.split(" ")[1]
    try:
        jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        return jsonify({'message': '토큰이 만료되었습니다.'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'message': '유효하지 않은 토큰입니다.'}), 401
    except Exception as e:
        return jsonify({'message': '토큰 검증 오류'}), 401

    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': '데이터베이스 연결 실패!'}), 500
    cursor = conn.cursor()
    try:
        sql = """
            UPDATE tb_user 
            SET is_delete_yn = 'Y' 
            WHERE id = %s"""
        cursor.execute(sql, (user_id,))
        logger.info(f"[SQL/UPDATE] tb_user /delete_user{sql}")

        conn.commit()
        return jsonify({'message': '유저가 삭제되었습니다.'}), 200
    except Exception as e:
        conn.rollback()
        print(f"유저 삭제 오류: {e}")
        return jsonify({'message': f'유저 삭제 오류: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

# 유저 권한 수정
@admin_bp.route('/update_role_id', methods=['PUT', 'OPTIONS'])
def update_role_id():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight reques t success'}), 200

    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'message': '토큰이 없습니다.'}), 401
    token = token.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        updated_by = payload.get('name', 'SYSTEM')
    except jwt.ExpiredSignatureError:
        return jsonify({'message': '토큰이 만료되었습니다.'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'message': '유효하지 않은 토큰입니다.'}), 401
    except Exception as e:
        return jsonify({'message': '토큰 검증 오류'}), 401

    data = request.get_json() or {}
    if not data.get('id'):
        return jsonify({'message': '유저 id가 제공되지 않았습니다.'}), 400
    user_id = data.get('id')

    fields = []
    values = []

    if 'id' in data:
        fields.append("id = %s")
        values.append(data['id'])
    if 'role_id' in data:
        fields.append("role_id = %s")
        values.append(data['role_id'])
    if not fields:
        return jsonify({'message': '수정할 필드가 제공되지 않았습니다.'}), 400

    fields.append("updated_by = %s")
    values.append(updated_by)
    values.append(user_id)

    set_clause = ", ".join(fields)

    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': '데이터베이스 연결 실패!'}), 500
    cursor = conn.cursor()
    try:
        sql = f"""
            UPDATE tb_user 
            SET {set_clause} 
            WHERE id = %s AND is_delete_yn = 'N'"""
        cursor.execute(sql, tuple(values))
        logger.info(f"[SQL/UPDATE] tb_user /update_role_id{sql}")

        conn.commit()
        return jsonify({'message': '유저 정보가 업데이트되었습니다.'}), 200
    except Exception as e:
        conn.rollback()
        print(f"유저 정보 업데이트 오류: {e}")
        return jsonify({'message': f'유저 정보 업데이트 오류: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

# 권한 목록 조회
@admin_bp.route('/get_role_list', methods=['GET'])
def get_roles():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        sql = """
            SELECT id, comment 
            FROM tb_role 
            ORDER BY id"""
        cursor.execute(sql)
        logger.info(f"[SQL/SELECT] tb_role /get_role_list{sql}")

        roles = cursor.fetchall()
        return jsonify(roles), 200
    except Exception as e:
        print(f"권한 조회 오류: {e}")
        return jsonify({'message': '권한 목록 조회 오류'}), 500
    finally:
        cursor.close()
        conn.close()

# 직급 목록 조회
@admin_bp.route('/get_position_list', methods=['GET'])
def get_unique_position():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        sql =  """
            SELECT DISTINCT 
            position FROM tb_user 
            WHERE position IS NOT NULL AND position != '' 
            ORDER BY position"""
        cursor.execute(sql)
        logger.info(f"[SQL/SELECT] tb_user /get_position_list{sql}")

        positions = cursor.fetchall()
        return jsonify([p['position'] for p in positions]), 200
    except Exception as e:
        print(f"직급 조회 오류: {e}")
        return jsonify({'message': '직급 목록 조회 오류'}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/update_status_admin', methods=['PUT', 'OPTIONS'])
def update_status_admin():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'}), 200

    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'message': '토큰이 없습니다.'}), 401
    token = token.split(" ")[1]

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        requester_user_id = payload['user_id']

        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500
        cursor = conn.cursor(dictionary=True)

        data = request.get_json()
        new_status = data.get('status')
        target_user_id = data.get('user_id')

        # 필수 값 체크
        if not new_status:
            return jsonify({'message': '새 상태가 제공되지 않았습니다.'}), 400
        if not target_user_id:
            return jsonify({'message': '대상 사용자 ID가 제공되지 않았습니다.'}), 400

        cursor.execute("SELECT status FROM tb_user WHERE id = %s", (target_user_id,))
        user_info = cursor.fetchone()
        if not user_info:
            return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404

        # 상태 업데이트
        cursor.execute("UPDATE tb_user SET status = %s WHERE id = %s", (new_status, target_user_id))

        # 변경 이력 기록
        sql = """
            INSERT INTO tb_user_status_log (recorded_at, status_id, user_id, created_by)
            VALUES (NOW(3), %s, %s, %s)"""
        cursor.execute(sql, (new_status, target_user_id, requester_user_id))
        logger.info(f"[SQL/INSERT] tb_user_status_log /update_status_admin{sql}")


        conn.commit()
        return jsonify({'message': '상태가 업데이트되었습니다.'}), 200

    except jwt.ExpiredSignatureError:
        return jsonify({'message': '토큰이 만료되었습니다.'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'message': '유효하지 않은 토큰입니다.'}), 401
    except Exception as e:
        print(f"🚨 상태 업데이트 오류: {e}")
        return jsonify({'message': '상태 업데이트 오류', 'error': str(e)}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass