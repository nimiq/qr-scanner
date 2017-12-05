var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var closureCompiler = require('google-closure-compiler').gulp();

gulp.task('build', function() {
    return gulp.src([
            './src/worker.js',
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
        ], { base: './' })
        .pipe(sourcemaps.init())
        .pipe(closureCompiler({
            compilation_level: 'ADVANCED',
            warning_level: 'DEFAULT',
            language_in: 'ECMASCRIPT6_STRICT',
            language_out: 'ECMASCRIPT5_STRICT',
            output_wrapper: '(function(){\n%output%\n}).call(this)',
            js_output_file: 'qr-scanner-worker.min.js'
        }))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('.'));
});