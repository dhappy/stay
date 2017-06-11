angular.module('CalendarApp', ['ngMaterial', 'ui.calendar', 'ui.bootstrap'])
    .controller('MainCtrl', [
	'$scope',
	function($scope) {
	    $scope.start = {
		date: new Date(),
		time: (function() {
		    var current = new Date()
		    current.setMilliseconds(0)
		    return current
		})()
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
