import React, { useEffect, useState } from "react";
import { GiftIcon, CircleStackIcon } from '@heroicons/react/24/solid';
import { getMyLoanTransactions, getCurrentUser, getUserProfile ,getNameById, getLoanMeta } from '../services/api';

const FinancialStatus = () => {
  const [loans, setLoans] = useState([]);
  const [filterStatus, setFilterStatus] = useState("전체");
  const [sortOption, setSortOption] = useState("최신순");
  const [filterRole, setFilterRole] = useState("전체");

  const statusColors = {
    "활성": "text-blue-700 bg-blue-50",
    "상환 완료": "text-green-700 bg-green-50",
    "연체": "text-red-700 bg-red-50",
  };


useEffect(() => {
  const fetchData = async () => {
    try {
      const user = await getCurrentUser();
      await getUserProfile(user.id);

      const transactions = await getMyLoanTransactions(user.id);

      // 모든 이름을 병렬로 가져옴
      const enriched = await Promise.all(
        transactions.map(async (tx) => {
          const isLender = tx.type === 'loan_sent';
          const counterpartyId = tx.related_user_id || '알 수 없음';
          const amountNum = Math.abs(tx.amount);

          let status = '';
          if (tx.type === 'repay' || tx.type === 'repay_sent') {
            status = '상환 완료';
          } else if (tx.type === 'loan_sent' || tx.type === 'loan_received') {
            status = '활성';
          } else {
            status = '알 수 없음';
          }

          let role = '';
          if (tx.amount < 0) role = '대출';
          else if (tx.amount > 0) role = '차입';

          let counterpartyName = counterpartyId;
          if (counterpartyId !== '알 수 없음') {
            try {
              counterpartyName = await getNameById(counterpartyId);
            } catch (e) {
              console.warn('이름 불러오기 실패:', counterpartyId);
            }
          }
          let rate = '5%'; // 기본값
          let period = '365일'; // 기본값

          if (tx.loan_id) {
            try {
              const meta = await getLoanMeta(tx.loan_id);
              rate = meta.interest_rate ? `${meta.interest_rate}%` : rate;
              period = meta.duration_days ? `${meta.duration_days}일` : period;
            } catch (e) {
              console.warn('loan meta 조회 실패:', tx.loan_id);
            }
          }


          return {
            amount: `${amountNum.toLocaleString()} KRW`,
            amountNum,
            rate: rate,
            period: period,
            start: new Date(tx.created_at).toISOString().split('T')[0],
            timestamp: new Date(tx.created_at).getTime(),
            status: tx.status || '활성',
            counterparty: counterpartyId,
            counterpartyName,
            role,
            isLender
          };
        })
      );

      setLoans(enriched);
    } catch (err) {
      console.error('대출 기록 불러오기 실패:', err);
    }
  };

  fetchData();
}, []);



  // 필터 + 정렬 적용
  const filteredAndSortedLoans = loans
  .filter(loan =>
    (filterStatus === "전체" || loan.status === filterStatus) &&
    (filterRole === "전체" || loan.role === filterRole)
  )
  .sort((a, b) => {
    switch (sortOption) {
      case "최신순":
        return b.timestamp - a.timestamp;
      case "오래된순":
        return a.timestamp - b.timestamp;
      case "금액 높은순":
        return b.amountNum - a.amountNum;
      case "금액 낮은순":
        return a.amountNum - b.amountNum;
      case "대출 우선":
        return a.role === "대출" && b.role === "차입" ? -1 :
               a.role === "차입" && b.role === "대출" ? 1 : 0;
      case "차입 우선":
        return a.role === "차입" && b.role === "대출" ? -1 :
               a.role === "대출" && b.role === "차입" ? 1 : 0;
      default:
        return 0;
    }
  });


  return (
    <div className="p-10 bg-white min-h-screen">
      <h1 className="text-3xl font-bold mb-2">자금현황</h1>
      <p className="text-gray-500 mb-6">자금 정보를 확인하세요.</p>

      <div className="border rounded-xl p-3">
        <p>리워드 현황</p>
        <div className="flex gap-4 mt-3">
          <div className="flex-1 p-4 rounded-lg bg-blue-50">
            <div className="text-sm text-blue-700 mb-1 flex">
              <GiftIcon className="w-5 h-5 mr-2" /> 누적 리워드
            </div>
            <div className="text-2xl text-blue-700">250,000 KRW</div>
          </div>
          <div className="flex-1 p-4 rounded-lg bg-green-50">
            <div className="text-sm text-green-700 mb-1 flex">
              <CircleStackIcon className="w-5 h-5 mr-2" /> 이번 달 예상 리워드
            </div>
            <div className="text-2xl text-green-700">15,000 KRW</div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p>필터 및 정렬</p>
        <div className="flex gap-4 mb-4 mt-1">
          <select
            className="border rounded-xl px-2 py-3 w-1/3 bg-white"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="전체">전체</option>
            <option value="대출">대출</option>
            <option value="차입">차입</option>
          </select>
          <select
            className="border rounded-xl px-2 py-3 w-1/3 bg-white"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="전체">전체</option>
            <option value="활성">활성</option>
            <option value="상환 완료">상환 완료</option>
            <option value="연체">연체</option>
          </select>
          <select
            className="border rounded-xl px-2 py-3 w-1/3 bg-white"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="최신순">최신순</option>
            <option value="오래된순">오래된순</option>
            <option value="금액 높은순">금액 높은순</option>
            <option value="금액 낮은순">금액 낮은순</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border-2">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="px-4 py-2 font-normal">차입/대출</th>
              <th className="px-4 py-2 font-normal">대출 금액</th>
              <th className="px-4 py-2 font-normal">이자율</th>
              <th className="px-4 py-2 font-normal">상환 기간</th>
              <th className="px-4 py-2름 font-normal">시작 날짜</th>
              <th className="px-4 py-2 font-normal">상환 상태</th>
              <th className="px-4 py-2 font-normal">상대 이름</th>
            </tr>
          </thead>
          <tbody>
  {filteredAndSortedLoans.length === 0 ? (
    <tr>
      <td colSpan={6} className="text-center text-gray-500 py-6">표시할 거래가 없습니다</td>
    </tr>
  ) : (
    filteredAndSortedLoans.map((loan, idx) => (
      <tr key={idx}>
        <td className="px-4 py-3">{loan.role}</td>
        <td className="px-4 py-3">{loan.amount}</td>
        <td className="px-4 py-3">{loan.rate}</td>
        <td className="px-4 py-3">{loan.period}</td>
        <td className="px-4 py-3">{loan.start}</td>
        <td className="px-4 py-3">
          <span className={`px-3 py-1 rounded-full text-sm ${statusColors[loan.status] || ''}`}>
            {loan.status}
          </span>
        </td>
        <td className="px-4 py-3">{loan.counterpartyName}</td>
      </tr>
    ))
  )}
</tbody>
        </table>
      </div>
    </div>
  );
};

export default FinancialStatus;