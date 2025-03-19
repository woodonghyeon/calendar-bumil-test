import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { refreshAccessTokenFunc, logoutFunc } from "./authFetch";

export const useAuth = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const apiUrl = process.env.REACT_APP_API_URL;

  const handleLogout = useCallback(() => {
    logoutFunc();
  }, []);

  const getUserInfo = useCallback(async () => {
    setLoading(true);
    try {
      const accessToken = localStorage.getItem("access_token");
      const response = await fetch(`${apiUrl}/auth/get_logged_in_user`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Refresh-Token": localStorage.getItem("refresh_token"),
        },
      });

      if (!response.ok)
        throw new Error("사용자 정보를 가져오는데 실패했습니다.");

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error("사용자 정보 조회 실패:", error);
      logoutFunc();
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const checkAuth = useCallback((userRole, requiredRoles) => {
    if (!userRole || !requiredRoles.includes(userRole)) {
      alert("접근 권한이 없습니다.");
      logoutFunc();
      return false;
    }
    return true;
  }, []);

  return {
    loading,
    error,
    handleLogout,
    getUserInfo,
    checkAuth,
  };
};
