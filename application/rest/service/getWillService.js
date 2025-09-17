// application/rest/service/getWillService.js
// application/rest/service/getWillService.js

const { decrypt, calculateHash } = require('../utils/encryption');
const pool = require('../db');
const sdk = require('../sdk');
const userService = require('./userService');

/**
 * 유언장 상세 정보를 블록체인과 오프체인 DB에서 조회하고 결합하여 반환합니다.
 * - title은 오프체인 DB에서 원본을 가져옵니다.
 * - 유언자 ID 및 지정 열람자 정보는 해시하여 체인코드에 전달합니다.
 * - 체인코드에서 받은 `images` 필드는 이미지 메타데이터 배열의 해시값입니다.
 * - 실제 이미지 메타데이터와 파일은 오프체인 DB에서 조회하고, 해시값을 비교하여 무결성을 검증합니다.
 */
async function getWillDetailsService(blockchainWillId, username) {
    let connection;
    try {
        console.log(`Service: Fetching details for will (BC ID: ${blockchainWillId}) by user: ${username}`);

        // 1. 사용자 정보 조회 및 해시 (지정 열람자 비교용)
        let viewerIdentityForChaincode = { name: "", phone: "" };
        try {
            const userDetails = await userService.getUserDetailsByUsernameService(username);
            if (userDetails && userDetails.realName && userDetails.phone) {
                viewerIdentityForChaincode.name = calculateHash(userDetails.realName);
                viewerIdentityForChaincode.phone = calculateHash(userDetails.phone);
                console.log(`Service: User details for '${username}' fetched and hashed for viewerIdentity.`);
            } else {
                console.warn(`Service: User details (realName or phone) incomplete for '${username}'. Sending blank hashed viewerIdentity.`);
                viewerIdentityForChaincode.name = calculateHash("");
                viewerIdentityForChaincode.phone = calculateHash("");
            }
        } catch (userError) {
            console.error(`Service: Error fetching user details for '${username}': ${userError.message}. Sending blank hashed viewerIdentity.`);
            viewerIdentityForChaincode.name = calculateHash("");
            viewerIdentityForChaincode.phone = calculateHash("");
        }
        const viewerIdentityJSONStringToCompare = JSON.stringify(viewerIdentityForChaincode);

        // 2. 요청자 username 해시 (유언자 ID 비교용)
        const hashedUsernameToCompare = calculateHash(String(username));

        console.log(`Service: Calling chaincode 'GetWillDetails' with WillID: ${blockchainWillId}, HashedUsername: ${hashedUsernameToCompare}, HashedViewerIdentityJSON: ${viewerIdentityJSONStringToCompare}`);

        // 3. 체인코드 호출 (GetWillDetails)
        let blockchainDataBuffer;
        try {
            blockchainDataBuffer = await sdk.send(
                true, // isQuery
                'GetWillDetails',
                [String(blockchainWillId), hashedUsernameToCompare, viewerIdentityJSONStringToCompare]
            );
        } catch (chaincodeError) {
            if (chaincodeError.message && chaincodeError.message.toLowerCase().includes("access denied")) {
                console.warn(`Service: Access denied by chaincode for will ID ${blockchainWillId}, user ${username}.`);
                const accessDeniedError = new Error(`해당 유언장(ID: ${blockchainWillId})에 접근할 권한이 없습니다. 작성자 본인이거나 지정된 열람자만 내용을 확인할 수 있습니다.`);
                accessDeniedError.status = 403;
                throw accessDeniedError;
            }
            console.error(`Service: Chaincode error during 'GetWillDetails' for will ID ${blockchainWillId}: ${chaincodeError.stack || chaincodeError}`);
            const serviceError = new Error(`블록체인에서 유언장 정보를 가져오는 중 오류가 발생했습니다. (Will ID: ${blockchainWillId})`);
            serviceError.status = 500;
            serviceError.cause = chaincodeError;
            throw serviceError;
        }

        if (!blockchainDataBuffer || blockchainDataBuffer.length === 0) {
            const error = new Error(`Service Error: Will with ID ${blockchainWillId} not found on blockchain, or no data returned.`);
            error.status = 404;
            throw error;
        }

        // 4. 체인코드 응답 파싱
        let blockchainWill;
        try {
            blockchainWill = JSON.parse(blockchainDataBuffer.toString());
            if (blockchainWill && blockchainWill.designatedViewers === null) {
                blockchainWill.designatedViewers = [];
            }
        } catch (parseError) {
            console.error("Service Error: Failed to parse blockchain response:", parseError, "Raw data:", blockchainDataBuffer.toString());
            throw Object.assign(new Error('Service Error: Failed to parse will data from blockchain.'), { status: 500, cause: parseError });
        }

        const {
            contentHash: storedTextHash,
            offChainStorageRef: willDbId, // MariaDB의 Wills 테이블 ID
            images: storedImagesJSONHash   // 이미지 메타데이터 배열 전체의 해시값
            // blockchainWill.title 은 해시된 제목임
        } = blockchainWill;

        if (!storedTextHash || !willDbId) {
            console.error("Service Error: Blockchain data missing crucial fields (contentHash or offChainStorageRef):", blockchainWill);
            throw Object.assign(new Error('Service Error: Incomplete will data from blockchain (missing hash or DB ref).'), { status: 500 });
        }

        // 5. 오프체인 DB에서 유언 원본 텍스트 및 '원본 제목' 조회, 복호화, 무결성 검증
        connection = await pool.getConnection();
        // SQL 쿼리 수정: title도 함께 조회
        const selectWillDataQuery = `SELECT title, encrypted_content, encryption_iv, encryption_auth_tag FROM Wills WHERE id = ?`;
        const [willRows] = await connection.execute(selectWillDataQuery, [willDbId]);

        if (willRows.length === 0) {
            throw Object.assign(new Error(`Service Error: Will data (text content and title) not found in database for reference ID ${willDbId}.`), { status: 404 });
        }
        const originalTitleFromDb = willRows[0].title; // DB에서 가져온 원본 제목
        const encryptedTextPayloadFromDb = {
            iv: willRows[0].encryption_iv,
            encryptedData: willRows[0].encrypted_content,
            authTag: willRows[0].encryption_auth_tag
        };
        const decryptedContent = decrypt(encryptedTextPayloadFromDb);
        const currentTextHash = calculateHash(decryptedContent);

        if (currentTextHash !== storedTextHash) {
            console.warn(`Service Warning: Text data integrity check FAILED for will ${blockchainWillId}. Stored hash: ${storedTextHash}, Current hash: ${currentTextHash}`);
            throw Object.assign(new Error('유언장 원본 내용의 무결성 검증에 실패했습니다. 내용이 변경되었을 수 있습니다.'), { status: 409 });
        }
        console.log(`Service: Text data integrity check passed for will ${blockchainWillId}. Original title from DB: '${originalTitleFromDb}'`);

        // 6. 오프체인 DB에서 이미지 정보 조회 및 무결성 검증 (이전과 동일)
        const imageDataUrls = [];
        const imageMetadataFromDbForHashComparison = [];

        const selectImagesQuery = `SELECT id, image_data, mime_type, file_name FROM WillImages WHERE will_db_id = ?`;
        const [imageRowsFromDb] = await connection.execute(selectImagesQuery, [willDbId]);

        if (imageRowsFromDb && imageRowsFromDb.length > 0) {
            for (const imgRow of imageRowsFromDb) {
                const imageBuffer = imgRow.image_data;
                const imageMimeType = imgRow.mime_type;
                const imageRecordId = imgRow.id;
                const fileName = imgRow.file_name;
                const individualImageHashFromDb = calculateHash(imageBuffer);

                imageMetadataFromDbForHashComparison.push({
                    imageHash: individualImageHashFromDb,
                    imageOffChainRef: imageRecordId,
                    fileName: fileName
                });
                imageDataUrls.push({
                    id: imageRecordId,
                    url: `data:${imageMimeType};base64,${imageBuffer.toString('base64')}`,
                    fileName: fileName,
                    hashFromDb: individualImageHashFromDb,
                    integrityOk: true
                });
            }
        }

        const currentImagesJSONString = JSON.stringify(imageMetadataFromDbForHashComparison);
        const currentImagesJSONHash = calculateHash(currentImagesJSONString);
        const emptyImagesArrayHash = calculateHash("[]");

        if (storedImagesJSONHash && storedImagesJSONHash !== emptyImagesArrayHash && currentImagesJSONHash !== storedImagesJSONHash) {
            console.warn(`Service Warning: IMAGES JSON data integrity check FAILED for will ${blockchainWillId}. Stored hash on chain: ${storedImagesJSONHash}, Current hash from DB images: ${currentImagesJSONHash}`);
            imageDataUrls.forEach(img => img.integrityOk = false);
        } else if (storedImagesJSONHash && storedImagesJSONHash !== emptyImagesArrayHash) {
            console.log(`Service: IMAGES JSON data integrity check passed for will ${blockchainWillId}.`);
        } else if ((!storedImagesJSONHash || storedImagesJSONHash === emptyImagesArrayHash) && imageRowsFromDb.length > 0) {
            console.warn(`Service Warning: Chaincode has no/empty images hash, but DB has images for will ${blockchainWillId}.`);
        } else {
            console.log(`Service: No images found in DB or chaincode indicates no images for will ${blockchainWillId}.`);
        }

        // 최종 반환 객체 구성
        const result = {
            ...blockchainWill, // id(해시된 ID), testatorId(해시), contentHash, offChainStorageRef, designatedViewers, images(해시된 JSON 문자열), createdAt(해시), status, transactionId 등 블록체인 원본 데이터
            title: originalTitleFromDb, // DB에서 가져온 원본 제목으로 덮어쓰거나 추가
            originalContent: decryptedContent,
            imageDataUrls: imageDataUrls,
        };
        // blockchainWill.title (해시된 제목)을 명시적으로 사용하고 싶지 않다면, 아래와 같이 delete 후 할당도 가능
        // delete result.title; // 블록체인의 해시된 title을 제거 (선택 사항)
        // result.originalTitle = originalTitleFromDb; // 필드명을 다르게 할 수도 있음

        return result;

    } catch (error) {
        if (error.status) {
            console.error(`Service Error (propagating with status ${error.status}) in getWillDetailsService for ID ${blockchainWillId}, user ${username}: ${error.message}`);
            throw error;
        }
        console.error(`Service Error (internal) in getWillDetailsService for ID ${blockchainWillId}, user ${username}:`, error.stack || error);
        const internalError = new Error('유언장 정보를 조회하는 중 서버 내부 오류가 발생했습니다.');
        internalError.status = 500;
        throw internalError;
    } finally {
        if (connection) connection.release();
    }
}


