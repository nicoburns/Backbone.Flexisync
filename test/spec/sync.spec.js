(function (Sync) {

    describe("Flexisync Backbone plugin", function() {

        var async = new AsyncSpec(this);

        it("is structured correctly", function() {
            expect(Sync).toBeDefined();
        });

        it("saves a function to 'nativesync'", function() {
            expect(Sync.nativesync).toBeDefined();
        });

        describe("sync function", function() {

            var Request, matcherSpy, requestSpy, processSpy, nativesyncSpy, options, extendedoptions;

            beforeEach(function () {
                Request = new $.Deferred(function () {
                    this.process = function () {};
                });
                requestSpy = spyOn(Sync, "Request").andReturn(Request);
                matcherSpy = spyOn(Sync.RequestMatcher, "matchUrl");
                nativesyncSpy = spyOn(Sync, "nativesync");

                spyOn(Request, "process");

                options = {};
                extendedoptions = _.extend({}, Sync.options, options, {url: "test"});
            });

            it("exists in module", function() {
                expect(Sync.sync).toBeDefined();
            });

            it("calls matchUrl function with correct 'method' and url", function () {
                matcherSpy.andReturn(true);

                Sync.sync('read', {url: "test"});
                Sync.sync('create', {}, {url: "test2"});
                Sync.sync('update', {url: "model"}, {url: "options"});

                expect(Sync.RequestMatcher.matchUrl).toHaveBeenCalledWith('read', "test");
                expect(Sync.RequestMatcher.matchUrl).toHaveBeenCalledWith('create', "test2");
                expect(Sync.RequestMatcher.matchUrl).toHaveBeenCalledWith('update', "options");
                expect(Sync.RequestMatcher.matchUrl).not.toHaveBeenCalledWith('update', "model");
            });

            it("defers to nativesync if the url/method isn't matched", function () {
                var expectedr = {};
                matcherSpy.andReturn(false);
                nativesyncSpy.andReturn(expectedr);

                var r = Sync.sync('read', {url: "test"}, {test: "frog"});

                expect(Sync.Request).not.toHaveBeenCalled();
                expect(Sync.nativesync).toHaveBeenCalledWith('read', {url: "test"}, {test: "frog"});
                expect(r).toBe(expectedr);
            });

            it("creates and returns a new Flexisync.Request if the url/method is matched", function () {
                var model = {url: "test"};
                matcherSpy.andReturn("hello");

                var r = Sync.sync('read', model, options);

                expect(Sync.nativesync).not.toHaveBeenCalled();
                expect(Sync.Request).toHaveBeenCalledWith("hello", model, jasmine.any(Object));
                expect(Sync.Request.calls[0].args[2]).toDeepEqual(extendedoptions);
                expect(r).toBe(Request);
            });

            it("calls process on the request", function () {
                matcherSpy.andReturn("hello");

                Sync.sync('read', {url: "test"}, options);

                expect(Request.process).toHaveBeenCalled();//.exactly(2).times();
            });

            xit("calls success callback if request is successful", function () {
                matcherSpy.andReturn("hello");
                processSpy.andReturn($.Deferred().resolve("Success Data"));

                var options = {
                    success: function () {},
                    error: function () {}
                };
                spyOn(options, "success");
                spyOn(options, "error");

                var model = {
                    url: "test",
                    trigger: function () {}
                };
                spyOn(model, "trigger");

                Sync.sync('read', model, options);

                expect(options.success).toHaveBeenCalledWith("Success Data");
                expect(model.trigger).toHaveBeenCalledWith("sync", model, "Success Data", options);
                expect(options.error).not.toHaveBeenCalled();
            });

            xit("calls error callback if request is successful", function () {
                // Doesn't actually do this yet!
                matcherSpy.andReturn("hello");
                processSpy.andReturn($.Deferred().reject("Error Data"));

                var options = {
                    success: function () {},
                    error: function () {}
                };
                spyOn(options, "success");
                spyOn(options, "error");

                var model = {
                    url: "test",
                    trigger: function () {}
                };
                spyOn(model, "trigger");

                Sync.sync('read', model, options);

                expect(options.error).toHaveBeenCalledWith("Error Data");
                expect(model.trigger).toHaveBeenCalledWith("error", model, "Error Data", options);
                expect(options.success).not.toHaveBeenCalled();
            });

        });

        describe("Error object", function() {
            var error, rawerr;

            it("exists in module", function() {
                expect(Sync.Error).toBeDefined();
            });

            describe("constructor", function () {

                beforeEach(function () {
                    rawerr = {};
                    error = new Sync.Error(404, "Hello, an error :/", rawerr);
                });

                it("returns an instance of Sync.Error", function () {
                    expect(error).toBeInstanceOf(Sync.Error);
                });

                it("stores creation parameters", function () {
                    expect(error.status).toBe(404);
                    expect(error.statusText).toBe("Hello, an error :/");
                    expect(error.raw).toBe(rawerr);
                });

                it("has default parameters", function () {
                    expect(error.status).toBe(404);
                    expect(error.statusText).toBe("Hello, an error :/");
                    expect(error.raw).toBe(rawerr);
                });
            });
        });

        describe("Request object", function() {

            var request, matcher, model, paramSpy, parseSpy, options;

            beforeEach(function () {
                matcher = {
                    pattern: /^crazymaze$/,
                    requiredData: ["a", "b", "frogs", "people"],
                    parse: function () {}
                };
                model = new Backbone.Model();
                options = {
                    url: "flexisync://test"
                };
            });

            it("exists in module", function() {
                expect(Sync.Request).toBeDefined();
            });

            describe("constructor", function () {

                beforeEach(function () {
                    paramSpy = spyOn(Sync.RequestMatcher, "getUrlParameters").andReturn(["a", "b"]);
                    spyOn(_, "bindAll").andCallThrough();
                    spyOn(_, "extend").andCallThrough();
                    spyOn($, "Deferred").andCallThrough();

                    request = new Sync.Request(matcher, model, options);
                });

                it("returns an instance of Sync.Request", function () {
                    expect(request).toBeInstanceOf(Sync.Request);
                });

                it("calls bindAll with itself", function () {
                    expect(_.bindAll.callCount).toBe(1);
                    expect(_.bindAll.calls[0].args[0]).toBe(request);
                });

                it("mixes in jquery Deferred methods", function () {
                    _.each(["done", "fail", "progress", "then"], function (func) {
                        expect(request[func]).toBeFunction();
                    });
                });

                it("stores creation parameters", function () {
                    expect(request.matcher).toBe(matcher);
                    expect(request.model).toBe(model);
                    expect(request.options).toBe(options);
                });

                it("creates and stores an emtpy requests array", function () {
                    expect(request.requests).toDeepEqual([]);
                });

                it("calls getUrlParameters function with correct matcher and url, and stores the result", function () {
                    expect(Sync.RequestMatcher.getUrlParameters).toHaveBeenCalledWith("flexisync://test", matcher);
                    expect(request.params).toDeepEqual(["a", "b"]);
                });

            });

            describe("process method", function () {

                var loader;

                beforeEach(function() {
                    /*dataObj = {
                        progress: function () {},
                        fetch: function () {}
                    };
                    dataSpy = spyOn(Sync, "Data").andReturn(dataObj);*/
                    loader = $.Deferred();

                    request = new Sync.Request(matcher, model, options);

                    spyOn(request, "tryResolve");
                    spyOn(request, "addDataFetcher");
                    spyOn($, "when").andReturn(loader);
                    spyOn(loader, "always").andReturn(loader);
                    spyOn(loader, "done").andReturn(loader);
                    spyOn(loader, "fail").andReturn(loader);

                    request.process();
                });

                it("returns the Requests promise object", function () {
                    expect(request.process()).toBe(request.promise());
                });

                it("trys to resolve immediately if no data is required", function () {
                    delete matcher.requiredData;
                    request = new Sync.Request(matcher, model, options);

                    spyOn(request, "tryResolve");
                    spyOn(request, "addDataFetcher");

                    request.process();

                    expect(request.tryResolve.callCount).toBe(1);
                    expect(request.addDataFetcher).not.toHaveBeenCalled();
                });

                it("calls addDataFetcher with the name of each piece of required data", function () {
                    expect(request.addDataFetcher.callCount).toBe(4);
                    expect(request.addDataFetcher.calls[0].args[0]).toBe("a");
                    expect(request.addDataFetcher.calls[1].args[0]).toBe("b");
                    expect(request.addDataFetcher.calls[2].args[0]).toBe("frogs");
                    expect(request.addDataFetcher.calls[3].args[0]).toBe("people");
                });

                it("Applies $.when with the requests array", function () {
                    request.requests = ["a", "b", "c"];
                    request.process();
                    expect($.when).toHaveBeenCalledWith("a", "b", "c");
                });

                it("binds calculateTimings to the deferred's always", function () {
                    expect(loader.always.callCount).toBe(1);
                    expect(loader.always).toHaveBeenCalledWith(request.calculateTimings);
                });

                it("binds tryResolve to the deferred's done", function () {
                    expect(loader.done.callCount).toBe(1);
                    expect(loader.done).toHaveBeenCalledWith(request.tryResolve);
                });

                it("binds doReject to the deferred's fail", function () {
                    expect(loader.fail.callCount).toBe(1);
                    expect(loader.fail).toHaveBeenCalledWith(request.doReject);
                });


                /*async.it("calls parse function and resolves if all required data is fetched", function (done) {
                    paramSpy.andReturn(["a", "b"]);
                    dataSpy.andCallFake(function (name) {
                        return $.Deferred().resolve(name + "data");
                    });

                    var matcher = {
                        pattern: /^productlines$/,
                        requiredData: ["one", "two"],
                        parse: function (data, param1, param2) {
                            return {
                                "data": data,
                                "wasCalled": true,
                                "param1": param1,
                                "param2": param2
                            };
                        }
                    };
                    spyOn(matcher, "parse").andCallThrough();

                    Sync.Request.process("flexisync://test", matcher).done(function (result) {
                        expect(matcher.parse).toHaveBeenCalled();
                        expect(result).toBeDefined();
                        expect(result.wasCalled).toBe(true);
                        expect(result.param1).toBe("a");
                        expect(result.param2).toBe("b");
                        expect(result.data.one).toBe("onedata");
                        expect(result.data.two).toBe("twodata");
                        done();
                    }).fail(function () {
                        expect("fail").toBe("done");
                        done();
                    });

                });

                async.it("rejects deferred if any data is not successfully fetched", function (done) {
                    paramSpy.andReturn(["a", "b"]);
                    dataSpy.andReturn($.Deferred().reject());

                    var matcher = {
                        pattern: /^productlines$/,
                        requiredData: ["one", "two"],
                        parse: function () {}
                    };
                    spyOn(matcher, "parse");

                    Sync.Request.process("flexisync://test", matcher).done(function () {
                        expect("done").toBe("fail");
                        done();
                    }).fail(function () {
                        expect(matcher.parse).not.toHaveBeenCalled();
                        done();
                    }).then(function () {

                    });
                });*/
            });

            describe("addDataFetcher method", function () {

                var request, matcher, model, options, dataObj;

                beforeEach(function () {
                    dataObj = {
                        progress: function () {},
                        fetch: function () {}
                    };

                    matcher = {
                        pattern: /^crazymaze$/,
                        requiredData: ["a", "b", "frogs", "people"],
                        parse: function () {}
                    };
                    model = new Backbone.Model();
                    options = {
                        url: "flexisync://test"
                    };

                    request = new Sync.Request(matcher, model, options);

                    spyOn(Sync, "Data").andReturn(dataObj);
                    spyOn(dataObj, "progress").andReturn(dataObj);
                    spyOn(dataObj, "fetch").andReturn(dataObj);

                    request.addDataFetcher("frogs");
                });

                it("creates a new Flexisync.Data object for each piece of required data", function () {
                    expect(Sync.Data.callCount).toBe(1);
                    expect(Sync.Data).toHaveBeenCalledWith("frogs", request.options);
                });

                it("binds trackProgress to the data fetcher's progress", function () {
                    expect(dataObj.progress.callCount).toBe(1);
                    expect(dataObj.progress).toHaveBeenCalledWith(request.trackProgress);
                });

                it("adds the data fetcher to the requests array", function () {
                    expect(request.requests.length).toBe(1);
                    expect(request.requests[0]).toBe(dataObj);
                });

                it("calls the data fetcher's fetch method", function () {
                    expect(dataObj.fetch.callCount).toBe(1);
                });
            });

            describe("calculateTimings method", function () {
                it("NEEDS TESTS TO BE WRITTEN", function () {});
            });

            describe("tryResolve method", function () {
                it("NEEDS TESTS TO BE WRITTEN", function () {});
            });

            describe("doResolve method", function () {
                it("NEEDS TESTS TO BE WRITTEN", function () {});
            });

            describe("doReject method", function () {
                it("NEEDS TESTS TO BE WRITTEN", function () {});
            });

            describe("trackProgress method", function () {
                it("NEEDS TESTS TO BE WRITTEN", function () {});
            });

        });


        describe("Data object", function () {

            var data, options;

            beforeEach(function () {
                Sync.data = {
                    "hi": { source: "Helooo" }
                };
                Sync.allowLocalStorage = true;
            });

            it("exists in module", function() {
                expect(Sync.Data).toBeDefined();
            });

            it("prototype has 'completed' and 'total' properties", function() {
                expect(Sync.Data.prototype.completed).toBe(0);
                expect(Sync.Data.prototype.total).toBe(0);
            });

            describe("constructor", function () {

                beforeEach(function () {
                    paramSpy = spyOn(Sync.RequestMatcher, "getUrlParameters").andReturn(["a", "b"]);
                    spyOn(_, "bindAll").andCallThrough();
                    spyOn(_, "extend").andCallThrough();
                    spyOn($, "Deferred").andCallThrough();

                    options = {
                        fred: "hello",
                        success: "flob",
                        error: "ribbit"
                    };
                    data = new Sync.Data("frogs", options);
                });

                it("returns an instance of Sync.Data", function () {
                    expect(data).toBeInstanceOf(Sync.Data);
                });

                it("calls bindAll with itself", function () {
                    expect(_.bindAll.callCount).toBe(1);
                    expect(_.bindAll.calls[0].args[0]).toBe(data);
                });

                it("mixes in jquery Deferred methods", function () {
                    _.each(["done", "fail", "progress", "then"], function (func) {
                        expect(data[func]).toBeFunction();
                    });
                });

                it("stores 'key' parameter", function () {
                    expect(data.key).toBe("frogs");
                });

                it("stores 'options' parameter without 'success' or 'error'", function () {
                    expect(data.options).toDeepEqual({fred: "hello", success: undefined, error: undefined});
                });
            });

            describe("fetch method", function () {
                it("NEEDS TESTS TO BE WRITTEN", function () {});
            });

            describe("fetchFrom method", function () {
                it("NEEDS TESTS TO BE WRITTEN", function () {});
            });

            describe("updateProgress method", function () {
                it("NEEDS TESTS TO BE WRITTEN", function () {});
            });

            describe("cacheData method", function () {
                it("NEEDS TESTS TO BE WRITTEN", function () {});
            });

            xdescribe("set", function () {
                it("calls memory datastore set function", function () {
                    spyOn(Sync.datastores.memory, "set");

                    Sync.Data.set("test", "frog");

                    expect(Sync.datastores.memory.set).toHaveBeenCalledWith("test", "frog");

                });

                it("calls vault datastore set function", function () {
                    spyOn(Sync.datastores.vault, "set");

                    Sync.Data.set("test", "frog");

                    expect(Sync.datastores.vault.set).toHaveBeenCalledWith("test", "frog");
                });
            });

            xdescribe("get", function () {

                var options;

                beforeEach(function () {
                    //spyOn(Sync.data, '')
                    options = {};
                });

                async.it("If in-memory, resolve with in-memory data", function (done) {
                    spyOn(Sync.datastores.memory, "get").andReturn("hello hello");

                    Sync.Data.get("test", options).done(function(data) {
                        expect(Sync.datastores.memory.get).toHaveBeenCalledWith("test", options);
                        expect(data).toBe("hello hello");
                        done();
                    }).fail(function () {
                        expect(false).toBe(true);
                        done();
                    });
                });

                /*async.it("If not in-memory but in localStorage, resolve with localStorage data", function (done) {
                    spyOn(Sync.datastores.memory, "get").andReturn(undefined);
                    spyOn(Sync.datastores.localstorage, "get").andReturn("hello2");

                    Sync.Data.get("test").done(function(data) {
                        expect(Sync.datastores.memory.get).toHaveBeenCalledWith("test");
                        expect(Sync.datastores.localstorage.get).toHaveBeenCalledWith("test");
                        expect(data).toBe("hello2");
                        done();
                    }).fail(function () {
                        expect(false).toBe(true);
                        done();
                    });
                });*/

                async.it("If not in-memory but in data store, resolve with data store data", function (done) {
                    spyOn(Sync.datastores.memory, "get").andReturn(undefined);
                    spyOn(Sync.datastores.vault, "get").andReturn("hello2");

                    Sync.Data.get("test", options).done(function(data) {
                        expect(Sync.datastores.memory.get).toHaveBeenCalledWith("test", options);
                        expect(Sync.datastores.vault.get).toHaveBeenCalledWith("test", options);
                        expect(data).toBe("hello2");
                        done();
                    }).fail(function () {
                        expect(false).toBe(true);
                        done();
                    });
                });

                async.it("If not in-memory or localStorage, defer to getRemote method", function (done) {
                    spyOn(Sync.datastores.memory, "get").andReturn(undefined);
                    spyOn(Sync.datastores.vault, "get").andReturn(undefined);
                    spyOn(Sync.datastores.remote, "get").andCallFake(function (name) {
                        return $.Deferred().resolve("hello3");
                    });

                    Sync.Data.get("test", options).done(function(data) {
                        expect(Sync.datastores.memory.get).toHaveBeenCalledWith("test", options);
                        expect(Sync.datastores.vault.get).toHaveBeenCalledWith("test", options);
                        expect(Sync.datastores.remote.get).toHaveBeenCalledWith("test", options);
                        expect(data).toBe("hello3");
                        done();
                    }).fail(function () {
                        expect(false).toBe(true);
                        done();
                    });
                });
            });

        });

        describe("RequestMatcher object:", function() {

            it("exists in module", function() {
                expect(Sync.RequestMatcher).toBeDefined();
            });

            describe("validation checks that request matcher", function () {

                var baseMatcher = {
                    pattern: /^test/,
                    parse: function () {}
                };

                it("function exists", function() {
                    expect(Sync.RequestMatcher.validate).toBeDefined();
                });

                it("must be defined", function() {
                    expect(Sync.RequestMatcher.validate()).toBe(false);
                });

                it("must have a regex as the pattern property", function() {
                    var matcher = {
                        pattern: "gregreg",
                        requiredData: ["hello", "test"],
                        parse: function () {}
                    };
                    expect(Sync.RequestMatcher.validate(baseMatcher)).toBe(true);
                    expect(Sync.RequestMatcher.validate(matcher)).toBe(false);
                });

                it("must have a function as the parse property", function() {
                    var matcher = {
                        pattern: /^test/
                    };
                    var matcher2 = {
                        pattern: /^test/,
                        parse: "riojreg"
                    };
                    expect(Sync.RequestMatcher.validate(baseMatcher)).toBe(true);
                    expect(Sync.RequestMatcher.validate(matcher)).toBe(false);
                    expect(Sync.RequestMatcher.validate(matcher2)).toBe(false);
                });

                it("can have a requiredData array", function() {
                    var matcher = {
                        pattern: /^test/,
                        requiredData: ["hello", "test"],
                        parse: function () {}
                    };
                    expect(Sync.RequestMatcher.validate(matcher)).toBe(true);
                });

                it("can have no requiredData", function() {
                    var matcher = {
                        pattern: /^test/,
                        parse: function () {}
                    };
                    expect(Sync.RequestMatcher.validate(matcher)).toBe(true);
                });

                it("cannot have requiredData in any other format", function() {
                    var matcher = {
                        pattern: /^test/,
                        requiredData: "hello",
                        parse: function () {}
                    };
                    expect(Sync.RequestMatcher.validate(matcher)).toBe(false);
                });

                it("cannot have the same regex as an already registered matcher", function() {
                    var m1, m2, m3, m4;
                    m1 = {pattern: /^test/, parse: function () {}};
                    m2 = {pattern: /^te2314st/, parse: function () {}};
                    m3 = {pattern: /^tertbtr4t/, parse: function () {}};
                    m4 = {pattern: /^tefgtbtybst/, parse: function () {}};

                    Sync.matchers = [m1, m3];

                    expect(Sync.RequestMatcher.validate(m1)).toBe(false);
                    expect(Sync.RequestMatcher.validate(m2)).toBe(true);
                    expect(Sync.RequestMatcher.validate(m3)).toBe(false);
                    expect(Sync.RequestMatcher.validate(m4)).toBe(true);
                });
            });

            describe("register function", function () {
                it("adds matcher to Sync.matchers array", function() {
                    var matcher = {
                        pattern: /^test/,
                        parse: function () {}
                    };

                    Sync.matchers = [];
                    Sync.RequestMatcher.register(matcher);

                    expect(Sync.matchers.length).toBe(1);
                    expect(Sync.matchers[0]).toBe(matcher);
                });
            });

            describe("url matcher", function () {

                var url,
                    urlPrefix = "flexisync://",
                    m1 = {pattern: /^test/, parse: function () {}},
                    m2 = {pattern: /^te2314st/, parse: function () {}},
                    m3 = {pattern: /^tertbtr4t/, parse: function () {}},
                    m4 = {pattern: /^tefgtbtybst/, parse: function () {}};

                beforeEach(function () {
                    url = urlPrefix + "test";
                    Sync.matchers = [m1, m3];
                });

                it("matches only 'read' requests", function() {
                    expect(Sync.RequestMatcher.matchUrl('read', url)).toBeTruthy();
                    expect(Sync.RequestMatcher.matchUrl('create', url)).toBe(false);
                    expect(Sync.RequestMatcher.matchUrl('update', url)).toBe(false);
                    expect(Sync.RequestMatcher.matchUrl('delete', url)).toBe(false);
                });

                it("matches only URL's that start with '" + urlPrefix + "'", function() {
                    expect(Sync.RequestMatcher.matchUrl('read', url)).toBeTruthy();
                    expect(Sync.RequestMatcher.matchUrl('read', "/assets/test")).toBe(false);
                    expect(Sync.RequestMatcher.matchUrl('read', "http://google.com/")).toBe(false);
                    expect(Sync.RequestMatcher.matchUrl('read', "z" + url)).toBe(false);
                });

                it("returns matcher object when (and only when) it matches", function() {
                    expect(Sync.RequestMatcher.matchUrl('read', urlPrefix + "test")).toBe(m1);
                    expect(Sync.RequestMatcher.matchUrl('read', urlPrefix + "te2314st")).not.toBe(m2);
                    expect(Sync.RequestMatcher.matchUrl('read', urlPrefix + "tertbtr4t")).toBe(m3);
                    expect(Sync.RequestMatcher.matchUrl('read', urlPrefix + "tefgtbtybst")).not.toBe(m4);
                });
            });

            describe("parameter fetcher", function () {

                var urlPrefix = "flexisync://",
                    m1 = {pattern: /^t(es)t/, parse: function () {}},
                    m2 = {pattern: /^te(rt)bt(r4)t/, parse: function () {}};

                it("returns correct parameters", function() {
                    expect(Sync.RequestMatcher.getUrlParameters("test", m1)).toContain("es");
                    expect(Sync.RequestMatcher.getUrlParameters("tertbtr4t", m2)).toContain("rt");
                    expect(Sync.RequestMatcher.getUrlParameters("tertbtr4t", m2)).toContain("r4");
                });

                it("ignores '" + urlPrefix + "' prefix", function() {
                    expect(Sync.RequestMatcher.getUrlParameters(urlPrefix + "test", m1)).toContain("es");
                    expect(Sync.RequestMatcher.getUrlParameters(urlPrefix + "tertbtr4t", m2)).toContain("rt");
                    expect(Sync.RequestMatcher.getUrlParameters(urlPrefix + "tertbtr4t", m2)).toContain("r4");
                });
            });
        });

    });

})(Backbone.Flexisync);
