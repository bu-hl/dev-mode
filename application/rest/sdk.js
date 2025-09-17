'use strict';

const { Wallets, Gateway } = require('fabric-network');
const path = require('path');
const fs = require('fs');

const channelName = 'channel1';
const chaincodeName = 'abstore';

const walletPath = path.join(process.cwd(), '..', 'wallet');
const ccpPath = path.resolve(__dirname, '..', 'connection-org1.json');
const org1UserId = 'appUser';

async function send(type, func, args) {
  // 1) 호출 직전: 어떤 함수, 어떤 인자로 호출되는지
  console.log(`🔗 체인코드 호출 → ${func}(${args.join(', ')})`);

  try {
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const gateway = new Gateway();

    await gateway.connect(ccp, {
      wallet,
      identity: org1UserId,
      discovery: { enabled: true, asLocalhost: false },
    });

    const network = await gateway.getNetwork(channelName);
    const contract = network.getContract(chaincodeName);

    if (type) {
      const result = await contract.evaluateTransaction(func, ...args);
      const resultStr = result.toString();

      // 2) 평가(조회) 성공 직후
      console.log(`🎉 ${func} 평가 성공 → 응답: ${resultStr}`);

      try {
        return JSON.parse(resultStr); // JSON이면 파싱
      } catch {
        return resultStr; // 아니면 문자열 그대로 반환
      }
    } else {
      // Submit with txId 로그, submitTransaction() 수동 방식
      const transaction = contract.createTransaction(func);
      const txId = transaction.getTransactionId();
      console.log(`🆔 ${func} 트랜잭션 ID → ${txId}`);

      const response = await transaction.submit(...args);
      console.log(`🎉 ${func} 제출 성공 → 응답: ${response ? response.toString() : 'No payload'}`);
      return txId;
    }

  } catch (error) {
    // Fabric SDK의 endorsement 오류에는 `error.responses` 배열이 존재할 수 있습니다.
    // peer가 반환한 payload(buffer)에 실제 체인코드 오류 메시지가 들어있으므로, 이를 toString() 해 봅니다.
    console.error(`🚨 ${func} 에러 발생 →`, error.message);

    // Peer별로 반환된 페이로드가 있으면 출력해 줍니다.
    if (error.responses) {
      for (const resp of error.responses) {
        if (resp.response && resp.response.payload) {
          const payloadBuffer = resp.response.payload;
          console.error('🚨 체인코드 에러 페이로드 (peer):', resp.peer);
          console.error('🚨 페이로드 버퍼 →', payloadBuffer);
          // 버퍼를 문자열로 디코드
          console.error('🚨 페이로드 메시지 텍스트 →', payloadBuffer.toString());
        }
      }
    }

    // 최종적으로 에러를 호출자에게 던집니다.
    throw new Error(`send() 오류: ${error.message}`);
  } 
}

module.exports = { send };
