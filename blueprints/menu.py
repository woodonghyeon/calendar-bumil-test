from flask import Blueprint, request, jsonify
import jwt, logging
from db import get_db_connection
from config import SECRET_KEY
from blueprints.auth import verify_and_refresh_token

menu_bp = Blueprint('menu', __name__, url_prefix='/menu')
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# 메뉴 목록 조회
@menu_bp.route('/get_menu_list', methods=['GET', 'OPTIONS'])
def get_menu_list():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'})
    
    # verify_and_refresh_token 사용하여 토큰 검증 및 자동 갱신
    user_id, user_name, role_id, refresh_response, status_code = verify_and_refresh_token(request)
    if refresh_response:
        return refresh_response, status_code  # 자동 토큰 갱신 응답 반환
    
    if user_id is None:
        return jsonify({'message': '토큰 인증 실패'}), 401
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        sql = "SELECT * FROM tb_menu ORDER BY menu_order ASC"
        cursor.execute(sql)
        menus = cursor.fetchall()
        logger.info(f"[SQL/SELECT] {sql}")
        return jsonify({'menus': menus}), 200
    except Exception as e:
        return jsonify({'message': f'메뉴 조회 실패: {str(e)}'}), 500
    finally:
        cursor.close()
        conn.close()

# 메뉴 추가
@menu_bp.route('/create_menu', methods=['POST', 'OPTIONS'])
def create_menu():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'})
    
    # verify_and_refresh_token 사용하여 토큰 검증 및 자동 갱신
    user_id, user_name, role_id, refresh_response, status_code = verify_and_refresh_token(request)
    if refresh_response:
        return refresh_response, status_code  # 자동 토큰 갱신 응답 반환
    
    if user_id is None:
        return jsonify({'message': '토큰 인증 실패'}), 401
    
    data = request.get_json()
    menu_id = data.get('menu_id')
    menu_nm = data.get('menu_nm')
    menu_order = data.get('menu_order', 0)
    created_by = user_name or 'SYSTEM'

    if not menu_id or not menu_nm:
        return jsonify({'message': '메뉴 ID와 이름을 입력해야 합니다.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 존재하는 menu_id 인지 확인
        sql_select_menu = """
        SELECT COUNT(*) AS count FROM tb_menu WHERE menu_id = %s"""
        cursor.execute(sql_select_menu, (menu_id,))
        exists = cursor.fetchone()['count'] > 0
        logger.info(f"[SQL/SELECT] {sql_select_menu} | PARAMS: ({menu_id})")
        if exists:
            return jsonify({'message': '이미 존재하는 menu_id입니다.'}), 400
        
        sql = """
        INSERT INTO tb_menu (menu_id, menu_nm, menu_order, created_by, updated_by)
        VALUES (%s, %s, %s, %s, %s)"""
        cursor.execute(sql, (menu_id, menu_nm, menu_order, created_by, created_by))
        conn.commit()
        logger.info(f"[SQL/INSERT] {sql} | PARAMS: ({menu_id}, {menu_nm}, {menu_order})")
        return jsonify({'message': '메뉴가 추가되었습니다.'}), 201
    except Exception as e:
        return jsonify({'message': f'메뉴 추가 실패: {str(e)}'}), 500
    finally:
        cursor.close()
        conn.close()
        
# 메뉴 수정
@menu_bp.route('/update_menu/<string:menu_id>', methods=['PUT', 'OPTIONS'])
def update_menu(menu_id):
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'})
    
    # verify_and_refresh_token 사용하여 토큰 검증 및 자동 갱신
    user_id, user_name, role_id, refresh_response, status_code = verify_and_refresh_token(request)
    if refresh_response:
        return refresh_response, status_code  # 자동 토큰 갱신 응답 반환
    
    if user_id is None:
        return jsonify({'message': '토큰 인증 실패'}), 401
    
    data = request.get_json()
    menu_nm = data.get('menu_nm')
    menu_order = data.get('menu_order')
    updated_by = user_name or 'SYSTEM'

    if not menu_nm or menu_order is None:
        return jsonify({'message': '메뉴 이름과 순서를 입력해야 합니다.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        sql = """
        UPDATE tb_menu
        SET menu_nm = %s, menu_order = %s, updated_by = %s, updated_at = NOW()
        WHERE menu_id = %s"""
        cursor.execute(sql, (menu_nm, menu_order, updated_by, menu_id))
        conn.commit()
        logger.info(f"[SQL/UPDATE] {sql} | PARAMS: ({menu_nm}, {menu_order})")

        if cursor.rowcount == 0:
            return jsonify({'message': '메뉴를 찾을 수 없습니다.'}), 404

        return jsonify({'message': '메뉴가 성공적으로 수정되었습니다.'}), 200
    except Exception as e:
        return jsonify({'message': f'메뉴 수정 실패: {str(e)}'}), 500
    finally:
        cursor.close()
        conn.close()


# 메뉴 삭제
@menu_bp.route('/delete_menu/<string:menu_id>', methods=['DELETE', 'OPTIONS'])
def delete_menu(menu_id):
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight request success'})
    
    # verify_and_refresh_token 사용하여 토큰 검증 및 자동 갱신
    user_id, user_name, role_id, refresh_response, status_code = verify_and_refresh_token(request)
    if refresh_response:
        return refresh_response, status_code  # 자동 토큰 갱신 응답 반환
    
    if user_id is None:
        return jsonify({'message': '토큰 인증 실패'}), 401
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        sql = "DELETE FROM tb_menu WHERE menu_id = %s"
        cursor.execute(sql, (menu_id,))
        conn.commit()
        logger.info(f"[SQL/DELETE] {sql} | PARAMS: ({menu_id})")

        if cursor.rowcount == 0:
            return jsonify({'message': '메뉴를 찾을 수 없습니다.'}), 404

        return jsonify({'message': '메뉴가 성공적으로 삭제되었습니다.'}), 200
    except Exception as e:
        return jsonify({'message': f'메뉴 삭제 실패: {str(e)}'}), 500
    finally:
        cursor.close()
        conn.close()
