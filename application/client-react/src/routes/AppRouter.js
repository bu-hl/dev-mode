import React from "react";
import { Routes, Route } from "react-router-dom";

// Layout
import AppLayOut from "../Layout/AppLayOut";

// Pages
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import MyPage from "../pages/MyPage";
import RegisterPage from "../pages/RegisterPage";
import WillWritePage from "../pages/WillWritePage";
import WillDetailPage from "../pages/WillDetailPage";
import NotFoundPage from "../pages/NotFoundPage";
import WillList from "../pages/WillList";
import WillDetails from "../pages/WillDetails";
import UserProfileComponent from "../pages/UserProfileComponent";
import UserMyPage from "../pages/MyPage";
import AdminWillsPage from "../pages/AdminWillsPage";
const AppRouter = () => {
  return (
    <Routes>
      {/* Main App Layout - All pages below share the AppLayOut */}
      <Route element={<AppLayOut />}>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* User Routes */}
        <Route path="/mypage" element={<MyPage />} />

        {/* Will Routes */}
        <Route path="/write" element={<WillWritePage />} />
        {/* Dynamic route for Will detail, supports backend integration */}
        <Route path="/will/:willId" element={<WillDetailPage />} />
        <Route path="/success" element={<WillList/>}/>
        <Route path="/detail/:willId" element={<WillDetails />} />
        <Route path="/name" element={<UserProfileComponent />} />
        <Route path="/MyPage" element={<UserMyPage />} />
        <Route path="/test" element={<AdminWillsPage />} />

      </Route>

      {/* Catch-All Not Found Page */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRouter;
