XClass(function (xcl, XWiki) {
  var props = XWiki.model.properties;
  xcl.addProp("allowMultipleEditors", props.XBoolean.create({
    "customDisplay": "",
    "defaultValue": "",
    "displayFormType": "checkbox",
    "displayType": "",
    "prettyName": "Allow multiple realtime editors at the same time for one document",
    "validationMessage": "",
    "validationRegExp": ""
  }));
});