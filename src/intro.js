(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(["backbone", "jquery", "underscore"], function (Backbone, $, _) {
            // Also create a global in case some scripts
            // that are loaded still are looking for
            // a global even when an AMD loader is in use.
            Backbone.Flexisync = factory(Backbone, $, _);
            return Backbone.Flexisync;
        });
    } else {
        // Browser globals
        root.Backbone.Flexisync = factory(root.Backbone, root.jQuery, root._);
    }
}(this, function (Backbone, $, _) {