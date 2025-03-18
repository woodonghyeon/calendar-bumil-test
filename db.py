# db.py
import mysql.connector
from config import db_config

def get_db_connection():
    try:
        print(f"DB 연결 설정: {db_config}")
        conn = mysql.connector.connect(**db_config)
        return conn
    except mysql.connector.Error as err:
        print(f"MySQL 연결 오류: {err}")
        return None