/**
 * 특정 사용자가 작성한 모든 유언장 목록을 블록체인에서 조회합니다.
 * username은 해시하여 체인코드에 전달합니다.
 */
async function getMyWillsService(username) {
    try {
        const hashedUsername = calculateHash(String(username));
        console.log(`Service: Requesting GetMyWills from chaincode for HASHED username: ${hashedUsername} (original: ${username})`);
        const resultBuffer = await sdk.send(true, 'GetMyWills', [hashedUsername]);

        if (resultBuffer && resultBuffer.length > 0) {
            const userWills = JSON.parse(resultBuffer.toString());
            console.log(`Service: Found ${userWills.length} wills for HASHED username '${hashedUsername}' from chaincode.`);
            // 여기에 정보 보강 로직을 추가할 수도 있음 (getMyWillsService에도 필요한 경우)
            // 하지만 현재 요청은 getWillsViewableByUserService에 대한 것이므로 여기는 일단 유지
            return userWills;
        }

        console.log(`Service: No wills found for HASHED username '${hashedUsername}' from chaincode.`);
        return [];
    } catch (error) {
        console.error(`Service Error in getMyWillsService for user ${username}:`, error.stack || error);
        if (!error.status) {
             const serviceError = new Error(`내 유언장 목록을 가져오는 중 오류가 발생했습니다.`);
             serviceError.status = 500;
             serviceError.cause = error;
             throw serviceError;
        }
        throw error;
    }
}

