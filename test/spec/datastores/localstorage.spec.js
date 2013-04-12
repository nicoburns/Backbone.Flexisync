(function(Sync) {

    var M = Sync.datastores.localstorage;

    var mock = (function() {
        var store = {};
        return {
            getItem: function(key) {
                return store[key];
            },
            setItem: function(key, value) {
                store[key] = value.toString();
            },
            clear: function() {
                store = {};
            }
        };
    })();
    Object.defineProperty(window, 'localStorage', { value: mock });

    describe("Local storage:", function() {

        beforeEach(function () {
            localStorage.clear();
        });

        afterEach (function () {
            localStorage.clear();
        });

        describe("get", function () {

            beforeEach(function () {
                localStorage.setItem("flexisync:data:data-test", 'data-frog');
            });

            it("retrieves data from Localstorage", function() {
                expect(M.get("data-test")).toBe("data-frog");
            });

            it("returns undefined if no data", function() {
                expect(M.get("dthwrbhu5yhy")).toBe(undefined);
            });
        });

        describe("set", function () {

            it("stores data in localstorage", function() {
                spyOn(localStorage, "setItem").andCallThrough();

                M.set("test", "frog");
                expect(localStorage.setItem).toHaveBeenCalledWith("flexisync:data:test", 'frog');
                expect(localStorage.getItem("flexisync:data:test")).toBe('frog');
            });
        });

    });

})(Backbone.Flexisync);