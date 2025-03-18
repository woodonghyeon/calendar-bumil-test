import React, { useState, useEffect } from "react";
import Sidebar from "../Sidebar";
import "./Manager.css";
import BackButton from "../components/BackButton";

const Manager = () => {
  const [pendingUsers, setPendingUsers] = useState([]);

  useEffect(() => {
    const fetchPendingUsers = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/user/get_pending_users`
        );
        if (response.ok) {
          const data = await response.json();
          setPendingUsers(data.users);
        } else {
          alert("승인 대기 중인 사용자 목록을 불러오는 데 실패했습니다.");
        }
      } catch (error) {
        console.error("Error fetching pending users:", error);
        alert("승인 대기 중인 사용자 목록을 불러오는 중 오류가 발생했습니다.");
      }
    };

    fetchPendingUsers();
  }, []);

  const handleApprove = async (userId) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/user/approve_user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId }),
        }
      );

      if (response.ok) {
        setPendingUsers(pendingUsers.filter((user) => user.id !== userId));
        alert("사용자가 승인되었습니다.");
      } else {
        alert("사용자 승인에 실패했습니다.");
      }
    } catch (error) {
      console.error("Error approving user:", error);
      alert("사용자 승인 중 오류가 발생했습니다.");
    }
  };

  const handleReject = async (userId) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/user/reject_user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId }),
        }
      );

      if (response.ok) {
        setPendingUsers(pendingUsers.filter((user) => user.id !== userId));
        alert("사용자가 거절되었습니다.");
      } else {
        alert("사용자 거절에 실패했습니다.");
      }
    } catch (error) {
      console.error("Error rejecting user:", error);
      alert("사용자 거절 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="manager-page">
      <header className="manager-header">
        <Sidebar />
      </header>
      <div className="manager-content">
        <BackButton />
        <h1 className="manager-title">회원가입 승인 관리</h1>
        <section className="pending-users-section">
          {pendingUsers.map((user) => (
            <div key={user.id} className="user-table-container">
              <table className="pending-users-table">
                <tbody>
                  <tr><td>ID</td><td>{user.id}</td></tr>
                  <tr><td>이름</td><td>{user.name}</td></tr>
                  <tr><td>직급</td><td>{user.position}</td></tr>
                  <tr><td>부서</td><td className="department-cell">{user.department}</td></tr>
                  <tr><td>이메일</td><td>{user.email}</td></tr>
                  <tr><td>전화번호</td><td>{user.phone_number}</td></tr>
                </tbody>
              </table>
              <div className="user-actions">
                <button className="button approve-button" onClick={() => handleApprove(user.id)}>승인</button>
                <button className="button reject-button" onClick={() => handleReject(user.id)}>거절</button>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

export default Manager;
