import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./AddSchedule.css";
import { useAuth } from "../../utils/useAuth";
import Sidebar from "../components/Sidebar";

/**
 * 📌 AddSchedule - 새로운 일정을 추가하는 페이지
 *
 * ✅ 주요 기능:
 *  - 사용자가 시작 및 종료 날짜를 선택하여 할 일을 추가할 수 있음
 *  - 상태(준비 중, 진행 중, 완료)를 선택하여 할 일 관리 가능
 *  - 서버와 연동하여 할 일을 저장 (POST /schedule/add-schedule)
 *  - 일정 추가 후 캘린더 페이지로 이동
 *
 * ✅ UI(또는 Component) 구조:
 *  - AddSchedule (메인 페이지)
 *    ├── 사이드바
 *    ├── 날짜 입력 필드 (시작일, 종료일)
 *    ├── 일정 입력 필드
 *    ├── 상태 선택 드롭다운
 *    ├── 추가하기 버튼
 *    ├── 기존 일정 목록 표시
 *    ├── 돌아가기 버튼
 */

const API_URL = process.env.REACT_APP_API_URL;

const AddSchedule = () => {
  // ✅ 일정 관련 상태 관리
  const [startDate, setStartDate] = useState(""); // 시작 날짜
  const [endDate, setEndDate] = useState(""); // 종료 날짜
  const [newTask, setNewTask] = useState(""); // 새로운 할 일
  const [status, setStatus] = useState("준비 중"); // 상태 (준비 중, 진행 중, 완료)
  const [tasks, setTasks] = useState([]); // 추가된 일정 목록
  const [loading, setLoading] = useState(true); // 로딩 상태
  const [error, setError] = useState(""); // 오류 메시지

  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState({
    id: "",
    name: "",
    position: "",
    department: "",
    role_id: "",
  }); //로그인한 사용자 정보
  const { getUserInfo } = useAuth();

  // 로그인한 사용자 정보 가져오기 (api로 가져오기)
  useEffect(() => {
    const fetchUserInfo = async () => {
      const userInfo = await getUserInfo();
      setUser(userInfo);
      setLoading(false); // 로딩 완료
    };
    fetchUserInfo();
  }, []);

  // ✅ URL을 통해 전달된 선택된 날짜를 기본값으로 설정
  useEffect(() => {
    if (location.state && location.state.selectedDate) {
      const date = location.state.selectedDate;
      const formattedDate = formatDateForInput(date);
      setStartDate(formattedDate);
      setEndDate(formattedDate);
    }
  }, [location.state]);

  // ✅ 날짜 형식을 YYYY-MM-DD로 변환하는 함수
  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // ✅ 날짜 형식을 "YYYY년 MM월 DD일"로 변환하는 함수
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}년 ${month}월 ${day}일`;
  };

  // ✅ 날짜 형식을 변환하여 데이터베이스에 저장하기 전에 조정하는 함수
  const adjustDate = (dateString) => {
    const date = new Date(dateString);
    date.setDate(date.getDate()); // 데이터베이스에 저장하기 전에 하루를 뺍니다.
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // ✅ 시작 날짜 변경 시 종료 날짜가 앞서는 경우 자동 조정
  const handleStartDateChange = (e) => {
    const newStartDate = e.target.value;
    setStartDate(newStartDate);

    // 🚀 자동 조정: 시작 날짜가 종료 날짜보다 뒤라면 종료 날짜도 같이 변경
    if (endDate && new Date(newStartDate) > new Date(endDate)) {
      setEndDate(newStartDate);
    }
  };

  // ✅ 종료 날짜 변경 시 시작 날짜보다 앞서는 경우 자동 조정
  const handleEndDateChange = (e) => {
    const newEndDate = e.target.value;
    setEndDate(newEndDate);

    // 🚀 자동 조정: 종료 날짜가 시작 날짜보다 앞서면 시작 날짜도 같이 변경
    if (startDate && new Date(newEndDate) < new Date(startDate)) {
      setStartDate(newEndDate);
    }
  };

  // ✅ 할 일 추가 버튼 클릭 시 실행되는 함수
  const handleAddTask = async () => {
    if (newTask.trim() && startDate && endDate) {
      setLoading(true);
      setError("");

      // `localStorage`에서 `token` 정보를 가져옵니다.
      const token = localStorage.getItem("token");

      if (!token) {
        alert("로그인 상태가 아닙니다.");
        setLoading(false);
        return;
      }

      const task = {
        start: adjustDate(startDate),
        end: adjustDate(endDate),
        task: newTask,
        status,
        user_id: user.id, // 로그인된 사용자 ID
      };

      try {
        const response = await axios.post(
          `${API_URL}/schedule/add-schedule`,
          task,
          {
            headers: {
              Authorization: `Bearer ${token}`, // Authorization 헤더에 JWT 토큰 포함
            },
          }
        );

        if (response.status === 200) {
          const addedTask = response.data; // 서버에서 반환된 추가된 일정
          setTasks((prevTasks) => [...prevTasks, addedTask]);
          setNewTask("");
          setLoading(false);
          alert("할 일이 추가되었습니다!");
          navigate("/calendar");
        }
      } catch (err) {
        setError("할 일을 추가하는 데 실패했습니다.");
        setLoading(false);
        console.error("Error adding schedule:", err);
      }
    } else {
      alert("모든 필드를 채워주세요.");
    }
  };

  // ✅ 돌아가기 버튼 클릭 시 실행되는 함수
  const handleBack = () => {
    navigate("/calendar");
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="add-schedule-body">
      <Sidebar user={user} />
      <div className="add-schedule-page">
        <div className="add-schedule">
          <h1></h1>
          {/* ✅ 날짜 입력 필드 */}
          <div className="add-schedule__date-container">
            <div className="add-schedule__date-field">
              <label htmlFor="start-date" className="add-schedule__date-label">
                시작 날짜
              </label>
              <input
                type="date"
                id="start-date"
                value={startDate}
                onChange={handleStartDateChange}
                className="add-schedule__date-input"
              />
            </div>
            <div className="add-schedule__date-field">
              <label htmlFor="end-date" className="add-schedule__date-label">
                종료 날짜
              </label>
              <input
                type="date"
                id="end-date"
                value={endDate}
                onChange={handleEndDateChange}
                className="add-schedule__date-input"
              />
            </div>
          </div>
          {/* ✅ 일정 입력 필드 및 상태 선택 */}
          <div className="add-schedule__todo-container">
            <h2 className="add-schedule__todo-title">일정 입력</h2>
            <div className="add-schedule__todo-fields">
              <input
                type="text"
                id="new-task"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="새로운 할 일을 입력하세요"
                className="add-schedule__todo-input"
              />
              <div className="add-schedule__status-container">
                <label
                  htmlFor="status"
                  className="add-schedule__status-label"
                ></label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="add-schedule__select"
                >
                  <option value="준비 중">준비 중</option>
                  <option value="진행 중">진행 중</option>
                  <option value="완료">완료</option>
                </select>
              </div>
            </div>
            {/* ✅ 추가 및 뒤로가기 버튼 */}
            <div className="add-schedule__button-container">
              <button onClick={handleAddTask} className="add-schedule__button">
                {loading ? "로딩 중..." : "추가하기"}
              </button>
              <button
                onClick={handleBack}
                className="add-schedule__button add-schedule__button--back"
              >
                돌아가기
              </button>
            </div>

            {error && (
              <div className="add-schedule__error-message">{error}</div>
            )}
          </div>
          {/* ✅ 기존 일정 목록 표시 */}
          <div className="add-schedule__todo-list">
            <ul>
              {tasks.map((task, index) => (
                <li key={index} className="add-schedule__todo-item">
                  <strong>
                    {formatDate(task.start)} ~ {formatDate(task.end)}:
                  </strong>{" "}
                  {task.task} <em>({task.status})</em>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddSchedule;
