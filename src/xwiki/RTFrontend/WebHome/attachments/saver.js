define([
    'RTFrontend_realtime_input',
    'RTFrontend_text_patcher',
    'RTFrontend_errorbox',
    'jquery',
    'RTFrontend_crypto',
    'RTFrontend_json_ot',
    'json.sortify'
], function (realtimeInput, TextPatcher, ErrorBox, $, Crypto, JsonOT, stringify) {
    var warn = function (x) {};
    var debug = function (x) {};
    // there was way too much noise, if you want to know everything use verbose
    var verbose = function (x) {};
    //verbose = function (x) { console.log(x); };
    debug = function (x) { console.log(x) };
    warn = function (x) { console.log(x) };

    var SAVE_DOC_TIME = 60000;

    // how often to check if the document has been saved recently
    var SAVE_DOC_CHECK_CYCLE = 20000;

    var now = function () { return (new Date()).getTime(); };

    var Saver = {};

    var mainConfig = Saver.mainConfig = {};

    // Contains the realtime data
    var rtData = {};

    var lastSaved = window.lastSaved = Saver.lastSaved = {
        content: '',
        time: 0,
        // http://jira.xwiki.org/browse/RTWIKI-37
        hasModifications: false,
        // for future tracking of 'edited since last save'
        // only show the merge dialog to those who have edited
        wasEditedLocally: false,
        receivedISAVE: false,
        shouldRedirect: false,
        isavedSignature: '',
        mergeMessage: function () {}
    };

    var configure = Saver.configure = function (config) {
        mainConfig.ajaxMergeUrl   = config.ajaxMergeUrl + '?xpage=plain&outputSyntax=plain';
        mainConfig.ajaxVersionUrl = config.ajaxVersionUrl;
        mainConfig.language       = config.language;
        mainConfig.messages       = config.messages;
        mainConfig.version        = config.version;
        mainConfig.chainpad       = config.chainpad;
        mainConfig.editorType     = config.editorType;
        mainConfig.isHTML         = config.isHTML;
        mainConfig.mergeContent   = config.mergeContent;
        mainConfig.editorName     = config.editorName;
        mainConfig.safeCrash     = function (reason) { warn(reason); };
        lastSaved.version = config.version;
    };

    var updateLastSaved = Saver.update = function (content) {
        lastSaved.time = now();
        lastSaved.content = content;
        lastSaved.wasEditedLocally = false;
    };

    var isaveInterrupt = Saver.interrupt = function () {
        if (lastSaved.receivedISAVE) {
            warn("Another client sent an ISAVED message.");
            warn("Aborting save action");
            // unset the flag, or else it will persist
            lastSaved.receivedISAVE = false;
            // return true such that calling functions know to abort
            return true;
        }
        return false;
    };

    /* retrieves attributes about the local document for the purposes of ajax merge
        just data-xwiki-document and lastSaved.version
    */
    var getDocumentStatistics = function () {
        var $html = $('html'),
            fields = [
                // 'space', 'page',
                'wiki',
                'document' // includes space and page
            ],
            result = {};

        /*  we can't rely on people pushing the new lastSaved.version
            if they quit before ISAVED other clients won't get the new version
            this isn't such an issue, because they _will_ converge eventually
        */
        result.version = lastSaved.version;

        fields.forEach(function (field) {
            result[field] = $html.data('xwiki-'+field);
        });

        result.language = mainConfig.language;

        return result;
    };

    var ajaxMerge = function (content, cb) {
        var url = mainConfig.ajaxMergeUrl;

        /* version, document */
        var stats=getDocumentStatistics();

        stats.content = content;
        if (mainConfig.isHTML) {
          stats.convertHTML = 1;
        }

        verbose("Posting with the following stats");
        verbose(stats);

        $.ajax({
            url: url,
            method: 'POST',
            dataType: "json",
            success: function (data) {
                try {
                    //var merge=JSON.parse(data);
                    // data is already an "application/json"
                    var merge = data;
                    var error = merge.conflicts &&
                        merge.conflicts.length &&
                        merge.conflicts[0].formattedMessage;
                    if (error) {
                        merge.error=error;
                        cb(error, merge);
                    } else {
                        // let the callback handle textarea writes
                        cb(null,merge);
                    }
                } catch (err) {
                    var debugLog = {
                        state: 'ajaxMerge/parseError',
                        lastSavedVersion: lastSaved.version,
                        lastSavedContent: lastSaved.content,
                        cUser: mainConfig.userName,
                        mergeData: data,
                        error: err
                    }
                    ErrorBox.show('parse', JSON.stringify(debugLog));
                    warn(err);
                    cb(err, data);
                }
            },
            data: stats,
            error: function (err) {
                var debugLog = {
                    state: 'ajaxMerger/velocityError',
                    lastSavedVersion: lastSaved.version,
                    lastSavedContent: lastSaved.content,
                    cContent: content,
                    cUser: mainConfig.userName,
                    err: err
                }
                ErrorBox.show('velocity', JSON.stringify(debugLog));
                warn(err);
                //cb(err,null);
            },
        });
    };

    // check a serverside api for the version string of the document
    var ajaxVersion = function (cb) {
        var url = mainConfig.ajaxVersionUrl + '?xpage=plain';
        var stats = getDocumentStatistics();
        $.ajax({
            url: url,
            method: 'POST',
            dataType: 'json',
            success: function (data) {
                cb(null, data);
            },
            data: stats,
            error: function (err) {
                cb(err, null);
            }
        });
    };

    var bumpVersion = function (cb, versionData) {
        var callback = function (e, out) {
            if (e) {
                var debugLog = {
                    state: 'bumpVersion',
                    lastSavedVersion: lastSaved.version,
                    lastSavedContent: lastSaved.content,
                    cUser: mainConfig.userName,
                    cContent: mainConfig.getTextValue()
                }
                mainConfig.safeCrash('updateversion', JSON.stringify(debugLog));
                warn(e);
            } else if (out) {
                debug("Triggering lastSaved refresh on remote clients");
                lastSaved.version = out.version;
                lastSaved.content = out.content;
                var contentHash = (mainConfig.chainpad && mainConfig.chainpad.hex_sha256) ? mainConfig.chainpad.hex_sha256(out.content) : "";
                saveMessage(lastSaved.version, contentHash);
                cb && cb(out);
            } else {
                throw new Error();
            }
        };
        if (versionData) {
            callback(null, versionData);
        } else {
            ajaxVersion(callback);
        }
    };

    var getFormToken = Saver.getFormToken = function () {
        return $('meta[name="form_token"]').attr('content');
    };


    // http://jira.xwiki.org/browse/RTWIKI-29
    var saveDocument = function (data, andThen) {
        /* RT_event-on_save */

        var defaultData = {
            // title if can be done realtime
            xredirect: '',
            xeditaction: 'edit',
            // TODO make this translatable
            comment: 'Auto-Saved by Realtime Session',
            action_saveandcontinue: 'Save & Continue',
            minorEdit: 1,
            ajax: true,
            form_token: getFormToken(),
            language: mainConfig.language
        };

        // Remove from the data the properties we want to override.
        data.split('&').filter(function (arg) {
            var name = (arg.split('=').length > 1) ? arg.split('=')[0] : arg;
            if (Object.keys(defaultData).indexOf(name) !== -1) { return false; }
            else { return true; }
        }).join('&');
        data += '&'+Object.toQueryString(defaultData);

        $.ajax({
            url: window.docsaveurl,
            type: "POST",
            async: true,
            dataType: 'text',

            // http://jira.xwiki.org/browse/RTWIKI-36
            // don't worry about hijacking and resuming
            // if you can just add the usual fields to this, simply steal the event
            data: data,
            success: function () {
                andThen();
            },
            error: function (jqxhr, err, cause) {
                var debugLog = {
                    state: 'saveDocument',
                    lastSavedVersion: lastSaved.version,
                    lastSavedContent: lastSaved.content,
                    cUser: mainConfig.userName,
                    cContent: mainConfig.getTextValue(),
                    err: err
                }
                ErrorBox.show('save', JSON.stringify(debugLog));
                warn(err);
                // Don't callback, this way in case of error we will keep trying.
                //andThen();
            }
        });
    };

    var ISAVED = 1;
    // sends an ISAVED message
    var saveMessage = function (version, hash) {
        var newState = {
            version: version,
            by: mainConfig.userName,
            hash: hash,
            editorName: mainConfig.editorName
        };
        rtData[mainConfig.editorType] = newState;
        mainConfig.onLocal();
        lastSaved.onReceiveOwnIsave && lastSaved.onReceiveOwnIsave();
    };

    var presentMergeDialog = function(question, labelDefault, choiceDefault, labelAlternative, choiceAlternative){
        var behave = {
           onYes: choiceDefault,
           onNo: choiceAlternative
        };

        var param = {
            confirmationText: question,
            yesButtonText: labelDefault,
            noButtonText: labelAlternative,
            showCancelButton: true
        };

        new XWiki.widgets.ConfirmationBox(behave, param);
    };

    var destroyDialog = Saver.destroyDialog = function (cb) {
        var $box = $('.xdialog-box.xdialog-box-confirmation'),
            $question = $box.find('.question'),
            $content = $box.find('.xdialog-content');
        if ($box.length) {
            $content.find('.button.cancel').click();
            cb && cb(true);
        } else {
            cb && cb(false);
        }
    };

    // only used within 'createSaver'
    var redirectToView = function () {
        window.location.href = window.XWiki.currentDocument.getURL('view');
    };

    // Have rtwiki call this on local edits
    var setLocalEditFlag = Saver.setLocalEditFlag = function (condition) {
        lastSaved.wasEditedLocally = condition;
    };

    var mergeRoutine = function (andThen) {
        var messages = mainConfig.messages;
                // post your current version to the server to see if it must merge
                // remember the current state so you can check if it has changed.
                var preMergeContent = mainConfig.getTextValue();
                ajaxMerge(preMergeContent, function (err, merge) {
                    if (err) {
                        if (!merge || typeof merge === 'undefined') {
                            warn("The ajax merge API did not return an object. "+
                                "Something went wrong");
                            warn(err);
                            return;
                        } else if (err === merge.error) { // there was a merge error
                            // continue and handle elsewhere
                            warn(err);
                        } else {
                            // it was some other kind of error... parsing?
                            // complain and return. this means the script failed
                            warn(err);
                            return;
                        }
                    }

                    if (isaveInterrupt()) {
                        andThen("ISAVED interrupt", null);
                        return;
                    }

                    mergedContent = merge.content;
                    if (mergedContent === lastSaved.content) {
                        // don't dead end, but indicate that you shouldn't save.
                        andThen("Merging didn't result in a change.", false);
                        setLocalEditFlag(false);
                        return;
                    }

                    var continuation = function (callback) {
                        // callback takes signature (err, shouldSave)

                        // our continuation has three cases:
                        if (isaveInterrupt()) {
                        // 1. ISAVE interrupt error
                            callback("ISAVED interrupt", null);
                        } else if (merge.saveRequired) {
                        // 2. saveRequired
                            callback(null, true);
                        } else {
                        // 3. saveNotRequired
                            callback(null, false);
                        }
                    }; // end continuation

                    // http://jira.xwiki.org/browse/RTWIKI-34
                    // Give Messages when merging
                    if (merge.merged) {
                        // a merge took place
                        if (merge.error) {
                            // but there was a conflict we'll need to resolve.
                            warn(merge.error)

                            // halt the autosave cycle to give the user time
                            // don't halt forever though, because you might
                            // disconnect and hang
                            mergeDialogCurrentlyDisplayed = true;
                            presentMergeDialog(
                                messages.mergeDialog_prompt,

                                messages.mergeDialog_keepRealtime,
                                function () {
                                    debug("User chose to use the realtime version!");
                                    // unset the merge dialog flag
                                    mergeDialogCurrentlyDisplayed = false;
                                    continuation(andThen);
                                },

                                messages.mergeDialog_keepRemote,
                                function () {
                                    debug("User chose to use the remote version!");
                                    // unset the merge dialog flag
                                    mergeDialogCurrentlyDisplayed = false;
                                    var restURL = XWiki.currentDocument.getRestURL();
                                    if (typeof $('form#edit input[name=defaultLanguage]').val() === 'undefined') {
                                      restURL = restURL + "/translations/" + $('form#edit input[name=language]').val()
                                    }

                                    $.ajax({
                                        url: restURL + '?media=json',
                                        method: 'GET',
                                        dataType: 'json',
                                        success: function (data) {
                                            mainConfig.setTextValue(data.content, true, function() {
                                                debug("Overwrote the realtime session's content with the latest saved state");
                                                bumpVersion(function () {
                                                    lastSaved.mergeMessage('merge overwrite',[]);
                                                }, null);
                                                continuation(andThen);
                                            });
                                        },
                                        error: function (err) {
                                            mainConfig.safeCrash('keepremote');
                                            warn("Encountered an error while fetching remote content");
                                            warn(err);
                                        }
                                    });
                                }
                            );
                            return; // escape from the save process
                            // when the merge dialog is answered it will continue
                        } else {
                            // it merged and there were no errors
                            if (preMergeContent !== mainConfig.getTextValue()) {
                                /* but there have been changes since merging
                                    don't overwrite if there have been changes while merging
                                    http://jira.xwiki.org/browse/RTWIKI-37 */

                                andThen("The realtime content changed while we "+
                                    "were performing our asynchronous merge.",
                                    false);
                                return; // try again in one cycle
                            } else {
                                // walk the tree of hashes and if merge.previousVersionContent
                                // exists, then this merge is quite possibly faulty

                                if (mainConfig.realtime.getDepthOfState(merge.previousVersionContent) !== -1) {
                                    debug("The server merged a version which already existed in the history. " +
                                        "Reversions shouldn't merge. Ignoring merge");

                                    debug("waseverstate=true");
                                    continuation(andThen);
                                    return;
                                } else {
                                    debug("The latest version content does not exist anywhere in our history");
                                    debug("Continuing...");
                                }

                                // there were no errors or local changes push to the textarea
                                mainConfig.setTextValue(mergedContent, false, function() {
                                  continuation(andThen);
                                });
                            }
                        }
                    } else {
                        // no merge was necessary, but you might still have to save
                        // pass in a callback...
                        continuation(andThen);
                    }
                });
    };

    var onMessage = function (data) {
        // set a flag so any concurrent processes know to abort
        lastSaved.receivedISAVE = true;

        /*  RT_event-on_isave_receive

            clients update lastSaved.version when they perform a save,
            then they send an ISAVED with the version
            a single user might have multiple windows open, for some reason
            but might still have different save cycles
            checking whether the received version matches the local version
            tells us whether the ISAVED was set by our *browser*
            if not, we should treat it as foreign.
        */

        var newSave = function (type, msg) {
            var msgSender = msg.by;
            var msgVersion = msg.version;
            var msgHash = msg.hash;
            var msgEditor = type;
            var msgEditorName = msg.editorName;

            var displaySaverName = function (isMerged) {
                // a merge dialog might be open, if so, remove it and say as much
                destroyDialog(function (dialogDestroyed) {
                    if (dialogDestroyed) {
                        // tell the user about the merge resolution
                        lastSaved.mergeMessage('conflictResolved', [msgVersion]);
                    } else if (!mainConfig.initializing) {
                        // otherwise say there was a remote save
                        // http://jira.xwiki.org/browse/RTWIKI-34
                        if(mainConfig.userList) {
                            var senderName =  msgSender;
                            var sender = msgSender.replace(/^.*-([^-]*)%2d[0-9]*$/, function(all, one) {
                              return decodeURIComponent(one);
                            });
                        }
                        if (isMerged) {
                            lastSaved.mergeMessage(
                            'savedRemote',
                            [msgVersion, sender]);
                        } else {
                            lastSaved.mergeMessage(
                            'savedRemoteNoMerge',
                            [msgVersion, sender, msgEditorName]);
                        }
                    }
                });
            };

            if (msgEditor === mainConfig.editorType) {
                if (lastSaved.version !== msgVersion) {
                    displaySaverName(true);

                    if (!mainConfig.initializing) {
                        debug("A remote client saved and "+
                            "incremented the latest common ancestor");
                    }

                    // update lastSaved attributes
                    lastSaved.wasEditedLocally = false;

                    // update the local latest Common Ancestor version string
                    lastSaved.version = msgVersion;

                    // remember the state of the textArea when last saved
                    // so that we can avoid additional minor versions
                    // there's a *tiny* race condition here
                    // but it's probably not an issue
                    lastSaved.content = mainConfig.getTextValue();
                } else {
                    lastSaved.onReceiveOwnIsave && lastSaved.onReceiveOwnIsave();
                }
                lastSaved.time = now();
            }
            else {
                displaySaverName(false);
            }
        };

        // If the channel data is empty, do nothing (initial call in onReady)
        if (Object.keys(data).length === 0) { return; }
        for (var editor in data) {
            if (typeof data[editor] !== "object" || Object.keys(data[editor]).length !== 4) { continue; } // corrupted data
            if (rtData[editor] && stringify(rtData[editor]) === stringify(data[editor])) { continue; } // no change
            newSave(editor, data[editor]);
        }
        rtData = data;

        return false;
    }; // end onMessage
    /*
        createSaver contains some of the more complicated logic in this script
        clients check for remote changes on random intervals

        if another client has saved outside of the realtime session, changes
        are merged on the server using XWiki's threeway merge algo.

        The changes are integrated into the local textarea, which replicates
        across realtime sessions.

        if the resulting state does not match the last saved content, then the
        contents are saved as a new version.

        Other members of the session are notified of the save, and the
        iesulting new version. They then update their local state to match.

        During this process, a series of checks are made to reduce the number
        of unnecessary saves, as well as the number of unnecessary merges.
    */
    var createSaver = Saver.create = function (config) {

        mainConfig.getTextValue = config.getTextValue || null;
        mainConfig.getSaveValue = config.getSaveValue || null;
        mainConfig.setTextValue = config.setTextValue || null;
        mainConfig.formId = config.formId || "edit";
        var userName = mainConfig.userName = config.userName;
        mainConfig.userList = config.userList;
        var language = mainConfig.language;
        var realtime = mainConfig.realtime = config.realtime;
        var netfluxNetwork = config.network;
        var channel = config.channel;
        var demoMode = config.demoMode;
        var firstConnection = true;

        if (typeof config.safeCrash === "function") { mainConfig.safeCrash = config.safeCrash}

        lastSaved.time = now();
        var mergeDialogCurrentlyDisplayed = false;

        var onOpen = function(chan) {
            var network = netfluxNetwork;
            // originally implemented as part of 'saveRoutine', abstracted logic
            // such that the merge/save algorithm can terminate with different
            // callbacks for different use cases
            var saveFinalizer = function (e, shouldSave) {
                var toSave = mainConfig.getTextValue();
                if (toSave === null) {
                    e = "Unable to get the content of the document. Don't save.";
                }
                if (e) {
                    warn(e);
                    return;
                } else if (shouldSave) {

                    saveDocument(mainConfig.getSaveValue(), function () {
                        // cache this because bumpVersion will increment it
                        var lastVersion = lastSaved.version;

                        // update values in lastSaved
                        updateLastSaved(toSave);

                        // get document version
                        bumpVersion(function (out){
                            if (out.version === "1.1") {
                                debug("Created document version 1.1");
                            } else {
                                debug("Version bumped from " + lastVersion +
                                    " to " + out.version + ".");
                            }
                            lastSaved.mergeMessage('saved',[out.version]);
                        }, null);
                    });
                    return;
                } else {
                    // local content matches that of the latest version
                    verbose("No save was necessary");
                    lastSaved.content = toSave;
                    // didn't save, don't need a callback
                    bumpVersion();
                    return;
                }
            };

            var saveRoutine = function (andThen, force, autosave) {
                // if this is ever true in your save routine, complain and abort
                lastSaved.receivedISAVE = false;

                var toSave = mainConfig.getTextValue();
                if (toSave === null) {
                    warn("Unable to get the content of the document. Don't save.");
                    return;
                }

                if (lastSaved.content === toSave && !force ) {
                    verbose("No changes made since last save. "+
                        "Avoiding unnecessary commits");
                    return;
                }

                if (mainConfig.mergeContent) {
                    mergeRoutine(andThen);
                }
                else {
                    andThen(null, true);
                }
            }; // end saveRoutine

            var saveButtonAction = function (cont) {
                debug("createSaver.saveand"+(cont?"view":"continue"));

                // name this flag for readability
                var force = true;
                saveRoutine(function (e, shouldSave) {
                    if (e) {
                        warn(e);
                        //return;
                    }

                    lastSaved.shouldRedirect = cont;
                    // fire save event
                    document.fire('xwiki:actions:save', {
                        form: $('#'+config.formId)[0],
                        continue: 1
                    });
                }, force);
            };

            // replace callbacks for the save and view button
            $('[name="action_save"]')
                .off('click')
                .click(function (e) {
                    e.preventDefault();
                    // arg is 'shouldRedirect'
                    saveButtonAction (true);
                });

            // replace callbacks for the save and continue button
            var $sac = $('[name="action_saveandcontinue"]');
            $sac[0].stopObserving();
            $sac.off('click').click(function (e) {
                e.preventDefault();
                // should redirect?
                saveButtonAction(false);
            });

            // there's a very small chance that the preview button might cause
            // problems, so let's just get rid of it
            $('[name="action_preview"]').remove();

            // wait to get saved event
            var onSavedHandler = mainConfig.onSaved = function (ev) {
                // this means your save has worked
                // cache the last version
                var lastVersion = lastSaved.version;
                var toSave = mainConfig.getTextValue();
                // update your content
                updateLastSaved(toSave);

                ajaxVersion(function (e, out) {
                    if (e) {
                        // there was an error (probably ajax)
                        warn(e);
                        ErrorBox.show('save');
                    } else if (out.isNew) {
                        // it didn't actually save?
                        ErrorBox.show('save');
                    } else {
                        lastSaved.onReceiveOwnIsave = function () {
                            // once you get your isaved back, redirect
                            debug("lastSaved.shouldRedirect " +
                                lastSaved.shouldRedirect);
                            if (lastSaved.shouldRedirect) {
                                debug('createSaver.saveandview.receivedOwnIsaved');
                                debug("redirecting!");
                                redirectToView();
                            } else {
                                debug('createSaver.saveandcontinue.receivedOwnIsaved');
                            }
                            // clean up after yourself..
                            lastSaved.onReceiveOwnIsave = null;
                        };
                        // bump the version, fire your isaved
                        bumpVersion(function (out) {
                            if (out.version === "1.1") {
                                debug("Created document version 1.1");
                            } else {
                                debug("Version bumped from " + lastVersion +
                                    " to " + out.version + ".");
                            }
                            lastSaved.mergeMessage("saved", [out.version]);
                        }, out);
                    }
                });
                return true;
            };
            document.stopObserving('xwiki:document:saved');
            document.observe('xwiki:document:saved', onSavedHandler);

            var onSaveFailedHandler = mainConfig.onSaveFailed = function (ev) {
                var debugLog = {
                    state: 'savedFailed',
                    lastSavedVersion: lastSaved.version,
                    lastSavedContent: lastSaved.content,
                    cUser: mainConfig.userName,
                    cContent: mainConfig.getTextValue()
                }
                ErrorBox.show('save', JSON.stringify(debugLog));
                warn("save failed!!!");
            };
            document.stopObserving('xwiki:document:saveFailed');
            document.observe("xwiki:document:saveFailed", onSaveFailedHandler);

            // TimeOut
            var check = function () {
                if (mainConfig.autosaveTimeout) { clearTimeout(mainConfig.autosaveTimeout); }
                verbose("createSaver.check");
                var periodDuration = Math.random() * SAVE_DOC_CHECK_CYCLE;
                mainConfig.autosaveTimeout = setTimeout(check, periodDuration);

                verbose("Will attempt to save again in " + periodDuration +"ms.");

                if (!lastSaved.wasEditedLocally) {
                    verbose("Skipping save routine because no changes have been made locally");
                    return;
                } else {
                    verbose("There have been local changes!");
                }
                if (now() - lastSaved.time < SAVE_DOC_TIME) {
                    verbose("(Now - lastSaved.time) < SAVE_DOC_TIME");
                    return;
                }
                // avoid queuing up multiple merge dialogs
                if (mergeDialogCurrentlyDisplayed) { return; }

                // demoMode lets the user preview realtime behaviour
                // without actually requiring permission to save
                if (demoMode) { return; }

                saveRoutine(saveFinalizer);
            }; // end check

            check();

            /* Stop the autosaver when the websocket connection is closed. If reconnecting-websocket
               manages to reconnect, update only the version. If the application using the autosaver 
               handles reconnections, it has to recreate the saver when the websockets are up again.

               NOTE: A reconnection script directly in saver.js may break the entire saving system of the
                     document. If the saver manages reconnections but not the main application, it would result
                     in merges of an offline document (with potential merge errors due to version mismatch)
            */
        };

        var rtConfig = {
            initialState : '{}',
            network : netfluxNetwork,
            userName : userName || '',
            channel : channel,
            crypto : Crypto || null
        };
        var module = window.SAVER_MODULE = {};
        mainConfig.initializing = true;
        var onRemote = rtConfig.onRemote = function (info) {
            if (mainConfig.initializing) { return; }

            try {
                var data = JSON.parse(module.realtime.getUserDoc());
                onMessage(data);
            } catch (e) {
                warn("Unable to parse realtime data from the saver", e);
            }
        };
        var onReady = rtConfig.onReady = function (info) {
            var realtime = module.realtime = info.realtime;
            module.leave = mainConfig.leaveChannel = info.leave;
            module.patchText = TextPatcher.create({
                realtime: realtime,
                logging: 'false'
            });
            try {
                var data = JSON.parse(module.realtime.getUserDoc());
                onMessage(data);
            } catch (e) {
                warn("Unable to parse realtime data from the saver", e);
            }
            mainConfig.initializing = false;
            onOpen();
        };
        var onLocal = rtConfig.onLocal = mainConfig.onLocal = function (info) {
            if (mainConfig.initializing) { return; }
            var sjson = stringify(rtData);
            module.patchText(sjson);
            if (module.realtime.getUserDoc() !== sjson) {
                warn("Saver: userDoc !== sjson");
            }
        };
        var onAbort = rtConfig.onAbort = function () {
            Saver.stop();
        }
        realtimeInput.start(rtConfig);
    }; // END createSaver

    // Stop the autosaver/merge when the user disallows realtime or when the websocket is disconnected
    Saver.stop = function() {
        if (mainConfig.realtime) { mainConfig.realtime.abort(); }
        if (mainConfig.leaveChannel) {
            mainConfig.leaveChannel();
            delete mainConfig.leaveChannel;
        }
        if (mainConfig.autosaveTimeout) { clearTimeout(mainConfig.autosaveTimeout); }
        rtData = {};
        // Remove the merge routine from the save buttons
        document.stopObserving('xwiki:document:saved');
        document.stopObserving('xwiki:document:saveFailed');
        // remove callbacks for the save and view button
        // the button will now submit the "Save and view" form
        $('[name="action_save"]').off('click')

        // replace callbacks for the save and continue button
        $('[name="action_saveandcontinue"]')
            .off('click')
            .click(function (e) {
                e.preventDefault();
                // fire save event
                document.fire('xwiki:actions:save', {
                    form: $('#'+mainConfig.formId)[0],
                    continue: 1
                });
            });
    };

    Saver.setLastSavedContent = function (content) {
        lastSaved.content = content;
    };

    return Saver;
});
