XWikiObj(function (obj) {
    obj.setContent("{{velocity}}\r\n{{html clean=false}}\r\n#set ($data = {\"version\" : \"$!tdoc.version\", \"locale\" : \"$!tdoc.locale\"})\r\n#set ($webhomeRef = $services.model.resolveDocument(\"RTFrontend.WebHome\"))\r\n#set ($configObj = $xwiki.getDocument($webhomeRef).getObject('RTFrontend.ConfigurationClass'))\r\n#set ($dataConfig = {\"toolbarUserlist\" : \"$!{configObj.getProperty('toolbarUserlist').value}\", \"marginAvatar\" : \"$!{configObj.getProperty('marginAvatar').value}\"})\r\n<div style=\"display:none\" id=\"realtime-frontend-getversion\">$jsontool.serialize($data)</div>\r\n<div style=\"display:none\" id=\"realtime-frontend-getconfig\">$jsontool.serialize($dataConfig)</div>\r\n{{/html}}\r\n{{/velocity}}");
    obj.setExtensionPointId("org.xwiki.platform.template.header.after");
    obj.setName("header.rtfrontend.getVersion");
    obj.setParameters("");
    obj.setScope("wiki");
});
