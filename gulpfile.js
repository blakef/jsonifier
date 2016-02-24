'use strict';
const gulp   = require('gulp');
const babel  = require('gulp-babel');
const eslint = require('gulp-eslint');
const merge  = require('merge-stream');
const uglify = require('gulp-uglify');


gulp.task('build', () => {
    let stream = gulp
        .src(['./index.js'])
        .pipe(babel({
            presets: ['es2015-node5'],
            plugins: ['transform-es2015-modules-umd']
        }))
        ;

    let normal = stream
        .pipe(gulp.dest('./dest/jsonififier.js'))
        ;

    let minified = stream
        .pipe(uglify())
        .pipe(gulp.dest('./dest/jsonifier.min.js'))
        ;

    return merge(minified, normal);
});

gulp.task('lint', () => {
    return gulp
        .src(['./index.js'])
        .pipe(eslint({
            config: '.eslintrc.json'
        }))
        .pipe(eslint.format())
        ;
});

gulp.task('default', ['lint', 'build']);
