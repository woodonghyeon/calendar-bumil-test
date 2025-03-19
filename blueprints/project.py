from flask import Blueprint, request, jsonify
import jwt, logging
from db import get_db_connection
from config import SECRET_KEY
from datetime import datetime
from blueprints.auth import decrypt_deterministic, encrypt_deterministic, decrypt_aes
from blueprints.auth import verify_and_refresh_token

project_bp = Blueprint('project', __name__, url_prefix='/project')
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

def parse_date(date_str: str) -> str:
    try:
        if not date_str or date_str == "None":
            return None  # 빈 문자열 또는 "None" 문자열이면 None 반환

        if isinstance(date_str, str) and "," in date_str:
            return datetime.strptime(date_str, '%a, %d %b %Y %H:%M:%S %Z').strftime('%Y-%m-%d')
        elif isinstance(date_str, str):
            # 이미 "YYYY-MM-DD" 형식일 경우
            return date_str
        else:
            raise ValueError("Invalid date format")
    except Exception as e:
        raise ValueError(f"날짜 형식 오류: {date_str} - {e}")
    
# 모든 프로젝트 조회 (tb_project와 tb_project_user를 조인)
@project_bp.route('/get_all_project', methods=['GET', 'OPTIONS'])
def get_all_project():
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
        SELECT p.*, GROUP_CONCAT(pu.user_id) AS assigned_user_ids
        FROM tb_project p
        LEFT JOIN tb_project_user pu ON p.project_code = pu.project_code AND pu.is_delete_yn = 'N'
        WHERE p.is_delete_yn = 'N'
        GROUP BY p.project_code
        ORDER BY p.created_at DESC
        """
        cursor.execute(sql)
        logger.info(f"[SQL/SELECT] tb_project, tb_project_user /get_all_project{sql}")
        
        projects = cursor.fetchall()
        
        for project in projects:
            if project.get("assigned_user_ids"):
                assigned_ids = [eid.strip() for eid in project["assigned_user_ids"].split(",") if eid.strip() != ""]
                project["assigned_user_ids"] = assigned_ids
            else:
                project["assigned_user_ids"] = []
        
        return jsonify({'projects': projects}), 200
    except Exception as e:
        print(f"프로젝트 가져오기 오류: {e}")
        return jsonify({'message': '프로젝트 가져오기 오류'}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass

# 검색 조건에 따른 프로젝트 조회
@project_bp.route('/get_search_project', methods=['GET', 'OPTIONS'])
def get_search_project():
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
        SELECT p.*, GROUP_CONCAT(pu.user_id) AS assigned_user_ids
        FROM tb_project p
        LEFT JOIN tb_project_user pu 
        ON p.project_code = pu.project_code AND pu.is_delete_yn = 'N'
        WHERE p.is_delete_yn = 'N'"""
        params = []
        # 조건 추가
        if request.args.get('Business_Start_Date'):
            sql += " AND p.business_start_date >= %s"
            params.append(request.args.get('Business_Start_Date'))
        if request.args.get('Business_End_Date'):
            sql += " AND p.business_end_date <= %s"
            params.append(request.args.get('Business_End_Date'))
        if request.args.get('Project_PM'):
            sql += " AND p.project_pm LIKE %s"
            params.append(f"%{request.args.get('Project_PM')}%")
        if request.args.get('Sales_Representative'):
            sql += " AND p.sales_representative LIKE %s"
            params.append(f"%{request.args.get('Sales_Representative')}%")
        if request.args.get('Group_Name'):
            sql += " AND p.group_name LIKE %s"
            params.append(f"%{request.args.get('Group_Name')}%")
        if request.args.get('Project_Code'):
            sql += " AND p.project_code LIKE %s"
            params.append(f"%{request.args.get('Project_Code')}%")
        if request.args.get('Project_Name'):
            sql += " AND p.project_name LIKE %s"
            params.append(f"%{request.args.get('Project_Name')}%")
        sql += " GROUP BY p.project_code"
        cursor.execute(sql, tuple(params))
        logger.info(f"[SQL/SELECT] tb_project, tb_project_user /get_search_project{sql}")

        search_projects = cursor.fetchall()
        return jsonify({'projects': search_projects}), 200
    except Exception as e:
        print(f"검색 프로젝트 가져오기 오류: {e}")
        return jsonify({'message': '검색 프로젝트 가져오기 오류'}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass

# 특정 프로젝트 상세 정보 조회 (JOIN 포함)
@project_bp.route('/get_project_details', methods=['GET', 'OPTIONS'])
def get_project_details():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'})
    
    # verify_and_refresh_token 사용하여 토큰 검증 및 자동 갱신
    user_id, user_name, role_id, refresh_response, status_code = verify_and_refresh_token(request)
    if refresh_response:
        return refresh_response, status_code  # 자동 토큰 갱신 응답 반환
    
    if user_id is None:
        return jsonify({'message': '토큰 인증 실패'}), 401
    
    project_code = request.args.get('project_code')
    if not project_code:
        return jsonify({'message': '프로젝트 코드가 제공되지 않았습니다.'}), 400

    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500

        cursor = conn.cursor(dictionary=True)
        # tb_project에서 프로젝트 정보 조회
        sql_project = """
            SELECT *
            FROM tb_project
            WHERE project_code = %s AND is_delete_yn = 'N'"""
        cursor.execute(sql_project, (project_code,))
        logger.info(f"[SQL/SELECT] tb_project /get_project_details{sql_project}")
        project = cursor.fetchone()

        if not project:
            return jsonify({'message': '해당 프로젝트를 찾을 수 없습니다.'}), 404

        # tb_project_user에서 해당 프로젝트의 참여자(인력) 정보 조회
        sql_project_users = """
            SELECT *
            FROM tb_project_user
            WHERE project_code = %s AND is_delete_yn = 'N'"""
        cursor.execute(sql_project_users, (project_code,))
        logger.info(f"[SQL/SELECT] tb_project_user /get_search_project{sql_project_users}")
        project_users = cursor.fetchall()

        # 프로젝트 정보에 참여자 정보를 추가 (원하는 키 이름으로 지정 가능: participants 또는 project_users)
        project['project_users'] = project_users

        return jsonify({'project': project}), 200

    except Exception as e:
        print(f"프로젝트 상세정보 조회 오류: {e}")
        return jsonify({'message': '프로젝트 상세정보 조회 오류'}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass

@project_bp.route('/add_project', methods=['POST', 'OPTIONS'])
def add_project():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'})
    
    # verify_and_refresh_token 사용하여 토큰 검증 및 자동 갱신
    user_id, user_name, role_id, refresh_response, status_code = verify_and_refresh_token(request)
    if refresh_response:
        return refresh_response, status_code  # 자동 토큰 갱신 응답 반환
    
    if user_id is None:
        return jsonify({'message': '토큰 인증 실패'}), 401
    
    created_by = user_name or 'SYSTEM'
    updated_by = user_name or 'SYSTEM'

    try:
        data = request.get_json()

        required_fields = ["project_code", "category", "status", "business_start_date", "business_end_date", "project_name", "project_pm"]
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return jsonify({'message': f'필수 입력 값이 누락되었습니다: {missing_fields}'}), 400

        project_code = data.get('project_code')
        category = data.get('category')
        status = data.get('status')
        business_start_date = data.get('business_start_date')
        business_end_date = data.get('business_end_date')
        project_name = data.get('project_name')
        project_pm = data.get('project_pm')

        customer = data.get('customer')
        supplier = data.get('supplier')
        person_in_charge = data.get('person_in_charge')
        contact_number = data.get('contact_number')
        sales_representative = data.get('sales_representative')
        project_manager = data.get('project_manager')
        business_details_and_notes = data.get('business_details_and_notes')
        changes = data.get('changes')
        group_name = data.get('group_name')

        current_project_yn = 'y' if status == "진행 중" else 'n'

        participants = data.get('participants', [])
        if not isinstance(participants, list):
            return jsonify({'message': '❌ participants 형식 오류! 리스트가 필요합니다.'}), 400

        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500
        cursor = conn.cursor(dictionary=True)

        # 프로젝트 코드 중복 체크
        sql_check_project_code = """
        SELECT COUNT(*) AS cnt 
        FROM tb_project 
        WHERE project_code = %s AND is_delete_yn = 'N' OR is_delete_yn = 'Y'"""
        cursor.execute(sql_check_project_code, (project_code,))
        logger.info(f"[SQL/SELECT] tb_project /add_project{sql_check_project_code}")
        existing_count = cursor.fetchone()['cnt']
        if existing_count > 0:
            return jsonify({'message': '이미 존재하는 프로젝트 코드입니다.'}), 400

        sql_project = """
        INSERT INTO tb_project
        (project_code, category, status, business_start_date, business_end_date,
        project_name, customer, supplier, person_in_charge, contact_number,
        sales_representative, project_pm, project_manager, business_details_and_notes, changes,
        group_name, is_delete_yn, created_at, updated_at, created_by, updated_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'N', NOW(), NOW(), %s, %s)"""
        values_project = (
            project_code, category, status, business_start_date, business_end_date,
            project_name, customer, supplier, person_in_charge, contact_number,
            sales_representative, project_pm, project_manager, business_details_and_notes, changes,
            group_name, created_by, created_by
        )
        cursor.execute(sql_project, values_project)
        logger.info(f"[SQL/INSERT] tb_project /add_project{sql_project}")

        sql_project_user = """
        INSERT INTO tb_project_user
        (project_code, user_id, start_date, end_date, current_project_yn, is_delete_yn, created_at, updated_at, created_by, updated_by)
        VALUES
        (%s, %s, %s, %s, %s, 'N', NOW(), NOW(), %s, %s)
        """
        for participant in participants:
            participant_id = participant.get("id")
            start_date = participant.get("start_date", business_start_date)
            end_date = participant.get("end_date", business_end_date)

            if not participant_id:
                return jsonify({'message': '참여자 ID가 누락되었습니다.'}), 400

            cursor.execute(sql_project_user, (project_code, participant_id, start_date, end_date, current_project_yn, created_by, created_by))
            logger.info(f"[SQL/INSERT] tb_project_user /add_project{sql_project_user}")
        conn.commit()
        return jsonify({'message': '프로젝트가 추가되었습니다.'}), 201
    except Exception as e:
        print(f"프로젝트 추가 오류: {e}")
        return jsonify({'message': f'프로젝트 추가 중 오류 발생: {e}'}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass

# 프로젝트 수정
@project_bp.route('/edit_project', methods=['POST', 'OPTIONS'])
def edit_project():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'})
    
    # verify_and_refresh_token 사용하여 토큰 검증 및 자동 갱신
    user_id, user_name, role_id, refresh_response, status_code = verify_and_refresh_token(request)
    if refresh_response:
        return refresh_response, status_code  # 자동 토큰 갱신 응답 반환
    
    if user_id is None:
        return jsonify({'message': '토큰 인증 실패'}), 401
    
    updated_by = user_name or 'SYSTEM'

    try:
        data = request.get_json()

        new_project_code = data.get('project_code')
        category = data.get('category')
        status = data.get('status')
        # 날짜 문자열 변환: parse_date 함수를 사용하여 ISO 형식("YYYY-MM-DD")로 통일
        business_start_date = parse_date(data.get('business_start_date'))
        business_end_date = parse_date(data.get('business_end_date'))
        
        project_name = data.get('project_name')
        customer = data.get('customer')
        supplier = data.get('supplier')
        person_in_charge = data.get('person_in_charge')
        contact_number = data.get('contact_number')
        sales_representative = data.get('sales_representative')
        project_pm = data.get('project_pm')
        project_manager = data.get('project_manager')
        business_details_and_notes = data.get('business_details_and_notes')
        changes = data.get('changes')
        group_name = data.get('group_name')

        # 클라이언트에서 전달된 참여자 정보 배열 (participants)
        # 각 항목은 user_id, start_date, end_date를 포함한다고 가정
        participants = data.get('participants')
        if not isinstance(participants, list):
            return jsonify({'message': '프로젝트 참여자 정보 형식 오류! 배열이 필요합니다.'}), 400

        current_project_yn = 'y' if status == "진행 중" else 'n'

        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500

        # 기존 프로젝트 조회
        cursor = conn.cursor(dictionary=True)
        sql_select_project = """
            SELECT project_code FROM tb_project
            WHERE project_code = %s AND is_delete_yn = 'N'"""
        cursor.execute(sql_select_project, (new_project_code,))
        logger.info(f"[SQL/SELECT] tb_project /edit_project{sql_select_project}")

        old_project = cursor.fetchone()
        if not old_project:
            return jsonify({'message': '수정할 프로젝트를 찾을 수 없습니다.'}), 404
        old_project_code = old_project['project_code']
        cursor.close()
        
        # tb_project 업데이트
        cursor = conn.cursor()
        sql_project = """
        UPDATE tb_project
        SET 
            category = %s,
            status = %s,
            business_start_date = %s,
            business_end_date = %s,
            project_name = %s,
            customer = %s,
            supplier = %s,
            person_in_charge = %s,
            contact_number = %s,
            sales_representative = %s,
            project_pm = %s,
            project_manager = %s,
            business_details_and_notes = %s,
            changes = %s,
            group_name = %s,
            project_code = %s,
            updated_at = NOW(),
            updated_by = %s
        WHERE project_code = %s"""
        values_project = (
            category, status, business_start_date, business_end_date,
            project_name, customer, supplier, person_in_charge, contact_number,
            sales_representative, project_pm, project_manager,
            business_details_and_notes, changes, group_name,
            new_project_code, updated_by,
            old_project_code
        )
        cursor.execute(sql_project, values_project)
        logger.info(f"[SQL/UPDATE] tb_project /edit_project{sql_project}")

        cursor.close()

        # tb_project_user 업데이트: 기존 참여자 논리 삭제 후 재등록
        cursor = conn.cursor()
        cursor.execute("UPDATE tb_project_user SET is_delete_yn = 'Y', updated_at = NOW(), updated_by = %s WHERE project_code = %s", (updated_by, old_project_code))
        sql_project_user = """
        INSERT INTO tb_project_user
        (project_code, user_id, start_date, end_date, current_project_yn, is_delete_yn, created_at, updated_at, created_by, updated_by)
        VALUES
        (%s, %s, %s, %s, %s, 'N', NOW(), NOW(), %s, %s)"""
        
        for participant in participants:
            participant_user_id = participant.get("user_id") or participant.get("id")
            participant_start_date = parse_date(participant.get("start_date"))
            participant_end_date = parse_date(participant.get("end_date"))
            
            if not participant_user_id:
                return jsonify({'message': '참여자 ID가 누락되었습니다.'}), 400

            # 날짜가 누락된 경우 기본값 설정 (예: 오늘 날짜)
            if not participant_start_date:
                participant_start_date = datetime.now().strftime('%Y-%m-%d')
            if not participant_end_date:
                participant_end_date = participant_start_date  # 종료일 없으면 시작일과 동일하게

            cursor.execute(sql_project_user, (
                new_project_code, participant_user_id, participant_start_date, participant_end_date,
                current_project_yn, updated_by, updated_by
            ))
            logger.info(f"[SQL/INSERT] tb_project_user /edit_project{sql_project_user}")

        conn.commit()

        return jsonify({'message': '프로젝트가 수정되었습니다.'}), 200

    except Exception as e:
        print(f"프로젝트 수정 오류: {e}")
        return jsonify({'message': f'프로젝트 수정 중 오류 발생: {e}'}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass

# 프로젝트 삭제 (논리 삭제)
@project_bp.route('/delete_project/<string:project_code>', methods=['PUT', 'OPTIONS'])
def delete_project(project_code):
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
        sql_project = "UPDATE tb_project SET is_delete_yn = 'Y', updated_at = NOW() WHERE project_code = %s"
        cursor.execute(sql_project, (project_code,))
        logger.info(f"[SQL/UPDATE] tb_project /delete_project{sql_project}")

        sql_project_user = "UPDATE tb_project_user SET is_delete_yn = 'Y', updated_at = NOW() WHERE project_code = %s"
        cursor.execute(sql_project_user, (project_code,))
        logger.info(f"[SQL/UPDATE] tb_project_user /delete_project{sql_project_user}")

        conn.commit()
        return jsonify({'message': '프로젝트가 삭제되었습니다.'}), 200
    except jwt.ExpiredSignatureError:
        return jsonify({'message': '토큰이 만료되었습니다.'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'message': '유효하지 않은 토큰입니다.'}), 401
    except Exception as e:
        print(f"프로젝트 삭제 오류: {e}")
        return jsonify({'message': '프로젝트 삭제 오류'}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass

# tb_user와 tb_project_user 조회
@project_bp.route('/get_user_and_projects', methods=['GET', 'OPTIONS'])
def get_user_and_projects():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'})
    
    # verify_and_refresh_token 사용하여 토큰 검증 및 자동 갱신
    user_id, user_name, role_id, refresh_response, status_code = verify_and_refresh_token(request)
    if refresh_response:
        return refresh_response, status_code  # 자동 토큰 갱신 응답 반환
    
    if user_id is None:
        return jsonify({'message': '토큰 인증 실패'}), 401
    
    if not user_id:
        return jsonify({'message': 'user_id 파라미터가 제공되지 않았습니다.'}), 400

    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500
        cursor = conn.cursor(dictionary=True)

        # tb_user 테이블에서 필요한 컬럼 조회
        sql = """
            SELECT id, name, position, department, phone_number, role_id, status, is_delete_yn, first_login_yn
            FROM tb_user
            WHERE id = %s AND is_delete_yn = 'N'"""
        cursor.execute(sql, (user_id,))
        user_info = cursor.fetchone()
        logger.info(f"[SQL/SELECT] tb_user /get_user_and_projects{sql}")

        if not user_info:
            return jsonify({'message': '사용자 정보를 찾을 수 없습니다.'}), 404

        # ✅ 복호화 시도
        try:
            user_info['phone_number'] = decrypt_aes(user_info['phone_number'])
        except Exception as decrypt_error:
            print(f"📛 Phone number 복호화 오류: {decrypt_error}")
            user_info['phone_number'] = "복호화 실패"

        # tb_project_user와 tb_project 테이블을 조인하여 해당 사용자의 프로젝트 참여 정보 조회
        sql_project_and_project_user = """
            SELECT tpu.*, p.project_name
            FROM tb_project_user tpu
            JOIN tb_project p ON tpu.project_code = p.project_code
            WHERE tpu.user_id = %s"""
        cursor.execute(sql_project_and_project_user, (user_id,))
        logger.info(f"[SQL/SELECT] tb_project, tb_project_user /get_user_and_projects{sql_project_and_project_user}")

        participants = cursor.fetchall()

        return jsonify({
            'user': user_info,
            'participants': participants
        }), 200

    except Exception as e:
        print(f"사용자 및 프로젝트 정보 조회 오류: {e}")
        return jsonify({'message': '사용자 및 프로젝트 정보 조회 오류'}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass

# tb_user와 tb_project_user 조회(여러 사용자를 한번에 조회)
@project_bp.route('/get_users_and_projects', methods=['POST', 'OPTIONS'])
def get_users_and_projects():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'})
    
    # verify_and_refresh_token 사용하여 토큰 검증 및 자동 갱신
    user_id, user_name, role_id, refresh_response, status_code = verify_and_refresh_token(request)
    if refresh_response:
        return refresh_response, status_code  # 자동 토큰 갱신 응답 반환
    
    if user_id is None:
        return jsonify({'message': '토큰 인증 실패'}), 401
    
    data = request.get_json()
    user_ids = data.get('user_ids')

    if not user_ids or not isinstance(user_ids, list):
        return jsonify({'message': 'user_ids 파라미터가 유효한 리스트 형식이 아닙니다.'}), 400

    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': '데이터베이스 연결 실패!'}), 500
        cursor = conn.cursor(dictionary=True)

        # ✅ 여러 사용자 정보 조회
        format_strings = ','.join(['%s'] * len(user_ids))  # IN 절을 위한 포맷팅
        sql = f"""
            SELECT id, name, position, department, phone_number, role_id, status, is_delete_yn, first_login_yn
            FROM tb_user
            WHERE id IN ({format_strings}) AND is_delete_yn = 'N'"""
        cursor.execute(sql, tuple(user_ids))
        logger.info(f"[SQL/SELECT] tb_user /get_users_and_projects{sql}")

        users = cursor.fetchall()

        if not users:
            return jsonify({'message': '사용자 정보를 찾을 수 없습니다.'}), 404

        # ✅ 전화번호 복호화 처리
        for user in users:
            try:
                user['phone_number'] = decrypt_aes(user['phone_number'])
            except Exception as decrypt_error:
                print(f"📛 Phone number 복호화 오류 ({user['id']}): {decrypt_error}")
                user['phone_number'] = "복호화 실패"

        # ✅ 여러 사용자에 대한 프로젝트 정보 조회
        sql_project_and_project_user = f"""
            SELECT tpu.*, p.project_name
            FROM tb_project_user tpu
            JOIN tb_project p ON tpu.project_code = p.project_code
            WHERE tpu.user_id IN ({format_strings})"""
        cursor.execute(sql_project_and_project_user, tuple(user_ids))
        logger.info(f"[SQL/SELECT] tb_project, tb_project_user /get_users_and_projects{sql_project_and_project_user}")

        participants = cursor.fetchall()

        return jsonify({
            'users': users,
            'participants': participants
        }), 200

    except Exception as e:
        print(f"사용자 및 프로젝트 정보 조회 오류: {e}")
        return jsonify({'message': '사용자 및 프로젝트 정보 조회 오류'}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass
