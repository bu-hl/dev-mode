const express = require('express');
const multer = require('multer');

const userinfoController = require('./controller/userController');
const getWillController = require('./controller/getWillController');
const registerWillController = require('./controller/registerWillController');
const ocrController = require('./controller/ocrController');
const adminController = require('./controller/adminController');
const mypageController =require('./controller/mypageController');
const notaryController = require('./controller/notaryController'); // 공증인 컨트롤러 임포트 (파일명 확인)

const router = express.Router();

const storage = multer.memoryStorage();
const MAX_IMAGE_COUNT = 5;
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});
// --- 유언장 조회관련 라우트 ---
router.get('/wills/my-wills', getWillController.getMyWills);// 내 유언장 목록 조회
router.get('/wills/designatedViewers-wills', getWillController.getDesignatedViewersWills); // 볼수있는 유언장 목록 조회
router.get('/details/:willId', getWillController.getWillDetails); // 특정 유언장 상세 조회
router.get('/image/:imageRecordId', getWillController.getWillImage);  //  이미지 직접 조회를 위한 라우트

//유언장 작성 관련 라우트
router.post('/register', registerWillController.registerWill);// 텍스트 전용 유언 등록
router.post('/register-with-images', upload.array('imageFiles', MAX_IMAGE_COUNT), registerWillController.registerWillWithImage); //이미지 유언장등록
router.post('/ocr/extract-text', upload.single('file'), ocrController.extractText); //ocr

//회원가입 관련 라우트
router.post('/auth/register', userinfoController.registerUser); //회원가입
router.post('/auth/login', userinfoController.loginUser); //로그인
router.get('/queryByName/:username', userinfoController.getUserDetailsByUsername); //이름이랑 전번찾기

//관리자 관련 라우트
router.get('/admin/users', adminController.getAllUsers); /// 전체 사용자 목록 조회
router.delete('/admin/users/:username', adminController.deleteUser); // 유저 삭제
router.get('/admin/wills', adminController.getAllWills); //전체 유언장 목록 조회
router.get('/admin/wills/:willId', adminController.getWillDetailById); // 특정 유언장 상세 조회
router.get('/mypage/status-counts/:username', mypageController.getMyWillStatusCounts);
router.get('/kkk/:username',mypageController.getUserProfile); // 유저 정보 불러오기
router.put('/admin/wills/:willId/status', adminController.updateWillStatusByAdmin); //유언장 상태 변경


//공증인 관련 라우트
router.get(
    '/notary/my-details', 
    notaryController.getOwnNotaryDetails 
); // 공증인의 정보를 불러오는 라우트
router.put(
    '/notary/details',    
    notaryController.upsertOwnNotaryDetails
); //자신의 정보를 올리는 라우트
router.get(
    '/notary/promotions/list',
    notaryController.getAllPublicPromotions
); // 현제 올려진 정보를 보여주는 라우트 

module.exports = router;
