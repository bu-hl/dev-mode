// application/client-react/src/pages/DesignatedWillManagementPage.js
// (인증 로직 간소화 버전)
import React, { useState, useEffect, useCallback } from "react";
import {
  PageContainer,
  Title,
  TopControls,
  SearchRow,
  Label,
  Select,
  Input,
  Button,
  FilterButtons,
  Actions,
  ActionButton,
  TableContainer,
  Table,
  Tr,
  Td,
  Th,
} from "./Style/AdminManagementStyle";
import { MdArrowDownward, MdArrowUpward } from "react-icons/md";
import willService from "../../services/willService";

// --- getCurrentUserInfo 및 currentUser 관련 로직 제거 ---
// 이 컴포넌트는 로그인된 사용자의 username을 이미 알고 있다고 가정합니다.
// 실제 애플리케이션에서는 props, Context API 등을 통해 전달받습니다.
const LOGGED_IN_USER_USERNAME = sessionStorage.getItem('username'); 
// TODO: 위 값은 실제 인증 시스템에서 가져온 현재 로그인된 사용자 ID (예: 이메일)로 대체되어야 합니다.

const DesignatedWillManagementPage = () => {
  const [wills, setWills] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedWillIds, setSelectedWillIds] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'descending' });

  const [searchParams, setSearchParams] = useState({
    condition: "",
    keyword: "",
  });

  const [selectedWillDetail, setSelectedWillDetail] = useState(null);
  const [newStatusForAction, setNewStatusForAction] = useState("");

  const fetchWills = useCallback(async () => {
    // LOGGED_IN_USER_USERNAME 사용
    if (!LOGGED_IN_USER_USERNAME) {
      setError("사용자 정보가 없어 유언장 목록을 조회할 수 없습니다.");
      return;
    }
    setIsLoading(true);
    // setSuccessMessage(''); // 필요에 따라 초기화
    // setError('');
    try {
      const data = await willService.getDesignatedViewersWills(LOGGED_IN_USER_USERNAME);
      console.log(data);
      let filteredData = data || [];
      if (searchParams.condition && searchParams.keyword) {
          const lowerKeyword = searchParams.keyword.toLowerCase();
          filteredData = data.filter(will => {
              let valueToSearch = '';
              if (searchParams.condition === 'originalTitle') {
                valueToSearch = String(will.originalTitle || '').toLowerCase();
              } else if (searchParams.condition === 'originalTestatorUsername') {
                valueToSearch = String(will.originalTestatorUsername || '').toLowerCase();
              } else if (searchParams.condition === 'id') {
                valueToSearch = String(will.id || '').toLowerCase();
              } else if (searchParams.condition === 'title') { 
                valueToSearch = String(will.title || '').toLowerCase();
              } else if (searchParams.condition === 'testatorId') { 
                valueToSearch = String(will.testatorId || '').toLowerCase();
              } else if (searchParams.condition === 'status') {
                valueToSearch = String(will.status || '').toLowerCase();
              }
              return valueToSearch.includes(lowerKeyword);
          });
      }
      setWills(filteredData);
    } catch (err) {
      console.error(`Error fetching designated wills for ${LOGGED_IN_USER_USERNAME}:`, err.data || err.message);
      setError(err.data?.error || err.message || '지정 열람 유언장 목록을 불러오는 데 실패했습니다.');
      setWills([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchParams]); // LOGGED_IN_USER_USERNAME은 이제 의존성 배열에서 제거 가능 (상수로 취급)

  useEffect(() => {
    fetchWills();
  }, [fetchWills]);

  const handleSearchParamChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = () => {
    setError('');
    setSuccessMessage('');
    fetchWills();
    setSelectedWillIds(new Set());
  };
  
  const toggleSelect = (willId) => {
    setSelectedWillIds(prevSelectedIds => {
      const newSelectedIds = new Set(prevSelectedIds);
      if (newSelectedIds.has(willId)) {
        newSelectedIds.delete(willId);
      } else {
        newSelectedIds.add(willId);
      }
      return newSelectedIds;
    });
  };

  const toggleSelectAll = () => {
    if (selectedWillIds.size === wills.length && wills.length > 0) {
      setSelectedWillIds(new Set());
    } else {
      setSelectedWillIds(new Set(wills.map(w => w.id)));
    }
  };

  const handleChangeWillStatus = async () => {
    if (!LOGGED_IN_USER_USERNAME) {
        setError("상태 변경을 위한 사용자 정보가 없습니다.");
        return;
    }
    if (selectedWillIds.size === 0) {
      alert("상태를 변경할 유언장을 선택해주세요.");
      return;
    }
    if (!newStatusForAction) {
        alert("변경할 새로운 상태를 선택해주세요.");
        return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    let successCount = 0;
    let errorCount = 0;
    let lastErrorMessage = '';

    for (const willId of selectedWillIds) {
      try {
        const response = await willService.updateWillStatusAdmin(willId, newStatusForAction, LOGGED_IN_USER_USERNAME);
        console.log(`Status of will ID ${willId} updated to ${newStatusForAction} by ${LOGGED_IN_USER_USERNAME}. Message: ${response.message}`);
        successCount++;
      } catch (err) {
        console.error(`Error updating status for will ${willId} by ${LOGGED_IN_USER_USERNAME}:`, err.data || err.message);
        lastErrorMessage = err.data?.error || err.message || `${willId} 상태 변경 실패`;
        errorCount++;
      }
    }
    setIsLoading(false);

    if (successCount > 0 && errorCount === 0) {
        setSuccessMessage(`${successCount}개 유언장의 상태가 ${newStatusForAction}(으)로 성공적으로 변경되었습니다.`);
    } else if (successCount > 0 && errorCount > 0) {
        setSuccessMessage(`${successCount}개 유언장 상태 변경 성공.`);
        setError(`그러나 ${errorCount}개 유언장 상태 변경 중 오류 발생: ${lastErrorMessage}`);
    } else if (errorCount > 0) {
        setError(`${errorCount}개 유언장 상태 변경 중 오류 발생: ${lastErrorMessage}`);
    }
    
    setSelectedWillIds(new Set());
    setNewStatusForAction("");
    fetchWills();
  };

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
      key = 'createdAt'; 
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedWills = React.useMemo(() => {
    let sortableItems = [...wills];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (['id', 'title', 'testatorId', 'status', 'originalTitle', 'originalTestatorUsername'].includes(sortConfig.key)) {
            aValue = String(aValue || '').toLowerCase(); 
            bValue = String(bValue || '').toLowerCase();
        } else if (sortConfig.key === 'createdAt'){
            aValue = aValue ? new Date(aValue) : new Date(0); 
            bValue = bValue ? new Date(bValue) : new Date(0);
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [wills, sortConfig]);

  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? <MdArrowUpward size={16} /> : <MdArrowDownward size={16} />;
    }
    return <MdArrowDownward size={16} style={{ opacity: 0.3 }}/>; 
  };
  
  const handleViewWillDetail = async (willId) => {
    if (!LOGGED_IN_USER_USERNAME) {
        setError("상세 정보 조회를 위한 사용자 정보가 없습니다.");
        return;
    }
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    setSelectedWillDetail(null);
    try {
        const data = await willService.getWillDetailByIdAdmin(willId, LOGGED_IN_USER_USERNAME);
        setSelectedWillDetail(data);
    } catch (err) {
        console.error(`Error fetching will detail for ID ${willId} by ${LOGGED_IN_USER_USERNAME}:`, err.data || err.message);
        setError(err.data?.error || err.message || `ID가 ${willId}인 유언장 상세 정보를 불러오는 데 실패했습니다.`);
        setSelectedWillDetail(null);
    } finally {
        setIsLoading(false);
    }
  };

  if (!LOGGED_IN_USER_USERNAME && !error) { // LOGGED_IN_USER_USERNAME이 없다는 것은 심각한 상황 (설정 오류 등)
    return (
        <PageContainer>
            <Title>오류</Title>
            <div style={{ color: 'red', marginBottom: '10px', padding: '10px', border: '1px solid red', borderRadius: '4px' }}>
                로그인된 사용자 정보를 가져올 수 없습니다. (애플리케이션 설정 오류 가능성)
            </div>
        </PageContainer>
    );
  }


  if (selectedWillDetail) {
    return (
        <PageContainer>
            <Title>유언장 상세 정보 (ID: {selectedWillDetail?.blockchainData?.id || selectedWillDetail?.id})</Title>
            {isLoading && <div>상세 정보 로딩 중...</div>}
            {error && !isLoading && <div className="error-message" style={{color: 'red', marginBottom: '10px'}}>오류: {error}</div>}
            {!isLoading && selectedWillDetail && (
                <div className="will-detail-container" style={{ border: '1px solid #ccc', padding: '20px', marginTop: '20px', backgroundColor: '#f9f9f9', whiteSpace: 'pre-wrap' }}>
                    <pre>{JSON.stringify(selectedWillDetail, null, 2)}</pre>
                    <Button onClick={() => { setSelectedWillDetail(null); setError(''); setSuccessMessage(''); }} style={{marginTop: '10px'}}>목록으로 돌아가기</Button>
                </div>
            )}
            {!isLoading && !selectedWillDetail && !error && <div style={{marginTop: '10px'}}>상세 정보를 불러올 수 없습니다.</div>}
        </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Title>나의 지정 열람 유언장 관리</Title>

      {successMessage && <div style={{ color: 'green', marginBottom: '10px', padding: '10px', border: '1px solid green', borderRadius: '4px' }}>{successMessage}</div>}
      {error && <div style={{ color: 'red', marginBottom: '10px', padding: '10px', border: '1px solid red', borderRadius: '4px' }}>오류: {error}</div>}

      <TopControls>
        <SearchRow>
          <Label htmlFor="condition">조건 검색</Label>
          <Select id="condition" name="condition" value={searchParams.condition} onChange={handleSearchParamChange}>
            <option value="">선택</option>
            <option value="originalTitle">원본 제목</option>
            <option value="originalTestatorUsername">원본 작성자</option>
            <option value="id">유언장 ID (해시)</option>
            <option value="status">상태</option>
            <option value="title">제목 (해시)</option> 
            <option value="testatorId">작성자 ID (해시)</option>
          </Select>
          <Input
            type="text"
            name="keyword"
            placeholder="검색어 입력"
            value={searchParams.keyword}
            onChange={handleSearchParamChange}
          />
          <Button onClick={handleSearch} disabled={isLoading}>검색</Button>
        </SearchRow>
        <FilterButtons>
          <Button onClick={() => { setError(''); setSuccessMessage(''); fetchWills(); setSelectedWillIds(new Set()); setSearchParams({condition: "", keyword: ""}); } }>전체보기/초기화</Button>
        </FilterButtons>
      </TopControls>

      <Actions>
        <ActionButton onClick={toggleSelectAll} disabled={isLoading || wills.length === 0}>
            {selectedWillIds.size === wills.length && wills.length > 0 ? "전체 해제" : "전체 선택"}
        </ActionButton>
        <Select 
            value={newStatusForAction} 
            onChange={(e) => setNewStatusForAction(e.target.value)}
            style={{marginRight: '10px', padding: '8px', height: '38px'}}
            disabled={isLoading}
        >
            <option value="">변경할 상태 선택</option>
            <option value="DECEASED_VERIFIED">사망 확인됨 (공증인 확인)</option>
            <option value="PENDING_EXECUTION">집행 대기 (공증인 확인 후)</option>
        </Select>
        <ActionButton danger onClick={handleChangeWillStatus} disabled={isLoading || selectedWillIds.size === 0 || !newStatusForAction}>
          선택 항목 상태 변경
        </ActionButton>
      </Actions>

      <TableContainer>
        <Table>
          <thead>
            <tr>
              <Th style={{width: '5%'}}>
                <input type="checkbox" onChange={toggleSelectAll} checked={selectedWillIds.size === wills.length && wills.length > 0 && wills.length > 0} disabled={isLoading || wills.length === 0}/>
              </Th>
              <Th onClick={() => requestSort('id')} style={{cursor: 'pointer', width: '15%'}}>유언장 ID {getSortIndicator('id')}</Th>
              <Th onClick={() => requestSort('originalTitle')} style={{cursor: 'pointer', width: '20%'}}>원본 제목 {getSortIndicator('originalTitle')}</Th>
              <Th onClick={() => requestSort('originalTestatorUsername')} style={{cursor: 'pointer', width: '15%'}}>원본 작성자 {getSortIndicator('originalTestatorUsername')}</Th>
              <Th onClick={() => requestSort('status')} style={{cursor: 'pointer', width: '10%'}}>상태 {getSortIndicator('status')}</Th>
              <Th onClick={() => requestSort('createdAt')} style={{cursor: 'pointer', width: '15%'}}>생성일 {getSortIndicator('createdAt')}</Th>
              <Th style={{width: '10%'}}>관리</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && wills.length === 0 && (<Tr><Td colSpan="7">유언장 목록을 불러오는 중...</Td></Tr>)}
            {!isLoading && !error && sortedWills.length === 0 && (<Tr><Td colSpan="7">표시할 유언장이 없습니다.</Td></Tr>)}
            {!isLoading && sortedWills.map((will) => (
              <Tr key={will.id}>
                <Td>
                  <input
                    type="checkbox"
                    checked={selectedWillIds.has(will.id)}
                    onChange={() => toggleSelect(will.id)}
                  />
                </Td>
                <Td>{will.id}</Td>
                <Td>{will.originalTitle || '(원본 제목 없음)'}</Td> 
                <Td>{will.originalTestatorUsername || '(원본 작성자 없음)'}</Td>
                <Td>{will.status}</Td>
                <Td>{will.createdAt ? new Date(will.createdAt).toLocaleString() : '-'}</Td>
                <Td>
                  <Button size="small" onClick={() => handleViewWillDetail(will.id)} disabled={isLoading}>상세보기</Button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableContainer>
    </PageContainer>
  );
};

export default DesignatedWillManagementPage;