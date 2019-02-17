import sourcemaps from 'rollup-plugin-sourcemaps';
import closureCompiler from '@ampproject/rollup-plugin-closure-compiler';

export default [{
    // library
    input: 'src/qr-scanner.js',
    output: {
        file: 'qr-scanner.min.js',
        format: 'esm',
        interop: false,
        sourcemap: true,
    },
    plugins: [
        closureCompiler({
            language_in: 'ECMASCRIPT6',
            language_out: 'ECMASCRIPT6',
            rewrite_polyfills: false,
        })
    ]
}, {
    // worker
    input: 'src/worker.js',
    output: {
        file: 'qr-scanner-worker.min.js',
        format: 'iife',
        interop: false,
        sourcemap: true,
    },
    plugins: [
        sourcemaps(),
        closureCompiler({
            //compilation_level: 'ADVANCED',
            //warning_level: 'QUIET',
            language_in: 'ECMASCRIPT6',
            language_out: 'ECMASCRIPT6',
            rewrite_polyfills: false,
        }),
    ]
}];
