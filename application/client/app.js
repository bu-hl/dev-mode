'use strict';

var app = angular.module('application', []);

app.controller('AppCtrl', function($scope, appFactory){
    $("#success_init").hide();
    $("#success_invoke").hide();
    $("#success_query").hide();
    $("#success_qurey_all").hide();
    $("#success_delete").hide();
    $scope.initAB = function(){
        appFactory.initAB($scope.abstore, function(data){
            if(data == "Success")
            $scope.init_ab = "success";
            $("#success_init").show();
        });
    }
    $scope.invokeAB = function(){
        appFactory.invokeAB($scope.abstore, function(data){
            if(data == "Success")
                $scope.invoke_ab = "success";
            $("#success_invoke").show();
        });
    }
    $scope.queryAB = function(){
        appFactory.queryAB($scope.walletid, function(data){
            $scope.query_ab = data;
            $("#success_qurey").show();
        });
    }
    $scope.queryAll = function(){
        appFactory.queryAll(function(data){
            $scope.query_all = data;
            $("#success_qurey_all").show();
        });
    }
    $scope.deleteAB = function(){
        appFactory.deleteAB($scope.abstore, function(data){
            if(data == "Success")
                $scope.delete_ab = "success";
            $("#success_delete").show();
        });
    }
});
app.factory('appFactory', function($http){
      
    var factory = {};
 
    factory.initAB = function(data, callback){
        $http.get('/init?a='+data.a+'&aval='+data.aval+'&b='+data.b+'&bval='+data.bval).success(function(output){
            callback(output)
        });
    }

    factory.invokeAB = function(data, callback){
        $http.get('/invoke?a='+data.a+'&b='+data.b+'&value='+data.value).success(function(output){
            callback(output)
        });
    }

    factory.queryAB = function(a, callback){
        $http.get('/query?name='+a).success(function(output){
            callback(output)
        });
    }

    factory.queryAll = function(callback){
        $http.get('/queryAll').success(function(output){
            callback(output)
        });
    }

    factory.deleteAB = function(data, callback){
        $http.get('/delete?name='+data.a).success(function(output){
            callback(output)
        });
    }
    return factory;
});
 