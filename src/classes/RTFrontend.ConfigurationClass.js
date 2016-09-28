XClass(function (xcl, XWiki) {
  var props = XWiki.model.properties;
  xcl.setCustomClass("");
  xcl.setCustomMapping("");
  xcl.setDefaultViewSheet("");
  xcl.setDefaultEditSheet("");
  xcl.setDefaultWeb("");
  xcl.setNameField("");
  xcl.setValidationScript("");
  xcl.addProp("useGlobalConfig", props.XBoolean.create({
    "customDisplay": "",
    "defaultValue": "",
    "displayFormType": "checkbox",
    "displayType": "",
    "prettyName": "Use the main wiki configuration",
    "validationMessage": "",
    "validationRegExp": ""
  }));
  xcl.addProp("toolbarUserlist", props.StaticList.create({
    "customDisplay": "",
    "picker": "0",
    "prettyName": "Connected user list in the toolbar",
    "separators": "|, ",
    "sort": "none",
    "validationMessage": "",
    "validationRegExp": "",
    "values": "name=Display only usernames|avatar=Display only avatars|both=Display usernames and avatars"
  }));
  xcl.addProp("marginAvatar", props.XBoolean.create({
    "customDisplay": "",
    "defaultValue": "",
    "displayFormType": "checkbox",
    "displayType": "",
    "prettyName": "Show avatars in the margin (if available)",
    "validationMessage": "",
    "validationRegExp": ""
  }));
});
