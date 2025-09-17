/*
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
*/

const shim = require('fabric-shim');
const crypto = require('crypto');

console.log('Starting VotingSystem.js...');

class VotingSystem {

  async Init(stub) {
    console.info('Init called - using alternative approach');
    // 아무것도 하지 않고 undefined 반환 (fabric-shim이 자동 처리)
    return shim.success(Buffer.from('{"message": "Init called successfully"}'));
  }

  // Init 대신 일반 함수로 초기화 처리, 투표 시간 설정
  async initializeVotingSystem(stub, args) {
    console.info('========= Initialize Voting System =========');
    
    // 투표 시간 필수 입력으로 변경
    if (args.length !== 1) {
      throw new Error('투표 시간(분)을 반드시 입력해야 합니다. 사용법: initializeVotingSystem(분)');
    }
    
    const durationMinutes = parseInt(args[0]);
    
    // 입력값 검증
    if (isNaN(durationMinutes)) {
      throw new Error('투표 시간은 숫자로 입력해야 합니다.');
    }
    
    if (durationMinutes < 1) {
      throw new Error('투표 시간은 최소 1분 이상이어야 합니다.');
    }
    
    if (durationMinutes > 1440) { // 24시간 제한
      throw new Error('투표 시간은 최대 1440분(24시간)을 초과할 수 없습니다.');
    }
    
    try {
      const now = new Date();
      const endTime = new Date(now.getTime() + (durationMinutes * 60 * 1000));
      
      const votingActive = {
        isActive: true,
        totalVoters: 0,
        totalVotes: 0,
        initializedAt: now.toISOString(), // 투표 시작 시간
        scheduledEndTime: endTime.toISOString(), // 투표 종료 시간
        durationMinutes: durationMinutes,
        autoEndEnabled: true
      };
      
      await stub.putState('votingActive', Buffer.from(JSON.stringify(votingActive)));
      console.info('Voting system initialized successfully');
      console.info(`투표가 ${durationMinutes}분 후인 ${endTime.toLocaleString()}에 자동 종료됩니다.`);
      
      return Buffer.from(JSON.stringify({
        message: `투표 시스템이 ${durationMinutes}분 동안 진행되도록 설정하였습니다.`,
        status: 'success',
        durationMinutes: durationMinutes,
        scheduledEndTime: endTime.toISOString(),
        scheduledEndTimeLocal: endTime.toLocaleString()
      }));
    } catch (error) {
      console.error('Initialize error:', error);
      throw new Error(`초기화 실패: ${error.message}`);
    }
  }

  // 투표 시간 자동 체크 및 종료 함수
  async checkAndAutoEndVoting(stub, votingStatus) {
    if (!votingStatus.isActive || !votingStatus.autoEndEnabled || !votingStatus.scheduledEndTime) {
      return votingStatus; // 변경 없음
    }
    
    const now = new Date();
    const endTime = new Date(votingStatus.scheduledEndTime);
    
    if (now >= endTime) {
      console.info('자동 투표 종료 시간 도달:', endTime.toISOString());
      
      votingStatus.isActive = false;
      votingStatus.endedAt = now.toISOString();
      votingStatus.endReason = 'auto'; // 자동 종료임을 표시
      
      await stub.putState('votingActive', Buffer.from(JSON.stringify(votingStatus)));
      console.info('투표가 자동으로 종료되었습니다.');
    } 
    
    return votingStatus;
  }

  async Invoke(stub) {
    let ret = stub.getFunctionAndParameters();
    console.info('Invoke called with:', ret);
    
    let method = this[ret.fcn];
    if (!method) {
      console.log('no method of name:' + ret.fcn + ' found');
      return shim.success(); // ABstore 패턴: 에러 대신 success 반환
    }
    
    try {
      let payload = await method.apply(this, [stub, ret.params]);
      return shim.success(payload);
    } catch (err) {
      console.log('Invoke error:', err);
      return shim.error(err.toString()); // 문자열로 변환
    }
  }

