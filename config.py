import os
from dotenv import load_dotenv

# ✅ `.env` 강제 로드 (파일이 존재하는 경우)
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=env_path)

# CORS 관련 설정
SERVER_URL = os.getenv("REACT_APP_URL", "http://localhost:3232")
API_URL = os.getenv("REACT_APP_API_URL", "http://172.19.0.3:5252")

# 내부 네트워크에서 직접 접근할 수 있도록 설정
ALLOWED_ORIGINS = [
    "http://172.19.0.3:5252",  # 내부 IP에서 직접 접근 허용
    "http://localhost:3232",  # 로컬 개발 환경
    SERVER_URL,
    API_URL
]

# ✅ 환경 변수가 없을 경우 기본값을 설정 (오류 방지)
db_config = {
    "host": os.getenv("REACT_APP_DB_HOST", "localhost"),
    "user": os.getenv("REACT_APP_DB_USER", "root"),
    "password": os.getenv("REACT_APP_DB_PASSWORD", ""),
    "database": os.getenv("REACT_APP_DB_NAME", "test_db"),
    "raise_on_warnings": True
}

# ✅ JWT 시크릿키 설정 (기본값 추가)
SECRET_KEY = os.getenv("REACT_APP_SECRET_KEY", "default_secret_key")

# ✅ 환경 변수 정상 로드 확인 (Flask 실행 시 로그 출력)
print("✅ 환경 변수 로드 완료!")
print("DB_HOST:", db_config["host"])
print("DB_NAME:", db_config["database"])
print("DB_USER:", db_config["user"])
print("DB_PASSWORD:", db_config["password"])
print("SECRET_KEY:", SECRET_KEY)