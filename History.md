0.0.22 / 2014-09-04
==================

 * Update dependency on cujojs/when to use caret semver

0.0.20 / 2014-09-04
==================

 * Add promise support for filter args
 * Update with upstream changes from visionmedia/ejs
 * Update dependency on cujojs/when

0.0.19 / 2014-06-18
==================

 * Fix issue with rethrow() when using promises

0.0.14 / 2014-02-03
==================

 * Update dependency on when

0.0.12 / 2014-01-29
==================

 * Template function cleanup
 * Fix incorrect name in rendering error
 * Revoke support for node 0.6 (sorry)

0.0.10 / 2014-01-23
==================

 * Fixed naming issue in compile script that caused an error in the client-side JS files
 * Fixed compile script to inject when via `require.register()`
 * Fixed compile script to stub require of 'when/node/function'
 * Fixed nodefn.lift call in client-side script
 * Optimize compile when not using promise functionality
 * Optimize render when not using promise functionality

0.0.1 / 2014-01-22
==================

 * Added promises support via cujojs/when
 * Forked from visionmedia/ejs
