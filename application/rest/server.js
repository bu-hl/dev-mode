// 2. server.js (Loan API + React 정적 파일 처리 순서 수정)

'use strict';
const cors = require('cors');
const cron  = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const axios = require('axios');
const crypto = require('crypto');  // crypto 모듈 추가
require('dotenv').config();  // .env에서 SUPABASE 설정 불러오기

const express = require('express');
const app = express();
let path = require('path');
let sdk = require('./sdk');

const PORT = 8001;
const HOST = '0.0.0.0';

// Supabase 클라이언트 초기화 (서버 전용 service_role 사용)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // // 이게 anon이면 안 됨
);

// Resend 클라이언트 초기화
const resend = new Resend(process.env.RESEND_API_KEY);

console.log("✅ SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("✅ SERVICE_ROLE_KEY 시작:", process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-20, -1));

// CORS 설정 추가
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8001', 'http://127.0.0.1:3000', 'http://127.0.0.1:8001', 'http://0.0.0.0:3000', 'http://0.0.0.0:8001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Content-Security-Policy 헤더 추가
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "connect-src 'self' http://localhost:* http://127.0.0.1:* http://0.0.0.0:* https://*.supabase.co https://www.google.com https://www.gstatic.com; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com; " +
    "frame-src 'self' https://www.google.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:;"
  );
  next();
});

// body parsing
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// 인증 미들웨어
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
    }

    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error) {
        console.error('Supabase 인증 에러:', error);
        return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
      }

      if (!user) {
        return res.status(401).json({ error: '사용자를 찾을 수 없습니다.' });
      }

      req.user = user;
      next();
    } catch (authError) {
      console.error('인증 처리 에러:', authError);
      return res.status(401).json({ error: '인증 처리 중 오류가 발생했습니다.' });
    }
  } catch (error) {
    console.error('인증 미들웨어 에러:', error);
    res.status(500).json({ error: '인증 처리 중 오류가 발생했습니다.' });
  }
};

////////////////////////////////////////////////////////////////////////////////
// 4. 관리자 지갑 잔액 조회 엔드포인트 (/admin-balance)
//    - sdk.send(true, 'GetWalletBalance', ['ADMIN_WALLET']) 만 호출하면 됩니다.
////////////////////////////////////////////////////////////////////////////////
app.get('/admin-balance', async (req, res) => {
  try {
    console.log('\n🏷 [admin-balance] 요청 도착');

    // (1) send(true, 'GetWalletBalance', ['ADMIN_WALLET']) 호출 → 문자열 반환
    const balanceStr = await sdk.send(true, 'GetWalletBalance', ['ADMIN_WALLET']);
    // 예를 들어 balanceStr = "42.5" 같은 문자열

    // (2) 필요하면 숫자로 변환해도 되고, 문자열 그대로 응답해도 됩니다.
    const balance = parseFloat(balanceStr);

    return res.json({
      adminWallet: 'ADMIN_WALLET',
      balance: balance   // 숫자로 내려주기
      // 만약 문자열 그대로 보내려면 → balance: balanceStr
    });
  } catch (err) {
    console.error('[admin-balance] 에러 발생:', err);
    return res.status(500).json({
      error: '관리자 지갑 잔액 조회 실패',
      details: err.message
    });
  }
});

// ================= 지갑 API ==================

// 지갑 생성
// POST /wallet/create
app.post('/wallet/create', async (req, res) => {
  const { userId } = req.body;
  console.log('\n🏷 [wallet/create] 요청 도착 → userId:', userId);

  // 1. profiles 테이블에서 기존 wallet_id 조회
  console.log('[wallet/create] 1) profiles에서 기존 wallet_id 조회 시작:', { userId });
  const { data: existing, error: checkError } = await supabase
    .from('profiles')
    .select('wallet_id')
    .eq('id', userId)
    .single();
  console.log('[wallet/create] 1) profiles 조회 결과 →', { existing, checkError });

  if (checkError) {
    console.error('[wallet/create] 프로필 조회 중 에러 발생:', checkError);
    return res.status(500).json({ error: '지갑 조회 실패', detail: checkError.message });
  }
  if (existing?.wallet_id) {
    console.log('[wallet/create] 이미 존재하는 지갑이 있습니다. existing.wallet_id:', existing.wallet_id);
    return res.status(200).json({ message: '기존 지갑 존재', wallet: existing.wallet_id });
  }

  // 2. 새로운 wallet ID 생성 및 profiles 업데이트
  const walletId = `wallet_${userId.slice(0, 8)}_${Date.now()}`;
  const initialBalance = '1000000'; // 초기 잔액(문자열)
  console.log('[wallet/create] 2) 새 지갑 생성 및 profiles 업데이트 →', { walletId, initialBalance });

  const { error: updateError, data: updateResult } = await supabase
    .from('profiles')
    .update({ wallet_id: walletId })
    .eq('id', userId)
    .select();
  console.log('[wallet/create] 2) profiles 업데이트 결과 →', { updateResult, updateError });

  if (updateError) {
    console.error('[wallet/create] profiles 업데이트 실패:', updateError);
    return res.status(500).json({ error: 'wallet_id 업데이트 실패', detail: updateError.message });
  }

  // 3. 체인코드(블록체인)에 지갑 생성 요청
  console.log('[wallet/create] 3) 체인코드 호출 → /chain/createWallet?address=' + walletId + '&initialBalance=' + initialBalance);
  try {
    const chainResponse = await axios.get(`http://localhost:${PORT}/chain/createWallet`, {
      params: {
        address: walletId,
        initialBalance: initialBalance
      },
    });
    console.log('[wallet/create] 3) 체인코드 응답 →', chainResponse.data);

    // 체인코드에서 "Success" 이외의 응답이 오면 에러 처리
    if (!chainResponse.data) {
      // data 필드가 없거나 빈 값일 경우만 실패 처리
      return res.status(500).json({ error: '블록체인 지갑 생성 실패' });
    }
  } catch (err) {
    console.error('[wallet/create] 체인코드 호출 중 예외 발생 →', err.message);
    return res.status(500).json({ error: '체인코드 호출 실패', detail: err.message });
  }

  // 4. Supabase wallet_transactions 테이블에 "초기 입금 트랜잭션" 기록
  const txObj = {
    user_id: userId,
    type: 'deposit',                        // 거래 유형
    amount: parseFloat(initialBalance),     // 숫자로 변환
    memo: '초기 입금 (지갑 생성)',           // 거래 설명
    // related_user_id: null,                // (필요 시 추가)
    // loan_id: null                         // (필요 시 추가)
  };
  console.log('[wallet/create] 4) wallet_transactions에 INSERT할 데이터 →', txObj);

  const { data: txInserted, error: txError } = await supabase
    .from('wallet_transactions')
    .insert([txObj])
    .select();  // select()를 붙이면 삽입된 레코드를 반환
  console.log('[wallet/create] 4) wallet_transactions INSERT 결과 →', { txInserted, txError });

  if (txError) {
    console.error('[wallet/create] wallet_transactions 삽입 실패 →', txError);
    return res.status(500).json({ error: '트랜잭션 기록 실패', detail: txError.message });
  }

  // 최종 응답
  console.log('[wallet/create] ✅ 지갑 생성 및 트랜잭션 기록 완료 → 지갑ID:', walletId);
  return res.status(200).json({ message: '지갑 생성 완료', wallet: walletId });
});


