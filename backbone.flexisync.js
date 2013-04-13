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
}(this, function (Backbone, $, _) {;var LocalStore = (function () {
    var LocalStore = {};

    LocalStore._get = function (name) {
        var data = localStorage.getItem("flexisync:data:" + name);
        return (typeof data === "string") ? JSON.parse(data) : undefined;
    };

    LocalStore.get = function (name) {
        var r = {
            data: LocalStore._get(name),
            cachedata: {
                data: LocalStore.cachedata,
                keys: LocalStore.cachekeys
            }
        };
        r.cachedata[name] = r.data;
        LocalStore.cachedata = {};
        LocalStore.cachekeys = [];
        return r.data ? r : undefined;
    };

    LocalStore.set = function (name, data) {
        localStorage.setItem("flexisync:data:" + name, JSON.stringify(data));

        LocalStore.keys = _.uniq(LocalStore.keys.concat([name]));
        LocalStore.cachekeys = _.uniq(LocalStore.cachekeys.concat([name]));
        localStorage.setItem("flexisync:keys", JSON.stringify(LocalStore.keys));
    };

    var keys = JSON.parse(localStorage.getItem("flexisync:keys")) || [];
    _.extend(LocalStore, {
        keys: [].concat(keys),
        cachekeys: [].concat(keys),
        cachedata: {}
    });

    _.each(LocalStore.keys, function (name) {
        var data = LocalStore._get(name);
        if (data) LocalStore.cachedata[name] = data;
    });

    return LocalStore;

})();;var MemoryStore = (function () {

    var MemoryStore = {
        data: {}
    };

    MemoryStore.get = function (name) {
        return this.data[name] ? {"data": this.data[name]} : undefined;
    };

    MemoryStore.set =  function (name, data) {
        this.data[name] = data;
    };

    return MemoryStore;

})();;var RemoteStore = (function ($) {

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
        if (!datasource) return async.reject(new Sync.Error(404, "No datasource for data '" + name + "'")).promise();

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
            var url = datasource.url;
            options = $.extend(options, {
                type: "GET",
                url: _.isFunction(url) ? url.apply(datasource, options.parameters) : url,
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
        if (!this.validateSource(datasource)) {
            if(Sync.debug) console.log("Flexisync: datasource invalid.", datasource);
            return false;
        }

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
        return (datasource && (_.isString(datasource.url) || _.isFunction(datasource.url)) && _.isArray(datasource.returnData) &&
                    datasource.returnData.length > 0 && _.isFunction(datasource.parse)) ? true : false;
    };

    RemoteStore.getSource = function (name) {
        var data = this.availabledata[name];
        return (data) ? this.datasources[data] : undefined;
    };

    return RemoteStore;

})(jQuery);;var Sync = {
    matchers: [],
    datastores: {
        memory: MemoryStore,
        localstorage: LocalStore,
        remote: RemoteStore
    },
    debug: false,
    options: {
        urlprefix: "flexisync://",
        fetchFrom: null,
        saveTo: null,
        cacheTo: null
    }
};

Sync.activate = function () {
    if (Backbone.sync === Sync.sync) return;
    Sync.nativesync = Backbone.sync;
    Backbone.sync = Sync.sync;
};

Sync.deactivate = function () {
    if (Sync.nativesync) {
        Backbone.sync = nativesync;
    }
};

Sync.sync = function (method, model, options) {
    var url, matcher, asyncRequest, nativeoptions, modeloptions;

    // Save passed options for calling nativesync with if neccessary, and extend options with defaults
    nativeoptions = options;

    if (options.from) options.fetchFrom = options.from;
    if (options.to) options.saveTo = options.to;

    model = model || {};
    modeloptions = {};
    if (model.fetchFrom) modeloptions.fetchFrom = model.fetchFrom;
    if (model.saveTo) modeloptions.saveTo = model.saveTo;
    if (model.cacheTo) modeloptions.cacheTo = model.cacheTo;

    options = _.extend({}, Sync.options, modeloptions, options);

    // Retrieve url from the model if it was not passed as an option
    url = _.isFunction(model.url) ? model.url() : model.url;
    options.url = options.url || url;

    // Try to match to url, if successful create a new request, otherwise defer to the native sync method
    matcher = Sync.RequestMatcher.matchUrl(method, options.url);
    if (matcher) {
        //if (Sync.debug) console.log("%cFlexisync: Match " + url, "color: #666");
        asyncRequest = new Sync.Request(matcher, model, options);
        asyncRequest.process();
        return asyncRequest;
    }
    else {
        return Sync.nativesync(method, model, nativeoptions);
    }
};

Sync.Error = function (status, message, raw) {
    this.status = status || 503;
    this.statusText = message || "Unspecified error.";
    if (raw) this.raw = raw;
    return this;
};

Sync.Request = function (matcher, model, options) {
    _.bindAll(this);
    _.extend(this, new $.Deferred());

    this.timing = {
        start: +new Date()
    };

    // Store parameters
    this.matcher = matcher;
    this.model = model;
    this.options = options;

    // Create store variable
    this.requests = [];

    // Get parameters from the request url
    this.params = Sync.RequestMatcher.getUrlParameters(options.url, matcher);
    this.options.parameters = _.isFunction(matcher.parameters) ? matcher.parameters.apply(matcher, this.params) : {};
    this.timing.matched = +new Date();

    return this;
};

// Returns a jQuery promise (deferred object)
// Gets the matcher's url parameters and required data, calls the matcher's parse method with this data,
// and then resolves the promise with what the parse function returns
Sync.Request.prototype.process = function () {

    // If no data is required, try to resolve immediately
    if (!_.isArray(this.matcher.requiredData) || this.matcher.requiredData.length === 0) {
        this.tryResolve();
        return this.promise();
    }

    // Else create a data request for each bit of requied data
    _.each(this.matcher.requiredData, this.addDataFetcher);

    $.when.apply($, this.requests)
        .always(this.calculateTimings)
        .done(this.tryResolve)
        .fail(this.doReject);

    return this.promise();
};

Sync.Request.prototype.addDataFetcher = function (key) {
    var req = new Sync.Data(key, this.options);
    req.progress(this.trackProgress);

    this.requests.push(req);

    req.fetch();
};

Sync.Request.prototype.calculateTimings = function () {
    //this.timing.fetchtime = asyncRequest.timing.fetched - asyncRequest.timing.start;
    //this.timing.parsetime = asyncRequest.timing.parsed - asyncRequest.timing.fetched;
    //this.timing.requesttime = asyncRequest.timing.parsed - asyncRequest.timing.start;
    this.timing.requesttime = (+new Date()) - this.timing.start;
    //model.trigger('request', model, xhr, options);
};

Sync.Request.prototype.tryResolve = function () {
    var error, data = {};

    this.timing.fetched = +new Date();

    this.sources = _.map(this.requests, function(r) { return r.key + ": " + r.source; });

    _.each(this.requests, function (r) {
        data[r.key] = r.data;
    });
    this.params.unshift(data);

    try {
        result = this.matcher.parse.apply(Sync, this.params);
        this.doResolve(result);
    }
    catch (e) {
        if (Sync.debug && e.name && e.message) console.log (e.name + ": " + e.message);
        error = (e instanceof Sync.Error) ? e : new Sync.Error(500, "Data parsing failed.", e);
        this.doReject(error);
    }
};

Sync.Request.prototype.doResolve = function (data) {
    if (Sync.debug) console.log("%cFlexisync Success (" + this.timing.requesttime + "ms): " + this.options.url, "color: green", "[" + this.sources.join(", ") + "]: ", data);
    if(this.options.success) this.options.success(data);
    this.model.trigger('sync', this.model, data, this.options);
    this.resolve(this.model, data, this.options);
    this.model.trigger('sync:done', data);
};

Sync.Request.prototype.doReject = function (error) {
    if (Sync.debug) console.log("%cFlexisync Error (" + this.timing.requesttime + "ms): " + this.options.url, "color: red", error);
    if (this.options.error) this.options.error(error);
    this.model.trigger('error', this.model, error, this.options);
    this.reject(this.model, error, this.options);
};

Sync.Request.prototype.trackProgress = function () {
    var completed = _.reduce(this.requests, function(memo, req){ return memo + req.progress.completed; }, 0);
    var total = _.reduce(this.requests, function(memo, req){ return memo + req.progress.total; }, 0);
    this.model.trigger('sync:progress', completed, total);
    this.notify(completed, total);
};

Sync.Data = {};

Sync.Data = function (key, options) {
    _.bindAll(this);
    _.extend(this, new $.Deferred());

    this.key = key;
    this.options = _.extend(_.clone(options), {success: undefined, error: undefined, parameters: options.parameters[key] || []});
    return this;
};

Sync.Data.prototype = {
    completed: 0,
    total: 0
};

Sync.Data.prototype.fetch = function () {
    var id, data, stores, source, sourcename;

    stores = this.options.fetchFrom;
    stores = (typeof stores === "string") ? [stores] : stores;

    if (!_.isArray(stores) || stores.length < 1) return this.reject(new Sync.Error(503, "No datastores configured."));

    //_.find(stores, this.fetchFrom);
    for (var i = 0; i < stores.length; i++) {
        if (this.fetchFrom(stores[i])) break;
    }

    return this.source ? this : this.reject(new Sync.Error(404, "No datastore has the requested data."));
};

Sync.Data.prototype.fetchFrom = function (sourcename) {
    var source = Sync.datastores[sourcename];
    if (!source || !source.get) return false;

    var data = source.get(this.key, this.options);
    if (!data || (data instanceof Sync.Error)) return false;

    this.source = sourcename;
    if(!source.async) {
        this.cacheData(data.data, data.cachedata);
        this.resolve(data.data);
    }
    else {
        data.progress(this.updateProgress, this.notify)
            .done(this.cacheData, this.resolve)
            .fail(this.reject);
    }
    return true;
};

Sync.Data.prototype.updateProgress = function (completed, total) {
    this.completed = completed;
    this.total = total;
};

Sync.Data.prototype.cacheData = function (data, cachedata) {
    this.data = data;
    if(!cachedata || !_.isArray(this.options.cacheTo)) return;

    _.each(this.options.cacheTo, function (cache) {
        if(cache === this.source) return;
        var store = Sync.datastores[cache];
        _.each(cachedata.keys, function (key) {
            store.set(key, cachedata.data[key]);
        });
    });
};

Sync.RequestMatcher = {};

// Registers a new RequestMatcher
// Should be in the form
/*  {
        pattern: /reg(param1)ex|go(param2)es|here/,
        requiredData: ["array", "of", "strings"],
        parse: function (data, param1, param2) {
            return requestReturnData;
        }
    }
*/
Sync.RequestMatcher.register = function (newMatcher) {
    if (_.isArray(newMatcher)) return _.each(newMatcher, Sync.RequestMatcher.register);
    if (!Sync.RequestMatcher.validate(newMatcher)) return false;

    Sync.matchers.push(newMatcher);
    return true;
};

// Checks that newMatcher is (probably) a valid RequestMatcher object
Sync.RequestMatcher.validate = function (newMatcher) {
    if (!newMatcher) return false;
    if (!newMatcher.pattern || !_.isFunction(newMatcher.pattern.exec)) return false;
    if (!_.isFunction(newMatcher.parse)) return false;
    if (newMatcher.requiredData && !_.isArray(newMatcher.requiredData)) return false;

    // Checks whether a Request Matcher with the same regex as newMatcher has already been registered
    return !_.find(Sync.matchers, function (matcher) {
        if (matcher.pattern.toString() === newMatcher.pattern.toString()) return true;
    });
};

Sync.RequestMatcher.matchUrl = function (method, url) {
    if (method !== "read" || !url || !/^flexisync:\/\//.test(url)) return false;

    url = url.replace(Sync.options.urlprefix, "");

    return _.find(Sync.matchers, function (matcher) {
        return (matcher.pattern.test(url)) ? matcher : false;
    });
};

Sync.RequestMatcher.getUrlParameters = function (url, matcher) {
    url = url.replace(Sync.options.urlprefix, "");
    var matches = matcher.pattern.exec(url);
    if (matches) matches.shift();
    return matches;
};

return Sync;;}));