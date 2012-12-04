BugTender
=========

This is a mobile frontend for Bugzilla. The JavaScript interface send all
its request to a proxy written in PHP.  The proxy in turns makes request
to a configured bugzilla installation using the JSON-RPC API.

CONFIGURE
=========

Copy config.js.sample to config.js and config.php.sample to config.php,
replace the example URLs with the one for your bugzilla installation
and you are ready to browse with your mobile device!

AUTHOR
======

Copyright Brion Vibber 2011-2012
