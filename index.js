'use strict';

var es = require('event-stream'),
readline = require('readline'),
fs = require('fs'),
dargs = require('dargs'),
exec = require('child_process').exec,
gutil = require('gulp-util'),
colors = gutil.colors;

var PLUGIN_NAME = 'gulp-scss-lint';

var formatLine = function (line, file) {
  var result = {};
  var split = line.split(':');

  result.line = split[1].substr(0, split[1].indexOf('[') - 1);
  result.errorType = split[1].substr(split[1].indexOf('[') + 1, 1);
  result.msg = split[1].substr(split[1].indexOf(']') + 2);

  return result;
};

module.exports = function (options) {
  options = options || {};

  var optionsArgs = dargs(options);

  if (optionsArgs.bundleExec) {
    optionsArgs.unshift('bundle', 'exec');
  }

  return es.map(function(file, cb) {
    var args = ['scss-lint', file.path].concat(optionsArgs);
    var command = args.join(' ');

    (function () {
      var currentFile = file;

      exec(command, function (error, report) {
        if (error && error.code !== 65) {
          if (error.code === 127) {
            throw new gutil.PluginError(PLUGIN_NAME, 'You need to have Ruby and scss-lint gem installed');
          } else {
            throw new gutil.PluginError(PLUGIN_NAME, 'Error code ' + error.code + ' in file ' + currentFile.path);
          }
        }

        if (report.length) {
          report = report.trim().split('\n');

          gutil.log(colors.cyan(report.length) + ' errors found in ' + colors.magenta(currentFile.path));

          report.forEach(function (line) {
            var result = formatLine(line);

            gutil.log(colors.cyan(currentFile.path) + ':' + colors.magenta(result.line) + ' [' + result.errorType + '] ' + result.msg);
          });
        }

        currentFile.scsslint  = {'success': report.length === 0};

        cb(null, currentFile);
      });
    }());
  });
};
