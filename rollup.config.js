import terser from '@rollup/plugin-terser';
import run from '@rollup/plugin-run';

const isDevelopmentMode = process.env.ROLLUP_WATCH === 'true';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/index.js',
    format: 'es',
    sourcemap: isDevelopmentMode
  },
  plugins: [
   !isDevelopmentMode && terser(),
    isDevelopmentMode && run({
      execArgv: ['-r', 'source-map-support/register']
    })
  ]
}
