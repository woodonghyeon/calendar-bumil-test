import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "./ProjectDetails.css";
import { useAuth } from "../../utils/useAuth";

/**
 * 📌 ProjectDetails - 프로젝트 상세 정보를 조회하는 페이지
 *
 * ✅ 주요 기능:
 *  - 특정 프로젝트 코드(project_code)에 대한 상세 정보 조회
 *  - 프로젝트 참여자 목록 표시
 *  - 로그인한 사용자 정보 확인 후 권한에 따라 프로젝트 수정 버튼 표시
 *
 * ✅ UI(또는 Component) 구조:
 *  - ProjectDetails (메인 페이지)
 *    ├── Sidebar (사이드바)
 *    ├── ProjectTable (프로젝트 기본 정보 테이블) 추후 컴포넌트로 분리 가능
 *    ├── ProjectUsersTable (참여자 목록 테이블) 추후 컴포넌트로 분리 가능
 *    ├── 프로젝트 수정 버튼 (관리자 권한 사용자만 접근 가능)
 */

const ProjectDetails = () => {
  const [employees, setEmployees] = useState([]); // 전체 사원 목록
  const [loggedInUserId, setLoggedInUserId] = useState(null); // 로그인한 사용자 ID
  const [Project, setProject] = useState(null); // 현재 프로젝트 상세 정보
  const [loading, setLoading] = useState(true); // 로딩 상태 표시
  const [error, setError] = useState(null); // 에러 메시지

  const apiUrl = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ URL에서 project_code 가져오기
  const projectCode = new URLSearchParams(location.search).get("project_code");

  // ✅ 필드 매핑(표시해야 할 프로젝트 요소가 추가되면 여기서 매핑해줘야 함, 그래야 표에 표시됨)
  const fieldMappings = {
    project_code: "프로젝트 코드",
    project_name: "프로젝트 명",
    category: "카테고리",
    status: "상태",
    business_start_date: "사업 시작일",
    business_end_date: "사업 종료일",
    customer: "고객사",
    supplier: "공급 업체",
    person_in_charge: "담당자",
    contact_number: "연락처",
    sales_representative: "영업대표",
    project_pm: "수행 PM",
    changes: "비고",
  };

  const [user, setUser] = useState({id: "", name: "", position: "", department: "", role_id: ""}); //로그인한 사용자 정보
  const { getUserInfo, checkAuth, handleLogout } = useAuth();

  // 전체 데이터 가져오기
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // 1. 사용자 정보 가져오기
        await fetchUserInfo();

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

  // ✅ 프로젝트 코드가 변경될 때 마다 fetchProjectDetails실행
  useEffect(() => {
    if (projectCode) {
      fetchProjectDetails();
    }
  }, [projectCode]);

  // ✅ 프로젝트 코드가 변경될 때마다 상세 정보 조회
  useEffect(() => {
    //console.log("Employees 업데이트됨:", employees);
  }, [employees]); // Project가 변경될 때마다 실행

  // ✅ 프로젝트 참여 인원 목록 불러오기
  useEffect(() => {
    fetchEmployees();
  }, []);

  // ✅ 프로젝트 상세정보 조회 API 호출
  const fetchProjectDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${apiUrl}/project/get_project_details?project_code=${projectCode}`
      );
      if (!response.ok) {
        throw new Error("프로젝트 상세정보를 불러오지 못했습니다.");
      }
      const data = await response.json();
      //console.log("project response : ", data);
      setProject(data.project);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ 사용자 목록 데이터 가져오기 (프로젝트 인원 상태 표시에 필요함)
  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${apiUrl}/user/get_users`);
      if (!response.ok)
        throw new Error("사용자 데이터를 가져오는 데 실패했습니다.");

      const data = await response.json();
      setEmployees(data.users);
      //console.log("fetchEmployees");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ 데이터 로딩 중 또는 에러 발생 시 처리
  if (loading) return <p>데이터를 불러오는 중...</p>;
  if (error) return <p>오류 발생: {error}</p>;

  // ✅ 프로젝트 수정 페이지로 이동
  const handleEditClick = () => {
    navigate(`/project-edit?project_code=${projectCode}`);
  };

  // ✅ 날짜 형식 변환 함수 (YYYY-MM-DD)
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    return date.toISOString().split("T")[0];
  };

  // ✅ 프로젝트 상세 정보 테이블 컴포넌트
  const ProjectTable = ({ project }) => {
    return (
      <table className="project-details-table">
        <tbody>
          {Object.entries(fieldMappings) // 필드 매핑 순서대로 반복
            .filter(([key]) => key in project) // 필드 매핑에 있는 요소만 표시
            .map(([key, label]) => (
              <tr key={key}>
                <th>{label}</th>
                <td>
                  {
                    ["date", "ed_at"].some((substr) => key.includes(substr))
                      ? formatDate(project[key])
                      : project[key]
                    /*date, at을 포함하면 formatDate를 실행하여 YYYY-MM-DD로 변환함*/
                  }
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    );
  };

  // ✅ 프로젝트 참여 인력 목록 테이블 컴포넌트
  const Projectuserstable = ({ project_users, employees }) => {
    //console.log("project_users : ", project_users);
    if (!project_users || project_users.length === 0) {
      return <p>참여 인원이 없습니다.</p>;
    }

    // project_users가 객체 배열인지, 문자열인지 판별 후 가공
    const participants = Array.isArray(project_users) // 배열 형태인지 확인
      ? project_users
      : project_users.split(",").map((id) => ({ id: id.trim() })); // 문자열이면 쉼표 기준으로 나눔

    //console.log("participants : ", participants);

    // employees 데이터에서 user 정보 찾아 매칭
    const matchedParticipants = participants.map((participant) => {
      const employee = employees.find(
        (emp) => emp.id.toString() === participant.user_id.toString()
      );
      return {
        id: employee ? employee.id : "정보 없음",
        name: employee ? employee.name : "정보 없음",
        department: employee ? employee.department : "정보 없음",
        phone: employee ? employee.phone_number : "정보 없음",
        status: employee ? employee.status : "정보 없음",
        comment: employee ? employee.comment : "정보 없음",
        start_date: formatDate(participant.start_date),
        end_date: formatDate(participant.end_date),
      };
    });

    return (
      <table className="project-details-table">
        <thead>
          <tr>
            <th>이름</th>
            <th>참여 시작일</th>
            <th>참여 종료일</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          {matchedParticipants.map((participant) => (
            <tr key={participant.id}>
              <td>
                {/* 이름을 클릭하면 사용자 상세 페이지로 이동 */}
                <span
                  onClick={() =>
                    navigate(`/user-details?user_id=${participant.id}`)
                  }
                >
                  {participant.name}
                </span>
              </td>
              <td>{participant.start_date}</td>
              <td>{participant.end_date}</td>
              <td>{participant.comment}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="project-details-app-body">
      <div className="project-details-sidebar">
        <Sidebar user={user}/>
      </div>
      <div className="project-details-container">
        <div className="project-details-edit-button-container">
          <h2 className="project-details-title2">프로젝트 상세정보(품의서)</h2>
          <button
            onClick={() => navigate("/projects")}
            className="project-details-list-button"
          >
            목록
          </button>
        </div>
        <div className="project-details-edit-button-container">
          <h3 className="project-details-section-title">🔹 사업개요</h3>
          {user?.role_id != "USR_GENERAL" && ( //로그인 유저의 roleId를 보고 수정 버튼 표시 판정
            <button
              onClick={handleEditClick}
              className="project-details-EditProjectButton"
            >
              프로젝트 수정
            </button>
          )}
        </div>

        {Project ? (
          <ProjectTable project={Project} />
        ) : (
          <p>데이터를 불러오는 중...</p>
        )}

        <h3 className="project-details-section-title">
          🔹 인력&nbsp;&nbsp;&nbsp;
        </h3>
        <Projectuserstable
          project_users={Project?.project_users}
          employees={employees}
        />
      </div>
    </div>
  );
};
export default ProjectDetails;
