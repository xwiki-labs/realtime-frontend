#set ($wiki = "$!request.getParameter('wiki')")
#set ($space = "$!request.getParameter('space')")
#set ($page = "$!request.getParameter('page')")
#set ($language = "$!request.getParameter('language')")
#set ($editorTypes = "$!request.getParameter('editorTypes')")
#set ($multiple = $request.getParameter('multiple'))
#if ($wiki == "" || $space == "" || $page == "" || $language == "")
    define({error:"wiki: $wiki, space: $space, page: $page, language: $language, editorTypes: $editorTypes"});
#else
    #set ($ref = $services.model.createDocumentReference($wiki, $space, $page))
    ##
    ## $allTypes contains all the existing channel types, depending on the installed extensions.
    ## $editorTypes contains the channel types we intend to join
    ## "events" is a channel type for the autosave "ISAVED" messages
    #set ($allTypes = ["events"])
    #set ($rtwiki = $services.extension.installed.getInstalledExtensions().toString().contains(":rtwiki-"))
    #if ($rtwiki)
        #set ($discard = $allTypes.add('rtwiki'))
    #end
    #set ($rtwysiwyg = $services.extension.installed.getInstalledExtensions().toString().contains(":rtwysiwyg-"))
    #if ($rtwysiwyg)
        #set ($discard = $allTypes.add('rtwysiwyg'))
    #end
    #set ($rtform = $services.extension.installed.getInstalledExtensions().toString().contains(":rtform-"))
    #if ($rtform)
        #set ($discard = $allTypes.add('rtform'))
    #end
    ##
    #set ($keys = {})
    #set ($mymap = {})
    ##
    ## Check "edit" rights
    #set ($testKey = $services.realtime.getChannelKey($ref, $language, "events", false))
    #if ("$!testKey.error" == "EPERM")
        ## The current user doesn't have edit rights for that document
        #set ($mymap["error"] = "EPERM")
    #else
        ## Get the keys for existing channels
        #foreach ($editor in $collectionstool.disjunction($allTypes, $editorTypes))
            #if ($allTypes.contains($editor))
                #set ($key = $services.realtime.getChannelKey($ref, $language, $editor, false))
                #if ("$!key.key" != "" && "$!key.error" == "")
                    #set ($keys["$editor"] = $key)
                #end
            #end
        #end
        #set ($editors = $editorTypes.split(','))
        ##
        ## Check if multiple editors are allowed or if there is no active session
        #if ("$!multiple" != "0" || $keys.keySet().size() == 0 || $keys == ["events"])
            ## Get the requested keys : create them if the channel doesn't exist
            #foreach ($editor in $editors)
                #if ($allTypes.contains($editor))
                    #set ($key = $services.realtime.getChannelKey($ref, $language, $editor, true))
                    #if ("$!key.error" == "")
                        #set ($keys["$editor"] = $key)
                    #end
                #end
            #end
        #end
        ##
        #set ($mymap["keys"] = $keys)
    #end
    define($jsontool.serialize($mymap));
#end