// ================= 체인코드 중간 라우트 =================
// GET /chain/createWallet?address=xxx&initialBalance=yyy
app.get('/chain/createWallet', async (req, res) => {
  const { address, initialBalance } = req.query;
  const args = [address, initialBalance || "0"];
  console.log('\n🔗 [chain/createWallet] 호출 → 함수: CreateWallet, 인자:', args);

  try {
    const result = await sdk.send(false, 'CreateWallet', args);
    console.log('🎉 [chain/createWallet] Submit 성공 → 응답:', result);
    return res.json(result);
  } catch (error) {
    console.error('🚨 [chain/createWallet] Submit 에러 →', error.message);
    return res.status(500).json({ error: error.message });
  }
});



// 지갑 잔액 조회
app.get('/getWalletBalance', async function (req, res) {
  let { address } = req.query;
  if (!address) return res.status(400).json({ error: '주소가 필요합니다.' });

  try {
    const result = await sdk.send(true, 'GetWalletBalance', [address]);
    return res.json(result);
  } catch (err) {
    console.error('[getWalletBalance] 에러 발생:', err);
    return res.status(500).json({ 
      error: err.message,
      details: err.stack,
      type: err.name
    });
  }
});

// ================= 대출 시스템 API ==================

// 한국 시간으로 변환하는 함수
function getKoreanTime() {
  const now = new Date();
  const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
  return koreanTime.toISOString();
}

