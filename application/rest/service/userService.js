// application/rest/service/userService.js
const pool = require('../db'); // 데이터베이스 연결 풀 (경로 수정)
const { v4: uuidv4 } = require('uuid'); // 고유 ID 생성을 위한 uuid 라이브러리

/**
 * 사용자 회원가입 서비스
 */
// application/rest/service/userService.js

async function registerUserService(userData) {
    const {
        email,
        password,
        phone,
        name,
        birth,
        gender,
        address,
        role, // "NOTARY"
        companyName, // "ㅇㅁㄴ"
        registrationNumber // "132"
    } = userData;

    // userData 및 추출된 값 확인 (이전 로그에서 정상으로 보였음)
    console.log('Service received userData for registration:', JSON.stringify(userData, null, 2));
    console.log('Values for DB (destructured from userData):', { email, password, phone, name, birth, gender, address, role, companyName, registrationNumber });

    let connection;
    try {
        connection = await pool.getConnection();
        // ... (중복 확인 로직은 동일) ...
        const [existingByEmail] = await connection.execute('SELECT id FROM Users WHERE email = ?', [email]);
        if (existingByEmail.length > 0) {
            const error = new Error('이미 사용 중인 이메일입니다.');
            error.status = 409;
            throw error;
        }
        if (role === 'NOTARY' && registrationNumber) {
            const [existingByRegNum] = await connection.execute('SELECT id FROM Users WHERE registration_number = ?', [registrationNumber]);
            if (existingByRegNum.length > 0) {
                const error = new Error('이미 등록된 사업자등록번호입니다.');
                error.status = 409;
                throw error;
            }
        }


        const userId = uuidv4();
        const insertQuery = `
            INSERT INTO Users 
            (id, email, password, phone, name, birth, gender, address, role, company_name, registration_number) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        // params 배열 구성 직전에 각 변수 값들을 다시 한번 명시적으로 로깅
        console.log('--- Preparing params for INSERT ---');
        console.log('Value of role:', role);
        console.log('Value of companyName for param:', companyName);
        console.log('Value of registrationNumber for param:', registrationNumber);
        console.log('Value of address for param:', address); // address도 확인

        const finalCompanyName = (role === 'NOTARY') ? (companyName || null) : null;
        const finalRegistrationNumber = (role === 'NOTARY') ? (registrationNumber || null) : null;
        const finalGender = (role === 'NOTARY' && gender) ? gender : null; // gender도 NOTARY일때 null이 되어야함. 이전 로그에서는 MAN으로 전달.
                                                                      // 수정: role이 'NOTARY'이면 gender는 null이어야 함. role이 'user'일때만 gender 값 사용
                                                                      // gender: (role === 'user' && gender) ? gender : null (이전 제안이 더 정확)
        
        // gender 수정: 공증인이면 null, 일반 사용자면 전달된 gender 값 (없으면 null)
        const resolvedGender = (role === 'NOTARY') ? null : (gender || null);


        const params = [
            userId,
            email,
            password,
            phone || null,
            name,
            birth || null,
            // (role === 'NOTARY' && gender) ? gender : null, // 이 로직은 공증인인데 gender가 있으면 그걸 쓰게 됨. 수정 필요.
            // gender: role이 'NOTARY'이면 무조건 null, 'user'이면 userData.gender (없으면 null)
            resolvedGender,
            address || null, // 프론트에서 address로 회사주소를 보내야 함. 현재는 undefined이므로 null이 됨.
            role,
            finalCompanyName,
            finalRegistrationNumber
        ];

        console.log('Parameters for INSERT query (FINAL):', JSON.stringify(params, null, 2));

        await connection.execute(insertQuery, params);
        await connection.commit();

        return { message: '회원가입 성공', userId: userId, email: email, role: role };

    } catch (error) {
        // ... (오류 처리 로직) ...
        if (connection) await connection.rollback();
        console.error('Service Error in registerUserService:', error.message, error.stack);
        if (error.message && error.message.includes("Column 'birth' cannot be null")) {
             // 이 오류는 DB 스키마 수정으로 해결해야 함
        } else if (params && error.message && error.message.includes('Bind parameters must not contain undefined')) {
             console.error('Offending params might be (on undefined error):', JSON.stringify(params, null, 2));
        }
        if (!error.status) {
            const serviceError = new Error('회원가입 처리 중 서버 오류가 발생했습니다.');
            serviceError.status = 500;
            serviceError.cause = error;
            throw serviceError;
        }
        throw error;
    } finally {
        if (connection) connection.release();
    }   
}
/**
 * 사용자 로그인 서비스
 */
async function loginUserService(username, password) {
    console.log(username,password);
    try {
        const [rows] = await pool.execute(
            'SELECT id, email, name, phone, birth,role FROM Users WHERE email = ? AND password = ?', // 비밀번호는 제외하고 필요한 정보만 반환
            [username, password]
        );

        if (rows.length === 0) {
            const error = new Error('로그인 정보가 일치하지 않습니다.');
            error.status = 401; // Unauthorized
            throw error;
        }
        console.log(rows[0]);
        // rows[0]에는 사용자 ID, 이름 등이 포함됨 (비밀번호 제외)
        return { message: '로그인 성공', user: rows[0] };
    } catch (error) {
        console.error('Service Error in loginUserService:', error);
        if (!error.status) {
            const serviceError = new Error('로그인 처리 중 서버 오류가 발생했습니다.');
            serviceError.status = 500;
            serviceError.cause = error;
            throw serviceError;
        }
        throw error;
    }
}

/**
 * 사용자 아이디로 실명,전번 조회 서비스
 */
async function getUserDetailsByUsernameService(username) {
    try {
        // SELECT 절에 phone 추가
        const [rows] = await pool.execute(
            'SELECT name, phone FROM Users WHERE email = ?',
            [username]
        );

        if (rows.length === 0) {
            const error = new Error('해당 사용자를 찾을 수 없습니다.');
            error.status = 404; // Not Found
            throw error;
        }
        // 반환 객체에 realName과 phone 모두 포함
        return { realName: rows[0].name, phone: rows[0].phone };
    } catch (error) {
        console.error('Service Error in getUserDetailsByUsernameService:', error); // 함수명 변경
        if (!error.status) {
            const serviceError = new Error('사용자 정보 조회 처리 중 서버 오류가 발생했습니다.'); // 메시지 변경
            serviceError.status = 500;
            serviceError.cause = error;
            throw serviceError;
        }
        throw error;
    }
}

module.exports = {
    registerUserService,
    loginUserService,
    getUserDetailsByUsernameService,
};