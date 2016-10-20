define(function () {
    var module = { exports: {} };

    // VELOCITY
    var PAGE_CONTENT = "$escapetool.javascript($doc.getRenderedContent())";
    // END VELOCITY

    /** different types of popups, see RTWysiwyg.ErrorBox content */
    var ELEMS = [ 'error', 'disconnected', 'debuglog', 'merge', 'parse', 'unavailable', 'save', 'velocity', 'updateversion', 'keepremote', 'converthtml'];

    var modal;

    var ModalPopup = Class.create(XWiki.widgets.ModalPopup, {
        /** Default parameters can be added to the custom class. */
        defaultInteractionParameters : {
        },

        /** Constructor. Registers the key listener that pops up the dialog. */
        initialize : function($super, interactionParameters) {
            this.interactionParameters =
                Object.extend(Object.clone(this.defaultInteractionParameters),
                                           interactionParameters || {});

            // call constructor from ModalPopup with params content, shortcuts, options
            $super(this.createContent(this.interactionParameters), {
                    "show"  : { method : this.showDialog,  keys : [] },
                    "close" : { method : this.closeDialog, keys : ['Esc'] }
                },
                {
                    displayCloseButton : true,
                    verticalPosition : "top",
                    backgroundColor : "#FFF"
                }
            );
            this.showDialog();
            modal = this;
        },

        /** Get the content of the modal dialog using ajax */
        createContent : function (data) {
            var elem = new Element('div', {'class': 'modal-popup'});
            setTimeout(function () { data.then(elem); }, 0);
            return elem;
        }
    });


    var pageElem = document.createElement('div');
    pageElem.innerHTML = PAGE_CONTENT;
    var elems = {};
    for (var i = 0; i < ELEMS.length; i++) {
        elems[ELEMS[i]] = pageElem.getElementsByClassName('realtime-' + ELEMS[i])[0];
    }

    var show = module.exports.show = function (type, debugLog) {

        new ModalPopup({ then: function (elem) {
            for (var name in elems) {
                if (type !== name) { continue; }
                elem.appendChild(elems[name]);
                if (debugLog) {
                    elem.appendChild(elems['debuglog']);
                    var data = elem.getElementsByClassName('realtime-debug')[0];
                    data.value = debugLog;
                }
                return;
            }
            elem.textContent = "error of unknown type ["+type+"]";
        }});
    };

    var hide = module.exports.hide = function () {
        modal.closeDialog();
    };

    return module.exports;
});
