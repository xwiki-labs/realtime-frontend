/*
    This file defines functions which are used in RTWiki/RTWysiwyg, and address components
    of the user interface.
*/
define([
    'jquery'
], function ($) {
    var Interface = {};

    var debug = function (x) { console.log(x); };

    var uid = Interface.uid = function () {
        return 'realtime-uid-' + String(Math.random()).substring(2);
    };

    var setStyle = Interface.setStyle = function () {
        $('head').append([
            '<style>',
            '.realtime-merge {',
            '    float: left',
            '}',
            '#secret-merge {',
            '   opacity: 0;',
            '}',
            '#secret-merge:hover {',
            '   opacity: 1;',
            '}',
            '</style>'
         ].join(''));
    };

    var LOCALSTORAGE_DISALLOW;
    var setLocalStorageDisallow = Interface.setLocalStorageDisallow = function (key) {
        LOCALSTORAGE_DISALLOW = key;
    };

    var allowed = false;
    var realtimeAllowed = Interface.realtimeAllowed = function (bool) {
        if (typeof bool === 'undefined') {
            /*var disallow = localStorage.getItem(LOCALSTORAGE_DISALLOW);
            if (disallow) {
                return false;
            } else {
                return true;
            }*/
            return allowed;
        } else {
            //localStorage.setItem(LOCALSTORAGE_DISALLOW, bool? '' : 1);
            allowed = bool;
            return bool;
        }
    };

    var createAllowRealtimeCheckbox = Interface.createAllowRealtimeCheckbox = function (id, checked, message) {
        $('.buttons').append(
            '<div class="realtime-allow-outerdiv">' +
                '<label class="realtime-allow-label" for="' + id + '">' +
                    '<input type="checkbox" class="realtime-allow" id="' + id + '" ' +
                        checked + '" />' +
                    ' ' + message +
                '</label>' +
            '</div>'
        );
    };

    /*
        This hides a DIFFERENT autosave, not the one included in the realtime
        This is a checkbox which is off by default. We hide it so that it can't
        be turned on, because that would cause some problems.
    */
    var setAutosaveHiddenState = Interface.setAutosaveHiddenState = function (hidden) {
        var elem = $('#autosaveControl');
        if (hidden) {
            elem.hide();
        } else {
            elem.show();
        }
    };

    /*  TODO
        move into Interface (after factoring out more arguments)
        // maybe this should go in autosaver instead?
    */
    var createMergeMessageElement = Interface.createMergeMessageElement = function (container, messages) {
        setStyle();
        var id = uid();
        $(container).prepend( '<div class="realtime-merge" id="'+id+'"></div>');
        var $merges = $('#'+id);

        var timeout;

        // drop a method into the lastSaved object which handles messages
        return function (msg_type, args) {
            // keep multiple message sequences from fighting over resources
            timeout && clearTimeout(timeout);

            var formattedMessage = messages[msg_type].replace(/\{(\d+)\}/g, function (all, token) {
                // if you pass an insufficient number of arguments
                // it will return 'undefined'
                return args[token];
            });

            debug(formattedMessage);

            // set the message, handle all types
            $merges.text(formattedMessage);

            // clear the message box in five seconds
            // 1.5s message fadeout time
            timeout = setTimeout(function () {
                $merges.fadeOut(1500, function () {
                    $merges.text('');
                    $merges.show();
                });
            },10000);
        };
    };

    return Interface;
});
