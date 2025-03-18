import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./NoticeDetails.css";
import Sidebar from "../components/Sidebar";
import { useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { useAuth } from "../../utils/useAuth";

const NoticeDetails = () => {
  const [loading, setLoading] = useState(true); // 데이터 로딩 상태
  const [error, setError] = useState(null); // 에러 메세지
  const [notice, setNotice] = useState(null);

  const apiUrl = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();

  const { id } = useParams();

  //로그인한 사용자 정보
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

        //2. 공지사항 가져오기
        await fetchNotice();
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

  const fetchNotice = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${apiUrl}/notice/get_notice/${id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("공지사항을 불러오지 못했습니다.");
      }
      const data = await response.json();
      //console.log("data: ", data.notice);
      setNotice(data.notice);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNotice = async (id) => {
    const confirmDelete = window.confirm(
      "정말로 이 공지사항을을 삭제하시겠습니까?"
    );
    if (!confirmDelete) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${apiUrl}/notice/delete_notice/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ updated_by: user.id }),
      });
      if (!response.ok) {
        throw new Error("공지사항을 삭제하지 못했습니다.");
      }
      alert("공지사항이 삭제되었습니다.");
      navigate("/notice-list");
    } catch (err) {
      setError(err.message);
    }
  };

  // ✅ 로딩 중 또는 에러 시 화면에 표시할 메세지
  if (loading) return <p>데이터를 불러오는 중...</p>;
  if (error) return <p>오류 발생: {error}</p>;

  return (
    <div>
      <Sidebar user={user} />
      <div className="notice-detail-container">
        <span
          className="notice-detail-notice"
          onClick={() => navigate("/notice-list")}
        >
          공지사항
        </span>
        <h1 className="notice-detail-title">{notice.title}</h1>
        <div className="notice-detail-meta">
          <span>{notice.created_by}</span>
          <div className="notice-detail-date">
            <span>
              {new Date(notice.created_at).toLocaleString("ko-KR", {
                timeZone: "Asia/Seoul",
              })}
            </span>
          </div>
        </div>

        <div
          className="notice-detail-content"
          dangerouslySetInnerHTML={{ __html: notice.content }}
        ></div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "3px",
            cursor: "pointer",
          }}
        >
          <FaArrowLeft
            style={{ position: "relative", top: "0px" }}
            onClick={() => navigate("/notice-list")}
          />
          <span
            style={{
              fontFamily: "Arial, sans-serif",
              fontSize: "16px",
              fontWeight: "bold",
            }}
            onClick={() => navigate("/notice-list")}
          >
            목록으로
          </span>
        </div>
        {user?.role_id === "AD_ADMIN" && (
          <>
            <button
              className="notice-edit-button"
              onClick={() => navigate(`/notice-edit/${id}`)}
            >
              수정
            </button>
            <button
              className="notice-delete-button"
              onClick={() => handleDeleteNotice(id)}
            >
              삭제
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default NoticeDetails;
