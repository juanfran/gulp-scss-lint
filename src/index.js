'use strict';

var es = require('event-stream'),
readline = require('readline'),
fs = require('fs'),
dargs = require('dargs'),
child_process = require('child_process'),
gutil = require('gulp-util'),
colors = gutil.colors,
xml2js = require('xml2js').parseString,
path = require('path'),
pd = require('pretty-data').pd,
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

var isWin = /^win/.test(require('os').platform());

var gulpScssLint = function (options) {
  var xmlReport = '',
  commandParts = ['scss-lint'],
  excludes = ['bundleExec',
              'xmlPipeOutput',
              'reporterOutput',
              'customReport',
              'maxBuffer',
              'endless',
              'verbose',
              'sync'];

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

  function execCommand(command, fn) {
    var commandOptions = {
      env: process.env,
      cwd: process.cwd(),
      maxBuffer: options.maxBuffer || 300 * 1024
    };

    if (options.sync || options.endless) {
      if (child_process.execSync) {
        try {
          var result = child_process.execSync(command, commandOptions);
          fn(null, result);
        } catch (result) {
          var error = {code: result.status};
          fn(error, result.stdout);
        }
      } else {
        var exec = require('sync-exec');

        var result = exec(command);
        var error;

        if (result.status) {
          error = {code: result.status};
        }

        fn(error, result.stdout);
      }
    } else {
      child_process.exec(command, commandOptions, fn);
    }
  }

  function streamEnd() {
    files = [];
    stream.emit('end');
  }

  function execLintCommand(command) {
    if (options.verbose) {
      console.log(command);
    }
    execCommand(command, function (error, report) {
      if (error && error.code !== 1 && error.code !== 2 && error.code !== 65) {
        if (scssLintCodes[error.code]) {
          stream.emit('error', new gutil.PluginError(PLUGIN_NAME, scssLintCodes[error.code]));
        } else if (error.code) {
          stream.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Error code ' + error.code + '\n' + error));
        } else {
          stream.emit('error', new gutil.PluginError(PLUGIN_NAME, error));
        }

        streamEnd();
      } else if (error && error.code === 1 && report.length === 0) {
        stream.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Error code ' + error.code + '\n' + error));
        streamEnd();
      } else {
        xmlReport = pd.xml(report);
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

    for (var i = 0; i < files.length; i++) {
      lintResult = defaultLintResult();
      fileReport = getFileReport(files[i], report);

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

      files[i].scsslint = lintResult;

      if (options.customReport) {
        options.customReport(files[i], stream);
      } else {
        reporters.defaultReporter(files[i]);
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

    streamEnd();
  }

  function writeStream(currentFile) {
    if (options.endless) {
      files.push(currentFile);
      endStream();
    } else {
      files.push(currentFile);
    }
  }

  function endStream() {
    if (!files.length) {
      streamEnd();
      return;
    }

    var filePaths = files.map(function (file) {
      if (isWin) {
        return '"' + file.path + '"';
      } else {
        return file.path.replace(/(\s)/g, "\\ ");
      }
    });

    var command = commandParts.concat(filePaths, optionsArgs).join(' ');
    execLintCommand(command);
  }

  stream = es.through(writeStream, endStream);
  return stream;
};

gulpScssLint.failReporter = reporters.failReporter

module.exports = gulpScssLint;
