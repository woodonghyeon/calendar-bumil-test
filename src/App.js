import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Modules from "./index";

function App() {
  return (
    <Router>
      <Routes>
        {/* ===== Admin ===== */}
        <Route path="/add-user" element={<Modules.Admin.AddUserPage />} />
        <Route path="/manage-user" element={<Modules.Admin.ManageUser />} />
        <Route path="/edit-user/:userId" element={<Modules.Admin.EditUser />} />
        <Route path="/manager" element={<Modules.Admin.Manager />} />
        <Route
          path="/user-roles-management"
          element={<Modules.Admin.UserRolesManagement />}
        />
        <Route path="/reset-user" element={<Modules.Admin.ResetUser />} />
        <Route
          path="/status-management"
          element={<Modules.Admin.StatusManagement />}
        />
        <Route path="/login-log" element={<Modules.Admin.LoginLogPage />} />
        <Route
          path="/manage-department"
          element={<Modules.Admin.ManageDepartment />}
        />

        {/* ===== Auth ===== */}
        <Route path="/" element={<Modules.Auth.LoginPage />} />
        <Route path="/change-pw" element={<Modules.Auth.ChangePWPage />} />

        {/* ===== Calendar ===== */}
        <Route path="/calendar" element={<Modules.CalendarModule.Calendar />} />
        <Route
          path="/add-schedule"
          element={<Modules.CalendarModule.AddSchedule />}
        />
        <Route
          path="/edit-schedule/:scheduleId"
          element={<Modules.CalendarModule.EditSchedule />}
        />

        {/* ===== Employee ===== */}
        <Route path="/employee" element={<Modules.EmployeeModule.Employee />} />

        {/* ===== Profile ===== */}
        <Route
          path="/change-my-details"
          element={<Modules.ProfileModule.ChangeMyDetails />}
        />
        <Route
          path="/user-details"
          element={<Modules.ProfileModule.UserDetails />}
        />

        {/* ===== Project ===== */}
        <Route
          path="/projects"
          element={<Modules.ProjectModule.ProjectPage />}
        />
        <Route
          path="/project-details"
          element={<Modules.ProjectModule.ProjectDetails />}
        />
        <Route
          path="/project-edit"
          element={<Modules.ProjectModule.ProjectEdit />}
        />
        <Route
          path="/add-project"
          element={<Modules.ProjectModule.ProjectCreate />}
        />

        {/* ===== SituationControl ===== */}
        <Route
          path="/situation_control"
          element={<Modules.SituationControlModule.SituationControl />}
        />

        {/* ===== Notice ===== */}
        <Route
          path="/notice-list"
          element={<Modules.NoticeModule.NoticeList />}
        />
        <Route
          path="/notice-details/:id"
          element={<Modules.NoticeModule.NoticeDetails />}
        />
        <Route
          path="/notice-create"
          element={<Modules.NoticeModule.NoticeCreate />}
        />
        <Route
          path="/notice-edit/:id"
          element={<Modules.NoticeModule.NoticeEdit />}
        />
      </Routes>
    </Router>
  );
}

export default App;
