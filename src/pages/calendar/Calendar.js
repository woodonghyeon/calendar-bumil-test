import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../../utils/useAuth";
import { FaEdit, FaTrash } from "react-icons/fa";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import { followCursor } from "tippy.js";
import "./Calendar.css";

const Calendar = () => {
  const [loading, setLoading] = useState(true); // 데이터 로딩 상태 관리 (true: 로딩 중)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [userSchedule, setUserSchedule] = useState([]);
  const [otherUsersSchedule, setOtherUsersSchedule] = useState([]);
  const [userStatus, setUserStatus] = useState("");
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [users, setUsers] = useState([]); // 직원 목록
  const [statusList, setStatusList] = useState([]); // 상태 목록 (백엔드 CRUD 결과)
  const navigate = useNavigate();
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

        // 2. 오늘 날짜 설정
        const today = new Date();
        setSelectedDate(today);
        setUserStatus(userInfo?.status); // user.status 대신 userInfo.status 사용

        // 3. 모든 데이터 병렬로 가져오기
        await Promise.all([
          fetchUsers(),
          fetchStatusList(),
          fetchUserSchedule(userInfo?.id),
        ]);
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

  // 부서 및 사용자 정보 가져오는 함수
  const fetchUsers = async () => {
    try {
      const usersResponse = await fetch(
        `${process.env.REACT_APP_API_URL}/user/get_users`
      );
      if (!usersResponse.ok)
        throw new Error("직원 목록을 불러오지 못했습니다.");
      const usersData = await usersResponse.json();
      setUsers(usersData.users);

      const uniqueDepartments = [
        ...new Set(
          usersData.users.map((user) =>
            user.team_name
              ? `${user.department_name} - ${user.team_name}`
              : user.department_name
          )
        ),
      ]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "ko-KR"));
      // console.log(usersData.users);
      setDepartments(uniqueDepartments);
      // console.log(uniqueDepartments);
    } catch (error) {
      console.error("데이터 로딩 오류:", error);
    }
  };

  // 로그인한 사용자의 상태 가져오기
  const fetchStatusList = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/status/get_status_list`
      );
      if (!response.ok) throw new Error("상태 목록을 불러오지 못했습니다.");
      const data = await response.json();
      setStatusList(data.statuses); // 예: [{ id: "파견", comment: "파견" }, ...]
    } catch (error) {
      console.error("상태 목록 로딩 오류:", error);
    }
  };

  // 로그인한 사용자의 일정 가져오기
  const fetchUserSchedule = async (userId = user.id) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/schedule/get_all_schedule`
      );
      if (!response.ok) throw new Error("전체 일정을 불러오지 못했습니다.");
      const data = await response.json();

      const filteredUsersSchedule = data.schedules.filter(
        (schedule) => schedule.user_id === userId
      );
      setUserSchedule(filteredUsersSchedule);

      // 내 일정을 제외한 다른 사용자의 일정을 필터링
      const filteredOtherUsersSchedule = data.schedules.filter(
        (schedule) => schedule.user_id !== userId
      );

      // 다른 유저들의 일정 상태 업데이트
      setOtherUsersSchedule(filteredOtherUsersSchedule);
    } catch (error) {
      console.error("전체 일정 로딩 오류:", error);
    }
  };

  const monthNames = [
    "1월",
    "2월",
    "3월",
    "4월",
    "5월",
    "6월",
    "7월",
    "8월",
    "9월",
    "10월",
    "11월",
    "12월",
  ];
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1));
  };

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const handleDateClick = async (day) => {
    if (day) {
      const selectedDate = new Date(currentYear, currentMonth, day);
      setSelectedDate(selectedDate);
      // 선택한 날짜를 한국 시간대로 변환
      const offset = 9 * 60; // 한국 시간 (KST)은 UTC보다 9시간 빠릅니다.
      selectedDate.setMinutes(
        selectedDate.getMinutes() + selectedDate.getTimezoneOffset() + offset
      );
      // 한국 시간대로 날짜 문자열을 생성
      const selectedDateString = `${selectedDate.getFullYear()}-${(
        selectedDate.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}-${selectedDate
        .getDate()
        .toString()
        .padStart(2, "0")}`;
    }
    fetchUserSchedule();
  };

  const handleScheduleClick = (schedule) => {
    //console.log("선택된 일정:", schedule);
    // 여기에 일정 클릭 시 수행할 동작을 추가
  };

  // 일정 수정
  const handleEditSchedule = (schedule) => {
    navigate(`/edit-schedule/${schedule.id}`, { state: { schedule } });
  };

  // 일정 삭제
  const handleDeleteSchedule = async (scheduleId) => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("❌ 인증 토큰이 없습니다. 다시 로그인해주세요.");
      return;
    }

    const isConfirmed = window.confirm("정말 삭제하시겠습니까?");
    if (!isConfirmed) return;

    //console.log("🔹 삭제 요청 전송:", scheduleId);
    //console.log("🔹 Authorization 헤더:", `Bearer ${token}`);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/schedule/delete-schedule/${scheduleId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      //console.log("🔹 삭제 응답:", response.status, data);

      if (response.ok) {
        alert("✅ 일정이 삭제되었습니다.");
        handleDateClick(selectedDate.getDate());
      } else {
        alert(`⚠️ 삭제 실패: ${data.message}`);
      }
    } catch (error) {
      console.error("❌ 일정 삭제 오류:", error);
      alert("❌ 일정 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleAddScheduleClick = () => {
    navigate("/add-schedule", { state: { selectedDate } });
  };

  // 로그인된 사용자 상태 변경
  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setUserStatus(newStatus);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/status/update_status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (response.status === 401) {
        handleLogout();
        return;
      }
      if (response.ok) {
        alert("상태가 변경되었습니다.");
      } else {
        alert("상태 변경에 실패했습니다.");
      }
    } catch (error) {
      console.error("상태 변경 오류:", error);
      alert("상태 변경에 실패했습니다.");
    }
  };

  const handleLogout = () => {
    alert("세션이 만료되었습니다. 다시 로그인해주세요.");
    localStorage.removeItem("token");
    navigate("/");
  };

  // 오늘 날짜와 비교하여 색을 구분하기 위한 함수
  const isToday = (day) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  // 선택된 날짜가 오늘과 같은지 확인
  const isSelected = (day) => {
    if (!selectedDate) return false;
    return (
      day === selectedDate.getDate() &&
      currentMonth === selectedDate.getMonth() &&
      currentYear === selectedDate.getFullYear()
    );
  };

  // 상태에 맞는 색상 클래스를 반환하는 함수
  const getStatusClass = (status) => {
    switch (status) {
      case "준비 중":
        return "red"; // 빨간색
      case "진행 중":
        return "green"; // 초록색
      case "완료":
        return "lightblue"; // 스카이 블루
      default:
        return ""; // 기본값
    }
  };

  if (loading) return <div className="userdetail-container">로딩 중...</div>;

  return (
    <div>
      <Sidebar user={user} />
      <div className="calendar-parent">
        <div className="calendar">
          {/* 사용자 상태 변경 UI */}
          <div className="user-status">
            <div className="user-info">
              <span>
                {user.name} ({user.position})
              </span>
            </div>
            <div className="status-container">
              <label htmlFor="status">상태 변경:</label>
              <select
                id="status"
                value={userStatus || ""}
                onChange={handleStatusChange}
              >
                {statusList.map((status) => (
                  <option
                    key={`${status.id}-${status.comment}`}
                    value={status.id}
                  >
                    {status.comment}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="calendar-navigation">
            <button onClick={handlePrevMonth} className="nav-button">
              {<IoIosArrowBack />}
            </button>
            <h2 className="calendar-title">
              {currentYear}년 {monthNames[currentMonth]}
            </h2>
            <button onClick={handleNextMonth} className="nav-button">
              {<IoIosArrowForward />}
            </button>
          </div>
          <div className="calendar-days-header">
            {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
              <div key={day} className="day-header">
                {day}
              </div>
            ))}
          </div>
          <div className="calendar-days">
            {calendarDays.map((day, index) => {
              const key = day
                ? `${currentYear}-${currentMonth}-${day}`
                : `empty-${index}`;

              // 일정이 있는 날짜인지 확인
              const hasMySchedule =
                day &&
                userSchedule.some((schedule) => {
                  const startDate = new Date(schedule.start_date);
                  const endDate = new Date(schedule.end_date);
                  const currentDate = new Date(
                    Date.UTC(currentYear, currentMonth, day)
                  );

                  // 시간 차이로 인한 오류 방지
                  startDate.setUTCHours(0, 0, 0, 0);
                  endDate.setUTCHours(0, 0, 0, 0);
                  currentDate.setUTCHours(0, 0, 0, 0);
                  return currentDate >= startDate && currentDate <= endDate;
                });
              const hasOtherSchedule =
                day &&
                otherUsersSchedule.some((schedule) => {
                  const startDate = new Date(schedule.start_date);
                  const endDate = new Date(schedule.end_date);
                  const currentDate = new Date(
                    Date.UTC(currentYear, currentMonth, day)
                  );

                  // 시간 차이로 인한 오류 방지
                  startDate.setUTCHours(0, 0, 0, 0);
                  endDate.setUTCHours(0, 0, 0, 0);
                  currentDate.setUTCHours(0, 0, 0, 0);
                  return currentDate >= startDate && currentDate <= endDate;
                });

              return (
                <div
                  key={key}
                  className={`calendar-day ${day ? "active" : ""} 
          ${isToday(day) ? "today" : ""} 
          ${isSelected(day) ? "selected" : ""} 
          `}
                  onClick={() => handleDateClick(day)}
                >
                  {hasMySchedule && <div className="day-has-schedule"></div>}
                  {hasOtherSchedule && (
                    <div className="day-has-other-schedule"></div>
                  )}
                  <span className="day-number">{day}</span>
                </div>
              );
            })}
          </div>
          <div className="color-check">
            <div className="blue-tag"></div>
            <span className="blue-text">내 일정</span>
          </div>
          <div className="red-tag"></div>
          <span className="red-text">전체 일정</span>

          {selectedDate && (
            <div className="schedule-area">
              <div className="selected-date-info">
                <h3>{selectedDate.toLocaleDateString()}</h3>
              </div>

              <div className="add-schedule-container">
                <button
                  className="button add-schedule-button"
                  onClick={handleAddScheduleClick}
                >
                  일정 추가
                </button>
              </div>

              <div className="schedule-section">
                <h4>내 일정</h4>
                <ul className="schedule-list">
                  {(() => {
                    if (!selectedDate) {
                      return (
                        <li className="empty-schedule">날짜를 선택해주세요.</li>
                      );
                    }
                    const filtered = userSchedule
                      .filter((schedule) => {
                        const startDate = new Date(schedule.start_date);
                        const endDate = new Date(schedule.end_date);
                        const selected = new Date(selectedDate);

                        // 년, 월, 일만 비교하기 위해 시간을 00:00:00으로 설정
                        startDate.setHours(0, 0, 0, 0);
                        endDate.setHours(0, 0, 0, 0);
                        selected.setHours(0, 0, 0, 0);

                        // 년, 월, 일만 비교
                        return selected >= startDate && selected <= endDate;
                      })
                      .sort(
                        (a, b) =>
                          new Date(a.start_date) - new Date(b.start_date)
                      );

                    if (filtered.length === 0) {
                      return (
                        <li className="empty-schedule">
                          선택한 날짜에 해당하는 일정이 없습니다.
                        </li>
                      );
                    }
                    return filtered.map((schedule) => {
                      return (
                        <li
                          key={schedule.id}
                          className="schedule-item has-buttons"
                          onClick={() => handleScheduleClick(schedule)}
                        >
                          <div className="schedule-content">
                            <span
                              className="status-icon"
                              style={{
                                backgroundColor: getStatusClass(
                                  schedule.status
                                ),
                              }}
                            ></span>
                            <Tippy
                              content={schedule.task}
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
                              <span className="task-name">{schedule.task}</span>
                            </Tippy>
                          </div>
                          <div className="button-group">
                            <button
                              className="edit-button icon-button"
                              onClick={() => handleEditSchedule(schedule)}
                              title="수정"
                            >
                              <FaEdit />
                            </button>
                            <button
                              className="delete-button icon-button"
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              title="삭제"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </li>
                      );
                    });
                  })()}
                </ul>
              </div>

              <div className="schedule-section">
                <div className="schedule-section-inner">
                  <h4 style={{ margin: 0 }}>전체 일정</h4>
                  <select
                    className="department-view-dropdown"
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                  >
                    <option value="">전체 부서</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
                <ul className="schedule-list">
                  {(() => {
                    if (!selectedDate) {
                      return (
                        <li className="empty-schedule">날짜를 선택해주세요.</li>
                      );
                    }

                    const departmentUserIds = users
                      .filter(
                        (user) =>
                          selectedDepartment === "" ||
                          (user.team_name
                            ? `${user.department_name} - ${user.team_name}`
                            : user.department_name) === selectedDepartment
                      )
                      .map((user) => user.id);

                    const filtered = otherUsersSchedule
                      .filter((schedule) => {
                        const startDate = new Date(schedule.start_date);
                        const endDate = new Date(schedule.end_date);
                        const selected = new Date(selectedDate);

                        startDate.setHours(0, 0, 0, 0);
                        endDate.setHours(0, 0, 0, 0);
                        selected.setHours(0, 0, 0, 0);

                        return (
                          departmentUserIds.includes(schedule.user_id) &&
                          selected >= startDate &&
                          selected <= endDate
                        );
                      })
                      .sort(
                        (a, b) =>
                          new Date(a.start_date) - new Date(b.start_date)
                      );

                    if (filtered.length === 0) {
                      return (
                        <li className="empty-schedule">
                          선택한 날짜에 해당하는 일정이 없습니다.
                        </li>
                      );
                    }

                    return filtered.map((schedule) => {
                      const scheduleUser = users.find(
                        (u) => u.id === schedule.user_id
                      );
                      const userName = scheduleUser
                        ? scheduleUser.name
                        : "알 수 없음";

                      return (
                        <li
                          key={schedule.id}
                          className={`schedule-item other-user-schedule ${
                            user.role_id === "AD_ADMIN"
                              ? "has-buttons"
                              : "no-buttons"
                          }`}
                          onClick={() => handleScheduleClick(schedule)}
                        >
                          <div className="schedule-content">
                            <span
                              className={`status-icon ${getStatusClass(
                                schedule.status
                              )}`}
                            ></span>
                            <Tippy
                              content={`${userName} - ${schedule.task}`}
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
                              <span className="task-name">{schedule.task}</span>
                            </Tippy>
                            <span className="schedule-user-name">
                              {userName}
                            </span>
                          </div>
                          <div className="button-group">
                            {user.role_id === "AD_ADMIN" && (
                              <button
                                className="delete-button icon-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSchedule(schedule.id);
                                }}
                                title="삭제"
                              >
                                <FaTrash />
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    });
                  })()}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Calendar;
