'use strict';

var es = require('event-stream'),
readline = require('readline'),
fs = require('fs'),
dargs = require('dargs'),
exec = require('child_process').exec,
gutil = require('gulp-util'),
colors = gutil.colors,
Q = require('q'),
xml2js = require('xml2js').parseString,
fs = require('fs'),
path = require('path');

var stream;

var PLUGIN_NAME = 'gulp-scss-lint';

var scssLintCodes = {
  '64': 'Command line usage error',
  '66': 'Input file did not exist or was not readable',
  '70': 'Internal software error',
  '78': 'Configuration error',
  '127': 'You need to have Ruby and scss-lint gem installed'
};

function defaultReport(file) {
  if (!file.scsslint.success) {
    gutil.log(colors.cyan(file.scsslint.issues.length) + ' issues found in ' + colors.magenta(file.path));

    file.scsslint.issues.forEach(function (issue) {
      var severity = issue.severity === 'warning' ? 'W' : 'E';
      var logMsg = colors.cyan(file.path) + ':' + colors.magenta(issue.line) + ' [' + severity + '] ' + issue.reason;

      gutil.log(logMsg);
    });
  }
}

module.exports = function (options) {
  var stream,
  xmlReport = '',
  commandParts = ['scss-lint'],
  excludes = ['bundleExec',
              'xmlPipeOutput',
              'reporterOutput',
              'emitError',
              'customReport'
             ];

  options = options || {};
  options.format = 'XML';

  if (options.exclude) {
    throw new gutil.PluginError(PLUGIN_NAME, "You must use gulp src to exclude");
  }

  if (options.bundleExec) {
    commandParts.unshift('bundle', 'exec');
    excludes.push('bundleExec')
  }

  var optionsArgs = dargs(options, excludes);

  var files = [];

  function execCommand(command) {
    var deferred = Q.defer();

    exec(command, function (error, report) {
      if (error && error.code !== 65) {
        if (scssLintCodes[error.code]) {
          stream.emit('error', new gutil.PluginError(PLUGIN_NAME, scssLintCodes[error.code]));
        } else {
          stream.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Error code ' + error.code));
        }
      }

      deferred.resolve(report);
    });

    return deferred.promise;
  }

  function formatCommandResult (report) {
    var deferred = Q.defer();

    xmlReport = report;

    if (options.reporterOutput) {
      fs.writeFile(options.reporterOutput, report);
    }

    xml2js(report, function (err, result) {
      deferred.resolve(result);
    });

    return deferred.promise;
  }

  function defaultLintResult() {
    return {
      success: true,
      errors: 0,
      warnings: 0,
      issues: []
    };
  }

  function reportLint(report) {
    function getFileReport(file) {
      for (var i = 0; i < report.lint.file.length; i++) {
        if (report.lint.file[i].$.name === file.path) {
          return report.lint.file[i];
        }
      }
    }

    var fileReport;
    var lintResult = {};
    var logMsg = '';

    for (var i = 0; i < files.length; i++) {
      lintResult = defaultLintResult();
      fileReport = getFileReport(files[i]);

      if (fileReport && fileReport.issue.length) {
        lintResult.success = false;

        fileReport.issue.forEach(function (issue) {
          issue = issue.$;

          var severity = issue.severity === 'warning' ? 'W' : 'E';

          if (severity === 'W') {
            lintResult.warnings++;
          } else {
            lintResult.errors++;
          }

          lintResult.issues.push(issue);
          logMsg = colors.cyan(fileReport.$.name) + ':' + colors.magenta(issue.line) + ' [' + severity + '] ' + issue.reason;

          if ((severity === 'W' || severity === 'E') && options.emitError === 'all') {
            stream.emit('error', new gutil.PluginError(PLUGIN_NAME, logMsg));
          } else if (severity === 'W' && options.emitError === 'warning') {
            stream.emit('error', new gutil.PluginError(PLUGIN_NAME, logMsg));
          } else if (severity === 'E' && options.emitError === 'error') {
            stream.emit('error', new gutil.PluginError(PLUGIN_NAME, logMsg));
          }
        });
      }

      files[i].scsslint = lintResult;

      if (options.customReport) {
        options.customReport(files[i]);
      } else {
        defaultReport(files[i]);
      }

      if (!options.xmlPipeOutput) {
        stream.emit('data', files[i]);
      }
    }

    if (options.xmlPipeOutput) {
      var xmlPipeFile = new gutil.File({
        cwd: files[0].cwd,
        base: files[0].base,
        path: path.join(files[0].base, options.xmlPipeOutput),
        contents: new Buffer(xmlReport)
      });

      stream.emit('data', xmlPipeFile);
    }
  }

  function writeStream(currentFile) {
    if (currentFile) {
      files.push(currentFile);
    }
  }

  function endStream() {
    if (!files.length) {
      stream.emit('end');
      return;
    }

    var filePaths = files.map(function (file) {
      return file.path.replace(/(\s)/g, "\\ ");
    });

    var command = commandParts.concat(filePaths, optionsArgs).join(' ');

    execCommand(command)
      .then(formatCommandResult)
      .then(reportLint)
      .then(function () {
        stream.emit('end');
      });
  }

  stream = es.through(writeStream, endStream);

  return stream;
};
