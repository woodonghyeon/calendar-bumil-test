import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import { followCursor } from "tippy.js";
import "./LoginLogPage.css";
import { useAuth } from "../../utils/useAuth";

const LoginLogPage = () => {
  const [logs, setLogs] = useState([]); // 로그인 로그 데이터
  const [searchText, setSearchText] = useState(""); // 검색어
  const [searchField, setSearchField] = useState("user_id"); // 검색 필드
  const [currentPage, setCurrentPage] = useState(1); // 현재 페이지
  const logsPerPage = 10; // 페이지당 표시할 로그 개수

  const apiUrl = process.env.REACT_APP_API_URL;

  const [loading, setLoading] = useState(true); // 데이터 로딩 상태 관리 (true: 로딩 중)
  const [user, setUser] = useState({
    id: "",
    name: "",
    position: "",
    department: "",
    role_id: "",
  }); //로그인한 사용자 정보
  const { getUserInfo, checkAuth, handleLogout } = useAuth();

  // 로그인한 사용자 정보 가져오기 및 권한 확인 후 권한 없으면 로그아웃 시키기
  useEffect(() => {
    const fetchUserInfo = async () => {
      const userInfo = await getUserInfo();
      setUser(userInfo);

      const isAuthorized = checkAuth(userInfo?.role_id, ["AD_ADMIN"]); // 권한 확인하고 맞으면 true, 아니면 false 반환
      if (!isAuthorized) {
        console.error("관리자 권한이 없습니다.");
        handleLogout();
        return;
      }
      setLoading(false); // 로딩 완료
    };
    fetchUserInfo();
  }, []);

  // 로그인 로그 데이터 가져오기
  useEffect(() => {
    fetchLoginLogs();
  }, []);

  const fetchLoginLogs = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${apiUrl}/auth/get_login_logs`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok)
        throw new Error("로그인 기록을 불러오는 데 실패했습니다.");

      const data = await response.json();
      setLogs(data.logs);
    } catch (err) {
      console.error("로그인 기록 불러오기 오류:", err);
    }
  };

  // 한국 시간(KST)으로 변환하는 함수
  const formatKSTDate = (utcDateTime) => {
    const date = new Date(utcDateTime);
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Seoul",
    }).format(date);
  };
  // 검색 및 필터링 로직
  const filterLogs = (log) => {
    if (!searchText) return true;
    const value = log[searchField]?.toLowerCase() || "";
    return value.includes(searchText.toLowerCase());
  };

  // 검색 필드 한글 매핑 (부서 제거)
  const searchFieldLabelMap = {
    user_id: "아이디",
    name: "이름",
    ip_address: "IP 주소",
  };

  // 페이지네이션 계산
  const filteredLogs = logs.filter(filterLogs);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);

  // 페이지 변경 핸들러
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="login-log-page">
      <Sidebar user={user} />

      <div className="login-log-box">
        <h2 className="title">로그인 기록</h2>

        {/* 검색 필터 */}
        <div className="login-log-search-container">
          <select
            className="login-log-search-dropdown"
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
          >
            <option value="user_id">아이디</option>
            <option value="name">이름</option>
            <option value="ip_address">IP 주소</option>
          </select>

          <input
            type="text"
            className="login-log-search-input"
            placeholder={`${searchFieldLabelMap[searchField]}를 입력하세요.`}
            onChange={(e) => setSearchText(e.target.value.trim())}
            value={searchText}
          />
        </div>

        {/* 인덱스 헤더 바 */}
        <div className="login-log-header">
          <span className="login-log-column">로그인 시간</span>
          <span className="login-log-column">아이디</span>
          <span className="login-log-column">이름</span>
          <span className="login-log-column">IP 주소</span>
        </div>

        {/* 로그인 로그 목록 */}
        <ul className="login-log-list">
          {currentLogs.map((log, index) => (
            <li key={index} className="login-log-item">
              <span className="login-log-column login-time">
                {formatKSTDate(log.login_at)}
              </span>
              <Tippy
                content={log.user_id}
                placement="top"
                plugins={[followCursor]}
                followCursor="horizontal"
                arrow={true}
                popperOptions={{
                  modifiers: [
                    {
                      name: "preventOverflow",
                      options: { boundary: "window" },
                    },
                  ],
                }}
              >
                <span className="login-log-column login-truncate">
                  {log.user_id}
                </span>
              </Tippy>
              <Tippy
                content={log.name}
                placement="top"
                plugins={[followCursor]}
                followCursor="horizontal"
                arrow={true}
                popperOptions={{
                  modifiers: [
                    {
                      name: "preventOverflow",
                      options: { boundary: "window" },
                    },
                  ],
                }}
              >
                <span className="login-log-column login-truncate">
                  {log.name}
                </span>
              </Tippy>
              <Tippy
                content={log.ip_address}
                placement="top"
                plugins={[followCursor]}
                followCursor="horizontal"
                arrow={true}
                popperOptions={{
                  modifiers: [
                    {
                      name: "preventOverflow",
                      options: { boundary: "window" },
                    },
                  ],
                }}
              >
                <span className="login-log-column login-truncate">
                  {log.ip_address}
                </span>
              </Tippy>
            </li>
          ))}
        </ul>

        {/* 페이지네이션 버튼 */}
        <div className="pagination">
          <button onClick={goToPreviousPage} disabled={currentPage === 1}>
            이전
          </button>
          <span>
            {currentPage} / {totalPages}
          </span>
          <button onClick={goToNextPage} disabled={currentPage === totalPages}>
            다음
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginLogPage;
