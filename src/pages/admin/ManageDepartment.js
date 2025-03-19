import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "./ManageDepartment.css";
import { useAuth } from "../../utils/useAuth";
import { authFetch } from "../../utils/authFetch";

const ManageDepartment = () => {
  const [departmentList, setDepartmentList] = useState([]);
  const [newDepartmentId, setNewDepartmentId] = useState(""); // 부서 ID
  const [newDepartmentName, setNewDepartmentName] = useState(""); // 부서 이름
  const [newTeamName, setNewTeamName] = useState(""); // 팀 이름 (선택 사항)
  const [loading, setLoading] = useState(true);
  const [editDepartment, setEditDepartment] = useState(null); // 수정할 부서 정보 저장

  const apiUrl = process.env.REACT_APP_API_URL;
  const accessToken = localStorage.getItem("access_token");
  const refreshToken = localStorage.getItem("refresh_token");

  const navigate = useNavigate();
  const [user, setUser] = useState({
    id: "",
    name: "",
    position: "",
    department: "",
    role_id: "",
  });

  const { getUserInfo, checkAuth, handleLogout } = useAuth();

  useEffect(() => {
    const fetchUserInfo = async () => {
      const userInfo = await getUserInfo();
      setUser(userInfo);

      const isAuthorized = checkAuth(userInfo?.role_id, ["AD_ADMIN"]);
      if (!isAuthorized) {
        console.error("관리자 권한이 없습니다.");
        handleLogout();
        return;
      }
      setLoading(false);
    };
    fetchUserInfo();
  }, []);

  useEffect(() => {
    fetchDepartmentList();
  }, []);

  const fetchDepartmentList = async () => {
    try {
      const response = await authFetch(
        `${apiUrl}/department/get_department_list`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "X-Refresh-Token": refreshToken,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDepartmentList(data.departments);
      } else {
        alert("부서 목록을 불러오지 못했습니다.");
      }
    } catch (error) {
      console.error("부서 목록 로드 오류:", error);
    }
  };

  const handleAddDepartment = async () => {
    if (!newDepartmentId || !newDepartmentName) {
      alert("부서 ID와 부서 이름을 입력해주세요.");
      return;
    }

    try {
      const response = await authFetch(
        `${apiUrl}/department/create_department`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "X-Refresh-Token": refreshToken,
          },
          body: JSON.stringify({
            dpr_id: newDepartmentId,
            dpr_nm: newDepartmentName,
            team_nm: newTeamName || null,
            created_by: user.name,
          }),
        }
      );

      if (response.ok) {
        alert("부서가 추가되었습니다.");
        setNewDepartmentId("");
        setNewDepartmentName("");
        setNewTeamName("");
        fetchDepartmentList();
      } else {
        alert("부서 추가에 실패했습니다.");
      }
    } catch (error) {
      console.error("부서 추가 오류:", error);
    }
  };

  const handleDeleteDepartment = async (dpr_id) => {
    if (!window.confirm("정말로 이 부서를 삭제하시겠습니까?")) return;

    try {
      const response = await authFetch(
        `${apiUrl}/department/delete_department/${dpr_id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "X-Refresh-Token": refreshToken,
          },
        }
      );

      if (response.ok) {
        alert("부서가 삭제되었습니다.");
        fetchDepartmentList();
      } else {
        alert("부서 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("부서 삭제 오류:", error);
    }
  };

  // 수정한 내용 저장
  const handleUpdateDepartment = async () => {
    if (!editDepartment.dpr_nm) {
      alert("부서명을 입력해야 합니다.");
      return;
    }

    try {
      const response = await authFetch(
        `${apiUrl}/department/update_department/${editDepartment.dpr_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "X-Refresh-Token": refreshToken,
          },
          body: JSON.stringify({
            dpr_nm: editDepartment.dpr_nm,
            team_nm: editDepartment.team_nm || null,
            updated_by: user.name,
          }),
        }
      );

      if (response.ok) {
        alert("부서가 수정되었습니다.");
        setEditDepartment(null);
        fetchDepartmentList();
      } else {
        alert("부서 수정에 실패했습니다.");
      }
    } catch (error) {
      console.error("부서 수정 오류:", error);
    }
  };

  // 수정 모달 열기
  const openEditModal = (department) => {
    setEditDepartment(department);
  };

  // 모달 닫기
  const closeModal = () => {
    setEditDepartment(null);
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="department-management">
      <Sidebar user={user} />
      <h2 className="department-title">부서 관리</h2>
      {/* 부서 목록 */}
      <div className="department-container">
        <table className="department-table">
          <thead>
            <tr>
              <th>부서 ID</th>
              <th>부서명</th>
              <th>팀명</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {departmentList.length > 0 ? (
              departmentList.map((dept) => (
                <tr key={dept.dpr_id}>
                  <td data-label="부서 ID">{dept.dpr_id}</td>
                  <td data-label="부서명">{dept.dpr_nm}</td>
                  <td data-label="팀명">{dept.team_nm || "-"}</td>
                  <td data-label="관리">
                    <button
                      onClick={() => openEditModal(dept)}
                      className="department-edit-button"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDeleteDepartment(dept.dpr_id)}
                      className="department-delete-button"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4">부서 목록이 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* 부서 추가 */}
      <div className="add-department">
        <h3>부서 추가</h3>
        <label>부서 ID (필수)</label>
        <input
          type="text"
          placeholder="dev_team"
          value={newDepartmentId}
          onChange={(e) => setNewDepartmentId(e.target.value)}
        />

        <label>부서 이름 (필수)</label>
        <input
          type="text"
          placeholder="개발사업부/팀"
          value={newDepartmentName}
          onChange={(e) => setNewDepartmentName(e.target.value)}
        />

        <label>팀 이름 (선택)</label>
        <input
          type="text"
          placeholder="개발팀"
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
        />

        <button onClick={handleAddDepartment} className="department-add-button">
          부서 추가
        </button>
      </div>
      {/* 부서 수정 모달 */}
      {editDepartment && (
        <div className="department-modal">
          <div className="modal-header">
            부서 수정
            <button className="close-button" onClick={closeModal}>
              ✖
            </button>
          </div>

          <label>부서 이름 (필수)</label>
          <input
            type="text"
            value={editDepartment.dpr_nm}
            onChange={(e) =>
              setEditDepartment({ ...editDepartment, dpr_nm: e.target.value })
            }
          />

          <label>팀 이름 (선택)</label>
          <input
            type="text"
            value={editDepartment.team_nm || ""}
            onChange={(e) =>
              setEditDepartment({ ...editDepartment, team_nm: e.target.value })
            }
          />

          <div className="department-button-container">
            <button
              className="department-save-button"
              onClick={handleUpdateDepartment}
            >
              저장
            </button>
            <button className="department-cancel-button" onClick={closeModal}>
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageDepartment;
