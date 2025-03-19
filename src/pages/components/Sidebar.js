import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiMenu } from "react-icons/fi";
import {
  FaCalendarAlt,
  FaClipboardList,
  FaUsers,
  FaUser,
  FaProjectDiagram,
  FaTools,
  FaUserShield,
  FaSignOutAlt,
} from "react-icons/fa";
import "./Sidebar.css";

import "../../utils/useAuth";
import { useAuth } from "../../utils/useAuth";

const Sidebar = ({
  user = { id: "", name: "", position: "", department: "", role_id: "" },
}) => {
  const [isOpen, setIsOpen] = useState(window.innerWidth > 1024);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isTablet, setIsTablet] = useState(
    window.innerWidth > 768 && window.innerWidth <= 1024
  );
  const navigate = useNavigate();

  useEffect(() => {
    // 화면 크기 변경 감지
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setIsOpen(true);
        setIsMobile(false);
        setIsTablet(false);
      } else if (window.innerWidth > 768) {
        setIsOpen(false);
        setIsMobile(false);
        setIsTablet(true);
      } else {
        setIsOpen(false);
        setIsMobile(true);
        setIsTablet(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => {
    if (isMobile) setIsOpen(false);
  };

  const handleManagerClick = (e) => {
    e.preventDefault();
    if (user?.role_id === "AD_ADMIN") {
      navigate("/manager");
    } else {
      alert("관리자만 접근 가능한 페이지입니다.");
    }
  };

  const { handleLogout } = useAuth();

  const handleMyInfoClick = (e) => {
    e.preventDefault();
    navigate(`/user-details?user_id=${user?.id}`, { replace: true });
    closeSidebar();
  };

  return (
    <div className={`app-body ${isOpen ? "sidebar-open" : ""}`}>
      {/* 모바일 & 태블릿에서 햄버거 버튼 보이기 */}
      {isMobile && (
        <button className="hamburger-btn" onClick={toggleSidebar}>
          <FiMenu size={28} color="#333" />
        </button>
      )}

      {/* 오버레이 (모바일에서만 적용) */}
      {isMobile && isOpen && (
        <div className="overlay" onClick={closeSidebar}></div>
      )}

      {/* 사이드바 */}
      <div
        className={`sidebar ${isOpen ? "open" : isTablet ? "collapsed" : ""}`}
      >
        <ul className="menu">
          <li>
            <Link to="/calendar">
              <FaCalendarAlt className="menu-icon" /> {!isTablet && "달력"}
            </Link>
          </li>
          <li>
            <Link to="/notice-list">
              <FaClipboardList className="menu-icon" />{" "}
              {!isTablet && "공지사항"}
            </Link>
          </li>
          <li>
            <Link to="/projects">
              <FaProjectDiagram className="menu-icon" />{" "}
              {!isTablet && "프로젝트"}
            </Link>
          </li>
          <li>
            <Link to="/employee">
              <FaUsers className="menu-icon" /> {!isTablet && "직원"}
            </Link>
          </li>
          <li>
            <a href="#" onClick={handleMyInfoClick}>
              <FaUser className="menu-icon" /> {!isTablet && "내 정보"}
            </a>
          </li>
          <li>
            <Link to="/situation_control">
              <FaTools className="menu-icon" /> {!isTablet && "현황 관리"}
            </Link>
          </li>
          {user?.role_id === "AD_ADMIN" && (
            <li>
              <a href="#" onClick={handleManagerClick}>
                <FaUserShield className="menu-icon" /> {!isTablet && "관리자"}
              </a>
            </li>
          )}
        </ul>

        {/* 로그아웃 버튼 */}
        <div className="logout-section">
          <Link to="/" onClick={handleLogout} className="logout-link">
            <FaSignOutAlt className="menu-icon" /> {!isTablet && "로그아웃"}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
