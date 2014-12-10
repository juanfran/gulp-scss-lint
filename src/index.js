'use strict';

var es = require('event-stream'),
readline = require('readline'),
fs = require('fs'),
dargs = require('dargs'),
exec = require('child_process').exec,
gutil = require('gulp-util'),
colors = gutil.colors,
xml2js = require('xml2js').parseString,
fs = require('fs'),
path = require('path'),
reporters = require('./reporters');

var stream;

var PLUGIN_NAME = 'gulp-scss-lint';

var scssLintCodes = {
  '64': 'Command line usage error',
  '66': 'Input file did not exist or was not readable',
  '70': 'Internal software error',
  '78': 'Configuration error',
  '127': 'You need to have Ruby and scss-lint gem installed'
};

var gulpScssLint = function (options) {
  var xmlReport = '',
  commandParts = ['scss-lint'],
  excludes = ['bundleExec',
              'xmlPipeOutput',
              'reporterOutput',
              'customReport',
              'maxBuffer'];

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

  var file = null;

  function execCommand(command) {
    var commandOptions = {
      env: process.env,
      cwd: process.cwd(),
      maxBuffer: options.maxBuffer || 300 * 1024
    };

    exec(command, commandOptions, function (error, report) {
      if (error && error.code !== 1 && error.code !== 2 && error.code !== 65) {
        if (scssLintCodes[error.code]) {
          stream.emit('error', new gutil.PluginError(PLUGIN_NAME, scssLintCodes[error.code]));
        } else if (error.code) {
          stream.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Error code ' + error.code + '\n' + error));
        } else {
          stream.emit('error', new gutil.PluginError(PLUGIN_NAME, error));
        }

        stream.emit('end');
      } else if (error && error.code === 1 && report.length === 0) {
        stream.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Error code ' + error.code + '\n' + error));
        stream.emit('end');
      } else {
        xmlReport = report;
        formatCommandResult();
      }
    });
  }

  function formatCommandResult () {
    if (options.reporterOutput) {
      fs.writeFile(options.reporterOutput, xmlReport);
    }

    xml2js(xmlReport, reportLint);
  }

  function defaultLintResult() {
    return {
      success: true,
      errors: 0,
      warnings: 0,
      issues: []
    };
  }

  function getFileReport(file, report) {
    if (report.lint.file) {
      for (var i = 0; i < report.lint.file.length; i++) {
        if (report.lint.file[i].$.name === file.path) {
          return report.lint.file[i];
        }
      }
    }
  }

  function reportLint(err, report) {
    var fileReport;
    var lintResult = {};

    lintResult = defaultLintResult();
    fileReport = getFileReport(file, report);

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
      });
    }

    file.scsslint = lintResult;

    if (options.customReport) {
      options.customReport(file, stream);
    } else {
      reporters.defaultReporter(file);
    }

    if (!options.xmlPipeOutput) {
      stream.emit('data', file);
    }


    if (options.xmlPipeOutput) {
      var xmlPipeFile = new gutil.File({
        cwd: file.cwd,
        base: file.base,
        path: path.join(file.base, options.xmlPipeOutput),
        contents: new Buffer(xmlReport)
      });

      stream.emit('data', xmlPipeFile);
    }

    stream.emit('end');
  }

  function writeStream(_file_) {
    file = _file_;

    if (file) {
      var filePath = file.path.replace(/(\s)/g, "\\ ");

      var command = commandParts.concat(filePath, optionsArgs).join(' ');

      execCommand(command);
    }
  }

  stream = es.through(writeStream);
  return stream;
};

gulpScssLint.failReporter = reporters.failReporter

module.exports = gulpScssLint;
