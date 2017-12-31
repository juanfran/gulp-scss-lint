'use strict';

var es = require('event-stream'),
chalk = require('chalk'),
PluginError = require('plugin-error'),
fancyLog = require('fancy-log');

exports.failReporter = function (severity) {
  return es.map(function(file, cb) {
    var error;

    if (!file.scsslint.success) {
      if (!severity || severity === 'E' && file.scsslint.errors > 0) {
        error = new PluginError('gulp-scss-lint', {
          message: 'ScssLint failed for: ' + file.relative,
          showStack: false
        });
      }
    }

    cb(error, file);
  });
};

exports.defaultReporter = function (file) {
  if (!file.scsslint.success) {
    fancyLog(chalk.cyan(file.scsslint.issues.length) + ' issues found in ' + chalk.magenta(file.path));

    file.scsslint.issues.forEach(function (issue) {
      var severity = issue.severity === 'warning' ? chalk.yellow(' [W] ') : chalk.red(' [E] ');
      var linter = issue.linter ? (issue.linter + ': ') : '';
      var logMsg =
        chalk.cyan(file.relative) + ':' + chalk.magenta(issue.line) + severity + chalk.green(linter) + issue.reason;

      fancyLog(logMsg);
    });
  }
}
