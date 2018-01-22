const gulp = require('gulp');
const sourcemaps = require('gulp-sourcemaps');
const closureCompiler = require('google-closure-compiler').gulp();
const concat = require('gulp-concat');


gulp.task('default', ['build-library', 'build-worker']);

gulp.task('build-library', () =>
    gulp.src(['./src/qr-scanner.js'])
        .pipe(sourcemaps.init())
        .pipe(closureCompiler({
            compilation_level: 'WHITESPACE_ONLY',
            warning_level: 'DEFAULT',
            language_in: 'ECMASCRIPT6_STRICT',
            language_out: 'ECMASCRIPT6_STRICT',
            js_output_file: 'qr-scanner.min.js'
        }))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('.'))
);

gulp.task('build-worker', () =>
    gulp.src([
            './src/worker.js',
            './src/lib/binarizer.js',
            './src/lib/grid.js',
            './src/lib/version.js',
            './src/lib/detector.js',
            './src/lib/formatinf.js',
            './src/lib/errorlevel.js',
            './src/lib/bitmat.js',
            './src/lib/datablock.js',
            './src/lib/bmparser.js',
            './src/lib/datamask.js',
            './src/lib/rsdecoder.js',
            './src/lib/gf256poly.js',
            './src/lib/gf256.js',
            './src/lib/decoder.js',
            './src/lib/qrcode.js',
            './src/lib/findpat.js',
            './src/lib/alignpat.js',
            './src/lib/databr.js'
        ], { base: './' })
        .pipe(sourcemaps.init())
        .pipe(closureCompiler({
            compilation_level: 'ADVANCED',
            warning_level: 'QUIET',
            language_in: 'ECMASCRIPT6_STRICT',
            language_out: 'ECMASCRIPT5_STRICT',
            output_wrapper: '(function(){\n%output%\n}).call(this)',
            js_output_file: 'qr-scanner-worker.min.js'
        }))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('.'))
);
