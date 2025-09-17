const pool = require('../db'); 
const getWillService = require('../service/getWillService'); // getWillService 임포트

// 프로필 조회
async function getUserProfile(req, res) {
    const { username } = req.params; // req.query 가 아니라 req.params 입니다.
    console.log(`[Controller getUserProfile] 요청 받음. username: ${username}`); // 로그 추가

    if (!username) {
        console.log('[오류] username 누락 (getUserProfile)');
        return res.status(400).json({ error: 'URL 경로에 username 파라미터가 필요합니다.' });
    }

    try {
        const [rows] = await pool.execute(
            'SELECT email, name, phone, birth, address, gender, role FROM Users WHERE email = ?',
            [username]
        );

        console.log(`[Controller getUserProfile] DB 조회 결과 (username: ${username}):`, rows); // 로그 추가

        if (rows.length === 0) {
            console.log(`[Controller getUserProfile] 사용자 없음 (username: ${username}). 404 반환.`); // 로그 추가
            return res.status(404).json({ error: '사용자 없음' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error('[에러] getUserProfile 실패:', err);
        res.status(500).json({ error: '서버 오류' });
    }
}
// 비밀번호 수정
async function updateUserPassword(req, res) {
    const { username, currentPassword, newPassword } = req.body;
    console.log('[요청] POST /mypage/update-password →', req.body);

    if (!username || !currentPassword || !newPassword) {
        return res.status(400).json({ error: 'username, currentPassword, newPassword가 필요합니다.' });
    }

    try {
        // 현재 비밀번호 확인
        const [users] = await pool.execute(
            'SELECT * FROM Users WHERE email = ? AND password = ?',
            [username, currentPassword]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: '현재 비밀번호가 일치하지 않습니다.' });
        }

        // 비밀번호 업데이트
        const updateQuery = `UPDATE Users SET password = ? WHERE email = ?`;
        await pool.execute(updateQuery, [newPassword, username]);

        res.json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
    } catch (err) {
        console.error('[에러] updateUserPassword 실패:', err);
        res.status(500).json({ error: '비밀번호 변경 실패' });
    }
}


// 전화번호 수정
async function updateUserProfile(req, res) {
    const { username, phone } = req.body;
    console.log('[요청] POST /mypage/update-profile →', req.body);

    if (!username || !phone) {
        return res.status(400).json({ error: 'username과 phone이 필요합니다.' });
    }

    try {
        const updateQuery = `UPDATE Users SET phone = ? WHERE email = ?`;
        const [result] = await pool.execute(updateQuery, [phone, username]);
        res.json({ message: '프로필이 성공적으로 수정되었습니다.' });
    } catch (err) {
        console.error('[에러] updateUserProfile 실패:', err);
        res.status(500).json({ error: '수정 실패' });
    }
}

async function updateUserProfileExtended(req, res) {
    const { username, address, gender, role } = req.body;
    console.log('[요청] POST /mypage/update-profile-extended →', req.body);

    if (!username) {
        return res.status(400).json({ error: 'username이 필요합니다.' });
    }

    try {
        const fields = [];
        const values = [];

        if (address !== undefined) {
            fields.push('address = ?');
            values.push(address);
        }
        if (gender !== undefined) {
            fields.push('gender = ?');
            values.push(gender);
        }
        if (role !== undefined) {
            fields.push('role = ?');
            values.push(role);
        }

        if (fields.length === 0) {
            return res.status(400).json({ error: '수정할 항목이 없습니다.' });
        }

        values.push(username);
        const query = `UPDATE Users SET ${fields.join(', ')} WHERE email = ?`;
        await pool.execute(query, values);

        res.json({ message: '프로필이 성공적으로 수정되었습니다.' });
    } catch (err) {
        console.error('[에러] updateUserProfileExtended 실패:', err);
        res.status(500).json({ error: '프로필 수정 실패' });
    }
}




async function getMyWillStatusCounts(req, res) {
    const { username } = req.params; // URL 파라미터에서 username 가져오기

    if (!username) {
        console.log('[오류] Controller (mypage): getMyWillStatusCounts - URL 파라미터 "username"이 누락되었습니다.');
        return res.status(400).json({ error: 'URL 경로에 사용자 이름이 필요합니다.' });
    }

    console.log(`Controller (mypage): User '${username}' (from URL param) requested their will status counts.`);

    try {
        // 서비스 계층의 getWillStatusCountsService 함수 호출
        const statusCounts = await getWillService.getWillStatusCountsService(username);
        res.json(statusCounts);
    } catch (error) {
        console.error(`Controller (mypage): Error fetching will status counts for user '${username}': ${error.message || error}`, error.stack);
        const statusCode = error.status || 500;
        res.status(statusCode).json({ error: error.message || '유언장 상태별 개수 조회 중 서버 오류가 발생했습니다.' });
    }
}

module.exports = {
    getUserProfile,
    updateUserProfile,

    updateUserPassword,
    updateUserProfileExtended  ,
    getMyWillStatusCounts
};
