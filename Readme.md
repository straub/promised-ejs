# promisedEJS

Embedded JavaScript templates, with promise-based compiling and rendering via [cujojs/when](https://github.com/cujojs/when/).

[![Build Status](https://travis-ci.org/straub/promised-ejs.png)](https://travis-ci.org/straub/promised-ejs)

## Installation

    $ npm install promised-ejs

## Features

  * Complies with the [Express](http://expressjs.com) view system
  * Static caching of intermediate JavaScript
  * Unbuffered code for conditionals etc `<% code %>`
  * Escapes html by default with `<%= code %>`
  * Unescaped buffering with `<%- code %>`
  * Supports tag customization
  * Filter support for designer-friendly templates
  * Includes
  * Client-side support (requires [when library](https://github.com/cujojs/when/))
  * Newline slurping with `<% code -%>` or `<% -%>` or `<%= code -%>` or `<%- code -%>`

## Example

    <% if (user) { %>
	    <h2><%= user.name %></h2>
    <% } %>
    

## Usage

    var fn = promisedEJS.compile(str, options);
    // => Promise for Function
    
    fn.then(function (fn) {
        // Template rendering is promise-based too.
        return fn({ foo: 'bar' });
    })
    .then(function (html) {
        document.getElementById('foo').innerHTML = html;
    });

    var html = promisedEJS.render(str, options);
    // => Promise for str
    
    html.then(function (html) {
        document.getElementById('foo').innerHTML = html;
    });

Or, with [Express](http://expressjs.com/):

    var express = require('express'),
        promisedEJS = require('promised-ejs'),
        app = express();
    
    // Assign the promised-ejs engine to .ejs files.
    app.engine('ejs', promisedEJS.__express);
    
    app.set('view engine', 'ejs');

## Options

  - `cache`           Compiled functions are cached, requires `filename`
  - `filename`        Used by `cache` to key caches
  - `scope`           Function execution context
  - `debug`           Output generated function body
  - `compileDebug`    When `false` no debug instrumentation is compiled
  - `client`          Returns standalone compiled function (requires [when library](https://github.com/cujojs/when/))
  - `open`            Open tag, defaulting to "<%"
  - `close`           Closing tag, defaulting to "%>"
  - *                 All others are template-local variables

## Includes

 Includes are relative to the template with the `include` statement,
 for example if you have "./views/users.ejs" and "./views/user/show.ejs"
 you would use `<% include user/show %>`. The included file(s) are literally
 included into the template, _no_ IO is performed after compilation, thus
 local variables are available to these included templates.

```
<ul>
  <% users.forEach(function(user){ %>
    <% include user/show %>
  <% }) %>
</ul>
```

## Custom delimiters

Custom delimiters can also be applied globally:

    var ejs = require('ejs');
    ejs.open = '{{';
    ejs.close = '}}';

Which would make the following a valid template:

    <h1>{{= title }}</h1>

## Filters

EJS conditionally supports the concept of "filters". A "filter chain"
is a designer friendly api for manipulating data, without writing JavaScript.

Filters can be applied by supplying the _:_ modifier, so for example if we wish to take the array `[{ name: 'tj' }, { name: 'mape' },  { name: 'guillermo' }]` and output a list of names we can do this simply with filters:

Template:

    <p><%=: users | map:'name' | join %></p>

Output:

    <p>Tj, Mape, Guillermo</p>

Render call:

    ejs.render(str, {
        users: [
          { name: 'tj' },
          { name: 'mape' },
          { name: 'guillermo' }
        ]
    });

Or perhaps capitalize the first user's name for display:

    <p><%=: users | first | capitalize %></p>

## Filter list

Currently these filters are available:

  - first
  - last
  - capitalize
  - downcase
  - upcase
  - sort
  - sort_by:'prop'
  - size
  - length
  - plus:n
  - minus:n
  - times:n
  - divided_by:n
  - join:'val'
  - truncate:n
  - truncate_words:n
  - replace:pattern,substitution
  - prepend:val
  - append:val
  - map:'prop'
  - reverse
  - get:'prop'

## Adding filters

 To add a filter simply add a method to the `.filters` object:
 
```js
ejs.filters.last = function(obj) {
  return obj[obj.length - 1];
};
```

## Layouts

  Currently EJS has no notion of blocks, only compile-time `include`s,
  however you may still utilize this feature to implement "layouts" by
  simply including a header and footer like so:

```html
<% include head %>
<h1>Title</h1>
<p>My page</p>
<% include foot %>
```

## client-side support

  include `./ejs.js` or `./ejs.min.js` and `require("ejs").compile(str)`.

## License 

[MIT](http://straub.mit-license.org/)

![Analytics](https://analytics.straubdev.com/piwik.php?idsite=6&rec=1&action_name=promised-ejs%2FREADME)
