var Promise = require('bluebird');
var fs = require('fs');
var path = require('path');
var gutil = require('gulp-util');

var lintCommand = require('./command');
var reporters = require('./reporters');

function defaultLintResult() {
  return {
    success: true,
    errors: 0,
    warnings: 0,
    issues: []
  };
}

function reportLint(stream, files, options, report, xmlReport) {
  if (options.reporterOutput) {
    if (xmlReport) {
      fs.writeFileSync(options.reporterOutput, xmlReport);
    } else {
      fs.writeFileSync(options.reporterOutput, JSON.stringify(report));
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
}

module.exports = function(stream, files, options) {
  return new Promise(function(resolve, reject){
    lintCommand(files, options)
      .spread(function(report, xmlReport) {
        reportLint(stream, files, options, report, xmlReport);
        resolve();
      }, function(e) {
        reject(e);
      });
  });
};
