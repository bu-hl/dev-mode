'use strict';

var app = angular.module('application', []);

// Main Controller
app.controller('AppCtrl', function($scope, appFactory){ // AppCtrl 정의 시작

    // --- 마침표 (디지털 유언장) 관련 변수 초기화 ---
    $scope.will = { // 유언장 등록 폼 데이터
        title: "",
        originalContent: "",
        beneficiaries: "", // 사용자가 JSON 문자열로 입력
        testatorId: "user1" // 기본값 또는 로그인 사용자 ID로 설정 필요
    };
    $scope.queryWillId = ""; // 유언장 상세 조회 ID (블록체인 Will ID)

    // 상태 메시지 변수
    $scope.will_register_status_msg = "";
    $scope.will_register_status_type = ""; // 'success' or 'error'
    $scope.will_register_response = "";

    $scope.my_wills_response = "";
    $scope.my_wills_list = []; // 목록 데이터를 위한 배열

    $scope.will_details_error = "";
    $scope.will_details_response = "";


    // --- 마침표 (디지털 유언장) 관련 함수 ---

    // 1. 유언장 등록
    $scope.registerWill = function(){
        if (!$scope.will.title || !$scope.will.originalContent || !$scope.will.testatorId) {
            $scope.will_register_status_msg = "오류: 제목, 원본 내용, 작성자 ID는 필수입니다.";
            $scope.will_register_status_type = "error";
            $scope.will_register_response = "";
            return;
        }

        $scope.will_register_status_msg = "처리 중...";
        $scope.will_register_status_type = "";
        $scope.will_register_response = "";

        let beneficiariesArray = [];
        if ($scope.will.beneficiaries && $scope.will.beneficiaries.trim() !== "") {
            try {
                beneficiariesArray = JSON.parse($scope.will.beneficiaries);
                if (!Array.isArray(beneficiariesArray)) {
                    beneficiariesArray = [];
                }
            } catch (e) {
                $scope.will_register_status_msg = "경고: 수혜자 목록 형식이 잘못되어 빈 목록으로 처리됩니다. (예: [\"이름1\",\"이름2\"])";
                $scope.will_register_status_type = "warning"; // 'warning'으로 변경
                beneficiariesArray = [];
            }
        }

        const willDataForApi = {
            title: $scope.will.title,
            originalContent: $scope.will.originalContent,
            beneficiaries: beneficiariesArray,
            testatorId: $scope.will.testatorId
        };

        appFactory.registerWill(willDataForApi, function(response){
            if (response.error) {
                $scope.will_register_status_msg = "유언장 등록 중 오류가 발생했습니다.";
                $scope.will_register_status_type = "error";
                $scope.will_register_response = "오류 상세: " + (response.error.data ? angular.toJson(response.error.data, true) : response.error.message || "알 수 없는 오류");
            } else {
                $scope.will_register_status_msg = "유언장 등록 성공!";
                $scope.will_register_status_type = "success";
                // 서버에서 blockchainWillId와 dbRecordId를 반환한다고 가정
                $scope.will_register_response = "블록체인 Will ID: " + response.blockchainWillId +
                                                "\n오프체인 데이터 참조 ID (DB): " + response.dbRecordId +
                                                "\n\n상세 조회 시에는 '블록체인 Will ID'를 사용하세요.";
                $scope.will = { title: "", originalContent: "", beneficiaries: "", testatorId: $scope.will.testatorId };
            }
        });
    };

    // 2. 나의 유언장 목록 조회
    $scope.getMyWills = function(){
        $scope.my_wills_response = "조회 중...";
        $scope.my_wills_list = []; // 목록 초기화
        appFactory.getMyWills(function(response){
            if (response.error) {
                $scope.my_wills_response = "나의 유언장 목록 조회 중 오류: " + (response.error.data ? angular.toJson(response.error.data, true) : response.error.message || "알 수 없는 오류");
            } else {
                if (response && Array.isArray(response) && response.length > 0) {
                    $scope.my_wills_list = response;
                    $scope.my_wills_response = "총 " + response.length + "개의 유언장이 조회되었습니다. (아래 목록 확인)";
                } else if (response && Array.isArray(response) && response.length === 0) {
                    $scope.my_wills_response = "작성한 유언장이 없습니다.";
                } else {
                     // 응답이 배열이 아니거나 예상치 못한 형식일 경우
                    $scope.my_wills_response = "예상치 못한 응답 형식입니다: " + angular.toJson(response, true);
                }
            }
        });
    };

    // 3. 유언장 상세 조회
    $scope.getWillDetails = function(willIdToQuery){
        const id = willIdToQuery || $scope.queryWillId;
        if (!id || id.trim() === "") {
            $scope.will_details_error = "조회할 '블록체인 Will ID'를 입력하거나 목록에서 선택하세요.";
            $scope.will_details_response = "";
            return;
        }
        $scope.will_details_error = "";
        $scope.will_details_response = "조회 중..."; // 초기화
        appFactory.getWillDetails(id, function(response){
            if (response.error) {
                let errorMsg = "유언장 상세 정보 조회 중 오류: ";
                if (response.error.status === 404) {
                    errorMsg += "해당 ID의 유언장을 찾을 수 없습니다. (404)";
                    if (response.error.data && response.error.data.error) { // 서버에서 보낸 error 메시지 추가
                         errorMsg += " 상세: " + response.error.data.error;
                    }
                } else if (response.error.data && response.error.data.details) {
                    errorMsg += response.error.data.details;
                } else if (response.error.data) {
                    errorMsg += angular.toJson(response.error.data, true);
                } else {
                    errorMsg += response.error.message || "알 수 없는 오류";
                }
                $scope.will_details_response = errorMsg;
            } else {
                 // 서버로부터 받은 응답 객체 (메타데이터 + originalContent 포함)
                 // angular.toJson은 객체를 보기 좋은 JSON 문자열로 변환하여 UI에 표시
                 $scope.will_details_response = angular.toJson(response, true);
            }
        });
    }; // $scope.getWillDetails 함수 정의 끝

    // populateAndGetDetails 함수가 필요하다면 여기에 추가합니다.
    // (index.html에서 목록 아이템 클릭 시 이 함수를 호출하도록 되어 있다면 반드시 필요합니다.)
    $scope.populateAndGetDetails = function(willId) {
        $scope.queryWillId = willId; // 입력 필드 업데이트
        $scope.getWillDetails(willId); // 상세 조회 실행
    };

}); // <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< 이 줄이 추가되었습니다. AppCtrl 정의 끝


// Factory to interact with the backend API
app.factory('appFactory', function($http){
    var factory = {};

    factory.registerWill = function(willData, callback){
        $http.post('/will/register', willData)
            .success(function(output){
                callback(output); // 서버는 이제 { blockchainWillId: '...', dbRecordId: '...' } 등을 반환
            }).error(function(errorData, status){
                callback({error: { status: status, data: errorData, message: "Request failed" } });
            });
    };

    factory.getMyWills = function(callback){
        $http.get('/will/mywills')
            .success(function(output){
                callback(output); // 서버는 이제 JSON 배열을 반환
            }).error(function(errorData, status){
                callback({error: { status: status, data: errorData, message: "Request failed" } });
            });
    };

    factory.getWillDetails = function(willID, callback){
        $http.get('/will/details/' + encodeURIComponent(willID))
            .success(function(output){
                callback(output); // 서버는 이제 상세 정보가 담긴 JSON 객체를 반환
            }).error(function(errorData, status){
                callback({error: { status: status, data: errorData, message: "Request failed" } });
            });
    };

    return factory;
});