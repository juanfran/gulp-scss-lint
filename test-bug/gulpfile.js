var gulp = require('gulp');
var debug = require('gulp-debug');
var scsslint = require('../src/index');

gulp.task('styles', function() {
	return gulp.src('*.scss')
        .pipe(scsslint())
	      .pipe(scsslint.failReporter())
        .pipe(debug({title: 'file:'}));
});

gulp.task('watch', function() {
  gulp.watch( '*.scss', gulp.series('styles'));
});

gulp.task('default', gulp.series('styles', 'watch'));
