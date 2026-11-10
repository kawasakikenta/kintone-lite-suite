'use strict';
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
if (args.length && !(args.length === 2 && args[0] === '--browser' && ['chrome', 'chromium'].includes(args[1]))) {
  console.error('Usage: npm run test:all -- [--browser chrome|chromium]');
  process.exit(1);
}
if (!process.env.npm_execpath) {
  console.error('npm run test:all から実行してください。');
  process.exit(1);
}
// 通し検証（*-explore）は、配布物をそのまま読み込んで状態を持つ合成 kintone につなぐ。
// 本番反映の通し検証（test:deploy-explore）は規模のシナリオに数分かかるため、ここには入れず手動で実行する。
const suites = ['check', 'test:output-layouts', 'test:lite-shared', 'test:record-metadata', 'test:record-quality', 'test:record-explore', 'test:lite-workflows',
  'test:field-jsconfig-explore', 'test:settings-design-explore', 'test:reflect-dom', 'test:reflect-explore', 'test:deploy-dom',
  'test:diff-multi-dom', 'test:diff-pairs-dom', 'test:diff-pair-folders-dom', 'test:diff-compare', 'test:diff-explore', 'test:er-compare', 'test:er-explore'];
const results = [];
for (const suite of suites) {
  console.log(`\n[all-tests] ${suite}`);
  const start = Date.now();
  const browserArgs = suite === 'check' || suite === 'test:output-layouts' ? [] : args;
  const run = spawnSync(process.execPath, [process.env.npm_execpath, 'run', suite, ...(browserArgs.length ? ['--', ...browserArgs] : [])],
    { cwd: root, stdio: 'inherit', windowsHide: true });
  const passed = !run.error && run.status === 0;
  results.push({ suite, passed, durationMs: Date.now() - start, ...(run.error ? { error: run.error.message } : {}) });
  // ビルドできなかった場合、古い配布物で画面テストを通さない。
  if (suite === 'check' && !passed) break;
}
const output = path.join(root, '.iter-shots/all-tests');
fs.mkdirSync(output, { recursive: true });
const passed = results.length === suites.length && results.every(result => result.passed);
fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ passed, results }, null, 2));
console.log('\n' + results.map(result => `${result.passed ? 'PASS' : 'FAIL'} ${result.suite}`).join('\n'));
process.exitCode = passed ? 0 : 1;
