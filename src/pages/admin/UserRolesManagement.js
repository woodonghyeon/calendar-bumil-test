import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "./UserRolesManagement.css";
import { useAuth } from "../../utils/useAuth";
import { authFetch } from "../../utils/authFetch";

const UserRolesManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [searchField, setSearchField] = useState("name");
  const [activeRoleFilter, setActiveRoleFilter] = useState(null); // ✅ 선택된 역할 필터

  const apiUrl = process.env.REACT_APP_API_URL;
  const accessToken = localStorage.getItem("access_token");
  const refreshToken = localStorage.getItem("refresh_token");

  const navigate = useNavigate();

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

  // ✅ 역할 변경 API 호출
  const handleRoleChange = async (employeeId, newRoleId) => {
    try {
      const response = await authFetch(`${apiUrl}/admin/update_user`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Refresh-Token": refreshToken,
        },
        body: JSON.stringify({
          id: employeeId,
          role_id: newRoleId,
        }),
      });

      if (!response.ok) throw new Error("역할 변경 실패");

      //console.log("역할 변경 성공:", employeeId, newRoleId);
      alert("✅ 역할이 성공적으로 변경되었습니다!");

      // 🔥 즉시 상태 반영
      setEmployees((prevEmployees) =>
        prevEmployees.map((emp) =>
          emp.id === employeeId ? { ...emp, role_id: newRoleId } : emp
        )
      );
    } catch (error) {
      console.error("역할 변경 오류:", error);
      alert("❌ 역할 변경에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // ✅ 역할 필터링 로직
  const handleRoleFilter = (roleId) => {
    setActiveRoleFilter((prev) => (prev === roleId ? null : roleId)); // ✅ 동일 역할 클릭 시 전체 보기
  };

  // ✅ 검색 및 필터링
  const filterEmployees = (emp) => {
    if (activeRoleFilter && emp.role_id !== activeRoleFilter) return false;
    if (!searchText) return true;

    const value = emp[searchField]?.toLowerCase() || "";
    return value.includes(searchText.toLowerCase());
  };

  // 검색 필드 한글 매핑
  const searchFieldLabelMap = {
    name: "이름",
    position: "직급",
    department: "부서",
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="user-roles-page">
      <Sidebar user={user} />

      <div className="user-roles-box">
        <h2 className="title">사용자 역할 관리</h2>

        {/* 🔍 검색 필터 */}
        <div className="user-roles-search-container">
          <select
            className="user-roles-search-dropdown"
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
          >
            <option value="name">이름</option>
            <option value="position">직급</option>
          </select>

          <input
            type="text"
            className="user-roles-search-input"
            placeholder={`${searchFieldLabelMap[searchField]}를 입력하세요.`}
            onChange={(e) => setSearchText(e.target.value.trim())}
            value={searchText}
          />
        </div>

        {/* ✅ 권한별 필터 토글 버튼 */}
        <div className="role-toggle-container">
          {[
            { id: "AD_ADMIN", label: "어드민" },
            { id: "PR_ADMIN", label: "프로젝트 관리자" },
            { id: "PR_MANAGER", label: "프로젝트 매니저" },
            { id: "USR_GENERAL", label: "유저" },
          ].map((role) => (
            <button
              key={role.id}
              className={`role-toggle-button ${
                activeRoleFilter === role.id ? "active" : ""
              }`}
              onClick={() => handleRoleFilter(role.id)}
            >
              {role.label}
            </button>
          ))}
        </div>

        {/* ✅ 인덱스 헤더 바 추가 */}
        <div className="user-roles-employee-index-bar">
          <span className="user-roles-index-item">이름</span>
          <span className="user-roles-index-item">직급</span>
          <span className="user-roles-index-item">권한</span>
        </div>

        {/* ✅ 사용자 목록 */}
        <ul className="user-roles-employee-list">
          {employees.filter(filterEmployees).map((employee) => (
            <li key={employee.id} className="user-roles-employee-item">
              <span className="user-roles-column">{employee.name}</span>
              <span className="user-roles-column">{employee.position}</span>

              {/* ✅ 역할 변경 드롭다운 */}
              <select
                className="user-roles-role-dropdown"
                value={employee.role_id}
                onChange={(e) => handleRoleChange(employee.id, e.target.value)}
              >
                <option value="AD_ADMIN">어드민</option>
                <option value="PR_ADMIN">프로젝트 관리자</option>
                <option value="PR_MANAGER">프로젝트 매니저</option>
                <option value="USR_GENERAL">유저</option>
              </select>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default UserRolesManagement;
