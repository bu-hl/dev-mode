import React, { useState, useEffect } from 'react';
import { UserPlusIcon } from '@heroicons/react/24/solid';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../contexts/AuthContext'; 
import { 
  getCurrentUser,
  getFriendList,
  getReceivedRequests,
  sendFriendRequest,
  handleFriendRequest,
 } from '../services/api';


function Friend() {
    const {user} = useAuth();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [myFriends, setMyFriends] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({
    type: '',
    title: '',
    message: ''
  });
  const [timerProgress, setTimerProgress] = useState(100);

  const showNotification = (type, title, message) => {
    setModalContent({ type, title, message });
    setShowModal(true);
    setTimerProgress(100);

    const duration = 3000;
    const interval = 30;
    const steps = duration / interval;
    const decrement = 100 / steps;

    const timer = setInterval(() => {
      setTimerProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          setShowModal(false);
          return 0;
        }
        return prev - decrement;
      });
    }, interval);
  };

  const fetchReceivedRequests = async () => {
    if (!user?.id) return;

    try {
      const response = await axios.get('/api/friends/received'); 
      // authenticateUser 미들웨어를 거치므로, axios 인스턴트에 이미 토큰이 붙습니다.
      setReceivedRequests(response.data.requests || []);
    } catch (error) {
      console.error('[Friend] 요청 목록 처리 중 오류:', error);
    }
  };

  // --------- 친구 추가 -------------
  const handleFriendAdd = async () => {
    if (!searchKeyword || !user?.id) return;

    try {
      await sendFriendRequest(user.id, searchKeyword);
      showNotification('success', '요청 완료', '친구 요청을 보냈습니다!');
      setSearchKeyword('');
      // 추가 요청을 보낸 뒤, “받은 요청” 또는 “친구 목록” 등을 갱신하고 싶다면 아래를 호출하세요.
      fetchFriends();
      fetchReceivedRequests();
    } catch (error) {
      console.error('[Friend] 친구 추가 처리 중 오류:', error);
      showNotification(
        'error',
        '요청 실패',
        error?.response?.data?.error || error.message || '알 수 없는 오류가 발생했습니다.'
      );
    }
  };

  // 서버에서 내 친구 목록을 불러오는 함수
  const fetchFriends = async () => {
    try {
      const friends = await getFriendList();
      setMyFriends(friends);
    } catch (err) {
      console.error('[Friend] 친구 목록 처리 중 오류:', err);
    }
  };

  // 서버에서 받은 친구 요청(‘pending’) 목록을 불러오는 함수
  const fetchReceived = async () => {
    try {
      const requests = await getReceivedRequests();
      setReceivedRequests(requests);
    } catch (err) {
      console.error('[Friend] 받은 요청 처리 중 오류:', err);
    }
  };


  // ======== 받은 요청 수락/거절 ========
  const respondToRequest = async (friendRequestId, accept = true) => {
    try {
      await handleFriendRequest(friendRequestId, accept);
      showNotification(
        'success',
        '요청 처리 완료',
        accept ? '친구 요청을 수락했습니다.' : '친구 요청을 거절했습니다.'
      );
      // 처리 후 다시 갱신
      fetchReceived();
      fetchFriends();
    } catch (error) {
      console.error('[Friend] 친구 요청 처리 중 오류:', error);
      showNotification('error', '처리 실패', '알 수 없는 오류가 발생했습니다.');
    }
  };

  // user가 바뀔 때(=로그인 상태가 확인될 때)만 호출
  useEffect(() => {
    if (user && user.id) {
      fetchFriends();
      fetchReceived();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="p-6 bg-white rounded-md">
      <h1 className="mb-2 text-2xl font-bold">친구</h1>
      <p className="mb-4 text-gray-500">친구 리스트를 관리할 수 있습니다.</p>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center px-3 py-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-400">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="이메일로 친구 추가"
            className="flex-1 ml-2 bg-transparent outline-none"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFriendAdd()}
          />
        </div>
        <button
          onClick={handleFriendAdd}
          className="flex items-center px-4 py-2 text-white transition bg-black rounded-md hover:bg-gray-800"
        >
          <UserPlusIcon className="w-5 h-5 mr-2" />
          친구 추가
        </button>
      </div>

      <ul className="space-y-4">
        {myFriends.map((friend, index) => (
          <li
            key={friend.id || index}
            className="flex items-center justify-between p-4 rounded-md"
          >
            <div className="flex items-center gap-4">
              <img
                src={`https://via.placeholder.com/48?text=${friend.profile?.name?.[0] || '🙂'}`}
                alt={friend.profile?.name || '친구'}
                className="w-12 h-12 rounded-full"
              />
              <div>
                <p className="font-medium">
                  {friend.profile?.name || friend.profile?.email || '이름 없음'}
                </p>
                <p className="text-sm text-gray-500">친구 상태: 연결됨</p>
              </div>
            </div>
            <button className="px-4 py-2 text-sm font-medium bg-gray-100 rounded-full hover:bg-gray-200">
              View Profile
            </button>
          </li>
        ))}
      </ul>

      {receivedRequests.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-xl font-semibold">받은 친구 요청</h2>
          <ul className="space-y-4">
            {receivedRequests.map((request) => (
              <li
                key={request.id}
                className="flex items-center justify-between p-4 border rounded-md"
              >
                <div>
                  <p className="font-medium">
                    {request.profile?.name || request.profile?.email}
                  </p>
                  <p className="text-sm text-gray-500">친구 요청 도착</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => respondToRequest(request.id, true)}
                    className="px-3 py-1 text-sm text-white bg-green-500 rounded-md hover:bg-green-600"
                  >
                    수락
                  </button>
                  <button
                    onClick={() => respondToRequest(request.id, false)}
                    className="px-3 py-1 text-sm text-white bg-red-500 rounded-md hover:bg-red-600"
                  >
                    거절
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black opacity-30" onClick={() => setShowModal(false)}></div>
          <div className="relative w-full max-w-sm p-6 mx-4 transition-all transform bg-white rounded-lg shadow-xl">
            <div className="absolute top-0 left-0 w-full h-1 overflow-hidden bg-gray-200 rounded-t-lg">
              <div
                className="h-full transition-all duration-300 ease-linear bg-blue-500"
                style={{ width: `${timerProgress}%` }}
              />
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="absolute text-gray-400 top-2 right-2 hover:text-gray-600"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mt-1">
              {modalContent.type === 'success' ? (
                <CheckCircleIcon className="w-8 h-8 text-green-500" />
              ) : (
                <ExclamationCircleIcon className="w-8 h-8 text-red-500" />
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {modalContent.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {modalContent.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Friend;
