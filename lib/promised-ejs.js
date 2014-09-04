
/*!
 * promisedEJS
 * Copyright(c) 2014 David Straub <himself@davidstraub.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var utils = require('./utils'),
    path = require('path'),
    dirname = path.dirname,
    extname = path.extname,
    join = path.join,
    when = require('when'),
    nodefn = require('when/node/function'),
    fs = require('fs'),
    read = nodefn.lift && nodefn.lift(fs.readFile);

/**
 * Filters.
 *
 * @type Object
 */

var filters = exports.filters = require('./filters');

/**
 * Intermediate js cache.
 *
 * @type Object
 */

var cache = {};

/**
 * Clear intermediate js cache.
 *
 * @api public
 */

exports.clearCache = function(){
  cache = {};
};

/**
 * Translate filtered code into function calls.
 *
 * @param {String} js
 * @return {String}
 * @api private
 */

function filtered(js) {
  return js.substr(1).split('|').reduce(function(js, filter){
    var parts = filter.split(':')
      , name = parts.shift()
      , args = parts.join(':') || '';
    if (args) args = ', ' + args;
    return 'when(' + js + ').then(function (item) { return filters.' + name + '(item' + args + '); })';
  });
};

/**
 * Re-throw the given `err` in context to the
 * `str` of promised-ejs, `filename`, and `lineno`.
 *
 * @param {Error} err
 * @param {String} str
 * @param {String} filename
 * @param {String} lineno
 * @api private
 */

function rethrow(err, str, filename, lineno){
  var lines = str.split('\n')
    , start = Math.max(lineno - 3, 0)
    , end = Math.min(lines.length, lineno + 3);

  // Error context
  var context = lines.slice(start, end).map(function(line, i){
    var curr = i + start + 1;
    return (curr == lineno ? ' >> ' : '    ')
      + curr
      + '| '
      + line;
  }).join('\n');

  // Alter exception message
  var message = (filename || 'promised-ejs') + ':'
    + lineno + '\n'
    + context + '\n\n'
    + err.message;

  var newErr = err.constructor(message);
  newErr.path = filename;
  
  throw newErr;
}

/**
 * Parse the given `str` of promised-ejs, returning the function body.
 *
 * @param {String} str
 * @return {String}
 * @api public
 */

