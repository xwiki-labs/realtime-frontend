#set($wiki = "$!request.getParameter('wiki')")
#set($space = "$!request.getParameter('space')")
#set($page = "$!request.getParameter('page')")
#if($wiki == "" || $space == "" || $page == "")
    define({error:"wiki: $wiki, space: $space, page: $page"});
#else
    #set($ref = $services.model.createDocumentReference($wiki, $space, $page))
    define({key:"$services.websocket.getDocumentKey($ref)", error: 'none'});
#end
