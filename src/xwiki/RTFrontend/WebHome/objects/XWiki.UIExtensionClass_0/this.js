XWikiObj(function (obj) {
    obj.setContent("{{velocity}}\n{{html clean=false}}\n#set ($data = {\"version\" : \"$!tdoc.version\", \"locale\" : \"$!tdoc.locale\"})\n<div style=\"display:none\" id=\"realtime-frontend-getversion\">$jsontool.serialize($data)</div>\n{{/html}}\n{{/velocity}}");
    obj.setExtensionPointId("org.xwiki.platform.template.header.after");
    obj.setName("header.rtfrontend.getVersion");
    obj.setParameters("");
    obj.setScope("wiki");
});
