// application/client-react/src/pages/AdminWillsPage.js
import React, { useState, useEffect } from 'react';
import willService from '../services/willService'; 
const AdminWillsPage = () => {
    const [wills, setWills] = useState([]);
    const [selectedWill, setSelectedWill] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAllWillsAdmin = async () => { // 함수 이름 변경 (fetchAllWills -> fetchAllWillsAdmin)
            setIsLoading(true);
            setError('');
            try {
                const data = await willService.getAllWillsByAdmin(); // 서비스 함수 호출
                setWills(data || []);
            } catch (err) {
                console.error("Error fetching all wills (admin):", err.data || err.message);
                setError(err.data?.error || err.message || '전체 유언장 목록을 불러오는 데 실패했습니다.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllWillsAdmin();
    }, []);

    const fetchWillDetailAdmin = async (willId) => { // 함수 이름 변경 (fetchWillDetail -> fetchWillDetailAdmin)
        if (!willId) return;
        setIsLoading(true);
        setError('');
        setSelectedWill(null);
        try {
            const data = await willService.getWillDetailByIdAdmin(willId); // 서비스 함수 호출
            setSelectedWill(data);
        } catch (err) {
            console.error(`Error fetching will detail for ID ${willId} (admin):`, err.data || err.message);
            setError(err.data?.error || err.message || `ID가 ${willId}인 유언장 상세 정보를 불러오는 데 실패했습니다.`);
            setSelectedWill(null);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <div className="admin-wills-page loading">로딩 중...</div>;
    }

    if (error) {
        return <div className="admin-wills-page error-message">오류: {error}</div>;
    }

    return (
        <div className="admin-wills-page">
            <h1>관리자 - 유언장 관리</h1>

            <div className="wills-list-container">
                <h2>전체 유언장 목록 ({wills.length}건)</h2>
                {wills.length === 0 ? (
                    <p>등록된 유언장이 없습니다.</p>
                ) : (
                    <ul>
                        {wills.map((will) => (
                            // onClick 핸들러에서 fetchWillDetailAdmin 호출
                            <li key={will.id} onClick={() => fetchWillDetailAdmin(will.id)} className={selectedWill?.id === will.id ? 'selected' : ''}>
                                <div><strong>ID:</strong> {will.id}</div>
                                <div><strong>제목:</strong> {will.title}</div>
                                <div><strong>작성자ID:</strong> {will.testatorId}</div>
                                <div><strong>상태:</strong> {will.status}</div>
                                <div><strong>생성일:</strong> {new Date(will.createdAt).toLocaleString()}</div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {selectedWill && (
                <div className="will-detail-container">
                    <h2>유언장 상세 정보 (ID: {selectedWill.id})</h2>
                    <pre>{JSON.stringify(selectedWill, null, 2)}</pre>
                    <button onClick={() => setSelectedWill(null)} className="close-detail-button">상세 정보 닫기</button>
                </div>
            )}
        </div>
    );
};

export default AdminWillsPage;