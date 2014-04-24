var scssLintPlugin = require('../index');
var chai = require('chai');
var es = require('event-stream');
var gutil = require('gulp-util');
var fs = require('fs');
var expect = chai.expect;

var getFixtureFile = function (path) {
  return new gutil.File({
    path:  './test/fixtures/' + path,
    cwd: './test/',
    base: './test/fixtures/',
    contents: fs.readFileSync('./test/fixtures/' + path)
  });
}

describe('gulp-scsslint', function() {
  it('invalid scss file', function(done) {
    var fakeFile = getFixtureFile('invalid.scss');

    var stream = scssLintPlugin();

    stream
      .on('data', function (file) {
        expect(file.scsslint.success).to.be.false;
      })
      .once('end', function() {
        done();
      });

    stream.write(fakeFile);
    stream.end();
  });

  it('valid scss file', function(done) {
    var fakeFile = getFixtureFile('valid.scss');

    var stream = scssLintPlugin();

    stream
      .on('data', function (file) {
        expect(file.scsslint.success).to.be.true;
      })
      .once('end', function() {
        done();
      });

    stream.write(fakeFile);
    stream.end();
  });

  it('change default config', function (done) {
    var fakeFile = getFixtureFile('valid.scss');

    var stream = scssLintPlugin({'config': './test/fixtures/default.yml'});

    stream
      .on('data', function (file) {
        expect(file.scsslint.success).to.be.false;
      })
      .once('end', function() {
        done();
      });

    stream.write(fakeFile);
    stream.end();
  });
});
