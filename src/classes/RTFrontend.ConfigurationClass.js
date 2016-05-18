XClass(function (xcl, XWiki) {
  var props = XWiki.model.properties;
  xcl.addProp("allowMultipleEditors", props.XBoolean.create({
    "customDisplay": "",
    "defaultValue": "",
    "displayFormType": "checkbox",
    "displayType": "",
    "prettyName": "Allow different types of editors (wysiwyg, wiki, etc.) at the same time",
    "validationMessage": "",
    "validationRegExp": ""
  }));
});