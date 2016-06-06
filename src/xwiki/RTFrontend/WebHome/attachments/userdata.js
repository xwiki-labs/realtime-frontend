define(['RTFrontend_realtime_input',
        'RTFrontend_text_patcher',
        'json.sortify'], function(realtimeInput, TextPatcher, JSONSortify) {

    var stringify = function (obj) {
        return JSONSortify(obj);
    };

    var warn = function (x) {};
    var debug = function (x) {};
    debug = function (x) { console.log(x); };
    warn = function (x) { console.log(x); };

    var module = {};

    var start = module.start = function(network, key, config) {

        var initializing = true;
        var userData = {};
        var myId = config.myId;
        var userName = config.userName;
        var toolbarChange = config.toolbarChange;
        if (!myId || !userName) { warn("myId and userName are required!"); return; }

        userData[myId] = {
            name : userName
        };

        var config = {
            initialState : '{}',
            network : network,
            userName : userName || '',
            channel : key,
            crypto : config.crypto || null,
            transformFunction : config.transformFunction,
        };

        var updateUserData = function (textData) {
            try {
                var json = JSON.parse(textData);
                for (var key in json) {
                    userData[key] = json[key];
                }
                if (toolbarChange && typeof toolbarChange === "function") { toolbarChange(userData); }
            } catch (e) {
                console.error(e);
            }
        };
        var onRemote = config.onRemote = function (info) {
            if (initializing) { return; }

            var userDoc = module.realtime.getUserDoc();

            updateUserData(userDoc);
        };
        var onReady = config.onReady =  function(info) {
            var realtime = module.realtime = info.realtime;
            module.leaveChannel = info.leave;
            module.patchText = TextPatcher.create({
                realtime : realtime,
                logging : false
            });

            var userDoc = realtime.getUserDoc();
            updateUserData(userDoc);
            initializing = false;

            onLocal();
        };
        var onLocal = config.onLocal = function() {
            if (initializing) { return; }

            var shjson = stringify(userData);
            module.patchText(shjson);
            if (module.realtime.getUserDoc() !== shjson) {
                warn("userDoc !== shjson");
            }
        };

        realtimeInput.start(config);
    };

    return module;
});
