angular.module('CalendarApp', ['ngMaterial', 'ui.calendar', 'ui.bootstrap', 'ui.router'])
    .config([
	'$stateProvider',
	'$urlRouterProvider',
	function($stateProvider, $urlRouterProvider) {
	    $stateProvider
	        .state('home', {
		    url: '/home',
		    templateUrl: '/home.html',
		    controller: 'MainCtrl'
		})

	    $urlRouterProvider.otherwise('home')
	}])
    .factory('events', [function() {
	var ret = {
	    events: []
	}
	return ret
    }])
    .controller('MainCtrl', [
	'$scope',
	'$timeout',
	'events',
	function($scope, $timeout, events) {
	    var truncatedTime = new Date()
	    truncatedTime.setMilliseconds(0)
	    truncatedTime.setSeconds(0)

	    $scope.start = {
		date: new Date(),
		time: truncatedTime
	    }
	    $scope.end = {
		date: (function() {
		    var current = new Date()
		    current.setDate(current.getDate() + 1)
		    return current
		})(),
		time: truncatedTime
	    }
	    $scope.events = events.events
	    $scope.eventSources = [$scope.events]

	    var getDatetime = function(base) {
		var datetime = base.date
		if(base.time) {
		    datetime.setHours(base.time.getHours())
		    datetime.setMinutes(base.time.getMinutes())
		}
		return datetime
	    }
	    
	    $scope.addEvent = function() {
		if($scope.start.time) {
		}
		$scope.events.push({
		    title: $scope.title,
		    start: getDatetime($scope.start),
		    end: getDatetime($scope.end)
		})
		$scope.title = ''
	    }

	    $scope.eventRender = function(event, element, view) {
		console.log(event)
		element.attr({
		    tooltip: event.title,
		    'tooltip-append-to-body': true
		})
		$compile(element)($scope)
	    }

	    $scope.uiConfig = {
		calendar: {
		    header: {
			left: 'prev,next today',
			center: 'title',
			right: 'month,agendaWeek,agendaDay'
		    },
		    defaultView: 'agenda',
		    editable: true,
		    fixedWeekCount: false,
		    duration: { days: 4 },
		    timeFormat: 'H(:mm)',
		    selectable: true,
		    select: function(start, end) {
			console.log('t', $scope.start.date, start)
			$scope.start.date = start
			//$scope.start.time = start
			$scope.end.time = $scope.end.date =
			    event.end.toDate()
		    },
		    selectAllow: function(event) {
			$scope.start.time = $scope.start.date =
			    event.start.toDate()
			console.log(event.start.toDate())
		    }
		},
		eventRender: $scope.eventRender
	    }

	    // fullcalendar not rendering on load
	    setTimeout(function() {
		$('#calendar').fullCalendar('render')
	    }, 100)
	}])