/**
 * 특정 사용자가 지정 열람자로 등록된 유언장 목록을 블록체인에서 조회합니다.
 * 사용자의 이름과 전화번호는 해시하여 체인코드에 전달합니다.
 */
async function getWillsViewableByUserService(username) {
    console.log(`Service: Fetching wills viewable by user '${username}' (viewer)`);
    if (!username) {
        const error = new Error("사용자 이름(username)이 필요합니다.");
        error.status = 400;
        throw error;
    }

    let viewerIdentityForChaincode = { name: "", phone: "" };
    try {
        const userDetails = await userService.getUserDetailsByUsernameService(username);
        if (userDetails && userDetails.realName && userDetails.phone) {
            viewerIdentityForChaincode.name = calculateHash(userDetails.realName);
            viewerIdentityForChaincode.phone = calculateHash(userDetails.phone);
            console.log(`Service: User details for viewer '${username}' fetched and hashed for viewerIdentity.`);
        } else {
            console.warn(`Service: User details (realName or phone) incomplete for viewer '${username}'. Querying with blank hashes.`);
            viewerIdentityForChaincode.name = calculateHash("");
            viewerIdentityForChaincode.phone = calculateHash("");
        }
    } catch (userError) {
        console.error(`Service: Error fetching user details for viewer '${username}': ${userError.message}.`);
        if (userError.status === 404) {
            const error = new Error(`지정 열람자 '${username}'을(를) 찾을 수 없습니다.`);
            error.status = 404;
            throw error;
        }
        const serviceError = new Error("지정 열람자 사용자 정보를 가져오는 중 오류가 발생했습니다.");
        serviceError.status = userError.status || 500;
        serviceError.cause = userError;
        throw serviceError;
    }

    const viewerIdentityJSONStringToCompare = JSON.stringify(viewerIdentityForChaincode);
    let connection; // DB 연결 변수

    try {
        console.log(`Service: Calling chaincode 'GetWillsViewableByMe' with HASHED ViewerIdentity: ${viewerIdentityJSONStringToCompare}`);
        const blockchainDataBuffer = await sdk.send(
            true, // Query
            'GetWillsViewableByMe',
            [viewerIdentityJSONStringToCompare]
        );

        if (!blockchainDataBuffer || blockchainDataBuffer.length === 0) {
            console.log(`Service: No wills found from chaincode for viewer '${username}' (via hashed identity).`);
            return [];
        }

        const willsFromChaincode = JSON.parse(blockchainDataBuffer.toString());
        console.log(`Service: Found ${willsFromChaincode.length} wills from chaincode for viewer '${username}'. Enriching with DB data...`);

        if (willsFromChaincode.length === 0) {
            return [];
        }

        connection = await pool.getConnection();
        const enrichedWills = [];

        for (const bcWill of willsFromChaincode) {
            const willDbId = bcWill.offChainStorageRef;
            let originalTitle = null;
            let originalTestatorUsername = null; // Users 테이블의 email
            let originalCreatedAt = bcWill.createdAt; // 기본값은 체인코드의 값

            if (willDbId) {
                try {
                    const query = `
                        SELECT 
                            w.title AS dbTitle,
                            w.created_at AS dbCreatedAt, 
                            w.testator_id AS dbTestatorEmail 
                        FROM Wills w
                        WHERE w.id = ? 
                    `;
                    const [rows] = await connection.execute(query, [willDbId]);

                    if (rows.length > 0) {
                        originalTitle = rows[0].dbTitle;
                        originalCreatedAt = rows[0].dbCreatedAt;
                        originalTestatorUsername = rows[0].dbTestatorEmail;
                        // 필요시 Users 테이블에서 dbTestatorEmail로 추가 정보(예: 이름) 조회 가능
                    } else {
                        console.warn(`[Service/getWillsViewableByUserService] DB에서 willDbId ${willDbId}에 해당하는 유언장 정보를 찾을 수 없습니다.`);
                    }
                } catch (dbError) {
                    console.error(`[Service/getWillsViewableByUserService] DB 조회 중 오류 (willDbId: ${willDbId}): ${dbError.message}`);
                }
            } else {
                console.warn(`[Service/getWillsViewableByUserService] 체인코드 유언장 데이터에 offChainStorageRef가 없습니다:`, bcWill);
            }

            enrichedWills.push({
                ...bcWill,
                originalTitle: originalTitle,
                originalTestatorUsername: originalTestatorUsername,
                createdAt: originalCreatedAt, // 프론트엔드에서 사용할 생성일시 (DB 값 우선)
            });
        }
        
        console.log(`Service: Finished enriching wills for viewer '${username}'. Total enriched wills: ${enrichedWills.length}`);
        return enrichedWills;

    } catch (chaincodeError) {
        console.error(`Service: Chaincode error during 'GetWillsViewableByMe' for viewer '${username}': ${chaincodeError.stack || chaincodeError}`);
        const serviceError = new Error(`지정 열람자 유언장 목록을 블록체인에서 가져오는 중 오류가 발생했습니다.`);
        serviceError.status = 500; // 또는 체인코드 오류 종류에 따라 다른 상태 코드
        serviceError.cause = chaincodeError;
        throw serviceError;
    } finally {
        if (connection) {
            connection.release();
            console.log("Service: DB connection released for getWillsViewableByUserService.");
        }
    }
}


