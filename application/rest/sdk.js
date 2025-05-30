

const fs = require('fs');
const path = require('path');
const { Wallets, Gateway } = require('fabric-network');

// 환경 설정
const CHANNEL_NAME = 'channel1';
const CHAINCODE_NAME = 'abstore';
const USER_ID = 'admin';  // 체인코드 호출에 사용할 지갑 ID
const CCP_PATH = path.resolve(__dirname, '..', 'connection-org1.json');
const WALLET_PATH = path.resolve(__dirname, '..', 'wallet');

/**
 * send: 체인코드 호출 유틸
 * @param {boolean} isQuery - true면 evaluateTransaction, false면 submitTransaction
 * @param {string} funcName - 호출할 체인코드 함수 이름
 * @param {string[]} args - 함수 파라미터 배열
 * @returns {Promise<any>} - 쿼리 결과(JSON) 또는 { success: true }
 */
async function send(isQuery, funcName, args) {
  // 1) CCP 로드
  const ccp = JSON.parse(fs.readFileSync(CCP_PATH, 'utf8'));

  // 2) 지갑 로드
  const wallet = await Wallets.newFileSystemWallet(WALLET_PATH);

  // 3) Gateway 생성 및 연결
  const gateway = new Gateway();
  try {
    await gateway.connect(ccp, {
      wallet,
      identity: USER_ID,
      discovery: { enabled: true, asLocalhost: false }
    });

    // 4) 네트워크 및 컨트랙트 가져오기
    const network = await gateway.getNetwork(CHANNEL_NAME);
    const contract = network.getContract(CHAINCODE_NAME);

    // 5) 체인코드 호출
    if (isQuery) {
      const resultBytes = await contract.evaluateTransaction(funcName, ...args);
      try {
        return JSON.parse(resultBytes.toString());
      } catch {
        return resultBytes.toString();
      }
    } else {
      try {
        await contract.submitTransaction(funcName, ...args);
        return { success: true };
      } catch (err) {
        // FabricError handling: extract peer response message if available
        const details = err.responses && err.responses[0] && err.responses[0].response && err.responses[0].response.message;
        const message = details || err.message;
        throw new Error(message);
      }
    }
  } finally {
    // 6) 연결 해제
    gateway.disconnect();
  }
}

module.exports = { send };
