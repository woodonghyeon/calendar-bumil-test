from flask import Blueprint, request, jsonify
from flask_bcrypt import Bcrypt
from flask_cors import cross_origin
from datetime import datetime, timedelta, timezone
from db import get_db_connection
from config import SECRET_KEY
from Cryptodome.Cipher import AES
import jwt, base64, os, logging

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')
bcrypt = Bcrypt()
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# AES 키 (정확히 32 바이트로 설정)
AES_KEY = os.environ.get("AES_SECRET_KEY", "Bumil-calendar-1234567890!@#$%^&*").ljust(32)[:32]
BLOCK_SIZE = AES.block_size  # 16

def pad(data_bytes: bytes) -> bytes:
    """바이트 데이터를 AES CBC 모드에 맞게 PKCS7 패딩 적용"""
    padding_length = BLOCK_SIZE - len(data_bytes) % BLOCK_SIZE
    return data_bytes + bytes([padding_length]) * padding_length

def unpad(data_bytes: bytes) -> bytes:
    """PKCS7 패딩 제거"""
    padding_length = data_bytes[-1]
    return data_bytes[:-padding_length]

def encrypt_aes(data: str) -> str:
    """AES 암호화 (CBC 모드, 바이트 단위 패딩 적용)"""
    iv = os.urandom(BLOCK_SIZE)  # 초기화 벡터 생성 (16바이트)
    cipher = AES.new(AES_KEY.encode('utf-8'), AES.MODE_CBC, iv)
    data_bytes = data.encode('utf-8')
    padded_data = pad(data_bytes)
    encrypted = cipher.encrypt(padded_data)
    return base64.b64encode(iv + encrypted).decode('utf-8')

def decrypt_aes(encrypted_data: str) -> str:
    """AES 복호화 (CBC 모드, 바이트 단위 언패딩 적용)"""
    raw_data = base64.b64decode(encrypted_data)
    iv = raw_data[:BLOCK_SIZE]
    cipher = AES.new(AES_KEY.encode('utf-8'), AES.MODE_CBC, iv)
    decrypted_bytes = cipher.decrypt(raw_data[BLOCK_SIZE:])
    unpadded_bytes = unpad(decrypted_bytes)
    return unpadded_bytes.decode('utf-8')

def encrypt_deterministic(data: str) -> str:
    fixed_iv = b'\x00' * BLOCK_SIZE  # 16바이트의 고정 IV
    cipher = AES.new(AES_KEY.encode('utf-8'), AES.MODE_CBC, fixed_iv)
    data_bytes = data.encode('utf-8')
    padded_data = pad(data_bytes)
    encrypted = cipher.encrypt(padded_data)
    return base64.b64encode(encrypted).decode('utf-8')

def decrypt_deterministic(encrypted_data: str) -> str:
    fixed_iv = b'\x00' * BLOCK_SIZE  # 암호화에 사용된 고정 IV
    cipher = AES.new(AES_KEY.encode('utf-8'), AES.MODE_CBC, fixed_iv)
    encrypted_bytes = base64.b64decode(encrypted_data)
    decrypted_bytes = cipher.decrypt(encrypted_bytes)
    unpadded_bytes = unpad(decrypted_bytes)
    return unpadded_bytes.decode('utf-8')

# 클라이언트 IP 주소 가져오기
def get_client_ip():
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0]
    return request.remote_addr

