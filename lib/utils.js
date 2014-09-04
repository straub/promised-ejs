
/*!
 * promisedEJS
 * Copyright(c) 2014 David Straub <himself@davidstraub.com>
 * MIT Licensed
 */

 /**
  * Module dependencies.
  */

var when = require('when'),
    whenDep; // Stub so client-side when lib can be included.

/**
 * Escape the given string of `html`.
 *
 * @param {String} html
 * @return {String}
 * @api private
 */

exports.escape = function(html){
  return when(html).then(function (str) {
    return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;');
  });
};
 