// 대출 요청 생성
app.post('/createLoan', async function (req, res) {
  const { id, lender, borrower, amount, durationDays, interestRate } = req.body;
  // └─ lender, borrower: “프로필”이 아니라 지갑 주소(예: 'wallet_xyz')라고 가정
  console.log('[createLoan] 호출됨 → body:', JSON.stringify(req.body));

  try {
    // 1) 체인코드에 대출 요청
    const txId = await sdk.send(false, 'CreateLoanRequest', [id, lender, borrower, amount, durationDays, interestRate]);

    // 2) 지갑 주소 → profiles.id(UUID) 매핑 (Supabase에서 조회)
    //    - lender(지갑 주소)로 lender_id(UUID) 조회
    const { data: lenderProfile, error: lenderError } = await supabase
      .from('profiles')
      .select('id')
      .eq('wallet_id', lender)
      .single();
    if (lenderError || !lenderProfile) {
      console.error('[createLoan] lender 프로필 조회 실패:', lenderError);
      return res.status(400).json({ error: '대출자 프로필을 찾을 수 없습니다.' });
    }
    const lenderId = lenderProfile.id;

    //    - borrower(지갑 주소)로 borrower_id(UUID) 조회
    const { data: borrowerProfile, error: borrowerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('wallet_id', borrower)
      .single();
    if (borrowerError || !borrowerProfile) {
      console.error('[createLoan] borrower 프로필 조회 실패:', borrowerError);
      return res.status(400).json({ error: '차입자 프로필을 찾을 수 없습니다.' });
    }
    const borrowerId = borrowerProfile.id;

    // 3) 이제 loans 테이블에 신규 레코드 삽입
    const now = getKoreanTime(); // ISO 포맷(UTC+9) 문자열
    const { error } = await supabase
      .from('loans')
      .insert([{
        id:             id,              // 로컬 PK
        loan_chain_id:  id,              // 체인에서도 같은 ID 사용
        tx_hash:        txId,            // 체인 트랜잭션 해시
        lender_id:      lenderId,        // profiles.id(UUID)
        borrower_id:    borrowerId,      // profiles.id(UUID)
        amount:         Number(amount),  // 숫자로 저장
        interest_rate:  parseFloat(interestRate).toFixed(2),
        duration_days:  Number(durationDays),
        status:         'pending',       // 최초 생성 시점엔 대출 승인 전이므로 ‘pending’
        created_at:     now
        // start_time, due_date, repaid_at, contract_hash, updated_at 은 나중에 승인/상환 시점에 채움
      }]);

    if (error) {
      console.error('[createLoan] DB 저장 실패:', error);
      return res.status(500).json({ error: 'DB 저장 실패', detail: error.message });
    }

    return res.json({
      message: 'Loan created on chain and DB',
      txId
    });

  } catch (err) {
    console.error('[createLoan] 체인 오류:', err.message);
    return res.status(500).json({ error: err.message });
  }
});


// 대출 승인
// GET /approveLoan?id=<loanId>
app.get('/approveLoan', async (req, res) => {
  const { id: loanId } = req.query;
  if (!loanId) {
    return res.status(400).json({ error: 'Loan ID가 필요합니다.' });
  }

  try {
    // 1) 체인코드에 대출 승인 요청
    const approveResult = await sdk.send(false, 'ApproveLoanRequest', [loanId]);

    // 2) 승인 직후 체인에서 상세 정보 조회
    const loanInfo = await sdk.send(true, 'QueryLoanRequest', [loanId]);
    const {
      lender: lenderWalletAddr,
      borrower: borrowerWalletAddr,
      amount: chainAmount,
      interestRate: chainRate,
      durationDays: chainDays,
      status: chainStatusRaw,
      startTime: startTsSec,
      endTime:   endTsSec
    } = typeof loanInfo === 'string' ? JSON.parse(loanInfo) : loanInfo;

    const amount     = Number(chainAmount);
    const rate       = Number(chainRate);
    const days       = Number(chainDays);
    const chainStatus= chainStatusRaw.toLowerCase();           // 'active'
    const startTimeISO= new Date(Number(startTsSec) * 1000).toISOString();
    const dueDateISO  = new Date(Number(endTsSec)   * 1000).toISOString();

    // 3) 지갑 주소 → profiles.id(UUID) 매핑
    const { data: lp, error: le } = await supabase
      .from('profiles').select('id').eq('wallet_id', lenderWalletAddr).single();
    if (le || !lp) {
      return res.status(404).json({ error: '대출자 프로필을 찾을 수 없습니다: ' + lenderWalletAddr });
    }
    const lenderId   = lp.id;

    const { data: bp, error: be } = await supabase
      .from('profiles').select('id').eq('wallet_id', borrowerWalletAddr).single();
    if (be || !bp) {
      return res.status(404).json({ error: '차입자 프로필을 찾을 수 없습니다: ' + borrowerWalletAddr });
    }
    const borrowerId = bp.id;

    // 4) loans 테이블 UPDATE → start_time, due_date, status, updated_at 채우기
    const { error: updateError } = await supabase
      .from('loans')
      .update({
        lender_id:     lenderId,
        borrower_id:   borrowerId,
        amount:        amount,
        interest_rate: rate,
        duration_days: days,
        status:        chainStatus,   // 'active' 등으로 변경
        start_time:    startTimeISO,
        due_date:      dueDateISO,
        updated_at:    new Date().toISOString()
      })
      .eq('loan_chain_id', loanId);
    if (updateError) {
      return res.status(500).json({ error: 'DB 업데이트 실패', detail: updateError.message });
    }

    // 5) wallet_transactions에 “loan_sent” & “loan_received” 기록
    const txOut = {
      user_id:        lenderId,
      type:           'loan_sent',
      amount:        -Math.abs(amount),
      related_user_id: borrowerId,
      loan_id:        loanId,
      memo:           '친구 대출 승인 - 출금'
    };
    const txIn = {
      user_id:        borrowerId,
      type:           'loan_received',
      amount:         Math.abs(amount),
      related_user_id: lenderId,
      loan_id:        loanId,
      memo:           '친구 대출 승인 - 입금'
    };
    const { error: txError } = await supabase
      .from('wallet_transactions')
      .insert([ txOut, txIn ]);
    if (txError) {
      return res.status(500).json({ error: 'wallet_transactions 기록 실패', detail: txError.message });
    }

    return res.json({
      success:     true,
      message:     '대출 승인 완료 (체인+DB 기록됨)',
      chainResult: approveResult
    });
  } catch (err) {
    console.error('[approveLoan] 에러 발생 →', err);
    return res.status(500).json({ error: err.message });
  }
});

// 대출 거절
app.get('/denyLoan', async (req, res) => {
  const { id } = req.query;
  console.log('📥 대출 거절 요청 도착 id =', id);

  try {
    const result = await sdk.send(false, 'DenyLoanRequest', [id]);
    console.log('✅ DenyLoanRequest 성공, 체인코드 응답 =', result);
    return res.json({ success: true, result });
  } catch (err) {
    console.error('❌ DenyLoanRequest 오류:', err.message);
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

async function queryLoan(id) {
  const result = await sdk.send(true, 'QueryLoanRequest', [id]);
  return typeof result === 'string' ? JSON.parse(result) : result;
}

// =========================
// 대출 상환 엔드포인트
// POST /loan/repay
// =========================

app.post('/loan/repay', async (req, res) => {
  const { loanId } = req.body;
  console.log('[RepayLoan] 상환 요청 도착 → loanId:', loanId);

  try {
    //
    // 1) 먼저 Supabase에서 해당 loanId로 “profile UUID”를 포함한 대출 정보를 조회합니다.
    //
    const { data: loanRow, error: loanSelectError } = await supabase
      .from('loans')
      .select('due_date, borrower_id, lender_id, amount, interest_rate, duration_days, status')
      .eq('id', loanId)
      .single();

    if (loanSelectError || !loanRow) {
      console.error('[RepayLoan] 대출 정보 조회 실패:', loanSelectError);
      return res.status(400).json({ error: '대출 정보를 찾을 수 없습니다.' });
    }

    // 이미 DB에서 상태가 “repaid”라면 바로 응답
    if (loanRow.status.toLowerCase() === 'repaid') {
      return res.json({ success: true, message: '이미 상환된 대출입니다.' });
    }

    //
    // 2) 체인에서 현재 대출 상태를 한 번 더 확인합니다.
    //
    const chainLoan = await queryLoan(loanId);
    const parsed = typeof chainLoan === 'string' ? JSON.parse(chainLoan) : chainLoan;

    if (parsed.status.toLowerCase() === 'repaid') {
      // 체인 상에서 이미 Repaid 상태인 경우, DB에도 업데이트만 해주고 응답
      await supabase
        .from('loans')
        .update({
          status: 'repaid',
          repaid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', loanId);

      return res.json({ success: true, message: '체인에서 이미 상환된 상태입니다. DB 업데이트만 완료했습니다.' });
    }

    //
    // 3) 이제 “RepayLoan” 체인 트랜잭션을 보냅니다.
    //
    const result = await sdk.send(false, 'RepayLoan', [loanId]);
    console.log('[RepayLoan] 체인 응답:', result);

    //
    // 4) 이자 계산 (원금 + 이자)
    //
    const amount       = Number(loanRow.amount);
    const rate         = Number(loanRow.interest_rate);
    const days         = Number(loanRow.duration_days);
    const interest     = Math.floor((amount * rate * days) / (365 * 100));
    const totalAmount  = amount + interest;

    console.log(
      `🟢 [RepayLoan] 프로필(${loanRow.borrower_id}) → 프로필(${loanRow.lender_id})에게 ${totalAmount} 상환 처리`
    );

    //
    // 5) Supabase의 wallet_transactions 테이블에 “출금/입금” 거래 기록을 남깁니다.
    //
    const { error: insertError } = await supabase
      .from('wallet_transactions')
      .insert([
        {
          user_id:         loanRow.borrower_id,    // borrower 프로필 UUID
          type:            'repay',
          amount:         -totalAmount,
          related_user_id: loanRow.lender_id,      // lender 프로필 UUID
          loan_id:         loanId,
          memo:            '친구 대출 상환 - 출금',
        },
        {
          user_id:         loanRow.lender_id,      // lender 프로필 UUID
          type:            'repay_received',
          amount:          totalAmount,
          related_user_id: loanRow.borrower_id,    // borrower 프로필 UUID
          loan_id:         loanId,
          memo:            '친구 대출 상환 - 입금',
        },
      ]);

    if (insertError) {
      console.error('📛 Supabase 상환 기록 실패:', insertError);
      return res.status(500).json({ error: '상환은 완료되었으나 거래 기록 저장 실패' });
    }

    //
    // 6) “due_date”와 현재 시점을 비교하여 가산점(Bonus)을 계산하고, 신용점수를 업데이트합니다.
    //
    const nowMs     = Date.now();
    const dueDateMs = new Date(loanRow.due_date).getTime();
    const diffMs    = dueDateMs - nowMs;
    const ONE_DAY  = 1000 * 60 * 60 * 24;

    let bonusPoint = 0;
    if (diffMs >= 7 * ONE_DAY) {
      // 기한보다 7일 이상 빨리 상환
      bonusPoint = 30;
    } else if (diffMs >= ONE_DAY && diffMs < 7 * ONE_DAY) {
      // 기한보다 1~6일 빨리 상환
      bonusPoint = 25;
    } else if (diffMs >= 0 && diffMs < ONE_DAY) {
      // 기한 당일까지 상환
      bonusPoint = 20;
    }
    // diffMs < 0 이면 이미 기한 지난 연체이므로 가산점 없음

    if (bonusPoint > 0) {
      // 현재 프로필의 credit_score 조회
      const { data: profileRow, error: profSelectError } = await supabase
        .from('profiles')
        .select('credit_score')
        .eq('id', loanRow.borrower_id)
        .single();

      if (profSelectError || !profileRow) {
        console.error('[RepaymentBonus] 프로필 조회 실패:', profSelectError);
      } else {
        const currentScore = profileRow.credit_score || 0;
        const newScore     = currentScore + bonusPoint;

        const { error: profUpdateError } = await supabase
          .from('profiles')
          .update({
            credit_score: newScore,
            updated_at:   new Date().toISOString()
          })
          .eq('id', loanRow.borrower_id);

        if (profUpdateError) {
          console.error('[RepaymentBonus] credit_score 업데이트 실패:', profUpdateError);
        } else {
          console.log(
            `[RepaymentBonus] borrower(${loanRow.borrower_id})에게 +${bonusPoint}점 가산 → 새 점수=${newScore}`
          );
        }
      }
    }

    //
    // 7) “loans” 테이블에 status='repaid'와 repaid_at, updated_at을 기록합니다.
    //
    const { error: loanUpdateError } = await supabase
      .from('loans')
      .update({
        status:     'repaid',
        repaid_at:  new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', loanId);

    if (loanUpdateError) {
      console.error('[RepayLoan] loans 테이블 업데이트 실패:', loanUpdateError);
    } else {
      console.log('[RepayLoan] loans 테이블 repaid_at 업데이트 성공 → loanId:', loanId);
    }

    //
    // 8) 최종 응답
    //
    return res.json({
      success: true,
      result:  result.toString()
    });

  } catch (err) {
    console.error('[RepayLoan] 체인코드 실행 또는 기타 오류 발생:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 단일 대출 요청 조회
// app.get('/queryLoan', function (req, res) {
//     let { id } = req.query;
//     let args = [id];
//     sdk.send(true, 'QueryLoanRequest', args, res);
// });
// app.get('/queryLoan', async function (req, res) {
//   const { id } = req.query;
//   if (!id) return res.status(400).json({ error: 'Loan ID가 필요합니다.' });

//   try {
//     const result = await sdk.send(true, 'QueryLoanRequest', [id]);
//     return res.json(result);
//   } catch (err) {
//     return res.status(500).json({ error: err.message });
//   }
// });

// 전체 대출 요청 조회
app.get('/queryAllLoans', async (req, res) => {
  try {
    const result = await sdk.send(true, 'QueryAllLoanRequests', []);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 로그인한 유저 관련 대출만 반환하는 API
app.get('/myLoans', async (req, res) => {
  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: '지갑 주소가 필요합니다.' });

  try {
    // 체인코드 직접 호출
    const loans = await sdk.send(true, 'QueryMyLoans', [wallet]);
    res.json(loans);
  } catch (err) {
    console.error('myLoans API 실패:', err);
    res.status(500).json({ error: err.message });
  }
});


// ===================
// 매일 자정 연체 확인 → Defaulted + 신용점수 차감
// ===================
async function processOverdueLoans() {
  // 1) 현재 시각(ISO) 구하기
  const now = new Date();
  const nowISO = now.toISOString();

  // 2) status='active' AND due_date < now 인 대출들 조회
  const { data: overdueLoans, error: selectError } = await supabase
    .from('loans')
    .select('id, borrower_id, due_date')
    .eq('status', 'active')
    .lt('due_date', nowISO);

  if (selectError) {
    console.error('[processOverdueLoans] 연체 대출 조회 실패:', selectError);
    return;
  }
  if (!overdueLoans || overdueLoans.length === 0) {
    console.log('[processOverdueLoans] 연체 대상 대출 없음');
    return;
  }

  // 3) 연체된 각 loan에 대해 처리
  for (const row of overdueLoans) {
    const loanId     = row.id;
    const borrowerId = row.borrower_id;
    const dueDate    = new Date(row.due_date);
    const diffMs     = now.getTime() - dueDate.getTime();
    const overdueDays= Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // 4) 연체 일수별 페널티 계산
    let penalty = 0;
    if (overdueDays >= 1 && overdueDays <= 3)        penalty = 50;
    else if (overdueDays >= 4 && overdueDays <= 7)   penalty = 100;
    else if (overdueDays >= 8 && overdueDays <= 14)  penalty = 200;
    else if (overdueDays >= 15 && overdueDays <= 30) penalty = 300;
    else if (overdueDays >= 31)                      penalty = 500;

    // 5) loans 테이블 status 업데이트
    const { error: updateLoanError } = await supabase
      .from('loans')
      .update({
        status: 'defaulted',
        updated_at: new Date().toISOString()
      })
      .eq('id', loanId);

    if (updateLoanError) {
      console.error(`[processOverdueLoans] loan ${loanId} 상태 업데이트 실패:`, updateLoanError);
      // 다음 루프로 넘어갑니다
      continue;
    }

    // 6) profiles 테이블의 credit_score 차감 (0 미만이면 0으로)
    //    - 우선 현재 credit_score을 읽어서 계산하거나, GREATEST 함수를 쓰고 싶으면 RPC를 써야 하지만
    //      Supabase JS에서 GREATEST를 직접 쓰기 어렵습니다. → 한 번 읽어서 계산 후 업데이트
    const { data: profileRow, error: profSelectError } = await supabase
      .from('profiles')
      .select('credit_score')
      .eq('id', borrowerId)
      .single();

    if (profSelectError || !profileRow) {
      console.error(`[processOverdueLoans] borrower(${borrowerId}) 정보 조회 실패:`, profSelectError);
      continue;
    }

    const newScore = Math.max(0, (profileRow.credit_score || 0) - penalty);
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({
        credit_score: newScore,
        updated_at: new Date().toISOString()
      })
      .eq('id', borrowerId);

    if (updateProfileError) {
      console.error(`[processOverdueLoans] borrower(${borrowerId}) 신용점수 업데이트 실패:`, updateProfileError);
      continue;
    }

    console.info(
      `Loan(${loanId}) 연체(${overdueDays}일): status→defaulted, borrower=${borrowerId}, penalty=${penalty}점 차감 (새점수=${newScore})`
    );
  }
}


// ================= 대출풀 시스템 API ==================

// 대출풀 생성
app.post('/createPool', async (req, res) => {
  try {
    const { id, name, minDeposit, interestRate, durationMonths, creatorAddress, initialDeposit } = req.body;
    console.log('📥 풀 생성 요청:', req.body);

    // 필수 필드 검증
    if (!id || !name || !minDeposit || !interestRate || !durationMonths || !creatorAddress || !initialDeposit) {
      console.error('필수 필드 누락:', { id, name, minDeposit, interestRate, durationMonths, creatorAddress, initialDeposit });
      return res.status(400).json({ error: '모든 필수 필드를 입력해주세요.' });
    }

    // 모든 숫자 필드를 문자열로 변환
    const args = [
      id,
      name,
      minDeposit.toString(),
      interestRate.toString(),
      durationMonths.toString(),
      creatorAddress,
      initialDeposit.toString()
    ];

    console.log('🔗 체인코드 호출 → CreatePool()');
    console.log('📝 CreatePool 인자:', args);

    // 1. 체인코드 호출
    try {
      const result = await sdk.send(false, 'CreatePool', args);
      console.log('🎉 CreatePool 성공 → 응답:', result.toString());
    } catch (chainError) {
      console.error('❌ 체인코드 호출 실패:', chainError);
      return res.status(500).json({ error: '체인코드 호출 실패: ' + chainError.message });
    }

    // 2. Supabase에 풀 정보 저장
    const startTime = new Date();
    const endTime = new Date(startTime);
    endTime.setMonth(endTime.getMonth() + parseInt(durationMonths));

    // 기본 필드만 포함
    const poolData = {
      id,
      name,
      min_deposit: parseInt(minDeposit),
      interest_rate: parseFloat(interestRate),
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: 'open',
      total_deposit: parseInt(initialDeposit)
    };

    console.log('📝 Supabase에 저장할 풀 데이터:', poolData);

    try {
      const { data: insertedPool, error: poolError } = await supabase
        .from('pools')
        .insert(poolData)
        .select()
        .single();

      if (poolError) {
        console.error('❌ Supabase 풀 저장 실패:', poolError);
        throw new Error('풀 정보 저장 실패: ' + poolError.message);
      }

      console.log('✅ Supabase 풀 저장 성공:', insertedPool);
    } catch (dbError) {
      console.error('❌ Supabase 저장 중 에러:', dbError);
      return res.status(500).json({ error: '데이터베이스 저장 실패: ' + dbError.message });
    }

    console.log('✅ 풀 생성 완료');
    res.json({ message: '풀 생성 완료', poolId: id });

  } catch (err) {
    console.error('❌ 풀 생성 실패:', err);
    res.status(500).json({ error: err.message });
  }
});

// 사용자의 풀 조회
app.get('/QueryPoolsByUser', async (req, res) => {
  const { wallet } = req.query;
  if (!wallet) {
    console.log('지갑 주소 누락');
    return res.status(400).json({ error: '지갑 주소가 필요합니다.' });
  }

  try {
    console.log('🔗 체인코드 호출 → QueryPoolsByUser(', wallet, ')');
    const result = await sdk.send(true, 'QueryPoolsByUser', [wallet]);
    console.log('🎉 QueryPoolsByUser 성공 → 원본 응답:', result);
    console.log('원본 응답 타입:', typeof result);
    console.log('원본 응답 문자열:', result?.toString());
    
    // 체인코드 응답이 없는 경우
    if (!result) {
      console.log('체인코드 응답 없음');
      return res.json([]);
    }

    // 체인코드 응답 파싱
    let pools = [];
    try {
      // 응답이 Buffer인 경우 문자열로 변환
      const responseStr = result.toString();
      console.log('응답 문자열:', responseStr);

      // 빈 문자열이나 null 체크
      if (!responseStr || responseStr.trim() === '') {
        console.log('빈 응답 반환');
        return res.json([]);
      }

      // JSON 파싱 시도
      try {
        // 응답이 이미 객체인 경우
        if (typeof result === 'object' && result !== null) {
          console.log('응답이 이미 객체임');
          pools = result;
        } else {
          // 문자열인 경우 JSON 파싱
          console.log('문자열을 JSON으로 파싱 시도');
          pools = JSON.parse(responseStr);
        }
      } catch (parseError) {
        console.error('JSON 파싱 실패:', parseError);
        console.error('파싱 시도한 문자열:', responseStr);
        // 파싱 실패 시 빈 배열 반환
        return res.json([]);
      }
      
      // 응답이 배열이 아닌 경우 배열로 변환
      if (!Array.isArray(pools)) {
        console.log('단일 풀 객체를 배열로 변환');
        pools = [pools];
      }
      
      console.log('파싱된 풀 데이터:', pools);
      
      // participants와 deposits 필드 보정
      pools = pools.map(pool => {
        if (!pool) {
          console.log('null 풀 데이터 발견');
          return null;
        }

        console.log('처리할 풀 데이터:', pool);

        // 문자열로 된 participants와 deposits를 파싱
        let participants = [];
        let deposits = {};
        let joinedAt = {};

        try {
          if (typeof pool.participants === 'string') {
            participants = JSON.parse(pool.participants);
          } else if (Array.isArray(pool.participants)) {
            participants = pool.participants;
          }

          if (typeof pool.deposits === 'string') {
            deposits = JSON.parse(pool.deposits);
          } else if (typeof pool.deposits === 'object' && pool.deposits !== null) {
            deposits = pool.deposits;
          }

          if (typeof pool.joinedAt === 'string') {
            joinedAt = JSON.parse(pool.joinedAt);
          } else if (typeof pool.joinedAt === 'object' && pool.joinedAt !== null) {
            joinedAt = pool.joinedAt;
          }
        } catch (parseError) {
          console.error('풀 데이터 필드 파싱 실패:', parseError);
        }

        const processedPool = {
          ...pool,
          id: pool.id || pool.ID, // ID 필드 통일
          participants: Array.isArray(participants) ? participants : [],
          deposits: typeof deposits === 'object' && deposits !== null ? deposits : {},
          joinedAt: typeof joinedAt === 'object' && joinedAt !== null ? joinedAt : {},
          status: pool.status || 'Open',
          creator_address: pool.creator_address || pool.creatorAddress || wallet // 생성자 주소 추가
        };
        console.log('처리된 풀:', processedPool);
        return processedPool;
      }).filter(Boolean); // null 값 제거

    } catch (parseError) {
      console.error('풀 데이터 처리 실패:', parseError);
      console.error('원본 응답:', result.toString());
      return res.status(500).json({ error: '풀 데이터 처리 실패' });
    }
    
    console.log('최종 반환할 풀 목록:', pools);
    return res.json(pools);
  } catch (err) {
    console.error('사용자 풀 조회 실패:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.get('/queryPool', async function (req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing pool ID' });

  try {
    const result = await sdk.send(true, 'QueryPool', [id]);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/queryAllPools', async (req, res) => {
  try {
    const result = await sdk.send(true, 'QueryAllPools', []);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/joinPool', async (req, res) => {
  const { poolID, userAddress, deposit } = req.body;

  if (!poolID || !userAddress || !deposit) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await sdk.send(false, 'JoinPool', [poolID, userAddress, deposit.toString()]);
    return res.json({ message: '참여 완료', result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});



// ================= 정적 파일 서비스 및 React 라우팅 ==================

// React 앱의 정적 파일 서빙
const clientPath = path.join(__dirname, '../client/loan-client/build');
app.use(express.static(clientPath));

// API 라우트는 정적 파일 서빙 전에 정의
app.post('/api/inquiry', authenticateUser, async (req, res) => {
  try {
    const { name, email, message, captchaToken } = req.body;

    // 필수 필드 검증
    if (!name || !email || !message || !captchaToken) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
    }

    // reCAPTCHA 검증
    const isValidCaptcha = await verifyRecaptcha(captchaToken);
    if (!isValidCaptcha) {
      return res.status(400).json({ error: '캡챠 인증에 실패했습니다.' });
    }

    // Supabase에 문의 저장
    const { data, error: dbError } = await supabase
      .from('inquiries')
      .insert([
        {
          name,
          email,
          message,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (dbError) {
      console.error('Supabase 에러:', dbError);
      throw new Error('데이터베이스 저장 중 오류가 발생했습니다.');
    }

    console.log('저장된 문의:', data);

    // 자동 응답 이메일 전송
    try {
      // 개발 환경에서는 이메일 전송 로그만 출력
      if (process.env.NODE_ENV === 'development') {
        console.log('개발 환경: 이메일 전송 시뮬레이션');
        console.log('수신자:', email);
        console.log('제목: 문의가 접수되었습니다');
        console.log('내용:', `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb; margin-bottom: 20px;">문의 접수 확인</h2>
            <p style="margin-bottom: 15px;">안녕하세요, ${name}님</p>
            <p style="margin-bottom: 15px;">문의하신 내용이 성공적으로 접수되었습니다.</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; white-space: pre-wrap;">${message}</p>
            </div>
            <p style="margin-bottom: 15px;">문의하신 내용을 검토해보겠습니다. 모든 문의사항에 대해 답변을 드리지 못할 수 있음을 양해 부탁드립니다.</p>
            <p style="margin-bottom: 15px;">추가 문의사항이 있으시면 언제든지 문의해 주세요.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">이 메일은 발신 전용입니다. 문의사항은 고객센터를 이용해 주세요.</p>
            <p style="color: #6b7280; font-size: 14px; margin: 5px 0 0 0;">고객센터: 1234-5678 (평일 09:00 - 18:00)</p>
          </div>
        `);
      } else {
        // 프로덕션 환경에서는 실제 이메일 전송
        await resend.emails.send({
          from: '깐부대출 <noreply@fitend.com>',
          to: email,
          subject: '문의가 접수되었습니다',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2563eb; margin-bottom: 20px;">문의 접수 확인</h2>
              <p style="margin-bottom: 15px;">안녕하세요, ${name}님</p>
              <p style="margin-bottom: 15px;">문의하신 내용이 성공적으로 접수되었습니다.</p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; white-space: pre-wrap;">${message}</p>
              </div>
              <p style="margin-bottom: 15px;">문의하신 내용을 검토해보겠습니다. 모든 문의사항에 대해 답변을 드리지 못할 수 있음을 양해 부탁드립니다.</p>
              <p style="margin-bottom: 15px;">추가 문의사항이 있으시면 언제든지 문의해 주세요.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">이 메일은 발신 전용입니다. 문의사항은 고객센터를 이용해 주세요.</p>
              <p style="color: #6b7280; font-size: 14px; margin: 5px 0 0 0;">고객센터: 1234-5678 (평일 09:00 - 18:00)</p>
            </div>
          `
        });
      }
    } catch (emailError) {
      console.error('이메일 전송 에러:', emailError);
      // 이메일 전송 실패는 전체 프로세스를 실패시키지 않음
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('문의하기 에러:', error);
    res.status(500).json({ error: error.message || '문의 접수 중 오류가 발생했습니다.' });
  }
});

// reCAPTCHA 검증 함수
async function verifyRecaptcha(token) {
  try {
    const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
      params: {
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: token
      },
      timeout: 5000, // 5초 타임아웃
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!response.data.success) {
      console.error('reCAPTCHA 검증 실패:', response.data['error-codes']);
      return false;
    }

    return true;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error.message);
    // 네트워크 오류 시에도 true 반환 (개발 환경에서만 ★실제 배포될경우 네트워크 오류시에는 false로 꼭 바꿔야함 꼭!!)
    if (process.env.NODE_ENV === 'development') {
      console.log('개발 환경: reCAPTCHA 검증 우회');
      return true;
    }
    return false;
  }
}

// 이메일 확인 API
app.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    // 이메일 도메인 대소문자 구분 없이 처리
    const [localPart, domain] = email.split('@');
    const normalizedEmail = `${localPart}@${domain.toLowerCase()}`;
    
    // Supabase에서 사용자 확인
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;
    
    // 이메일 비교 시 도메인 부분을 소문자로 변환하여 비교
    const user = users.find(u => {
      const [userLocalPart, userDomain] = u.email.split('@');
      return userLocalPart === localPart && userDomain.toLowerCase() === domain.toLowerCase();
    });

    if (!user) {
      return res.json({ exists: false });
    }
    
    return res.json({
      exists: true,
      provider: user.app_metadata.provider || 'email'
    });
  } catch (error) {
    console.error('이메일 확인 에러:', error);
    res.status(500).json({ error: '이메일 확인 중 오류가 발생했습니다.' });
  }
});

// ================= 지갑 동기화 함수 ==================
// 서버 시작 시 DB의 모든 지갑을 체인코드에 복구
async function syncWalletsToChaincode() {
  try {
    const { data: profiles, error } = await supabase.from('profiles').select('wallet_id');
    if (error) {
      console.error('지갑 동기화 실패:', error);
      return;
    }
    for (const profile of profiles) {
      if (profile.wallet_id) {
        try {
          // 체인코드에 지갑 생성 요청 (이미 있으면 에러 무시)
          await axios.get(`http://localhost:${PORT}/chain/createWallet`, {
            params: {
              address: profile.wallet_id,
              initialBalance: 1000000 // 필요에 따라 0 또는 DB 잔액으로 변경 가능
            }
          });
          console.log('체인코드에 지갑 동기화:', profile.wallet_id);
        } catch (err) {
          if (err.response && err.response.data && err.response.data.error?.includes('already exists')) {
            // 이미 존재하면 무시
            console.log('이미 존재하는 지갑:', profile.wallet_id);
          } else {
            console.error('지갑 동기화 중 에러:', profile.wallet_id, err.message);
          }
        }
      }
    }
  } catch (e) {
    console.error('지갑 동기화 전체 실패:', e);
  }
}

// 서버 시작
app.listen(PORT, HOST, async () => {
  console.log(`서버 시작중 => http://${HOST}:${PORT}/`);
  // 서버 시작 직후 동기화 실행
  await syncWalletsToChaincode();

  // 서버 시작 부분 바로 뒤(예: app.listen(...) 위나 아래 어느 곳이든)
  // “0 0 * * *” 은 매일 자정(00:00)에 실행하라는 의미(서버 시간 기준)
  // cron.schedule('0 0 * * *', () => {
  //   console.log('🔔 [cron] 매일 자정 연체 처리 시작 →', new Date().toISOString());
  //   processOverdueLoans().catch(err => {
  //     console.error('[cron] processOverdueLoans 중 오류 발생:', err);
  //   });
  // }, {
  //   timezone: 'Asia/Seoul'  // (한국 시각 자정에 실행하려면 timezone 옵션 추가)
  // });
  // console.log('✅ 매일 자정 연체 확인(cron)이 예약되었습니다.');

  // 1분마다 실행 (테스트용)
  cron.schedule('* * * * *', () => {
    console.log('🔔 [cron 테스트] 1분마다 연체 처리 시작 →', new Date().toISOString());
    processOverdueLoans().catch(err => {
      console.error('[cron 테스트] processOverdueLoans 중 오류 발생:', err);
    });
  }, {
    timezone: 'Asia/Seoul'
  });
    console.log('✅ 1분마다 실행 (테스트용) 연체 확인(cron)이 예약되었습니다.');

      // ── 매월 1일 00:00(한국시간)에 prev_credit_score을 갱신 ──
  cron.schedule(
    '0 0 1 * *',
    () => {
      console.log('🔄 [cron] 매월 1일 prev_credit_score 갱신 시작 →', new Date().toISOString());
      updatePrevCreditScores().catch(err => {
        console.error('[cron] updatePrevCreditScores 오류:', err);
      });
    },
    {
      timezone: 'Asia/Seoul',
    }
  );
  console.log('✅ 매월 1일 00:00에 prev_credit_score 갱신(cron)이 예약되었습니다.');

});

// ================= 친구 API ==================

// 친구 추가 요청
app.post('/api/friends/add', authenticateUser, async (req, res) => {
  const { userId, friendEmail } = req.body;

  try {
    // 친구 이메일로 사용자 검색
    const { data: targetUser, error: searchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', friendEmail)
      .single();

    if (searchError || !targetUser) {
      return res.status(404).json({ error: '해당 이메일의 사용자를 찾을 수 없습니다.' });
    }

    // 기존 친구 요청 확인
    const { data: existing, error: existingError } = await supabase
      .from('friends')
      .select('*')
      .eq('user_id', userId)
      .eq('friend_user_id', targetUser.id)
      .maybeSingle();

    if (existing && existing.status === 'pending') {
      return res.status(400).json({ error: '이미 친구 요청을 보냈습니다.' });
    }

    // 친구 요청 추가
    const { error: insertError } = await supabase.from('friends').insert([
      {
        user_id: userId,
        friend_user_id: targetUser.id,
        status: 'pending',
      },
    ]);

    if (insertError) {
      return res.status(500).json({ error: '친구 요청 추가 중 오류가 발생했습니다.' });
    }

    res.status(200).json({ message: '친구 요청이 전송되었습니다.' });
  } catch (err) {
    console.error('친구 추가 요청 처리 중 오류:', err);
    res.status(500).json({ error: '친구 추가 요청 처리 중 오류가 발생했습니다.' });
  }
});


// =============================================
// 친구 목록 조회
// GET /api/friends
// =============================================
app.get('/api/friends', authenticateUser, async (req, res) => {
  const myId = req.user.id; // 인증 미들웨어가 붙여넣은 현재 사용자의 UUID

  try {
    // 1) 내가 user_id인 친구 관계 (내가 보낸 요청, status='accepted')
    //    -> friend_user_id 컬럼이 상대방 프로필의 UUID
    const { data: sentRows, error: sentErr } = await supabase
      .from('friends')
      .select('friend_user_id')
      .eq('user_id', myId)
      .eq('status', 'accepted');
    if (sentErr) {
      console.error('[Server] Supabase sentRows 에러 →', sentErr);
      return res.status(500).json({ error: '친구 조회 실패(1)' });
    }

    // 2) 내가 friend_user_id인 친구 관계 (내가 받은 요청, status='accepted')
    //    -> user_id 컬럼이 상대방 프로필의 UUID
    const { data: receivedRows, error: recErr } = await supabase
      .from('friends')
      .select('user_id')
      .eq('friend_user_id', myId)
      .eq('status', 'accepted');
    if (recErr) {
      console.error('[Server] Supabase receivedRows 에러 →', recErr);
      return res.status(500).json({ error: '친구 조회 실패(2)' });
    }

    // 3) 위 두 배열을 합쳐서, 중복 없이 "친구의 프로필 ID"만 모은다
    const partnerIds = [
      ...sentRows.map(r => r.friend_user_id),
      ...receivedRows.map(r => r.user_id)
    ]
      .filter((v, i, a) => v && a.indexOf(v) === i);

    // 친구가 아무도 없으면 빈 배열 반환
    if (partnerIds.length === 0) {
      return res.status(200).json({ friends: [] });
    }

    // 4) profiles 테이블에서 partnerIds에 해당하는 row들을 한 번에 가져온다
    //    – 칼럼 선택 시 avatar_url 대신 profile_image_url 로 수정
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, name, email, profile_image_url')
      .in('id', partnerIds);
    if (profErr) {
      console.error('[Server] Supabase 프로필 조회 에러 →', profErr);
      return res.status(500).json({ error: '프로필 조회 실패' });
    }

    // 5) 프론트가 기대하는 형태로 포맷
    //    { id, profile: { id, name, email, profile_image_url } }
    const friends = profiles.map(p => ({
      id: p.id,
      profile: {
        id: p.id,
        name: p.name,
        email: p.email,
        profile_image_url: p.profile_image_url || null
      }
    }));

    console.log('[Server] 최종 friends →', friends);
    return res.status(200).json({ friends });
  } catch (err) {
    console.error('[Server] /api/friends 에러 →', err);
    return res.status(500).json({ error: '친구 목록 처리 중 오류가 발생했습니다.' });
  }
});


// =============================================
// 받은 친구 요청 조회
// GET /api/friends/received
// =============================================
app.get('/api/friends/received', authenticateUser, async (req, res) => {
  const myId = req.user.id;

  try {
    // 1) 내게 온(friend_user_id = myId) status='pending'인 친구 요청
    const { data: rows, error: rowsErr } = await supabase
      .from('friends')
      .select('id, user_id')   // id: friends PK, user_id: 요청 보낸 쪽 UUID
      .eq('friend_user_id', myId)
      .eq('status', 'pending');
    if (rowsErr) {
      console.error('[Server] /api/friends/received 조회 에러 →', rowsErr);
      return res.status(500).json({ error: '받은 요청 조회 실패' });
    }

    // 2) 요청 보낸 쪽(user_id) 프로필만 가져오기 (id, name, email, profile_image_url)
    const senderIds = rows.map(r => r.user_id).filter(v => v);
    if (senderIds.length === 0) {
      return res.status(200).json({ requests: [] });
    }

    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, name, email, profile_image_url')
      .in('id', senderIds);
    if (profErr) {
      console.error('[Server] Supabase 프로필 조회 에러 →', profErr);
      return res.status(500).json({ error: '프로필 조회 실패' });
    }

    // 3) friends 테이블의 row(id, user_id)와 profiles(row) 정보를 묶어서 반환
    //    { id: <friends PK>, user_id: <보낸 쪽 UUID>, profile: { … } }
    const requests = rows.map(r => {
      const prof = profiles.find(p => p.id === r.user_id);
      return {
        id: r.id,
        user_id: r.user_id,
        profile: prof || { id: r.user_id, name: null, email: null, profile_image_url: null }
      };
    });

    return res.status(200).json({ requests });
  } catch (err) {
    console.error('[Server] /api/friends/received 에러 →', err);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 친구 요청 수락/거절
app.patch('/api/friends/request', async (req, res) => {
  const { requestId, status } = req.body;

  try {
    const { data, error } = await supabase
      .from('friends')
      .update({ status })
      .eq('id', requestId);

    if (error) {
      return res.status(500).json({ error: '친구 요청 업데이트 중 오류가 발생했습니다.' });
    }

    res.status(200).json({ message: '친구 요청이 업데이트되었습니다.' });
  } catch (err) {
    console.error('친구 요청 업데이트 처리 중 오류:', err);
    res.status(500).json({ error: '친구 요청 업데이트 처리 중 오류가 발생했습니다.' });
  }
});

// 트랜잭션 해시로 거래 내역 조회
app.get('/api/transaction/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;
    if (!txHash) {
      return res.status(400).json({ 
        success: false, 
        message: '트랜잭션 해시가 필요합니다.' 
      });
    }

    // 1. Supabase에서 해당 트랜잭션 해시로 대출 정보 조회
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*')
      .eq('tx_hash', txHash)
      .single();

    if (loanError) {
      console.error('대출 정보 조회 실패:', loanError);
      return res.status(404).json({ 
        success: false, 
        message: '해당 트랜잭션의 대출 정보를 찾을 수 없습니다.' 
      });
    }

    // 2. 체인코드에서 트랜잭션 정보 조회
    const chainResult = await sdk.send(true, 'QueryLoanRequest', [loan.id]);
    
    // 3. 응답 데이터 구성
    const response = {
      success: true,
      transaction: {
        txHash: loan.tx_hash,
        contractHash: loan.contract_hash,
        createdAt: loan.created_at,
        loanInfo: chainResult,
        // 추가 정보
        verification: {
          isContractValid: loan.contract_hash ? true : false,
          isTransactionValid: true, // 체인코드에서 조회 성공하면 유효한 것
          lastVerified: new Date().toISOString()
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error('트랜잭션 조회 실패:', error);
    res.status(500).json({ 
      success: false, 
      message: '트랜잭션 조회 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

//================= 자금현황 api ==================

//거래상대 이름 가져오기
app.post('/getName', async (req, res) => {
  const { userId } = req.body;
  console.log('요청 받은 userId:', userId);

  if (!userId) return res.status(400).json({ error: 'userId가 필요합니다.' });

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: '이름을 찾을 수 없습니다.' });
    }

    res.json(data.name);
  } catch (err) {
    console.error('[getName 오류]', err);
    res.status(500).json({ error: '서버 오류' });
  }
});


// 로그인한 사용자의 전체 대출 거래 기록 조회 (빌려준 것 + 빌린 것)
app.post('/myLoanTransactions', authenticateUser, async (req, res) => {
  const { userId } = req.body;

  try {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('id, type, amount, loan_id, related_user_id, created_at')
      .or(`user_id.eq.${userId}`)
      .in('type', ['loan_sent', 'loan_received'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    console.error('대출 거래 기록 조회 실패:', err);
    res.status(500).json({ error: '대출 기록 조회 실패' });
  }
});
// POST /getLoanMeta 이자율 상환기간 조회회
app.post('/getLoanMeta', async (req, res) => {
  const { loanId } = req.body;
  if (!loanId) return res.status(400).json({ error: 'loanId가 필요합니다.' });

  try {
    const { data, error } = await supabase
      .from('loans')
      .select('interest_rate, duration_days')
      .eq('id', loanId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'loan 정보가 없습니다.' });
    }

    return res.json(data); // { interest_rate: ..., duration_days: ... }
  } catch (err) {
    console.error('loan meta 조회 실패:', err);
    res.status(500).json({ error: err.message });
  }
});

// ================= 계약서 해시 생성 및 검증 ==================

// 계약서 해시 생성 함수
async function generateContractHash(contractImage) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    hash.update(contractImage);
    resolve(hash.digest('hex'));
  });
}

// 계약서 다운로드 및 해시 검증
app.get('/api/contract/verify', async (req, res) => {
  const { loanId, contractImage } = req.query;
  
  try {
    // 1. loans 테이블에서 계약서 해시 조회
    const { data: loan, error } = await supabase
      .from('loans')
      .select('contract_hash')
      .eq('id', loanId)
      .single();
      
    if (error) throw error;
    
    // 2. 현재 계약서 이미지의 해시 생성
    const currentHash = await generateContractHash(contractImage);
    
    // 3. 해시 비교
    const isValid = currentHash === loan.contract_hash;
    
    res.json({ 
      isValid,
      message: isValid ? '계약서가 유효합니다.' : '계약서가 조작되었습니다.'
    });
  } catch (err) {
    console.error('계약서 검증 중 오류:', err);
    res.status(500).json({ error: '계약서 검증 중 오류가 발생했습니다.' });
  }
});

// 계약서 저장 및 해시 생성
app.post('/api/contract/save', async (req, res) => {
  try {
    const { loanId, contractImage } = req.body;
    if (!loanId || !contractImage) {
      return res.status(400).json({ message: '대출 ID와 계약서 이미지가 필요합니다.' });
    }

    // 계약서 해시 생성
    const contractHash = await generateContractHash(contractImage);
    console.log('생성된 계약서 해시:', contractHash);

    // Supabase에 해시 저장
    const { data, error } = await supabase
      .from('loans')
      .update({ 
        contract_hash: contractHash,
        created_at: getKoreanTime()
      })
      .eq('id', loanId)
      .select();

    if (error) {
      console.error('Supabase 업데이트 에러:', error);
      throw error;
    }

    console.log('계약서 해시 저장 성공:', data);
    res.json({ 
      success: true,
      message: '계약서 해시가 저장되었습니다.', 
      contractHash,
      data 
    });
  } catch (error) {
    console.error('계약서 해시 저장 실패:', error);
    res.status(500).json({ 
      success: false,
      message: '계약서 해시 저장 실패',
      error: error.message 
    });
  }
});


// ======= 프로필의 prev_credit_score을 현재 credit_score로 복사하는 함수 =======
async function updatePrevCreditScores() {
  try {
    // 1) 모든 사용자 프로필에서 id와 현재 credit_score를 가져온다
    const { data: profiles, error: selectError } = await supabase
      .from('profiles')
      .select('id, credit_score');
    if (selectError) {
      console.error('[updatePrevCreditScores] 프로필 조회 실패:', selectError);
      return;
    }

    // 2) 가져온 프로필들을 순회하며 prev_credit_score을 업데이트
    for (const prof of profiles) {
      const newPrev = prof.credit_score ?? 0;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ prev_credit_score: newPrev, updated_at: new Date().toISOString() })
        .eq('id', prof.id);

      if (updateError) {
        console.error(
          `[updatePrevCreditScores] 사용자(${prof.id}) prev_credit_score 업데이트 실패:`,
          updateError
        );
      }
    }

    console.log(
      `[updatePrevCreditScores] 완료 - 총 ${profiles.length}개 프로필 prev_credit_score 갱신`
    );
  } catch (err) {
    console.error('[updatePrevCreditScores] 예외 발생:', err);
  }
}

// 마지막에만 index.html 반환 (SPA 대응용)
app.get('*', function (req, res) {
  res.sendFile(path.join(clientPath, 'index.html'));
});

