var LocalStore = (function () {
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

})();