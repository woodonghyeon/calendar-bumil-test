import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./LoginPage.css";

/**
 * 📌 LoginPage - 사용자 로그인 페이지
 *
 * ✅ 주요 기능:
 *  - 사용자 로그인 처리 (POST /auth/login)
 *  - 로그인된 사용자 정보 불러오기 (GET /auth/get_logged_in_user)
 *  - 아이디 저장 & 자동 로그인 기능 지원
 *  - 최초 로그인 여부 확인 후 라우팅 처리
 *
 * ✅ UI(또는 Component) 구조:
 *  - LoginPage (메인 페이지)
 *    ├── 로그인 입력 필드 (아이디, 비밀번호)
 *    ├── 체크박스 (아이디 저장, 자동 로그인)
 *    ├── 로그인 버튼
 *    ├── 회원가입 링크
 */

const LoginPage = () => {
  const [id, setId] = useState(""); // 사용자 아이디(이메일)
  const [password, setPassword] = useState(""); // 사용자 비밀번호
  const [rememberMe, setRememberMe] = useState(false); // 아이디 저장 여부
  const [autoLogin, setAutoLogin] = useState(false); // 자동 로그인 여부
  const [message, setMessage] = useState(""); // 로그인 메세지 (성공, 실패)

  const navigate = useNavigate(); // 페이지 이동을 위한 네비게이션
  const apiUrl = process.env.REACT_APP_API_URL; // API URL 환경변수

  /**
   * 🔄 **컴포넌트 마운트 시 실행 (로그인 상태 확인)**
   * - 아이디 저장 기능이 활성화되어 있으면 입력 필드에 반영
   * - 자동 로그인 설정이 되어 있고, 토큰이 존재하면 로그인 상태 유지
   */
  useEffect(() => {
    const savedId = localStorage.getItem("savedId");
    const savedAutoLogin = localStorage.getItem("autoLogin") === "true";

    if (savedId) {
      setId(savedId);
      setRememberMe(true);
    }

    if (savedAutoLogin) {
      const token = localStorage.getItem("token");
      if (token) {
        navigate("/calendar", { replace: true }); // 자동으로 캘린더 페이지로 이동
      }
      setAutoLogin(true);
    }
  }, [navigate]);

  // 아이디 저장 체크박스 이벤트 핸들러
  const handleRememberMeChange = (e) => {
    setRememberMe(e.target.checked);
  };

  // 자동 로그인 체크박스 핸들러
  const handleAutoLoginChange = (e) => {
    setAutoLogin(e.target.checked);
  };

  /**
   * 🔑 **로그인 처리 함수**
   * - 사용자가 입력한 아이디와 비밀번호를 백엔드로 전송
   * - 로그인 성공 시 토큰 및 사용자 정보를 저장
   * - 로그인 옵션(아이디 저장, 자동 로그인) 처리
   * - 최초 로그인 여부 확인 후 페이지 이동
   */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);

        // ✅ 로그인 성공 시 토큰 저장
        localStorage.setItem("token", data.token);

        // ✅ 로그인 사용자 정보 불러오기
        const userResponse = await fetch(`${apiUrl}/auth/get_logged_in_user`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${data.token}`,
          },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          //localStorage.setItem("user", JSON.stringify(userData.user)); // ✅ 최신 사용자 정보 저장
          localStorage.removeItem("user");
        }

        // ✅ 아이디 저장 여부 처리
        if (rememberMe) {
          localStorage.setItem("savedId", id);
        } else {
          localStorage.removeItem("savedId");
        }

        // ✅ 자동 로그인 여부 처리
        if (autoLogin) {
          localStorage.setItem("autoLogin", "true");
        } else {
          localStorage.removeItem("autoLogin");
        }

        // ✅ 별도의 API로 로그인 기록을 남기는 경우
        await fetch(`${apiUrl}/auth/log_login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.token}`,
          },
          body: JSON.stringify({ user_id: id }),
        });

        // ✅ 최초 로그인 여부 확인 후 페이지 이동
        if (data.user.first_login_yn === "Y") {
          navigate("/calendar", { replace: true });
        } else if (data.user.first_login_yn === "N") {
          navigate("/change-pw", { replace: true });
        }
      } else {
        // ❌ 로그인 실패 처리
        if (response.status === 403 && data.message === "승인 대기 중입니다!") {
          alert("승인 대기 중입니다. 관리자의 승인을 기다려주세요.");
        } else {
          setMessage(data.message);
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      setMessage("Login failed due to an error.");
    }
  };

  /**
   * 📋 **UI 렌더링**
   */
  return (
    <div className="login-page">
      <div className="login-container">
        <h2>Login</h2>
        {/* 🔑 로그인 폼 */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="id">
              E-mail<span className="required">*</span>
            </label>
            <input
              type="text"
              id="id"
              name="id"
              value={id}
              onChange={(e) => setId(e.target.value)}
              required
            />
          </div>
          {/* ✅ 비밀번호 입력 */}
          <div className="form-group">
            <label htmlFor="password">
              Password<span className="required">*</span>
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {/* ✅ 체크박스 (아이디 저장, 자동 로그인) */}
          <div className="checkbox-container">
            <div className="form-group remember-me">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={handleRememberMeChange}
              />
              <label htmlFor="rememberMe">아이디 저장</label>
            </div>
            <div className="form-group auto-login">
              <input
                type="checkbox"
                id="autoLogin"
                checked={autoLogin}
                onChange={handleAutoLoginChange}
              />
              <label htmlFor="autoLogin">자동 로그인</label>
            </div>
          </div>
          {/* ✅ 로그인 버튼 */}
          <button type="submit" className="login-button">
            Sign in
          </button>
        </form>
        {message && <div className="message">{message}</div>}
      </div>
    </div>
  );
};

export default LoginPage;
