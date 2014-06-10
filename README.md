#gulp-scss-lint

> Lint your `.scss` files

This plugin require Ruby and [scss-lint](https://github.com/causes/scss-lint)

## Usage

First install `gulp-scss-lint`

```shell
npm install gulp-scss-lint --save-dev
```

Add in you `gulpfile.js`
```js
var scsslint = require('gulp-scss-lint');

gulp.task('scss', function() {
  gulp.src('/scss/*.scss')
    .pipe(scsslint({'config': 'lint.yml'})); //you can set scss-lint parameters, except the option 'exclude'
});
```

## Testing

To test you must first have `scss-lint` installed globally using
`gem install scss-lint` as well as via bundler using `bundle install`.
