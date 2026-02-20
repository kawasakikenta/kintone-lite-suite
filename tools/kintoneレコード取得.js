(() => {
  'use strict';

  // ====== 小さなユーティリティ ======
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const escapeCsv = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const dl = (filename, blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 0);
  };
  const nowStamp = () => {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  };

  // 値を見やすく整形（代表的な型をそれっぽく展開）
  const normalizeValue = (cell) => {
    if (cell == null) return '';
    if (typeof cell === 'object' && 'value' in cell && Object.keys(cell).length === 1) {
      return cell.value; // { value: ... } だけなら中身を返す
    }
    // ユーザー/組織/グループ/選択肢などの配列
    if (Array.isArray(cell)) {
      // {name:"",code:""} や {value:""} が並ぶ想定をなるべく吸収
      return cell.map(x => (x?.name ?? x?.code ?? x?.value ?? JSON.stringify(x))).join(', ');
    }
    // サブテーブルは JSON に
    if (Array.isArray(cell?.value) && cell?.type === 'SUBTABLE') {
      return JSON.stringify(cell.value);
    }
    // それ以外のオブジェクトは value を見るか JSON に
    if (typeof cell === 'object') {
      if ('value' in cell) return cell.value;
      return JSON.stringify(cell);
    }
    return cell;
  };

  // ====== 既存パネルの多重作成を防止 ======
  if (document.getElementById('kt-getq-panel')) {
    alert('kintone GET Query ツールは既に開いています。');
    return;
  }

  // ====== パネル UI を作成 ======
  const root = document.createElement('div');
  root.id = 'kt-getq-panel';
  root.innerHTML = `
    <div class="ktgq-wrap">
      <div class="ktgq-head">
        <strong>kintone GET Query</strong>
        <div class="ktgq-actions">
          <button id="ktgq-run">実行</button>
          <button id="ktgq-copy">JSONをコピー</button>
          <button id="ktgq-dljson">JSON保存</button>
          <button id="ktgq-dlcsv">CSV保存</button>
          <button id="ktgq-close" title="閉じる">×</button>
        </div>
      </div>
      <div class="ktgq-grid">
        <label>App ID
          <input id="ktgq-app" type="number" placeholder="例) 123" />
        </label>
        <label>Guest Space ID
          <input id="ktgq-guest" type="number" placeholder="（通常は空）" />
        </label>
        <label>Fields（カンマ区切り）
          <input id="ktgq-fields" type="text" placeholder="空なら全フィールド（※先頭レコード基準）" />
        </label>
        <label>Query
          <input id="ktgq-query" type="text" placeholder="例) 受注日 >= DATE(\"2024-01-01\") order by 受注日 desc" />
        </label>
        <label>条件
          <span class="ktgq-inline">
            <input id="ktgq-fetchall" type="checkbox" checked />
            <span>全件取得（自動ページング）</span>
          </span>
        </label>
        <label>1回あたりの件数
          <input id="ktgq-chunk" type="number" value="500" min="1" max="500" />
        </label>
        <label>最大取得件数（全件時）
          <input id="ktgq-max" type="number" value="5000" min="1" />
        </label>
      </div>
      <div class="ktgq-foot">
        <div id="ktgq-status">準備完了</div>
      </div>
      <div class="ktgq-out">
        <table id="ktgq-table"><thead></thead><tbody></tbody></table>
      </div>
    </div>
  `;
  const style = document.createElement('style');
  style.textContent = `
    #kt-getq-panel {
      position: fixed; z-index: 999999; top: 24px; right: 24px;
      width: min(900px, calc(100vw - 48px)); max-height: calc(100vh - 48px);
      box-shadow: 0 8px 24px rgba(0,0,0,.2); border-radius: 12px;
      background: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Meiryo, sans-serif;
      overflow: hidden;
    }
    .ktgq-wrap { display: grid; grid-template-rows: auto auto auto 1fr; }
    .ktgq-head { display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background: #1A6EBF; color:#fff; }
    .ktgq-head strong { font-size: 14px; letter-spacing: .2px; }
    .ktgq-actions button { margin-left:8px; }
    .ktgq-grid {
      display:grid; grid-template-columns: repeat(2, 1fr); gap:10px; padding:12px; background:#f7f9fc; border-bottom:1px solid #e5e8ee;
      font-size: 12px;
    }
    .ktgq-grid label { display:flex; flex-direction:column; gap:6px; }
    .ktgq-grid input[type="text"], .ktgq-grid input[type="number"] {
      padding:6px 8px; border:1px solid #cbd3df; border-radius:8px; font-size:12px;
    }
    .ktgq-inline { display:inline-flex; align-items:center; gap:6px; }
    .ktgq-foot { padding:8px 12px; background:#fff; border-bottom:1px solid #e5e8ee; font-size:12px; color:#444; }
    .ktgq-out { overflow:auto; max-height: 60vh; }
    .ktgq-actions button, .ktgq-foot button {
      padding:6px 10px; border:1px solid #cbd3df; border-radius:8px; background:#fff; cursor:pointer; font-size:12px;
    }
    #ktgq-close { background:#ffedf0; border-color:#ffccd3; }
    #ktgq-table { border-collapse: collapse; width: 100%; font-size:12px; }
    #ktgq-table thead th { position: sticky; top:0; background:#eef5ff; border-bottom:1px solid #cbd3df; text-align:left; padding:6px 8px; }
    #ktgq-table td { border-top:1px solid #eef2f7; padding:6px 8px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; max-width: 360px; }
    #ktgq-table tbody tr:nth-child(even){ background:#fafcff; }
    @media (max-width: 720px) {
      .ktgq-grid { grid-template-columns: 1fr; }
    }
    .ktgq-actions button {
  margin-left: 8px;
  padding: 6px 10px;
  border: 1px solid #cbd3df;
  border-radius: 8px;
  background: #e6f0ff; /* ← 全体の基本色（青系の淡い背景） */
  color: #0b3d91;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s, transform 0.1s;
}
.ktgq-actions button:hover {
  background: #d0e2ff;
  transform: translateY(-1px);
}

/* 特定ボタンを強調 */
#ktgq-run {
  background: #1a73e8;
  color: #fff;
  border-color: #1a73e8;
}
#ktgq-run:hover {
  background: #155cc0;
}

#ktgq-copy {
  background: #fff8e1;
  border-color: #ffe082;
  color: #8d6e00;
}
#ktgq-copy:hover {
  background: #ffecb3;
}

#ktgq-dljson {
  background: #e8f5e9;
  border-color: #a5d6a7;
  color: #1b5e20;
}
#ktgq-dljson:hover {
  background: #c8e6c9;
}

#ktgq-dlcsv {
  background: #f3e5f5;
  border-color: #ce93d8;
  color: #4a148c;
}
#ktgq-dlcsv:hover {
  background: #e1bee7;
}

#ktgq-close {
  background: #ffebee;
  border-color: #ef9a9a;
  color: #b71c1c;
}
#ktgq-close:hover {
  background: #ffcdd2;
}

  `;
  document.body.appendChild(style);
  document.body.appendChild(root);

  // 参照
  const elApp     = $('#ktgq-app', root);
  const elGuest   = $('#ktgq-guest', root);
  const elFields  = $('#ktgq-fields', root);
  const elQuery   = $('#ktgq-query', root);
  const elFetchAll= $('#ktgq-fetchall', root);
  const elChunk   = $('#ktgq-chunk', root);
  const elMax     = $('#ktgq-max', root);
  const elStatus  = $('#ktgq-status', root);
  const elTHead   = $('#ktgq-table thead', root);
  const elTBody   = $('#ktgq-table tbody', root);

  // デフォルト値を画面から推測
  try {
    // kintone の URL から app を推測（/k/123/show 等）
    const m = location.pathname.match(/\/k\/(?:guest\/(\d+)\/)?\w+\/(\d+)\//);
    if (m) {
      if (m[1]) elGuest.value = m[1];
      if (m[2]) elApp.value = m[2];
    }
  } catch {}

  // ====== API コール（自動ページング対応） ======
  const fetchRecords = async ({app, query, fields, chunkSize, fetchAll, guestSpaceId, maxTotal}) => {
    if (!window.kintone?.api) throw new Error('kintone.api が見つかりません。kintone 画面上で実行してください。');
    const toPath = (p) => guestSpaceId ? `/k/guest/${guestSpaceId}${p}` : `/k${p}`;
    const path = toPath('/v1/records.json');
    const paramsBase = { app: Number(app) };
    if (query) paramsBase.query = query;
    if (fields?.length) paramsBase.fields = fields;
    const total = [];
    let offset = 0;
    let round = 0;

    // totalCount を最初に取得（速いとは限らないが目安になる）
    let expected = null;
    try {
      const res0 = await kintone.api(path, 'GET', { ...paramsBase, totalCount: true, limit: 1 });
      expected = Number(res0.totalCount ?? 0);
    } catch {
      // totalCount 取得に失敗したら無視
    }

    const limitOnce = Math.min(Math.max(1, chunkSize), 500);
    const maxCap = Math.max(limitOnce, maxTotal ?? 5000);

    while (true) {
      round++;
      elStatus.textContent = `取得中… (ラウンド ${round}, offset ${offset})`;
      const res = await kintone.api(path, 'GET', { ...paramsBase, limit: limitOnce, offset });
      total.push(...res.records);
      if (!fetchAll) break;
      if (res.records.length < limitOnce) break; // 末尾
      offset += limitOnce;
      if (total.length >= maxCap) break;
    }
    elStatus.textContent = `取得完了：${total.length} 件${expected!=null ? `（推定総数: ${expected}）` : ''}`;
    return total;
  };

  // ====== 表示描画 ======
  const renderTable = (records, fields) => {
    elTHead.innerHTML = '';
    elTBody.innerHTML = '';
    if (!records?.length) return;

    // フィールド候補（明示指定が無ければ先頭レコードのキーを使用）
    const keys = (fields?.length ? fields : Object.keys(records[0] || {}));

    const th = document.createElement('tr');
    keys.forEach(k => {
      const c = document.createElement('th');
      c.textContent = k;
      th.appendChild(c);
    });
    elTHead.appendChild(th);

    const frag = document.createDocumentFragment();
    records.forEach(rec => {
      const tr = document.createElement('tr');
      keys.forEach(k => {
        const td = document.createElement('td');
        const v = rec[k];
        td.textContent = normalizeValue(v);
        td.title = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
        tr.appendChild(td);
      });
      frag.appendChild(tr);
    });
    elTBody.appendChild(frag);
  };

  // ====== CSV 生成 ======
  const toCsv = (records, fields) => {
    if (!records?.length) return '';
    const keys = (fields?.length ? fields : Object.keys(records[0] || {}));
    const head = keys.map(escapeCsv).join(',');
    const rows = records.map(rec => keys.map(k => escapeCsv(normalizeValue(rec[k]))).join(','));
    return [head, ...rows].join('\n');
  };

  // ====== イベント ======
  $('#ktgq-close', root).addEventListener('click', () => root.remove());

  $('#ktgq-run', root).addEventListener('click', async () => {
    try {
      const app = Number(elApp.value);
      if (!app) { alert('App ID を入力してください'); return; }
      const query = elQuery.value.trim();
      const fields = elFields.value.trim()
        ? elFields.value.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      const chunkSize = Number(elChunk.value) || 500;
      const fetchAll = elFetchAll.checked;
      const guestSpaceId = elGuest.value.trim();
      const maxTotal = Number(elMax.value) || 5000;

      elStatus.textContent = '取得開始…';
      const records = await fetchRecords({ app, query, fields, chunkSize, fetchAll, guestSpaceId, maxTotal });
      renderTable(records, fields);

      // 結果をパネルに保持
      root._ktgq_records = records;
      root._ktgq_fields = fields;
    } catch (e) {
      console.error(e);
      elStatus.textContent = `エラー: ${e?.message || e}`;
      alert(`エラー: ${e?.message || e}`);
    }
  });

  $('#ktgq-copy', root).addEventListener('click', async () => {
    const records = root._ktgq_records || [];
    try {
      await navigator.clipboard.writeText(JSON.stringify(records, null, 2));
      elStatus.textContent = `JSON をコピーしました（${records.length}件）`;
    } catch {
      elStatus.textContent = `クリップボードに書き込めませんでした`;
    }
  });

  $('#ktgq-dljson', root).addEventListener('click', () => {
    const records = root._ktgq_records || [];
    dl(`kintone_records_${nowStamp()}.json`, new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' }));
  });

  $('#ktgq-dlcsv', root).addEventListener('click', () => {
    const records = root._ktgq_records || [];
    const csv = toCsv(records, root._ktgq_fields || []);
    dl(`kintone_records_${nowStamp()}.csv`, new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  });

  // 初期メッセージ
  elStatus.textContent = 'App ID を確認して「実行」を押してください';
})();
