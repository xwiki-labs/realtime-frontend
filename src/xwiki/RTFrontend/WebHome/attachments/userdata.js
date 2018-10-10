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

        var online = true;
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
            crypto : configData.crypto || null
        };

        var updateUserData = function (textData) {
            try {
                var json = JSON.parse(textData);
                for (var key in json) {
                    userData[key] = json[key];
                }
                if (onChange && typeof onChange === "function") { onChange(userData); }
            } catch (e) {
                console.log(textData);
                console.error(e);
            }
        };
        var onRemote = config.onRemote = function (info) {
            if (initializing) { return; }

            var userDoc = module.realtime.getUserDoc();

            updateUserData(userDoc);
        };

        var first = true;
        var onReady = config.onReady =  function(info) {
            module.leave = info.leave;
            var realtime = module.realtime = info.realtime;
            if (!first) {
                var userDoc = realtime.getUserDoc();
                updateUserData(userDoc);
                initializing = false;
                onLocal();
                return;
            }

            first = false;
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
            if (!online) { return; }

            var shjson = stringify(userData);
            module.patchText(shjson);
            if (module.realtime.getUserDoc() !== shjson) {
                warn("userDoc !== shjson");
            }
        };
        config.onConnectionChange = function (info) {
            if (info.state) {
                myId = info.myId
                online = true;
                initializing = true;
                return;
            }
            online = false;
        };

        var to;
        if (typeof cursor !== "undefined") {
            to = setInterval(function () {
                if (!online) { return; }
                var newcursor = cursor();
                if (oldcursor !== newcursor) {
                    if (!userData[myId]) {
                        userData[myId] = { name : userName };
                        if (typeof userAvatar === "string") { userData[myId].avatar = userAvatar; }
                    }
                    userData[myId]['cursor_'+editor] = newcursor;
                    oldcursor = newcursor;
                    onChange(userData);
                    onLocal();
                }
            }, 3000);
        }

        var leaveChannel = userData.leave = function() {
            clearInterval(to);
            module.leave();
        };

        realtimeInput.start(config);

        return userData;
    };

    return module;
});
