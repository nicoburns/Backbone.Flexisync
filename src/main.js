var Sync = {
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
    this.options = _.extend(_.clone(options), {success: undefined, error: undefined});
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

return Sync;