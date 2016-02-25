'use strict';
const gulp   = require('gulp');
const babel  = require('gulp-babel');
const eslint = require('gulp-eslint');
const concat = require('gulp-concat');
const mocha  = require('gulp-mocha');
const sm     = require('gulp-sourcemaps');

gulp.task('build', ['lint'], () =>
    gulp
        .src('./index.js')
        .pipe(sm.init())
        .pipe(babel({
            presets: ['es2015-node5']
        }))
        .pipe(sm.write())
        .pipe(concat('jsonifier.js'))
        .pipe(gulp.dest('./dist'))
);

gulp.task('lint', () =>
    gulp
        .src('./index.js')
        .pipe(eslint({
            config: '.eslintrc.json'
        }))
        .pipe(eslint.format())
);

gulp.task('test', ['build'], () =>
    gulp
        .src('./test/**/*.spec.js')
        .pipe(mocha({
            ui: 'bdd',
            reporter: 'spec',
            require: ['should', 'source-map-support/register'],
            debug: true
        }))
);

gulp.task('dev', ['build'], () => {
    gulp.watch('./index.js', ['test']);
    gulp.watch('./test/**/*.spec.js', ['test']);
});


gulp.task('default', ['build']);