/**
 * DB WillImages 레코드 ID를 기반으로 특정 유언장 이미지를 직접 제공하는 서비스 함수입니다.
 * 이 함수는 주로 이미지 파일을 직접 스트리밍하거나 반환할 때 사용됩니다.
 */
async function getWillImageService(imageRecordId) {
    let connection;
    try {
        connection = await pool.getConnection();
        const query = `SELECT image_data, mime_type, file_name FROM WillImages WHERE id = ?`;
        const [rows] = await connection.execute(query, [imageRecordId]);

        if (rows.length === 0 || !rows[0].image_data) {
            throw Object.assign(new Error('Image not found in WillImages database for the given record ID.'), { status: 404 });
        }
        return {
            buffer: rows[0].image_data,
            mimeType: rows[0].mime_type,
            fileName: rows[0].file_name
        };
    } catch (error) {
        console.error(`Service Error in getWillImageService for ID ${imageRecordId}:`, error.stack || error);
        if (!error.status) { error.status = 500; }
        throw error;
    } finally {
        if (connection) connection.release();
    }
}



async function getWillDetailsForAdminService(hashedBlockchainWillId) {
    let connection;
    try {
        console.log(`Service (Admin): Fetching all details for will (BC Hashed ID: ${hashedBlockchainWillId})`);

        // 1. 체인코드 호출 (GetWillDetailsByAdmin)
        const adminChaincodeToken = "admin"; // 관리자 토큰 (체인코드와 일치해야 함)
        const chaincodeArgs = [adminChaincodeToken, String(hashedBlockchainWillId)];
        let blockchainDataBuffer;

        console.log(`Service (Admin): Calling chaincode 'GetWillDetailsByAdmin' with HashedWillID: ${hashedBlockchainWillId}`);
        try {
            blockchainDataBuffer = await sdk.send(
                true, // isQuery
                'GetWillDetailsByAdmin',
                chaincodeArgs
            );
        } catch (chaincodeError) {
            console.error(`Service (Admin): Chaincode error during 'GetWillDetailsByAdmin' for HashedWillID ${hashedBlockchainWillId}: ${chaincodeError.stack || chaincodeError}`);
            const serviceError = new Error(`관리자용 유언장 정보를 블록체인에서 가져오는 중 오류 발생 (Hashed ID: ${hashedBlockchainWillId})`);
            // 체인코드에서 "does not exist" 와 같은 특정 메시지를 보내면 404로 매핑 가능
            if (chaincodeError.message && chaincodeError.message.toLowerCase().includes("does not exist")) {
                serviceError.status = 404;
                serviceError.message = `ID ${hashedBlockchainWillId}에 해당하는 유언장을 찾을 수 없습니다 (블록체인).`;
            } else if (chaincodeError.message && chaincodeError.message.toLowerCase().includes("unauthorized")) {
                serviceError.status = 403; // Unauthorized
            } else {
                serviceError.status = 500;
            }
            serviceError.cause = chaincodeError;
            throw serviceError;
        }

        if (!blockchainDataBuffer || blockchainDataBuffer.length === 0) {
            const error = new Error(`Service Error (Admin): Will with Hashed ID ${hashedBlockchainWillId} not found on blockchain, or no data returned.`);
            error.status = 404;
            throw error;
        }

        // 2. 체인코드 응답 파싱
        let blockchainWill; // 여기에는 해시된 title, 해시된 designatedViewers 등이 포함됨
        try {
            blockchainWill = JSON.parse(blockchainDataBuffer.toString());
        } catch (parseError) {
            console.error("Service Error (Admin): Failed to parse blockchain response:", parseError, "Raw data:", blockchainDataBuffer.toString());
            throw Object.assign(new Error('Service Error (Admin): Failed to parse will data from blockchain.'), { status: 500, cause: parseError });
        }

        const {
            contentHash: storedTextHashOnChain, // 체인코드에 저장된 텍스트 내용 해시
            offChainStorageRef: willDbId,       // MariaDB의 Wills 테이블 ID
            images: storedImagesJSONHashOnChain // 체인코드에 저장된 이미지 메타데이터 배열 전체의 해시값
            // blockchainWill.title, blockchainWill.designatedViewers 등은 해시된 값임
        } = blockchainWill;

        if (!storedTextHashOnChain || !willDbId) {
            console.error("Service Error (Admin): Blockchain data missing crucial fields (contentHash or offChainStorageRef):", blockchainWill);
            throw Object.assign(new Error('Service Error (Admin): Incomplete will data from blockchain.'), { status: 500 });
        }

        // 3. 오프체인 DB (MariaDB)에서 원본 정보 조회
        connection = await pool.getConnection();

        // 3a. 원본 제목, 암호화된 내용 조회 (Wills 테이블)
        const selectWillDataQuery = `SELECT title, encrypted_content, encryption_iv, encryption_auth_tag FROM Wills WHERE id = ?`;
        const [willRows] = await connection.execute(selectWillDataQuery, [willDbId]);

        if (willRows.length === 0) {
            throw Object.assign(new Error(`Service Error (Admin): Will data not found in DB for ID ${willDbId}.`), { status: 404 });
        }
        const originalTitleFromDb = willRows[0].title;
        const encryptedTextPayloadFromDb = {
            iv: willRows[0].encryption_iv,
            encryptedData: willRows[0].encrypted_content,
            authTag: willRows[0].encryption_auth_tag
        };
        const decryptedOriginalContent = decrypt(encryptedTextPayloadFromDb);
        const currentTextHashFromDbContent = calculateHash(decryptedOriginalContent);

        // 3b. 텍스트 무결성 검증
        if (currentTextHashFromDbContent !== storedTextHashOnChain) {
            console.warn(`Service Warning (Admin): Text data integrity check FAILED for will (BC Hashed ID ${hashedBlockchainWillId}, DB ID ${willDbId}). Chain hash: ${storedTextHashOnChain}, DB content hash: ${currentTextHashFromDbContent}`);
            // 관리자에게는 경고를 포함하여 데이터를 반환하거나, 엄격하게 오류 처리 가능
            // 여기서는 일단 진행하고, 반환 객체에 경고 플래그 추가 고려
        } else {
            console.log(`Service (Admin): Text data integrity check passed for will (BC Hashed ID ${hashedBlockchainWillId}).`);
        }

        // 3c. 원본 지정 열람자 정보 조회 (WillDesignatedViewers 테이블)
        let originalDesignatedViewersFromDb = [];
        const selectViewersQuery = `SELECT name, phone FROM WillDesignatedViewers WHERE will_db_id = ?`;
        const [viewerRows] = await connection.execute(selectViewersQuery, [willDbId]);
        if (viewerRows && viewerRows.length > 0) {
            originalDesignatedViewersFromDb = viewerRows.map(row => ({ name: row.name, phone: row.phone }));
        }
        console.log(`Service (Admin): Fetched ${originalDesignatedViewersFromDb.length} original designated viewers from DB for Will ID ${willDbId}.`);

        // 3d. 이미지 정보 조회 및 무결성 검증 (기존 로직과 유사하게)
        const imageDataUrls = [];
        const imageMetadataFromDbForHashComparison = [];
        const selectImagesQuery = `SELECT id, image_data, mime_type, file_name FROM WillImages WHERE will_db_id = ?`;
        const [imageRowsFromDb] = await connection.execute(selectImagesQuery, [willDbId]);

        if (imageRowsFromDb && imageRowsFromDb.length > 0) {
            for (const imgRow of imageRowsFromDb) {
                const imageBuffer = imgRow.image_data;
                const imageMimeType = imgRow.mime_type;
                const imageRecordId = imgRow.id;
                const fileName = imgRow.file_name;
                const individualImageHashFromDb = calculateHash(imageBuffer);

                imageMetadataFromDbForHashComparison.push({
                    imageHash: individualImageHashFromDb,
                    imageOffChainRef: imageRecordId,
                    fileName: fileName
                });
                imageDataUrls.push({
                    id: imageRecordId,
                    url: `data:${imageMimeType};base64,${imageBuffer.toString('base64')}`,
                    fileName: fileName,
                    hashFromDb: individualImageHashFromDb,
                    integrityOk: true // 초기값
                });
            }
        }

        const currentImagesJSONString = JSON.stringify(imageMetadataFromDbForHashComparison);
        const currentImagesJSONHashFromDb = calculateHash(currentImagesJSONString);
        const emptyImagesArrayHash = calculateHash("[]");

        let imagesIntegrityOk = true;
        if (storedImagesJSONHashOnChain && storedImagesJSONHashOnChain !== emptyImagesArrayHash && currentImagesJSONHashFromDb !== storedImagesJSONHashOnChain) {
            console.warn(`Service Warning (Admin): IMAGES JSON data integrity check FAILED for will (BC Hashed ID ${hashedBlockchainWillId}). Chain hash: ${storedImagesJSONHashOnChain}, DB images hash: ${currentImagesJSONHashFromDb}`);
            imageDataUrls.forEach(img => img.integrityOk = false);
            imagesIntegrityOk = false;
        } else if (storedImagesJSONHashOnChain && storedImagesJSONHashOnChain !== emptyImagesArrayHash) {
            console.log(`Service (Admin): IMAGES JSON data integrity check passed for will (BC Hashed ID ${hashedBlockchainWillId}).`);
        } // 그 외 경우는 이전과 유사하게 로그만

        // 4. 최종 결과 객체 조립
        const result = {
            blockchainData: blockchainWill, // 체인코드에서 받은 원본 데이터 (해시값들 포함)
            originalTitle: originalTitleFromDb,
            originalContent: decryptedOriginalContent,
            originalDesignatedViewers: originalDesignatedViewersFromDb,
            imageDataUrls: imageDataUrls,
            integrityChecks: {
                textMatchesChain: currentTextHashFromDbContent === storedTextHashOnChain,
                imagesJsonMatchesChain: imagesIntegrityOk
            }
        };

        return result;

    } catch (error) {
        if (error.status) { // 이미 status가 설정된 서비스 레벨 오류
            console.error(`Service Error (Admin, propagating with status ${error.status}) in getWillDetailsForAdminService for HashedBCID ${hashedBlockchainWillId}: ${error.message}`);
            throw error;
        }
        // 그 외 일반적인 내부 오류
        console.error(`Service Error (Admin, internal) in getWillDetailsForAdminService for HashedBCID ${hashedBlockchainWillId}:`, error.stack || error);
        const internalError = new Error('관리자용 유언장 상세 정보 조회 중 서버 내부 오류 발생');
        internalError.status = 500;
        throw internalError;
    } finally {
        if (connection) connection.release();
    }
}



