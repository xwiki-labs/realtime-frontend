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
    var MESSAGES = module.messages = {
        allowRealtime: "Allow Realtime Collaboration",
        joinSession: "Join Realtime Collaborative Session",

        sessionInProgress: "A Realtime Editor session is in progress:",

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
        savedRemoteNoMerge: 'v{0} saved by {1} in {2} - Save here to merge the content.',
        conflictResolved: 'merge conflict resolved remotely, now v{0}',
        mergeDialog_prompt: "A change was made to the document outside of the realtime session, "+
            "and the server had difficulty merging it with your version. "+
            "How would you like to handle this?",
        mergeDialog_keepRealtime: "Overwrite all changes with the current realtime version",
        mergeDialog_keepRemote:   "Overwrite all changes with the current remote version",

        redirectDialog_prompt: "A realtime session already exists for that document. "+
            "Do you want to join it?",
        redirectDialog_plural_prompt: "Different Realtime sessions already exist for that document. "+
            "Which session do you want to join?",
        redirectDialog_join: "Join the realtime {0} session",
        redirectDialog_create: "Request a new realtime {0} session",

        waiting: "Waiting for an answer",
        requestASession: "The document is locked by another user. Do you want to request a collaborative session?",
        requestDialog_prompt: "Someone wants to edit this document with you. Do you accept to create a collaborative session?",
        requestDialog_create: "Save and create a {0} collaborative session",
        requestDialog_reject: "Stay offline and keep the document locked",
        rejectDialog_prompt: "Your request has been rejected. You can wait for the document to be unlocked. If you force the lock, you risk losing content.",
        rejectDialog_OK: 'OK',
        conflictsWarning: 'Multiple users are editing this document concurrently.',
        conflictsWarningInfoRt: 'You can avoid these problems if they join the collaborative session.',
        conflictsWarningInfo: 'You can prevent these problems by <strong>copying or saving</strong> your changes and then ',
        conflictsWarningInfoLink: 'enabling realtime collaboration',
        wsError: "We were unable to connect you to the realtime system.",
        wsErrorInfo: "You won't be warned if other users want to edit the document collaboratively and you can't join a collaborative session.", // XXX
        wsErrorConflicts: "You risk losing content if other users edit the document at the same time.",
        connectingBox: "Connecting to the collaborative session. Please wait...",
        ckError: "The content cannot be saved because of a CKEditor internal error. You should try to copy your important changes and reload the editor",
    };
    if (document.documentElement.lang==="fr") {
      MESSAGES = module.messages = {
        allowRealtime: "Collaboration temps-réel",
        joinSession: "Rejoindre la session de collaboration temps-réel",

        sessionInProgress: "Une session de collaboration temps-réel est en cours:",

        disconnected: "Déconnecté",
        myself: "Moi",
        guest: "Invité",
        guests: "Invités",
        and: "et",
        editingWith: "Edition avec:",
        debug: "Debug",
        initializing: "Initialisation...",
        lag: "Lag:",
        saved: "Sauvegarde: v{0}",
        'merge overwrite': "La sessions temps-réel a été écrasée avec le dernier contenu sauvegardé",
        savedRemote: 'v{0} sauvegardé par {1}',
        savedRemoteNoMerge: 'v{0} sauvergardé {1} dans {2} - Enregistrez pour fusionner le contenu.',
        conflictResolved: 'Conflit résolu par un utilisateur distant, version v{0}',
        mergeDialog_prompt: "Un changement a été réalisé en dehors de la session temps-réel, "+
            "et le serveur n'a pas pu fusionner la modification avec votre version. "+
            "Que voulez vous faire ?",
        mergeDialog_keepRealtime: "Garder la session temps-réel",
        mergeDialog_keepRemote:   "Garder les changements distants",

        redirectDialog_prompt: "Une session temps-réel existe déjà pour ce document. "+
            "Voulez-vous la rejoindre ?",
        redirectDialog_plural_prompt: "Plusieurs sessions temps-réel existent pour ce document. "+
            "Quelle session voulez-vous rejoindre ?",
        redirectDialog_join: "Rejoindre la session {0}",
        redirectDialog_create: "Demander une nouvelle session {0}",

        waiting: "En attente d'une réponse...",
        requestASession: "Le document est verrouillé par un autre utilisateur. Souhaitez-vous demander une session collaborative ?",
        requestDialog_prompt: "Un autre utilisateur souhaite modifier ce document. Acceptez-vous de créer une session collaborative ?",
        requestDialog_create: "Sauver et créer une session {0} collaborative",
        requestDialog_reject: "Garder le document verrouillé",
        rejectDialog_prompt: "Votre demande a été refusée. Vous pouvez attendre que le document soit déverrouillé. Si vous forcez l'édition, you risquez de perdre du contenu.",
        rejectDialog_OK: 'OK',
        conflictsWarning: "Plusieurs utilisateurs modifient ce document en même temps.",
        conflictsWarningInfo: "Vous pouvez éviter ces problèmes s'ils rejoingnent la session collaborative.",
        conflictsWarningInfo: 'Vous pouvez éviter ces problèmes en <strong>copiant ou sauvant</strong> vos modifications puis en ',
        conflictsWarningInfoLink: 'activant la collaboration en temps-réel',
        wsError: "Nous n'avons pas réussi à vous connecter au système temps-réel.",
        wsErrorInfo: "Vous ne serez pas prévenu si quelqu'un souhaite modifier le document collaborativement et vous ne pouvez pas rejoindre une session collaborative.",
        wsErrorConflicts: "Vous risquez de perdre du contenu si d'autres personnes modifient le document en même temps.",
        connectingBox: "Connexion à la session collaborative. Veuillez patienter...",

        ckError: "Le contenu n'a pas pu être sauvé à cause d'une erreur interne à CKEditor. Vous devriez essayer de copier vos modifications importantes et de recharger la page.",
      };
    }
    #set ($document = $xwiki.getDocument('RTFrontend.WebHome'))
    var PATHS = {
        RTFrontend_chainpad: "$document.getAttachmentURL('chainpad.dist.js')",
        '/bower_components/chainpad/chainpad.dist.js':  "$document.getAttachmentURL('chainpad.dist.js')",
        RTFrontend_realtime_input: "$document.getAttachmentURL('chainpad-netflux.js')",
        '/bower_components/chainpad-netflux/chainpad-netflux.js': "$document.getAttachmentURL('chainpad-netflux.js')",

        RTFrontend_netflux: "$document.getAttachmentURL('netflux-client.js')",
        RTFrontend_saver: "$document.getAttachmentURL('saver.js')",
        RTFrontend_interface: "$document.getAttachmentURL('interface.js')",
        RTFrontend_toolbar: "$document.getAttachmentURL('toolbar.js')",
        RTFrontend_userdata: "$document.getAttachmentURL('userdata.js')",
        RTFrontend_cursor: "$document.getAttachmentURL('cursor.js')",
        RTFrontend_treesome: "$document.getAttachmentURL('treesome.js')",
        RTFrontend_messages: "$document.getAttachmentURL('messages.js')",
        RTFrontend_tests: "$document.getAttachmentURL('TypingTests.js')",

        RTFrontend_json_ot: "$document.getAttachmentURL('json-ot.js')",
        '/bower_components/chainpad-json-validator/json-ot.js': "$document.getAttachmentURL('json-ot.js')",

        RTFrontend_json_transform: "$document.getAttachmentURL('transform.js')",
        '/bower_components/chainpad-json-validator/transform.js': "$document.getAttachmentURL('transform.js')",

        RTFrontend_hyperjson: "$document.getAttachmentURL('hyperjson.js')",
        '/bower_components/hyperjson/hyperjson.js': "$document.getAttachmentURL('hyperjson.js')",

        RTFrontend_diffDOM: "$document.getAttachmentURL('diffDOM.js')",
        '/bower_components/diff-dom/diffDOM.js': "$document.getAttachmentURL('diffDOM.js')",

        RTFrontend_promises: "$document.getAttachmentURL('es6-promise.min.js')",
        '/bower_components/es6-promise/es6-promise.min.js': "$document.getAttachmentURL('es6-promise.min.js')",

        'json.sortify': "$document.getAttachmentURL('JSON.sortify.js')",
        '/bower_components/json.sortify/dist/JSON.sortify': "$document.getAttachmentURL('JSON.sortify.js')",

        RTFrontend_netflux: "$document.getAttachmentURL('netflux-client.js')",
        '/bower_components/netflux-websocket/netflux-client.js': "$document.getAttachmentURL('netflux-client.js')",

        '/bower_components/reconnectingWebsocket/reconnecting-websocket.js': "$document.getAttachmentURL('reconnecting-websocket.js')",

        RTFrontend_text_patcher: "$document.getAttachmentURL('TextPatcher.js')",
        '/bower_components/textpatcher/TextPatcher.js': "$document.getAttachmentURL('TextPatcher.js')",

        RTFrontend_rangy: "$document.getAttachmentURL('rangy-core.min.js')",
        '/bower_components/rangy/rangy-core.min.js': "$document.getAttachmentURL('rangy-core.min.js')",

        RTFrontend_crypto: "$document.getAttachmentURL('stub.js')",

        RTFrontend_errorbox: "$xwiki.getURL('RTFrontend.ErrorBox','jsx')" + '?minify=false',
        RTFrontend_GetKey: "$xwiki.getURL('RTFrontend.GetKey','get')?outputSyntax=plain&"
    };

    ## Current user avatar
    #set ($myAvatar = $xwiki.getUserName($xcontext.getUser(), '$avatar', false))
    #if ("$!myAvatar" != "$avatar" && "$!myAvatar" != "")
        #set ($userRef = $xcontext.getUserReference())
        #set ($userDoc = $xwiki.getDocument($userRef))
        #set ($avatarUrl = $userDoc.getAttachmentURL($myAvatar))
    #else
        #set ($avatarUrl = "")
    #end
    var userAvatarUrl = '$avatarUrl';

    // END_VELOCITY

    if (!WEBSOCKET_URL) {
        console.log("The provided websocketURL was empty, aborting attempt to" +
            "configure a realtime session.");
        return false;
    }
    if (!window.XWiki) {
        console.log("WARNING: XWiki js object not defined.");
        return false;
    }

    var getParameterByName = function (name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    };

    var documentReference = xm.documentReference ? xm.documentReference+'' : xm.wiki+':'+xm.document;

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
    if (!language || language === '') { language = 'default'; } //language = DEFAULT_LANGUAGE; ?

    for (var path in PATHS) { PATHS[path] = PATHS[path].replace(/\.js$/, ''); }

    require.config({
        paths:PATHS
    });
    delete PATHS['json.sortify'];
    require.config({
        map: {
            "*": PATHS
        }
    });


    var getDocLock = module.getDocLock = function () {
        var lockedBy = document.querySelectorAll('p.xwikimessage .wikilink a');
        var force = document.querySelectorAll('a[href*="force=1"][href*="/edit/"]');
        return (lockedBy.length && force.length) ? force[0] : false;
    };
    var isForced = module.isForced = (window.location.href.indexOf("force=1") >= 0);
    var isRt = module.isRt = (window.location.href.indexOf("realtime=1") >= 0);

    // used to insert some descriptive text before the lock link
    var prependLink = function (link, text) {
        var p = document.createElement('p');
        p.innerHTML = text;
        link.parentElement.insertBefore(p, link);
    };

    var getRTEditorURL = module.getEditorURL = function (href, info) {
        href = href.replace(/\?(.*)$/, function (all, args) {
            return '?' + args.split('&').filter(function (arg) {
                if (arg === 'editor=wysiwyg') { return false; }
                if (arg === 'editor=wiki') { return false; }
                if (arg === 'editor=object') { return false; }
                if (arg === 'editor=inline') { return false; }
                if (arg === 'sheet=CKEditor.EditSheet') { return false; }
                if (arg === 'force=1') { return false; }
                if (arg === 'realtime=1') { return false; }
                else { return true; }
            }).join('&');
        });
        if(href.indexOf('?') === -1) { href += '?'; }
        href = href + info.href;
        return href;
    }

    var allRt = {
        state: false
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
            LOCALSTORAGE_DISALLOW: LOCALSTORAGE_DISALLOW,
            userAvatarURL: userAvatarUrl,
            network: allRt.network,
            abort: function () { module.onRealtimeAbort(); }
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
            var types = [],
                users = 0;
            if (data.error) { console.error("You don't have permissions to edit that document"); return; }
            var mods = data[documentReference];
            if (!mods) { console.error("Unknown error"); return; }
            var content = window.teste = mods[language+'/content'];
            if (!content) { console.error("Unknown error"); return; }
            for (var editor in content) {
                if(editor) {
                    if (content[editor].users && content[editor].users > 0) {
                        if (content[editor].users > users) {
                            types.push(editor);
                        }
                    }
                }
            }
            if (types.length === 0) { callback(false); }
            else { callback(true, types); }
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

            checkSocket(function (active, types) {
                // determine if it's a realtime session
                if (active) {
                    console.log("Found an active realtime");
                    //if (realtimeDisallowed()) {
                        // do nothing
                    //} else {
                        displayModal(null, types, null, info);
                    //}
                } else {
                    console.log("Couldn't find an active realtime session");
                    module.whenReady(function (rt) {
                        if (rt) {
                            displayModal(null, null, null, info);
                        }
                    });
                }
            });
        } else {
            // do nothing
        }
    };

    var displayModal = module.displayModal = function(createType, existingTypes, callback, info) {
        if(XWiki.widgets.RealtimeCreateModal) { return; };
        existingTypes = existingTypes || [];
        XWiki.widgets.RealtimeCreateModal = Class.create(XWiki.widgets.ModalPopup, {
            /** Default parameters can be added to the custom class. */
            defaultInteractionParameters : {
            },
            /** Constructor. Registers the key listener that pops up the dialog. */
            initialize : function($super, interactionParameters) {
                this.interactionParameters = Object.extend(Object.clone(this.defaultInteractionParameters), interactionParameters || {});
                // call constructor from ModalPopup with params content, shortcuts, options
                $super(
                this.createContent(this.interactionParameters, this),
                    {
                        "show"  : { method : this.showDialog,  keys : [] },
                        "close" : { method : this.closeDialog, keys : ['Esc'] }
                    },
                    {
                        displayCloseButton : true,
                        verticalPosition : "center",
                        backgroundColor : "#FFF",
                        removeOnClose : true
                    }
                );
                this.showDialog();
                this.setClass("realtime-create-session");
                $(document).trigger('insertButton');
            },
            /** Get the content of the modal dialog using ajax */
            createContent : function (data, modal) {
                var content =  new Element('div', {'class': 'modal-popup'});

                // Create buttons container
                var classesButtons = '';
                existingTypes.forEach(function (elmt) { classesButtons += " realtime-button-"+elmt; });
                var buttonsDiv =  new Element('div', {'class': 'realtime-buttons'+classesButtons});
                $(buttonsDiv).data('modal', modal);

                // Add text description
                if (existingTypes.length > 1) {
                    content.insert(MESSAGES.redirectDialog_plural_prompt);
                } else if (existingTypes.length === 1) {
                    content.insert(MESSAGES.sessionInProgress);
                } else {
                    content.insert(MESSAGES.requestASession);
                }
                content.insert(buttonsDiv);

                // Create new session button
                var br = new Element('br');
                if (createType) {
                    var buttonCreate = new Element('button', {'class': 'btn btn-primary'});
                    buttonCreate.insert(MESSAGES.redirectDialog_create.replace(/\{0\}/g, info.name));
                    $(buttonCreate).on('click', function() {
                        callback();
                        modal.closeDialog();
                    });
                    buttonsDiv.insert(br);
                    buttonsDiv.insert(buttonCreate);
                }
                return content;
            }
        });
        return new XWiki.widgets.RealtimeCreateModal();
    };
    var cmi = 0;
    var displayCustomModal = function (content) {
        var i = cmi++;
        XWiki.widgets.RealtimeRequestModal = Class.create(XWiki.widgets.ModalPopup, {
            /** Default parameters can be added to the custom class. */
            defaultInteractionParameters : {},
            /** Constructor. Registers the key listener that pops up the dialog. */
            initialize : function($super, interactionParameters) {
                this.interactionParameters = Object.extend(Object.clone(this.defaultInteractionParameters), interactionParameters || {});
                // call constructor from ModalPopup with params content, shortcuts, options
                $super(
                this.createContent(this.interactionParameters, this),
                    {
                        "show"  : { method : this.showDialog,  keys : [] },
                        //"close" : { method : this.closeDialog, keys : ['Esc'] }
                    },
                    {
                        displayCloseButton : false,
                        verticalPosition : "center",
                        backgroundColor : "#FFF",
                        removeOnClose : true
                    }
                );
                this.showDialog();
            },
            /** Get the content of the modal dialog using ajax */
            createContent : function (data, modal) {
                $(content).find('button, input').click(function () {
                    modal.closeDialog();
                });
                return content;
            }
        });
        return new XWiki.widgets.RealtimeRequestModal();
    };

    var getRequestContent = function (info, callback) {
        var content =  new Element('div', {'class': 'modal-popup'});

        // Create buttons container
        var buttonsDiv =  new Element('div', {'class': 'realtime-buttons'});

        // Add text description
        content.insert(MESSAGES.requestDialog_prompt);
        content.insert(buttonsDiv);

        // Create new session button
        var br = new Element('br');
        var buttonCreate = new Element('button', {'class': 'btn btn-primary'});
        buttonCreate.insert(MESSAGES.requestDialog_create.replace(/\{0\}/g, info.name));
        $(buttonCreate).on('click', function() {
            callback(true);
        });
        var buttonReject =  new Element('button', {'class': 'btn btn-danger'});
        buttonReject.insert(MESSAGES.requestDialog_reject);
        $(buttonReject).on('click', function() {
            callback(false);
        });
        buttonsDiv.insert(br);
        buttonsDiv.insert(buttonCreate);
        buttonsDiv.insert(buttonReject);
        return content;
    };

    var getRejectContent = function () {
        var content =  new Element('div', {'class': 'modal-popup'});
        var buttonsDiv =  new Element('div', {'class': 'realtime-buttons'});

        content.insert(MESSAGES.rejectDialog_prompt);
        content.insert(buttonsDiv);

        var br = new Element('br');
        var buttonCreate = new Element('button', {'class': 'btn btn-primary'});
        buttonCreate.insert(MESSAGES.rejectDialog_OK);
        buttonsDiv.insert(br);
        buttonsDiv.insert(buttonCreate);
        return content;
    };

    var availableRt = {};
    module.setAvailableRt = function (type, info, cb) {
        availableRt[type] = {
            info: info,
            cb: cb
        };
    };

    var isEditorCompatible = function () {
        var ret;
        Object.keys(availableRt).some(function (type) {
            if ((availableRt[type].info.compatible || []).indexOf(XWiki.editor) !== -1) {
                ret = type;
                return true;
            }
        });
        return ret;
    };

    var warningVisible = false;
    var displayWarning = function () {
        if (warningVisible) { return; }
        var $after = $('#hierarchy');
        if (!$after.length) { return; }
        warningVisible = true;
        var $warning = $('<div>', {
            'class': 'xwiki-realtime-warning box warningmessage'
        }).insertAfter($after);
        $('<strong>').text(MESSAGES.conflictsWarning).appendTo($warning);
        $('<br>').appendTo($warning);
        $('<span>').text(MESSAGES.wsErrorConflicts).appendTo($warning);
        var editor = isEditorCompatible();
        if (!module.isRt && editor) {
            $('<br>').appendTo($warning);
            $('<span>').html(MESSAGES.conflictsWarningInfo).appendTo($warning);
            $('<a>', {
                href: getRTEditorURL(window.location.href, availableRt[editor].info)
            }).text(MESSAGES.conflictsWarningInfoLink).appendTo($warning);
        } else if (module.isRt) {
            $('<br>').appendTo($warning);
            $('<span>').text(MESSAGES.conflictsWarningInfoRt).appendTo($warning);
        }
    };
    var displayWsWarning = function (isError) {
        if (warningVisible) { return; }
        var $after = $('#hierarchy');
        if (!$after.length) { return; }
        warningVisible = true;
        var type = isError ? 'errormessage' : 'warningmessage';
        var $warning = $('<div>', {
            'class': 'xwiki-realtime-warning box ' + type
        }).insertAfter($after);
        $('<strong>').text(MESSAGES.wsError).appendTo($warning);
        $('<br>').appendTo($warning);
        $('<span>').text(MESSAGES.wsErrorInfo).appendTo($warning);
        if (module.isForced) {
            $('<br>').appendTo($warning);
            $('<span>').text(MESSAGES.wsErrorConflicts).appendTo($warning);
        }
    };
    var hideWarning = function () {
        warningVisible = false;
        $('.xwiki-realtime-warning').remove();
    };
    var connectingVisible = false;
    var displayConnecting = function () {
        if (connectingVisible) { return; }
        var $after = $('#hierarchy');
        if (!$after.length) { return; }
        connectingVisible = true;
        var $warning = $('<div>', {
            'class': 'xwiki-realtime-connecting box infomessage'
        }).insertAfter($after);
        $('<strong>').text(MESSAGES.connectingBox).appendTo($warning);
    };
    var hideConnecting = function () {
        warningVisible = false;
        $('.xwiki-realtime-connecting').remove();
    };

    var tryParse = function (msg) {
        try {
            return JSON.parse(msg);
        } catch (e) {
            console.error("Cannot parse the message");
        }
    };

    // Join a channel with all users on this page (realtime, offline AND lock page)
    // 1. This channel allows users on "lock" page to contact the editing user
    //    and request a collaborative session, using the `request` and `answer` commands
    // 2. It is also used to know if someone else is editing the document concurrently
    //    (at least 2 users with 1 editing offline). In this case, a warning message can
    //    be displayed.
    //    When someone starts editing the page, they send a `join` message with a
    //    boolean 'realtime'. When other users receive this message, they can tell if
    //    there is a risk of conflict and send a `displayWarning` command to the new user.
    var addMessageHandler = function () {
        if (!allRt.wChan) { return; }
        var wc = allRt.wChan;
        var network = allRt.network;
        // Handle incoming messages
        wc.on('message', function (msg, sender) {
            var data = tryParse(msg);
            if (!data) { return; }

            // Someone wants to create a realtime session. If the current user is editing
            // offline, display the modal
            if (data.cmd === "request") {
                if (lock) { return; }
                if (!data.type) { return; }
                var res = {
                    cmd: "answer",
                    type: data.type
                };
                // Make sure realtime is available for the requested editor
                if (!availableRt[data.type]) {
                    res.state = -1;
                    return void wc.bcast(JSON.stringify(res));
                }
                // Check if we're not already in realtime
                if (module.isRt) {
                    res.state = 2;
                    return void wc.bcast(JSON.stringify(res));
                }
                // Check if our current editor is realtime compatible
                // i.e. Object editor can't switch to wysiwyg
                if (!isEditorCompatible()) {
                    res.state = 0;
                    return void wc.bcast(JSON.stringify(res));
                }
                // We're editing offline: display the modal
                var content = getRequestContent(availableRt[data.type].info, function (state) {
                    if (state) {
                        // Accepted: save and create the realtime session
                        availableRt[data.type].cb();
                    }
                    res.state = state ? 1 : 0;
                    return void wc.bcast(JSON.stringify(res));
                });
                return void displayCustomModal(content);
            }
            // Receiving an answer to a realtime session request
            if (data.cmd === "answer") {
                if (!allRt.request) { return; }
                var state = data.state;
                if (state === -1) { return void ErrorBox.show('unavailable'); }
                if (state === 0) {
                    // Rejected
                    if ($('.realtime-buttons').length) {
                        var m = $('.realtime-buttons').data('modal');
                        if (m) {
                            m.closeDialog();
                        }
                    }
                    return void displayCustomModal(getRejectContent());
                }
                return void allRt.request(state);
            }
            // Someone is joining the channel while we're editing, check if they
            // are using realtime and if we are
            if (data.cmd === "join") {
                if (lock) { return; }
                if (!data.realtime || !module.isRt) {
                    displayWarning();
                    network.sendto(sender, JSON.stringify({
                        cmd: 'displayWarning'
                    }));
                } else if (warningVisible) {
                    hideWarning();
                    wc.bcast(JSON.stringify({
                        cmd: 'isSomeoneOffline'
                    }));
                }
                return;
            }
            // Someone wants to know if we're editing offline to know if the warning
            // message should be displayed
            if (data.cmd === 'isSomeoneOffline') {
                if (lock || module.isRt) { return; }
                network.sendto(sender, JSON.stringify({
                    cmd: 'displayWarning'
                }));
                return;
            }
        });
    };
    var joinAllUsers = function () {
        var config = getConfig();
        var keyData = [{doc: config.reference, mod: config.language+'/events', editor: "all"}];
        getKeys(keyData, function (d) {
            var doc = d && d[config.reference];
            var ev = doc && doc[config.language+'/events'];
            if (ev && ev.all) {
                var key = ev.all.key;
                var users = ev.all.users;
                require(['RTFrontend_netflux', 'RTFrontend_errorbox'], function (Netflux, ErrorBox) {
                    var onError = function (err) {
                        allRt.error = true;
                        displayWsWarning();
                        console.error(err);
                    };
                    // Connect to the websocket server
                    Netflux.connect(config.WebsocketURL).then(function (network) {
                        allRt.network = network;
                        var onOpen = function (wc) {
                            allRt.userList = wc.members;
                            allRt.wChan = wc;
                            addMessageHandler();
                            // If we're in edit mode (not locked), tell the other users
                            if (!lock) {
                                return void wc.bcast(JSON.stringify({
                                    cmd: 'join',
                                    realtime: module.isRt
                                }));
                            }
                        };
                        // Join the "all" channel
                        network.join(key).then(onOpen, onError);
                        // Add direct messages handler
                        network.on('message', function (msg, sender) {
                            var data = tryParse(msg);
                            if (!data) { return; }

                            if (data.cmd === 'displayWarning') {
                                displayWarning();
                                return;
                            }
                        });
                        // On reconnect, join the "all" channel again
                        network.on('reconnect', function () {
                            network.join(key).then(onOpen, onError);
                        });
                    }, onError);
                });
            }
        });
    };
    module.requestRt = function (type, cb) {
        if (!allRt.wChan) {
            return void setTimeout(function () {
                module.requestRt(type, cb);
            }, 500);
        }
        if (allRt.userList.length === 1) { // no other user
            return void cb(false);
        }
        var data = JSON.stringify({
            cmd: 'request',
            type: 'wysiwyg'
        });
        allRt.request = cb;
        allRt.wChan.bcast(data);
    };
    module.onRealtimeAbort = function () {
        module.isRt = false;
        if (!allRt.wChan) { return; }
        allRt.wChan.bcast(JSON.stringify({
            cmd: 'join',
            realtime: module.isRt
        }));
    };
    joinAllUsers();

    module.whenReady = function (cb) {
        displayConnecting();
        // We want realtime enabled so we have to wait for the network to be ready
        if (allRt.network) {
            hideConnecting();
            return void cb(true);
        }
        if (allRt.error) {
            // Can't connect to network: hide the warning about "not being warned when some wants RT"
            // and display error about not being able to enable WS
            hideConnecting();
            hideWarning();
            displayWsWarning(true);
            return void cb(false);
        }
        setTimeout(function () {
            module.whenReady(cb);
        }, 100);
    };

    return module;
});
