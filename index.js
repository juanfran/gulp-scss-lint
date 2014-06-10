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

var scssLintCodes = {
  '64': 'Command line usage error',
  '66': 'Input file did not exist or was not readable',
  '70': 'Internal software error',
  '78': 'Configuration error',
  '127': 'You need to have Ruby and scss-lint gem installed'
};

module.exports = function (options) {
  options = options || {};

  if (options.exclude) {
    throw new gutil.PluginError(PLUGIN_NAME, "You must use gulp src to exclude");
  }

  var commandParts = ['scss-lint'],
      optionsArgs,
      lintResults = {
        errors: 0,
        warnings: 0
      };

  if (options.bundleExec) {
    commandParts.unshift('bundle', 'exec');
    delete options.bundleExec;
  }

  optionsArgs = dargs(options);

  return es.map(function(currentFile, cb) {
    var filePath = currentFile.path.replace(/(\s)/g, "\\ ");
    var command = commandParts.concat([filePath], optionsArgs).join(' ');

    exec(command, function (error, report) {
      if (error && error.code !== 65) {
        if (scssLintCodes[error.code]) {
          throw new gutil.PluginError(PLUGIN_NAME, scssLintCodes[error.code]);
        } else {
          throw new gutil.PluginError(PLUGIN_NAME, 'Error code ' + error.code + ' in file ' + currentFile.path);
        }
      }

      if (report.length) {
        report = report.trim().split('\n');

        gutil.log(colors.cyan(report.length) + ' errors found in ' + colors.magenta(currentFile.path));

        report.forEach(function (line) {
          var result = formatLine(line);

          if ('E' === result.errorType) {
            lintResults.errors += 1;
          }
          if ('W' === result.errorType) {
            lintResults.warnings += 1;
          }

          gutil.log(colors.cyan(currentFile.path) + ':' + colors.magenta(result.line) + ' [' + result.errorType + '] ' + result.msg);
        });
      }

      currentFile.scsslint  = {'success': report.length === 0, 'results': lintResults};

      cb(null, currentFile);
    });
  });
};
