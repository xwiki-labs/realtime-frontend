define(['jquery', 'xwiki-meta'], function($, xm) {
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

        sessionInProgress: "A Realtime <strong>{0}</strong> Editor session is in progress:",

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
        RTFrontend_GetKey: "$xwiki.getURL('RTFrontend.GetKey','get')?outputSyntax=plain&"
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

    var documentReference = xm.documentReference+'' || xm.wiki+':'+xm.document;

    var language, version;
    var languageSelector = $('#realtime-frontend-getversion');
    if (languageSelector.length) {
        var json = JSON.parse($(languageSelector).html());
        language = json.locale;
        version = json.version;
    }
    else {
        console.log("WARNING : unable to get the language and version number from the UIExtension. Using the old method to get them.");
        var languageSelector = document.querySelectorAll('form input[name="language"]');// [0].value;
        language = languageSelector[0] && languageSelector[0].value;
        version = $('html').data('xwiki-version');
    }
    // if(!language) {
        // language = getParameterByName('language');
    // }
    if (!language || language === '') { language = 'default'; } //language = DEFAULT_LANGUAGE; ?
    //PATHS.RTFrontend_GetKey = PATHS.RTFrontend_GetKey.replace(/\.js$/, '')+'?minify=false&reference=' + documentReference + '&language=' + language + multiple + '&editorTypes=';
    GetKey_data = 'minify=false&reference=' + encodeURIComponent(documentReference) + '&language=' + language + multiple + '&editorTypes=';

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

    var getRTEditorURL = function (href, editorType, info) {
        href = href.replace(/\?(.*)$/, function (all, args) {
            return '?' + args.split('&').filter(function (arg) {
                if (arg === 'editor=wysiwyg') { return false; }
                if (arg === 'editor=wiki') { return false; }
                if (arg === 'editor=object') { return false; }
                if (arg === 'editor=inline') { return false; }
                if (arg === 'sheet=CKEditor.EditSheet') { return false; }
                if (arg === 'force=1') { return false; }
                else { return true; }
            }).join('&');
        });
        href = href + info.href;
        return href;
    }
    var pointToRealtime = function (link, type, info) {
        var href = link.getAttribute('href');

        var msg;

        if (type !== info.type) { return; }

        href = getRTEditorURL(href, type, info);

        var name = info.name || type;
        msg = MESSAGES.sessionInProgress.replace(/\{0\}/g, name);

        if(link.innerText !== MESSAGES.joinSession) {
            link.setAttribute('href', href);
            link.innerText = MESSAGES.joinSession;
            prependLink(link, msg);
        }
    };

    var getConfig = module.getConfig = function () {
        // Username === <USER>-encoded(<PRETTY_USER>)%2d<random number>
        var userName = USER + '-' + encodeURIComponent(PRETTY_USER + '-').replace(/-/g, '%2d') +
            String(Math.random()).substring(2);

        return {
            saverConfig: {
                ajaxMergeUrl: "$xwiki.getURL('RTFrontend.Ajax','get')",
                ajaxVersionUrl: "$xwiki.getURL('RTFrontend.Version','get')",
                messages: MESSAGES,
                language: language,
                version: version
            },
            WebsocketURL: WEBSOCKET_URL,
            htmlConverterUrl: "$xwiki.getURL('RTFrontend.ConvertHTML','get')",
            userName: userName,
            language: language,
            reference: documentReference,
            DEMO_MODE: DEMO_MODE,
            LOCALSTORAGE_DISALLOW: LOCALSTORAGE_DISALLOW
        };
    };

    var checkSocket = function (callback) {
        var path = PATHS.RTFrontend_GetKey;
        var editorData = [{doc: documentReference, mod: language+'/content', editor: ''}];
        $.ajax({
            url: path,
            data: 'data='+encodeURIComponent(JSON.stringify(editorData)),
            type: 'POST'
        }).done(function(dataText) {
            var data = JSON.parse(dataText);
            var type,
                users = 0;
            if (data.error) { console.error("You don't have permissions to edit that document"); return; }
            var mods = data[documentReference];
            if (!mods) { console.error("Unknown error"); return; }
            var content = window.teste = mods[language+'/content'];
            if (!content) { console.error("Unknown error"); return; }
            for (var editor in content) {
                if(editor) {
                    if (content[editor].users && content[editor].users > 0) {
                        if (!type || content[editor].users > users) {
                            type = editor;
                            users = content[editor].users;
                        }
                    }
                }
            }
            if (!type) { callback(false); }
            else { callback(true, type); }
        });
    };

    var getKeys = module.getKeys = function(editorData, callback) {
        var path = PATHS.RTFrontend_GetKey;
        var dataList = [];

        $.ajax({
            url: path,
            data: 'data='+encodeURIComponent(JSON.stringify(editorData)),
            type: 'POST'
        }).done(function(dataText) {
            var data = JSON.parse(dataText);
            if(data.error) { console.error("You don't have permissions to edit that document"); return; }
            callback(data);
        });
    };

    var realtimeDisallowed = function () {
        return localStorage.getItem(LOCALSTORAGE_DISALLOW)?  true: false;
    };
    var lock = getDocLock();

    var checkSession = module.checkSessions = function(info) {
        if (lock) {
            // found a lock link

            checkSocket(function (active, type) {
                // determine if it's a realtime session
                if (active) {
                    console.log("Found an active realtime");
                    if (realtimeDisallowed()) {
                        // do nothing
                    } else {
                        pointToRealtime(lock, type, info);
                    }
                } else {
                    console.log("Couldn't find an active realtime session");
                }
            });
        } else {
            // do nothing
        }
    };

    var displayModal = module.displayModal = function(type, info) {
        var behave = {
           onYes: function() {
               window.location.href = getRTEditorURL(window.location.href, type, info);
           },
           onNo: function() {
               return;
           }
        };

        var param = {
            confirmationText: MESSAGES.redirectDialog_prompt.replace(/\{0\}/g, '"'+type+'"'),
            yesButtonText: MESSAGES.redirectDialog_joinRT.replace(/\{0\}/g, '"'+type+'"'),
            noButtonText: MESSAGES.redirectDialog_stayOffline,
            showCancelButton: false,
        };

        new XWiki.widgets.ConfirmationBox(behave, param);
    };

    return module;
});
