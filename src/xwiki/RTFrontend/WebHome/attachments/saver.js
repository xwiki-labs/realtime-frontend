define([
    'RTFrontend_netflux',
    'RTFrontend_errorbox',
    'jquery',
], function (Netflux, ErrorBox, $) {
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

    var lastSaved = Saver.lastSaved = {
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

    var isSaving = false;

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
                    ErrorBox.show('parse');
                    warn(err);
                    cb(err, data);
                }
            },
            data: stats,
            error: function (err) {
                ErrorBox.show('velocity');
                warn(err);
                isSaving = false;
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
                isSaving = false;
                cb(err, null);
            }
        });
    };

    var bumpVersion = function (cb, versionData) {
        var callback = function (e, out) {
            if (e) {
                mainConfig.safeCrash('updateversion');
                warn(e);
            } else if (out) {
                debug("Triggering lastSaved refresh on remote clients");
                lastSaved.version = out.version;
                lastSaved.content = out.content;
                var contentHash = (mainConfig.chainpad && mainConfig.chainpad.hex_sha256) ? mainConfig.chainpad.hex_sha256(out.content) : "";
                saveMessage(mainConfig.webChannel, mainConfig.channel, lastSaved.version, contentHash);
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
                isSaving = false;
                ErrorBox.show('save');
                warn(err);
                // Don't callback, this way in case of error we will keep trying.
                //andThen();
            }
        });
    };

    var ISAVED = 1;
    // sends an ISAVED message
    var saveMessage = function (wc, channel, version, hash) {
        if (!wc) { return; }
        // show(saved(version))
        var msg = [ISAVED, mainConfig.userName, version, hash, mainConfig.editorType, mainConfig.editorName];
        wc.bcast(JSON.stringify(msg)).then(function() {
          // Send the message back to Chainpad once it is sent to the recipients.
          onMessage(JSON.stringify(msg), wc.myID);
        }, function(err) {
          // The message has not been sent, display the error.
          console.error(err);
        });
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
                            isSaving = false;
                            return;
                        } else if (err === merge.error) { // there was a merge error
                            // continue and handle elsewhere
                            warn(err);
                        } else {
                            // it was some other kind of error... parsing?
                            // complain and return. this means the script failed
                            warn(err);
                            isSaving = false;
                            return;
                        }
                    }

                    if (isaveInterrupt()) {
                        andThen("ISAVED interrupt", null);
                        isSaving = false;
                        return;
                    }

                    mergedContent = merge.content;
                    if (mergedContent === lastSaved.content) {
                        // don't dead end, but indicate that you shouldn't save.
                        andThen("Merging didn't result in a change.", false);
                        setLocalEditFlag(false);
                        isSaving = false;
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

                                    $.ajax({
                                        url: XWiki.currentDocument.getRestURL()+'?media=json',
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
                                            isSaving = false;
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
                                isSaving = false;
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

    var onMessage = function (data, sender) {
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

        // msg : [ISAVED, version, hash, editorType]
        var msg;
        try { msg = JSON.parse(data); } catch (e) { warn(e.stack);return; }
        var msgType = msg[0];
        var msgSender = msg[1];
        var msgVersion = msg[2];
        var msgHash = msg[3];
        var msgEditor = msg[4];
        var msgEditorName = msg[5];

        if (msgType !== ISAVED) { return; }

        var displaySaverName = function (isMerged) {
            // a merge dialog might be open, if so, remove it and say as much
            destroyDialog(function (dialogDestroyed) {
                if (dialogDestroyed) {
                    // tell the user about the merge resolution
                    lastSaved.mergeMessage('conflictResolved', [msgVersion]);
                } else {
                    // otherwise say there was a remote save
                    // http://jira.xwiki.org/browse/RTWIKI-34
                    if(mainConfig.userList) {
                        var senderData = mainConfig.userList[sender];
                        var senderName = senderData ? senderData.name : msgSender;
                        sender = (senderName) ? senderName.replace(/^.*-([^-]*)%2d[0-9]*$/, function(all, one) {
                          return decodeURIComponent(one);
                        }) : sender;
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

                debug("A remote client saved and "+
                    "incremented the latest common ancestor");

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
            /*lastSaved.receivedISAVE = false;
            mergeRoutine(function(e) {
                setLocalEditFlag(false);
                lastSaved.version = msgVersion;
                lastSaved.content = getTextValue();
                if(e) { warn(e); }
            });*/
        }
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
        mainConfig.userName = config.userName;
        mainConfig.userList = config.userList;
        var language = mainConfig.language;
        var realtime = mainConfig.realtime = config.realtime;
        var netfluxNetwork = config.network;
        var channel = mainConfig.channel = config.channel;
        var demoMode = config.demoMode;
        var firstConnection = true;

        if (typeof config.safeCrash === "function") { mainConfig.safeCrash = config.safeCrash}

        lastSaved.time = now();
        var mergeDialogCurrentlyDisplayed = false;

        var onOpen = function(chan) {
            var network = netfluxNetwork;
            mainConfig.webChannel = chan;
            // originally implemented as part of 'saveRoutine', abstracted logic
            // such that the merge/save algorithm can terminate with different
            // callbacks for different use cases
            var saveFinalizer = function (e, shouldSave) {
                var toSave = mainConfig.getTextValue();
                if (e) {
                    warn(e);
                    isSaving = false;
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
                        isSaving = false;
                    });
                    return;
                } else {
                    // local content matches that of the latest version
                    verbose("No save was necessary");
                    lastSaved.content = toSave;
                    // didn't save, don't need a callback
                    bumpVersion();
                    isSaving = false;
                    return;
                }
            };

            var resetIsSaving;
            var saveRoutine = function (andThen, force, autosave) {
                // if this is ever true in your save routine, complain and abort
                lastSaved.receivedISAVE = false;

                var toSave = mainConfig.getTextValue();
                if (lastSaved.content === toSave && !force ) {
                    verbose("No changes made since last save. "+
                        "Avoiding unnecessary commits");
                    return;
                }

                if (isSaving) {
                    if (!autosave) { warn("You tried to save while the document is already being saved. "+
                            "Aborting the new instruction."); }
                    return;
                }
                isSaving = true;

                // Set a timeout to enable the save after 10sec if there was an unexpected error
                if (resetIsSaving) { clearTimeout(resetIsSaving); }
                resetIsSaving = window.setTimeout(function() {
                    if (isSaving) {
                        ErrorBox.show('save');
                        warn("TIMEOUT: Save lock removed after 5sec. The previous save has failed and it is now possible to try again.");
                        isSaving = false;
                    }
                }, 5000);

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
                        isSaving = false;
                        warn(e);
                        ErrorBox.show('save');
                    } else if (out.isNew) {
                        // it didn't actually save?
                        isSaving = false;
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
                                isSaving = false;
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
            document.observe('xwiki:document:saved', onSavedHandler);

            var onSaveFailedHandler = mainConfig.onSaveFailed = function (ev) {
                ErrorBox.show('save');
                warn("save failed!!!");
                isSaving = false;
            };
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
            network.on('disconnect', Saver.stop);

            network.on('reconnect', function (uid) {
                ajaxVersion(function (e, out) {
                    lastSaved.version = out.version;
                    lastSaved.content = out.content;
                });
            });
        };

        netfluxNetwork.join(channel).then(function(chan) {
            chan.on('message', onMessage);
            onOpen(chan);
        }, function(err) {
            warn(err);
        });
    }; // END createSaver

    Saver.stop = function() {
        mainConfig.mergeContent = false;
        if (mainConfig.realtime) { mainConfig.realtime.abort(); }
        if (mainConfig.webChannel) {
            mainConfig.webChannel.leave();
            delete mainConfig.webChannel;
        }
        if (mainConfig.autosaveTimeout) { clearTimeout(mainConfig.autosaveTimeout); }

        // Remove the merge routine from the save buttons
        document.stopObserving('xwiki:document:saved', mainConfig.onSaved);
        document.stopObserving('xwiki:document:saveFailed', mainConfig.onSaveFailed);
        // replace callbacks for the save and view button
        $('[name="action_save"]')
            .off('click')
            .click(function (e) {
                e.preventDefault();
                // fire save event
                document.fire('xwiki:actions:save', {
                    form: $('#'+mainConfig.formId)[0],
                    continue: 0
                });
            });

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
