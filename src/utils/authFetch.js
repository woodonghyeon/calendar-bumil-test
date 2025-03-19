// authFetch로 API 요청을 보내면, access token이 만료되었을 때 자동으로 갱신하고 다시 요청을 보내는 함수
export const authFetch = async (url, options = {}) => {
  const accessToken = localStorage.getItem("access_token");
  const refreshToken = localStorage.getItem("refresh_token");

  let response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
      "X-Refresh-Token": refreshToken,
    },
  });

  if (response.status === 401) {
    const newAccessToken = await refreshAccessTokenFunc();
    if (newAccessToken) {
      response = await fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${newAccessToken}`,
          "X-Refresh-Token": refreshToken,
        },
      });
    } else {
      logoutFunc();
    }
  }

  return response;
};

// useAuth.js(React Hook 이라서.)에서 사용하는 함수 분리함
export const refreshAccessTokenFunc = async () => {
  const apiUrl = process.env.REACT_APP_API_URL;
  const refreshToken = localStorage.getItem("refresh_token");
  const accessToken = localStorage.getItem("access_token");
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${apiUrl}/auth/refresh_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "Token-Refresh": refreshToken,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) throw new Error("Refresh token expired");

    const data = await response.json();
    localStorage.setItem("access_token", data.access_token);
    return data.access_token;
  } catch (error) {
    console.error("Access token 갱신 실패:", error);
    return null;
  }
};

export const logoutFunc = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.location.href = "/"; // 강제 로그아웃
};
