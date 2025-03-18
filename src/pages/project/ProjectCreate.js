import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "./ProjectCreate.css";
import ParticipantSelection from "./ParticipantSelection";
import { useAuth } from "../../utils/useAuth";

/**
 * 📌 ProjectCreate - 프로젝트를 생성하는 페이지
 *
 * ✅ 주요 기능:
 *  - 프로젝트 생성 (POST /project/add_project)
 *  - 프로젝트 참여자 선택 및 관리
 *  - 필수 입력값 확인 및 오류 처리
 *  - 권한 확인 후 접근 제한 (AD_ADMIN, PR_ADMIN)
 *
 * ✅ UI(또는 Component) 구조:
 *  - ProjectCreate (메인 페이지)
 *    ├── Sidebar (사이드바)
 *    ├── 프로젝트 생성 입력 폼
 *    ├── ParticipantSelection (참여자 추가 및 관리)
 *    ├── 프로젝트 생성 & 취소 버튼
 */

const ProjectCreate = () => {
  const navigate = useNavigate();
  const apiUrl = process.env.REACT_APP_API_URL || "http://3.38.20.237";

  const [user, setUser] = useState({
    id: "",
    name: "",
    position: "",
    department: "",
    role_id: "",
  }); //로그인한 사용자 정보
  const { getUserInfo, checkAuth, handleLogout } = useAuth();
  const [loading, setLoading] = useState(true); // 데이터 로딩 상태

  // 로그인한 사용자 정보 가져오기 및 권한 확인 후 권한 없으면 로그아웃 시키기
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // 1. 사용자 정보 가져오기
        const userInfo = await fetchUserInfo();
        
        const isAuthorized = checkAuth(userInfo?.role_id, ["AD_ADMIN", "PR_ADMIN"]); // 권한 확인하고 맞으면 true, 아니면 false 반환
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

  /**
   * ✅ 프로젝트 생성 폼의 상태 관리
   * - 초기값 설정 (배열 형태 필드 포함)
   */
  const [formData, setFormData] = useState({
    project_code: "",
    project_name: "",
    category: "",
    status: "",
    business_start_date: "",
    business_end_date: "",
    customer: "",
    supplier: "",
    person_in_charge: "",
    contact_number: "",
    sales_representative: "",
    project_pm: "",
    project_manager: "",
    business_details_and_notes: "",
    changes: "",
    group_name: "",
    participants: [],
  });

  const [error, setError] = useState(null);

  // ✅ 입력값 변경 핸들러 (폼 필드 업데이트)
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ 참여자 추가 및 삭제를 위한 핸들러 (ParticipantSelection에서 데이터 업데이트)
  const setParticipants = (newParticipants) => {
    setFormData((prevState) => ({
      ...prevState,
      participants: newParticipants,
    }));
  };

  /**
   * ✅ 프로젝트 생성 요청 핸들러
   * - 필수 입력값 검증 후 API 호출 (POST /project/add_project)
   * - 참여자 데이터를 백엔드에서 요구하는 형식으로 변환 후 전송
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // ✅ 필수 입력값 확인
    if (
      !formData.project_code ||
      !formData.category ||
      !formData.status ||
      !formData.business_start_date ||
      !formData.business_end_date ||
      !formData.project_name ||
      !formData.project_pm
    ) {
      setError("⚠️ 필수 입력값을 모두 입력해주세요.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("로그인이 필요합니다.");
      }

      // ✅ 참여자 데이터를 사용할 API 형식으로 변환
      const participants = formData.participants.map((p) => ({
        id: p.id,
        start_date: p.participant_start_date || formData.business_start_date,
        end_date: p.participant_end_date || formData.business_end_date,
      }));

      // ✅ 전송할 데이터 구조
      const payload = {
        ...formData,
        participants, // 전체 참여자 정보 포함
      };

      //console.log("📤 전송된 데이터:", JSON.stringify(payload, null, 2)); // 디버깅용 출력

      const response = await fetch(`${apiUrl}/project/add_project`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorMessage = await response.json();
        throw new Error(
          errorMessage.message || "프로젝트 생성에 실패했습니다."
        );
      }

      alert("✅ 프로젝트가 성공적으로 생성되었습니다!");
      navigate("/projects");
    } catch (error) {
      setError(error.message);
    }
  };

  if (loading) return <p>데이터를 불러오는 중...</p>;

  return (
    <div className="project-create-app-body">
      <div className="project-create-sidebar">
        <Sidebar user={user}/>
        <div className="project-create-container">
          <h2 className="project-create-title">프로젝트 생성</h2>
          {error && <p className="project-create-error-message">⚠️ {error}</p>}

          <form onSubmit={handleSubmit} className="project-create-form">
            {/* ✅ 텍스트 입력 필드 */}
            {[
              ["프로젝트 코드", "project_code"],
              ["프로젝트명", "project_name"],
              ["고객", "customer"],
              ["공급처", "supplier"],
              ["담당자", "person_in_charge"],
              ["연락처", "contact_number"],
              ["영업대표", "sales_representative"],
              ["PM", "project_pm"],
              ["프로젝트 관리자", "project_manager"],
              ["변경사항", "changes"],
              ["그룹명", "group_name"],
            ].map(([label, name]) => (
              <div className="project-create-form-row" key={name}>
                <label>{label}:</label>
                <input
                  type="text"
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                />
              </div>
            ))}

            {/* ✅ 카테고리 및 상태 */}
            {[
              [
                "카테고리",
                "category",
                [
                  "구축 인프라",
                  "구축 SW",
                  "유지보수 인프라",
                  "유지보수 SW",
                  "연구과제",
                ],
              ],
              ["상태", "status", ["제안", "수행", "실주종료"]],
            ].map(([label, name, options]) => (
              <div className="project-create-form-row" key={name}>
                <label>{label}:</label>
                <select
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                >
                  <option value="">선택하세요</option>
                  {options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            {/* ✅ 사업 기간 */}
            <div className="project-create-form-row">
              <label>사업 기간:</label>
              <div className="project-create-date-container">
                <input
                  type="date"
                  name="business_start_date"
                  value={formData.business_start_date}
                  onChange={(e) => {
                    const newStartDate = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      business_start_date: newStartDate,
                      // 🚀 자동 조정: 시작 날짜가 종료 날짜보다 늦다면 종료 날짜도 변경
                      business_end_date:
                        prev.business_end_date && new Date(newStartDate) > new Date(prev.business_end_date)
                          ? newStartDate
                          : prev.business_end_date,
                    }));
                  }}
                  required
                />
                <span className="project-create-date-separator">~</span>
                <input
                  type="date"
                  name="business_end_date"
                  value={formData.business_end_date}
                  onChange={(e) => {
                    const newEndDate = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      business_end_date: newEndDate,
                      // 🚀 자동 조정: 종료 날짜가 시작 날짜보다 빠르면 시작 날짜도 변경
                      business_start_date:
                        prev.business_start_date && new Date(prev.business_start_date) > new Date(newEndDate)
                          ? newEndDate
                          : prev.business_start_date,
                    }));
                  }}
                  required
                />
              </div>
            </div>

            {/* ✅ 사업 내용 */}
            <div className="project-create-form-row">
              <label>사업 내용 및 특이사항:</label>
              <textarea
                name="business_details_and_notes"
                value={formData.business_details_and_notes}
                onChange={handleChange}
              />
            </div>

            {/* ✅ 참여자 선택 컴포넌트 */}
            <ParticipantSelection
              participants={formData.participants} // ✅ formData.participants를 직접 전달
              setParticipants={setParticipants}
              projectStartDate={formData.business_start_date}
              projectEndDate={formData.business_end_date}
            />

            {/* ✅ 프로젝트 생성 & 취소 버튼 복원 */}
            <div className="project-create-button-container">
              <button type="submit" className="project-create-save-button">
                프로젝트 생성
              </button>
              <button
                type="button"
                className="project-create-cancel-button"
                onClick={() => navigate("/projects")}
              >
                취소
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProjectCreate;
