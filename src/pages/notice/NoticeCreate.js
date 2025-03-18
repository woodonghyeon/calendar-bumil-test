import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "./NoticeCreate.css";
import { useAuth } from "../../utils/useAuth";

/**
 * 📌  NoticeCreate - 공지사항 생성을 위한 컴포넌트
 *
 * ✅ 주요 기능:
 * - 공지사항 생성 (POST /notice/create_notice)
 *
 *
 * ✅ UI (또는 Component) 구조:
 * - NoticeCreate (공지사항 생성)
 *
 */

const NoticeCreate = () => {
  const [loading, setLoading] = useState(true); // 데이터 로딩 상태
  const [error, setError] = useState(null); // 에러 메세지

  const apiUrl = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();

  /**
   * ✅ 프로젝트 생성 폼의 상태 관리
   * - 초기값 설정 (배열 형태 필드 포함)
   */
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    user_id: "",
  });

  //로그인한 사용자 정보
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
        
        //3. 권한 확인
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

  const handleChange = (value, name) => {
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    //console.log("공지사항 제목, 내용:", formData.title, formData.content);
    if (!formData.title || !formData.content) {
      setError("⚠️ 필수 입력값을 모두 입력해주세요.");
      return;
    }
    createNotice();
  };

  // ✅ 공지사항 생성 API 호출
  const createNotice = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("로그인이 필요합니다.");
      }

      const response = await fetch(`${apiUrl}/notice/create_notice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        throw new Error("공지사항 생성을 실패했습니다.");
      }
      alert("✅ 공지사항이 성공적으로 생성되었습니다!");
      navigate("/notice-list");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const modules = {
    toolbar: [
      [{ 'header': '1' }, { 'header': '2' }, { 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['bold', 'italic', 'underline'],
      ['link'],
    ],
  };
  
  const formats = [
    'header', 'font', 'size', 'list', 'align', 'bold', 'italic', 'underline', 'link',
  ];
  
  

  // ✅ 로딩 중 또는 에러 시 화면에 표시할 메세지
  if (loading) return <p>데이터를 불러오는 중...</p>;
  if (error) return <p>오류 발생: {error}</p>;

  return (
    <div>
      <Sidebar user={user}/>
      <div className="notice-create-container">
        <h2>공지사항 생성</h2>

        <form onSubmit={handleSubmit}>
          <div className="notice-create-form-group">
            <label htmlFor="title">제목</label>
            <input
              type="text"
              id="title"
              name="title"
              onChange={(e) => handleChange(e.target.value, e.target.name)}
              required
            />
          </div>
          <ReactQuill
            value={formData.content}
            onChange={(value) => handleChange(value, "content")}
            modules={modules}
            formats={formats}
            theme="snow"
            style={{ height: "250px" }}
          />
          <button className="notice-create-button" type="submit">
            공지사항 생성
          </button>
        </form>
        <button
          className="notice-edit-cancel-button"
          onClick={() => navigate("/notice-list")}
        >
          취소
        </button>
      </div>
    </div>
  );
};

export default NoticeCreate;
