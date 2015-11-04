'use strict';

/* Client Overview Controllers */

angular.module('client.overview.controllers', []).

	controller('ClientOverviewController',
    ['$scope', '$rootScope', 'loanFactory', 'ModalService','clientFactory','colorFactory', function($scope, $rootScope, loanFactory, ModalService,clientFactory,colorFactory) {

        var loan_request_data = clientFactory.getLoanRequestData();
        $scope.tabbs = [];

        //console.log(colorFactory.getcolor('1month'));

        // /Declare whitch product is chosen.
        $scope.selectedProduct = '3month';

        //We recive the products.
        loan_request_data.then(function(result){
            var active_product;
            var products = [];
            angular.forEach(result,function(product, key){
                product.loan_request.limits_per_duration_json = JSON.parse(product.loan_request.limits_per_duration_json)
                products.push(product);
                console.log(product);
                $scope.tabbs.push({
                    name: Object.keys(product.loan_request.limits_per_duration_json)[0],
                    active: ($scope.selectedProduct == Object.keys(product.loan_request.limits_per_duration_json)[0]),
                    label: product.loan_request.product_options.tab_label,
                    color: colorFactory.getcolor(Object.keys(product.loan_request.limits_per_duration_json)[0]),
                });

            });

            //Product change tabs.
            $scope.change_product = function(name){
                $scope.selectedProduct = name;
                angular.forEach(products,function(product, key){
                    if (Object.keys(product.loan_request.limits_per_duration_json)[0] == name) {
                        active_product = product;
                    }
                });
                $scope.creditLimit = active_product.loan_request.credit_limit;
                $scope.loanDuration = moment(active_product.loan_request.maximum_duration_date, "YYYY-MM-DD").diff(moment().startOf('day'), 'days');
                $scope.nextIncomeDate = active_product.next_income_date;
                $scope.productData = active_product.loan_request.limits_per_duration_json;
                $scope.creditLimitObj = $scope.productData[$scope.selectedProduct];
                $scope.CLisMin = $scope.creditLimitObj[1].lower == $scope.creditLimitObj[Object.keys($scope.creditLimitObj).length].upper;
                $scope.CLisMinValue = $scope.creditLimitObj[1].lower;
                $scope.creditLow = $scope.CLisMinValue;
                $scope.product_options = active_product.loan_request.product_options;

                if ($scope.product_options.fixed_name) {
                    $scope.sliderDayValue = $scope.product_options.fixed_name;
                    $scope.days = false;
                }else{
                    $scope.days = true;
                    $scope.sliderDayValue = $scope.loanDuration;
                }
            };

            $scope.instalments = [],
                $scope.loanRequestInfo = {};

        });


        $scope.sliderValue = {
            pound: null,
            day: null
        };

        $scope.$watch('sliderValue', function(newVal) {
            if(!_.isUndefined(newVal.pound) && !isNaN(newVal.pound)) {
                $scope.sliderPoundValue = newVal.pound;
            } else {
                $scope.sliderPoundValue = $scope.CLisMinValue;
            }
            if(!_.isUndefined(newVal.day) && newVal.day !== null) {
                if (!($scope.product_options.fixed_name)) {
                    $scope.sliderDayValue = newVal.day;
                }
            } else {
                if (_.isUndefined($scope.product_options)) {
                    $scope.sliderDayValue = $scope.loanDuration;
                }
            }
            $scope.earlierPaymentDate = moment().add($scope.sliderDayValue, 'days').format('YYYY-MM-DD');


            $scope.borrowButtonDisabled = true;
        }, true);

        $scope.$watch('sliderValue', $.debounce(300, function(newVal) {
            $scope.getInstalmentSchedule();
        }), true);

        $scope.getInstalmentSchedule = function() {
            loanFactory.getInstalments({
                next_income_date: $scope.nextIncomeDate,
                earlier_payment_date: $scope.earlierPaymentDate,
                amount: $scope.sliderPoundValue
            }).then(function(response){
                // For test task
                //console.log(response);

                response = {
                    data: response
                };

                $scope.instalments = response.data.instalments;
                $scope.loanRequestInfo = {
                    principal: 0,
                    interest: 0,
                    total: function() {
                        return parseFloat(this.principal) + parseFloat(this.interest);
                    }
                };
                angular.forEach($scope.instalments, function(value, key) {
                    $scope.instalments[key].showAmount = parseFloat(value.interest) + parseFloat(value.principal);
                    $scope.loanRequestInfo.principal += parseFloat(value.principal);
                    $scope.loanRequestInfo.interest += parseFloat(value.interest);
                });
                $scope.borrowButtonDisabled = false;
            });
        }

        // Client overview modals
        $scope.openRequestConfirmModal = function() {
            $scope.requestData = {
                instalments: $scope.instalments,
                loanAmount: $scope.sliderPoundValue,
                paymentDate: $scope.earlierPaymentDate,
                nextIncomeDate: $scope.nextIncomeDate,
                summary: $scope.loanRequestInfo
            };
            loanFactory.setLoanData($scope.requestData);

            ModalService.showModal({
                templateUrl: '/myjar/angular-app/modals/client/loan-request-confirm.html',
                controller: "ModalController"
            }).then(function(modal) {
                modal.element.remodal().open();
                modal.close.then(function(result) {
                    modal.element.remodal().close();
                });
            });
        }

        //$scope.openRequestConfirmModal();

    }]).

    controller('ModalController',
		['$scope', 'loanFactory', function($scope, loanFactory) {
			$scope.requestData = loanFactory.getLoanData();
			
			$scope.requestLoanSchedule = function() {
				$scope.requestLoading = true;
				loanFactory.requestLoan({
					next_income_date: $scope.requestData.nextIncomeDate,
					earlier_payment_date: $scope.requestData.paymentDate,
					amount: $scope.requestData.loanAmount
				}).then(function(response){
					if(response.data.loan_id.length > 0 && response.data.result == 'success') {
						window.location.replace(response.data.redirect);
					}
				});
			}
	}]);