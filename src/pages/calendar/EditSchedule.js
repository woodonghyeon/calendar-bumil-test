import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import "./EditSchedule.css";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../../utils/useAuth";

const EditSchedule = () => {
  const { scheduleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { schedule } = location.state || {}; // state가 없으면 빈 객체로 기본값 설정

  const [task, setTask] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("");

  const [loading, setLoading] = useState(true); // 데이터 로딩 상태 관리 (true: 로딩 중) 
  const [user, setUser] = useState({id: "", name: "", position: "", department: "", role_id: ""}); //로그인한 사용자 정보
  const { getUserInfo } = useAuth();

  // 로그인한 사용자 정보 가져오기 및 권한 확인 후 권한 없으면 로그아웃 시키기
  useEffect(() => {
    const fetchUserInfo = async () => {
      const userInfo = await getUserInfo();
      setUser(userInfo);
      setLoading(false); // 로딩 완료
    };  
    fetchUserInfo();
  }, []);

  // 날짜에서 하루를 빼는 함수
  const subtractOneDay = (dateString) => {
    const date = new Date(dateString);
    date.setDate(date.getDate()); // 하루를 빼는 부분 (필요없어짐)
    return date.toISOString().split("T")[0]; // 날짜 포맷: YYYY-MM-DD
  };

  useEffect(() => {
    if (!schedule) {
      console.error("일정 데이터가 없습니다!");
      navigate("/calendar");
      return;
    }

    setTask(schedule.task || "");

    // 날짜 변환 (하루를 더한 후 YYYY-MM-DD 형식으로 저장)
    const addOneDay = (dateString) => {
      if (!dateString) return "";
      const date = new Date(dateString);
      date.setDate(date.getDate()); 
      return date.toISOString().split("T")[0]; // YYYY-MM-DD 형식으로 변환
    };

    setStartDate(addOneDay(schedule.start_date));
    setEndDate(addOneDay(schedule.end_date));

    setStatus(schedule.status || "진행 중");
  }, [schedule, navigate]); 

  const handleSubmit = async (event) => {
    event.preventDefault();

    // 날짜에서 하루를 빼는 함수 사용
    const adjustedStartDate = subtractOneDay(startDate);
    const adjustedEndDate = subtractOneDay(endDate);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/schedule/edit-schedule/${scheduleId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            task,
            start_date: adjustedStartDate,
            end_date: adjustedEndDate,
            status,
          }),
        }
      );

      if (response.ok) {
        alert("일정이 수정되었습니다.");
        navigate("/calendar");
      } else {
        alert("일정 수정에 실패했습니다.");
      }
    } catch (error) {
      console.error("일정 수정 오류:", error);
      alert("일정 수정에 실패했습니다.");
    }
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="edit-body">
      <Sidebar user={user} />
      <div className="edit-schedule">
        <h2 className="edit-schedule__title">일정 수정</h2>
        <form onSubmit={handleSubmit} className="edit-schedule__form">
          <div className="edit-schedule__field">
            <label htmlFor="task" className="edit-schedule__label">
              일정
            </label>
            <input
              type="text"
              id="task"
              className="edit-schedule__input"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="할 일을 입력하세요"
            />
          </div>
          <div className="edit-schedule__field">
            <label htmlFor="start-date" className="edit-schedule__label">
              시작 날짜
            </label>
            <input
              type="date"
              id="start-date"
              className="edit-schedule__input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="edit-schedule__field">
            <label htmlFor="end-date" className="edit-schedule__label">
              종료 날짜
            </label>
            <input
              type="date"
              id="end-date"
              className="edit-schedule__input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="edit-schedule__field">
            <label htmlFor="status" className="edit-schedule__label">
              상태
            </label>
            <select
              id="status"
              className="edit-schedule__select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="준비 중">준비 중</option>
              <option value="진행 중">진행 중</option>
              <option value="완료">완료</option>
            </select>
          </div>
          <div className="edit-schedule__button-container">
            <button type="submit" className="edit-schedule__button">
              저장
            </button>
            <button
              type="button"
              className="edit-schedule__button edit-schedule__button--back"
              onClick={() => navigate("/calendar")}
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSchedule;
