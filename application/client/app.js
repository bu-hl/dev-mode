'use strict';

var app = angular.module('application', []);

app.controller('AppCtrl', function($scope, appFactory){
    $("#success_createLoan").hide();
    $("#success_approveLoan").hide();
    $("#success_deleteLoan").hide();
    $("#success_updateLoan").hide();
    $("#success_queryLoan").hide();
    $("#success_queryAllLoans").hide();

    // 대출 요청 생성
    $scope.createLoan = function(){
        appFactory.createLoan($scope.loaninfo, function(data){
            if(data == "Success")
                $scope.create_loan = "대출 요청 생성 완료!";
            else
                $scope.create_loan = "대출 요청 생성 실패: " + JSON.stringify(data);
            $("#success_createLoan").show();
        });
    }

    // 대출 요청 승인
    $scope.approveLoan = function(){
        appFactory.approveLoan($scope.loaninfo, function(data){
            if(data == "Success")
                $scope.approve_loan = "대출 요청 승인 완료!";
            else
                $scope.approve_loan = "대출 요청 승인 실패: " + JSON.stringify(data);
            $("#success_approveLoan").show();
        });
    }

    // 대출 요청 삭제
    $scope.deleteLoan = function(){
        appFactory.deleteLoan($scope.loaninfo, function(data){
            if(data == "Success")
                $scope.delete_loan = "대출 요청 삭제 완료!";
            else
                $scope.delete_loan = "대출 요청 삭제 실패: " + JSON.stringify(data);
            $("#success_deleteLoan").show();
        });
    }

    // 대출 요청 수정
    $scope.updateLoan = function(){
        appFactory.updateLoan($scope.loaninfo, function(data){
            if(data == "Success")
                $scope.update_loan = "대출 요청 수정 완료!";
            else
                $scope.update_loan = "대출 요청 수정 실패: " + JSON.stringify(data);
            $("#success_updateLoan").show();
        });
    }

    // 대출 요청 조회
    $scope.queryLoan = function(){
        appFactory.queryLoan($scope.loaninfo.loanid, function(data){
            $scope.query_loan = "🔍 조회 결과: " + JSON.stringify(data);
            $("#success_queryLoan").show();
        });
    }

    // 전체 대출 요청 조회
    $scope.queryAllLoans = function(){
        appFactory.queryAllLoans(function(data){
            $scope.query_all_loans = "🔍 전체 조회 결과: " + JSON.stringify(data);
            $("#success_queryAllLoans").show();
        });
    }
});

app.factory('appFactory', function($http){
    var factory = {};

    factory.createLoan = function(data, callback){
        $http.get('/createLoan?id='+data.loanid+'&requester='+data.requester+'&amount='+data.amount+'&durationDays='+data.durationDays)
            .success(function(output){
                callback(output)
            });
    }

    factory.approveLoan = function(data, callback){
        $http.get('/approveLoan?id='+data.loanid+'&provider='+data.provider)
            .success(function(output){
                callback(output)
            });
    }

    factory.deleteLoan = function(data, callback){
        $http.get('/deleteLoan?id='+data.loanid)
            .success(function(output){
                callback(output)
            });
    }

    factory.updateLoan = function(data, callback){
        $http.get('/updateLoan?id='+data.loanid+'&newAmount='+data.amount+'&newDurationDays='+data.durationDays)
            .success(function(output){
                callback(output)
            });
    }

    factory.queryLoan = function(id, callback){
        $http.get('/queryLoan?id='+id)
            .success(function(output){
                callback(output)
            });
    }

    factory.queryAllLoans = function(callback){
        $http.get('/queryAllLoans')
            .success(function(output){
                callback(output)
            });
    }

    return factory;
});