/**
 * 특정 사용자가 작성한 유언장들의 상태별 개수를 조회합니다.
 * username은 해시하여 체인코드에 전달합니다.
 */
async function getWillStatusCountsService(username) {
    if (!username) {
        const error = new Error("사용자 이름(username)이 필요합니다.");
        error.status = 400; // Bad Request
        throw error;
    }

    try {
        const hashedTestatorId = calculateHash(String(username));
        console.log(`Service (getWillStatusCountsService): Requesting GetWillStatusCountsByTestatorId from chaincode for HASHED testatorId: ${hashedTestatorId} (original: ${username})`);

        const resultBuffer = await sdk.send(
            true, // isQuery (조회 트랜잭션)
            'GetWillStatusCountsByTestatorId', // 호출할 체인코드 함수 이름
            [hashedTestatorId] // 체인코드 함수에 전달할 인자 배열
        );

        let statusCounts = { // 기본값 (체인코드에서 결과가 없거나 비어있을 경우 대비)
            "REGISTERED": 0,
            "ACTIVE": 0,
            "EXPIRED": 0,
            "EXECUTED": 0,
            "REVOKED": 0
        };

        if (resultBuffer && resultBuffer.length > 0) {
            try {
                const parsedCounts = JSON.parse(resultBuffer.toString());
                // 체인코드에서 반환한 모든 키를 statusCounts에 병합 (새로운 상태가 추가될 수 있으므로)
                for (const key in parsedCounts) {
                    if (parsedCounts.hasOwnProperty(key)) {
                        statusCounts[key] = parsedCounts[key];
                    }
                }
                console.log(`Service (getWillStatusCountsService): Received status counts for HASHED testatorId '${hashedTestatorId}':`, statusCounts);
            } catch (parseError) {
                console.error(`Service (getWillStatusCountsService): Failed to parse status counts from chaincode for HASHED testatorId '${hashedTestatorId}'. Raw: ${resultBuffer.toString()}. Error: ${parseError.message}`);
                // 파싱 오류 시 기본값 또는 오류 전파 고려
                // 여기서는 기본값 사용, 필요시 오류 throw
            }
        } else {
            console.log(`Service (getWillStatusCountsService): No status counts data returned from chaincode for HASHED testatorId '${hashedTestatorId}'. Returning zero counts.`);
        }
        return statusCounts;

    } catch (error) {
        console.error(`Service Error (getWillStatusCountsService) for user ${username}:`, error.stack || error);
        const serviceError = new Error(`유언장 상태별 개수 조회 중 오류가 발생했습니다 (사용자: ${username}).`);
        serviceError.status = error.status || 500; // 체인코드에서 발생한 오류의 status를 사용하거나, 기본 500
        serviceError.cause = error; // 원인 에러 첨부
        throw serviceError;
    }
}

