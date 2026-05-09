'use strict';

var app = angular.module('application', []);

app.controller('AppCtrl', function($scope, appFactory){
   $("#success_init").hide();
   $("#success_query").hide();
   $("#success_invoke").hide();
   $("#success_delete").hide();
   $("#success_all").hide();

   $scope.initAB = function(){
       appFactory.initAB($scope.abstore, function(data){
           $scope.init_ab = data === "Success" ? "Created successfully" : data;
           $("#success_init").show();
       });
   }

   $scope.queryAB = function(){
       appFactory.queryAB($scope.walletid, function(data){
           $scope.query_ab = angular.toJson(data, true);
           $("#success_query").show();
       });
   }

   $scope.invokeAB = function(){
       appFactory.invokeAB($scope.invoke, function(data){
           $scope.invoke_ab = angular.toJson(data, true);
           $("#success_invoke").show();
       });
   }

   $scope.deleteAB = function(){
       appFactory.deleteAB($scope.deleteName, function(data){
           $scope.delete_ab = angular.toJson(data, true);
           $("#success_delete").show();
       });
   }

   $scope.getAllAB = function(){
       appFactory.getAllAB(function(data){
           $scope.all_ab = angular.toJson(data, true);
           $("#success_all").show();
       });
   }
});

app.factory('appFactory', function($http){
    var factory = {};
 
    factory.initAB = function(data, callback){
        $http.get('/init?a='+data.a+'&aval='+data.aval+'&b='+data.b+'&bval='+data.bval).success(function(output){
            callback(output);
        });
    }

    factory.queryAB = function(a, callback){
        $http.get('/query?name='+a).success(function(output){
            callback(output);
        });
    }

    factory.invokeAB = function(data, callback){
        $http.get('/invoke?a='+data.a+'&b='+data.b+'&c='+data.c+'&x='+data.x).success(function(output){
            callback(output);
        });
    }

    factory.deleteAB = function(a, callback){
        $http.get('/delete?a='+a).success(function(output){
            callback(output);
        });
    }

    factory.getAllAB = function(callback){
        $http.get('/all').success(function(output){
            callback(output);
        });
    }

    return factory;
});
