// Custom matchers
beforeEach(function() {

    this.addMatchers({

        to: function (message) {
            var connector = this.isNot ? " to not " : " to ";
            this.message = function () {
                return "Expected " + jasmine.pp(this.actual) + connector + "'" + message + "'";
            };
            return this.isNot;
        },

        toBeInstanceOf: function(expected) {
            return this.actual instanceof expected;
        },

        toExtend: function(expected) {
            this.message = function() {
                return "Expected " + this.actual + " to extend " + expected;
            };

            return new this.actual() instanceof expected;
        },

        toBeArray: function() {
            this.message = function() {
                return "Expected " + this.actual + " to be an array";
            };

            return _.isArray(this.actual);
        },

        toBeRegularExpression: function () {
            if (!this.actual || !_.isFunction(this.actual.exec) || !_.isFunction(this.actual.test)) {
                return "Expected " + this.actual + " to be an a regular expression";
            }

            return true;
        },

        toBeFunction: function() {
            this.message = function() {
                return "Expected " + this.actual + " to be a function";
            };

            return _.isFunction(this.actual);
        },

        toDeepEqual: function(expected) {
            this.message = function() {
                return "Expected \n" + jasmine.pp(this.actual) + "\n to deep equal \n" + jasmine.pp(expected);
            };

            return _.isEqual(this.actual, expected);
        }
    });
});