  // 해시함수
  hashResidentNumber(data){
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  //상품 등록 함수
  async registerProduct(stub, args) {
    console.info('========= Register Product Start =========');
    if (args.length !== 2) {
      throw new Error('Incorrect number of arguments. Expecting 2 (productId, name)');
    }
    const productId = args[0];
    const productName = args[1];

    // 입력 검증
    if (!productId || !productName) {
      throw new Error('productId and name cannot be empty');
    }
    const productAsBytes = await stub.getState(productId);
    if (productAsBytes && productAsBytes.length > 0) {
      throw new Error(`Product ${productId} is already registered`);
    }
    const product = {
      docType: 'product',
      productId: productId,
      productName: productName,
      productBalance: 0,
      registeredAt: new Date().toISOString()
    };
    await stub.putState(productId, Buffer.from(JSON.stringify(product)));
    console.info('========= Register Product Complete =========');
    // 안전한 Buffer 반환
    const response = { 
      message: `상품 ${productName}가 성공적으로 등록되었습니다.` 
    };
    return Buffer.from(JSON.stringify(response));
  }

  //후보자 등록 함수
  async registerCandidate(stub, args) {
    console.info('========= Register Candidate Start =========');
    if (args.length !== 3) {
      throw new Error('Incorrect number of arguments. Expecting 3 (candidateId, name, partyName)');
    }
    
    const candidateId = args[0];
    const partyName = args[1];
    const name = args[2];
    
    // 입력 검증
    if (!candidateId || !name || !partyName) {
      throw new Error('빈칸이 있으면 안됩니다!');
    }
    
    const candidateAsBytes = await stub.getState(candidateId);
    if (candidateAsBytes && candidateAsBytes.length > 0) {
      throw new Error(`${candidateId}번 후보는 이미 등록되어 있습니다!`);
    }

    const candidate = {
      docType: 'candidate',
      id: candidateId,
      partyName: partyName,
      name: name,
      voteCount: 0,
      registeredAt: new Date().toISOString()
    };
    
    await stub.putState(candidateId, Buffer.from(JSON.stringify(candidate)));
    console.info('========= Register Candidate Complete =========');
    
    // 안전한 Buffer 반환
    const response = { 
      message: `후보자 ${name}(정당: ${partyName})가 성공적으로 등록되었습니다.` 
    };
    return Buffer.from(JSON.stringify(response));
  }


  //유권자 등록 함수, 투표 시간에 도달하면 자동 종료 체크 추가
  async registerVoter(stub, args) {
    console.info('========= Register Voter Start =========');
    if (args.length !== 3) {
      throw new Error('Incorrect number of arguments. Expecting 3 (name, residentNumberLast7, addr)');
    }
    
    const name = args[0];
    const residentNumberLast7 = args[1];
    const addr = args[2];
    
    console.info('Received residentNumberLast7:', residentNumberLast7, 'name:', name);

    // 입력 검증
    if (!name || !residentNumberLast7 || !addr) {
      throw new Error('residentNumberLast7 and name and addr cannot be empty');
    }

    const hashedName = name;
    const voterKey = `voter_${hashedName}_${residentNumberLast7}`;

    try {
      const voterAsBytes = await stub.getState(voterKey);
      if (voterAsBytes && voterAsBytes.length > 0) {
        throw new Error(`유권자 ${name}는(은) 이미 등록되어 있습니다.`);
      }

      const votingStatusAsBytes = await stub.getState('votingActive');
      if (!votingStatusAsBytes || votingStatusAsBytes.length === 0) {
        throw new Error('votingActive state not found. Initialize the ledger first.');
      }

      let votingStatus = JSON.parse(votingStatusAsBytes.toString());
      
      // 자동 종료 체크 (새로 추가)
      votingStatus = await this.checkAndAutoEndVoting(stub, votingStatus);
      
      if (!votingStatus.isActive) {
        const endReason = votingStatus.endReason === 'auto' ? '자동으로' : '수동으로';
        throw new Error(`투표가 ${endReason} 종료되어 더 이상 유권자 등록이 불가능합니다.`);
      }

      const voter = {
        docType: 'voter',
        id: voterKey,
        name: hashedName,
        hashedResident: residentNumberLast7,
        addr: addr,
        hasVoted: false,
        voterBalance: 0,
        registeredAt: new Date().toISOString()
      };
      
      await stub.putState(voterKey, Buffer.from(JSON.stringify(voter)));

      votingStatus.totalVoters += 1;
      await stub.putState('votingActive', Buffer.from(JSON.stringify(votingStatus)));
      
      console.info('========= Register Voter Complete =========');
      return Buffer.from(JSON.stringify({
        message: `유권자 ${name}님이 성공적으로 등록되었습니다.`
      }));
    } catch (error) {
      console.error('registerVoter error:', error);
      throw new Error(`Failed to register voter: ${error.message}`);
    }
  }

  //투표 함수 투표 시간에 도달하면 자동 종료 체크 추가
  // 유권자 이름과 주민등록번호 뒷자리 7자리로 투표
  async vote(stub, args) {
    console.info('========= Vote by Name Start =========');
    if (args.length !== 3) {
      throw new Error('Incorrect number of arguments. Expecting 3 (voterName, residentNumberLast7, candidateName)');
    }

    const voterName = args[0];
    const residentNumberLast7 = args[1];
    const candidateName = args[2];

    if (!voterName || !residentNumberLast7 || !candidateName) {
      throw new Error('voterName, residentNumberLast7, candidateName cannot be empty');
    }

    const hashedName = this.hashResidentNumber(voterName);
    const voterKey = `voter_${hashedName}_${residentNumberLast7}`;

    const votingStatusAsBytes = await stub.getState('votingActive');
    if (!votingStatusAsBytes || votingStatusAsBytes.length === 0) {
      throw new Error('votingActive state not found');
    }

    let votingStatus = JSON.parse(votingStatusAsBytes.toString());
    
    // 자동 종료 체크 (새로 추가)
    votingStatus = await this.checkAndAutoEndVoting(stub, votingStatus);
    
    if (!votingStatus.isActive) {
      const endReason = votingStatus.endReason === 'auto' ? '자동으로' : '수동으로';
      throw new Error(`투표가 ${endReason} 종료되었습니다.`);
    }

    const voterAsBytes = await stub.getState(voterKey);
    if (!voterAsBytes || voterAsBytes.length === 0) {
      throw new Error(`유권자 ${voterName}는 등록되지 않은 유권자입니다.`);
    }

    const voter = JSON.parse(voterAsBytes.toString());
    if (voter.hasVoted) {
      throw new Error(`유권자 ${voterName}는 이미 투표를 하였습니다.`);
    }

    //후보자 이름으로 찾기
    const iterator = await stub.getStateByRange('', '');
    let candidate = null;
    let candidateKey = null;
    while (true) {
      const res = await iterator.next();
      if (res.value && res.value.value.toString()) {
        const record = JSON.parse(res.value.value.toString('utf8'));
        if (record.docType === 'candidate' && record.name === candidateName) {
          candidate = record;
          candidateKey = res.value.key;
          break;
        }
      }
      if (res.done) break;
    }
    await iterator.close();

    if (!candidate) throw new Error(`등록되지 않은 후보자 이름: ${candidateName}`);

    candidate.voteCount += 1;
    await stub.putState(candidateKey, Buffer.from(JSON.stringify(candidate)));

    voter.hasVoted = true;
    // voter.votedFor = candidate.id;
    voter.votedAt = new Date().toISOString();
    voter.voterBalance += 1; // 유권자에게 보상 지급
    await stub.putState(voterKey, Buffer.from(JSON.stringify(voter)));

    votingStatus.totalVotes += 1;
    await stub.putState('votingActive', Buffer.from(JSON.stringify(votingStatus)));

    console.info('========= Vote by Name Complete =========');
    return Buffer.from(JSON.stringify({
      message: `유권자 ${voter.name}가 ${candidate.name} 후보자에게 성공적으로 투표했습니다. 토큰 1개가 지급되었습니다.`,
      candidateName: candidate.name,
      candidateVotes: candidate.voteCount,
      voterBalance: voter.voterBalance
    }));
  }

  // 수동 투표 종료 함수
  async endVoting(stub, args) {
    console.info('========= End Voting Start =========');
    if (args.length !== 0) {
      throw new Error('Incorrect number of arguments. Expecting 0');
    }
    
    const votingStatusAsBytes = await stub.getState('votingActive');
    if (!votingStatusAsBytes || votingStatusAsBytes.length === 0) {
      throw new Error('votingActive state not found');
    }
    
    let votingStatus = JSON.parse(votingStatusAsBytes.toString());
    
    // 자동 종료 체크
    votingStatus = await this.checkAndAutoEndVoting(stub, votingStatus);
    
    if (!votingStatus.isActive) {
      const endReason = votingStatus.endReason === 'auto' ? '자동으로' : '이미';
      throw new Error(`투표가 ${endReason} 종료되었습니다.`);
    }

    votingStatus.isActive = false;
    votingStatus.endedAt = new Date().toISOString();
    votingStatus.endReason = 'manual'; // 수동 종료임을 표시
    await stub.putState('votingActive', Buffer.from(JSON.stringify(votingStatus)));
    
    console.info('========= End Voting Complete =========');
    const participationRate = votingStatus.totalVoters > 0 ? 
      ((votingStatus.totalVotes / votingStatus.totalVoters) * 100).toFixed(2) + '%' : '0.00%';
      
    return Buffer.from(JSON.stringify({
      message: '투표가 수동으로 종료되었습니다.',
      totalVoters: votingStatus.totalVoters,
      totalVotes: votingStatus.totalVotes,
      participationRate: participationRate,
      endReason: 'manual'
    }));
  }

  // 투표 시간 연장 함수 (새로 추가)
  async extendVotingTime(stub, args) {
    console.info('========= Extend Voting Time Start =========');
    if (args.length !== 1) {
      throw new Error('Incorrect number of arguments. Expecting 1 (additionalMinutes)');
    }
    
    const additionalMinutes = parseInt(args[0]);
    if (isNaN(additionalMinutes) || additionalMinutes < 1) {
      throw new Error('연장 시간은 1분 이상이어야 합니다.');
    }
    
    const votingStatusAsBytes = await stub.getState('votingActive');
    if (!votingStatusAsBytes || votingStatusAsBytes.length === 0) {
      throw new Error('votingActive state not found');
    }
    
    let votingStatus = JSON.parse(votingStatusAsBytes.toString());
    
    // 자동 종료 체크
    votingStatus = await this.checkAndAutoEndVoting(stub, votingStatus);
    
    if (!votingStatus.isActive) {
      throw new Error('종료된 투표는 연장할 수 없습니다.');
    }
    
    if (!votingStatus.scheduledEndTime) {
      throw new Error('자동 종료가 설정되지 않은 투표는 연장할 수 없습니다.');
    }
    
    const currentEndTime = new Date(votingStatus.scheduledEndTime);
    const newEndTime = new Date(currentEndTime.getTime() + (additionalMinutes * 60 * 1000));
    
    votingStatus.scheduledEndTime = newEndTime.toISOString();
    votingStatus.durationMinutes += additionalMinutes;
    votingStatus.extendedAt = new Date().toISOString();
    
    await stub.putState('votingActive', Buffer.from(JSON.stringify(votingStatus)));
    
    console.info('========= Extend Voting Time Complete =========');
    return Buffer.from(JSON.stringify({
      message: `투표 시간이 ${additionalMinutes}분 연장되었습니다.`,
      newEndTime: newEndTime.toISOString(),
      totalDuration: votingStatus.durationMinutes
    }));
  }

  // 상품 구매 함수,자동 종료 체크 추가
  async purchaseProduct(stub, args) {
    console.info('========= Purchase Product Start =========');
    if(args.length !== 3) {
      throw new Error('Incorrect number of arguments. Expecting 3 (productName, voterName, residentNumberLast7)');
    }
    const productName = args[0];
    const voterName = args[1];
    const residentNumberLast7 = args[2];

    if (!productName || !voterName || !residentNumberLast7) {
      throw new Error('productName, voterName, and residentNumberLast7 cannot be empty');
    }
    
    const hashedName = this.hashResidentNumber(voterName);
    const voterKey = `voter_${hashedName}_${residentNumberLast7}`;
    
    const voterAsBytes = await stub.getState(voterKey);
    if (!voterAsBytes || voterAsBytes.length === 0) {
      throw new Error(`투표자 ${voterName}는 등록되지 않은 투표자입니다.`);
    }
    
    const voter = JSON.parse(voterAsBytes.toString());
    if(!voter.hasVoted) {
      throw new Error(`투표자 ${voterName}는 아직 투표하지 않았습니다. 상품 구매는 투표 후 가능합니다.`);
    }
    if (voter.voterBalance <= 0) {
      throw new Error(`투표자 ${voterName}는 토큰이 없습니다. 현재 토큰: ${voter.voterBalance}개`);
    }

    // 상품 이름으로 찾기
    const iterator = await stub.getStateByRange('', '');
    let product = null;
    let productKey = null;
    
    try {
      while (true) {
        const res = await iterator.next();
        if (res.value && res.value.value.toString()) {
          try {
            const record = JSON.parse(res.value.value.toString('utf8'));
            if (record.docType === 'product' && record.productName === productName) {
              product = record;
              productKey = res.value.key;
              break;
            }
          } catch (parseError) {
            console.log('Skipping non-JSON record:', res.value.key);
          }
        }
        if (res.done) break;
      }
    } finally {
      await iterator.close();
    }
    
    if (!product) {
      throw new Error(`상품 '${productName}'는 등록되지 않은 상품입니다.`);
    }
    
    product.productBalance += 1; // 상품 구매시 1 증가
    voter.voterBalance -= 1; // 유권자 토큰 차감
    voter.lastPurchase = {
      productName: productName,
      purchasedAt: new Date().toISOString()
    };
    
    await stub.putState(voterKey, Buffer.from(JSON.stringify(voter)));
    await stub.putState(productKey, Buffer.from(JSON.stringify(product)));

    console.info('========= Purchase Product Complete =========');
    return Buffer.from(JSON.stringify({
      message: `투표자 ${voterName}가 상품 ${product.productName}을(를) 성공적으로 구매했습니다.`,
      productName: product.productName,
      productPurchaseCount: product.productBalance,
      remainingTokens: voter.voterBalance
    }));
  }

  // 투표결과를 가져오는 함수,자동 종료 체크 추가
  async getVotingResults(stub, args) {
    console.info('========= Get Voting Results Start =========');
    if (args.length !== 0) {
      throw new Error('Incorrect number of arguments. Expecting 0');
    }
    
    const votingStatusAsBytes = await stub.getState('votingActive');
    if (!votingStatusAsBytes || votingStatusAsBytes.length === 0) {
      throw new Error('votingActive state not found');
    }
    
    let votingStatus = JSON.parse(votingStatusAsBytes.toString());
    
    // 자동 종료 체크
    votingStatus = await this.checkAndAutoEndVoting(stub, votingStatus);
    
    // getStateByRange를 사용하여 모든 상태를 순회
    const iterator = await stub.getStateByRange('', '');
    const participationRate = votingStatus.totalVoters > 0 ? 
      ((votingStatus.totalVotes / votingStatus.totalVoters) * 100).toFixed(2) + '%' : '0.00%';
      
    const results = {
      isActive: votingStatus.isActive,
      totalVoters: votingStatus.totalVoters,
      totalVotes: votingStatus.totalVotes,
      participationRate: participationRate,
      initializedAt: votingStatus.initializedAt || null,
      scheduledEndTime: votingStatus.scheduledEndTime || null,
      durationMinutes: votingStatus.durationMinutes || null,
      endReason: votingStatus.endReason || null,
      candidates: []
    };
    
    try {
      while (true) {
        const res = await iterator.next();
        if (res.value) {
          try {
            const key = res.value.key;
            const valueAsString = res.value.value.toString('utf8');
            const record = JSON.parse(valueAsString);
            
            // docType이 'candidate'인 레코드만 필터링
            if (record.docType === 'candidate') {
              const votePercentage = votingStatus.totalVotes > 0 ?
                ((record.voteCount / votingStatus.totalVotes) * 100).toFixed(2) + '%' : '0.00%';
              results.candidates.push({
                id: record.id,
                name: record.name,
                partyName: record.partyName,
                voteCount: record.voteCount,
                votePercentage: votePercentage
              });
            }
          } catch (parseError) {
            // JSON 파싱 실패한 경우 (votingActive 등) 무시하고 계속
            console.log('Skipping non-JSON record:', res.value.key);
          }
        }
        if (res.done) {
          break;
        }
      }
    } finally {
      await iterator.close();
    }
    
    // 득표수 기준으로 내림차순 정렬
    results.candidates.sort((a, b) => b.voteCount - a.voteCount);
    console.info('========= Get Voting Results Complete =========');
    return Buffer.from(JSON.stringify(results));
  }

  // 유권자 정보 가져오기
  async getVoterInfo(stub, args) {
    console.info('========= Get Voter Info Start =========');
    if (args.length !== 2) {
      throw new Error('Incorrect number of arguments. Expecting 2 (voterName, residentNumberLast7)');
    }
    
    const voterName = args[0];
    const residentNumberLast7 = args[1];

    if (!voterName || !residentNumberLast7) {
      throw new Error('빈칸을 채워주세요!');
    }

    const hashedName = this.hashResidentNumber(voterName);
    const voterKey = `voter_${hashedName}_${residentNumberLast7}`;
    
    const voterAsBytes = await stub.getState(voterKey);
    if (!voterAsBytes || voterAsBytes.length === 0) {
      throw new Error(`유권자 ${voterName}는 등록되지 않은 유권자입니다.`);
    }
    
    console.info('========= Get Voter Info Complete =========');
    return voterAsBytes;
  }

  // 특정 후보자 정보 가져오기
  async getCandidateInfo(stub, args) {
    console.info('========= Get Candidate Info Start =========');
    if (args.length !== 1) {
      throw new Error('Incorrect number of arguments. Expecting 1 (candidateId)');
    }
    
    const candidateId = args[0];
    if (!candidateId) {
      throw new Error('candidateId cannot be empty');
    }
    
    const candidateAsBytes = await stub.getState(candidateId);
    if (!candidateAsBytes || candidateAsBytes.length === 0) {
      throw new Error(`후보자 ${candidateId} 아이디는 등록되지 않은 후보자입니다.`);
    }
    
    console.info('========= Get Candidate Info Complete =========');
    return candidateAsBytes;
  }


  // 모든 후보자 정보를 가져오는 함수
  async getAllCandidates(stub, args) {
    console.info('========= Get All Candidates Start =========');
    if (args.length !== 0) {
      throw new Error('Incorrect number of arguments. Expecting 0');
    }
    
    const iterator = await stub.getStateByRange('', '');
    const candidates = [];
    
    try {
      while (true) {
        const res = await iterator.next();
        if (res.value && res.value.value.toString()) {
          const record = JSON.parse(res.value.value.toString('utf8'));
          if (record.docType === 'candidate') {
            candidates.push(record);
          }
        }
        if (res.done) {
          break;
        }
      }
    } finally {
      await iterator.close();
    }
    
    console.info('========= Get All Candidates Complete =========');
    return Buffer.from(JSON.stringify(candidates));
  }

  // 후보자 지갑을 삭제하는 함수
  async deleteCandidate(stub, args) {
    console.info('========= Delete Candidate Wallet Start =========');
    if (args.length !== 1) {
      throw new Error('Incorrect number of arguments. Expecting 1 (candidateId)');
    }
    
    const candidateId = args[0];
    if (!candidateId) {
      throw new Error('candidateId cannot be empty');
    }
    
    const candidateAsBytes = await stub.getState(candidateId);
    if (!candidateAsBytes || candidateAsBytes.length === 0) {
      throw new Error(`$ 기호번호 {candidateId}번 후보는 이미 삭제되어 있습니다!`);
    }
    
    await stub.deleteState(candidateId);
    
    console.info('========= Delete Candidate Wallet Complete =========');
    return Buffer.from(JSON.stringify({
      message: ` 기호번호 ${candidateId}번 후보는 성공적으로 삭제되었습니다.`
    }));
  }

  //모든 상품 정보를 가져오는 함수
  async getAllProducts(stub, args) {
    console.info('========= Get All Products Start =========');
    if (args.length !== 0) {
      throw new Error('Incorrect number of arguments. Expecting 0');
    }
    
    const iterator = await stub.getStateByRange('', '');
    const products = [];
    
    try {
      while (true) {
        const res = await iterator.next();
        if (res.value && res.value.value.toString()) {
          const record = JSON.parse(res.value.value.toString('utf8'));
          if (record.docType === 'product') {
            products.push(record);
          }
        }
        if (res.done) {
          break;
        }
      }
    } finally {
      await iterator.close();
    }
    
    console.info('========= Get All Products Complete =========');
    return Buffer.from(JSON.stringify(products));
  }
  // 상품 삭제 함수
async deleteProduct(stub, args) {
  console.info('========= Delete Product Start =========');

  // 인자 개수 확인
  if (args.length !== 1) {
    throw new Error('Incorrect number of arguments. Expecting 1');
  }

  const productId = args[0];  // 삭제할 상품의 ID

  // 해당 상품 상태 가져오기
  const productAsBytes = await stub.getState(productId);

  // 상품이 존재하지 않으면 오류 발생
  if (!productAsBytes || productAsBytes.toString().length <= 0) {
    throw new Error(`Product with ID ${productId} does not exist`);
  }

  // 상품 삭제
  // await stub.deleteState(productId);
  // console.info(`Product with ID ${productId} has been deleted`);

  // console.info('========= Delete Product Complete =========');
}

}

console.log('Starting VotingSystem...');
shim.start(new VotingSystem());