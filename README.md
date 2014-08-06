gulp-ng-amd-compiler
====================

Gulp plugin for compiling angular amd modules as implemented by EF.

First, install the plugin

	npm install --save-dev git://github.com/peterhel/gulp-ng-amd-compiler.git

Require the module

``` js
var ngcompiler = require('gulp-ng-amd-compiler');

gulp.src('src/app/app.js')
    .pipe(ngcompiler())
    .pipe(uglify())   // optional with external plugin
    .pipe(gulp.dest('./dist/'))
});
```
