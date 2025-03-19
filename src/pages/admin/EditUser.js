import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./EditUser.css";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../../utils/useAuth";
import { authFetch } from "../../utils/authFetch";

const EditUser = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const apiUrl = process.env.REACT_APP_API_URL;
  const accessToken = localStorage.getItem("access_token");
  const refreshToken = localStorage.getItem("refresh_token");

  // decodedUserId를 state로 저장
  const [decodedUserId, setDecodedUserId] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [positions, setPositions] = useState([]);
  const [formData, setFormData] = useState({
    username: "",
    position: "",
    department: "",
    phone: "",
    role_id: "",
  });

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

  // useEffect에서 userId를 디코딩 후 state에 저장
  useEffect(() => {
    try {
      const decoded = atob(decodeURIComponent(userId)); // Base64 디코딩 + URL 디코딩
      setDecodedUserId(decoded);
      fetchFormData(decoded); // 디코딩된 userId로 데이터 불러오기
    } catch (error) {
      console.error("잘못된 userId:", error);
      alert("잘못된 사용자 ID입니다.");
      navigate("/manage-user"); // 잘못된 경우 목록 페이지로 이동
    }
  }, [userId]); // userId가 변경될 때 실행

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
        if (!deptRes.ok) throw new Error("부서 목록을 가져오지 못했습니다.");

        const roleRes = await authFetch(`${apiUrl}/admin/get_role_list`);

        const deptData = await deptRes.json();
        const roleData = await roleRes.json();

        //console.log("부서 데이터:", deptData);
        //console.log("권한 데이터:", roleData);

        if (deptData.departments && Array.isArray(deptData.departments)) {
          setDepartments(deptData.departments);
        } else {
          setDepartments([]);
        }
        setRoles(Array.isArray(roleData) ? roleData : []);
      } catch (error) {
        console.error("데이터 불러오기 오류:", error);
      }
    };

    fetchData();
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

  // 유저 데이터 불러오기 함수
  const fetchFormData = async (decodedId) => {
    if (!decodedId) return;

    try {
      const response = await authFetch(
        `${apiUrl}/user/get_user?user_id=${decodedId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "X-Refresh-Token": refreshToken,
          },
        }
      );

      if (!response.ok)
        throw new Error("유저 데이터를 가져오는 데 실패했습니다.");

      const data = await response.json();
      setFormData({
        username: data.user.name,
        position: data.user.position,
        department: data.user.department,
        phone: data.user.phone_number,
        role_id: data.user.role_id,
      });
    } catch (error) {
      console.error("유저 데이터 불러오기 오류:", error);
      alert("유저 데이터를 불러오는데 실패했습니다.");
    }
  };

  // 입력 필드 변경 핸들러
  const handleChange = (e) => {
    const { name, value } = e.target;

    // 전화번호 필드일 경우 자동 포맷 적용 및 비밀번호 자동 생성
    if (name === "phone") {
      const formattedPhone = formatPhoneNumber(value);
      setFormData({
        ...formData,
        phone: formattedPhone,
      });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  // 유저 정보 수정 요청 함수
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await authFetch(`${apiUrl}/admin/update_user`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Refresh-Token": refreshToken,
        },
        body: JSON.stringify({
          id: decodedUserId,
          username: formData.username,
          position: formData.position,
          department: formData.department,
          phone: formData.phone,
          role_id: formData.role_id,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`유저 정보 수정 실패: ${errorText}`);
      }

      alert("✅ 유저 정보가 성공적으로 수정되었습니다!");
      navigate("/manage-user");
    } catch (error) {
      console.error("유저 수정 오류:", error);
      alert(`❌ 유저 수정에 실패했습니다. 오류: ${error.message}`);
    }
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="user-edit-body">
      <Sidebar user={user} />
      <div className="user-edit-container">
        <h2 className="user-edit-title">유저 정보 변경</h2>
        <form onSubmit={handleSubmit}>
          <div className="user-edit-form-group">
            <label>이름</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          <div className="user-edit-form-group">
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
          <div className="user-edit-form-group">
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
          <div className="user-edit-form-group">
            <label>전화번호</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>
          <div className="user-edit-form-group">
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

          <div className="user-edit-button-container">
            <button type="submit" className="user-edit-submit-button">
              수정하기
            </button>
            <button
              type="button"
              className="user-edit-cancel-button"
              onClick={() => window.history.back()}
            >
              돌아가기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUser;
