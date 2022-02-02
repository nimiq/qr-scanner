import sourcemaps from 'rollup-plugin-sourcemaps';
// ts config is a combination of tsconfig.json and overrides here. Type declarations file is generated separately via
// tsc (see build script in package.json), because rollup can not emit multiple files if using output.file option.
import typescript from '@rollup/plugin-typescript';
import closureCompiler from '@ampproject/rollup-plugin-closure-compiler';

// not using rollup's output.banner/output.intro/output.footer/output.outro as we also have to modify the generated code
function workerScriptToDynamicImport() {
    return {
        name: 'worker-script-to-dynamic-import',
        generateBundle(options, bundle) {
            for (const chunkName of Object.keys(bundle)) {
                const chunk = bundle[chunkName];
                if (chunk.type !== 'chunk') {
                    continue;
                }
                chunk.code = 'export default new Worker(URL.createObjectURL(new Blob([`'
                    + chunk.code.replace(/`/g, '\\`').replace(/\${/g, '\\${')
                    + '`]),{type: "application/javascript"}))';
            }
        },
    };
}

export default () => [
    ...([
        // standard build specific settings
        {
            output: [{
                file: 'qr-scanner.min.js',
                format: 'esm',
            }, {
                file: 'qr-scanner.umd.min.js',
                format: 'umd',
                name: 'QrScanner',
            }],
            language_out: 'ECMASCRIPT_2017',
        },
        // legacy build specific settings
        {
            output: [{
                file: 'qr-scanner.legacy.min.js',
                format: 'esm',
            }],
            language_out: 'ECMASCRIPT6',
        },
    ].map((specificSettings) => ({
        input: 'src/qr-scanner.ts',
        // Note that this results in the dynamic import of the worker to also be a dynamic import in the umd build.
        // However, umd builds do not support multiple chunks, so that's probably the best we can do, as js dynamic
        // imports are now widely supported anyways.
        external: ['./qr-scanner-worker.min.js'],
        output: specificSettings.output.map((output) => ({
            interop: false,
            sourcemap: true,
            ...output,
        })),
        plugins: [
            typescript({
                target: 'ES2017',
            }),
            closureCompiler({
                language_in: 'ECMASCRIPT_2017',
                language_out: specificSettings.language_out,
                rewrite_polyfills: false,
            })
        ],
    }))),
    // worker
    {
        input: 'src/worker.ts',
        output: {
            file: 'qr-scanner-worker.min.js',
            format: 'iife',
            interop: false,
            sourcemap: true,
        },
        plugins: [
            typescript(),
            sourcemaps(),
            closureCompiler({
                //compilation_level: 'ADVANCED',
                //warning_level: 'QUIET',
                language_in: 'ECMASCRIPT6',
                language_out: 'ECMASCRIPT6',
                rewrite_polyfills: false,
            }),
            workerScriptToDynamicImport(),
        ]
    },
];
