var gulp = require('gulp');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');
var babel = require('gulp-babel');
var merge = require('merge2');
var uglify = require('gulp-uglify');

gulp.task('build', function() {
    return merge(
        gulp.src('./src/prefix.js')
            .pipe(sourcemaps.init()),

        gulp.src([
                './src/binarizer.js',
                './src/grid.js',
                './src/version.js',
                './src/detector.js',
                './src/formatinf.js',
                './src/errorlevel.js',
                './src/bitmat.js',
                './src/datablock.js',
                './src/bmparser.js',
                './src/datamask.js',
                './src/rsdecoder.js',
                './src/gf256poly.js',
                './src/gf256.js',
                './src/decoder.js',
                './src/qrcode.js',
                './src/findpat.js',
                './src/alignpat.js',
                './src/databr.js'
            ])
            .pipe(sourcemaps.init())
            .pipe(concat('tmp.js'))
            .pipe(babel({
                presets: ['env']
            })),

        gulp.src('./src/suffix.js')
            .pipe(sourcemaps.init())
    )
    .pipe(concat('qr-scanner-lib.min.js'))
    .pipe(uglify())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('.'));
});