angular.module('CalendarApp', ['ngMaterial', 'ui.calendar', 'ui.bootstrap'])
    .controller('MainCtrl', [
	'$scope',
	function($scope) {
	    $scope.event = {
		start: new Date()
	    }
	    $scope.events = []
	    
	    $scope.addEvent = function() {
		$scope.events.push([{
		    title: $scope.title,
		    start: $scope.event.start,
		    end: $scope.event.end
		}])
		console.log($scope.events)
		$scope.title = '';
	    };
	}])