# 회원가입 (AES 암호화 적용)
# 현재 사용하지 않음.
@auth_bp.route('/signup', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True)
def signup():
    conn = None
    try:
        data = request.get_json() or {}
        print("회원가입 요청 데이터:", data)
        # 필수 항목 확인
        if not data.get('id') or not data.get('username') or not data.get('position') or not data.get('department') or not data.get('phone'):
            return jsonify({'message': '필수 항목이 누락되었습니다.'}), 400

        # 이메일은 결정적 암호화 (검색용)
        id = data.get('id')
        name = data.get('username')
        position = data.get('position')
        department = data.get('department')
        phone = encrypt_aes(data.get('phone'))
        password = data.get('password')

        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500

        cursor = conn.cursor()
        # 새 DB에서는 테이블명이 tb_user임
        sql_tb_user_select = "SELECT * FROM tb_user WHERE id = %s"
        cursor.execute(sql_tb_user_select, (id,))
        logger.info(f"[SQL/SELECT] tb_user /signup{sql_tb_user_select}")

        if cursor.fetchone():
            return jsonify({'message': '이미 사용 중인 이메일입니다.'}), 400

        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        # 상태는 'null', 삭제 플래그 'n', 첫 로그인 여부 'n'
        # 생성일, 수정일은 NOW(), 생성자 및 수정자는 생략(또는 'SYSTEM' 대신 null)
        sql = """
        INSERT INTO tb_user 
        (name, position, department, id, phone_number, password, role_id, is_delete_yn, 
        , created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 'N', 'N', NOW(), NOW())"""
        
        # AD_ADMIN, PR_ADMIN, PR_MANAGER, USR_GENERAL
        default_role_id = "USR_GENERAL"
        values = (name, position, department, id, phone, hashed_password, default_role_id)
        cursor.execute(sql, values)
        logger.info(f"[SQL/INSERT] tb_user /signup{sql}")

        conn.commit()
        return jsonify({'message': '회원가입 성공!'}), 201
    except Exception as e:
        print(f"회원가입 오류: {e}")
        return jsonify({'message': f'오류: {e}'}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if conn is not None:
            conn.close()

# 로그인 API
@auth_bp.route('/login', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True)
def login():
    conn = None
    cursor = None
    try:
        if request.method == 'OPTIONS':
            return jsonify({'message': 'CORS preflight request success'}), 200

        data = request.get_json() or {}
        if not data.get('id') or not data.get('password'):
            return jsonify({'message': '이메일과 비밀번호는 필수입니다.'}), 400

        id = data.get('id')
        password = data.get('password')

        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500

        cursor = conn.cursor(dictionary=True)
        sql_tb_user_select = """
        SELECT * FROM tb_user WHERE id = %s AND is_delete_yn = 'N'"""
        cursor.execute(sql_tb_user_select, (id,))
        logger.info(f"[SQL/SELECT] tb_user /login{sql_tb_user_select}")

        user = cursor.fetchone()

        if not user:
            return jsonify({'message': '사용자를 찾을 수 없습니다!'}), 404

        if not bcrypt.check_password_hash(user['password'], password):
            return jsonify({'message': '잘못된 비밀번호!'}), 401

        # JWT 생성
        payload = {
            'user_id': user['id'],
            'name': user['name'],
            'role_id': user['role_id'],
            # 토큰 기간 2주 (임시방편, 수정필요)
            'exp': datetime.now(timezone.utc) + timedelta(weeks=2)
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')

        user_data = {
            'id': user['id'],
            'first_login_yn': user.get('first_login_yn', 'Y')
        }

        return jsonify({'message': '로그인 성공!', 'user': user_data, 'token': token}), 200

    except Exception as e:
        print(f"로그인 중 오류 발생: {e}")
        return jsonify({'message': '로그인 실패!'}), 500
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()

# 로그인 기록 저장 API
@auth_bp.route('/log_login', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True)
def log_login():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'}), 200

    # 토큰 검증
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'message': '토큰이 없습니다.'}), 401
    token = token.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        user_id = payload.get('user_id')
    except jwt.ExpiredSignatureError:
        return jsonify({'message': '토큰이 만료되었습니다.'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'message': '유효하지 않은 토큰입니다.'}), 401
    except Exception as e:
        return jsonify({'message': '토큰 검증 오류'}), 401
    
    conn = None
    cursor = None
    try:
        data = request.get_json() or {}
        user_id = data.get('user_id')
        login_ip = get_client_ip()

        if not user_id:
            return jsonify({'message': 'user_id가 필요합니다.'}), 400

        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500

        cursor = conn.cursor()
        login_time = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]  # 밀리초 포함
        sql_insert_log = """
        INSERT INTO tb_user_login_log (login_at, user_id, ip_address) VALUES (%s, %s, %s)"""
        cursor.execute(sql_insert_log, (login_time, user_id, login_ip))
        conn.commit()

        logger.info(f"[SQL/INSERT] tb_user_login_log {sql_insert_log}")
        return jsonify({'message': '로그인 기록이 저장되었습니다.'}), 201

    except Exception as e:
        print(f"로그인 기록 저장 오류: {e}")
        return jsonify({'message': '로그인 기록 저장 실패!'}), 500
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()

# 로그인 기록 조회 API
@auth_bp.route('/get_login_logs', methods=['GET', 'OPTIONS'])
@cross_origin(supports_credentials=True)
def get_login_logs():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'}), 200

    # 토큰 검증
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'message': '토큰이 없습니다.'}), 401
    token = token.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        user_id = payload.get('user_id')
    except jwt.ExpiredSignatureError:
        return jsonify({'message': '토큰이 만료되었습니다.'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'message': '유효하지 않은 토큰입니다.'}), 401
    except Exception as e:
        return jsonify({'message': '토큰 검증 오류'}), 401

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500

        cursor = conn.cursor(dictionary=True)
        
        # 로그인 기록 조회 쿼리
        sql_select_logs = """
        SELECT log.login_at, log.user_id, log.ip_address, user.name, user.department
        FROM tb_user_login_log log
        JOIN tb_user user ON log.user_id = user.id
        ORDER BY log.login_at DESC"""
        cursor.execute(sql_select_logs)
        logs = cursor.fetchall()

        logger.info(f"[SQL/SELECT] tb_user_login_log {sql_select_logs}")

        return jsonify({'message': '로그인 기록 조회 성공', 'logs': logs}), 200

    except Exception as e:
        print(f"로그인 기록 조회 오류: {e}")
        return jsonify({'message': '로그인 기록 조회 실패!'}), 500
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()

