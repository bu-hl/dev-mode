'use strict';

var app = angular.module('application', []);

app.controller('AppCtrl', function($scope, appFactory) {
    $("#success_init").hide();
    $("#success_register_candidate").hide();
    $("#success_register_voter").hide();
    $("#success_vote").hide();
    $("#success_end_voting").hide();
    $("#success_voting_results").hide();
    $("#success_voter_info").hide();
    $("#success_candidate_info").hide();

    // Initialize the voting system
    $scope.init= function() {
        appFactory.init(function(data) {
            if (data && data.message) {
                $scope.init= data.message;
                $("#success_init").show();
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }
        });
    };

    // Register a candidate
    $scope.registerCandidate = function() {
        appFactory.registerCandidate($scope.candidate, function(data) {
            if (data && data.message) {
                $scope.register_candidate = data.message;
                $("#success_register_candidate").show();
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }
        });
    };

    // Register a voter
    $scope.registerVoter = function() {
        appFactory.registerVoter($scope.voter, function(data) {
            if (data && data.message) {
                $scope.register_voter = data.message;
                $scope.voter_wallet = data.walletAddress;
                $scope.voter_token = data.voteToken;
                $("#success_register_voter").show();
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }
        });
    };

    // Cast a vote
    $scope.vote = function() {
        appFactory.vote($scope.voteData, function(data) {
            if (data && data.message) {
                $scope.vote_result = data.message;
                $scope.candidate_name = data.candidateName;
                $scope.candidate_votes = data.candidateVotes;
                $("#success_vote").show();
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }
        });
    };

    // End voting
    $scope.endVoting = function() {
        appFactory.endVoting(function(data) {
            if (data && data.message) {
                $scope.end_voting = data.message;
                $scope.total_voters = data.totalVoters;
                $scope.total_votes = data.totalVotes;
                $scope.voters_rewarded = data.votersRewarded;
                $scope.participation_rate = data.participationRate;
                $("#success_end_voting").show();
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }
        });
    };

    // Get voting results
    $scope.getVotingResults = function() {
        appFactory.getVotingResults(function(data, error) {
            if (data && !error) {
                $scope.voting_results = data;
                $("#success_voting_results").show();
                $("#error_voting_results").hide();
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            } else {
                $scope.error_voting_results = error || "Failed to retrieve voting results.";
                $scope.voting_results = null;
                $("#error_voting_results").show();
                $("#success_voting_results").hide();
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }
        });
    };

    // Get voter information
    $scope.getVoterInfo = function() {
        appFactory.getVoterInfo($scope.voterInfo, function(data, error) {
            if (data && !error) {
                $scope.voter_info = data;
                $("#success_voter_info").show();
                $("#error_voter_info").hide();
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            } else {
                $scope.error_voter_info = error || "Failed to retrieve voter information.";
                $scope.voter_info = null;
                $("#error_voter_info").show();
                $("#success_voter_info").hide();
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }
        });
    };

    // Get candidate information
    $scope.getCandidateInfo = function() {
        appFactory.getCandidateInfo($scope.candidateInfo, function(data, error) {
            if (data && !error) {
                $scope.candidate_info = data;
                $("#success_candidate_info").show();
                $("#error_candidate_info").hide();
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            } else {
                $scope.error_candidate_info = error || "Failed to retrieve candidate information.";
                $scope.candidate_info = null;
                $("#error_candidate_info").show();
                $("#success_candidate_info").hide();
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }
        });
    };
});

app.factory('appFactory', function($http) {
    var factory = {};

    // Initialize the voting system
    factory.init = function(callback) {
        $http.get('/init').then(function(response) {
            callback(response.data);
        }, function(error) {
            callback(null, error.data && error.data.error || "Failed to init.");
        });
    };

    // Register a candidate
    factory.registerCandidate = function(data, callback) {
        $http.get('/registerCandidate', {
            params: {
                candidateId: data.candidateId,
                name: data.name
            }
        }).then(function(response) {
            callback(response.data);
        }, function(error) {
            callback(null, error.data && error.data.error || "Failed to register candidate.");
        });
    };

    // Register a voter
    factory.registerVoter = function(data, callback) {
        $http.get('/registerVoter', {
            params: {
                voterId: data.voterId,
                name: data.name
            }
        }).then(function(response) {
            callback(response.data);
        }, function(error) {
            callback(null, error.data && error.data.error || "Failed to register voter.");
        });
    };

    // Cast a vote
    factory.vote = function(data, callback) {
        $http.get('/vote', {
            params: {
                voterId: data.voterId,
                candidateId: data.candidateId
            }
        }).then(function(response) {
            callback(response.data);
        }, function(error) {
            callback(null, error.data && error.data.error || "Failed to cast vote.");
        });
    };

    // End voting
    factory.endVoting = function(callback) {
        $http.get('/endVoting').then(function(response) {
            callback(response.data);
        }, function(error) {
            callback(null, error.data && error.data.error || "Failed to end voting.");
        });
    };

    // Get voting results
    factory.getVotingResults = function(callback) {
        $http.get('/getVotingResults').then(function(response) {
            callback(response.data);
        }, function(error) {
            callback(null, error.data && error.data.error || "Server error");
        });
    };

    // Get voter information
    factory.getVoterInfo = function(data, callback) {
        $http.get('/getVoterInfo', {
            params: {
                voterId: data.voterId
            }
        }).then(function(response) {
            callback(response.data);
        }, function(error) {
            callback(null, error.data && error.data.error || "Server error");
        });
    };

    // Get candidate information
    factory.getCandidateInfo = function(data, callback) {
        $http.get('/getCandidateInfo', {
            params: {
                candidateId: data.candidateId
            }
        }).then(function(response) {
            callback(response.data);
        }, function(error) {
            callback(null, error.data && error.data.error || "Server error");
        });
    };

    return factory;
});