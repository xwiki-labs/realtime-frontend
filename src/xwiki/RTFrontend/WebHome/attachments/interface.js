/*
    This file defines functions which are used in RTWIKI, and address components
    of the user interface.
*/
define([
    'jquery'
], function ($) {
    var Interface = {};

    var debug = function (x) { console.log(x); };

    var uid = Interface.uid = function () {
        return 'rtwiki-uid-' + String(Math.random()).substring(2);
    };

    var setStyle = Interface.setStyle = function () {
        $('head').append([
            '<style>',
            '.rtwiki-merge {',
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

    var createAllowRealtimeCheckbox = Interface.createAllowRealtimeCheckbox = function (id, checked, message) {
        $('#mainEditArea .buttons').append(
            '<div class="rtwiki-allow-outerdiv">' +
                '<label class="rtwiki-allow-label" for="' + id + '">' +
                    '<input type="checkbox" class="rtwiki-allow" id="' + id + '" ' +
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
        var id = uid();
        $(container).prepend( '<div class="rtwiki-merge" id="'+id+'"></div>');
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
