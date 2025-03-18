import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Unauthorized = () => {
  const navigate = useNavigate();

  useEffect(() => {
    alert("관리자만 접근 가능합니다.");
    navigate("/", { replace: true });
  }, [navigate]);

  return (
    <div>
      <h1>권한이 없습니다.</h1>
      <p>관리자 계정으로 로그인해주세요.</p>
    </div>
  );
};

export default Unauthorized;
