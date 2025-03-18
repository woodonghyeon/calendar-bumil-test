import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const apiUrl = process.env.REACT_APP_API_URL;

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    navigate("/");
  }, [navigate]);

  const getUserInfo = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${apiUrl}/auth/get_logged_in_user`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("세션이 만료되었습니다.");
        }
        throw new Error("사용자 정보를 가져오는데 실패했습니다.");
      }

      const data = await response.json();
      return data.user;

    } catch (error) {
      console.error("사용자 정보 조회 실패:", error);
      handleLogout();
      return null;
    }
  }, [apiUrl, handleLogout]);

  const checkAuth = useCallback((userRole, requiredRoles) => {
    try {
      if (!userRole) {
        throw new Error("사용자 정보가 없습니다.");
      }

      if (Array.isArray(requiredRoles) && !requiredRoles.includes(userRole)) {
        throw new Error("접근 권한이 없습니다.");
      }

      return true;

    } catch (error) {
      setError(error.message);
      alert(error.message);
      handleLogout();
      return false;
    }
  }, [handleLogout]);

  return { loading, error, handleLogout, getUserInfo, checkAuth };
};