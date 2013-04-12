var RemoteStore = (function ($) {

    var RemoteStore = {
        async: true,
        availabledata: {},
        datasources: {},
        datasourcecount: 0
    };

    $.support.cors = true;

    RemoteStore.get = function (name, options) {
        var parsedData, data, datasource, xhr,
            async = $.Deferred();

        datasource = this.getSource(name);
        if (!datasource) return async.reject().promise();

        options = options || {};
        options.xhr = options.xhr || RemoteStore.createProgressXhr(async);

        xhr = RemoteStore.createRequest(datasource, options);
        datasource.remoterequest = xhr;

        xhr.fail(function(xhr, status, error) {
            async.reject(error);
        });

        xhr.done(function(rawdata, status, xhr) {
            if (xhr && xhr.data[name]) {
                var cachedata = {
                    keys: datasource.returnData,
                    data: xhr.data
                };
                async.resolve(xhr.data[name], cachedata);
            }
            else {
                var error = (xhr && xhr.error) || new Sync.Error(503, "Remote data fetching failed.");
                async.reject(error);
            }
        });

        xhr.always(function () {
            datasource.remoterequest = undefined;
        });

        return async.promise();
    };

    RemoteStore.set = function () {};

    RemoteStore.createRequest = function (datasource, options) {
        var xhr;

        if (datasource.remoterequest) {
            return datasource.remoterequest;
        }
        else {
            options = $.extend(options, {
                type: "GET",
                url: datasource.url,
                dataType: "json"
            });

            xhr = $.ajax(options);
            xhr.datasource = datasource;
            xhr.done(RemoteStore.processRequest);

            return xhr;
        }
    };

    RemoteStore.processRequest = function(rawdata, status, xhr) {
        try {
            xhr.data = xhr.datasource.parse(rawdata);
        }
        catch (e) {
            if (e instanceof Sync.Error) {
                xhr.error = e;
            }
            else {
                xhr.error = new Sync.Error(503, "Raw data parsing failed.", e);
                if (Sync.debug && e.name && e.message) console.log (e.name + ": " + e.message);
            }
        }
    };

    RemoteStore.createProgressXhr = function(async) {

        return function () {
            var xhr = new window.XMLHttpRequest();

            xhr.addEventListener("progress", function(evt){
                if (evt.lengthComputable) {
                    async.notify(evt.loaded, evt.total);
                }
            }, false);

            return xhr;
        };
    };

    // Registers a new datasource
    RemoteStore.addSource = function (datasource) {
        var id;
        if (!this.validateSource(datasource)) return false;

        this.datasourcecount++;
        id = this.datasourcecount;

        this.datasources[id] = {
            url: datasource.url,
            returnData: datasource.returnData,
            parse: datasource.parse
        };

        _.each(datasource.returnData, function (name) {
            this.availabledata[name] = id;
        }, this);
    };

    // Checks that 'datasource' is probably a valid datasource object
    RemoteStore.validateSource = function (datasource) {
        return (datasource && _.isString(datasource.url) && _.isArray(datasource.returnData) &&
                    datasource.returnData.length > 0 && _.isFunction(datasource.parse)) ? true : false;
    };

    RemoteStore.getSource = function (name) {
        var data = this.availabledata[name];
        return (data) ? this.datasources[data] : undefined;
    };

    return RemoteStore;

})(jQuery);