@auth_bp.route('/get_logged_in_user', methods=['GET', 'OPTIONS'])
@cross_origin(supports_credentials=True)
def get_logged_in_user():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'}), 200

    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'message': '토큰이 없습니다.'}), 401
    token = token.split(" ")[1]

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        user_id = payload['user_id']
        
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500

        cursor = conn.cursor(dictionary=True)
        sql_tb_user_select = """
            SELECT * FROM tb_user WHERE id = %s"""
        cursor.execute(sql_tb_user_select, (user_id,))
        logger.info(f"[SQL/SELECT] tb_user /get_logged_in_user{sql_tb_user_select}")

        user = cursor.fetchone()

        if user:
            try:
                user['id'] = user['id']
                user['name'] = user['name']
                user['phone_number'] = decrypt_aes(user['phone_number'])
            except Exception as decryption_error:
                print(f"복호화 오류: {decryption_error}")
                return jsonify({'message': '사용자 정보 복호화 실패'}), 500

            return jsonify({'user': user}), 200
        else:
            return jsonify({'message': '사용자 정보를 찾을 수 없습니다.'}), 404

    except jwt.ExpiredSignatureError:
        return jsonify({'message': '토큰이 만료되었습니다.'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'message': '유효하지 않은 토큰입니다.'}), 401
    except Exception as e:
        print(f"토큰 검증 오류: {e}")
        return jsonify({'message': '사용자 정보 조회 실패'}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass

# 비밀번호 변경 API
@auth_bp.route('/change_password', methods=['PUT', 'OPTIONS'])
def change_password():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'}), 200

    # 토큰 검증
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'message': '토큰이 없습니다.'}), 401
    token = token.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        user_id = payload.get('user_id')
    except jwt.ExpiredSignatureError:
        return jsonify({'message': '토큰이 만료되었습니다.'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'message': '유효하지 않은 토큰입니다.'}), 401
    except Exception as e:
        return jsonify({'message': '토큰 검증 오류'}), 401

    # 요청 데이터에서 old_password와 new_password 추출
    data = request.get_json() or {}
    old_password = data.get('old_password')
    new_password = data.get('new_password')

    if not old_password or not new_password:
        return jsonify({'message': '현재 비밀번호와 새 비밀번호를 모두 제공해야 합니다.'}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': '데이터베이스 연결 실패!'}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        # 현재 유저의 비밀번호와 first_login_yn 확인
        sql_tb_user_select = """
            SELECT password, first_login_yn 
            FROM tb_user 
            WHERE id = %s AND is_delete_yn = 'N'"""
        cursor.execute(sql_tb_user_select, (user_id,))
        logger.info(f"[SQL/SELECT] tb_user /change_password{sql_tb_user_select}")

        user = cursor.fetchone()
        if not user:
            return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404

        # 기존 비밀번호가 일치하는지 확인
        if not bcrypt.check_password_hash(user['password'], old_password):
            return jsonify({'message': '현재 비밀번호가 일치하지 않습니다.'}), 400

        # 새 비밀번호를 bcrypt로 해싱
        new_hashed = bcrypt.generate_password_hash(new_password).decode('utf-8')

        # 비밀번호를 업데이트하고 first_login_yn을 'y'로 변경 (비밀번호 변경 완료)
        sql_tb_user_update = """
            UPDATE tb_user 
            SET password = %s, first_login_yn = 'Y', updated_at = NOW(), updated_by = %s 
            WHERE id = %s"""
        cursor.execute(sql_tb_user_update, (new_hashed, payload.get('name', 'SYSTEM'), user_id))
        logger.info(f"[SQL/UPDATE] tb_user /change_password{sql_tb_user_update}")

        conn.commit()
        return jsonify({'message': '비밀번호가 성공적으로 변경되었습니다.'}), 200
    except Exception as e:
        conn.rollback()
        print(f"비밀번호 변경 오류: {e}")
        return jsonify({'message': f'비밀번호 변경 중 오류 발생: {e}'}), 500
    finally:
        cursor.close()
        conn.close()