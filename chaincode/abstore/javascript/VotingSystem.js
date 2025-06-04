/*
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
*/
const shim = require('fabric-shim');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

console.log('Starting VotingSystem.js...');

class VotingSystem {

  async Init(stub) {
    console.info('Init called - using alternative approach');
    // 아무것도 하지 않고 undefined 반환 (fabric-shim이 자동 처리)
    return shim.success();
  }

  // Init 대신 일반 함수로 초기화 처리
  async initializeVotingSystem(stub, args) {
    console.info('========= Initialize Voting System =========');
    try {
      const votingActive = {
        isActive: true,
        totalVoters: 0,
        totalVotes: 0,
        initializedAt: new Date().toISOString()
      };
      
      await stub.putState('votingActive', Buffer.from(JSON.stringify(votingActive)));
      console.info('Voting system initialized successfully');
      
      return Buffer.from(JSON.stringify({
        message: '투표 시스템이 성공적으로 초기화되었습니다.',
        status: 'success'
      }));
    } catch (error) {
      console.error('Initialize error:', error);
      throw new Error(`초기화 실패: ${error.message}`);
    }
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
  hashResidentNumber(partialSSN){
    return crypto.createHash('sha256').update(partialSSN).digest('hex');
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
      throw new Error(`Candidate ${candidateId} is already registered`);
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

  //유권자 등록 함수
  async registerVoter(stub, args) {
    console.info('========= Register Voter Start =========');
    if (args.length !== 2) {
      throw new Error('Incorrect number of arguments. Expecting 2 (name, residentNumberLast7)');
    }
    
    const name = args[0];
    const residentNumberLast7 = args[1];
    
    console.info('Received residentNumberLast7:', residentNumberLast7, 'name:', name);

    // 입력 검증
    if (!name || !residentNumberLast7) {
      throw new Error('residentNumberLast7 and name cannot be empty');
    }

    const hashedResident = this.hashResidentNumber(residentNumberLast7);
    const voterKey = `voter_${name}_${hashedResident}`;

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
      try {
        console.info('Parsed votingStatus:', votingStatus);
      } catch (parseError) {
        console.error('Failed to parse votingActive:', parseError);
        throw new Error(`Failed to parse votingActive state: ${parseError.message}`);
      }

      if (!votingStatus.isActive) {
        throw new Error('투표가 종료되어 더 이상 유권자 등록이 불가능합니다.');
      }

      const voter = {
        docType: 'voter',
        id: voterKey,
        name: name,
        hashedResident: hashedResident,
        hasVoted: false,
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

  //투표 함수
  // 유권자 ID와 후보자 ID를 인자로 받아 투표를 처리
  async vote(stub, args) {
  console.info('========= Vote by Name Start =========');
  if (args.length !== 3) {
    throw new Error('Incorrect number of arguments. Expecting 3 (voterName, candidateName, residentNumberLast7)');
  }

  const voterName = args[0];
  const residentNumberLast7 = args[1];
  const candidateName = args[2];

  if (!voterName || !residentNumberLast7 || !candidateName) {
    throw new Error('voterName or candidateName or residentNumberLast7 cannot be empty');
  }

  const hashedResident = this.hashResidentNumber(residentNumberLast7);
  const voterKey = `voter_${voterName}_${hashedResident}`;

  const votingStatusAsBytes = await stub.getState('votingActive');
  if (!votingStatusAsBytes || votingStatusAsBytes.length === 0) {
    throw new Error('votingActive state not found');
  }

  const votingStatus = JSON.parse(votingStatusAsBytes.toString());
  if (!votingStatus.isActive) {
    throw new Error('투표가 이미 종료되었습니다.');
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
  voter.votedFor = candidate.id;
  voter.votedAt = new Date().toISOString();
  await stub.putState(voterKey, Buffer.from(JSON.stringify(voter)));

  votingStatus.totalVotes += 1;
  await stub.putState('votingActive', Buffer.from(JSON.stringify(votingStatus)));

  console.info('========= Vote by Name Complete =========');
  return Buffer.from(JSON.stringify({
    message: `유권자 ${voter.name}가 ${candidate.name} 후보자에게 성공적으로 투표했습니다.`,
    candidateName: candidate.name,
    candidateVotes: candidate.voteCount
  }));
}

  async endVoting(stub, args) {
    console.info('========= End Voting Start =========');
    if (args.length !== 0) {
      throw new Error('Incorrect number of arguments. Expecting 0');
    }
    
    const votingStatusAsBytes = await stub.getState('votingActive');
    if (!votingStatusAsBytes || votingStatusAsBytes.length === 0) {
      throw new Error('votingActive state not found');
    }
    
    const votingStatus = JSON.parse(votingStatusAsBytes.toString());
    if (!votingStatus.isActive) {
      throw new Error('투표가 이미 종료되었습니다.');
    }

    votingStatus.isActive = false;
    votingStatus.endedAt = new Date().toISOString();
    await stub.putState('votingActive', Buffer.from(JSON.stringify(votingStatus)));
    
    console.info('========= End Voting Complete =========');
    const participationRate = votingStatus.totalVoters > 0 ? 
      ((votingStatus.totalVotes / votingStatus.totalVoters) * 100).toFixed(2) + '%' : '0.00%';
      
    return Buffer.from(JSON.stringify({
      message: '투표가 성공적으로 종료되었습니다.',
      totalVoters: votingStatus.totalVoters,
      totalVotes: votingStatus.totalVotes,
      participationRate: participationRate
    }));
  }

  // 투표결과를 가져오는 함수
  // getStateByRange를 사용하여 모든 상태를 순회
  async getVotingResults(stub, args) {
    console.info('========= Get Voting Results Start =========');
    if (args.length !== 0) {
      throw new Error('Incorrect number of arguments. Expecting 0');
    }
    
    const votingStatusAsBytes = await stub.getState('votingActive');
    if (!votingStatusAsBytes || votingStatusAsBytes.length === 0) {
      throw new Error('votingActive state not found');
    }
    
    const votingStatus = JSON.parse(votingStatusAsBytes.toString());
    
    // getStateByRange를 사용하여 모든 상태를 순회
    const iterator = await stub.getStateByRange('', '');
    const participationRate = votingStatus.totalVoters > 0 ? 
      ((votingStatus.totalVotes / votingStatus.totalVoters) * 100).toFixed(2) + '%' : '0.00%';
      
    const results = {
      isActive: votingStatus.isActive,
      totalVoters: votingStatus.totalVoters,
      totalVotes: votingStatus.totalVotes,
      participationRate: participationRate,
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

    const hashedResident = this.hashResidentNumber(residentNumberLast7);
    const voterKey = `voter_${voterName}_${hashedResident}`;
    
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
}

console.log('Starting VotingSystem...');
shim.start(new VotingSystem());