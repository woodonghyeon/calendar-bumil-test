import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "./StatusManagement.css";
import { useAuth } from "../../utils/useAuth";
import { authFetch } from "../../utils/authFetch";

const StatusManagement = () => {
  const [statuses, setStatuses] = useState([]);
  const [newStatus, setNewStatus] = useState("");
  const [newComment, setNewComment] = useState("");

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

  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    try {
      const response = await authFetch(`${apiUrl}/status/get_all_status`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Refresh-Token": refreshToken,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStatuses(data.statuses);
      } else {
        alert("상태 목록을 불러오지 못했습니다.");
      }
    } catch (error) {
      console.error("상태 목록 로드 오류:", error);
    }
  };

  const handleAddStatus = async () => {
    try {
      const response = await authFetch(`${apiUrl}/status/add_status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Refresh-Token": refreshToken,
        },
        body: JSON.stringify({ status: newStatus, comment: newComment }),
      });
      if (response.ok) {
        alert("상태가 추가되었습니다.");
        setNewStatus("");
        setNewComment("");
        fetchStatuses();
      } else {
        alert("상태 추가에 실패했습니다.");
      }
    } catch (error) {
      console.error("상태 추가 오류:", error);
    }
  };

  const handleDeleteStatus = async (statusId) => {
    try {
      const response = await authFetch(
        `${apiUrl}/status/delete_status/${statusId}`,
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
        alert("상태가 삭제되었습니다.");
        fetchStatuses();
      } else {
        alert("상태 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("상태 삭제 오류:", error);
    }
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="status-management">
      <Sidebar user={user} />
      <h2 className="status-title">상태 관리</h2>
      <div className="status-list">
        {statuses.map((s) => (
          <div key={s.id} className="status-item">
            <span>
              {s.id} ({s.comment})
            </span>
            <button
              onClick={() => handleDeleteStatus(s.id)}
              className="reject-button"
            >
              삭제
            </button>
          </div>
        ))}
      </div>
      <div className="add-status">
        <input
          type="text"
          placeholder="상태 아이디 (영문)"
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value)}
        />
        <input
          type="text"
          placeholder="상태 이름 (표시되는 이름)"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <button onClick={handleAddStatus} className="approve-button">
          상태 추가
        </button>
      </div>
    </div>
  );
};

export default StatusManagement;
