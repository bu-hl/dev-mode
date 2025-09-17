'use strict';

const shim = require('fabric-shim');
const util = require('util');

const LoanShim = class {

  // =========================
  // Init: 체인코드 초기화 엔트리포인트
  // =========================
  async Init(stub) {
    console.info('========= LoanShim Init =========');
    try {
      const ADMIN_WALLET_KEY = 'ADMIN_WALLET';

      // 1) 원장에 ADMIN_WALLET이 이미 있는지 확인
      let adminBytes = await stub.getState(ADMIN_WALLET_KEY);
      if (adminBytes && adminBytes.length > 0) {
        console.info(`ADMIN_WALLET already exists → 잔액 유지: ${adminBytes.toString()}`);
        return shim.success();
      }

      // 2) ADMIN_WALLET이 없으면, balance 0으로 신규 생성
      const adminWallet = {
        address: ADMIN_WALLET_KEY,
        balance: 0,
        createdAt: Math.floor(Date.now() / 1000),
      };

      await stub.putState(ADMIN_WALLET_KEY, Buffer.from(JSON.stringify(adminWallet)));
      console.info('ADMIN_WALLET created with balance=0');

      return shim.success();
    } catch (err) {
      console.error('Init 에러:', err);
      return shim.error(err);
    }
  }

  // =========================
  // Invoke: 트랜잭션 엔트리포인트
  //  - stub.getFunctionAndParameters() 로 호출된 함수 이름(ret.fcn)과 매개변수(ret.params)를 가져온 뒤,
  //    this[함수명] 으로 해당 메서드를 동적으로 호출
  // =========================
  async Invoke(stub) {
    let ret = stub.getFunctionAndParameters();
    console.info('Invoke called with:', ret);

    // ret.fcn 에 해당하는 메서드를 클래스에서 찾음
    let method = this[ret.fcn];
    if (!method) {
      console.log(`No method named "${ret.fcn}" found`);
      return shim.success(); // 잘못된 함수명이라도 에러 대신 성공으로 리턴하도록
    }
    try {
      // 실제 비즈니스 로직 함수 호출. payload는 Buffer 또는 문자열 형태
      let payload = await method(stub, ret.params);
      return shim.success(payload);
    } catch (err) {
      console.error(err);
      return shim.error(err);
    }
  }

  // =========================
  // CreateWallet: 지갑 생성
  // args = [address, initialBalance]
  // =========================
  async CreateWallet(stub, args) {
    if (args.length !== 2) {
      throw new Error('Incorrect number of arguments. Expecting 2: [address, initialBalance]');
    }
    const address = args[0];
    const initialBalanceStr = args[1];

    // 이미 존재하는 지갑인지 확인
    let walletBytes = await stub.getState(address);
    if (walletBytes && walletBytes.length > 0) {
      throw new Error(`wallet ${address} already exists`);
    }

    // 초기 잔액을 정수로 변환
    let balance = 0;
    if (initialBalanceStr !== '') {
      balance = parseInt(initialBalanceStr, 10);
      if (isNaN(balance)) {
        throw new Error(`invalid initial balance: ${initialBalanceStr}`);
      }
    }

    // Wallet 구조체와 동일하게 JSON 객체 생성
    const wallet = {
      address: address,
      balance: balance,
      createdAt: Math.floor(Date.now() / 1000) // 초 단위 타임스탬프
    };

    // 상태 저장
    await stub.putState(address, Buffer.from(JSON.stringify(wallet)));
    return;
  }

  // =========================
  // GetWalletBalance: 지갑 잔액 조회
  // args = [address]
  // 리턴: balance (int)을 Buffer로 반환
  // =========================
  async GetWalletBalance(stub, args) {
    if (args.length !== 1) {
      throw new Error('Incorrect number of arguments. Expecting 1: [address]');
    }
    const address = args[0];

    let walletBytes = await stub.getState(address);
    if (!walletBytes || walletBytes.length === 0) {
      throw new Error(`wallet ${address} does not exist`);
    }
    const wallet = JSON.parse(walletBytes.toString());
    // balance 자체를 문자열 Buffer로 리턴
    return Buffer.from(wallet.balance.toString());
  }

  // =========================
  // CreateLoanRequest: 개별 자금 대출 요청 생성
  // args = [id, lender, borrower, amount, durationDays, interestRate]
  // =========================
  async CreateLoanRequest(stub, args) {
    if (args.length !== 6) {
      throw new Error('Incorrect number of arguments. Expecting 6: [id, lender, borrower, amount, durationDays, interestRate]');
    }
    const id = args[0];
    const lender = args[1];
    const borrower = args[2];
    const amount = parseInt(args[3], 10);
    const durationDays = parseInt(args[4], 10);
    const interestRate = parseFloat(args[5]);

    if (isNaN(amount) || isNaN(durationDays) || isNaN(interestRate)) {
      throw new Error('Amount, durationDays, interestRate must be integers');
    }

    // 중복 대출 요청 ID 확인
    let existingLoanBytes = await stub.getState(id);
    if (existingLoanBytes && existingLoanBytes.length > 0) {
      throw new Error(`loan request ${id} already exists`);
    }

    // lender 잔액 확인
    let lenderWalletBytes = await stub.getState(lender);
    if (!lenderWalletBytes || lenderWalletBytes.length === 0) {
      throw new Error(`lender wallet ${lender} does not exist`);
    }
    const lenderWallet = JSON.parse(lenderWalletBytes.toString());
    if (lenderWallet.balance < amount) {
      throw new Error(`insufficient balance for lender ${lender}`);
    }

    // LoanRequest 구조체와 동일하게 JSON 객체 생성
    const loan = {
      id: id,
      poolId: '',              // 개별 자금 대출이므로 빈 문자열
      lender: lender,
      borrower: borrower,
      amount: amount,
      durationDays: durationDays,
      interestRate: interestRate,
      status: 'Pending',
      startTime: 0,
      endTime: 0
    };

    await stub.putState(id, Buffer.from(JSON.stringify(loan)));
    return;
  }

  // =========================
  // ApproveLoanRequest: 대출 요청 승인(체결) 및 수수료 이체
  // args = [id]
  // =========================
  async ApproveLoanRequest(stub, args) {
    if (args.length !== 1) {
      throw new Error('Incorrect number of arguments. Expecting 1: [id]');
    }
    const id = args[0];

    // 1) 대출 요청 불러오기
    let loanBytes = await stub.getState(id);
    if (!loanBytes || loanBytes.length === 0) {
      throw new Error(`loan request ${id} does not exist`);
    }
    let loanObj  = JSON.parse(loanBytes.toString());

    if (loanObj.status !== 'Pending') {
      throw new Error(`loan request ${id} is not pending`);
    }

    // 2) 수수료 계산 (0.1% = 0.001)
    const feeRate = 0.001;
    const feeAmount = loanObj.amount * feeRate;

    // 3) 관리자 지갑 조회 및 잔액 증가
    const ADMIN_WALLET_KEY = 'ADMIN_WALLET';
    let adminWalletBytes = await stub.getState(ADMIN_WALLET_KEY);
    if (!adminWalletBytes || adminWalletBytes.length === 0) {
      throw new Error('ADMIN_WALLET이 존재하지 않습니다');
    }
    let adminWalletObj = JSON.parse(adminWalletBytes.toString());
    adminWalletObj.balance += feeAmount;
    await stub.putState(ADMIN_WALLET_KEY, Buffer.from(JSON.stringify(adminWalletObj)));
    console.info(`수수료 ${feeAmount} 이체 → ADMIN_WALLET (새 잔액=${adminWalletObj.balance})`);

    // 4) 채권자(lender) 지갑 조회 및 원금 차감
    let lenderWalletBytes = await stub.getState(loanObj.lender);
    if (!lenderWalletBytes || lenderWalletBytes.length === 0) {
      throw new Error(`lender wallet ${loanObj.lender} does not exist`);
    }
    let lenderWalletObj = JSON.parse(lenderWalletBytes.toString());
    lenderWalletObj.balance -= loanObj.amount;
    await stub.putState(loanObj.lender, Buffer.from(JSON.stringify(lenderWalletObj)));
    console.info(`lender ${loanObj.lender} → 잔액 차감 ${loanObj.amount} (새 잔액=${lenderWalletObj.balance})`);

    // 5) 차용자(borrower) 지갑 조회 및 (원금 – 수수료) 지급
    let borrowerWalletBytes = await stub.getState(loanObj.borrower);
    if (!borrowerWalletBytes || borrowerWalletBytes.length === 0) {
      throw new Error(`borrower wallet ${loanObj.borrower} does not exist`);
    }
    let borrowerWalletObj = JSON.parse(borrowerWalletBytes.toString());
    const amountToBorrower = loanObj.amount - feeAmount;
    borrowerWalletObj.balance += amountToBorrower;
    await stub.putState(loanObj.borrower, Buffer.from(JSON.stringify(borrowerWalletObj)));
    console.info(`borrower ${loanObj.borrower} → 잔액 증가 ${amountToBorrower} (새 잔액=${borrowerWalletObj.balance})`);

    // 6) 대출 상태 업데이트
    loanObj.status = 'Active';
    loanObj.startTime = Math.floor(Date.now() / 1000);
    loanObj.endTime = Math.floor((Date.now() + loanObj.durationDays * 24 * 60 * 60 * 1000) / 1000);
    loanObj.feeCharged = feeAmount; // 실제 부과된 수수료 기록
    await stub.putState(id, Buffer.from(JSON.stringify(loanObj)));
    console.info(`ApproveLoanRequest: ${id} 승인 완료 (FeeCharged=${feeAmount})`);

    return;
  }

  // =========================
  // DenyLoanRequest: 개별 자금 대출 거절
  // args = [id]
  // =========================
  async DenyLoanRequest(stub, args) {
    if (args.length !== 1) {
      throw new Error('Incorrect number of arguments. Expecting 1: [id]');
    }
    const id = args[0];

    let loanBytes = await stub.getState(id);
    if (!loanBytes || loanBytes.length === 0) {
      throw new Error(`loan request ${id} does not exist`);
    }
    let loan = JSON.parse(loanBytes.toString());

    if (loan.status !== 'Pending') {
      throw new Error(`loan request ${id} is not pending`);
    }

    loan.status = 'Denied';
    await stub.putState(id, Buffer.from(JSON.stringify(loan)));
    return;
  }

  // =========================
  // RepayLoan: 개별 자금 대출 상환
  // args = [id]
  // =========================
  async RepayLoan(stub, args) {
    if (args.length !== 1) {
      throw new Error('Incorrect number of arguments. Expecting 1: [id]');
    }
    const id = args[0];

    let loanBytes = await stub.getState(id);
    if (!loanBytes || loanBytes.length === 0) {
      throw new Error(`loan request ${id} does not exist`);
    }
    let loan = JSON.parse(loanBytes.toString());

    if (loan.status !== 'Active') {
      throw new Error(`loan request ${id} is not active`);
    }

    // 이자 계산: (amount * interestRate * durationDays) / (365 * 100)
    const interest = Math.floor((loan.amount * loan.interestRate * loan.durationDays) / (365 * 100));
    const totalAmount = loan.amount + interest;

    // borrower 지갑 조회 및 잔액 확인
    let borrowerWalletBytes = await stub.getState(loan.borrower);
    if (!borrowerWalletBytes || borrowerWalletBytes.length === 0) {
      throw new Error(`borrower wallet ${loan.borrower} does not exist`);
    }
    let borrowerWallet = JSON.parse(borrowerWalletBytes.toString());
    if (borrowerWallet.balance < totalAmount) {
      throw new Error(`insufficient balance for borrower ${loan.borrower}`);
    }

    // borrower 잔액 차감
    borrowerWallet.balance -= totalAmount;
    await stub.putState(loan.borrower, Buffer.from(JSON.stringify(borrowerWallet)));

    // lender 지갑 조회 및 잔액 증가
    let lenderWalletBytes = await stub.getState(loan.lender);
    if (!lenderWalletBytes || lenderWalletBytes.length === 0) {
      throw new Error(`lender wallet ${loan.lender} does not exist`);
    }
    let lenderWallet = JSON.parse(lenderWalletBytes.toString());
    lenderWallet.balance += totalAmount;
    await stub.putState(loan.lender, Buffer.from(JSON.stringify(lenderWallet)));

    // 대출 상태 업데이트
    loan.status = 'Repaid';
    await stub.putState(id, Buffer.from(JSON.stringify(loan)));
    return;
  }

  // =========================
  // DeleteLoanRequest: 대출 요청 삭제
  // args = [id]
  // =========================
  async DeleteLoanRequest(stub, args) {
    if (args.length !== 1) {
      throw new Error('Incorrect number of arguments. Expecting 1: [id]');
    }
    const id = args[0];

    let loanBytes = await stub.getState(id);
    if (!loanBytes || loanBytes.length === 0) {
      throw new Error(`loan request ${id} does not exist`);
    }
    await stub.deleteState(id);
    return;
  }

  // =========================
  // UpdateLoanRequest: 대출 요청 수정 (Pending 상태만)
  // args = [id, newAmount, newDurationDays]
  // =========================
  async UpdateLoanRequest(stub, args) {
    if (args.length !== 3) {
      throw new Error('Incorrect number of arguments. Expecting 3: [id, newAmount, newDurationDays]');
    }
    const id = args[0];
    const newAmount = parseInt(args[1], 10);
    const newDurationDays = parseInt(args[2], 10);

    if (isNaN(newAmount) || isNaN(newDurationDays)) {
      throw new Error('newAmount and newDurationDays must be integers');
    }

    let loanBytes = await stub.getState(id);
    if (!loanBytes || loanBytes.length === 0) {
      throw new Error(`loan request ${id} does not exist`);
    }
    let loan = JSON.parse(loanBytes.toString());

    if (loan.status !== 'Pending') {
      throw new Error(`cannot update loan request ${id} because it is not pending`);
    }

    loan.amount = newAmount;
    loan.durationDays = newDurationDays;
    await stub.putState(id, Buffer.from(JSON.stringify(loan)));
    return;
  }

  // =========================
  // QueryLoanRequest: 단일 대출 요청 조회
  // args = [id]
  // 리턴: LoanRequest JSON Buffer
  // =========================
  async QueryLoanRequest(stub, args) {
    if (args.length !== 1) {
      throw new Error('Incorrect number of arguments. Expecting 1: [id]');
    }
    const id = args[0];

    let loanBytes = await stub.getState(id);
    if (!loanBytes || loanBytes.length === 0) {
      throw new Error(`loan request ${id} does not exist`);
    }
    // 단순히 JSON 형태로 리턴
    return loanBytes;
  }

  // =========================
  // QueryAllLoanRequests: 모든 대출 요청 조회
  // args = []
  // 리턴: LoanRequest 객체들이 JSON 배열로 직렬화된 Buffer
  // =========================
  async QueryAllLoanRequests(stub, args) {
    if (args.length !== 0) {
      throw new Error('Incorrect number of arguments. Expecting 0');
    }

    const iterator = await stub.getStateByRange('', '');
    let allResults = [];
    while (true) {
      const res = await iterator.next();
      if (res.value && res.value.value.toString()) {
        try {
          const obj = JSON.parse(res.value.value.toString('utf8'));
          // obj에 "lender" 필드가 있으면 LoanRequest로 간주
          if (obj.id && obj.lender !== undefined && obj.borrower !== undefined) {
            allResults.push(obj);
          }
        } catch (err) {
          // JSON 파싱 실패 시 무시
        }
      }
      if (res.done) {
        await iterator.close();
        break;
      }
    }
    // 최종 결과를 Buffer로 리턴
    return Buffer.from(JSON.stringify(allResults));
  }

  // =========================
  // CreatePool: 풀 생성
  // args = [id, name, minDeposit, interestRate, durationMonths]
  // =========================
  async CreatePool(stub, args) {
    if (args.length !== 5) {
      throw new Error('Incorrect number of arguments. Expecting 5: [id, name, minDeposit, interestRate, durationMonths]');
    }
    const id = args[0];
    const name = args[1];
    const minDeposit = parseInt(args[2], 10);
    const interestRate = parseInt(args[3], 10);
    const durationMonths = parseInt(args[4], 10);

    if (isNaN(minDeposit) || isNaN(interestRate) || isNaN(durationMonths)) {
      throw new Error('minDeposit, interestRate, durationMonths must be integers');
    }

    // 중복 풀 확인
    let poolBytes = await stub.getState(id);
    if (poolBytes && poolBytes.length > 0) {
      throw new Error(`pool with ID ${id} already exists`);
    }

    if (interestRate > 5) {
      throw new Error('interest rate must be 5% or less');
    }

    // Go 코드에서 EndTime은 ms 단위로 설정했으므로 JS도 ms로 계산
    const nowMs = Date.now();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + durationMonths);
    const endMs = endDate.getTime();

    const pool = {
      id: id,
      name: name,
      minDeposit: minDeposit,
      interestRate: interestRate,
      startTime: nowMs,
      endTime: endMs,
      totalDeposit: 0,
      totalInterest: 0,
      status: 'Open',
      participants: [],
      weights: {} 
    };

    await stub.putState(id, Buffer.from(JSON.stringify(pool)));
    return;
  }

  // =========================
  // QueryPool: 단일 풀 조회
  // args = [id]
  // 리턴: Pool JSON Buffer
  // =========================
  async QueryPool(stub, args) {
    if (args.length !== 1) {
      throw new Error('Incorrect number of arguments. Expecting 1: [id]');
    }
    const id = args[0];

    let poolBytes = await stub.getState(id);
    if (!poolBytes || poolBytes.length === 0) {
      throw new Error(`pool ${id} does not exist`);
    }
    return poolBytes;
  }

  // =========================
  // QueryAllPools: 모든 풀 조회
  // args = []
  // 리턴: Pool 객체들이 JSON 배열로 직렬화된 Buffer
  // =========================
  async QueryAllPools(stub, args) {
    if (args.length !== 0) {
      throw new Error('Incorrect number of arguments. Expecting 0');
    }

    const iterator = await stub.getStateByRange('', '');
    let allResults = [];
    while (true) {
      const res = await iterator.next();
      if (res.value && res.value.value.toString()) {
        try {
          const obj = JSON.parse(res.value.value.toString('utf8'));
          // obj에 "name" 필드가 있으면 Pool으로 간주
          if (obj.id && obj.name !== undefined && obj.minDeposit !== undefined) {
            allResults.push(obj);
          }
        } catch (err) {
          // JSON 파싱 실패 시 무시
        }
      }
      if (res.done) {
        await iterator.close();
        break;
      }
    }
    return Buffer.from(JSON.stringify(allResults));
  }

  // =========================
  // JoinPool: 사용자가 Pool에 예치 참여
  // args = [poolID, userAddress, depositAmount]
  // =========================
  async JoinPool(stub, args) {
    if (args.length !== 3) {
      throw new Error('Incorrect number of arguments. Expecting 3: [poolID, userAddress, depositAmount]');
    }
    const poolID = args[0];
    const userAddress = args[1];
    const depositAmount = parseInt(args[2], 10);

    if (!userAddress) {
      throw new Error('userAddress must not be empty');
    }
    if (isNaN(depositAmount)) {
      throw new Error('depositAmount must be an integer');
    }

    let poolBytes = await stub.getState(poolID);
    if (!poolBytes || poolBytes.length === 0) {
      throw new Error(`pool ${poolID} does not exist`);
    }
    let pool = JSON.parse(poolBytes.toString());

    // 가중치 계산 및 업데이트
    pool.totalDeposit += depositAmount;
    if (!pool.weights[userAddress]) {
      pool.weights[userAddress] = 0.0;
    }
    pool.weights[userAddress] += depositAmount;
    pool.participants.push(userAddress);

    await stub.putState(poolID, Buffer.from(JSON.stringify(pool)));
    return;
  }

  // =========================
  // CreateLoanRequestFromPool: 풀 자금으로 대출 요청 생성
  // args = [id, poolID, borrower, amount, durationDays]
  // =========================
  async CreateLoanRequestFromPool(stub, args) {
    if (args.length !== 5) {
      throw new Error('Incorrect number of arguments. Expecting 5: [id, poolID, borrower, amount, durationDays]');
    }
    const id = args[0];
    const poolID = args[1];
    const borrower = args[2];
    const amount = parseInt(args[3], 10);
    const durationDays = parseInt(args[4], 10);

    if (isNaN(amount) || isNaN(durationDays)) {
      throw new Error('amount and durationDays must be integers');
    }

    // 풀 확인
    let poolBytes = await stub.getState(poolID);
    if (!poolBytes || poolBytes.length === 0) {
      throw new Error(`pool ${poolID} does not exist`);
    }
    let pool = JSON.parse(poolBytes.toString());

    if (pool.status !== 'Closed') {
      throw new Error(`pool ${poolID} is not ready for lending (status: ${pool.status})`);
    }
    if (pool.totalDeposit < amount) {
      throw new Error(`not enough funds in pool ${poolID}`);
    }

    // 중복 ID 확인
    let existingLoanBytes = await stub.getState(id);
    if (existingLoanBytes && existingLoanBytes.length > 0) {
      throw new Error(`loan request ${id} already exists`);
    }

    // LoanRequest 구조체 생성 (풀 기반)
    const loan = {
      id: id,
      poolId: poolID,
      lender: poolID,     // lender를 poolID로 처리
      borrower: borrower,
      amount: amount,
      durationDays: durationDays,
      interestRate: pool.interestRate,
      status: 'Pending',
      startTime: 0,
      endTime: 0
    };

    await stub.putState(id, Buffer.from(JSON.stringify(loan)));
    return;
  }
  
  // =========================
  // RepayLoanToPool: 풀 기반 대출 상환 및 이자 누적
  // args = [id]
  // =========================
  async RepayLoanToPool(stub, args) {
    if (args.length !== 1) {
      throw new Error('Incorrect number of arguments. Expecting 1: [id]');
    }
    const id = args[0];

    // 대출 요청 조회
    let loanBytes = await stub.getState(id);
    if (!loanBytes || loanBytes.length === 0) {
      throw new Error(`loan request ${id} does not exist`);
    }
    let loan = JSON.parse(loanBytes.toString());

    if (loan.status !== 'Active') {
      throw new Error(`loan ${id} is not active`);
    }

    // 이자 계산
    const interest = Math.floor((loan.amount * loan.interestRate * loan.durationDays) / (365 * 100));
    const totalAmount = loan.amount + interest;

    // borrower 지갑 조회 및 잔액 확인
    let borrowerWalletBytes = await stub.getState(loan.borrower);
    if (!borrowerWalletBytes || borrowerWalletBytes.length === 0) {
      throw new Error(`borrower wallet ${loan.borrower} does not exist`);
    }
    let borrowerWallet = JSON.parse(borrowerWalletBytes.toString());
    if (borrowerWallet.balance < totalAmount) {
      throw new Error(`insufficient balance for repayment`);
    }
    borrowerWallet.balance -= totalAmount;

    // 풀 조회 및 이자 누적
    let poolBytes = await stub.getState(loan.poolId);
    if (!poolBytes || poolBytes.length === 0) {
      throw new Error(`pool ${loan.poolId} does not exist`);
    }
    let pool = JSON.parse(poolBytes.toString());
    pool.totalDeposit += loan.amount;
    pool.totalInterest += interest;

    // 대출 상태 업데이트
    loan.status = 'Repaid';

    // 변경된 차입자 지갑, 풀, 대출 요청 모두 저장
    await stub.putState(loan.borrower, Buffer.from(JSON.stringify(borrowerWallet)));
    await stub.putState(loan.poolId, Buffer.from(JSON.stringify(pool)));
    await stub.putState(id, Buffer.from(JSON.stringify(loan)));
    return;
  }

  // =========================
  // QueryMyLoans: 특정 유저의 대출 요청 조회 (lender 또는 borrower 기준)
  // args = [userAddress]
  // 리턴: 해당 유저가 lender 또는 borrower인 LoanRequest들의 JSON 배열 Buffer
  // =========================
  async QueryMyLoans(stub, args) {
    if (args.length !== 1) {
      throw new Error('Incorrect number of arguments. Expecting 1: [userAddress]');
    }
    const userAddress = args[0];

    const iterator = await stub.getStateByRange('', '');
    let userLoans = [];
    while (true) {
      const res = await iterator.next();
      if (res.value && res.value.value.toString()) {
        try {
          const obj = JSON.parse(res.value.value.toString('utf8'));
          // lender 또는 borrower 필드가 userAddress인 경우만 포함
          if ((obj.lender === userAddress) || (obj.borrower === userAddress)) {
            userLoans.push(obj);
          }
        } catch (err) {
          // JSON 파싱 실패 시 무시
        }
      }
      if (res.done) {
        await iterator.close();
        break;
      }
    }
    return Buffer.from(JSON.stringify(userLoans));
  }


  // =========================
  // CreatePool: 풀 생성 및 자동 참여
  // args = [id, name, minDeposit, interestRate, durationMonths, creatorAddress, initialDeposit]
  // =========================
  async CreatePool(stub, args) {
    console.log('🟡 [CreatePool] 호출됨, 전달된 인자:', args);

    if (args.length !== 7) {
      console.error(`❌ [CreatePool] 인자 수 오류: ${args.length}개 전달됨`);
      throw new Error('Expecting 7 args: [id, name, minDeposit, interestRate, durationMonths, creatorAddress, initialDeposit]');
    }

    const [id, name, minDepositStr, interestRateStr, durationMonthsStr, creatorAddress, initialDepositStr] = args;

    const minDeposit = parseInt(minDepositStr, 10);
    const interestRate = parseFloat(interestRateStr);
    const durationMonths = parseInt(durationMonthsStr, 10);
    const initialDeposit = parseInt(initialDepositStr, 10);

    console.log(`🟡 [CreatePool] 파싱 완료 → minDeposit: ${minDeposit}, interestRate: ${interestRate}, durationMonths: ${durationMonths}, initialDeposit: ${initialDeposit}`);

    if (interestRate > 5) {
      console.error('❌ [CreatePool] 이자율 제한 초과');
      throw new Error('Interest rate must be 5% or less');
    }

    const existing = await stub.getState(id);
    if (existing && existing.length > 0) {
      console.error(`❌ [CreatePool] 동일 ID의 풀 존재함: ${id}`);
      throw new Error(`Pool ${id} already exists`);
    }

    // 지갑 확인 및 잔액 차감
    console.log(`🔍 [CreatePool] 지갑 조회 중: ${creatorAddress}`);
    const walletBytes = await stub.getState(creatorAddress);

    if (!walletBytes || walletBytes.length === 0) {
      console.error(`❌ [CreatePool] 지갑 존재하지 않음: ${creatorAddress}`);
      throw new Error(`Wallet ${creatorAddress} not found`);
    }

    const wallet = JSON.parse(walletBytes.toString());
    console.log(`✅ [CreatePool] 지갑 조회 성공: 현재 잔액 ${wallet.balance}`);

    if (wallet.balance < initialDeposit) {
      console.error(`❌ [CreatePool] 잔액 부족: 현재 잔액 ${wallet.balance}, 예치금 ${initialDeposit}`);
      throw new Error('Insufficient balance for initial deposit');
    }

    wallet.balance -= initialDeposit;
    await stub.putState(creatorAddress, Buffer.from(JSON.stringify(wallet)));
    console.log(`💰 [CreatePool] 초기 예치금 차감 완료. 새로운 잔액: ${wallet.balance}`);

    const now = Date.now();
    const end = new Date();
    end.setMonth(end.getMonth() + durationMonths);

    const pool = {
      id,
      name,
      minDeposit,
      interestRate,
      startTime: now,
      endTime: end.getTime(),
      status: 'Open',
      participants: [creatorAddress],
      deposits: { [creatorAddress]: initialDeposit },
      joinedAt: { [creatorAddress]: Math.floor(now / 1000) },
      totalDeposit: initialDeposit,
      totalInterest: 0
    };

    await stub.putState(id, Buffer.from(JSON.stringify(pool)));
    console.log(`✅ [CreatePool] 풀 생성 완료: ${id}`);
  }

  // =========================
  // QueryPool: 단일 풀 조회
  // args = [id]
  // =========================
  async QueryPool(stub, args) {
    if (args.length !== 1) throw new Error('Expecting 1 arg: [id]');
    const id = args[0];
    const bytes = await stub.getState(id);
    if (!bytes || bytes.length === 0) throw new Error(`Pool ${id} not found`);
    return bytes;
  }

  // =========================
  // QueryAllPools: 모든 풀 조회
  // args = []
  // =========================
  async QueryAllPools(stub, args) {
    const iterator = await stub.getStateByRange('', '');
    const results = [];
    while (true) {
      const res = await iterator.next();
      if (res.value && res.value.value.toString()) {
        try {
          const obj = JSON.parse(res.value.value.toString());
          if (obj.id && obj.minDeposit !== undefined) results.push(obj);
        } catch (_) {}
      }
      if (res.done) break;
    }
    await iterator.close();
    return Buffer.from(JSON.stringify(results));
  }

  // =========================
  // JoinPool: 사용자가 Pool에 예치 참여
  // args = [poolID, userAddress, depositAmount]
  // =========================
  async JoinPool(stub, args) {
    if (args.length !== 3) throw new Error('Expecting 3 args: [poolID, userAddress, depositAmount]');
    const [poolID, userAddress, depositStr] = args;
    const depositAmount = parseInt(depositStr, 10);

    const poolBytes = await stub.getState(poolID);
    if (!poolBytes || poolBytes.length === 0) throw new Error(`Pool ${poolID} not found`);
    const pool = JSON.parse(poolBytes.toString());

    if (pool.deposits[userAddress]) throw new Error('User already joined the pool');

    const walletBytes = await stub.getState(userAddress);
    if (!walletBytes || walletBytes.length === 0) throw new Error(`Wallet ${userAddress} not found`);
    const wallet = JSON.parse(walletBytes.toString());

    if (wallet.balance < depositAmount) throw new Error('Insufficient balance');
    wallet.balance -= depositAmount;

    await stub.putState(userAddress, Buffer.from(JSON.stringify(wallet)));

    const now = Math.floor(Date.now() / 1000);

    if (!pool.deposits) pool.deposits = {};
    if (!pool.joinedAt) pool.joinedAt = {};

    pool.participants.push(userAddress);
    pool.deposits[userAddress] = depositAmount;
    pool.joinedAt[userAddress] = now;
    pool.totalDeposit += depositAmount;

    await stub.putState(poolID, Buffer.from(JSON.stringify(pool)));
  }

  // =========================
  // QueryPoolsByUser: 사용자가 참여한 모든 풀 조회
  // args = [userAddress]
  // =========================
  async QueryPoolsByUser(stub, args) {
    if (args.length !== 1) throw new Error('Expecting 1 arg: [userAddress]');
    const userAddress = args[0];

    const iterator = await stub.getStateByRange('', '');
    const userPools = [];

    while (true) {
      const res = await iterator.next();
      if (res.value && res.value.value.toString()) {
        try {
          const pool = JSON.parse(res.value.value.toString());
          if (Array.isArray(pool.participants) && pool.participants.includes(userAddress)) {
            userPools.push(pool);
          }
        } catch (_) {}
      }
      if (res.done) break;
    }
    await iterator.close();
    return Buffer.from(JSON.stringify(userPools));
  }

  // =========================
  // CreateLoanRequestFromPool: 풀 자금으로 대출 요청 생성
  // args = [id, poolID, borrower, amount, durationDays]
  // =========================
  async CreateLoanRequestFromPool(stub, args) {
    if (args.length !== 5) {
      throw new Error('Incorrect number of arguments. Expecting 5: [id, poolID, borrower, amount, durationDays]');
    }
    const id = args[0];
    const poolID = args[1];
    const borrower = args[2];
    const amount = parseInt(args[3], 10);
    const durationDays = parseInt(args[4], 10);

    if (isNaN(amount) || isNaN(durationDays)) {
      throw new Error('amount and durationDays must be integers');
    }

    // 풀 확인
    let poolBytes = await stub.getState(poolID);
    if (!poolBytes || poolBytes.length === 0) {
      throw new Error(`pool ${poolID} does not exist`);
    }
    let pool = JSON.parse(poolBytes.toString());

    if (pool.status !== 'Closed') {
      throw new Error(`pool ${poolID} is not ready for lending (status: ${pool.status})`);
    }
    if (pool.totalDeposit < amount) {
      throw new Error(`not enough funds in pool ${poolID}`);
    }

    // 중복 ID 확인
    let existingLoanBytes = await stub.getState(id);
    if (existingLoanBytes && existingLoanBytes.length > 0) {
      throw new Error(`loan request ${id} already exists`);
    }

    // LoanRequest 구조체 생성 (풀 기반)
    const loan = {
      id: id,
      poolId: poolID,
      lender: poolID,     // lender를 poolID로 처리
      borrower: borrower,
      amount: amount,
      durationDays: durationDays,
      interestRate: pool.interestRate,
      status: 'Pending',
      startTime: 0,
      endTime: 0
    };

    await stub.putState(id, Buffer.from(JSON.stringify(loan)));
    return;
  }

  // =========================
  // RepayLoanToPool: 풀 기반 대출 상환 및 이자 누적
  // args = [id]
  // =========================
  async RepayLoanToPool(stub, args) {
    if (args.length !== 1) {
      throw new Error('Incorrect number of arguments. Expecting 1: [id]');
    }
    const id = args[0];

    // 대출 요청 조회
    let loanBytes = await stub.getState(id);
    if (!loanBytes || loanBytes.length === 0) {
      throw new Error(`loan request ${id} does not exist`);
    }
    let loan = JSON.parse(loanBytes.toString());

    if (loan.status !== 'Active') {
      throw new Error(`loan ${id} is not active`);
    }

    // 이자 계산
    const interest = Math.floor((loan.amount * loan.interestRate * loan.durationDays) / (365 * 100));
    const totalAmount = loan.amount + interest;

    // borrower 지갑 조회 및 잔액 확인
    let borrowerWalletBytes = await stub.getState(loan.borrower);
    if (!borrowerWalletBytes || borrowerWalletBytes.length === 0) {
      throw new Error(`borrower wallet ${loan.borrower} does not exist`);
    }
    let borrowerWallet = JSON.parse(borrowerWalletBytes.toString());
    if (borrowerWallet.balance < totalAmount) {
      throw new Error(`insufficient balance for repayment`);
    }
    borrowerWallet.balance -= totalAmount;

    // 풀 조회 및 이자 누적
    let poolBytes = await stub.getState(loan.poolId);
    if (!poolBytes || poolBytes.length === 0) {
      throw new Error(`pool ${loan.poolId} does not exist`);
    }
    let pool = JSON.parse(poolBytes.toString());
    pool.totalDeposit += loan.amount;
    pool.totalInterest += interest;

    // 대출 상태 업데이트
    loan.status = 'Repaid';

    // 변경된 차입자 지갑, 풀, 대출 요청 모두 저장
    await stub.putState(loan.borrower, Buffer.from(JSON.stringify(borrowerWallet)));
    await stub.putState(loan.poolId, Buffer.from(JSON.stringify(pool)));
    await stub.putState(id, Buffer.from(JSON.stringify(loan)));
    return;
  }

  // =========================
  // QueryMyLoans: 특정 유저의 대출 요청 조회 (lender 또는 borrower 기준)
  // args = [userAddress]
  // 리턴: 해당 유저가 lender 또는 borrower인 LoanRequest들의 JSON 배열 Buffer
  // =========================
  async QueryMyLoans(stub, args) {
    if (args.length !== 1) {
      throw new Error('Incorrect number of arguments. Expecting 1: [userAddress]');
    }
    const userAddress = args[0];

    const iterator = await stub.getStateByRange('', '');
    let userLoans = [];
    while (true) {
      const res = await iterator.next();
      if (res.value && res.value.value.toString()) {
        try {
          const obj = JSON.parse(res.value.value.toString('utf8'));
          // lender 또는 borrower 필드가 userAddress인 경우만 포함
          if ((obj.lender === userAddress) || (obj.borrower === userAddress)) {
            userLoans.push(obj);
          }
        } catch (err) {
          // JSON 파싱 실패 시 무시
        }
      }
      if (res.done) {
        await iterator.close();
        break;
      }
    }
    return Buffer.from(JSON.stringify(userLoans));
  }


  // =========================
  // (Optional) WalletExists, LoanRequestExists 메서드는 내부에서 직접 stub.getState로 체크하므로 생략 가능
  // =========================
};

shim.start(new LoanShim());
