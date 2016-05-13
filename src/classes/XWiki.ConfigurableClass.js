XClass(function (xcl, XWiki) {
  var props = XWiki.model.properties;
  xcl.addProp("categoryIcon", props.XString.create({
    "customDisplay": "",
    "picker": "0",
    "prettyName": "categoryIcon",
    "size": "30",
    "validationMessage": "",
    "validationRegExp": ""
  }));
  xcl.addProp("codeToExecute", props.TextArea.create({
    "customDisplay": "",
    "editor": "---",
    "picker": "0",
    "prettyName": "codeToExecute",
    "rows": "5",
    "size": "40",
    "validationMessage": "",
    "validationRegExp": ""
  }));
  xcl.addProp("configurationClass", props.XString.create({
    "customDisplay": "",
    "picker": "0",
    "prettyName": "configurationClass",
    "size": "30",
    "validationMessage": "",
    "validationRegExp": ""
  }));
  xcl.addProp("configureGlobally", props.XBoolean.create({
    "customDisplay": "",
    "defaultValue": "",
    "displayFormType": "checkbox",
    "displayType": "",
    "prettyName": "configureGlobally",
    "validationMessage": "",
    "validationRegExp": ""
  }));
  xcl.addProp("displayBeforeCategory", props.XString.create({
    "customDisplay": "",
    "picker": "0",
    "prettyName": "displayBeforeCategory",
    "size": "30",
    "validationMessage": "",
    "validationRegExp": ""
  }));
  xcl.addProp("displayInCategory", props.XString.create({
    "customDisplay": "",
    "picker": "0",
    "prettyName": "displayInCategory",
    "size": "30",
    "validationMessage": "",
    "validationRegExp": ""
  }));
  xcl.addProp("displayInSection", props.XString.create({
    "customDisplay": "",
    "picker": "0",
    "prettyName": "displayInSection",
    "size": "30",
    "validationMessage": "",
    "validationRegExp": ""
  }));
  xcl.addProp("heading", props.XString.create({
    "customDisplay": "",
    "picker": "0",
    "prettyName": "heading",
    "size": "30",
    "validationMessage": "",
    "validationRegExp": ""
  }));
  xcl.addProp("iconAttachment", props.XString.create({
    "customDisplay": "",
    "picker": "0",
    "prettyName": "iconAttachment",
    "size": "30",
    "validationMessage": "",
    "validationRegExp": ""
  }));
  xcl.addProp("linkPrefix", props.XString.create({
    "customDisplay": "",
    "picker": "0",
    "prettyName": "linkPrefix",
    "size": "30",
    "validationMessage": "",
    "validationRegExp": ""
  }));
  xcl.addProp("propertiesToShow", props.StaticList.create({
    "customDisplay": "",
    "displayType": "input",
    "multiSelect": "1",
    "picker": "0",
    "prettyName": "propertiesToShow",
    "relationalStorage": "1",
    "size": "20",
    "sort": "none",
    "validationMessage": "",
    "validationRegExp": ""
  }));
  xcl.addProp("sectionOrder", props.XNumber.create({
    "customDisplay": "",
    "prettyName": "sectionOrder",
    "size": "30",
    "validationMessage": "",
    "validationRegExp": ""
  }));
});