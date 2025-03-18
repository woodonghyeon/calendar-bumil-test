from flask import Flask, request, send_from_directory, jsonify, render_template
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from config import ALLOWED_ORIGINS
from blueprints.auth import auth_bp
from blueprints.schedule import schedule_bp
from blueprints.user import user_bp
from blueprints.favorite import favorite_bp
from blueprints.project import project_bp
from blueprints.status import status_bp
from blueprints.admin import admin_bp
from blueprints.notice import notice_bp
from blueprints.department import department_bp
from blueprints.menu import menu_bp

import os, logging

app = Flask(__name__, static_folder="build", static_url_path="/")

# logs 디렉터리 생성 (없으면 자동 생성)
LOG_DIR = "/app/logs" if os.getenv("DOCKER_ENV") else "logs"
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

# 로그 포맷 설정
log_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')

# STDOUT 로그 (터미널 출력)
stdout_handler = logging.StreamHandler()
stdout_handler.setFormatter(log_formatter)

# 파일 로그 (파일 저장)
file_handler = logging.FileHandler(f"{LOG_DIR}/app.log")
file_handler.setFormatter(log_formatter)

# Flask의 기본 로거 설정
app.logger.setLevel(logging.INFO)
app.logger.addHandler(stdout_handler)
app.logger.addHandler(file_handler)

# werkzeug 기본 로그도 같이 보이도록 설정
werkzeug_logger = logging.getLogger("werkzeug")
werkzeug_logger.setLevel(logging.INFO)
werkzeug_logger.addHandler(stdout_handler)
werkzeug_logger.addHandler(file_handler)

# 다른 모듈에서도 app.logger를 사용하도록 함
logging.getLogger().addHandler(stdout_handler)
logging.getLogger().addHandler(file_handler)

# Bcrypt 설정
bcrypt = Bcrypt()
bcrypt.init_app(app)

# CORS 설정
CORS(app, supports_credentials=True, origins=ALLOWED_ORIGINS)

access_handler = logging.FileHandler("logs/access.log")
access_handler.setLevel(logging.INFO)
error_handler = logging.FileHandler("logs/error.log")
error_handler.setLevel(logging.ERROR)

app.logger.addHandler(access_handler)
app.logger.addHandler(error_handler)

# React 정적 파일 서빙 (index.html 없을 경우 404 처리)
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    if os.path.exists(os.path.join("build", path)):  # 정적 파일 요청이면 반환
        return send_from_directory("build", path)
    return send_from_directory("build", "index.html")  # React SPA 대응

# API 동작 확인용 엔드포인트 추가
@app.route("/health")
def health_check():
    app.logger.info("Health check 요청 받음")
    return jsonify({"status": "OK"}), 200

# ✅ 모든 404 요청을 React `index.html`로 리디렉트 (React 클라이언트 라우팅 지원)
@app.errorhandler(404)
def not_found(e):
    return send_from_directory("build", "index.html"), 200

# CORS 설정 개선
@app.after_request
def after_request(response):
    origin = request.headers.get("Origin")
    if origin and origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
    else:
        response.headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGINS[0]
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response

# 블루프린트 등록
app.register_blueprint(auth_bp)
app.register_blueprint(schedule_bp)
app.register_blueprint(user_bp)
app.register_blueprint(favorite_bp)
app.register_blueprint(project_bp)
app.register_blueprint(status_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(notice_bp)
app.register_blueprint(department_bp)
app.register_blueprint(menu_bp)

# gunicorn 사용 시 주석 처리
if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5000)
