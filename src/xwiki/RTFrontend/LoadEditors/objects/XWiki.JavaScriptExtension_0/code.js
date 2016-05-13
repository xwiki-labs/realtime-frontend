define(function() {
    var module = {};
    // VELOCITY
    var WEBSOCKET_URL = "$!services.websocket.getURL('realtimeNetflux')";
    var USER = "$!xcontext.getUserReference()" || "xwiki:XWiki.XWikiGuest";
    var PRETTY_USER = "$xwiki.getUserName($xcontext.getUser(), false)";
    var DEMO_MODE = "$!request.getParameter('demoMode')" || false;
    DEMO_MODE = (DEMO_MODE === true || DEMO_MODE === "true") ? true : false;
    var DEFAULT_LANGUAGE = "$xwiki.getXWikiPreference('default_language')";
    var LOCALSTORAGE_DISALLOW = 'realtime-disallow';
    var MESSAGES = {
        allowRealtime: "Allow Realtime Collaboration", // TODO: translate
        joinSession: "Join Realtime Collaborative Session",

        wysiwygSessionInProgress: "A Realtime <strong>WYSIWYG</strong> Editor session is in progress:",
        wikiSessionInProgress: "A Realtime <strong>Wiki</strong> Editor session is in progress:",

        disconnected: "Disconnected",
        myself: "Myself",
        guest: "Guest",
        guests: "Guests",
        and: "and",
        editingWith: "Editing With:",
        debug: "Debug",
        initializing: "Initializing...",
        lag: "Lag:",
        saved: "Saved: v{0}",
        'merge overwrite': "Overwrote the realtime session's content with the latest saved state",
        savedRemote: 'v{0} saved by {1}',
        conflictResolved: 'merge conflict resolved remotely, now v{0}',
        mergeDialog_prompt: "A change was made to the document outside of the realtime session, "+
            "and the server had difficulty merging it with your version. "+
            "How would you like to handle this?",
        mergeDialog_keepRealtime: "Overwrite all changes with the current realtime version",
        mergeDialog_keepRemote:   "Overwrite all changes with the current remote version",

        rtwiki_editor: "Wiki",
        rtwysiwyg_editor: "WYSIWYG",
        rtwiki_name: "Realtime Collaborative Plain WikiText Editor",
        rtwysiwyg_name: "Visual Realtime Collaborative Editor",
        redirectDialog_prompt: "A realtime session already exists for that document, but it is using the {0} editor. "+
            "Do you want to join that session?",
        redirectDialog_joinRT: "Join the realtime {0} session (Recommended)",
        redirectDialog_stayOffline: "Stay offline (Risks of merge issues)"
    };
    #set ($document = $xwiki.getDocument('RTFrontend.WebHome'))
    var PATHS = {
        RTFrontend_chainpad: "$document.getAttachmentURL('chainpad.js')",
        RTFrontend_realtime_input: "$document.getAttachmentURL('realtime-input.js')",

        RTFrontend_saver: "$document.getAttachmentURL('saver.js')",
        RTFrontend_interface: "$document.getAttachmentURL('interface.js')",
        RTFrontend_toolbar: "$document.getAttachmentURL('toolbar.js')",

        RTFrontend_cursor: "$document.getAttachmentURL('cursor.js')",
        RTFrontend_json_ot: "$document.getAttachmentURL('json-ot.js')",

        RTFrontend_hyperjson: "$document.getAttachmentURL('hyperjson.js')",
        RTFrontend_hyperscript: "$document.getAttachmentURL('hyperscript.js')",

        RTFrontend_diffDOM: "$document.getAttachmentURL('diffDOM.js')",

        RTFrontend_treesome: "$document.getAttachmentURL('treesome.js')",
        RTFrontend_messages: "$document.getAttachmentURL('messages.js')",
        RTFrontend_promises: "$document.getAttachmentURL('es6-promise.min.js')",
        'json.sortify': "$document.getAttachmentURL('JSON.sortify.js')",
        RTFrontend_netflux: "$document.getAttachmentURL('netflux-client.js')",
        RTFrontend_text_patcher: "$document.getAttachmentURL('TextPatcher.js')",
        RTFrontend_tests: "$document.getAttachmentURL('TypingTests.js')",
        RTFrontend_rangy: "$document.getAttachmentURL('rangy-core.min.js')",

        RTFrontend_errorbox: "$xwiki.getURL('RTFrontend.ErrorBox','jsx')" + '?minify=false',
        RTFrontend_GetKey: "$xwiki.getURL('RTFrontend.GetKey','jsx')"
    };

    // Prevent users from forcing a realtime editor if another type of realtime session is opened
    // in the same document. If set to true (not recommended), users are able to choose the editor
    // they want and when an editor is saving, it checks first if the content need to be merged and
    // if there is a merge issue.
    // In case of merge issue, the user has to choose between keeping his content or the content
    // saved by the remote user.
    #set ($webhomeRef = $services.model.createDocumentReference("", "RTFrontend", "WebHome"))
    #set ($multiple = $!xwiki.getDocument($webhomeRef).getObject('RTFrontend.ConfigurationClass').getProperty('allowMultipleEditors').value)
    var ALLOW_MULTIPLE_EDITORS = #if ("$multiple" != "1") false #else true #end;

    // END_VELOCITY

    var multiple = (!ALLOW_MULTIPLE_EDITORS) ? "&multiple=0" : "";

    if (!WEBSOCKET_URL) {
        console.log("The provided websocketURL was empty, aborting attempt to" +
            "configure a realtime session.");
        return false;
    }
    if (!window.XWiki) {
        console.log("WARNING: XWiki js object not defined.");
        return false;
    }
    // Not in edit mode?
    if (!DEMO_MODE && window.XWiki.contextaction !== 'edit') { return false; }

    var getParameterByName = function (name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    };

    var wiki = encodeURIComponent(XWiki.currentWiki);
    var space = encodeURIComponent(XWiki.currentSpace);
    var page = encodeURIComponent(XWiki.currentPage);
    var languageSelector = document.querySelectorAll('form input[name="language"]');// [0].value;
    var language = languageSelector[0] && languageSelector[0].value;
    if(!language) {
        language = getParameterByName('language');
    }
    if (!language || language === '') { language = 'default'; } //language = DEFAULT_LANGUAGE; ?
    PATHS.RTFrontend_GetKey = PATHS.RTFrontend_GetKey.replace(/\.js$/, '')+'?minify=false&wiki=' + wiki + '&space=' + space + '&page=' + page + '&language=' + language + multiple + '&editorTypes=';

    for (var path in PATHS) { PATHS[path] = PATHS[path].replace(/\.js$/, ''); }
    require.config({paths:PATHS});

    var getDocLock = function () {
        var force = document.querySelectorAll('a[href*="force=1"][href*="/edit/"]');
        return force.length? force[0] : false;
    };

    // used to insert some descriptive text before the lock link
    var prependLink = function (link, text) {
        var p = document.createElement('p');
        p.innerHTML = text;
        link.parentElement.insertBefore(p, link);
    };

    var getRTEditorURL = function (href, editorType) {
        href = href.replace(/\?(.*)$/, function (all, args) {
            return '?' + args.split('&').filter(function (arg) {
                if (arg === 'editor=wysiwyg') { return false; }
                if (arg === 'editor=wiki') { return false; }
                if (arg === 'sheet=CKEditor.EditSheet') { return false; }
                if (arg === 'force=1') { return false; }
            }).join('&');
        });

        if (editorType === 'rtwysiwyg') {
            href = href + '&editor=inline&sheet=CKEditor.EditSheet&force=1';
        }
        else if (editorType === 'rtwiki') {
            href = href + '&editor=wiki&force=1';
        }

        return href;
    }
    var pointToRealtime = function (link, types) {
        var href = link.getAttribute('href');

        href = href.replace(/\?(.*)$/, function (all, args) {
            return '?' + args.split('&').filter(function (arg) {
                if (arg === 'editor=wysiwyg') { return false; }
                if (arg === 'editor=wiki') { return false; }
                if (arg === 'sheet=CKEditor.EditSheet') { return false; }
                if (arg === 'force=1') { return false; }
            }).join('&');
        });

        var msg;
        if (types.indexOf('rtwysiwyg') > -1) {
            href = getRTEditorURL(href, 'rtwysiwyg');
            msg = MESSAGES.wysiwygSessionInProgress;
        }
        else if (types.indexOf('rtwiki') > -1) {
            href = getRTEditorURL(href, 'rtwiki');
            msg = MESSAGES.wikiSessionInProgress;
        }

        if(link.innerText !== MESSAGES.joinSession) {
            link.setAttribute('href', href);
            link.innerText = MESSAGES.joinSession;
            prependLink(link, msg);
        }
    };

    var getConfig = module.getConfig = function () {
        var languageSelector = document.querySelectorAll('form input[name="language"]');// [0].value;

        var language = languageSelector[0] && languageSelector[0].value;

        if (!language || language === 'default') { language = DEFAULT_LANGUAGE; }

        // Username === <USER>-encoded(<PRETTY_USER>)%2d<random number>
        var userName = USER + '-' + encodeURIComponent(PRETTY_USER + '-').replace(/-/g, '%2d') +
            String(Math.random()).substring(2);

        return {
            saverConfig: {
                ajaxMergeUrl: "$xwiki.getURL('RTFrontend.Ajax','get')",
                ajaxVersionUrl: "$xwiki.getURL('RTFrontend.Version','get')",
                messages: MESSAGES,
            },
            WebsocketURL: WEBSOCKET_URL,
            userName: userName,
            language: language,
            DEMO_MODE: DEMO_MODE,
            LOCALSTORAGE_DISALLOW: LOCALSTORAGE_DISALLOW
        };
    };

    var checkSocket = function (callback) {
        require(['RTFrontend_GetKey'], function(GetKey) {
            var types = [];
            if(GetKey.error) { console.error("You don't have permissions to edit that document"); return; }
            var keys = GetKey.keys;
            for (var editor in keys) {
                if (editor !== 'events') {
                    if (keys[editor].users && keys[editor].users > 0) {
                        types.push(editor);
                    }
                }
            }
            if (types.size() === 0) { callback(false); }
            else { callback(true, types); }
        });
    };

    var getKeys = module.getKeys = function(editorTypes, callback) {
        var path = PATHS.RTFrontend_GetKey + encodeURIComponent(editorTypes);
        require([path], function(GetKey) {
            if(GetKey.error) { console.error("You don't have permissions to edit that document"); return; }
            var keys = GetKey.keys;
            var types = {};
            for (var editor in keys) {
                types[editor] = keys[editor].key;
            }
            callback(types);
        });
    };

    var realtimeDisallowed = function () {
        return localStorage.getItem(LOCALSTORAGE_DISALLOW)?  true: false;
    };
    var lock = getDocLock();

    var checkSession = module.checkSessions = function() {
        if (lock) {
            // found a lock link

            checkSocket(function (active, types) {
                // determine if it's a realtime session
                if (active) {
                    console.log("Found an active realtime");
                    if (realtimeDisallowed()) {
                        // do nothing
                    } else {
                        pointToRealtime(lock, types);
                    }
                } else {
                    console.log("Couldn't find an active realtime session");
                }
            });
        } else {
            // do nothing
        }
    };

    var displayModal = module.displayModal = function(type) {
        var behave = {
           onYes: function() {
               window.location.href = getRTEditorURL(window.location.href, type);
           },
           onNo: function() {
               return;
           }
        };

        var param = {
            confirmationText: MESSAGES.redirectDialog_prompt.replace(/\{0\}/g, MESSAGES[type+'_editor']),
            yesButtonText: MESSAGES.redirectDialog_joinRT.replace(/\{0\}/g, MESSAGES[type+'_editor']),
            noButtonText: MESSAGES.redirectDialog_stayOffline,
            showCancelButton: false,
        };

        new XWiki.widgets.ConfirmationBox(behave, param);
    };

    return module;
});
