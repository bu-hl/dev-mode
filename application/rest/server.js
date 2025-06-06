const express = require('express');
const cors = require('cors');
const path = require('path');
const sdk = require('./sdk');

const mongoose = require('mongoose');
const User = require('../chain_api/models/tb_user.model');
require('dotenv').config();

const app = express();
const PORT = 8001;
const HOST = '0.0.0.0';
https://0.0.0.0:8001
// ✅ CORS 설정
app.use(cors({
  origin: `http://${HOST}:${PORT}`,
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB 연결
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('MongoDB 연결 문자열이 .env에 설정되어 있지 않습니다.');
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => console.log('✅ MongoDB 연결 성공'))
  .catch(err => console.error('❌ MongoDB 연결 실패:', err));

// 라우터 연결
const userservice = require('../chain_api/service/user.service'); // ✅ 올바른 경로
const oauthservice = require('../chain_api/service/genesis.service');
const carservice = require('../chain_api/service/car.service');
const walletrouter = require('../chain_api/service/wallet.service');
const carListService = require('../chain_api/service/carList.service');

app.use('/api/users', userservice);
app.use('/oauth', oauthservice);
app.use('/api/car', carservice);      // ✅ 새로 만든 car.routes.js 라우터 (겹치지 않으면 둘 다 사용 가능)
app.use('/api/wallet', walletrouter);
app.use('/api/carlist', carListService);
app.use('/uploads', express.static('uploads')); // 이미지 정적 경로

// 정적 파일 제공
app.use(express.static(path.join(__dirname, '../client')));

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
