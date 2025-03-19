import React, { useState } from "react";
import "./SignupPage.css";

const SignupPage = () => {
  const [formData, setFormData] = useState({
    id: "",
    password: "",
    username: "",
    position: "",
    department: "",
    phone: "",
  });

  const [signupStatus, setSignupStatus] = useState("");
  const [errors, setErrors] = useState({});

  const departments = [
    "전략사업본부 국정자원지원부 운영지원팀",
    "전략사업본부 국정자원지원부 자원구축팀",
    "전략사업본부 SI사업부 유지보수팀",
    "전략사업본부 SI사업부 구축팀",
    "전략사업본부 개발사업부 지자체팀",
    "전략사업본부 개발사업부 신용보증팀",
    "전략사업본부 개발사업부 KERIS팀",
    "전략사업본부 사업지원팀",
  ];
  const positions = [
    "대표이사",
    "부사장",
    "전무",
    "본부장",
    "이사",
    "상무",
    "팀장",
    "부장",
    "과장",
    "차장",
    "대리",
    "주임",
    "사원",
  ];

  // 전화번호 입력 시 자동으로 '-' 추가
  const formatPhoneNumber = (value) => {
    // 숫자만 남기기
    const onlyNumbers = value.replace(/\D/g, "");

    if (onlyNumbers.length <= 3) {
      return onlyNumbers;
    } else if (onlyNumbers.length <= 7) {
      return `${onlyNumbers.slice(0, 3)}-${onlyNumbers.slice(3)}`;
    } else {
      return `${onlyNumbers.slice(0, 3)}-${onlyNumbers.slice(
        3,
        7
      )}-${onlyNumbers.slice(7, 11)}`;
    }
  };

  const validateForm = () => {
    let newErrors = {};
    const idRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^010-\d{4}-\d{4}$/; // 010-xxxx-xxxx 형식
    const passwordRegex =
      /^(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!idRegex.test(formData.id)) {
      newErrors.id = "올바른 이메일 형식이 아닙니다.";
    }

    if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = "전화번호 형식은 010-1234-5678 입니다.";
    }

    if (!passwordRegex.test(formData.password)) {
      newErrors.password =
        "비밀번호는 최소 8자리, 숫자 1개, 특수문자 1개 포함해야 합니다.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "phone") {
      setFormData({ ...formData, phone: formatPhoneNumber(value) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const response = await authFetch(
        `${process.env.REACT_APP_API_URL}/auth/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setSignupStatus("회원가입이 완료되었습니다!");
        alert("회원가입 성공!");
        window.history.back();
      } else {
        setSignupStatus(data.message);
      }
    } catch (error) {
      console.error("Signup error:", error);
      setSignupStatus("오류로 인해 회원가입에 실패했습니다.");
    }
  };

  return (
    <div className="signup-body">
      <div className="signup-container">
        <h2>회원가입</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group-signup">
            <label htmlFor="id">이메일 (아이디)</label>
            <input
              type="id"
              id="id"
              name="id"
              onChange={handleChange}
              required
            />
            {errors.id && <div className="error">{errors.id}</div>}
          </div>
          <div className="form-group-signup">
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              name="password"
              onChange={handleChange}
              required
            />
            {errors.password && <div className="error">{errors.password}</div>}
          </div>
          <div className="form-group-signup">
            <label htmlFor="username">이름</label>
            <input
              type="text"
              id="username"
              name="username"
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group-signup">
            <label htmlFor="department">부서</label>
            <select
              id="department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              required
            >
              <option value="">부서를 선택하세요</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group-signup">
            <label htmlFor="position">직급</label>
            <select
              id="position"
              name="position"
              value={formData.position}
              onChange={handleChange}
              required
            >
              <option value="">직급을 선택하세요</option>
              {positions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group-signup">
            <label htmlFor="phone">전화번호</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
            />
            {errors.phone && <div className="error">{errors.phone}</div>}
          </div>
          <div className="signup-button-container">
            <button type="submit" className="signup-button">
              회원가입
            </button>
            <button
              type="button"
              className="cancle-button"
              onClick={() => window.history.back()}
            >
              돌아가기
            </button>
          </div>
        </form>
        {signupStatus && <div className="message">{signupStatus}</div>}
      </div>
    </div>
  );
};

export default SignupPage;
