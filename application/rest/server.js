const express = require('express');
const cors = require('cors');
const path = require('path');
const sdk = require('./sdk');

const app = express();
const PORT = 8001;
const HOST = '0.0.0.0';

// ✅ CORS 설정
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 기존 체인코드 관련 API들
app.get('/init', function (req, res) {
  let a = req.query.a;
  let aval = req.query.aval;
  let b = req.query.b;
  let bval = req.query.bval;
  let args = [a, aval, b, bval];
  sdk.send(false, 'Init', args, res);
});

app.get('/invoke', function (req, res) {
  let a = req.query.a;
  let b = req.query.b;
  let value = req.query.value;
  let args = [a, b, value];
  sdk.send(false, 'Invoke', args, res);
});

app.get('/query', function (req, res) {
  let name = req.query.name;
  let args = [name];
  sdk.send(true, 'Query', args, res);
});

app.get('/delete', function (req, res) {
  let name = req.query.name;
  let args = [name];
  sdk.send(false, 'Delete', args, res);
});

app.get('/queryAll', function (req, res) {
  sdk.send(true, 'GetAllQuery', [], res);
});

// 차량 등록
app.post('/addCar', (req, res) => {
  const { vin, owner, model } = req.body;
  const args = [vin, owner, model];
  sdk.send(false, 'AddCar', args, res);
});

// 차량 수리 기록 등록
app.post('/addCarRecord', (req, res) => {
  const { vin, record } = req.body;
  const args = [vin, record];
  sdk.send(false, 'AddCarRecord', args, res);
});

// 차량 수리기록 조회
app.get('/getCar', (req, res) => {
  const { vin } = req.query;
  if (!vin) {
    return res.status(400).json({ error: "vin is required" });
  }
  const args = [vin];
  sdk.send(true, 'GetCar', args, res);
});

// 포인트 수령
app.post('/receivePoints', (req, res) => {
  const { vin, points } = req.body;
  const args = [vin, points];
  sdk.send(false, 'ReceivePoints', args, res);
});

// 포인트 사용
app.post('/payPoints', (req, res) => {
  const { vin, points } = req.body;
  const args = [vin, points];
  sdk.send(false, 'PayPoints', args, res);
});

// ✅ 지갑 주소 수신 API 추가
app.post('/walletAddress', (req, res) => {
  const { address } = req.body;

  if (!address) {
    return res.status(400).json({ error: '지갑 주소가 누락되었습니다.' });
  }

  console.log('수신된 지갑 주소:', address);

  // TODO: 체인코드 저장, 사용자 등록, 포인트 지급 등의 추가 처리 가능
  res.status(200).json({ message: '지갑 주소 수신 완료', address });
});

// 정적 파일 제공
app.use(express.static(path.join(__dirname, '../client')));

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