var parse = exports.parse = function(str, options){
  var options = options || {}
    , open = options.open || exports.open || '<%'
    , close = options.close || exports.close || '%>'
    , filename = options.filename
    , compileDebug = options.compileDebug !== false
    , buf = [];

  return when(str).then(function (str) {

    buf.push('var buf = [];');
    if (false !== options._with) buf.push('\nwith (locals || {}) { (function(){ ');
    buf.push('\n buf.push(\'');

    var compiledWithPromise = false;
    var lineno = 1;

    var consumeEOL = false;
    for (var i = 0, len = str.length; i < len; ++i) {
      var stri = str[i];
      if (str.slice(i, open.length + i) == open) {
        i += open.length;
    
        var prefix, postfix, line = (compileDebug ? '__stack.lineno=' : '') + lineno;
        switch (str[i]) {
          case '=':
            prefix = "', escape((" + line + ', ';
            postfix = ")), '";
            ++i;
            break;
          case '-':
            prefix = "', (" + line + ', ';
            postfix = "), '";
            ++i;
            break;
          default:
            prefix = "');" + line + ';';
            postfix = "; buf.push('";
        }

        var end = str.indexOf(close, i);
  
        if (end < 0){
          throw new Error('Could not find matching close tag "' + close + '".');
        }
  
        var js = str.substring(i, end),
            start = i,
            include = null,
            n = 0;

        if ('-' == js[js.length-1]){
          js = js.substring(0, js.length - 2);
          consumeEOL = true;
        }

        if (0 == js.trim().indexOf('include')) {
          var name = js.trim().slice(7).trim();
          if (!filename) throw new Error('filename option is required for includes');
          var path = resolveInclude(name, filename);
          include = read(path, 'utf8');
          include = exports.parse(include, { filename: path, _with: false, open: open, close: close, compileDebug: compileDebug });
          buf.push(include.then(function (include) {
            return "', (function(){" + include + "})(), '";
          }));
          compiledWithPromise = true;
          js = '';
        }

        while (~(n = js.indexOf("\n", n))) n++, lineno++;
        switch(js.substr(0, 1)) {
          case ':':
            js = filtered(js);
            break;
          case '%':
            js = " buf.push('<%" + js.substring(1).replace(/'/g, "\\'") + "%>');";
            break;
          case '#':
            js = "";
            break;
        }
        if (js) {
          if (js.lastIndexOf('//') > js.lastIndexOf('\n')) js += '\n';
          buf.push(prefix, js, postfix);
        }
        i += end - start + close.length - 1;

      } else if (stri == "\\") {
        buf.push("\\\\");
      } else if (stri == "'") {
        buf.push("\\'");
      } else if (stri == "\r") {
        // ignore
      } else if (stri == "\n") {
        if (consumeEOL) {
          consumeEOL = false;
        } else {
          buf.push("\\n");
          lineno++;
        }
      } else {
        buf.push(stri);
      }
    }

    if (false !== options._with) buf.push("'); })();\n} ");
    else buf.push("');");
    buf.push(
      "\nvar p = false; for (var i = 0, len = buf.length; i < len; i++) {" +
      " if (buf[i] && buf[i].then) { p = true; break; }" +
      "}"
    );
    buf.push("\nreturn (p ? when.all(buf) : when(buf)).then(function(buf){ return buf.join('') });");
    return compiledWithPromise ? when.all(buf) : buf;
  })
  .then(function (buf) {
    return buf.join('');
  });
};

/**
 * Compile the given `str` of promised-ejs into a `Function`.
 *
 * @param {String} str
 * @param {Object} options
 * @return {Function}
 * @api public
 */

var compile = exports.compile = function(str, options){
  options = options || {};
  var escape = options.escape || utils.escape;

  var input
    , compileDebug = options.compileDebug !== false
    , client = options.client
    , filename = options.filename
        ? JSON.stringify(options.filename)
        : 'undefined';

  if (str.then) {
    str.then(function (str) {
      input = JSON.stringify(str);
    });
  } else {
    input = JSON.stringify(str);
  }

  str = exports.parse(str, options);
  
  if (compileDebug) {
    str = str.then(function (str) {
      // Adds the fancy stack trace meta info
      return [
        'var __stack = { lineno: 1, input: ' + input + ', filename: ' + filename + ' };',
        rethrow.toString(),
        'try {',
        str,
        '} catch (err) {',
        '  rethrow(err, __stack.input, __stack.filename, __stack.lineno);',
        '}'
      ].join("\n");
    });
  }
  
  if (options.debug) str = str.then(function (str) { console.log(str); return str; });
  if (client) str = str.then(function (str) {
    return 'escape = escape || ' + escape.toString() + ';\n' +
      str;
  });

  str = str.then(function (str) {
    return 'if (typeof when === "undefined") { when = whenDep; }\n' +
      'if (!when) {' +
      '  throw new Error("promised-ejs templates require \'when\' to render.");' +
      '}\n' +
      str;
  });

  return str.then(function (str) {
    try {
      var fn = new Function('locals, filters, escape, rethrow, whenDep', str);
    } catch (err) {
      if ('SyntaxError' == err.name) {
        err.message += options.filename
          ? ' in ' + filename
          : ' while compiling promised-ejs';
      }
      throw err;
    }

    if (client) return fn;

    return function(locals){
      return fn.call(this, locals, filters, escape, rethrow, when);
    };
  });
};

/**
 * Render the given `str` of promised-ejs.
 *
 * Options:
 *
 *   - `locals`          Local variables object
 *   - `cache`           Compiled functions are cached, requires `filename`
 *   - `filename`        Used by `cache` to key caches
 *   - `scope`           Function execution context
 *   - `debug`           Output generated function body
 *   - `open`            Open tag, defaulting to "<%"
 *   - `close`           Closing tag, defaulting to "%>"
 *
 * @param {String} str
 * @param {Object} options
 * @return {String}
 * @api public
 */

exports.render = function(str, options){
  var fn
    , options = options || {};

  if (options.cache) {
    if (options.filename) {
      fn = cache[options.filename] || (cache[options.filename] = compile(str, options));
    } else {
      throw new Error('"cache" option requires "filename".');
    }
  } else {
    fn = compile(str, options);
  }

  options.__proto__ = options.locals;
  return fn.then(function (fn) {
    return fn.call(options.scope, options);
  });
};

/**
 * Render a promised-ejs file at the given `path` and callback `fn(err, str)`.
 *
 * @param {String} path
 * @param {Object|Function} options or callback
 * @param {Function} fn
 * @api public
 */

exports.renderFile = function(path, options){
  var key = path + ':string';

  options = options || {};
  options.filename = path;

  var str = options.cache
      ? cache[key] || (cache[key] = read(path, 'utf8'))
      : read(path, 'utf8');
  return exports.render(str, options);
};

/**
 * Resolve include `name` relative to `filename`.
 *
 * @param {String} name
 * @param {String} filename
 * @return {String}
 * @api private
 */

function resolveInclude(name, filename) {
  var path = join(dirname(filename), name);
  var ext = extname(name);
  if (!ext) path += '.ejs';
  return path;
}

// express support

exports.__express = function __express(path, options, fn) {
    try {
        exports.renderFile(path, options)
        .then(function (result) {
            fn(null, result);
        }, function (err) {
            fn(err);
        }).done();
    } catch (err) {
        fn(err);
    }
};

