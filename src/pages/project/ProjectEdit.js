import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Select from "react-select";
import "./ProjectEdit.css";
import { useAuth } from "../../utils/useAuth";

/**
 * 📌 ProjectEdit - 프로젝트 수정 페이지
 *
 * ✅ 주요 기능:
 *  - 프로젝트 상세 정보 조회 (GET /project/get_project_details)
 *  - 프로젝트 정보 수정 및 저장 (POST /project/update_project)
 *  - 참여 가능한 사용자 목록 조회 (GET /user/get_users)
 *  - 프로젝트 참여자 추가 및 제거
 *
 * ✅ UI(또는 Component) 구조:
 *  - ProjectEdit (메인 페이지)
 *    ├── Sidebar (사이드바)
 *    ├── 프로젝트 정보 입력 폼
 *    ├── 참여자 추가/제거 UI
 */

// 날짜를 "YYYY-MM-DD" 형식으로 변환하는 유틸리티 함수
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? dateString : date.toISOString().split("T")[0];
};

const ProjectEdit = () => {
  // 상태관리 (State)
  const [employees, setEmployees] = useState([]); // 전체 유저 목록
  const [Project, setProject] = useState(null); // 프로젝트 상세 정보
  const [loading, setLoading] = useState(true); // 데이터 로딩 상태
  const [error, setError] = useState(null); // 에러 메세지
  const [message, setMessage] = useState(""); // 저장 성공여부 메시지
  const [selectedUser, setSelectedUser] = useState(null); // 새로 추가할 유저 선택
  const [users, setUsers] = useState([]); // 참여 가능한 유저 목록

  const apiUrl = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();
  const location = useLocation();

  // 현재 페이지 URL 에서 프로젝트 코드 가져오기
  const projectCode = new URLSearchParams(location.search).get("project_code");

  // 프로젝트 필드 매핑 (UI에서 표시할 필드명 설정)
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
        await Promise.all([fetchEmployees()]);

        const isAuthorized = checkAuth(userInfo?.role_id, ["AD_ADMIN"]); // 권한 확인하고 맞으면 true, 아니면 false 반환
        if (!isAuthorized) {
          console.error("관리자 권한이 없습니다.");
          handleLogout();
          return;
        }
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

  // 🔄 **2. 프로젝트 코드가 변경되면 상세 정보 가져오기**
  useEffect(() => {
    if (projectCode) {
      fetchProjectDetails();
    }
  }, [projectCode]);

  // 🔄 **3. 직원 목록이 업데이트될 때 참여 가능한 사용자 목록 갱신**
  useEffect(() => {
    // console.log("Employees 업데이트됨:", employees);
    // 이미 할당된 유저 ID 목록(Set으로 변환)
    const assignedIds = new Set(
      Project?.assigned_user_ids
        ?.split(",")
        .map((id) => id.trim())
        .filter((id) => id !== "") || []
    );
    // employees 목록에서 이미 참여한 인원 제외
    const availableUsers = employees
      .filter((emp) => !assignedIds.has(emp.id))
      .map((emp) => ({
        value: emp.id,
        label: emp.team_name
          ? `${emp.id} - ${emp.name} (${emp.department_name} - ${emp.team_name})`
          : `${emp.id} - ${emp.name} (${emp.department_name})`,
      }));
    setUsers(availableUsers);
  }, [employees, Project?.assigned_user_ids]);

  // 🔄 **4. users가 변경될 때 로그 출력**
  useEffect(() => {
    // console.log("users 업데이트됨:", users);
  }, [users]);

  // 🔄 **5. 직원 목록 가져오기**
  useEffect(() => {}, []);

  // ✅ 프로젝트 상세정보 API 호출
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
      // console.log("project response : ", data);
      setProject(data.project);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ 현재 시스템에 등록된 모든 직원 목록을 API 에서 불러옴
  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${apiUrl}/user/get_users`);
      if (!response.ok)
        throw new Error("사용자 데이터를 가져오는 데 실패했습니다.");
      const data = await response.json();
      setEmployees(data.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ 로딩 중 또는 에러 시 화면에 표시할 메세지
  if (loading) return <p>데이터를 불러오는 중...</p>;
  if (error) return <p>오류 발생: {error}</p>;

  // ✅ 입력 필드 값 변경 시 Project 상태 업데이트
  const handleChange = (key, value) => {
    setProject((prevProject) => ({
      ...prevProject,
      [key]: value,
    }));
  };

  // ✅ 참여자의 참여 날짜 변경 시 업데이트 함수
  const handleParticipantDateChange = (participantId, field, value) => {
    setProject((prevProject) => ({
      ...prevProject,
      project_users: prevProject.project_users.map((participant) =>
        participant.id === participantId
          ? { ...participant, [field]: value }
          : participant
      ),
    }));
  };

  // ✅ 선택된 참여자 프로젝트에서 삭제
  const handleRemoveParticipant = (participantId) => {
    setProject((prevProject) => {
      const updatedParticipants = prevProject.project_users.filter(
        (participant) => participant.id !== participantId
      );
      return {
        ...prevProject,
        project_users: updatedParticipants,
      };
    });
  };

  // ✅ 사용자 입력을 기반으로 프로젝트 정보를 API 로 업데이트, 참여자 목록도 함께 저장
  const Projectuserstable = ({ project_users, employees }) => {
    if (!project_users || project_users.length === 0) {
      return <p>참여 인원이 없습니다.</p>;
    }

    // ✅ 참여자 정보 매칭
    const matchedParticipants = project_users.map((participant) => {
      const employee = employees.find(
        (emp) => emp.id.toString() === participant.user_id.toString()
      );
      return {
        id: participant.id,
        user_id: participant.user_id,
        name: employee ? employee.name : "정보 없음",
        department: employee
          ? employee.team_name
            ? `${employee.department_name} - ${employee.team_name}`
            : employee.department_name
          : "정보 없음",
        phone: employee ? employee.phone_number : "정보 없음",
        status: employee ? employee.status : "정보 없음",
        comment: employee ? employee.comment : "정보 없음",
        start_date: participant.start_date,
        end_date: participant.end_date,
      };
    });

    return (
      <table className="project-edit-table">
        <thead>
          <tr>
            <th>이름</th>
            <th>참여 시작일</th>
            <th>참여 종료일</th>
            <th>상태</th>
            <th>삭제</th>
          </tr>
        </thead>
        <tbody>
          {matchedParticipants.map((participant) => (
            <tr key={participant.id}>
              <td>{participant.name}</td>
              <td>
                <input
                  className="project-edit-datebox"
                  type="date"
                  value={formatDate(participant.start_date)}
                  onMouseDown={(e) => e.stopPropagation()} // 포커스 유지
                  onChange={(e) =>
                    handleParticipantDateChange(
                      participant.id,
                      "start_date",
                      e.target.value
                    )
                  }
                />
              </td>
              <td>
                <input
                  className="project-edit-datebox"
                  type="date"
                  value={formatDate(participant.end_date)}
                  onMouseDown={(e) => e.stopPropagation()} // 포커스 유지
                  onChange={(e) =>
                    handleParticipantDateChange(
                      participant.id,
                      "end_date",
                      e.target.value
                    )
                  }
                />
              </td>
              <td>{participant.comment}</td>
              <td>
                <button
                  className="project-edit-remove-button"
                  onClick={() => handleRemoveParticipant(participant.id)}
                >
                  ❌
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // 수정된 데이터 저장 API 호출
  const handleSave = async () => {
    try {
      // 상위 프로젝트 필드의 날짜 값은 "YYYY-MM-DD" 형식으로 변환
      const projectToSave = {
        ...Project,
        business_start_date: formatDate(Project.business_start_date),
        business_end_date: formatDate(Project.business_end_date),
        assigned_user_ids: Project.project_users.map((user) => user.user_id),
        // ✅ 'participants' 필드로 전송 (백엔드 요구사항)
        participants: Project.project_users.map((user) => ({
          user_id: user.user_id,
          start_date: user.start_date ? formatDate(user.start_date) : null,
          end_date: user.end_date ? formatDate(user.end_date) : null,
        })),
      };

      // console.log("저장할 데이터:", JSON.stringify(projectToSave, null, 2));

      const response = await fetch(`${apiUrl}/project/edit_project`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(projectToSave),
      });

      if (!response.ok) {
        const errorData = await response.json();
        //console.error("Save error response:", errorData);
        throw new Error("프로젝트 업데이트 실패");
      }

      setMessage("프로젝트가 성공적으로 저장되었습니다!");
      navigate(`/project-details?project_code=${projectCode}`);
    } catch (err) {
      setMessage("저장 중 오류 발생: " + err.message);
      //console.error("HandleSave error:", err);
    }
  };

  // 참여자 추가
  const handleAddParticipant = () => {
    if (!selectedUser) {
      alert("추가할 참여자를 선택하세요.");
      return;
    }

    setProject((prevProject) => {
      const currentDate = new Date();
      const currentDateStr = currentDate.toISOString().split("T")[0];

      // 기존 project_users 배열 복사
      const updatedParticipants = [...prevProject.project_users];

      // 선택한 사용자 정보 찾기
      const newParticipant = employees.find(
        (emp) => emp.id === selectedUser.value
      );
      if (!newParticipant) {
        alert("선택한 사용자를 찾을 수 없습니다.");
        return prevProject;
      }

      // 중복 체크 후 추가
      if (
        !updatedParticipants.some((user) => user.user_id === newParticipant.id)
      ) {
        updatedParticipants.push({
          ...newParticipant,
          user_id: newParticipant.id,
          start_date: Project.business_start_date,
          end_date: Project.business_end_date,
        });
      } else {
        alert("이미 추가되어있습니다.");
      }

      return {
        ...prevProject,
        project_users: updatedParticipants,
      };
    });

    setSelectedUser(null);
  };

  // 사용자가 삭제를 확정하면 삭제 API 호출
  const deleteProject = async (project_code) => {
    const confirmDelete = window.confirm(
      "정말로 이 프로젝트를 삭제하시겠습니까?"
    );
    if (!confirmDelete) return;

    try {
      const response = await fetch(
        `${apiUrl}/project/delete_project/${project_code}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("프로젝트 삭제 실패");
      }

      const data = await response.json();
      //console.log(data.message);
      alert(data.message);
      navigate("/projects");
    } catch (err) {
      //console.error("Error:", err);
      alert("프로젝트 삭제에 실패했습니다. 다시 시도해주세요.");
    }
  };

  return (
    <div className="project-edit-app-body">
      <div className="project-edit-sidebar">
        <Sidebar />
      </div>
      <div className="project-edit-main">
        <div className="project-edit-container">
          <div className="project-edit-button-container">
            <h2 className="project-edit-title2">프로젝트 상세정보(품의서)</h2>
            <button
              onClick={() => navigate("/projects")}
              className="project-edit-list-button"
            >
              목록
            </button>
          </div>
          <div className="project-edit-button-container">
            <h3 className="section-title">🔹 사업개요</h3>
          </div>

          <table className="project-edit-table">
            <tbody>
              {Object.entries(fieldMappings).map(([key, label]) =>
                Project && Project[key] !== undefined ? (
                  <tr key={key}>
                    <th>{label}</th>
                    <td>
                      {key === "project_code" ? (
                        <span>{Project[key]}</span>
                      ) : key === "business_start_date" ||
                        key === "business_end_date" ? (
                        <input
                          className="datebox"
                          type="date"
                          value={formatDate(Project[key])}
                          onChange={(e) => handleChange(key, e.target.value)}
                        />
                      ) : (
                        <textarea
                          value={Project[key]}
                          onChange={(e) => handleChange(key, e.target.value)}
                          rows="4"
                        />
                      )}
                    </td>
                  </tr>
                ) : null
              )}
            </tbody>
          </table>

          <h3 className="project-edit-section-title">🔹 인력</h3>
          <Projectuserstable
            project_users={Project?.project_users}
            employees={employees}
          />

          <div className="project-edit-form-section">
            <h3>👥 프로젝트 참여자 추가</h3>
            <div className="project-edit-participant-container">
              <Select
                className="project-edit-react-select-dropdown"
                classNamePrefix="react-select"
                options={users}
                value={selectedUser}
                onChange={setSelectedUser}
                isSearchable={true}
                placeholder="참여자 선택"
              />
              <button
                type="button"
                className="project-edit-add-button"
                onClick={handleAddParticipant}
              >
                프로젝트에 추가
              </button>
            </div>
          </div>

          {message && <p className="message">{message}</p>}

          <button onClick={handleSave} className="project-edit-save-button">
            저장
          </button>
          <button
            type="button"
            className="project-edit-cancel-button"
            onClick={() =>
              navigate(`/project-details?project_code=${Project.project_code}`)
            }
          >
            취소
          </button>
          <button
            className="project-edit-delete-button"
            onClick={() => deleteProject(Project.project_code)}
            disabled={loading}
          >
            {loading ? "삭제 중..." : "프로젝트 삭제"}
          </button>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default ProjectEdit;
