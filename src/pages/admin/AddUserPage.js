import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import "./AddUserPage.css"; // 스타일 파일 추가
import { useAuth } from "../../utils/useAuth";
import { authFetch } from "../../utils/authFetch";

const AddUserPage = () => {
  const [formData, setFormData] = useState({
    id: "",
    username: "",
    position: "",
    department: "",
    phone: "",
    role_id: "USR_GENERAL",
    password: "", // 패스워드는 자동 생성
  });

  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [signupStatus, setSignupStatus] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState(""); // ✅ 초기 비밀번호 표시용

  const apiUrl = process.env.REACT_APP_API_URL;
  const accessToken = localStorage.getItem("access_token");
  const refreshToken = localStorage.getItem("refresh_token");

  const [loading, setLoading] = useState(true); // 데이터 로딩 상태 관리 (true: 로딩 중)
  const [user, setUser] = useState({
    id: "",
    name: "",
    position: "",
    department: "",
    role_id: "",
  }); //로그인한 사용자 정보
  const { getUserInfo, checkAuth, handleLogout } = useAuth();

  // 로그인한 사용자 정보 가져오기 및 권한 확인 후 권한 없으면 로그아웃 시키기
  useEffect(() => {
    const fetchUserInfo = async () => {
      const userInfo = await getUserInfo();
      setUser(userInfo);

      const isAuthorized = checkAuth(userInfo?.role_id, ["AD_ADMIN"]); // 권한 확인하고 맞으면 true, 아니면 false 반환
      if (!isAuthorized) {
        console.error("관리자 권한이 없습니다.");
        handleLogout();
        return;
      }
      setLoading(false); // 로딩 완료
    };
    fetchUserInfo();
  }, []);

  // 전화번호 입력 시 자동으로 '-' 추가
  const formatPhoneNumber = (value) => {
    const onlyNumbers = value.replace(/\D/g, ""); // 숫자만 남기기

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

  // 비밀번호 자동 생성 (bumil + 전화번호 뒷자리 4개 + "!")
  const generatePassword = (phone) => {
    const onlyNumbers = phone.replace(/\D/g, ""); // 숫자만 남기기
    const lastFourDigits = onlyNumbers.slice(-4); // 뒤에서 4자리 추출
    return `bumil${lastFourDigits}!`;
  };

  useEffect(() => {
    // API 호출
    const fetchData = async () => {
      try {
        const deptRes = await authFetch(
          `${apiUrl}/department/get_department_list`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
              "X-Refresh-Token": refreshToken,
            },
          }
        );
        // 직급 관련 주석 처리(tb_user에 존재하지 않는 직급은 표시되지 않는 문제가 있음)
        // const posRes = await fetch(
        //   `${process.env.REACT_APP_API_URL}/admin/get_position_list`
        // );
        const roleRes = await authFetch(`${apiUrl}/admin/get_role_list`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "X-Refresh-Token": refreshToken,
          },
        });

        if (!deptRes.ok) throw new Error("부서 목록을 가져오지 못했습니다.");

        const deptData = await deptRes.json();
        // const posData = await posRes.json();
        const roleData = await roleRes.json();

        //console.log("부서 데이터:", deptData);
        // console.log("직급 데이터:", posData);
        //console.log("권한 데이터:", roleData);

        if (deptData.departments && Array.isArray(deptData.departments)) {
          setDepartments(deptData.departments);
        } else {
          setDepartments([]);
        }

        // setPositions(Array.isArray(posData) ? posData : []);
        setRoles(Array.isArray(roleData) ? roleData : []);
      } catch (error) {
        console.error("데이터 불러오기 오류:", error);
      }
    };

    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // 전화번호 필드일 경우 자동 포맷 적용 및 비밀번호 자동 생성
    if (name === "phone") {
      const formattedPhone = formatPhoneNumber(value);
      const newPassword = generatePassword(formattedPhone); // ✅ 초기 비밀번호 생성
      setFormData({
        ...formData,
        phone: formattedPhone,
        password: newPassword, // ✅ 전화번호 변경 시 비밀번호 자동 설정
      });
      setGeneratedPassword(newPassword); // ✅ UI에 표시할 비밀번호 업데이트
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await authFetch(`${apiUrl}/admin/add_user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Refresh-Token": refreshToken,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert("✅ 유저 추가 성공!");
        setSignupStatus("유저 추가 완료!");
        setFormData({
          id: "",
          username: "",
          position: "",
          department: "",
          phone: "",
          role_id: "USR_GENERAL",
          password: "", // 초기화
        });
        setGeneratedPassword(""); // 초기 비밀번호도 초기화
      } else {
        alert(`⚠️ 유저 추가 실패: ${data.message}`);
        setSignupStatus(data.message);
      }
    } catch (error) {
      console.error("유저 추가 오류:", error);
      alert("❌ 유저 추가 중 오류가 발생했습니다.");
      setSignupStatus("유저 추가 실패.");
    }
  };

  const positionOrder = [
    "어드민",
    "대표이사",
    "부사장",
    "본부장",
    "상무",
    "이사",
    "팀장",
    "부장",
    "차장",
    "과장",
    "대리",
    "주임",
  ];

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="user-add-body">
      <Sidebar user={user} />
      <div className="user-add-container">
        <h2>신규 사원 추가</h2>
        <form onSubmit={handleSubmit}>
          <div className="user-add-form-group">
            <label>이메일 (아이디)</label>
            <input
              type="email"
              name="id"
              value={formData.id}
              onChange={handleChange}
              required
            />
          </div>
          <div className="user-add-form-group">
            <label>이름</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          <div className="user-add-form-group">
            <label>부서</label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              required
            >
              <option value="">부서를 선택하세요</option>
              {departments.map((dept, index) => (
                <option key={index} value={dept.dpr_id}>
                  {dept.team_nm
                    ? `${dept.dpr_nm} - ${dept.team_nm}`
                    : dept.dpr_nm}
                </option>
              ))}
            </select>
          </div>
          <div className="user-add-form-group">
            <label>직급</label>
            <select
              name="position"
              value={formData.position}
              onChange={handleChange}
              required
            >
              <option value="">직급을 선택하세요</option>
              {positionOrder.map((pos, index) => (
                <option key={index} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </div>
          <div className="user-add-form-group">
            <label>전화번호</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>
          {/* ✅ 초기 비밀번호 안내 메시지 추가 */}
          {generatedPassword && (
            <p className="user-add-password-hint">
              초기 비밀번호: <strong>{generatedPassword}</strong>
            </p>
          )}
          <div className="user-add-form-group">
            <label>권한</label>
            <select
              name="role_id"
              value={formData.role_id}
              onChange={handleChange}
            >
              <option value="">권한을 선택하세요</option>
              {roles.map((role, index) => (
                <option key={index} value={role.id}>
                  {role.comment} ({role.id})
                </option>
              ))}
            </select>
          </div>

          <div className="user-add-button-container">
            <button type="submit" className="user-add-submit-button">
              추가하기
            </button>
            <button
              type="button"
              className="user-add-cancel-button"
              onClick={() => window.history.back()}
            >
              돌아가기
            </button>
          </div>
        </form>
        {signupStatus && <p className="user-add-message">{signupStatus}</p>}
      </div>
    </div>
  );
};

export default AddUserPage;
