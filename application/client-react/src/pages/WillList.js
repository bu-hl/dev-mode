import React, { useState, useEffect } from 'react';
import willService from '../services/willService';
import { useNavigate } from 'react-router-dom';

export default function WillList({ onSelect }) {
    const [myWillsList, setMyWillsList] = useState([]);
    const [myWillsStatus, setMyWillsStatus] = useState('');
    
    const [designatedWillsList, setDesignatedWillsList] = useState([]);
    const [designatedWillsStatus, setDesignatedWillsStatus] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();
    const [username, setUsername] = useState('');

    useEffect(() => {
        const storedUsername = sessionStorage.getItem('username');
        if (storedUsername) {
            setUsername(storedUsername);
            console.log("WillList: Loaded username from session:", storedUsername);
        } else {
            setMyWillsStatus("로그인이 필요합니다. 사용자 이름을 세션에서 찾을 수 없습니다.");
            setDesignatedWillsStatus("로그인이 필요합니다. 사용자 이름을 세션에서 찾을 수 없습니다.");
            console.warn("WillList: Username not found in session storage.");
        }
    }, []);

    const handleFetchMyWills = async () => {
        if (!username) {
            setMyWillsStatus('사용자 이름을 가져올 수 없습니다. 먼저 로그인해주세요.');
            return;
        }
        setMyWillsStatus('나의 유언장 조회 중...');
        try {
            const willsData = await willService.getMyWills(username);
            console.log("WillList: Response from getMyWills:", willsData);

            if (Array.isArray(willsData) && willsData.length > 0) {
                setMyWillsList(willsData);
                setMyWillsStatus(`${willsData.length}개의 유언장이 조회되었습니다.`);
            } else if (Array.isArray(willsData) && willsData.length === 0) {
                setMyWillsStatus('작성한 유언장이 없습니다.');
                setMyWillsList([]);
            } else {
                console.error("WillList: Unexpected response structure from getMyWills:", willsData);
                setMyWillsStatus('나의 유언장 정보를 가져오는 데 실패했습니다. 응답 형식을 확인해주세요.');
                setMyWillsList([]);
            }
        } catch (err) {
            console.error('WillList: Error fetching my wills:', err);
            const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || '알 수 없는 오류';
            setMyWillsStatus('나의 유언장 조회 실패: ' + errorMessage);
            setMyWillsList([]);
        }
    };

    const handleFetchDesignatedWills = async () => {
        if (!username) {
            setDesignatedWillsStatus('사용자 이름을 가져올 수 없습니다. 먼저 로그인해주세요.');
            return;
        }
        setDesignatedWillsStatus('내가 지정 열람자인 유언장 조회 중...');
        try {
            const willsData = await willService.getDesignatedViewersWills(username);
            console.log("WillList: Response from getDesignatedViewersWills:", willsData);

            if (Array.isArray(willsData) && willsData.length > 0) {
                setDesignatedWillsList(willsData);
                setDesignatedWillsStatus(`${willsData.length}개의 유언장이 조회되었습니다.`);
            } else if (Array.isArray(willsData) && willsData.length === 0) {
                setDesignatedWillsStatus('지정 열람자로 등록된 유언장이 없습니다.');
                setDesignatedWillsList([]);
            } else {
                console.error("WillList: Unexpected response structure from getDesignatedViewersWills:", willsData);
                setDesignatedWillsStatus('지정 열람자 유언장 정보를 가져오는 데 실패했습니다. 응답 형식을 확인해주세요.');
                setDesignatedWillsList([]);
            }
        } catch (err) {
            console.error('WillList: Error fetching designated viewer wills:', err);
            const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || '알 수 없는 오류';
            setDesignatedWillsStatus('지정 열람자 유언장 조회 실패: ' + errorMessage);
            setDesignatedWillsList([]);
        }
    };
    
    useEffect(() => {
        if (username) {
            handleFetchMyWills();
            handleFetchDesignatedWills();
        }
    }, [username]);

    const filterWills = (list, term) => {
        if (!term) return list;
        const keyword = term.toLowerCase();
        return list.filter(item => {
            const idValue = item.id || '';
            const titleValue = item.title || '';
            return (
                idValue.toLowerCase().includes(keyword) ||
                titleValue.toLowerCase().includes(keyword)
            );
        });
    };

    const filteredMyWills = filterWills(myWillsList, searchTerm);
    const filteredDesignatedWills = filterWills(designatedWillsList, searchTerm);

    const handleItemClick = (willId) => {
        console.log("WillList: Item clicked. ID to navigate/select:", willId);
        if (willId) {
            if (typeof onSelect === 'function') {
                console.log("WillList: Calling onSelect with ID:", willId);
                onSelect(willId);
            } else {
                console.log("WillList: Navigating to /will/" + willId); // 경로 수정
                navigate(`/will/${willId}`);
            }
        } else {
            console.warn("WillList: Clicked item has no valid ID to navigate or select. Received ID:", willId);
            // 공통 상태 메시지 대신 각 목록의 상태 메시지를 사용하거나, 별도의 UI 피드백을 고려할 수 있습니다.
            // setMyWillsStatus("선택한 항목의 ID가 올바르지 않아 상세 페이지로 이동할 수 없습니다.");
        }
    };

    const renderWillList = (title, list, status) => (
        <div className="mb-4">
            <h4>{title}</h4>
            <p>{status}</p>
            {list.length > 0 ? (
                 <ul className="list-group">
                 {list.map((item, idx) => (
                     <li
                         key={item.id || idx}
                         className="list-group-item list-group-item-action"
                         style={{ cursor: 'pointer' }}
                         onClick={() => handleItemClick(item.id)}
                     >
                         <strong>ID:</strong> {item.id}<br />
                         <strong>제목:</strong> {item.title || '제목 없음'}<br />
                         {item.testatorId && title.includes("지정 열람자") && ( // 지정 열람자 목록에만 작성자 표시
                            <small><strong>작성자:</strong> {item.testatorId}</small>
                         )}
                     </li>
                 ))}
             </ul>
            ) : (
                !status.includes("조회 중...") && status !== "" && <p>해당 목록에 유언장이 없습니다.</p>
            )}
        </div>
    );

    return (
        <div className="container mt-3">
            <h3>유언장 목록</h3>
            {username ? (
                <div className="form-group">
                    <input
                        className="form-control mb-3"
                        placeholder="검색어를 입력하세요 (ID 또는 제목)"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            ) : <p>로그인 후 유언장 목록을 확인할 수 있습니다.</p>}
            
            {username && (
                <>
                    {renderWillList("나의 유언장", filteredMyWills, myWillsStatus)}
                    {renderWillList("내가 지정 열람자인 유언장", filteredDesignatedWills, designatedWillsStatus)}
                </>
            )}
        </div>
    );
}