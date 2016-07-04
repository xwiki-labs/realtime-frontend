define([
    'jquery',
    'RTFrontend_messages'
], function ($, Messages) {

    /** Id of the element for getting debug info. */
    var DEBUG_LINK_CLS = 'rt-debug-link';

    /** Id of the div containing the user list. */
    var USER_LIST_CLS = 'rt-user-list';

    /** Id of the div containing the lag info. */
    var LAG_ELEM_CLS = 'rt-lag';

    /** The toolbar class which contains the user list, debug link and lag. */
    var TOOLBAR_CLS = 'rt-toolbar';

    var SPINNER_DISAPPEAR_TIME = 3000;
    var SPINNER = [ '-', '\\', '|', '/' ];

    var uid = function () {
        return 'rt-uid-' + String(Math.random()).substring(2);
    };

    var createRealtimeToolbar = function ($container, toolbarStyle) {
        var id = uid();
        var toolbar = $(
            '<div class="' + TOOLBAR_CLS + '" id="' + id + '">' +
                '<div class="rt-toolbar-leftside"></div>' +
                '<div class="rt-toolbar-rightside"></div>' +
            '</div>'
        );
        $container.first().prepend(toolbar);
        // Generic style :
        toolbar.append([
            '<style>',
            '.rt-toolbar-leftside div {',
            '    float: left;',
            '}',
            '.rt-toolbar-leftside {',
            '    float: left;',
            '}',
            '.rt-toolbar-rightside {',
            '    float: right;',
            '}',
            '.rt-lag {',
            '    float: right;',
            '}',
            '.rt-spinner {',
            '    float: left;',
            '}',
            '.rt-user-link {',
            '    cursor: pointer;',
            '    color: #0088CC;',
            '}',
            '.rt-user-link:hover {',
            '    text-decoration: underline;',
            '    color: #005580;',
            '}',
            '.rt-user-avatar {',
            '    vertical-align: top;',
            '    border: 1px solid #AAAAAA;',
            '    cursor: pointer;',
            '}',
            '.rt-user-fake-avatar {',
            '    width: 25px;',
            '    height: 25px;',
            '    line-height: 25px;',
            '    display: inline-block;',
            '    text-align: center;',
            '    background: #CCCCFF;',
            '    color: #3333FF;',
            '    font-size: 20px;',
            '    font-weight: bold;',
            '    cursor: pointer;',
            '    border: 1px solid #AAAAAA;',
            '}',
            '#secret-merge {',
            '   opacity: 0;',
            '}',
            '#secret-merge:hover {',
            '   opacity: 1;',
            '}',
            '</style>'
         ].join('\n'));
         // Style depending on the editor :
         toolbar.append(toolbarStyle.join('\n'));
        return toolbar;
    };

    var createSpinner = function ($container) {
        var id = uid();
        $container.append('<div class="rt-spinner" id="'+id+'"></div>');
        return $container.find('#'+id)[0];
    };

    var kickSpinner = function (spinnerElement, reversed) {
        var txt = spinnerElement.textContent || '-';
        var inc = (reversed) ? -1 : 1;
        spinnerElement.textContent = SPINNER[(SPINNER.indexOf(txt) + inc) % SPINNER.length];
        if (spinnerElement.timeout) { clearTimeout(spinnerElement.timeout); }
        spinnerElement.timeout = setTimeout(function () {
            spinnerElement.textContent = '';
        }, SPINNER_DISAPPEAR_TIME);
    };

    var createUserList = function ($container) {
        var id = uid();
        $container.append('<div class="' + USER_LIST_CLS + '" id="'+id+'"></div>');
        return $container.find('#'+id)[0];
    };

    var getOtherUsers = function(myUserName, userList, userData) {
      var i = 0;
      var list = '';
      window.mydata = userData;
      userList.forEach(function(user) {
        if(user !== myUserName) {
          var data = (userData) ? (userData[user] || null) : null;
          var userName = (data) ? data.name : null;
          userName = (userName) ? userName.replace(/^.*-([^-]*)%2d[0-9]*$/, function(all, one) {
              return decodeURIComponent(one);
            }) : null;
          if(userName) {
            if(i === 0) { list = ' : '; }
            var display = userName;
            var comma = ',';
            try {
                var config = JSON.parse($('#realtime-frontend-getconfig').html());
                var displayConfig = config.toolbarUserlist;
                display = "";
                if (displayConfig === "avatar" || displayConfig === "both") {
                    if (userData[user] && userData[user].avatar) {
                        display += '<img class="rt-user-avatar" src="' + userData[user].avatar + '?width=25" alt="" title="' + userName + '" />';
                    }
                    else if (userData[user] && userData[user].avatar === "") {
                        display += '<span class="rt-user-fake-avatar" title="' + userName + '">' + userName.substr(0,1) + '</span>';
                    }
                }
                if (displayConfig === "name" || displayConfig === "both") {
                    display += userName;
                }
                if (displayConfig === "avatar") {
                    comma = "";
                }
            } catch (e) { console.error(e); }
            var linkClass = "";
            if (config.marginAvatar == "1") { linkClass = "rt-user-link"; }
            list += '<span class="' + linkClass + '" data-id="' + user + '">' + display + '</span>' + comma + ' ';
            i++;
          }
        }
      });
      return (i > 0) ? list.slice(0, -2) : list;
    };

    var updateUserList = function (myUserName, listElement, userList, userData, onUsernameClick) {
        var meIdx = userList.indexOf(myUserName);
        if (meIdx === -1) {
            listElement.textContent = Messages.synchronizing;
            return;
        }
        if (userList.length === 1) {
            listElement.innerHTML = Messages.editingAlone;
        } else if (userList.length === 2) {
            listElement.innerHTML = Messages.editingWithOneOtherPerson + getOtherUsers(myUserName, userList, userData);
        } else {
            listElement.innerHTML = Messages.editingWith + ' ' + (userList.length - 1) + ' ' + Messages.otherPeople + getOtherUsers(myUserName, userList, userData);
        }
        $('.rt-user-link').off('click');
        $('.rt-user-link').on('click' , function() {
            if (typeof onUsernameClick !== "undefined") { onUsernameClick($(this).attr('data-id')); }
            else if ($('iframe').length) {
                var basehref = $('iframe')[0].contentWindow.location.href.split('#')[0] || "";
                $('iframe')[0].contentWindow.location.href = basehref + "#rt-user-" + $(this).attr('data-id');
            }
        });
    };

    var createLagElement = function ($container) {
        var id = uid();
        $container.append('<div class="' + LAG_ELEM_CLS + '" id="'+id+'"></div>');
        return $container.find('#'+id)[0];
    };

    var checkLag = function (getLag, lagElement) {
        if(typeof getLag !== "function") { return; }
        var lag = getLag();
        var lagMsg = Messages.lag + ' ';
        if(lag != null && typeof lag !== "undefined") {
          var lagSec = lag/1000;
          if (lag.waiting && lagSec > 1) {
              lagMsg += "?? " + Math.floor(lagSec);
          } else {
              lagMsg += lagSec;
          }
        }
        else {
          lagMsg += "??";
        }
        lagElement.textContent = lagMsg;
    };

    var create = function ($container, myUserName, realtime, getLag, userList, config, toolbarStyle) {
        var toolbar = createRealtimeToolbar($container, toolbarStyle);
        var userListElement = createUserList(toolbar.find('.rt-toolbar-leftside'));
        var spinner = createSpinner(toolbar.find('.rt-toolbar-rightside'));
        var lagElement = createLagElement(toolbar.find('.rt-toolbar-rightside'));
        var userData = config.userData;
        var changeNameID = config.changeNameID;
        var onUsernameClick = config.onUsernameClick || undefined;

        // Check if the user is allowed to change his name
        if(changeNameID) {
            // Create the button and update the element containing the user list
            userListElement = createChangeName($container, userListElement, changeNameID);
        }

        var connected = false;

        userList.change.push(function(newUserData) {
          var users = userList.users;
          if (users.indexOf(myUserName) !== -1) { connected = true; }
          if (!connected) { return; }
          if(newUserData) { // Someone has changed his name/color
            userData = newUserData;
          }
          updateUserList(myUserName, userListElement, users, userData, onUsernameClick);
        });

        var ks = function () {
            if (connected) { kickSpinner(spinner, false); }
        };

        realtime.onPatch(ks);
        // Try to filter out non-patch messages, doesn't have to be perfect this is just the spinner
        realtime.onMessage(function (msg) { if (msg.indexOf(':[2,') > -1) { ks(); } });

        setInterval(function () {
            if (!connected) { return; }
            checkLag(getLag, lagElement);
        }, 3000);

        return {
            toolbar: toolbar,
            failed: function () {
                connected = false;
                userListElement.textContent = '';
                lagElement.textContent = '';
            },
            reconnecting: function () {
                connected = false;
                userListElement.textContent = Messages.reconnecting;
                lagElement.textContent = '';
            },
            connected: function () {
                connected = true;
            }
        };
    };

    return { 
        create: create,
        TOOLBAR_CLS: TOOLBAR_CLS,
        DEBUG_LINK_CLS: DEBUG_LINK_CLS
    };
});
