'use strict';

var es = require('event-stream'),
readline = require('readline'),
fs = require('fs'),
dargs = require('dargs'),
exec = require('child_process').exec,
gutil = require('gulp-util'),
colors = gutil.colors,
Q = require('q'),
xml2js = require('xml2js').parseString;

var stream;

var PLUGIN_NAME = 'gulp-scss-lint';

var scssLintCodes = {
  '64': 'Command line usage error',
  '66': 'Input file did not exist or was not readable',
  '70': 'Internal software error',
  '78': 'Configuration error',
  '127': 'You need to have Ruby and scss-lint gem installed'
};

function execCommand(command) {
  var deferred = Q.defer();

  exec(command, function (error, report) {
    if (error && error.code !== 65) {
      if (scssLintCodes[error.code]) {
        deferred.reject(scssLintCodes[error.code]);
      } else {
        deferred.reject('Error code ' + error.code);
      }
    }

    deferred.resolve(report);
  });

  return deferred.promise;
}

function formatCommandResult (report) {
  var deferred = Q.defer();

  xml2js(report, function (err, result) {
    deferred.resolve(result);
  });

  return deferred.promise;
}

module.exports = function (options) {
  var stream;

  options = options || {};

  options.format = 'XML';

  if (options.exclude) {
    throw new gutil.PluginError(PLUGIN_NAME, "You must use gulp src to exclude");
  }

  var commandParts = ['scss-lint'],
  optionsArgs;

  if (options.bundleExec) {
    commandParts.unshift('bundle', 'exec');
    delete options.bundleExec;
  }

  optionsArgs = dargs(options);

  var files = [];

  function reportLint (report) {
    var lintResults = {
      success: true,
      errors: 0,
      warnings: 0,
      messages: []
    };

    function getFileReport(file) {
      for (var i = 0; i < report.lint.file.length; i++) {
        if (report.lint.file[i].$.name === file.path) {
          return report.lint.file[i];
        }
      }
    }

    var fileReport;
    for (var i = 0; i < files.length; i++) {
      fileReport = getFileReport(files[i]);

      if (fileReport && fileReport.issue.length) {

        gutil.log(colors.cyan(fileReport.issue.length) + ' issues found in ' + colors.magenta(fileReport.$.name));

        fileReport.issue.forEach(function (issue) {
          issue = issue.$;

          var severity = issue.severity === 'warning' ? 'W' : 'E';

          if (severity === 'W') {
            lintResults.warnings++;
          } else {
            lintResults.errors++;
          }

          lintResults.messages.push(issue);

          gutil.log(colors.cyan(fileReport.$.name) + ':' + colors.magenta(issue.line) + ' [' + severity + '] ' + issue.reason);
        });

        lintResults.success = true;
      } else {
        lintResults.success = false;
      }

      files[i].scsslint  = lintResults;
    }
  }

  function writeStream(currentFile) {
    if (currentFile) {
      files.push(currentFile);
    }
  }

  function endStream() {
    var filePaths = files.map(function (file) {
      return file.path.replace(/(\s)/g, "\\ ");
    });

    var command = commandParts.concat(filePaths, optionsArgs).join(' ');

    execCommand(command)
      .then(formatCommandResult)
      .then(reportLint)
      .fail(function (error) {
        throw new gutil.PluginError(PLUGIN_NAME, error);
      });
  }

  stream = es.through(writeStream, endStream);

  return stream;
};
