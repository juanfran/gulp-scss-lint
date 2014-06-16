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

module.exports = function (options) {
  var stream,
  xmlReport = '',
  commandParts = ['scss-lint'],
  excludes = ['bundleExec',
              'xmlPipeOutput',
              'reporterOutput'
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
      messages: []
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

    for (var i = 0; i < files.length; i++) {
      lintResult = defaultLintResult();
      fileReport = getFileReport(files[i]);

      if (fileReport && fileReport.issue.length) {
        gutil.log(colors.cyan(fileReport.issue.length) + ' issues found in ' + colors.magenta(fileReport.$.name));

        fileReport.issue.forEach(function (issue) {
          issue = issue.$;

          var severity = issue.severity === 'warning' ? 'W' : 'E';

          if (severity === 'W') {
            lintResult.warnings++;
          } else {
            lintResult.errors++;
          }

          lintResult.messages.push(issue);

          gutil.log(colors.cyan(fileReport.$.name) + ':' + colors.magenta(issue.line) + ' [' + severity + '] ' + issue.reason);
        });

        lintResult.success = false;
      }

      files[i].scsslint = lintResult;

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
      })
      .fail(function (error) {
        stream.emit('error', new gutil.PluginError(PLUGIN_NAME, error));
      });
  }

  stream = es.through(writeStream, endStream);

  return stream;
};
