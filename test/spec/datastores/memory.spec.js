(function(Sync) {

    var M = Sync.datastores.memory;

    describe("In memory:", function() {

        it ("has a data storage object", function () {
            expect(typeof M.data).toBe("object");
        });

        describe("get", function () {
            beforeEach(function () {
                M.data = {
                    "data-test": "data-frog"
                };
            });

            it("retrieves data from M.data", function() {
                expect(M.get("data-test")).toBe("data-frog");
            });

            it("returns undefined if no data", function() {
                expect(M.get("dthwrbhu5yhy")).toBe(undefined);
            });
        });

        describe("set", function () {
            it("stores data in memory (on M.data)", function() {
                M.set("test", "frog");
                expect(M.data["test"]).toBe("frog");
            });

            it("updates existing data in memory (on M.data)", function() {
                M.data["hi"] = "sad times";
                M.set("hi", "happy days");
                expect(M.data["hi"]).toBe("happy days");
            });
        });

    });

})(Backbone.Flexisync);