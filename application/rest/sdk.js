'use strict';

const { Wallets, Gateway } = require('fabric-network');
const path = require('path');
const fs = require('fs');

const channelName = 'channel1';
const chaincodeName = 'abstore'; // 체인코드 이름 확인 (abstore 또는 DigitalWillChaincode 등)

const walletPath = path.join(process.cwd(), '..', 'wallet');
const ccpPath = path.resolve(__dirname, '..', 'connection-org1.json');
const org1UserId = 'appUser';

// 'res' 인자를 선택적으로 만들고, 함수는 항상 Promise를 반환하도록 수정
// Promise는 성공 시 체인코드 결과(Buffer)를, 실패 시 오류 객체를 resolve/reject 합니다.
async function send(isQuery, func, args, res) { // 'result' 인자 제거
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    // console.log(`Wallet path: ${walletPath}`); // 필요시 주석 해제

    const gateway = new Gateway();

    try {
        await gateway.connect(ccp, {
            wallet,
            identity: org1UserId,
            discovery: { enabled: true, asLocalhost: false }
        });
        // console.log('Success to connect network');

        const network = await gateway.getNetwork(channelName);
        // console.log(`Success to connect to channel '${channelName}'`);
        const contract = network.getContract(chaincodeName);

        let resultBuffer; // 체인코드 결과는 Buffer 형태로 받음

        if (isQuery) {
            // console.log(`Evaluating transaction: ${func} with args: ${args}`);
            resultBuffer = await contract.evaluateTransaction(func, ...args);
            // console.log(`Transaction ${func} evaluated, result (buffer): ${resultBuffer}`);
            if (res && typeof res.json === 'function') { // res 객체가 제공되면 직접 응답
                try {
                    // 체인코드 결과가 JSON 문자열이라고 가정하고 파싱 시도
                    res.json(JSON.parse(resultBuffer.toString()));
                } catch (e) {
                    // JSON 파싱 실패 시 문자열 그대로 전송 (또는 오류 처리)
                    console.warn(`evaluateTransaction result for ${func} is not a valid JSON string. Sending as string.`);
                    res.send(resultBuffer.toString());
                }
            }
            // res 객체가 없거나, 있더라도 항상 resultBuffer를 반환
            return resultBuffer; // Buffer 객체 반환
        } else {
            // console.log(`Submitting transaction: ${func} with args: ${args}`);
            resultBuffer = await contract.submitTransaction(func, ...args);
            // console.log(`Transaction ${func} submitted, result (buffer): ${resultBuffer}`);
            if (res && typeof res.json === 'function') { // res 객체가 제공되면 직접 응답
                // submitTransaction의 결과는 체인코드가 반환한 값 (예: willID 문자열)
                // 또는 체인코드가 아무것도 반환하지 않으면 빈 버퍼일 수 있음
                if (resultBuffer && resultBuffer.length > 0) {
                    res.json({
                        message: `Transaction ${func} submitted successfully.`,
                        chaincodeResponse: resultBuffer.toString() // 체인코드 반환값 포함
                    });
                } else {
                    res.json({ message: `Transaction ${func} submitted successfully (no response from chaincode).` });
                }
            }
            // res 객체가 없거나, 있더라도 항상 resultBuffer를 반환
            return resultBuffer; // Buffer 객체 반환 (willID가 담겨 있을 수 있음)
        }
    } catch (error) {
        console.error(`SDK Error in function ${func}: ${error.stack || error}`);
        if (res && typeof res.status === 'function' && typeof res.send === 'function') {
            // res 객체가 제공된 경우에만 HTTP 응답 시도
            res.status(500).send({
                error: `SDK Error processing transaction ${func}`,
                details: error.message
            });
        }
        // res 객체가 없더라도, 또는 HTTP 응답을 보냈더라도 오류를 다시 throw
        // 이렇게 하면 server.js의 try...catch에서 이 오류를 잡을 수 있음
        throw error;
    } finally {
        // console.log('Disconnecting from gateway...');
        await gateway.disconnect();
    }
}

module.exports = {
    send: send
};