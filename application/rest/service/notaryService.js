// application/rest/service/notaryService.js
const pool = require('../db');

/**
 * 사용자 ID(Users 테이블의 PK)를 기반으로 NotaryPromotions 테이블에서 홍보 정보를 조회합니다.
 * @param {string} userId - Users 테이블의 공증인 PK (예: UUID)
 * @returns {Promise<object | null>} NotaryPromotions 정보 객체. 정보가 없으면 null.
 *          Users 정보(회사명, 이름, 이메일 등)도 함께 반환합니다.
 */
async function getPromotionByUserId(userId) {
    let connection;
    try {
        connection = await pool.getConnection();
        // Users 정보와 NotaryPromotions 정보를 JOIN
        const query = `
            SELECT 
                u.id AS actualUserId,
                u.email AS userEmail, 
                u.name AS userName, 
                u.company_name AS userCompanyName, 
                u.phone AS userPhoneNumber,
                np.id AS promotionId,      -- NotaryPromotions 테이블의 PK
                np.company_phone,          -- NotaryPromotions.company_phone
                np.consultation_phone,
                np.phone_consultation_fee,
                np.visit_consultation_fee,
                np.tags,
                np.description,
                np.created_at AS promotionCreatedAt,
                np.updated_at AS promotionUpdatedAt
            FROM Users u
            LEFT JOIN NotaryPromotions np ON u.id = np.user_id 
            WHERE u.id = ? AND u.role = 'notary' 
        `;
        // userId는 Users 테이블의 PK여야 함.

        const [rows] = await connection.execute(query, [userId]);

        if (rows.length === 0) {
            // 해당 PK의 공증인 역할 사용자가 없음
            return null; 
        }

        const result = rows[0];
        
        let parsedTags = [];
        if (result.tags && typeof result.tags === 'string') { // DB에서 JSON 문자열로 왔을 경우
            try {
                parsedTags = JSON.parse(result.tags);
            } catch (e) {
                console.error('[NotaryService getPromotionByUserId] Error parsing tags JSON:', e);
            }
        } else if (Array.isArray(result.tags)) { // 이미 배열 형태일 경우 (드라이버/DB 설정에 따라)
            parsedTags = result.tags;
        }

        // NotaryPromotions 정보가 있는지 여부 (promotionId가 null이 아니면 정보가 있음)
        if (result.promotionId) {
            return {
                // Users 정보
                userId: result.actualUserId, 
                email: result.userEmail,
                userName: result.userName,
                userCompanyName: result.userCompanyName,
                userPhoneNumber: result.userPhoneNumber,
                // NotaryPromotions 정보 (클라이언트가 기대하는 필드명과 일치)
                promotion_id: result.promotionId, // NotaryPromotions의 PK (필요하다면)
                company_phone: result.company_phone,
                consultation_phone: result.consultation_phone,
                phone_consultation_fee: result.phone_consultation_fee,
                visit_consultation_fee: result.visit_consultation_fee,
                tags: parsedTags,
                description: result.description,
                created_at: result.promotionCreatedAt, // NotaryPromotions의 생성일
                updated_at: result.promotionUpdatedAt, // NotaryPromotions의 수정일
            };
        } else {
            // NotaryPromotions 정보는 없지만, Users 정보는 있음
            return {
                userId: result.actualUserId,
                email: result.userEmail,
                userName: result.userName,
                userCompanyName: result.userCompanyName,
                userPhoneNumber: result.userPhoneNumber,
                // 클라이언트가 이 경우 NotaryPromotions 관련 필드가 null 또는 undefined일 것을 예상해야 함
                company_phone: null,
                consultation_phone: null,
                phone_consultation_fee: null,
                visit_consultation_fee: null,
                tags: [],
                description: null,
                message: '공증인 홍보 정보는 아직 등록되지 않았습니다.' 
            };
        }

    } catch (error) {
        console.error('[NotaryService getPromotionByUserId Error]:', error.message, error.stack);
        const serviceError = new Error('공증인 홍보 정보 조회 중 오류가 발생했습니다.');
        serviceError.status = 500; 
        throw serviceError;
    } finally {
        if (connection) connection.release();
    }
}

/**
 * 공증인 ID(Users 테이블의 PK)와 홍보 데이터를 받아 NotaryPromotions 테이블에 정보를 생성하거나 업데이트합니다 (UPSERT).
 * @param {string} userIdPk - Users 테이블의 PK (예: UUID).
 * @param {object} promotionData - 저장할 홍보 정보 객체 (클라이언트에서 온 필드명 그대로 사용)
 * @returns {Promise<object>} 생성 또는 업데이트된 NotaryPromotions 정보
 */
