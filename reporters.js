'use strict';

var es = require('event-stream'),
gutil = require('gulp-util'),
colors = gutil.colors;

exports.failReporter = function () {
  return es.map(function(file, cb) {
    var error

    if (!file.scsslint.success) {
      error = new gutil.PluginError('gulp-scss-lint', {
        message: 'ScssLint failed for: ' + file.relative,
        showStack: false
      });
    }

    cb(error, file);
  });
};

exports.defaultReporter = function (file) {
  if (!file.scsslint.success) {
    gutil.log(colors.cyan(file.scsslint.issues.length) + ' issues found in ' + colors.magenta(file.path));

    file.scsslint.issues.forEach(function (issue) {
      var severity = issue.severity === 'warning' ? 'W' : 'E';
      var logMsg = colors.cyan(file.path) + ':' + colors.magenta(issue.line) + ' [' + severity + '] ' + issue.reason;

      gutil.log(logMsg);
    });
  }
}
