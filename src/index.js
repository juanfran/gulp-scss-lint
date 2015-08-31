'use strict';

var es = require('event-stream'),
readline = require('readline'),
gutil = require('gulp-util'),
colors = gutil.colors,
reporters = require('./reporters'),
scssLint = require('./scss-lint');

var PLUGIN_NAME = 'gulp-scss-lint';

var gulpScssLint = function (options) {
  options = options || {};

  options.format = 'JSON';

  if (options.reporterOutputFormat === 'Checkstyle') {
    options.format = 'Checkstyle';
    options.require = 'scss_lint_reporter_checkstyle';
  }

  if (options.exclude) {
    throw new gutil.PluginError(PLUGIN_NAME, "You must use gulp src to exclude");
  }

  var lint = function(stream, files) {
    scssLint(stream, files, options)
      .then(function() {
        if (!options.endless) {
          stream.emit('end');
        }
      }, function(e) {
        stream.emit('error', new gutil.PluginError(PLUGIN_NAME, e));
        stream.emit('end');
      });
  };

  var streamManager = (function() {
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
  }());

  return streamManager;
};

gulpScssLint.failReporter = reporters.failReporter;
gulpScssLint.defaultReporter = reporters.defaultReporter;

module.exports = gulpScssLint;
