import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import BackButton from "../components/BackButton";
import { FaSearch } from "react-icons/fa";
import { useAuth } from "../../utils/useAuth";
import { authFetch } from "../../utils/authFetch";

import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import { followCursor } from "tippy.js";
import "./SituationControl.css";

/**
 * 📌 SituationControlPage
 * - 프로젝트와 사용자 목록을 불러오고,
 * 어떤 사용자가 어떤 프로젝트에 참여중인지 연도별로 보여주는 페이지
 *
 * ✅ 주요 기능:
 *  - 프로젝트 목록 조회 (GET /project/get_all_project)
 *  - 사용자 목록 조회 (GET /user/get_users)
 *  - 프로젝트별 참여자 목록 조회 (POST /project/get_users_and_projects)
 *  - 프로젝트로 검색하면 해당 프로젝트에 참여중인 사용자 목록 표시
 *  - 사용자로 검색하면 해당 사용자가 참여중인 프로젝트 목록 표시
 *  - 이때, 연도별로 참여 월을 색칠해서 표시함
 *  - 표 형태로 전환 가능 (프로젝트별 참여자, 사용자별 프로젝트)
 *    - 전환하면 날짜 데이터를 YYYY-MM-DD 형식의 표로 표시해줌
 *
 * ✅ 컴포넌트 목록:
 *  - ChartView: 차트 형태로 데이터 표시
 *  - TableView: 표 형태로 데이터 표시
 *
 * ✅ UI 구조:
 *  - SituationControlPage (메인 페이지)
 *    ├── Sidebar (사이드바)
 *    ├── BackButton (뒤로 가기 버튼)
 *    ├── SituationControl-search-container (현황관리 검색 칸)
 *    │      ├── search-project-container(div : 프로젝트 검색 칸)
 *    │      ├── selected-projects(div : 선택된 프로젝트 목록 칸)
 *    │      ├── search-user-container(div : 사용자 검색 칸)
 *    │      ├── selected-users(div : 선택된 사용자 목록 칸)
 *    ├── SituationControl-projects (현황관리 차트/표 표시 칸)
 *    │      ├── project-checkbox (표시 방식 전환 체크박스(차트/표))
 *    │      ├── year-selector (연도 선택기)
 *    │      ├── TableView or ChartView (표 또는 차트 표시)
 *
 */

