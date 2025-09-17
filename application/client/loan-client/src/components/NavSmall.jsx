import React, { useEffect, useState } from "react";
import {
  HomeIcon,
  ChartBarIcon,
  UsersIcon,
  WalletIcon,
  UserIcon,
  Cog8ToothIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/solid";
import { NavLink, useNavigate } from "react-router-dom";
import avatar from "../assets/avatar.png";
import { useAuth } from "../contexts/AuthContext";

const NavSmall = ({ isVisible, onClose }) => {
  const [userEmail, setUserEmail] = useState("");
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (user?.email) {
      setUserEmail(user.email);
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.reload(); // 새로고침하여 창 새로 띄우는 느낌 제공
    } catch (error) {
      console.error("로그아웃 에러:", error);
      alert("로그아웃 중 오류가 발생했습니다.");
    }
  };

  const navItems = [
    { label: "대시보드", icon: <HomeIcon className="w-5 h-5" />, path: "/dashboard" },
    { label: "대출풀", icon: <ChartBarIcon className="w-5 h-5" />, path: "/loanpool" },
    { label: "친구", icon: <UsersIcon className="w-5 h-5" />, path: "/friend" },
    { label: "자금현황", icon: <WalletIcon className="w-5 h-5" />, path: "/financialstatus" },
    { label: "내 정보", icon: <UserIcon className="w-5 h-5" />, path: "/mypage" },
  ];

  if (!isVisible) return null;

  return (
    <div className="absolute top-16 right-4 w-64 bg-white shadow-lg rounded-lg z-50">
      <div className="p-4 border-b">
        <div className="flex items-center">
          <img
            src={avatar}
            alt="avatar"
            className="w-10 h-10 rounded-full mr-3"
          />
          <div>
            <div className="text-xs text-black font-medium">{userEmail}</div>
          </div>
        </div>
      </div>
      <div className="p-4">
        <nav className="flex flex-col gap-2">
          {navItems.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition"
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="p-4 border-t">
        <NavLink
          to="/setting"
          className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition"
        >
          <Cog8ToothIcon className="w-5 h-5" /> 설정
        </NavLink>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 text-sm text-red-500 rounded-md hover:bg-red-50 transition w-full"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5 text-red-500" /> 로그아웃
        </button>
      </div>
    </div>
  );
};

export default NavSmall;
