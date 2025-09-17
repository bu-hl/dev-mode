// Nav.js
import React, { useEffect, useState } from "react";
import {
  HomeIcon,
  ChartBarIcon,
  UsersIcon,
  WalletIcon,
  UserIcon,
  Cog8ToothIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon
} from "@heroicons/react/24/solid";
import { NavLink, useNavigate } from "react-router-dom";
import avatar from "../assets/avatar.png";
import { getUserWalletAddress, getWalletBalance } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

// 금액을 한글 단위로 변환하는 유틸리티 함수
const formatAmount = (amount) => {
    if (amount >= 100000000) {
        return `${Math.floor(amount / 100000000)}억원`;
    } else if (amount >= 10000) {
        return `${Math.floor(amount / 10000)}만원`;
    } else if (amount >= 1000) {
        return `${Math.floor(amount / 1000)}천원`;
    }
    return `${amount.toLocaleString()}원`;
};

const Nav = () => {
  const [userName, setUserName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [balance, setBalance] = useState(0);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const navigate = useNavigate();
  const { user, signOut, supabase } = useAuth();

  // 1) 현재 로그인한 유저 정보 가져오기
  useEffect(() => {
    const loadUser = async () => {
      try {
        if (user) {
          // 지갑주소 조회
          const { data: profile, error: profErr } = await supabase
            .from("profiles")
            .select("wallet_id, name")
            .eq("id", user.id)
            .single();
          if (profErr) throw profErr;
          if (profile?.wallet_id) {
            setWalletAddress(profile.wallet_id);
          }
          if (profile?.name) {
            setUserName(profile.name);
          }
        }
      } catch (err) {
        console.error("네비게이션 유저 로드 중 오류:", err);
      } finally {
        setLoadingWallet(false);
      }
    };
    loadUser();
  }, [user, supabase]);

  // 2) 지갑 주소가 세팅되면 잔액 조회
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        if (!walletAddress) return;
        const bal = await getWalletBalance(walletAddress);
        setBalance(bal);
      } catch (err) {
        console.error("잔액 조회 실패:", err);
        setBalance(0);
      }
    };
    fetchBalance();
  }, [walletAddress]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (err) {
      console.error("로그아웃 에러:", err);
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

  return (
    <aside className="w-full max-w-[240px] flex flex-col h-full border-r px-4 py-6 bg-white">
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* 사용자 정보 */}
        <div className="flex items-center mb-6">
          <img src={avatar} alt="avatar" className="w-12 h-12 rounded-full mr-4" />
          <div>
            <div className="text-base">{userName || "Guest"}</div>
            <div className="text-sm text-gray-500">
              {loadingWallet ? "로딩중…" : (
                <div className="flex flex-col">
                  <span>잔액: {formatAmount(balance)}</span>
                  <span className="text-xs">{balance.toLocaleString()} KRW</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 네비게이션 */}
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 transition ${
                  isActive ? "bg-gray-100 font-semibold" : ""
                }`
              }
            >
              {item.icon}
              <span className="text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* 하단 메뉴 */}
        <div className="flex flex-col gap-1 pt-6 border-t mt-6">
          <NavLink
            to="/setting"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition ${
                isActive ? "bg-gray-100 font-semibold" : ""
              }`
            }
          >
            <Cog8ToothIcon className="w-5 h-5" />
            설정
          </NavLink>
          <button className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition">
            <QuestionMarkCircleIcon className="w-5 h-5" />
            도움말
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 text-sm text-red-500 rounded-md hover:bg-red-50 transition"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            로그아웃
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Nav;
