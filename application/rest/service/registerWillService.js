// application/rest/service/registerWillService.js
const { v4: uuidv4 } = require('uuid');
const { encrypt, calculateHash } = require('../utils/encryption');
const pool = require('../db');
const sdk = require('../sdk');

// _registerWillCore 함수의 파라미터에서 designatedViewersJSON 대신
// 파싱된 객체 배열 형태인 originalDesignatedViewersArray 를 받도록 변경 고려 가능,
// 또는 내부에서 designatedViewersJSON을 파싱하여 사용. 여기서는 후자를 따름.
async function _registerWillCore(connection, { title, originalContent, designatedViewersJSON, testatorId }, imageFiles) {
    const willDbId = uuidv4(); // Wills 테이블의 ID, offChainStorageRef로 사용됨
    const originalContentHash = calculateHash(originalContent);

    // --- 1. 텍스트 유언 내용 DB 저장 (MariaDB) ---
    const encryptedPayload = encrypt(originalContent);
    if (!encryptedPayload || !encryptedPayload.iv || !encryptedPayload.encryptedData || !encryptedPayload.authTag) {
        throw Object.assign(new Error('Core Error: Failed to encrypt will content correctly.'), { status: 500 });
    }
    const insertTextWillQuery = `
        INSERT INTO Wills (id, testator_id, encrypted_content, encryption_iv, encryption_auth_tag, title)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    await connection.execute(insertTextWillQuery, [
        willDbId, testatorId, encryptedPayload.encryptedData, encryptedPayload.iv, encryptedPayload.authTag, title
    ]);
    console.log(`Core (_registerWillCore): Text will content stored in MariaDB (Wills table) with ID: ${willDbId} for testator: ${testatorId}, Title: ${title}`);

    // --- 2. 원본 지정 열람자 정보 DB 저장 (MariaDB) ---
    // designatedViewersJSON (문자열)을 파싱하여 객체 배열로 변환
    let originalViewersArray = [];
    if (designatedViewersJSON && designatedViewersJSON !== "[]") {
        try {
            originalViewersArray = JSON.parse(designatedViewersJSON);
            if (!Array.isArray(originalViewersArray)) {
                console.warn(`Core (_registerWillCore): Parsed designatedViewersJSON for DB storage was not an array. Input: ${designatedViewersJSON}. Storing no viewers.`);
                originalViewersArray = [];
            }
        } catch (e) {
            console.error(`Core (_registerWillCore): Failed to parse designatedViewersJSON for DB storage. Input: ${designatedViewersJSON}. Error: ${e.message}. Storing no viewers.`);
            originalViewersArray = [];
        }
    }

    if (originalViewersArray.length > 0) {
        const insertViewersQuery = `
            INSERT INTO WillDesignatedViewers (id, will_db_id, name, phone)
            VALUES (?, ?, ?, ?) 
        `; // (가정: WillDesignatedViewers 테이블에 id (PK), will_db_id (FK), name, phone 컬럼 존재)
        for (const viewer of originalViewersArray) {
            if (viewer && typeof viewer.name === 'string' && typeof viewer.phone === 'string') {
                const viewerRecordId = uuidv4(); // 각 지정 열람자 레코드의 PK
                await connection.execute(insertViewersQuery, [viewerRecordId, willDbId, viewer.name, viewer.phone]);
                console.log(`Core (_registerWillCore): Original designated viewer '${viewer.name}' stored in MariaDB (WillDesignatedViewers) for Will ID: ${willDbId}`);
            } else {
                console.warn(`Core (_registerWillCore): Invalid viewer object in originalDesignatedViewersArray, skipped DB insert:`, viewer);
            }
        }
    }

    // --- 3. 이미지 파일 DB 저장 (MariaDB) 및 체인코드용 메타데이터 준비 ---
    const imageMetadataForChaincode = [];
    if (imageFiles && imageFiles.length > 0) {
        for (const imageFile of imageFiles) {
            // ... (기존 이미지 저장 로직과 imageMetadataForChaincode.push 로직은 동일하게 유지) ...
            const imageBuffer = imageFile.buffer;
            const imageMimeType = imageFile.mimetype;
            let imageOriginalName = imageFile.originalname;
            // (파일 이름 인코딩 처리 부분 ... )
            try {
                const rawAsLatin1 = Buffer.from(imageOriginalName, 'latin1');
                const restoredFilename = rawAsLatin1.toString('utf-8');
                if (!restoredFilename.includes('�') && restoredFilename.length >= 2) { // 간단한 UTF-8 유효성 검사
                    imageOriginalName = restoredFilename;
                }
            } catch (e) { console.error("Core DEBUG: Error during filename encoding restoration:", e); }


            const imageRecordId = uuidv4(); // WillImages 테이블의 PK
            const insertImageQuery = `
                INSERT INTO WillImages (id, will_db_id, image_data, mime_type, file_name)
                VALUES (?, ?, ?, ?, ?)
            `;
            await connection.execute(insertImageQuery, [ imageRecordId, willDbId, imageBuffer, imageMimeType, imageOriginalName ]);
            console.log(`Core (_registerWillCore): Image '${imageOriginalName}' stored in MariaDB (WillImages table) with ID: ${imageRecordId} for Will ID: ${willDbId}`);

            imageMetadataForChaincode.push({
                imageHash: calculateHash(imageBuffer),      // 개별 이미지 데이터의 해시
                imageOffChainRef: imageRecordId,            // DB에 저장된 이미지 레코드 ID
                fileName: imageOriginalName                 // 원본 파일 이름
            });
        }
    }
    // --- DB 저장 로직 (이미지) 끝 ---


    // --- 4. 체인코드 인자 준비 ---
    const createdAtString = new Date().toISOString();

    // 4a. 지정 열람자 정보 해시 (체인코드용)
    // originalViewersArray (위에서 파싱한 원본 배열)를 사용하여 해시된 배열 생성
    const hashedDesignatedViewersForChaincode = originalViewersArray.map(viewer => {
        if (viewer && typeof viewer.name === 'string' && typeof viewer.phone === 'string') {
            return {
                name: calculateHash(viewer.name),   // 이름 해시
                phone: calculateHash(viewer.phone)  // 전화번호 해시
            };
        }
        // 유효하지 않은 객체는 여기서도 필터링하거나 빈 해시값 등으로 처리 가능
        console.warn("Core (_registerWillCore): Invalid viewer object found during hashing for chaincode, returning empty hashes for this item:", viewer);
        return { name: calculateHash(""), phone: calculateHash("") };
    }).filter(viewer => viewer !== null); // map에서 null을 반환했을 경우 필터링 (선택적)

    const hashedDesignatedViewersJSONString = JSON.stringify(hashedDesignatedViewersForChaincode);

    // 4b. 이미지 메타데이터 배열을 JSON 문자열로 변환 후 전체 해시 (체인코드용)
    const imagesJSONStringForChaincode = JSON.stringify(imageMetadataForChaincode);

    // 4c. 체인코드에 전달할 최종 인자 배열 구성
    const chaincodeArgs = [
        calculateHash(String(willDbId)),             // id (willDbId) 해시
        calculateHash(String(testatorId)),           // testatorId 해시
        calculateHash(String(title)),                // title 해시
        String(originalContentHash),                 // contentHash (유언 원본 내용의 해시)
        String(willDbId),                            // offChainStorageRef (해시 안 함, Wills 테이블의 ID)
        hashedDesignatedViewersJSONString,           // 내부 name/phone이 해시된 designatedViewers의 JSON 문자열
        calculateHash(imagesJSONStringForChaincode), // imagesJSON 전체 해시
        calculateHash(createdAtString)               // createdAtString 해시
    ];

    console.log(`Core (_registerWillCore): Invoking chaincode 'RegisterWill' with processed args: ${JSON.stringify(chaincodeArgs)}`);

    // --- 5. 체인코드 호출 ---
    const chaincodeResponseBuffer = await sdk.send(false, 'RegisterWill', chaincodeArgs);
    let blockchainResponse = chaincodeResponseBuffer && chaincodeResponseBuffer.length > 0 ? chaincodeResponseBuffer.toString() : "Chaincode execution successful (no specific message).";
    console.log(`Core (_registerWillCore): Chaincode 'RegisterWill' response: ${blockchainResponse}`);

    return {
        message: blockchainResponse,
        dbRecordId: willDbId, // Wills 테이블 ID
        blockchainWillIdHashed: chaincodeArgs[0], // 체인코드에 저장된 유언장 ID (해시된 값)
        originalContentHash: originalContentHash,
        offChainStorageRef: willDbId // 명확하게 Wills 테이블 ID를 지칭
    };
}

// registerWillService 및 registerWillWithImagesService 함수는
// _registerWillCore를 호출하는 부분은 동일하게 유지됩니다.
// (designatedViewersJSON 문자열을 그대로 _registerWillCore에 전달)

async function registerWillService(title, originalContent, designatedViewers, testatorId) {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const designatedViewersJSONString = JSON.stringify(designatedViewers || []);

        const result = await _registerWillCore(connection,
            {
                title,
                originalContent,
                designatedViewersJSON: designatedViewersJSONString, // 원본 JSON 문자열 전달
                testatorId
            },
            null // 이미지 파일 없음
        );

        await connection.commit();
        return result;

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Service Error (registerWillService):', error.stack || error);
        if (!error.status) { error.status = 500; }
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function registerWillWithImagesService(title, originalContent, designatedViewersInput, testatorId, imageFiles) {
    if (imageFiles) { // imageFiles가 제공된 경우에만 유효성 검사
        for (const imageFile of imageFiles) {
            if (!imageFile || !imageFile.buffer || !imageFile.mimetype || !imageFile.originalname) {
                const error = new Error('Service Error: Each image file must be valid and contain buffer, mimetype, and originalname.');
                error.status = 400;
                throw error;
            }
        }
    }


    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        let designatedViewersJSONString = "[]";
        if (typeof designatedViewersInput === 'string' && designatedViewersInput.trim() !== "") {
            try {
                JSON.parse(designatedViewersInput);
                designatedViewersJSONString = designatedViewersInput;
            } catch (e) {
                console.warn("Service (registerWillWithImagesService): designatedViewersInput was a string but not valid JSON. Defaulting to []. Input:", designatedViewersInput);
            }
        } else if (Array.isArray(designatedViewersInput)) { // 컨트롤러에서 객체 배열로 올 수도 있음을 대비
             designatedViewersJSONString = JSON.stringify(designatedViewersInput);
        }


        const result = await _registerWillCore(connection,
            {
                title,
                originalContent,
                designatedViewersJSON: designatedViewersJSONString, // 원본 JSON 문자열 전달
                testatorId
            },
            imageFiles
        );

        await connection.commit();
        return result;

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Service Error (registerWillWithImagesService):', error.stack || error);
        if (!error.status) { error.status = 500; }
        throw error;
    } finally {
        if (connection) connection.release();
    }
}


module.exports = {
    registerWillService,
    registerWillWithImagesService
    // _registerWillCore는 내부 함수이므로 export하지 않음
};