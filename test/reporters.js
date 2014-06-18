var proxyquire = require('proxyquire');
var gutil = require('gulp-util');
var colors = gutil.colors;
var chai = require('chai');
var sinon = require('sinon');
var expect = chai.expect;
var fs = require('fs');

var getFixtureFile = function (path) {
  return new gutil.File({
    path:  './test/fixtures/' + path,
    cwd: './test/',
    base: './test/fixtures/',
    contents: fs.readFileSync('./test/fixtures/' + path)
  });
}

var getReporters = function (logMock) {
  return proxyquire('../src/reporters', {
    "gulp-util": {
      "log": logMock,
      "colors": colors
    }
  });
}

describe.only('reporters', function() {
  it('default reporter, success true', function () {
    var fakeFile = getFixtureFile('invalid.scss');

    fakeFile.scsslint = {};
    fakeFile.scsslint.success = true;
    fakeFile.scsslint.issues = [];

    var log = sinon.spy();
    var defaultReporter = getReporters(log).defaultReporter;

    expect(log.called).to.be.false;
  });

  it('default reporter, success false', function () {
    var fakeFile = getFixtureFile('invalid.scss');

    fakeFile.scsslint = {};
    fakeFile.scsslint.success = false;
    fakeFile.scsslint.issues = [
      {"severity": "warning",
       "line": 10,
       "reason": "some reasone"},
      {"severity": "error",
       "line": 13,
       "reason": "some reasone 2"}
    ];

    var log = sinon.spy();
    var defaultReporter = getReporters(log).defaultReporter;

    defaultReporter(fakeFile);

    var firstCall = log.withArgs(colors.cyan(fakeFile.scsslint.issues.length) + ' issues found in ' + colors.magenta(fakeFile.path)).calledOnce;

    var secondCall = log.withArgs(colors.cyan(fakeFile.path) + ':' + colors.magenta(fakeFile.scsslint.issues[0].line) + ' [W] ' + fakeFile.scsslint.issues[0].reason).calledOnce;


    var thirdCall = log.withArgs(colors.cyan(fakeFile.path) + ':' + colors.magenta(fakeFile.scsslint.issues[1].line) + ' [E] ' + fakeFile.scsslint.issues[1].reason).calledOnce;

    expect(firstCall).to.be.ok;
    expect(secondCall).to.be.ok;
    expect(thirdCall).to.be.ok;
  });
});
