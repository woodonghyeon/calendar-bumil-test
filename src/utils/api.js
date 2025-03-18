import { navigate } from "gatsby";

export const fetchLoggedInUser = async (apiUrl, handleLogout, setLoading) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${apiUrl}/auth/get_logged_in_user`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (response.status === 401) {
        handleLogout();
        return null;
      }
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("user", JSON.stringify(data.user));
        if (setLoading) setLoading(false);
        return data.user;
      } else {
        console.error("사용자 정보 불러오기 실패");
        return null;
      }
    } catch (error) {
      console.error("로그인 사용자 정보 불러오기 실패:", error);
      return null;
    }
  };

export const handleLogout = () => {
  alert("세션이 만료되었습니다. 다시 로그인해주세요.");
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  navigate("/");
};