async function upsertPromotionByUserId(userIdPk, promotionData) {
    const {
        company_phone, consultation_phone, phone_consultation_fee,
        visit_consultation_fee, tags, description
    } = promotionData; // 클라이언트가 보낸 필드명 그대로 사용

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // tags는 JSON 문자열로 변환, undefined나 빈 배열이면 null
        const tagsJson = (tags && Array.isArray(tags) && tags.length > 0) ? JSON.stringify(tags) : null;

        // undefined를 null로 변환 (DB에 undefined가 들어가지 않도록)
        const finalCompanyPhone = company_phone === undefined ? null : company_phone;
        const finalConsultationPhone = consultation_phone === undefined ? null : consultation_phone;
        const finalPhoneFee = phone_consultation_fee === undefined ? null : phone_consultation_fee;
        const finalVisitFee = visit_consultation_fee === undefined ? null : visit_consultation_fee;
        const finalDescription = description === undefined ? null : description;

        const [existingRows] = await connection.execute(
            'SELECT id FROM NotaryPromotions WHERE user_id = ?',
            [userIdPk]
        );

        let resultData;
        if (existingRows.length > 0) { // 업데이트
            const promotionId = existingRows[0].id;
            await connection.execute(
                `UPDATE NotaryPromotions SET 
                    company_phone = ?, consultation_phone = ?, 
                    phone_consultation_fee = ?, visit_consultation_fee = ?, 
                    tags = ?, description = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [
                    finalCompanyPhone, finalConsultationPhone,
                    finalPhoneFee, finalVisitFee,
                    tagsJson, finalDescription, 
                    promotionId
                ]
            );
            resultData = { id: promotionId, user_id: userIdPk, ...promotionData }; // 원본 promotionData 반환
        } else { // 삽입
            const [insertResult] = await connection.execute(
                `INSERT INTO NotaryPromotions 
                    (user_id, company_phone, consultation_phone, phone_consultation_fee, visit_consultation_fee, tags, description) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    userIdPk, finalCompanyPhone, finalConsultationPhone,
                    finalPhoneFee, finalVisitFee,
                    tagsJson, finalDescription
                ]
            );
            resultData = { id: insertResult.insertId, user_id: userIdPk, ...promotionData };
        }

        await connection.commit();
        // 반환되는 객체가 프론트엔드에서 사용하기 편하도록 원본 tags (배열)를 포함하도록 조정
        if (resultData && tags) {
            resultData.tags = tags; 
        }
        return resultData;

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('[NotaryService upsertPromotionByUserId Error]:', error.message, error.stack);
        const serviceError = new Error('공증인 홍보 정보 처리 중 DB 오류가 발생했습니다.');
        serviceError.status = 500;
        throw serviceError;
    } finally {
        if (connection) connection.release();
    }
}

// (getUserProfileForNotaryPage 함수는 그대로 사용 가능 - Users 테이블 조회용)
async function getUserProfileForNotaryPage(userIdentifier, identifierType = 'email') {
    let connection;
    try {
        connection = await pool.getConnection();
        let query;
        // 실제 Users 테이블의 PK를 actualUserId로, email을 userEmail로 반환하도록 통일
        if (identifierType === 'id') {
            query = 'SELECT id AS actualUserId, email AS userEmail, name AS userName, company_name AS userCompanyName, phone AS userPhoneNumber FROM Users WHERE id = ? AND role = \'notary\'';
        } else { 
            query = 'SELECT id AS actualUserId, email AS userEmail, name AS userName, company_name AS userCompanyName, phone AS userPhoneNumber FROM Users WHERE email = ? AND role = \'notary\'';
        }
        
        const [rows] = await connection.execute(query, [userIdentifier]);
        if (rows.length > 0) {
            return rows[0]; // { actualUserId, userEmail, userName, ... }
        }
        return null;
    } catch (error) {
        console.error(`[NotaryService getUserProfileForNotaryPage Error for ${userIdentifier}]:`, error.message, error.stack);
        throw new Error('사용자 프로필 조회 중 오류 발생');
    } finally {
        if (connection) connection.release();
    }
}


async function getAllActivePromotions() {
    let connection;
    try {
        connection = await pool.getConnection();
        const query = `
            SELECT 
                u.id AS userId, 
                u.email AS userEmail, 
                u.name AS userName, 
                u.company_name AS userCompanyName, 
                u.phone AS userPhoneNumber,      -- Users 테이블의 정보
                np.id AS promotionId,
                np.company_phone,               -- NotaryPromotions 테이블의 정보
                np.consultation_phone,
                np.phone_consultation_fee,
                np.visit_consultation_fee,
                np.tags,                        -- JSON 문자열 또는 파싱된 배열 (DB 설정에 따라)
                np.description,
                np.created_at AS promotionCreatedAt,
                np.updated_at AS promotionUpdatedAt
            FROM Users u
            JOIN NotaryPromotions np ON u.id = np.user_id 
            ORDER BY np.updated_at DESC; -- 최근 수정된 순으로 정렬 (또는 다른 정렬 기준)
        `;
        const [rows] = await connection.execute(query);

        // 각 row의 tags 필드(JSON 문자열)를 배열로 파싱
        return rows.map(row => {
            let parsedTags = [];
            if (row.tags && typeof row.tags === 'string') {
                try {
                    parsedTags = JSON.parse(row.tags);
                } catch (e) {
                    console.error('[NotaryService getAllActivePromotions] Error parsing tags JSON:', e);
                }
            } else if (Array.isArray(row.tags)) {
                parsedTags = row.tags;
            }
            return { ...row, tags: parsedTags };
        });

    } catch (error) {
        console.error('[NotaryService getAllActivePromotions Error]:', error.message, error.stack);
        throw new Error('활성 공증인 홍보 목록 조회 중 오류가 발생했습니다.');
    } finally {
        if (connection) connection.release();
    }
}

module.exports = {
    getPromotionByUserId,
    upsertPromotionByUserId,
    getUserProfileForNotaryPage, 
    getAllActivePromotions};