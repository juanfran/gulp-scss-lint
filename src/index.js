'use strict';

var es = require('event-stream'),
readline = require('readline'),
PluginError = require('plugin-error'),
reporters = require('./reporters'),
scssLint = require('./scss-lint'),
Readable = require('stream').Readable;

var PLUGIN_NAME = 'gulp-scss-lint';

var gulpScssLint = function (options) {
  options = options || {};

  options.format = 'JSON';

  if (options.reporterOutputFormat === 'Checkstyle') {
    options.format = 'Checkstyle';
    options.require = 'scss_lint_reporter_checkstyle';
  }

  if (options.exclude) {
    throw new PluginError(PLUGIN_NAME, "You must use gulp src to exclude");
  }

  var lint = function(stream, files) {
    scssLint(stream, files, options)
      .then(function() {
        if (!options.endless) {
          stream.emit('end');
        }
      }, function(e) {
        var existingError = new Error(e);
        var err = new PluginError(PLUGIN_NAME, existingError);

        stream.emit('error', err);
        stream.emit('end');
      })
      .done(function(e) {});
  };

  var getStream = function() {
    var files = [];

    var writeStream = function(currentFile){
      if (options.endless) {
        lint(stream, [currentFile]);
      } else {
        files.push(currentFile);
      }
    };

    var endStream = function() {
      if (options.endless) {
        return;
      }

      if (!files.length) {
        stream.emit('end');
        return;
      }

      lint(stream, files);
    };

    var stream = es.through(writeStream, endStream);

    return stream;
  };

  var getNewStream = function() {
    var stream = new Readable({objectMode: true});
    stream._read = function () {};

    lint(stream, [options.src]);

    return stream;
  };

  if (options.src) {
    return getNewStream();
  }

  return getStream();
};

gulpScssLint.failReporter = reporters.failReporter;
gulpScssLint.defaultReporter = reporters.defaultReporter;

module.exports = gulpScssLint;
