'use strict';

/* Client Controllers */

angular.module('client.controllers', [
	'client.overview.controllers',
	'client.update.controllers',
	'angularModalService'
	]).

	controller('ClientController',
		['$scope', 'clientFactory', function($scope, clientFactory) {
			var a = clientFactory.getLoanRequestData();
			a.then(function(result){
				$scope.loanRequestData = {
					data: /*result*/$scope.loanRequestData
				};
			});


			$scope.loanDuration = moment().add(30, 'days').diff(moment().startOf('day'), 'days');


	}]);