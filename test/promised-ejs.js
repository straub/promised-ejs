/**
 * Module dependencies.
 */

var ejs = require('..'),
    fs = require('fs'),
    read = fs.readFileSync,
    chai = require('chai'),
    assert = chai.assert,
    chaiAsPromised = require("chai-as-promised"),
    when = require('when'),
    delay = require('when/delay');
    require('when/monitor/console');

chai.use(chaiAsPromised);

chai.should();

/**
 * Load fixture `name`.
 */

function fixture(name) {
  return read('test/fixtures/' + name, 'utf8').replace(/\r/g, '');
}

/**
 * User fixtures.
 */

var users = [];
users.push({ name: 'tobi' });
users.push({ name: 'loki' });
users.push({ name: 'jane' });

describe('ejs.compile(str, options)', function(){
  it('should compile to a promise for a function', function(){
    var fn = ejs.compile('<p>yay</p>');
    fn.should.eventually.be.a('function');
    return fn.then(function (fn) {
      return fn().should.eventually.equal('<p>yay</p>');
    });
  });

  it('should reject if there are syntax errors', function(){
    var promiseOne =  ejs.compile(fixture('fail.ejs'));
    promiseOne.should.be.rejected;

    var promiseTwo = ejs.compile(fixture('fail.ejs'), { filename: 'fail.ejs' });
    promiseTwo.should.be.rejected;

    return when.all(
      promiseOne.catch(function (err) {
        return err.message.should.include('compiling promised-ejs');
      }),
      promiseTwo.catch(function (err) {
        return err.message.should.include('fail.ejs');
      })
    );

  });

  it('should allow customizing delimiters', function(){
    var promises = [];

    var fn = ejs.compile('<p>{= name }</p>', { open: '{', close: '}' });
    promises.push(fn.then(function (fn) {
      return fn({ name: 'tobi' }).should.eventually.equal('<p>tobi</p>');
    }));

    var fn = ejs.compile('<p>::= name ::</p>', { open: '::', close: '::' });
    promises.push(fn.then(function (fn) {
      return fn({ name: 'tobi' }).should.eventually.equal('<p>tobi</p>');
    }));

    var fn = ejs.compile('<p>(= name )</p>', { open: '(', close: ')' });
    promises.push(fn.then(function (fn) {
      return fn({ name: 'tobi' }).should.eventually.equal('<p>tobi</p>');
    }));

    return when.all(promises);
  });

  it('should default to using ejs.open and ejs.close', function(){
    var promises = [];

    ejs.open = '{';
    ejs.close = '}';
    var fn = ejs.compile('<p>{= name }</p>');
    promises.push(fn.then(function (fn) {
      return fn({ name: 'tobi' }).should.eventually.equal('<p>tobi</p>');
    }));

    var fn = ejs.compile('<p>|= name |</p>', { open: '|', close: '|' });
    promises.push(fn.then(function (fn) {
      return fn({ name: 'tobi' }).should.eventually.equal('<p>tobi</p>');
    }));

    return when.all(promises).finally(function () {
      delete ejs.open;
      delete ejs.close;
    });
  });

  it('should have a working client option', function(){
    var fn = ejs.compile('<p><%= foo %></p>', { client: true });
    return fn.then(function (fn) {
      var str = fn.toString();

      eval('var preFn = ' + str);

      return preFn({ foo: 'bar' }).should.eventually.equal('<p>bar</p>');
    });
  });

  it('rendering with client option should throw w/o when', function(){
    var fn = ejs.compile('<p><%= foo %></p>', { client: true });
    return fn.then(function (fn) {
      var when,
          str = fn.toString();

      eval('var preFn = ' + str);

      return preFn.should.throw(/templates require 'when'/);
    });
  });
});

describe('ejs.render(str, options)', function(){
  it('should render the template', function(){
    return ejs.render('<p>yay</p>')
      .should.eventually.equal('<p>yay</p>');
  });

  it('should accept locals', function(){
    return ejs.render('<p><%= name %></p>', { name: 'tobi' })
      .should.eventually.equal('<p>tobi</p>');
  });

  it('should accept locals that are promises', function(){
    var userName = delay(10, 'tobi');
    return ejs.render('<p><%= name %></p>', { name: userName })
      .should.eventually.equal('<p>tobi</p>');
  });
});

describe('ejs.renderFile(path, options, fn)', function(){
  it('should render a file', function(){
    return ejs.renderFile('test/fixtures/para.ejs')
      .should.eventually.equal('<p>hey</p>');
  });

  it('should accept locals', function(){
    var options = { name: 'tj', open: '{', close: '}' };
    return ejs.renderFile('test/fixtures/user.ejs', options)
      .should.eventually.equal('<h1>tj</h1>');
  });

  it('should accept locals that are promises', function(){
    var userName = delay(10, 'tj');
    var options = { name: userName, open: '{', close: '}' };
    return ejs.renderFile('test/fixtures/user.ejs', options)
      .should.eventually.equal('<h1>tj</h1>');
  });
});

describe('<%=', function(){

  it('should escape &amp;<script>', function(){
    ejs.render('<%= name %>', { name: '&nbsp;<script>' })
      .should.eventually.equal('&amp;nbsp;&lt;script&gt;');
  });

  it("should escape '", function(){
    ejs.render('<%= name %>', { name: "The Jones's" })
      .should.eventually.equal('The Jones&#39;s');
  });
  
  it("should escape &foo_bar;", function(){
    ejs.render('<%= name %>', { name: "&foo_bar;" })
      .should.eventually.equal('&amp;foo_bar;');
  });
});

