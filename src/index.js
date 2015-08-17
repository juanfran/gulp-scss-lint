'use strict';

var es = require('event-stream'),
readline = require('readline'),
fs = require('fs'),
dargs = require('dargs'),
child_process = require('child_process'),
gutil = require('gulp-util'),
colors = gutil.colors,
path = require('path'),
reporters = require('./reporters'),
checkstyle = require('./checkstyle');

var stream;

var PLUGIN_NAME = 'gulp-scss-lint';

var scssLintCodes = {
  '64': 'Command line usage error',
  '66': 'Input file did not exist or was not readable',
  '69': 'You need to have the scss_lint_reporter_checkstyle gem installed',
  '70': 'Internal software error',
  '78': 'Configuration error',
  '127': 'You need to have Ruby and scss-lint gem installed'
};

var gulpScssLint = function (options) {
  var commandParts = ['scss-lint'],
  excludes = ['bundleExec',
              'filePipeOutput',
              'reporterOutput',
              'reporterOutputFormat',
              'customReport',
              'maxBuffer',
              'endless',
              'verbose',
              'sync'];

  options = options || {};

  options.format = 'JSON';

  if (options.reporterOutputFormat === 'Checkstyle') {
    options.format = 'Checkstyle';
    options.require = 'scss_lint_reporter_checkstyle';
  }

  if (options.exclude) {
    throw new gutil.PluginError(PLUGIN_NAME, "You must use gulp src to exclude");
  }

  if (options.bundleExec) {
    commandParts.unshift('bundle', 'exec');
    excludes.push('bundleExec');
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

  function configFileReadError(report) {
    return report.indexOf('No such file or directory - ' + options.config) !== -1;
  }

  function execLintCommand(command, cb) {
    if (options.verbose) {
      console.log(command);
    }

    execCommand(command, function (error, report) {
      if (error && error.code !== 1 && error.code !== 2 && error.code !== 65) {
        if (scssLintCodes[error.code]) {
          if (error.code === 66 && configFileReadError(report)) {
            stream.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Config file did not exist or was not readable'));
          } else {
            stream.emit('error', new gutil.PluginError(PLUGIN_NAME, scssLintCodes[error.code]));
          }
        } else if (error.code) {
          stream.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Error code ' + error.code + '\n' + error));
        } else {
          stream.emit('error', new gutil.PluginError(PLUGIN_NAME, error));
        }

        streamEnd();
      } else if (error && error.code === 1 && report.length === 0) {
        stream.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Error code ' + error.code + '\n' + error));
        streamEnd();
      } else  {
        if (options.format === 'JSON'){
          cb(JSON.parse(report));
        } else {
          checkstyle.toJSON(report, cb);
        }
      }
    });
  }

  function defaultLintResult() {
    return {
      success: true,
      errors: 0,
      warnings: 0,
      issues: []
    };
  }

  function reportLint(report, xmlReport) {
    if (options.reporterOutput) {
      if (xmlReport) {
        fs.writeFile(options.reporterOutput, xmlReport);
      } else {
        fs.writeFile(options.reporterOutput, JSON.stringify(report));
      }
    }

    var fileReport;
    var lintResult = {};

    for (var i = 0; i < files.length; i++) {
      lintResult = defaultLintResult();
      fileReport = report[files[i].path];

      if (fileReport) {
        lintResult.success = false;

        fileReport.forEach(function (issue) {
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

      if (!options.filePipeOutput) {
        stream.emit('data', files[i]);
      }
    }

    if (options.filePipeOutput) {
      var contentFile = "";

      if (xmlReport) {
        contentFile = xmlReport;
      } else {
        contentFile = JSON.stringify(report);
      }

      var pipeFile = new gutil.File({
        cwd: files[0].cwd,
        base: files[0].base,
        path: path.join(files[0].base, options.filePipeOutput),
        contents: new Buffer(contentFile)
      });

      pipeFile.scsslint = lintResult;

      stream.emit('data', pipeFile);
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
    var shellescape = require('shell-escape');

    if (!files.length) {
      streamEnd();
      return;
    }

    var filePaths = files.map(function (file) {
      return shellescape([file.path]);
    });

    var command = commandParts.concat(filePaths, optionsArgs).join(' ');
    execLintCommand(command, reportLint);
  }

  stream = es.through(writeStream, endStream);
  return stream;
};

gulpScssLint.failReporter = reporters.failReporter;
gulpScssLint.defaultReporter = reporters.defaultReporter;

module.exports = gulpScssLint;
