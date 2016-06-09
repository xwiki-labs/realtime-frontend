define(['RTFrontend_realtime_input',
        'RTFrontend_text_patcher',
        'json.sortify'], function(realtimeInput, TextPatcher, JSONSortify) {

    var stringify = function (obj) {
        return JSONSortify(obj);
    };

    var warn = function (x) {};
    var debug = function (x) {};
    debug = function (x) { console.log(x); };
    //warn = function (x) { console.log(x); };

    var module = {};

    var start = module.start = function(network, key, configData) {

        var initializing = true;
        var userData = window.userData = {};

        if (!configData) { return {}; }

        var myId = configData.myId;
        var userName = configData.userName || "";
        var onChange = configData.onChange;
        var userAvatar = configData.userAvatar;
        if (!myId || !userName) { warn("myId and userName are required!"); return; }

        var cursor;
        var editor = configData.editor;
        var oldcursor;
        if (editor && typeof configData.getCursor === "function") {
            cursor = configData.getCursor;
            oldcursor = cursor();
        }

        userData[myId] = {
            name : userName
        };
        if (oldcursor) { userData[myId]['cursor_'+editor] = oldcursor }
        if (typeof userAvatar === "string") { userData[myId].avatar = userAvatar; }

        var config = {
            initialState : '{}',
            network : network,
            userName : userName || '',
            channel : key,
            crypto : configData.crypto || null,
            transformFunction : configData.transformFunction,
        };

        var updateUserData = function (textData) {
            try {
                var json = JSON.parse(textData);
                for (var key in json) {
                    userData[key] = json[key];
                }
                if (onChange && typeof onChange === "function") { onChange(userData); }
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

        if (typeof cursor !== "undefined") {
            var to = setInterval(function () {
                var newcursor = cursor();
                if (oldcursor !== newcursor) {
                    userData[myId]['cursor_'+editor] = newcursor;
                    oldcursor = newcursor;
                    onChange(userData);
                    onLocal();
                }
            }, 3000);
        }

        realtimeInput.start(config);

        return userData;
    };

    return module;
});