describe('<%-', function(){
  it('should not escape', function(){
    return ejs.render('<%- name %>', { name: '<script>' })
      .should.eventually.equal('<script>');
  });

  it('should terminate gracefully if no close tag is found', function(){
    return ejs.compile('<h1>oops</h1><%- name ->')
    .then(function () {
      throw new Error('Expected parse failure');
    })
    .catch(function (err) {
      err.message.should.equal('Could not find matching close tag "%>".');
    });
  });
});

describe('%>', function(){
  it('should produce newlines', function(){
    return ejs.render(fixture('newlines.ejs'), { users: users })
      .should.eventually.equal(fixture('newlines.html'));
  });
});

describe('-%>', function(){
  it('should not produce newlines', function(){
    return ejs.render(fixture('no.newlines.ejs'), { users: users })
      .should.eventually.equal(fixture('no.newlines.html'));
  });
});

describe('<%%', function(){
  it('should produce literals', function(){
    ejs.render('<%%- "foo" %>')
      .should.eventually.equal('<%- "foo" %>');
  });
});

describe('single quotes', function(){
  it('should not mess up the constructed function', function(){
    return ejs.render(fixture('single-quote.ejs'))
      .should.eventually.equal(fixture('single-quote.html'));
  });
});

describe('double quotes', function(){
  it('should not mess up the constructed function', function(){
    return ejs.render(fixture('double-quote.ejs'))
      .should.eventually.equal(fixture('double-quote.html'));
  });
});

describe('backslashes', function(){
  it('should escape', function(){
    return ejs.render(fixture('backslash.ejs'))
      .should.eventually.equal(fixture('backslash.html'));
  });
});

describe('messed up whitespace', function(){
  it('should work', function(){
    return ejs.render(fixture('messed.ejs'), { users: users })
      .should.eventually.equal(fixture('messed.html'));
  });
});

describe('filters', function(){
  it('should work', function(){
    var items = ['foo', 'bar', 'baz'];
    return ejs.render('<%=: items | reverse | first | reverse | capitalize %>', { items: items })
      .should.eventually.equal('Zab');
  });

  it('should accept arguments', function(){
    return ejs.render('<%=: users | map:"name" | join:", " %>', { users: users })
      .should.eventually.equal('tobi, loki, jane');
  });

  it('should truncate string', function(){
    return ejs.render('<%=: word | truncate: 3 %>', { word: 'World' })
      .should.eventually.equal('Wor');
  });

  it('should append string if string is longer', function(){
    return ejs.render('<%=: word | truncate: 2,"..." %>', { word: 'Testing' })
      .should.eventually.equal('Te...');
  });

  it('should not append string if string is shorter', function(){
    return ejs.render('<%=: word | truncate: 10,"..." %>', { word: 'Testing' })
      .should.eventually.equal('Testing');
  });

  it('should accept arguments containing :', function(){
    return ejs.render('<%=: users | map:"name" | join:"::" %>', { users: users })
      .should.eventually.equal('tobi::loki::jane');
  });

  it('should work on promises', function(){
    var items = delay(10, ['foo', 'bar', 'baz']);
    return ejs.render('<%=: items | reverse | first | reverse | capitalize %>', { items: items })
      .should.eventually.equal('Zab');
  });

  it('should accept promises as args', function(){
    var prop = delay(10, 'name'),
        str = delay(10, '::'),
        pattern = delay(10, (/::/g));
    return ejs.render('<%=: users | map:prop | join:str | replace:pattern,"-" %>', { users: users, prop: prop, str: str, pattern: pattern })
      .should.eventually.equal('tobi-loki-jane');
  });
});

describe('exceptions', function(){
  it('should produce useful stack traces', function(){
    return ejs.render(fixture('error.ejs'), { filename: 'error.ejs' })
      .catch(function (err) {
        err.should.have.property('path');
        err.path.should.equal('error.ejs');
        err.stack.split('\n').slice(0, 8).join('\n').should.equal(fixture('error.out'));
      });
  });

  it('should not include __stack if compileDebug is false', function() {
    return ejs.render(fixture('error.ejs'), {
        filename: 'error.ejs',
        compileDebug: false
      })
      .catch(function (err) {
        err.should.not.have.property('path');
        err.stack.split('\n').slice(0, 8).join('\n').should.not.equal(fixture('error.out'));
      });
  });
});

describe('includes', function(){
  it('should include ejs', function(){
    var file = 'test/fixtures/include.ejs';
    return ejs.render(fixture('include.ejs'), { filename: file, pets: users, open: '[[', close: ']]' })
      .should.eventually.equal(fixture('include.html'));
  });

  it('should work when nested', function(){
    var file = 'test/fixtures/menu.ejs';
    return ejs.render(fixture('menu.ejs'), { filename: file, pets: users })
      .should.eventually.equal(fixture('menu.html'));
  });

  it('should include arbitrary files as-is', function(){
    var file = 'test/fixtures/include.css.ejs';
    return ejs.render(fixture('include.css.ejs'), { filename: file, pets: users })
      .should.eventually.equal(fixture('include.css.html'));
  });

  it('should pass compileDebug to include', function(){
    var file = 'test/fixtures/include.ejs';
    var fn = ejs.compile(fixture('include.ejs'), { filename: file, open: '[[', close: ']]', compileDebug: false, client: true });
    return fn.then(function (fn) {
      var str = fn.toString();
      eval('var preFn = ' + str);
      str.should.not.match(/__stack/);
      (function() {
        preFn({ pets: users });
      }).should.not.throw();
    });
  });
});

describe('comments', function() {
  it('should fully render with comments removed', function() {
    return ejs.render(fixture('comments.ejs'))
      .should.eventually.equal(fixture('comments.html'));
  });
});
