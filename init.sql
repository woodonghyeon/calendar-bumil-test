-- 상태 테이블 생성
CREATE TABLE tb_status (
    id VARCHAR(100) PRIMARY KEY,
    comment VARCHAR(100) NOT NULL
);

-- 권한 테이블 생성
CREATE TABLE tb_role (
    id VARCHAR(100) PRIMARY KEY,
    comment VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'SYSTEM',
    updated_by VARCHAR(100) DEFAULT 'SYSTEM'
);

-- 사용자 테이블 생성
CREATE TABLE tb_user (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    position VARCHAR(100),
    department VARCHAR(100),
    phone_number VARCHAR(100),
    password VARCHAR(100) NOT NULL,
    role_id VARCHAR(100) NOT NULL,
    status VARCHAR(100) DEFAULT '본사',
    is_delete_yn CHAR(1) DEFAULT 'N',
    first_login_yn CHAR(1) DEFAULT 'N',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'SYSTEM',
    updated_by VARCHAR(100) DEFAULT 'SYSTEM',
    FOREIGN KEY (role_id) REFERENCES tb_role(id) ON DELETE CASCADE,
    FOREIGN KEY (status) REFERENCES tb_status(id) ON DELETE SET NULL
);

-- 즐겨찾기 테이블 생성
CREATE TABLE tb_favorite (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(100) NOT NULL,
    favorite_user_id VARCHAR(100) NOT NULL,
    is_favorite_yn CHAR(1) DEFAULT 'N',
    FOREIGN KEY (user_id) REFERENCES tb_user(id) ON DELETE CASCADE,
    FOREIGN KEY (favorite_user_id) REFERENCES tb_user(id) ON DELETE CASCADE
);

-- 일정 테이블 생성
CREATE TABLE tb_schedule (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    task VARCHAR(100) NOT NULL,
    status VARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES tb_user(id) ON DELETE CASCADE
);

-- 프로젝트 테이블 생성
CREATE TABLE tb_project (
    project_code VARCHAR(100) PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    status VARCHAR(100) NOT NULL,
    business_start_date DATE NOT NULL,
    business_end_date DATE NOT NULL,
    project_name TEXT NOT NULL,
    customer VARCHAR(100),
    supplier VARCHAR(100),
    person_in_charge VARCHAR(100),
    contact_number VARCHAR(100),
    sales_representative VARCHAR(100),
    project_pm VARCHAR(100) NOT NULL,
    project_manager VARCHAR(100),
    business_details_and_notes TEXT,
    changes TEXT,
    group_name VARCHAR(100),
    is_delete_yn CHAR(1) DEFAULT 'N',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'SYSTEM',
    updated_by VARCHAR(100) DEFAULT 'SYSTEM'
);

-- 프로젝트 사용자 매핑 테이블 생성
CREATE TABLE tb_project_user (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    project_code VARCHAR(100) NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    current_project_yn CHAR(1) DEFAULT 'N',
    is_delete_yn CHAR(1) DEFAULT 'N',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'SYSTEM',
    updated_by VARCHAR(100) DEFAULT 'SYSTEM',
    FOREIGN KEY (project_code) REFERENCES tb_project(project_code) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES tb_user(id) ON DELETE CASCADE
);

-- 유저 상태 변경 기록 테이블 생성 (새롭게 추가됨)
CREATE TABLE tb_user_status_log (
    recorded_at DATETIME(3) PRIMARY KEY,  -- 상태 기록 시간 (밀리초 포함)
    status_id VARCHAR(100) NOT NULL,      -- 상태 ID (tb_status 참조)
    user_id VARCHAR(100) NOT NULL,        -- 사용자 ID (tb_user 참조)
    created_by VARCHAR(100) DEFAULT 'SYSTEM', -- 생성자 정보

    FOREIGN KEY (status_id) REFERENCES tb_status(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES tb_user(id) ON DELETE CASCADE
);


INSERT INTO tb_role (id, comment, created_at, created_by, updated_at, updated_by)
VALUES 
    ('AD_ADMIN', '어드민 권한 (전체 시스템 관리)', NOW(), 'SYSTEM', NULL, NULL),
    ('PR_ADMIN', '프로젝트 어드민 (프로젝트 관리자)', NOW(), 'SYSTEM', NULL, NULL),
    ('PR_MANAGER', '프로젝트 매니저 (PM)', NOW(), 'SYSTEM', NULL, NULL),
    ('USR_GENERAL', '일반 사용자', NOW(), 'SYSTEM', NULL, NULL);
    
INSERT INTO tb_status (id, comment)
VALUES 
    ('본사', '본사'),
    ('외근', '외근'),
    ('파견', '파견'),
    ('휴가', '휴가');
