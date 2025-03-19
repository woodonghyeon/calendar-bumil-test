import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "./ResetUser.css";
import { useAuth } from "../../utils/useAuth";
import { authFetch } from "../../utils/authFetch";

const ResetUser = () => {
  const [employees, setEmployees] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [searchField, setSearchField] = useState("name");
  const [activeRoleFilter, setActiveRoleFilter] = useState(null); // ✅ 선택된 역할 필터

  const [loading, setLoading] = useState(true); // 데이터 로딩 상태 관리 (true: 로딩 중)
  const [user, setUser] = useState({
    id: "",
    name: "",
    position: "",
    department: "",
    role_id: "",
  }); //로그인한 사용자 정보
  const { getUserInfo, checkAuth, handleLogout } = useAuth();

  const apiUrl = process.env.REACT_APP_API_URL;
  const accessToken = localStorage.getItem("access_token");
  const refreshToken = localStorage.getItem("refresh_token");

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

  // ✅ 사용자 데이터 가져오기
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await authFetch(`${apiUrl}/user/get_users`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Refresh-Token": refreshToken,
        },
      });
      if (!response.ok)
        throw new Error("사용자 데이터를 가져오는 데 실패했습니다.");

      const data = await response.json();
      setEmployees(data.users);
    } catch (err) {
      console.error("데이터 불러오기 오류:", err);
    }
  };

  // ✅ 비밀번호 초기화 API 호출
  const handleResetPassword = async (employeeId, phone) => {
    try {
      // 전화번호의 뒷자리 4자리 추출
      const phoneLast4Digits = phone.slice(-4); // 전화번호에서 뒷자리 4자리

      // 비밀번호 설정: "bumil" + 전화번호 뒷자리 4자리
      const newPassword = `bumil${phoneLast4Digits}!`;

      const response = await authFetch(`${apiUrl}/admin/update_user`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Refresh-Token": refreshToken,
        },
        body: JSON.stringify({
          id: employeeId,
          password: newPassword,
          first_login_yn: "N", // ✅ 첫 로그인 여부 초기화
        }),
      });

      if (!response.ok) throw new Error("비밀번호 초기화 실패");

      alert("✅ 비밀번호가 성공적으로 초기화되었습니다!");
    } catch (error) {
      console.error("비밀번호 초기화 오류:", error);

      alert("❌ 비밀번호 초기화에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // 검색 필드 한글 매핑
  const searchFieldLabelMap = {
    name: "이름",
    position: "직급",
    department: "부서",
  };

  // ✅ 검색 및 필터링
  const filterEmployees = (emp) => {
    if (activeRoleFilter && emp.role_id !== activeRoleFilter) return false;
    if (!searchText) return true;

    const value = emp[searchField]?.toLowerCase() || "";
    return value.includes(searchText.toLowerCase());
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="user-reset-page">
      <Sidebar user={user} />
      <div className="user-reset-box">
        <div className="user-reset-employee-container">
          <h2 className="user-reset-title">사용자 비밀번호 초기화</h2>
          {/* 🔍 검색 필터 */}
          <div className="user-reset-search-container">
            <select
              className="user-reset-search-dropdown"
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
            >
              <option value="name">이름</option>
              <option value="position">직급</option>
            </select>

            <input
              type="text"
              className="user-reset-search-input"
              placeholder={`${searchFieldLabelMap[searchField]}를 입력하세요.`}
              onChange={(e) => setSearchText(e.target.value.trim())}
              value={searchText}
            />
          </div>
          {/* ✅ 인덱스 헤더 바 추가 */}
          <div className="user-reset-employee-index-bar">
            <span className="user-reset-index-item">이름</span>
            <span className="user-reset-index-item">직급</span>
            <span className="user-reset-index-item">초기화</span>
          </div>

          {/* ✅ 사용자 목록 */}
          <ul className="user-reset-employee-list">
            {employees.filter(filterEmployees).map((employee) => (
              <li key={employee.id} className="user-reset-employee-item">
                <span className="user-reset-column">{employee.name}</span>
                <span className="user-reset-column">{employee.position}</span>
                <div className="user-reset-action-buttons">
                  <button
                    className="user-reset-button"
                    onClick={() =>
                      handleResetPassword(employee.id, employee.phone_number)
                    }
                  >
                    초기화
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ResetUser;
