var MemoryStore = (function () {

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

})();