const SituationControls = () => {
  // ===== 상태 관리 변수들 =====
  const [projects, setProjects] = useState([]); // 모든 프로젝트 데이터 저장
  const [users, setUsers] = useState([]); // 모든 사용자 목록 데이터 저장
  const [userprojects, setUserProjects] = useState([]); // 사용자-프로젝트 관계 데이터 저장
  const [loading, setLoading] = useState(true); // 데이터 로딩 상태 관리 (true: 로딩 중)
  const [error, setError] = useState(null); // 에러 상태 관리
  const [year, setYear] = useState(new Date().getFullYear()); // 현재 선택된 연도 (기본값: 현재 연도)
  const [isTableView, setIsTableView] = useState(false); // 뷰 타입 관리 (false: 차트 뷰, true: 테이블 뷰)

  // 프로젝트 검색 관련 상태
  const [searchQueryProject, setSearchQueryProject] = useState(""); // 프로젝트 검색어
  const [selectedProjects, setSelectedProjects] = useState([]); // 선택된 프로젝트 목록
  const [filteredProjects, setFilteredProjects] = useState([]); // 검색 결과 필터링된 프로젝트 목록

  // 사용자 검색 관련 상태
  const [searchQueryUser, setSearchQueryUser] = useState(""); // 사용자 검색어
  const [selectedUsers, setSelectedUsers] = useState([]); // 선택된 사용자 목록
  const [filteredUsers, setFilteredUsers] = useState([]); // 검색 결과 필터링된 사용자 목록

  //const [searchCategory, setSearchCategory] = useState("projectName"); // 현재 사용되지 않는 검색 카테고리 (주석 처리됨)
  const [effectiveUsers, setEffectiveUsers] = useState([]); // 실제로 데이터를 보여줄 사용자 목록 (선택된 프로젝트의 사용자들 또는 선택된 사용자들)

  // 날짜 필터링 관련 상태 - 현재는 UI에 직접 연결되어 사용되지 않음
  const [startFilter, setStartFilter] = useState("");
  const [endFilter, setEndFilter] = useState("");
  const [appliedStart, setAppliedStart] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");

  // 환경변수에서 API URL 가져오기
  const apiUrl = process.env.REACT_APP_API_URL;
  const accessToken = localStorage.getItem("access_token");
  const refreshToken = localStorage.getItem("refresh_token");

  const navigate = useNavigate(); // 페이지 이동을 위한 react-router-dom 훅

  const location = useLocation(); // 현재 위치 정보를 위한 react-router-dom 훅

  const [user, setUser] = useState({
    id: "",
    name: "",
    position: "",
    department: "",
    role_id: "",
  }); //로그인한 사용자 정보
  const { getUserInfo } = useAuth();

  // 전체 데이터 가져오기
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // 1. 사용자 정보 가져오기
        const userInfo = await fetchUserInfo();
      } catch (error) {
        console.error("데이터 로딩 오류:", error);
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

  // ===== API 호출: 사용자 목록과 프로젝트 목록 가져오기 =====
  useEffect(() => {
    const fetchUsersAndProjects = async () => {
      try {
        const response = await authFetch(`${apiUrl}/user/get_users`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "X-refresh-token": refreshToken,
          },
        });
        if (!response.ok)
          throw new Error("사용자 데이터를 불러오지 못했습니다.");
        const data = await response.json();
        setUsers(data.users); // 사용자 목록 상태 업데이트
      } catch (err) {
        console.error("🚨 사용자 목록 불러오기 오류:", err);
      }
    };

    const fetchProjects = async () => {
      try {
        const response = await authFetch(`${apiUrl}/project/get_all_project`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "X-refresh-token": refreshToken,
          },
        });
        if (!response.ok)
          throw new Error("프로젝트 데이터를 불러오지 못했습니다.");
        const data = await response.json();
        setProjects(data.projects); // 프로젝트 목록 상태 업데이트
      } catch (error) {
        console.error("🚨 프로젝트 목록 불러오기 오류:", error);
      }
    };

    fetchProjects(); // 프로젝트 목록 가져오기
    fetchUsersAndProjects(); // 사용자 목록 가져오기
  }, [location.pathname]); // 페이지 이동 시마다 데이터 새로 불러오기

  // ===== API 호출: 선택된 사용자들(effectiveUsers)의 프로젝트 데이터 가져오기 =====
  useEffect(() => {
    const fetchUserProjectData = async () => {
      if (!accessToken) {
        setError("로그인이 필요합니다.");
        setLoading(false);
        return;
      }

      if (effectiveUsers.length === 0) {
        //console.log("❌ effectiveUsers가 비어 있어서 요청을 보내지 않음.");
        setUserProjects([]);
        setLoading(false);
        return;
      }
      // 아무것도 선택되지 않았을 때는 모든 유저 정보를 effectiveUsers에 설정했으므로
      // 그대로 진행하면 모든 프로젝트가 로드됨
      //console.log("🔄 effectiveUsers 요청:",effectiveUsers.map((u) => u.id));

      try {
        const response = await authFetch(
          `${apiUrl}/project/get_users_and_projects`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
              "X-refresh-token": refreshToken,
            },
            body: JSON.stringify({
              user_ids: effectiveUsers.map((user) => user.id), // ✅ 한 번에 여러 사용자 조회 요청
            }),
          }
        );

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(
            errData.message || "사용자 정보를 가져오는 데 실패했습니다."
          );
        }

        const data = await response.json();
        setUserProjects(data.participants || []);
        //console.log("✅ allProjects : ", data.participants);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProjectData();
  }, [effectiveUsers, apiUrl]); // effectiveUsers가 변경될 때마다 실행

  // ===== 프로젝트 검색 관련 함수들 =====

  // 검색어에 따라 프로젝트 필터링
  useEffect(() => {
    if (searchQueryProject.trim() === "") {
      setFilteredProjects([]); // 검색어가 없을 경우 필터링된 프로젝트 목록 비우기
    } else {
      // 검색어와 일치하는 프로젝트 필터링 (이미 선택된 프로젝트는 제외)
      setFilteredProjects(
        projects.filter(
          (proj) =>
            (proj.project_name || "")
              .toLowerCase()
              .includes(searchQueryProject.toLowerCase()) &&
            !selectedProjects.some(
              (selectedProj) => selectedProj.project_code === proj.project_code
            ) // 선택된 프로젝트는 제외
        )
      );
    }
  }, [searchQueryProject, projects, selectedProjects]);

  // 검색 결과에서 프로젝트 선택 처리
  const selectProject = (project) => {
    // 이미 선택되지 않은 프로젝트만 추가
    if (
      !selectedProjects.some((p) => p.project_code === project.project_code)
    ) {
      setSelectedProjects([...selectedProjects, project]);
    }
    setSearchQueryProject(""); // 검색어 초기화
    setFilteredProjects([]); // 필터링된 목록 초기화
  };

  // 선택된 프로젝트 제거
  const handleRemoveProject = (projectCode) => {
    setSelectedProjects(
      selectedProjects.filter((proj) => proj.project_code !== projectCode)
    );
  };

  // ===== 사용자 검색 관련 함수들 =====

  // 검색어에 따라 사용자 필터링
  useEffect(() => {
    if (searchQueryUser.trim() === "") {
      setFilteredUsers([]); // 검색어가 없을 경우 필터링된 사용자 목록 비우기
    } else {
      // 검색어와 일치하는 사용자 필터링 (이미 선택된 사용자는 제외)
      setFilteredUsers(
        users.filter(
          (userdata) =>
            (userdata.name || "")
              .toLowerCase()
              .includes(searchQueryUser.toLowerCase()) &&
            !selectedUsers.some(
              (selectedProj) => selectedProj.name === userdata.name
            ) // 선택된 사용자는 제외
        )
      );
    }
  }, [searchQueryUser, users, selectedUsers]);

  // ===== effectiveUsers 계산 (실제로 데이터를 보여줄 사용자 목록) =====
  useEffect(() => {
    if (selectedUsers.length > 0) {
      // 1. 사용자가 직접 선택한 경우: 선택된 사용자를 그대로 사용
      setEffectiveUsers(selectedUsers);
    } else if (selectedProjects.length > 0) {
      // 2. 프로젝트만 선택한 경우: 해당 프로젝트에 할당된 모든 사용자 찾기
      const assignedUserIds = selectedProjects.flatMap(
        (project) => project.assigned_user_ids || []
      );

      // 중복 제거
      const uniqueUserIds = [...new Set(assignedUserIds)];

      // ID에 해당하는 사용자 정보 찾기
      const projectUsers = uniqueUserIds
        .map((id) => users.find((user) => user.id === id))
        .filter((user) => user !== undefined); // undefined 필터링

      setEffectiveUsers(projectUsers);
    } else {
      // 3. 아무것도 선택되지 않은 경우: 모든 사용자 정보 사용
      setEffectiveUsers(users);
    }
  }, [selectedProjects, selectedUsers, users]);

  // 검색 결과에서 사용자 선택 처리
  const selectUser = (user) => {
    // 이미 선택되지 않은 사용자만 추가
    if (!selectedUsers.some((u) => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchQueryUser(""); // 검색어 초기화
    setFilteredUsers([]); // 필터링된 목록 초기화
  };

  // 선택된 사용자 제거
  const handleRemoveUser = (id) => {
    setSelectedUsers(selectedUsers.filter((userdata) => userdata.id !== id));
  };

  // 필터 적용 함수 - 현재는 날짜 필터만 설정됨
  const applyFilters = () => {
    setAppliedStart(startFilter);
    setAppliedEnd(endFilter);
  };

  // ===== 선택된 연도에 해당하는 프로젝트 필터링 =====
  // 선택된 연도와 프로젝트에 맞는 데이터만 필터링
  const dateFilteredProjects = userprojects.filter((project) => {
    const projectStartYear = new Date(project.start_date).getFullYear();
    const projectEndYear = new Date(project.end_date).getFullYear();

    // 프로젝트가 선택한 연도에 걸쳐 있고, 삭제되지 않은 프로젝트인지 확인
    const isWithinYear =
      projectStartYear <= year &&
      projectEndYear >= year &&
      project.is_delete_yn !== "Y";

    // selectedProjects가 비어 있으면 모든 프로젝트 포함, 아니라면 선택한 프로젝트만 포함
    const isSelected =
      selectedProjects.length === 0 ||
      selectedProjects.some(
        (selected) => selected.project_code === project.project_code
      );

    return isWithinYear && isSelected;
  });

  // 로딩 및 에러 처리
  if (loading) return <div className="userdetail-container">로딩 중...</div>;
  if (error) return <div className="userdetail-container">{error}</div>;

  const ChartView = ({ dateFilteredProjects }) => {
    // 프로젝트별로 참가자들을 그룹화 (project_code를 기준으로 데이터 그룹화)
    // 같은 프로젝트 코드를 가진 모든 항목들을 하나의 배열로 모음
    const groupedProjects = dateFilteredProjects.reduce((acc, project) => {
      if (!acc[project.project_code]) {
        acc[project.project_code] = [];
      }
      acc[project.project_code].push(project);
      return acc;
    }, {});

    // 사용자 ID를 기반으로 사용자 이름을 찾는 헬퍼 함수
    // users 배열에서 해당 ID를 가진 사용자 정보를 조회하여 이름 반환
    const getUserName = (userId) => {
      const user = users.find((user) => user.id === userId);
      return user ? user.name : "Unknown";
    };

    // 사람만 검색했는지 확인 (프로젝트는 선택하지 않고 사람만 선택한 경우)
    // 프로젝트 필터가 없고 사용자 필터만 있는 경우를 확인
    const isOnlyUserSelected =
      selectedProjects.length === 0 && selectedUsers.length > 0;

    // 사람 기준으로 그룹화하는 함수 (사람만 검색했을 때 사용)
    // 사용자 ID를 키로 하여 해당 사용자가 참여한 모든 프로젝트를 그룹화
    const groupedByUsers = () => {
      const result = {};

      // 사용자 ID별로 프로젝트 데이터 그룹화
      dateFilteredProjects.forEach((project) => {
        if (!result[project.user_id]) {
          result[project.user_id] = [];
        }
        result[project.user_id].push(project);
      });

      return result;
    };

    // 사람만 검색한 경우를 구분하여 다른 렌더링 로직 사용
    // 사람을 위에 표시하고, 프로젝트를 아래에 표시
    if (isOnlyUserSelected) {
      // 사용자 ID를 기준으로 프로젝트 데이터 그룹화
      const userGroups = groupedByUsers();

      return (
        <div className="project-chart">
          {/* 각 사용자 그룹별로 순회하며 차트 생성 */}
          {Object.keys(userGroups).map((userId) => {
            const userProjects = userGroups[userId]; // 해당 사용자의 모든 프로젝트
            const userName = getUserName(userId); // 사용자 이름 조회

            return (
              <div key={userId} className="project-chart-row">
                {/* 사용자 이름 표시 - 클릭 시 해당 사용자 상세 페이지로 이동 */}
                <div
                  className="project-chart-title"
                  onClick={() => navigate(`/user-details?user_id=${userId}`)}
                >
                  {userName}
                </div>

                {/* 해당 사용자의 프로젝트별 차트 표시 */}
                {userProjects.map((project) => {
                  // 프로젝트 시작일과 종료일 파싱
                  const startDate = new Date(project.start_date);
                  const endDate = new Date(project.end_date);

                  // 유효하지 않은 날짜인 경우 렌더링하지 않음
                  if (isNaN(startDate) || isNaN(endDate)) {
                    return null;
                  }

                  // 각 프로젝트의 참여 월 계산 (연도*100 + 월 형식으로 저장)
                  // 예: 2023년 5월 = 202305
                  const months = [];
                  for (
                    let projectYear = startDate.getFullYear();
                    projectYear <= endDate.getFullYear();
                    projectYear++
                  ) {
                    // 시작 연도인 경우 실제 시작 월부터, 아니면 1월(0)부터 시작
                    let start =
                      projectYear === startDate.getFullYear()
                        ? startDate.getMonth()
                        : 0;
                    // 종료 연도인 경우 실제 종료 월까지, 아니면 12월(11)까지 포함
                    let end =
                      projectYear === endDate.getFullYear()
                        ? endDate.getMonth()
                        : 11;

                    // 해당 연도의 모든 참여 월을 배열에 추가
                    for (let month = start; month <= end; month++) {
                      months.push(projectYear * 100 + month);
                    }
                  }

                  return (
                    <div
                      key={project.project_code}
                      className="project-chart-user"
                    >
                      <div className="project-chart-months">
                        {/* 프로젝트 이름을 표시 - 클릭 시 해당 프로젝트 상세 페이지로 이동 */}
                        <span
                          className="project-chart-user-name"
                          onClick={(event) => {
                            event.stopPropagation(); // 이벤트 버블링 방지
                            navigate(
                              `/project-details?project_code=${project.project_code}`
                            );
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          {project.project_name}
                        </span>
                        {/* 1월부터 12월까지 각 월별 참여 여부를 시각화 */}
                        {Array.from({ length: 12 }, (_, idx) => {
                          // 해당 월이 프로젝트 참여 기간에 포함되는지 확인
                          // year 변수는 외부에서 선언된 것 (현재 선택된 연도)
                          const isHighlighted = months.includes(
                            year * 100 + idx
                          );
                          return (
                            <span
                              key={idx}
                              className={`project-month ${
                                isHighlighted ? "highlighted" : ""
                              }`}
                            >
                              {idx + 1} {/* 월 표시 (1~12) */}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      );
    }

    // 기존의 프로젝트 중심 뷰 (프로젝트 선택 시 또는 아무것도 선택하지 않은 경우)
    return (
      <div className="project-chart">
        {/* 각 프로젝트 그룹별로 순회하며 차트 생성 */}
        {Object.keys(groupedProjects).map((projectCode) => {
          const projects = groupedProjects[projectCode]; // 해당 프로젝트 코드의 모든 데이터
          const project = projects[0]; // 첫 번째 프로젝트 데이터 사용 (대표값)
          // 프로젝트 시작일과 종료일 파싱
          const startDate = new Date(project.start_date);
          const endDate = new Date(project.end_date);

          // 유효하지 않은 날짜인 경우 렌더링하지 않음
          if (isNaN(startDate) || isNaN(endDate)) {
            return null;
          }

          // 프로젝트 시작 및 종료 연도 추출
          const startYear = startDate.getFullYear();
          const endYear = endDate.getFullYear();
          // 프로젝트 전체 기간의 월 목록 계산 (연도*100 + 월 형식)
          const months = [];

          // 시작 연도부터 종료 연도까지 모든 해당 월을 계산
          for (let year = startYear; year <= endYear; year++) {
            // 시작 연도인 경우 실제 시작 월부터, 아니면 1월(0)부터 시작
            let start = year === startYear ? startDate.getMonth() : 0;
            // 종료 연도인 경우 실제 종료 월까지, 아니면 12월(11)까지 포함
            let end = year === endYear ? endDate.getMonth() : 11;

            // 해당 연도의 모든 참여 월을 배열에 추가
            for (let month = start; month <= end; month++) {
              months.push(year * 100 + month);
            }
          }

          // 프로젝트에 참여한 각 사용자별 참여 월 정보 계산
          const usersParticipation = projects.reduce((acc, project) => {
            const user = project.user_id; // 사용자 ID
            // 해당 프로젝트-사용자 조합의 시작일과 종료일
            const startDate = new Date(project.start_date);
            const endDate = new Date(project.end_date);

            // 해당 사용자의 프로젝트 참여 월 계산
            const userMonths = [];
            for (
              let year = startDate.getFullYear();
              year <= endDate.getFullYear();
              year++
            ) {
              let start =
                year === startDate.getFullYear() ? startDate.getMonth() : 0;
              let end =
                year === endDate.getFullYear() ? endDate.getMonth() : 11;

              for (let month = start; month <= end; month++) {
                userMonths.push(year * 100 + month);
              }
            }

            // 사용자별 참여 월 정보를 누적
            if (!acc[user]) {
              acc[user] = [];
            }
            acc[user] = [...acc[user], ...userMonths];
            return acc;
          }, {});

          return (
            <div key={projectCode} className="project-chart-row">
              {/* 프로젝트 이름 표시 - 클릭 시 해당 프로젝트 상세 페이지로 이동 */}
              <div
                className="project-chart-title"
                onClick={() =>
                  navigate(`/project-details?project_code=${projectCode}`)
                }
              >
                {project.project_name}
              </div>

              {/* 해당 프로젝트에 참여한 각 사용자별 차트 표시 */}
              {Object.keys(usersParticipation).map((userId) => {
                const userMonths = usersParticipation[userId]; // 해당 사용자의 참여 월 목록
                return (
                  <div key={userId} className="project-chart-user">
                    <div className="project-chart-months">
                      {/* 사용자 이름 표시 - 클릭 시 해당 사용자 상세 페이지로 이동 */}
                      <span
                        className="project-chart-user-name"
                        onClick={(event) => {
                          event.stopPropagation(); // 이벤트 버블링 방지
                          navigate(`/user-details?user_id=${userId}`);
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        {getUserName(userId)}
                      </span>
                      {/* 1월부터 12월까지 각 월별 참여 여부를 시각화 */}
                      {Array.from({ length: 12 }, (_, idx) => {
                        // 해당 월이 사용자의 프로젝트 참여 기간에 포함되는지 확인
                        // year 변수는 외부에서 선언된 것으로 보임 (현재 선택된 연도)
                        const isHighlighted = userMonths.includes(
                          year * 100 + idx
                        );
                        return (
                          <span
                            key={idx}
                            className={`project-month ${
                              isHighlighted ? "highlighted" : ""
                            }`}
                          >
                            {idx + 1} {/* 월 표시 (1~12) */}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  // ✅ 표 형태로 보여주는 컴포넌트
  const TableView = ({ dateFilteredProjects }) => {
    const navigate = useNavigate(); // ✅ 네비게이션 훅 사용

    // ✅ user_id에 해당하는 user_name 찾기
    const getUserName = (userId) => {
      const user = users.find((u) => u.id === userId);
      return user ? user.name : "알 수 없음"; // 만약 user_id가 users에 없으면 "알 수 없음" 표시
    };

    return (
      <table className="project-user-table">
        <thead>
          <tr>
            <th>참여자</th>
            <th>프로젝트명</th>
            <th>시작일</th>
            <th>종료일</th>
          </tr>
        </thead>
        <tbody>
          {dateFilteredProjects.map((project) => (
            <tr key={project.id}>
              <td
                onClick={(event) => {
                  event.stopPropagation(); // 부모 요소의 클릭 이벤트 방지
                  navigate(`/user-details?user_id=${project.user_id}`);
                }}
                style={{ cursor: "pointer" }} // 마우스 커서 변경 (클릭 가능한 요소임을 강조) // ✅ 클릭 가능한 스타일 적용
              >
                {getUserName(project.user_id)}
              </td>
              <td
                onClick={(event) => {
                  event.stopPropagation(); // 부모 요소의 클릭 이벤트 방지
                  navigate(
                    `/project-details?project_code=${project.project_code}`
                  );
                }}
                style={{ cursor: "pointer" }} // 마우스 커서 변경 (클릭 가능한 요소임을 강조) // ✅ 클릭 가능한 스타일 적용
              >
                {project.project_name}
              </td>
              <td>{new Date(project.start_date).toLocaleDateString()}</td>
              <td>{new Date(project.end_date).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="SituationControl-page">
      <h1 className="title">프로젝트 현황관리</h1>
      <header className="SituationControl-header">
        <Sidebar user={user} />
        <BackButton />
      </header>
      <div className="SituationControl-search-container">
        <div className="search-project-container">
          {/*<select
            className="search-category"
            value={searchCategory}
            onChange={(e) => setSearchCategory(e.target.value)}
          >
            <option value="code">프로젝트 코드</option>
            <option value="projectName">프로젝트 명</option>
          </select>*/}
          <h3 className="search-project-category">프로젝트 명</h3>
          <input
            type="text"
            className="SituationControl-search-input"
            placeholder="검색어 입력"
            value={searchQueryProject}
            onChange={(e) => setSearchQueryProject(e.target.value)}
          />
          <button className="filter-button" onClick={applyFilters}>
            <FaSearch />
          </button>
          {filteredProjects.length > 0 && (
            <ul className="autocomplete-project-list">
              {filteredProjects.map((proj) => (
                <li key={proj.project_code} onClick={() => selectProject(proj)}>
                  {proj.project_name}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="selected-projects">
          {selectedProjects.map((proj) => (
            <div key={proj.project_code} className="selected-project-box">
              <Tippy
                content={proj.project_name}
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
                <span className="project-name">
                  {proj.project_name.length > 20
                    ? proj.project_name.slice(0, 20) + "..."
                    : proj.project_name}
                </span>
              </Tippy>
              <button
                className="remove-project"
                onClick={() => handleRemoveProject(proj.project_code)}
              >
                X
              </button>
            </div>
          ))}
        </div>

        <div className="search-user-container">
          <h3 className="search-user-category">참가자 이름</h3>
          <input
            type="text"
            className="SituationControl-search-input"
            placeholder="검색어 입력"
            value={searchQueryUser}
            onChange={(e) => setSearchQueryUser(e.target.value)}
          />
          <button className="filter-button" onClick={applyFilters}>
            <FaSearch />
          </button>
          {filteredUsers.length > 0 && (
            <ul className="autocomplete-user-list">
              {filteredUsers.map((userdata) => (
                <li key={userdata.id} onClick={() => selectUser(userdata)}>
                  {userdata.name}-{userdata.position}-{userdata.id}-
                  {userdata.department}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="selected-users">
          {selectedUsers.map((userdata) => (
            <div key={userdata.id} className="selected-user-box">
              <span className="user-name">
                {userdata.name}-{userdata.position}-{userdata.id}-
                {userdata.department}
              </span>
              <button
                className="remove-user"
                onClick={() => handleRemoveUser(userdata.id)}
              >
                X
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="SituationControl-projects">
        <div className="project-header">
          <h3>현황 목록</h3>
          <div className="project-checkbox">
            <input
              type="checkbox"
              id="project-checkbox"
              checked={isTableView}
              onChange={() => setIsTableView(!isTableView)}
            />
            <label htmlFor="project-checkbox">표로 보기</label>
          </div>
        </div>
        <div className="year-selector">
          <button className="year-button" onClick={() => setYear(year - 1)}>
            ◀
          </button>
          <span className="year-text">{year}년</span>
          <button className="year-button" onClick={() => setYear(year + 1)}>
            ▶
          </button>
        </div>
        {/* ✅ 차트 방식 or 표 방식 선택 */}
        {/* 차트와 표를 조건에 따라 표시 */}
        {isTableView ? (
          <TableView dateFilteredProjects={dateFilteredProjects} />
        ) : (
          <ChartView dateFilteredProjects={dateFilteredProjects} />
        )}
      </div>
    </div>
  );
};

export default SituationControls;
