import React, { useState, useEffect } from "react";
import "./Employee.css";
import Sidebar from "../components/Sidebar";
import BackButton from "../components/BackButton";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/useAuth";
/**
 * 📌 EmployeeList - 사원 목록을 조회하고 필터링하는 페이지
 *
 * ✅ 주요 기능:
 *  - 사원 목록 조회 (GET /user/get_users)
 *  - 즐겨찾기 기능 (GET/POST /favorite/get_favorites, /favorite/toggle_favorite)
 *  - 상태 목록 조회 (GET /status/get_status_list)
 *  - 관리자 권한 확인 후 상태 변경 가능 (PUT /admin/update_status_admin)
 *  - 검색 필터 적용 (이름, 직급, 부서, 상태)
 *  - 부서별 정렬 및 펼치기/닫기 기능
 *
 * ✅ UI(또는 Component) 구조:
 *  - EmployeeList (메인 페이지)
 *    ├── Sidebar (사이드바)
 *    ├── BackButton (뒤로가기 버튼)
 *    ├── 검색 및 필터링 UI
 *    ├── 즐겨찾기 토글 버튼
 *    ├── 사원 목록 (부서별 그룹화)
 */

const EmployeeList = () => {
  // ✅ 상태 관리 (State)
  const [employees, setEmployees] = useState([]); // 전체 사원 목록
  const [favoriteEmployees, setFavoriteEmployees] = useState([]); // 즐겨찾기 목록
  const [statusList, setStatusList] = useState([]); // 상태 목록 (근무 중, 휴가 등)
  const [openDepartments, setOpenDepartments] = useState({});
  const [departmentList, setDepartmentList] = useState([]);

  //const [loggedInUserId, setLoggedInUserId] = useState(null); // 로그인된 사용자 ID
  //const [userRole, setUserRole] = useState(null); // 로그인된 사용자 역할 (AD_ADMIN, USR_GENERAL 등)

  const [loading, setLoading] = useState(true); // 데이터 로딩 상태
  const [error, setError] = useState(null); // 에러 메시지

  const [searchText, setSearchText] = useState(""); // 검색 텍스트
  const [searchField, setSearchField] = useState("name"); // 검색 기준 필드 (이름, 직급 등)
  const [showFavorites, setShowFavorites] = useState(false); // 즐겨찾기 보기 여부 (true/false)
  const [sortBy, setSortBy] = useState(null); // 정렬 기준 (이름, 직급 등)
  const [sortOrder, setSortOrder] = useState("asc"); // 정렬 순서 (asc/desc)
  const [allDepartmentsOpen, setAllDepartmentsOpen] = useState(false); // 전체 부서 열림 여부

  const navigate = useNavigate(); // 페이지 이동 훅
  const apiUrl = process.env.REACT_APP_API_URL; // API URL 환경 변수

  const statusMap = statusList.reduce((acc, { comment, id }) => {
    acc[comment] = id; // comment를 키로, id를 값으로 설정
    return acc;
  }, {});

  const [user, setUser] = useState({
    id: "",
    name: "",
    position: "",
    department: "",
    role_id: "",
  }); //로그인한 사용자 정보
  const { getUserInfo, checkAuth, handleLogout } = useAuth();

  // 전체 데이터 가져오기
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // 1. 사용자 정보 가져오기
        const userInfo = await fetchUserInfo();

        // 2. 모든 데이터 병렬로 가져오기
        await Promise.all([
          fetchFavorites(userInfo.id), // 즐겨찾기 목록
          fetchEmployees(), // 사원 목록
          fetchStatusList(), // 상태 목록
        ]);
      } catch (error) {
        //console.error("데이터 로딩 오류:", error);
      }
      setLoading(false); // 로딩 완료
    };

    fetchAllData();
  }, []);

  // 로그인한 사용자 정보 가져오는 함수
  const fetchUserInfo = async () => {
    const userInfo = await getUserInfo();
    setUser(userInfo);
    return userInfo;
  };

  // 🏷️ **상태 목록 가져오기 (근무 중, 휴가 등)**
  const fetchStatusList = async () => {
    try {
      const response = await fetch(`${apiUrl}/status/get_status_list`);
      if (!response.ok) throw new Error("상태 목록을 불러오지 못했습니다.");

      const data = await response.json();
      setStatusList(data.statuses);
    } catch (error) {
      //console.error("상태 목록 로딩 오류:", error);
    }
  };

  // ⭐ **즐겨찾기 목록 가져오기**
  const fetchFavorites = async (userId) => {
    try {
      const response = await fetch(
        `${apiUrl}/favorite/get_favorites?user_id=${userId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok)
        throw new Error("즐겨찾기 목록을 가져오는 데 실패했습니다.");

      const data = await response.json();
      setFavoriteEmployees(data.favorite || []);
      fetchEmployees(); // 사원 목록 새로고침
    } catch (err) {
      setError(err.message);
    }
  };

  // 👥 **사원 및 부서 목록 가져오기**
  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${apiUrl}/user/get_users`);
      if (!response.ok)
        throw new Error("사원 데이터를 가져오는 데 실패했습니다.");

      const data = await response.json();
      setEmployees(data.users);

      const uniqueDepartments = [
        ...new Set(
          data.users.map((user) =>
            user.team_name
              ? `${user.department_name} - ${user.team_name}`
              : user.department_name || "기타"
          )
        ),
      ].filter(Boolean);

      setDepartmentList(uniqueDepartments);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ⭐ **즐겨찾기 추가/삭제 (토글)**
  const toggleFavorite = async (employeeId) => {
    if (!user.id) return;

    try {
      const response = await fetch(`${apiUrl}/favorite/toggle_favorite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          favorite_user_id: employeeId,
        }),
      });

      if (!response.ok) throw new Error("즐겨찾기 상태 업데이트 실패");

      fetchFavorites(user.id); // 즐겨찾기 목록 새로고침
    } catch (error) {
      setError(error.message);
    }
  };

  // 🔄 **사원 상태 변경 (관리자만 가능)**
  const handleStatusChange = async (employeeId, newStatus) => {
    try {
      const response = await fetch(`${apiUrl}/admin/update_status_admin`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          user_id: employeeId,
          status: newStatus,
        }),
      });

      if (!response.ok) throw new Error("상태 변경 실패!");

      alert("상태가 성공적으로 변경되었습니다! ✅");

      // ✅ 전체 사원 목록 새로고침
      fetchEmployees();

      // ✅ 즐겨찾기 목록도 새로고침
      if (showFavorites) {
        fetchFavorites(user.id);
      }
    } catch (error) {
      alert("❌ 상태 변경에 실패했습니다!");
      setError(error.message);
    }
  };

  const totalEmployees = employees.length;
  const departmentCounts = employees.reduce((acc, emp) => {
    const dept = emp.department || "기타";
    acc[dept] = acc[dept] ? acc[dept] + 1 : 1; // 부서별 인원 수 계산
    return acc;
  }, {});

  // 🔍 **검색 필터링 로직**
  const filterEmployees = (emp) => {
    if (!searchText) return true;
    const mappedSearchText = statusMap[searchText] || searchText;
    const value = emp[searchField]?.toLowerCase() || "";
    return value.includes(mappedSearchText.toLowerCase());
  };

  // 📌 **직급 우선순위 매핑**
  const positionOrder = {
    부사장: 1,
    전무: 2,
    상무: 3,
    이사: 4,
    부장: 5,
    차장: 6,
    과장: 7,
    대리: 8,
    주임: 9,
    사원: 10,
  };

  const sortEmployees = (key) => {
    if (key !== "position") return; // 🔽 직급 정렬만 허용

    setSortBy(key);
    setSortOrder((prevSortOrder) => (prevSortOrder === "asc" ? "desc" : "asc"));

    setEmployees((prevEmployees) => {
      const sortedEmployees = [...prevEmployees].sort((a, b) => {
        // ✅ 직급 정렬: 위계 기반
        const rankA = positionOrder[a.position] || 99; // 없는 직급은 가장 낮은 순위로
        const rankB = positionOrder[b.position] || 99;
        return sortOrder === "asc" ? rankA - rankB : rankB - rankA;
      });
      return sortedEmployees;
    });
  };

  // 부서 목록을 클릭했을 때 해당 부서의 상태를 토글하는 함수
  const toggleDepartment = (department) => {
    setOpenDepartments((prev) => ({
      ...prev,
      [department]: !prev[department],
    }));
  };

  const seeAllDepartments = () => {
    const allOpen = departmentList.every(
      (department) => openDepartments[department]
    ); // 모든 부서가 열려 있는지 확인
    setAllDepartmentsOpen(!allOpen); // 전체 열림 상태 반전

    setOpenDepartments((prev) => {
      const updatedDepartments = {};
      departmentList.forEach((department) => {
        updatedDepartments[department] = !allOpen; // 모든 부서를 열거나 닫음
      });
      return updatedDepartments;
    });
  };

  // 직원들을 부서별로 그룹화하는 함수
  const groupByDepartment = (employees) => {
    return employees.reduce((acc, employee) => {
      const department = employee.team_name
        ? `${employee.department_name} - ${employee.team_name}`
        : employee.department_name || "기타";

      if (!acc[department]) {
        acc[department] = [];
      }
      acc[department].push(employee);
      return acc;
    }, {});
  };

  // ⏳ **로딩 및 에러 처리**
  if (loading) return <p>데이터를 불러오는 중...</p>;
  if (error) return <p>오류 발생: {error}</p>;

  // 📋 **UI 구성 (사원 목록 렌더링)**
  return (
    <div className="app">
      <Sidebar user={user} />
      <BackButton />

      <div className="box">
        <h2 className="title">사원 목록</h2>

        {/* 🔄 즐겨찾기 토글 */}
        <div className="toggle-container">
          <button
            className="toggle-button"
            onClick={() => setShowFavorites(!showFavorites)}
          >
            {showFavorites ? "전체 사원 보기" : "즐겨찾기 보기"}
          </button>
        </div>

        {/* 🔍 검색 UI */}
        <div className="employee-search-container">
          <select
            className="search-dropdown"
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
          >
            <option value="name">이름</option>
            <option value="position">직급</option>
            <option value="department">부서</option>
            <option value="status">상태</option>
          </select>

          <input
            type="text"
            className="search-input"
            placeholder="검색어를 입력해주세요..."
            onChange={(e) => {
              setSearchText(e.target.value.trim());
            }}
            value={searchText}
          />
        </div>

        {/* 스크롤 가능한 컨테이너 추가 */}
        <div className="employee-list-container">
          {/* 🏷️ 인덱스 바 */}
          <div className="employee-index-bar sticky-header">
            <span className="index-item-1">즐겨찾기</span>

            {/* 부서 */}
            <span className="index-item">부서</span>

            {/* 🔽 직급 정렬 버튼 */}
            <span className="index-item">
              직급
              <button
                className="sort-button"
                onClick={() => sortEmployees("position")}
              >
                {sortBy === "position"
                  ? sortOrder === "asc"
                    ? "▲"
                    : "▼"
                  : "▲"}
              </button>
            </span>
            <span className="index-item">상태</span>
          </div>

          {/* 부서 모두 열기/닫기 */}
          <div className="department-header" onClick={seeAllDepartments}>
            <span>
              <span className="arrow">
                {departmentList.every(
                  (department) => openDepartments[department]
                )
                  ? "▼"
                  : "▶"}
              </span>
              범일정보
              <div className="department-count">({totalEmployees}명)</div>
            </span>
          </div>

          {/* 👥 사원 목록 렌더링 */}
          <ul className="employee-list">
            {Object.keys(
              groupByDepartment(showFavorites ? favoriteEmployees : employees)
            )
              .sort((a, b) => a.localeCompare(b, "ko-KR"))
              .map((department) => {
                const departmentEmployees = groupByDepartment(
                  showFavorites ? favoriteEmployees : employees
                )[department];

                return (
                  <div key={department}>
                    {/* 부서명 클릭 시 열고 닫을 수 있도록 토글 */}
                    <div
                      className={`department-header ${
                        allDepartmentsOpen ? "open" : ""
                      }`}
                      onClick={seeAllDepartments}
                      style={{
                        backgroundColor: allDepartmentsOpen
                          ? "#f5f5f5"
                          : "white",
                        transition: "background-color 0.3s",
                      }}
                    >
                      <span className="sub-department">
                        {/* 화살표 표시 */}
                        <span className="arrow">
                          {openDepartments[department] ? "▼" : "▶"}
                        </span>
                        {department}
                        <div className="department-count">
                          ({departmentEmployees.length}명)
                        </div>
                      </span>
                    </div>

                    {/* 부서별 직원 목록 렌더링 */}
                    {openDepartments[department] && (
                      <div className="department-employee-list">
                        {departmentEmployees.map((employee) => (
                          <li
                            key={employee.id}
                            className="employee-item2"
                            onClick={() =>
                              navigate(`/user-details?user_id=${employee.id}`)
                            }
                          >
                            {/* ⭐ 즐겨찾기 토글 */}
                            <span
                              className={`favorite-icon ${
                                favoriteEmployees.some(
                                  (fav) => fav.id === employee.id
                                )
                                  ? ""
                                  : "not-favorite"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(employee.id);
                              }}
                            >
                              ★
                            </span>

                            {/* 🔠 사원 정보 */}
                            <span className="employee-name">
                              {employee.name}
                            </span>
                            <span className="employee-position">
                              {employee.position}
                            </span>

                            {/* 🔄 관리자 전용 상태 변경 드롭다운 */}
                            {user.role_id === "AD_ADMIN" ? (
                              <select
                                className="status-dropdown"
                                value={employee.status || ""}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) =>
                                  handleStatusChange(
                                    employee.id,
                                    e.target.value
                                  )
                                }
                              >
                                {statusList.map((status, index) => (
                                  <option
                                    key={`${status.comment}-${index}`}
                                    value={status.id}
                                  >
                                    {status.comment}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="status-dropdown2">
                                {statusList.find(
                                  (s) => s.id === employee.status
                                )?.comment || "알 수 없음"}
                              </span>
                            )}
                          </li>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EmployeeList;
