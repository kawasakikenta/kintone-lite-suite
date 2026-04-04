'use strict';

import {
  runExportBundleJsonStandalone,
  runExportDiffHtmlStandalone,
  runExportDiffJsonStandalone,
  runExportPatchJsonStandalone
} from '../tabs/diff-export-standalone.js';

const SCOPE_OPTS = [
  ['fieldSettings', 'フィールド', true],
  ['layoutSettings', 'レイアウト', true],
  ['viewSettings', 'ビュー', true],
  ['reportSettings', 'レポート', false],
  ['processSettings', 'プロセス', true],
  ['appSettings', 'アプリ設定', false],
  ['formSettings', 'フォーム', false],
  ['customizeSettings', 'JS/CSS', false],
  ['pluginSettings', 'プラグイン', false],
  ['actionSettings', 'アクション', false],
  ['appAcl', 'アプリ権限', false],
  ['fieldAcl', 'フィールド権限', false],
  ['recordPermissions', 'レコード権限', false],
  ['notifications', '通知', false],
  ['perRecordNotifications', 'レコード条件通知', false],
  ['reminderNotifications', 'リマインダー', false],
  ['categories', 'カテゴリ', false]
];

const STYLE_ID = 'kus-diff-lite-styles';

function ensureDiffLiteStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
#kus-diff-lite-root.kus-dlite{
  --kus-accent:#2563eb;
  --kus-accent2:#0ea5e9;
  --kus-border:#e2e8f0;
  --kus-muted:#64748b;
  --kus-text:#0f172a;
  position:fixed;z-index:999999;top:max(16px,2vh);right:max(16px,2vw);
  width:min(480px,96vw);max-height:min(92vh,900px);overflow:hidden;
  display:flex;flex-direction:column;
  background:#fff;border-radius:16px;
  border:1px solid var(--kus-border);
  box-shadow:0 4px 6px -1px rgba(15,23,42,.08),0 25px 50px -12px rgba(15,23,42,.28);
  font:13px/1.5 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  color:var(--kus-text);
}
.kus-dlite__hero{
  flex-shrink:0;
  background:linear-gradient(125deg,#1d4ed8 0%,var(--kus-accent) 42%,var(--kus-accent2) 100%);
  color:#fff;padding:14px 16px 16px;
  display:flex;align-items:flex-start;justify-content:space-between;gap:12px;
}
.kus-dlite__hero-main{min-width:0}
.kus-dlite__title{margin:0;font-size:16px;font-weight:700;letter-spacing:.02em;line-height:1.25}
.kus-dlite__badge{
  display:inline-block;margin-top:8px;font-size:10px;font-weight:600;letter-spacing:.04em;
  text-transform:uppercase;background:rgba(255,255,255,.22);padding:3px 10px;border-radius:999px;
}
.kus-dlite__close{
  flex-shrink:0;border:1px solid rgba(255,255,255,.45);background:rgba(255,255,255,.12);
  color:#fff;border-radius:10px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;
}
.kus-dlite__close:hover{background:rgba(255,255,255,.22)}
.kus-dlite__body{padding:14px 16px 16px;overflow-y:auto;flex:1;min-height:0}
.kus-dlite__info{
  font-size:12px;color:var(--kus-muted);line-height:1.55;margin:0 0 14px;
  padding:10px 12px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;
}
.kus-dlite__card{
  background:#fafbfc;border:1px solid var(--kus-border);border-radius:12px;padding:12px 14px;margin-bottom:12px;
}
.kus-dlite__card-title{
  font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.06em;margin:0 0 10px;
  padding-bottom:6px;border-bottom:1px solid #e2e8f0;
}
.kus-dlite__row{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;margin-bottom:8px}
.kus-dlite__row:last-child{margin-bottom:0}
.kus-dlite__label{font-size:12px;font-weight:600;color:#334155;min-width:4.5em}
.kus-dlite__input,.kus-dlite__textarea,.kus-dlite__select{
  border:1px solid var(--kus-border);border-radius:8px;padding:7px 10px;font-size:12px;
  background:#fff;color:var(--kus-text);outline:none;transition:border-color .15s,box-shadow .15s;
}
.kus-dlite__input:focus,.kus-dlite__textarea:focus,.kus-dlite__select:focus{
  border-color:var(--kus-accent);box-shadow:0 0 0 3px rgba(37,99,235,.15);
}
.kus-dlite__input--id{width:min(120px,36vw)}
.kus-dlite__input--guest{width:min(108px,32vw)}
.kus-dlite__check{font-size:12px;color:#475569;display:inline-flex;align-items:center;gap:6px;cursor:pointer;user-select:none}
.kus-dlite__check input{width:14px;height:14px;accent-color:var(--kus-accent)}
.kus-dlite__chips{display:flex;flex-wrap:wrap;gap:6px}
.kus-dlite__chip{
  display:inline-flex;align-items:center;gap:6px;font-size:11px;color:#334155;
  background:#fff;border:1px solid #cbd5e1;border-radius:999px;padding:4px 10px 4px 6px;cursor:pointer;user-select:none;
}
.kus-dlite__chip input{accent-color:var(--kus-accent);width:13px;height:13px}
.kus-dlite__chip:hover{border-color:#94a3b8;background:#f8fafc}
.kus-dlite__textarea{width:100%;box-sizing:border-box;min-height:52px;resize:vertical;font-family:inherit}
.kus-dlite__norms{display:flex;flex-wrap:wrap;gap:10px 14px}
.kus-dlite__btn-run{
  width:100%;margin-top:4px;padding:11px 16px;font-size:13px;font-weight:700;border:none;border-radius:10px;
  background:linear-gradient(180deg,#3b82f6 0%,var(--kus-accent) 100%);color:#fff;cursor:pointer;
  box-shadow:0 2px 4px rgba(37,99,235,.35);transition:filter .15s,transform .05s;
}
.kus-dlite__btn-run:hover{filter:brightness(1.06)}
.kus-dlite__btn-run:active{transform:scale(.99)}
.kus-dlite__export-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
@media(max-width:380px){.kus-dlite__export-grid{grid-template-columns:1fr}}
.kus-dlite__btn-sub{
  padding:8px 10px;font-size:11px;font-weight:600;border:1px solid #cbd5e1;border-radius:10px;
  background:linear-gradient(180deg,#fff,#f1f5f9);color:#334155;cursor:pointer;
}
.kus-dlite__btn-sub:hover{border-color:#94a3b8;background:#fff}
.kus-dlite__status{
  margin-top:12px;padding:10px 12px;border-radius:10px;font-size:12px;line-height:1.45;min-height:2.8em;
  border:1px solid transparent;
}
.kus-dlite__status--neutral{background:#f1f5f9;color:#334155;border-color:#e2e8f0}
.kus-dlite__status--ok{background:#ecfdf5;color:#065f46;border-color:#a7f3d0}
.kus-dlite__status--err{background:#fef2f2;color:#991b1b;border-color:#fecaca}
.kus-dlite__result{
  margin-top:10px;padding:10px 12px;background:#0f172a;color:#e2e8f0;border-radius:10px;
  font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  white-space:pre-wrap;word-break:break-word;max-height:220px;overflow:auto;
  border:1px solid #1e293b;
}
`;
  document.head.appendChild(s);
}

function setStatusBar(el, text, tone) {
  el.textContent = text || '';
  el.classList.remove('kus-dlite__status--neutral', 'kus-dlite__status--ok', 'kus-dlite__status--err');
  el.classList.add(
    tone === 'ok' ? 'kus-dlite__status--ok' : tone === 'err' ? 'kus-dlite__status--err' : 'kus-dlite__status--neutral'
  );
}

function renderPanel() {
  ensureDiffLiteStyles();
  const old = document.getElementById('kus-diff-lite-root');
  if (old) old.remove();

  const root = document.createElement('div');
  root.id = 'kus-diff-lite-root';
  root.className = 'kus-dlite';

  const hero = document.createElement('div');
  hero.className = 'kus-dlite__hero';
  const heroMain = document.createElement('div');
  heroMain.className = 'kus-dlite__hero-main';
  const title = document.createElement('h1');
  title.className = 'kus-dlite__title';
  title.textContent = '差分比較';
  const badge = document.createElement('div');
  badge.className = 'kus-dlite__badge';
  badge.textContent = '軽量版 · 出力対応';
  heroMain.appendChild(title);
  heroMain.appendChild(badge);
  const close = document.createElement('button');
  close.id = 'kus-close';
  close.type = 'button';
  close.className = 'kus-dlite__close';
  close.textContent = '閉じる';
  hero.appendChild(heroMain);
  hero.appendChild(close);
  root.appendChild(hero);

  const body = document.createElement('div');
  body.className = 'kus-dlite__body';

  const info = document.createElement('p');
  info.className = 'kus-dlite__info';
  info.textContent =
    'API 取得と差分計算はこのスクリプトに同梱されています（統合ツール.js は不要）。実行後に JSON / HTML / バンドル / パッチを保存できます。';
  body.appendChild(info);

  function card(titleText) {
    const c = document.createElement('div');
    c.className = 'kus-dlite__card';
    const tt = document.createElement('div');
    tt.className = 'kus-dlite__card-title';
    tt.textContent = titleText;
    c.appendChild(tt);
    return c;
  }

  const cApp = card('アプリと環境');
  const rowSrc = document.createElement('div');
  rowSrc.className = 'kus-dlite__row';
  const ls = document.createElement('span');
  ls.className = 'kus-dlite__label';
  ls.textContent = '比較元';
  const srcApp = document.createElement('input');
  srcApp.id = 'kus-src-app';
  srcApp.type = 'text';
  srcApp.placeholder = 'アプリID';
  srcApp.className = 'kus-dlite__input kus-dlite__input--id';
  const srcGuest = document.createElement('input');
  srcGuest.id = 'kus-src-guest';
  srcGuest.type = 'text';
  srcGuest.placeholder = 'ゲストID';
  srcGuest.className = 'kus-dlite__input kus-dlite__input--guest';
  const srcPrv = document.createElement('input');
  srcPrv.id = 'kus-src-preview';
  srcPrv.type = 'checkbox';
  const srcPrvL = document.createElement('label');
  srcPrvL.className = 'kus-dlite__check';
  srcPrvL.appendChild(srcPrv);
  srcPrvL.appendChild(document.createTextNode('プレビューで取得'));
  rowSrc.appendChild(ls);
  rowSrc.appendChild(srcApp);
  rowSrc.appendChild(srcGuest);
  rowSrc.appendChild(srcPrvL);
  cApp.appendChild(rowSrc);

  const rowTgt = document.createElement('div');
  rowTgt.className = 'kus-dlite__row';
  const lt = document.createElement('span');
  lt.className = 'kus-dlite__label';
  lt.textContent = '比較先';
  const tgtApp = document.createElement('input');
  tgtApp.id = 'kus-tgt-app';
  tgtApp.type = 'text';
  tgtApp.placeholder = 'アプリID';
  tgtApp.className = 'kus-dlite__input kus-dlite__input--id';
  const tgtGuest = document.createElement('input');
  tgtGuest.id = 'kus-tgt-guest';
  tgtGuest.type = 'text';
  tgtGuest.placeholder = 'ゲストID';
  tgtGuest.className = 'kus-dlite__input kus-dlite__input--guest';
  const tgtPrv = document.createElement('input');
  tgtPrv.id = 'kus-tgt-preview';
  tgtPrv.type = 'checkbox';
  const tgtPrvL = document.createElement('label');
  tgtPrvL.className = 'kus-dlite__check';
  tgtPrvL.appendChild(tgtPrv);
  tgtPrvL.appendChild(document.createTextNode('プレビューで取得'));
  rowTgt.appendChild(lt);
  rowTgt.appendChild(tgtApp);
  rowTgt.appendChild(tgtGuest);
  rowTgt.appendChild(tgtPrvL);
  cApp.appendChild(rowTgt);
  body.appendChild(cApp);

  const cScope = card('比較セクション');
  const scBox = document.createElement('div');
  scBox.className = 'kus-dlite__chips';
  for (const kv of SCOPE_OPTS) {
    const lb = document.createElement('label');
    lb.className = 'kus-dlite__chip';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'kus-scope';
    cb.value = kv[0];
    cb.checked = !!kv[2];
    lb.appendChild(cb);
    lb.appendChild(document.createTextNode(kv[1]));
    scBox.appendChild(lb);
  }
  cScope.appendChild(scBox);
  body.appendChild(cScope);

  const cAdv = card('詳細オプション');
  const ign = document.createElement('textarea');
  ign.id = 'kus-ignore';
  ign.rows = 2;
  ign.placeholder = '無視キー（カンマ区切り）';
  ign.className = 'kus-dlite__textarea';
  const ignLab = document.createElement('div');
  ignLab.className = 'kus-dlite__row';
  ignLab.style.marginBottom = '8px';
  const ignL = document.createElement('span');
  ignL.className = 'kus-dlite__label';
  ignL.textContent = '無視キー';
  ignLab.appendChild(ignL);
  cAdv.appendChild(ignLab);
  cAdv.appendChild(ign);

  const inc = document.createElement('input');
  inc.id = 'kus-include-same';
  inc.type = 'checkbox';
  const incL = document.createElement('label');
  incL.className = 'kus-dlite__check';
  incL.style.marginTop = '10px';
  incL.style.display = 'inline-flex';
  incL.appendChild(inc);
  incL.appendChild(document.createTextNode('同一行も差分行に含める'));
  cAdv.appendChild(incL);

  const n1 = document.createElement('input');
  n1.id = 'kus-norm-view';
  n1.type = 'checkbox';
  const n2 = document.createElement('input');
  n2.id = 'kus-norm-perm';
  n2.type = 'checkbox';
  const n3 = document.createElement('input');
  n3.id = 'kus-norm-all';
  n3.type = 'checkbox';
  const norm = document.createElement('div');
  norm.className = 'kus-dlite__norms';
  norm.style.marginTop = '12px';
  function normLab(el, t) {
    const x = document.createElement('label');
    x.className = 'kus-dlite__check';
    x.appendChild(el);
    x.appendChild(document.createTextNode(t));
    return x;
  }
  norm.appendChild(normLab(n1, 'ビュー順序を正規化'));
  norm.appendChild(normLab(n2, '権限順序を正規化'));
  norm.appendChild(normLab(n3, '配列順序を無視'));
  cAdv.appendChild(norm);
  body.appendChild(cAdv);

  const run = document.createElement('button');
  run.id = 'kus-run';
  run.type = 'button';
  run.className = 'kus-dlite__btn-run';
  run.textContent = '差分比較を実行';
  body.appendChild(run);

  const cOut = card('ファイル出力');
  const hint = document.createElement('div');
  hint.style.cssText = 'font-size:11px;color:#64748b;margin-bottom:10px;line-height:1.45';
  hint.textContent = '比較完了後に利用できます。レポートに生設定を含めるか選べます。';
  cOut.appendChild(hint);

  const expRow = document.createElement('div');
  expRow.className = 'kus-dlite__row';
  const expLab = document.createElement('span');
  expLab.className = 'kus-dlite__label';
  expLab.textContent = 'レポート';
  const expMode = document.createElement('select');
  expMode.className = 'kus-dlite__select';
  expMode.style.flex = '1';
  expMode.style.minWidth = '0';
  [['diffOnly', '差分のみ'], ['withCompared', '差分 + 比較セクションの設定']].forEach(([v, t]) => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = t;
    expMode.appendChild(o);
  });
  expRow.appendChild(expLab);
  expRow.appendChild(expMode);
  cOut.appendChild(expRow);

  const grid = document.createElement('div');
  grid.className = 'kus-dlite__export-grid';

  function mkSubBtn(text) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'kus-dlite__btn-sub';
    b.textContent = text;
    return b;
  }

  const bJson = mkSubBtn('差分 JSON');
  const bHtml = mkSubBtn('差分 HTML');
  const bBundle = mkSubBtn('バンドル JSON');
  const bPatch = mkSubBtn('パッチ JSON');
  grid.appendChild(bJson);
  grid.appendChild(bHtml);
  grid.appendChild(bBundle);
  grid.appendChild(bPatch);
  cOut.appendChild(grid);
  body.appendChild(cOut);

  const st = document.createElement('div');
  st.id = 'kus-status';
  st.className = 'kus-dlite__status kus-dlite__status--neutral';
  st.textContent = '比較元・比較先のアプリIDを入力して実行してください。';
  body.appendChild(st);

  const res = document.createElement('pre');
  res.id = 'kus-result';
  res.className = 'kus-dlite__result';
  res.textContent = '';
  body.appendChild(res);

  root.appendChild(body);
  document.body.appendChild(root);

  return { root, bJson, bHtml, bBundle, bPatch, expMode, st, res };
}

function readForm(root) {
  const q = (id) => root.querySelector(`#${id}`);
  const scopes = [...root.querySelectorAll('input.kus-scope:checked')].map((x) => x.value);
  return {
    source: {
      appId: q('kus-src-app').value.trim(),
      guestId: q('kus-src-guest').value.trim(),
      preview: q('kus-src-preview').checked
    },
    target: {
      appId: q('kus-tgt-app').value.trim(),
      guestId: q('kus-tgt-guest').value.trim(),
      preview: q('kus-tgt-preview').checked
    },
    scopes,
    ignoreKeys: q('kus-ignore').value,
    includeSame: q('kus-include-same').checked,
    normalizationPresetState: {
      viewOrder: q('kus-norm-view').checked,
      permissionOrder: q('kus-norm-perm').checked,
      generalArrayOrder: q('kus-norm-all').checked
    }
  };
}

function printRows(rows, el) {
  const max = 400;
  const lines = [];
  for (let i = 0; i < rows.length && i < max; i++) {
    const r = rows[i];
    lines.push(`${r.sectionKey || ''}\t${r.type || ''}\t${r.path || ''}\t${r.label || ''}`);
  }
  el.textContent = lines.join('\n');
  if (rows.length > max) el.textContent += `\n... 他 ${rows.length - max} 件`;
}

/** @param {(opts: object) => Promise<object>} runDiffStandalone */
export function mountDiffLitePanel(runDiffStandalone) {
  const { root, bJson, bHtml, bBundle, bPatch, expMode, st, res } = renderPanel();

  /** @type {null | { rows: object[], fetchIssues: object[], sourceBundle: object, targetBundle: object, scopes: string[], ignoreKeys: string, normalizationPresetState: object }} */
  let cache = null;

  function exportCtx() {
    if (!cache) throw new Error('先に差分比較を実行してください');
    return {
      ...cache,
      exportContentMode: expMode.value || 'diffOnly'
    };
  }

  root.querySelector('#kus-run').onclick = () => {
    setStatusBar(st, '実行中…', 'neutral');
    res.textContent = '';
    cache = null;
    const f = readForm(root);
    runDiffStandalone({
      source: f.source,
      target: f.target,
      scopes: f.scopes,
      ignoreKeys: f.ignoreKeys,
      includeSame: f.includeSame,
      normalizationPresetState: f.normalizationPresetState,
      onStatus: (m) => {
        setStatusBar(st, m, 'neutral');
      }
    })
      .then((out) => {
        cache = {
          rows: out.rows,
          fetchIssues: out.fetchIssues || [],
          sourceBundle: out.sourceBundle,
          targetBundle: out.targetBundle,
          scopes: f.scopes,
          ignoreKeys: f.ignoreKeys,
          normalizationPresetState: f.normalizationPresetState
        };
        printRows(out.rows, res);
        setStatusBar(
          st,
          `${out.summary?.text || '完了'} — ファイル出力ボタンから保存できます。`,
          'ok'
        );
      })
      .catch((e) => {
        setStatusBar(st, `エラー: ${e && e.message ? e.message : String(e)}`, 'err');
      });
  };

  bJson.onclick = () => {
    try {
      runExportDiffJsonStandalone(exportCtx());
      setStatusBar(st, '差分 JSON をダウンロードしました。', 'ok');
    } catch (e) {
      setStatusBar(st, `エラー: ${e.message || String(e)}`, 'err');
    }
  };
  bHtml.onclick = () => {
    try {
      runExportDiffHtmlStandalone(exportCtx());
      setStatusBar(st, '差分 HTML をダウンロードしました。', 'ok');
    } catch (e) {
      setStatusBar(st, `エラー: ${e.message || String(e)}`, 'err');
    }
  };
  bBundle.onclick = () => {
    try {
      if (!cache) throw new Error('先に差分比較を実行してください');
      runExportBundleJsonStandalone(cache.sourceBundle, cache.targetBundle);
      setStatusBar(st, 'バンドル JSON をダウンロードしました。', 'ok');
    } catch (e) {
      setStatusBar(st, `エラー: ${e.message || String(e)}`, 'err');
    }
  };
  bPatch.onclick = () => {
    try {
      if (!cache) throw new Error('先に差分比較を実行してください');
      runExportPatchJsonStandalone(cache.rows, cache.sourceBundle, cache.targetBundle);
      setStatusBar(st, 'パッチ JSON をダウンロードしました。', 'ok');
    } catch (e) {
      setStatusBar(st, `エラー: ${e.message || String(e)}`, 'err');
    }
  };

  root.querySelector('#kus-close').onclick = () => {
    root.remove();
  };
}
