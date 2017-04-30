/**
   * @ngdoc ngModule
   * @module myApp
   * @name myApp
   *
   * @description
   * Main Application Module
   */
  var myApp = angular.module('myApp', []);

  /**
   * @ngdoc ngService
   * @name d3Service
   *
   * @description
   * D3 Service loading D3 core and allowing injection as dependency.
   * @see Write up on the approach here: 
   * {@link http://www.ng-newsletter.com/posts/d3-on-angular.html}
   */
  myApp.factory('d3Service', d3Service);
  d3Service.$inject = ['$document', '$q', '$rootScope'];

  function d3Service($document, $q, $rootScope) {

    var d3Service = {};

    /**
     * @function d3Service.d3
     * @description
     * Handles promise resolution for loading d3 library. 
     * We can then attach operations to that promise that rely on
     * d3 being available i.e.: d3Service.loaded().then(function(d3) { do some stuff... });
     */
    d3Service.loaded = function() {
      return d3Service.d3Promise.promise;
    };

    /**
     * @function d3Service.resolvePromise
     * @description
     * Callback for resolving the d3 promise once the script has loaded
     */
    d3Service.resolvePromise = function() {

      $rootScope.$apply(function() {
        d3Service.d3Promise.resolve(window.d3);
      });
    };

    /**
     * @function d3Service.appendD3
     * @description
     * Appends D3 script tag to the application when needed and listens for it to finish loading.
     */
    d3Service.appendD3 = function() {

      d3Service.d3Promise = $q.defer();

      var scriptTag = $document[0].createElement('script');
      scriptTag.type = 'text/javascript';
      scriptTag.async = true;
      scriptTag.src = 'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.16/d3.min.js';
      scriptTag.onreadystatechange = function() {
        if (this.readyState === 'complete')
          d3Service.resolvePromise();
      };
      scriptTag.onload = d3Service.resolvePromise;
      var body = $document[0].getElementsByTagName('body')[0];
      body.appendChild(scriptTag);

    };

    // Trigger the append.
    d3Service.appendD3();

    return d3Service;

  }

  /**
   * @ngdoc ngController
   * @name appContentController
   *
   * @description
   * For simplicity we use our App Controller to bind the data from our textarea 
   * and send configuration to the Sparkline Directive.
   * In a real world scenario it is more likely that data would be retrieved
   * through a Service layer or API calls.
   */
  myApp.controller('appContentController', appContentController);
  appContentController.$inject = ['$scope', '$rootScope'];

  function appContentController($scope, $rootScope) {

    // This is the configuration we'll pass in to our Sparkline Directive
    $scope.sparklineConfig = {
      data: [{
        x: 1,
        y: 2
      }, {
        x: 2,
        y: -1
      }, {
        x: 3,
        y: 5
      }, {
        x: 4,
        y: 12
      }, {
        x: 5,
        y: 10
      }, {
        x: 6,
        y: 18
      }, {
        x: 7,
        y: 8
      }, {
        x: 8,
        y: 15
      }, {
        x: 9,
        y: 21
      }, {
        x: 10,
        y: 26
      }],
      showPoints: "no",
      interpolate: "linear"
    };

    // Using ng-options we can create a <select> that lets the user choose from these interpolations
    $scope.interpolateOptions = [
      "linear",
      "linear-closed",
      "step",
      "step-before",
      "step-after",
      "basis",
      "basis-open",
      "basis-closed",
      "bundle",
      "cardinal",
      "cardinal-open",
      "cardinal-closed",
      "monotone"
    ];

    // We'll broadcast config changes so we can refresh the viz
    $scope.configChange = function() {
      $rootScope.$broadcast("configChange");
    };

  }

  /**
   * @ngdoc ngDirective
   * @name visualisationLineDirective
   *
   * @description
   * Used to render a line graph.
   */
  myApp.directive("vizSparkline", visualisationSparklineDirective);
  visualisationSparklineDirective.$inject = ["d3Service", "$rootScope"];

  function visualisationSparklineDirective(d3Service, $rootScope) {
    return {
      restrict: 'A',
      scope: {
        'config': '='
      },
      link: function(scope, element, attrs) {

        /**
         * @function validateNumber
         * @param {string|number|int} input
         * @description Helper function making sure value is a valid number
         * @return {number} number
         */
        function validateNumber(input) {

          var fallback = 0;

          if (angular.isNumber(input))
            return input;

          if (angular.isString(input)) {
            var testNumber = Number(input);
            if (!isNaN(testNumber)) {
              return testNumber;
            }

          }

          return fallback;

        }

        /**
         * @function setupGraph
         * @description Setup painting elements and functions ready for render. 
         * This step should ideally only be repeated on window resize. 
         * All data changes need to be handled by render alone.
         */
        function setupGraph() {

          scope.wrapper = element[0];

          // Making sure the element we want to draw in is empty.
          d3
            .select(scope.wrapper)
            .selectAll('*')
            .remove();

          // Injecting our painting canvas in this case a <svg> element
          scope.vizCanvas = d3.select(scope.wrapper)
            .append("svg")
            .style('width', '100%')
            .style('height', d3.select(scope.wrapper).node().getBoundingClientRect().height + "px");

          scope.padding = {
            vertical: 10,
            horizontal: 10
          };

          // Since we want to have some inner padding we group all elements inside a <g>
          scope.vizPadded =
            scope.vizCanvas
            .append("g")
            .attr("transform", "translate(" + scope.padding.vertical + "," + scope.padding.horizontal + ")");

          // Setting up the scale for our x-Axis
          scope.x = d3.scale
            .linear()
            .range([
              0,
              scope.vizCanvas.node().getBoundingClientRect().width - (scope.padding.horizontal * 2)
            ]);

          // Setting up the scale for our y-Axis
          scope.y = d3.scale
            .linear()
            .range([
              scope.vizCanvas.node().getBoundingClientRect().height - (scope.padding.vertical * 2),
              0
            ]);

          // Using d3.svg.line() to setup a function we can use to create the value for d attribute of a <path> element
          scope.plotLine = d3.svg
            .line()
            .x(function(data) {
              return scope.x(validateNumber(data.x));
            })
            .y(function(data) {
              return scope.y(validateNumber(data.y));
            });

        }

        /**
         * @function paintGraph
         *
         * @description
         * Render the actual viz. This step is repeated to reflect changes in data etc.
         */
        function paintGraph() {

          // Do we have an interpolation option set? If so lets apply it
          if (angular.isDefined(scope.config.interpolate))
            scope.plotLine
            .interpolate(scope.config.interpolate);

          // Extending the domain of our x-Axis scale to the current data values
          scope.x
            .domain(d3.extent(scope.config.data, function(dataPoint) {
              return validateNumber(dataPoint.x);
            }));

          // Extending the domain of our y-Axis scale to the current data values
          scope.y
            .domain(d3.extent(scope.config.data, function(dataPoint) {
              return validateNumber(dataPoint.y);
            }));

          // To show a smooth transition on first render we set a standard line flat at minimum y value
          var yMin = d3.min(scope.y.domain());
          var defaultLineConfig = Array.apply(null, {
            length: scope.config.data.length
          }).map(
            function(d, i) {
              return {
                x: i,
                y: yMin
              };
            });

          // On first render or if there is no line we append a <path> path to our <svg>
          if (scope.vizPadded.select(".line").empty())
            scope.line = scope.vizPadded
            .append('path')
            .attr("class", 'line')
            .attr("d", scope.plotLine(defaultLineConfig));

          // Then we apply current data values to that line
          scope.line
            .transition().duration(100).ease('linear')
            .attr("d", scope.plotLine(scope.config.data));

          // Selecting any points present in the <svg>
          scope.points = scope.vizPadded
            .selectAll(".point")
            .data(scope.config.data);

          // If points are switched off
          if (scope.config.showPoints === 'no') {

            // Make sure they are removed
            scope.points
              .transition().duration(100).ease('linear')
              .style("opacity", 0)
              .remove();

            // If points are switched on
          } else {

            // Make sure there to append any <circles> we are missing to represent our data
            scope.points
              .enter()
              .append("circle")
              .attr("class", "point")
              .attr("cx", function(data) {
                return scope.x(validateNumber(data.x));
              })
              .attr("cy", scope.y(validateNumber(yMin)))
              .attr("r", 1.5);

            // Or make if we have more <circle> than points in our data we remove them
            scope.points
              .exit()
              .transition().duration(100).ease('linear')
              .style("opacity", 0)
              .remove();

            // All points that are left now should represent our datapoints so we set their positions
            scope.points
              .transition().duration(100).ease('linear')
              .attr("cx", function(data) {
                return scope.x(validateNumber(data.x));
              })
              .attr("cy", function(data) {
                return scope.y(validateNumber(data.y));
              });

          }

        }

        // We make sure that d3 library is loaded and then trigger setup & painting
        d3Service.loaded().then(function(d3) {
          setupGraph();
          paintGraph();
        });

        // On config change events we paint our graph again to reflect any changes
        $rootScope.$on('configChange', paintGraph);

      }

    };
  }

