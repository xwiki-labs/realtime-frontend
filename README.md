# XWiki Realtime Frontend

Common components for building realtime applications in XWiki.

[![XWiki labs logo](https://raw.githubusercontent.com/xwiki-labs/xwiki-labs-logo/master/projects/xwikilabs/xwikilabsproject.png "XWiki labs")](https://labs.xwiki.com/xwiki/bin/view/Projects/XWikiLabsProject)

Although it is **recommended** to install this application from the XWiki Extension Manager,
you can build and install it manually using [XWiki Tools][xwiki-tools] to construct the .xar file.

If you decide to install it manually, first you have to install the [XWiki Realtime Backend][rtbackend]
server in your wiki using the Extension Manager. Then you have to get all the JavaScript dependencies
using Bower. Finally you can build the .xar file with XWiki Tools:

    # First make sure you have XWiki Tools and Bower installed and up-to-date
    npm install -g xwiki-tools
    npm install -g bower

    # Then download all the dependencies using Bower
    bower install

    # Finally, build the XAR and import it in your wiki
    xargen
    # Alternatively you can build and import in one operation using:
    xargen --post User:password@mywikidomain.name:8080/xwiki
    # Or generate a Maven compatible build using:
    xargen -mvn

[rtbackend]: http://extensions.xwiki.org/xwiki/bin/view/Extension/Realtime+Netflux+Backend/
[xwiki-tools]: https://github.com/xwiki-contrib/xwiki-tools-node
