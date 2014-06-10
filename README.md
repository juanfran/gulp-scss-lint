#gulp-scss-lint

> Lint your `.scss` files

## Install

```shell
npm install gulp-scss-lint --save-dev
```

This plugin require Ruby and [scss-lint](https://github.com/causes/scss-lint)
```shell
gem install scss-lint
```

## Usage

Add in you `gulpfile.js`
```js
var scsslint = require('gulp-scss-lint');

gulp.task('scss-lint', function() {
  gulp.src('/scss/*.scss')
    .pipe(scsslint({'config': 'lint.yml'}));
});
```

### Lint only modified files
You should use [gulp-cached](https://github.com/wearefractal/gulp-cached)

In this example, without the gulp-cached plugin every time you save a `.scss` file the scss-lint plugin checks all your files and with gulp-cached only checks the modified files.

```js
var scsslint = require('gulp-scss-lint');
var cache = require('gulp-cached');

gulp.task('scss-lint', function() {
  gulp.src('/scss/*.scss')
    .pipe(cache('scsslint'))
    .pipe(scsslint());
});

gulp.task('watch', function() {
  gulp.watch('/scss/*.scss', ['scss-lint');
});
```

### Excluding

To ignore files you could use the gulp.src ignore format '!filePath''

```js
gulp.src(['/scss/*.scss', '!/scss/vendor/**/*.scss'])
  .pipe(scsslint({'config': 'lint.yml'}));
```

Or you could use [gulp-filter](https://github.com/sindresorhus/gulp-filter)

```js
var scsslint = require('gulp-scss-lint');
var gulpFilter = require('gulp-filter');

gulp.task('scss-lint', function() {
  var scssFilter = gulpFilter('/scss/vendor/**/*.scss');

  gulp.src('/scss/*.scss')
    .pipe(scssFilter)
    .pipe(scsslint())
    .pipe(scssFilter.restore());
});

```

## Testing

To test you must first have `scss-lint` installed globally using
`gem install scss-lint` as well as via bundler using `bundle install`.