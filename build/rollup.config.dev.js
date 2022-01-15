const path = require('path');
import { babel } from '@rollup/plugin-babel'
import livereload from 'rollup-plugin-livereload'

// 返回文件的绝对路径
const resolveFile = function (filename) {
  return path.join(__dirname, '..', filename);
}

module.exports = {
  input: resolveFile('lib/index.ts'),
  output: {
    file: resolveFile('dist/index.js'),
    format: 'esm',
    sourcemap: true,
  },
  external: ['cesium'],
  plugins: [
    // 使用babel转义代码
    babel({
      babelrc: false,
      babelHelpers: 'runtime',
      exclude: 'node_modules/**',
      presets: [['@babel/preset-env', {
        "targets": {
          "edge": '17',
          "firefox": '60',
          "chrome": '67',
          "safari": '11.1',
        },
      }]],
      plugins: [
        ['@babel/plugin-transform-runtime']],
    }),
    // 开启热更新
    livereload()
  ],
}