import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

import Admin from "./pages/admin";
import Auth from "./pages/auth";
import CalendarModule from "./pages/calendar";
import Components from "./pages/components";
import EmployeeModule from "./pages/employee";
import ProfileModule from "./pages/profile";
import ProjectModule from "./pages/project";
import SituationControlModule from "./pages/situation_control";
import NoticeModule from "./pages/notice";

const Modules = {
  Admin,
  Auth,
  CalendarModule,
  Components,
  EmployeeModule,
  ProfileModule,
  ProjectModule,
  SituationControlModule,
  NoticeModule,
};

export default Modules;

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
