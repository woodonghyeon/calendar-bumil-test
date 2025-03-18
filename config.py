import os
from dotenv import load_dotenv

load_dotenv()

# CORS 관련 설정
SERVER_URL = os.getenv("REACT_APP_URL", "http://localhost:3000")
API_URL = os.getenv("REACT_APP_API_URL", "http://172.19.0.3:5000")

# 내부 네트워크에서 직접 접근할 수 있도록 설정
ALLOWED_ORIGINS = [
    "http://172.19.0.3:5000",  # 내부 IP에서 직접 접근 허용
    "http://localhost:3000",  # 로컬 개발 환경
    SERVER_URL,
    API_URL
]

# DB 설정
db_config = {
    "host": os.getenv("REACT_APP_DB_HOST"),
    "user": os.getenv("REACT_APP_DB_USER"),
    "password": os.getenv("REACT_APP_DB_PASSWORD"),
    "database": os.getenv("REACT_APP_DB_NAME"),
    "raise_on_warnings": True
}

# JWT 시크릿키
SECRET_KEY = os.getenv("REACT_APP_SECRET_KEY")
