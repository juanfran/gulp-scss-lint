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

var fakeFile = getFixtureFile('invalid.scss');

var getReporters = function (logMock) {
  return proxyquire('../src/reporters', {
    "gulp-util": {
      "log": logMock,
      "colors": colors
    }
  });
}

describe('reporters', function() {
  it('fail reporter, success true', function () {
    var fileCount = 0;
    var error = false;

    fakeFile.scsslint = {};
    fakeFile.scsslint.success = true;
    fakeFile.scsslint.issues = [];

    var log = sinon.spy();
    var failReporter = getReporters(log).failReporter();

    failReporter
      .on('data', function (file) {
        fileCount++;
        expect(file.relative).to.be.equal('invalid.scss');
      })
      .on('error', function () {
        error = true;
      })
      .once('end', function () {
        expect(fileCount).to.be.equal(1);
        expect(error).to.be.false;
      });

    failReporter.write(fakeFile);
    failReporter.end();
  });

  it('fail reporter, success false', function () {
    var fileCount = 0;
    var error = false;

    fakeFile.scsslint = {};
    fakeFile.scsslint.success = false;
    fakeFile.scsslint.issues = [];

    var log = sinon.spy();
    var failReporter = getReporters(log).failReporter();

    failReporter
      .on('data', function (file) {
        fileCount++;
        expect(file.relative).to.be.equal('invalid.scss');
      })
      .on('error', function (error) {
        expect(error.message).to.be.equal('ScssLint failed for: invalid.scss');
        error = true;
      })
      .once('end', function () {
        expect(fileCount).to.be.equal(1);
        expect(error).to.be.true;
      });

    failReporter.write(fakeFile);
    failReporter.end();
  });

  it('default reporter, success true', function () {
    fakeFile.scsslint = {};
    fakeFile.scsslint.success = true;
    fakeFile.scsslint.issues = [];

    var log = sinon.spy();
    var defaultReporter = getReporters(log).defaultReporter;

    expect(log.called).to.be.false;
  });

  it('default reporter, success false', function () {
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
