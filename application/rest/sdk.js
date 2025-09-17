// rest/sdk.js
'use strict';

const { Wallets, Gateway } = require('fabric-network');
const path = require('path');
const fs = require('fs');

const channelName = process.env.FABRIC_CHANNEL_NAME || 'channel1';
const chaincodeName = process.env.FABRIC_CHAINCODE_NAME || 'abstore'; // 실제 체인코드 이름으로 변경
const org1UserId = process.env.FABRIC_USER_ID || 'appUser';

const walletPath = path.resolve(__dirname, '..', 'wallet'); // rest 폴더의 부모의 wallet 폴더
const ccpPath = path.resolve(__dirname, '..', 'connection-org1.json'); // rest 폴더의 부모의 connection-org1.json

async function send(isQuery, func, args = []) { // 'res' 인자 제거, args 기본값 설정

    let ccp;
    try {
        ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    } catch (error) {
        console.error(`SDK Error: Failed to load CCP from ${ccpPath}: ${error.message}`);
        throw new Error(`SDK Configuration Error: Could not load connection profile. Details: ${error.message}`);
    }

    let wallet;
    try {
        wallet = await Wallets.newFileSystemWallet(walletPath);
        const identity = await wallet.get(org1UserId);
        if (!identity) {
            console.error(`SDK Error: Identity for user "${org1UserId}" not found in wallet: ${walletPath}`);
            throw new Error(`SDK Authentication Error: User identity "${org1UserId}" not found. Please enroll the user first.`);
        }
    } catch (error) {
        console.error(`SDK Error: Failed to load wallet from ${walletPath} or get identity: ${error.message}`);
        throw new Error(`SDK Wallet Error: Could not access wallet or user identity. Details: ${error.message}`);
    }

    const gateway = new Gateway();

    try {
        // console.log(`SDK: Connecting to gateway with user "${org1UserId}"...`);
        await gateway.connect(ccp, {
            wallet,
            identity: org1UserId,
            discovery: { enabled: true, asLocalhost: false } // asLocalhost는 환경에 따라 조정
        });
        // console.log('SDK: Successfully connected to gateway.');

        const network = await gateway.getNetwork(channelName);
        // console.log(`SDK: Successfully connected to channel '${channelName}'.`);
        const contract = network.getContract(chaincodeName);
        // console.log(`SDK: Got contract for chaincode '${chaincodeName}'.`);

        let resultBuffer;

        if (isQuery) {
            // console.log(`SDK: Evaluating transaction: ${func} with args: ${JSON.stringify(args)}`);
            resultBuffer = await contract.evaluateTransaction(func, ...args);
            // console.log(`SDK: Transaction ${func} evaluated, result (buffer length): ${resultBuffer ? resultBuffer.length : 'null'}`);
        } else {
            // console.log(`SDK: Submitting transaction: ${func} with args: ${JSON.stringify(args)}`);
            resultBuffer = await contract.submitTransaction(func, ...args);
            // console.log(`SDK: Transaction ${func} submitted, result (buffer length): ${resultBuffer ? resultBuffer.length : 'null'}`);
        }
        return resultBuffer; // Buffer 객체 반환 (비어있을 수도 있음)

    } catch (error) {
        // Fabric 에러 메시지를 좀 더 구체적으로 파싱하여 사용자 친화적인 메시지로 변환하거나 로깅 강화
        let detailedErrorMessage = error.message;
        if (error.errors && error.errors.length > 0) {
            detailedErrorMessage = error.errors.map(e => e.message).join('; ');
        }
        console.error(`SDK Error during Fabric transaction ${func} ([${args.join(', ')}]): ${detailedErrorMessage}\nStack: ${error.stack}`);

        // 특정 Fabric 오류 유형에 따라 상태 코드나 메시지를 커스터마이징 할 수 있음
        const fabricError = new Error(`Fabric transaction failed for '${func}'. Details: ${detailedErrorMessage}`);
        fabricError.cause = error; // 원래 에러를 cause에 저장
        fabricError.status = 500; // 기본적으로 서버 내부 오류
        if (detailedErrorMessage.includes('endorsement policy failure') || detailedErrorMessage.includes('failed to invoke chaincode')) {
            fabricError.status = 500; // 또는 400 (잘못된 요청) 등 상황에 맞게
        }
        if (detailedErrorMessage.includes('does not exist') || detailedErrorMessage.includes('NOT_FOUND')) {
            fabricError.status = 404; // 리소스를 찾을 수 없음
        }
        // 필요한 경우 다른 에러 코드/메시지 처리 추가

        throw fabricError; // 가공된 에러 객체를 throw
    } finally {
        // console.log('SDK: Disconnecting from gateway...');
        if (gateway && gateway. τότε) { // gateway 객체가 존재하고 연결된 상태인지 확인 (선택적)
             gateway.disconnect();
            // console.log('SDK: Gateway disconnected.');
        }
    }
}

module.exports = {
    send
};