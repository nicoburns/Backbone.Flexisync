(function($, Sync) {

    var M = Sync.datastores.remote;

    describe("remote:", function() {

        var async = new AsyncSpec(this);

        it("object is defined", function() {
            expect(M).toBeDefined();
        });

        it("has default properties", function() {
            expect(M.async).toBe(true);
            expect(M.availabledata).toBeDefined();
            expect(M.datasources).toBeDefined();
            expect(M.datasourcecount).toBeDefined();
        });

        describe("createRequest method", function () {

            var deferred, datasource;

            beforeEach(function () {
                deferred = $.Deferred();

                datasource = {
                    url: "h41225.www4.hp.com/topValue/api/categories",
                    returnData: ["one", "two"],
                    parse: function (data) {
                        return {
                            "one": data.test,
                            "two": data.test2
                        };
                    }
                };

                Sync.data = {};

            });

            afterEach (function () {
                deferred = null;
            });

            it("returns datasource.remoterequest if it exists", function () {
                datasource.remoterequest = {hello: true};
                spyOn($, "ajax").andCallFake(function () {
                    return $.Deferred().reject();
                });

                var req = M.createRequest(datasource, {});

                expect($.ajax).not.toHaveBeenCalled();
                expect(req).toBe(datasource.remoterequest);
            });

            it("else calls $.ajax with passed options + datasource's url", function () {
                spyOn($, "ajax").andReturn($.Deferred());

                M.createRequest(datasource, {"hello": "frog"});

                expect($.ajax.callCount).toBe(1);
                expect(typeof $.ajax.calls[0].args[0]).toBe("object");
                expect($.ajax.calls[0].args[0].url).toBe(datasource.url);
                expect($.ajax.calls[0].args[0].type).toBe("GET");
                expect($.ajax.calls[0].args[0].dataType).toBe("json");
                expect($.ajax.calls[0].args[0].hello).toBe("frog");
            });

            /*async.it("calls parse function and sets data if ajax request succeeds", function (done) {
                spyOn($, "ajax").andCallFake(function () {
                    return $.Deferred().resolve({
                        test: "frog",
                        test2: "hello"
                    });
                });

                spyOn(datasource, "parse").andCallThrough();

                spyOn(Sync.Data, "set").andCallThrough();

                M.createRequest(datasource).done(function(data) {
                    expect(datasource.parse).toHaveBeenCalledWith({
                        test: "frog",
                        test2: "hello"
                    });

                    expect(Sync.Data.set).toHaveBeenCalledWith("one", "frog");
                    expect(Sync.Data.set).toHaveBeenCalledWith("two", "hello");
                    expect(Sync.Data.set.callCount).toBe(2);
                    done();
                }).fail(function () {
                    expect("fail").toBe("done");
                    done();
                });
            });*/
        });

        describe("get method", function () {

            var request, datasource, sourcespy, progressxhr, xhrspy, requestspy, fakeasync;

            beforeEach(function () {
                request = $.Deferred();
                fakeasync = $.Deferred();

                datasource = {
                    url: "h41225.www4.hp.com/topValue/api/categories",
                    returnData: ["one", "two"],
                    parse: function (data) {
                        return {
                            "one": data.test,
                            "two": data.test2
                        };
                    }
                };

                sourcespy = spyOn(M, "getSource").andReturn(datasource);

                progressxhr = {};
                xhrspy = spyOn(M, "createProgressXhr").andReturn(progressxhr);

                requestspy = spyOn(M, "createRequest").andReturn(request);

                /*Sync.data = {
                    test: {}
                };*/

            });

            async.it("tries to get datasource, rejects deferred if no datasource", function (done) {
                sourcespy.andReturn(undefined);

                M.get("test").done(function(data) {
                    expect("done").toBe("fail");
                    done();
                }).fail(function () {
                    expect(M.getSource).toHaveBeenCalledWith("test");
                    done();
                });
            });

            it("else calls createProgressXhr", function () {
                spyOn($, "ajax").andCallFake(function () {
                    return $.Deferred().reject();
                });

                M.get("test");

                expect(M.createProgressXhr.callCount).toBe(1);
            });

            it("calls createRequest with datasource + xhr as option", function () {
                M.get("test");

                expect(M.createRequest.callCount).toBe(1);
                expect(M.createRequest.calls[0].args[0]).toBe(datasource);
                expect(typeof M.createRequest.calls[0].args[1]).toBe("object");
                expect(M.createRequest.calls[0].args[1].xhr).toBe(progressxhr);
            });

            it("returns request promise object", function () {
                var promise = {};
                spyOn($, "Deferred").andReturn(fakeasync);
                spyOn(fakeasync, "promise").andReturn(promise);

                var g = M.get("test");

                expect(g).toBe(promise);
            });

            it("sets datasource.remoterequest to the returned xhr object", function () {
                M.get("test");

                expect(M.createRequest.callCount).toBe(1);
                expect(M.createRequest.calls[0].args[0]).toBe(datasource);
                expect(typeof M.createRequest.calls[0].args[1]).toBe("object");
                expect(M.createRequest.calls[0].args[1].xhr).toBe(progressxhr);
            });

            it("rejects deferred if request fails", function () {
                spyOn($, "Deferred").andReturn(fakeasync);
                spyOn(fakeasync, "reject");

                M.get("test");

                request.reject(null, null, "hello");

                expect(fakeasync.reject.callCount).toBe(1);
                expect(fakeasync.reject.calls[0].args[0]).toBe("hello");
            });

            it("rejects deferred if request succeeds but no data has been cached", function () {
                spyOn($, "Deferred").andReturn(fakeasync);
                spyOn(fakeasync, "reject");

                M.get("test");
                request.resolve();

                expect(fakeasync.reject.callCount).toBe(1);
                expect(fakeasync.reject.calls[0].args[0]).toBeInstanceOf(Sync.Error);
            });

            it("resolves deferred if request succeeds and data exists", function () {
                spyOn($, "Deferred").andReturn(fakeasync);
                spyOn(fakeasync, "resolve");

                var rdata = {
                    data: {
                        test: "hello"
                    }
                };

                var cachedata = {
                    keys: ["one", "two"],
                    data: {
                        test: "hello"
                    }
                };

                M.get("test");
                request.resolve(null, null, rdata);

                expect(fakeasync.resolve.callCount).toBe(1);
                expect(fakeasync.resolve.calls[0].args[0]).toBe("hello");
                expect(fakeasync.resolve.calls[0].args[1]).toDeepEqual(cachedata);
            });

            it("sets datasource.remoterequest to undefined if request succeeds", function () {

                M.get("test");
                expect(datasource.remoterequest).toBe(request);

                request.resolve();
                expect(datasource.remoterequest).toBe(undefined);
            });

            it("sets datasource.remoterequest to undefined if request fails", function () {

                M.get("test");
                expect(datasource.remoterequest).toBe(request);

                request.reject();
                expect(datasource.remoterequest).toBe(undefined);
            });

        });

        describe("set method", function () {
            it("exists in module", function () {
                expect(M.set).toBeDefined();
            });
        });

        describe("createRequest method", function () {
            it("NEEDS TESTS TO BE WRITTEN", function () {});
        });

        describe("processRequest method", function () {
            it("NEEDS TESTS TO BE WRITTEN", function () {});
        });

        describe("createProgressXhr method", function () {
            it("NEEDS TESTS TO BE WRITTEN", function () {});
        });

        describe("validateSource method", function () {

            var onedata = {name: "one", data: "hello"},
                twodata = {name: "two", data: "frog"},
                baseSource = {
                    url: "http://test.com/categories",
                    returnData: ["one", "two"],
                    parse: function () { return [onedata, twodata]; }
                };

            it("function exists", function() {
                expect(M.validateSource).toBeDefined();
            });

            it("must be defined", function() {
                expect(M.validateSource()).toBe(false);
            });

            it("must have a string as the url property", function() {
                var source = {
                    url: function() {},
                    returnData: ["one", "two"],
                    parse: function () { return [onedata, twodata]; }
                };
                expect(M.validateSource(baseSource)).toBe(true);
                expect(M.validateSource(source)).toBe(false);
            });

            it("must have a non-empty array as the returnData property", function() {
                var source1 = {
                    url: "http://test.com/categories",
                    returnData: "hi",
                    parse: function () { return [onedata, twodata]; }
                };
                var source2 = {
                    url: "http://test.com/categories",
                    returnData: [],
                    parse: function () { return [onedata, twodata]; }
                };
                expect(M.validateSource(baseSource)).toBe(true);
                expect(M.validateSource(source1)).toBe(false);
                expect(M.validateSource(source2)).toBe(false);
            });

            it("must have a function as the parse property", function() {
                var source1 = {
                    url: "http://test.com/categories",
                    returnData: ["one", "two"]
                };
                var source2 = {
                    url: "http://test.com/categories",
                    returnData: ["one", "two"],
                    parse: "ewfewfewf"
                };
                expect(M.validateSource(baseSource)).toBe(true);
                expect(M.validateSource(source1)).toBe(false);
                expect(M.validateSource(source2)).toBe(false);
            });
        });

        describe("addSource method", function () {
            var parsefunc = function () {},
                source = {
                    url: "http://test.com/categories",
                    returnData: ["one", "two"],
                    parse: parsefunc
                };

            beforeEach(function () {
                M.datasources = {};
                M.datasourcecount = 0;
                M.data = {};
            });

            it("adds data source to dataSources array", function() {
                M.addSource(source);
                expect(M.datasources[1].url).toBe("http://test.com/categories");
                expect(M.datasources[1].parse).toBe(parsefunc);
            });

            it("adds data objects to avaialabledata array", function() {
                M.addSource(source);

                expect(M.availabledata["one"]).toBe(1);
                expect(M.availabledata["two"]).toBe(1);
            });
        });

        describe("getSource method", function () {

            beforeEach(function () {
                M.datasources = {
                    "1": "hello",
                    "2": "frog"
                };
                M.datasourcecount = 0;
                M.availabledata = {
                    "one": "1",
                    "three": 2,
                    "four": "hi"
                };
            });

            it("returns undefined if data doesn't exist or has no source", function() {
                expect(M.getSource("zero")).toBe(undefined);
                expect(M.getSource("four")).toBe(undefined);
            });

            it("returns the dataSource if data does exists", function() {
                expect(M.getSource("one")).toBe("hello");
                expect(M.getSource("two")).toBe(undefined);
                expect(M.getSource("three")).toBe("frog");
            });
        });
    });

})(jQuery, Backbone.Flexisync);