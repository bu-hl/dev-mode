// application/rest/userinfoController.js
const pool = require('../db'); // 데이터베이스 연결 풀 가져오기 (db.js)
const { v4: uuidv4 } = require('uuid'); // 고유 ID 생성을 위한 uuid 라이브러리
const userService = require('../service/userService'); // 사용자 서비스 모듈 임포트



// 회원가입
async function registerUser(req, res) {
    // 프론트엔드에서 role 값을 어떤 방식으로든 전달받아야 함 (예: req.body.role 또는 경로 구분)
    // 여기서는 req.body.role로 가정
    const {
        email, // username 대신 email 사용
        password,
        phone,
        name,
        birth,
        gender, // 일반 사용자
        address, // 공통
        role, // 'user' 또는 'notary'
        companyName, // 공증인
        registrationNumber // 공증인
    } = req.body;

    // 필수 항목 유효성 검사 (role에 따라 다르게 적용 가능)
    if (!email || !password || !name || !phone || !role) {
        return res.status(400).json({ error: '필수 항목(이메일, 비밀번호, 이름, 연락처, 역할)을 모두 입력하세요.' });
    }

    if (role === 'user' && (!birth || !gender)) {
        return res.status(400).json({ error: '일반 사용자는 생년월일과 성별을 필수로 입력해야 합니다.' });
    }

    if (role === 'notary' && (!companyName || !registrationNumber || !address )) { // 공증인은 회사 주소가 필수일 수 있음
        return res.status(400).json({ error: '공증인은 회사명, 사업자등록번호, 주소를 필수로 입력해야 합니다.' });
    }
    
    // 주소는 공통 필수 항목으로 가정 (필요시 조건 변경)
    if (!address && role === 'user') { // 일반 사용자도 주소가 필수라면
         // return res.status(400).json({ error: '주소를 입력해주세요.' });
    }


    try {
        console.log(email);
        const userData = {
            email, password, phone, name, birth, gender, address, role, companyName, registrationNumber
        };
        
        const result = await userService.registerUserService(userData);

        // 성공 응답 시, 사용자에게 중요한 정보(예: email, role)를 함께 전달할 수 있음
        res.status(201).json({ message: result.message, userId: result.userId, email: result.email, role: result.role });

    } catch (error) {
        console.error('회원가입 컨트롤러 에러:', error.message, error.status ? `Status: ${error.status}` : '');
        // 서비스에서 설정한 상태 코드가 있다면 사용, 없으면 500
        const statusCode = error.status || 500;
        res.status(statusCode).json({ error: error.message || '회원가입 처리 중 서버 오류가 발생했습니다.' });
    }
}


// ---------- 로그인 ----------
async function loginUser(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: '아이디와 비밀번호를 입력하세요.' });
    }

    try {
        const [rows] = await pool.execute(
            'SELECT * FROM Users WHERE email = ? AND password = ?',
            [username, password]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: '로그인 정보가 일치하지 않습니다.' });
        }

        res.json({ message: '로그인 성공', user: rows[0] });
    } catch (error) {
        console.error('로그인 에러:', error);
        res.status(500).json({ error: '서버 오류' });
    }
}


// 사용자 아이디로 사용자 상세 정보(실명 및 전화번호) 조회 컨트롤러
// 함수 이름을 getUserDetailsByUsername로 변경
async function getUserDetailsByUsername(req, res, next) {
    const { username } = req.params; // URL 파라미터에서 username 추출

    // 컨트롤러: username 파라미터 유효성 검사
    if (!username) {
        const error = new Error('사용자 아이디(username)가 URL 파라미터로 필요합니다.');
        error.status = 400;
        return next(error); // 에러 핸들러로 전달
    }

    try {
        // 변경된 서비스 함수 호출
        const userDetails = await userService.getUserDetailsByUsernameService(username);
        
        // 클라이언트에 realName과 phone 모두 전달 (서비스에서 반환하는 형식에 맞춤)
        res.json({ realName: userDetails.realName, phone: userDetails.phone });
    } catch (error) {
        // 서비스에서 발생한 에러(status 포함)를 중앙 에러 핸들러로 전달
        console.error(`Controller Error in getUserDetailsByUsername for username ${username}: ${error.message}`); // 함수명 변경
        next(error);
    }
}

module.exports = {
    registerUser,
    loginUser,
    getUserDetailsByUsername, // export 이름 변경
};