async function updateWillStatusByAdminService(hashedWillId, newStatus) {
    console.log(`Service (Admin): Attempting to update status for will (Hashed ID: ${hashedWillId}) to '${newStatus}'`);

    const chaincodeFunction = 'UpdateWillStatusByAdmin';
    const adminToken = "admin"; // 체인코드 'UpdateWillStatusByAdmin'에서 사용하는 토큰과 일치해야 함
    const chaincodeArgs = [String(hashedWillId), String(newStatus), adminToken];

    try {
        console.log(`Service (Admin): Calling chaincode '${chaincodeFunction}' with args: ${JSON.stringify(chaincodeArgs)}`);
        
        // sdk.send의 첫 번째 인자는 isQuery 여부, 상태 변경은 false
        const resultBuffer = await sdk.send(false, chaincodeFunction, chaincodeArgs);

        if (!resultBuffer) {
            // 체인코드가 성공적으로 실행되었으나 반환값이 없는 경우 (일반적으로 메시지를 반환함)
            // 또는 sdk.send 내부에서 오류 없이 null을 반환한 경우 (가능성은 낮음)
            console.warn(`Service (Admin): Chaincode function '${chaincodeFunction}' for Hashed ID ${hashedWillId} executed, but returned no message buffer. Assuming success based on no error thrown.`);
            return `Status of will (Hashed ID: ${hashedWillId}) likely updated to '${newStatus}', but no confirmation message from chaincode.`;
        }
        
        const resultMessage = resultBuffer.toString('utf8');
        console.log(`Service (Admin): Chaincode '${chaincodeFunction}' for Hashed ID ${hashedWillId} to status '${newStatus}' executed successfully. Message: ${resultMessage}`);
        return resultMessage; // 체인코드에서 반환된 성공 메시지

    } catch (chaincodeError) {
        console.error(`Service (Admin): Chaincode error during '${chaincodeFunction}' for HashedWillID ${hashedWillId} to status ${newStatus}: ${chaincodeError.message || chaincodeError}`);
        
        const serviceError = new Error(`관리자 권한으로 유언장(Hashed ID: ${hashedWillId}) 상태를 '${newStatus}'(으)로 변경 중 오류 발생`);
        
        // 체인코드에서 발생한 오류 메시지에 따라 상태 코드 분기
        if (chaincodeError.message) {
            serviceError.message = chaincodeError.message; // 체인코드 오류 메시지를 그대로 사용
            if (chaincodeError.message.toLowerCase().includes("does not exist")) {
                serviceError.status = 404;
            } else if (chaincodeError.message.toLowerCase().includes("unauthorized")) {
                serviceError.status = 403;
            } else if (chaincodeError.message.toLowerCase().includes("invalid newstatus") || chaincodeError.message.toLowerCase().includes("incorrect number of arguments")) {
                serviceError.status = 400; // 잘못된 요청
            } else {
                serviceError.status = 500; // 일반적인 체인코드 오류
            }
        } else {
            serviceError.status = 500; // 원인 불명 오류
        }
        serviceError.cause = chaincodeError;
        throw serviceError;
    }
}

// module.exports 에 새로운 함수 추가
module.exports = {
    getMyWillsService,
    getWillDetailsService,
    getWillImageService,
    getWillsViewableByUserService,
    getWillDetailsForAdminService, // 추가,
    getWillStatusCountsService,
    updateWillStatusByAdminService
};
