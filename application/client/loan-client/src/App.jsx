import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Main from "./pages/main/Main";
import ServiceIntro from "./pages/service/ServiceIntro";
import Blog from "./pages/service/Blog";
import Partners from "./pages/service/Partners";
import Careers from "./pages/service/Careers";
import Privacy from "./pages/legal/Privacy";
import Terms from "./pages/legal/Terms";
import Inquiry from "./pages/support/Inquiry";
import Login from "./pages/main/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import LoanPool from "./pages/LoanPool";
import Friend from "./pages/Friend";
import FriendLoanRequest from "./pages/FriendLoanRequest";
import FinancialStatus from "./pages/FinancialStatus";
import MyPage from "./pages/MyPage";
import Setting from "./pages/Setting";
import Header from "./components/Header";
import Nav from "./components/Nav";
import Error from "./pages/Error";
import Question from "./pages/Question";
import ServiceIntroduction from "./pages/Service-Introduction";
import ServiceMethod from "./pages/Service-Method";
import EnsuringStability from "./pages/Ensuring-Stability";
import Contract from "./pages/Constract";
import Password from "./pages/PassWord";

// 앱의 기본 레이아웃 컴포넌트
function AppLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}

// 대시보드 레이아웃 컴포넌트
function DashboardLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1">
        <Nav />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout><Main /></AppLayout>} />
        <Route path="/service-intro" element={<AppLayout><ServiceIntro /></AppLayout>} />
        <Route path="/blog" element={<AppLayout><Blog /></AppLayout>} />
        <Route path="/partners" element={<AppLayout><Partners /></AppLayout>} />
        <Route path="/careers" element={<AppLayout><Careers /></AppLayout>} />
        <Route path="/privacy" element={<AppLayout><Privacy /></AppLayout>} />
        <Route path="/terms" element={<AppLayout><Terms /></AppLayout>} />
        <Route path="/inquiry" element={<AppLayout><Inquiry /></AppLayout>} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/question" element={<AppLayout><Question /></AppLayout>} />
        <Route path="/service-introduction" element={<AppLayout><ServiceIntroduction /></AppLayout>} />
        <Route path="/service-method" element={<AppLayout><ServiceMethod /></AppLayout>} />
        <Route path="/ensuring-stability" element={<AppLayout><EnsuringStability /></AppLayout>} />
        <Route path="/contract" element={<AppLayout><Contract /></AppLayout>} />
        <Route path="/password" element={<AppLayout><Password /></AppLayout>} />
        
        {/* 대시보드 관련 라우트 */}
        <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
        <Route path="/loanpool" element={<DashboardLayout><LoanPool /></DashboardLayout>} />
        <Route path="/friend" element={<DashboardLayout><Friend /></DashboardLayout>} />
        <Route path="/dashboard/request" element={<DashboardLayout><FriendLoanRequest /></DashboardLayout>} />
        <Route path="/financialstatus" element={<DashboardLayout><FinancialStatus /></DashboardLayout>} />
        <Route path="/mypage" element={<DashboardLayout><MyPage /></DashboardLayout>} />
        <Route path="/setting" element={<DashboardLayout><Setting /></DashboardLayout>} />
        
        {/* 404 에러 페이지 */}
        <Route path="*" element={<Error />} />
      </Routes>
    </Router>
  );
}

export default App;