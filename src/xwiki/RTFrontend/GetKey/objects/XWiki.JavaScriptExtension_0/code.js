#set ($reference = "$!request.getParameter('reference')")
#set ($language = "$!request.getParameter('language')")
#set ($editorTypes = "$!request.getParameter('editorTypes')")
#set ($multiple = $!request.getParameter('multiple'))
#if ($reference == ""|| $language == "")
    {error:"reference: $reference, language: $language, editorTypes: $editorTypes"}
#else
    #set ($ref = $services.model.resolveDocument($reference))
    #if ("$!multiple" != "0")
        #set ($multipleEditors = true)
    #else
        #set ($multipleEditors = false)
    #end
    #set($json = $services.realtime.getChannelKey($ref, $language, $editorTypes.split(','), $multipleEditors))
    $jsontool.serialize($json)
#end