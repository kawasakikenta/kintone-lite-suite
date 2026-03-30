(() => {
  'use strict';
  if (!window.kintone?.api) return alert('kintone画面で実行してください');

  // =========================================================
  // Kintone Diff Export (Tree) v8.0.0
  //
  // v8.0.0 改善点 (v7.0.0 からの差分):
  // 15. デプロイボタン追加 (Preview → 本番反映)
  // 16. 全カテゴリ横断の差分一括選択
  // 17. ドラッグ&ドロップ JSON 読込
  // 18. 差分レポートHTML/Markdownエクスポート
  // 19. 検索ハイライト (マッチ箇所を強調)
  // 20. 右パネル折りたたみ + リサイズ
  // 21. Undo/Redo 機能 (選択操作の取り消し)
  // 22. 自動スナップ保存 (2分間隔)
  // 23. 仮想スクロール (大量ノード対応)
  // 24. フィールド依存チェック (関連フィールド警告)
  // 25. 操作ログパネル (実行履歴)
  // 26. カテゴリ毎の選択件数バッジ
  // 27. ノード右クリックコンテキストメニュー
  // 28. 比較モード切替 (Inline / Side-by-Side)
  // 29. お気に入りノード (ピン留め)
  // 30. ショートカットキーヘルプ
  // =========================================================

  const TOOL = { name: 'Kintone Diff Export (Tree)', version: '8.0.0' };
  const ROOT_ID = 'kdExportTreeRoot';

  // =================================================================
  //  Module 1: Utilities (純粋関数 — テスト可能)
  // =================================================================
  const Utils = (() => {
    const esc = (s) =>
      String(s ?? '').replace(/[&<>"']/g, (m) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]
      );

    const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));
    const now = () => new Date().toISOString();
    const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

    function deepEqual(a, b) {
      if (a === b) return true;
      if (a == null || b == null) return a === b;
      if (typeof a !== typeof b) return false;
      if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
          if (!deepEqual(a[i], b[i])) return false;
        }
        return true;
      }
      if (typeof a === 'object') {
        const ka = Object.keys(a).sort();
        const kb = Object.keys(b).sort();
        if (ka.length !== kb.length) return false;
        for (let i = 0; i < ka.length; i++) {
          if (ka[i] !== kb[i]) return false;
          if (!deepEqual(a[ka[i]], b[ka[i]])) return false;
        }
        return true;
      }
      return false;
    }

    function stableStringify(obj, space = 2) {
      const seen = new WeakSet();
      const norm = (v) => {
        if (v && typeof v === 'object') {
          if (seen.has(v)) return '[Circular]';
          seen.add(v);
          if (Array.isArray(v)) return v.map(norm);
          const out = {};
          Object.keys(v).sort().forEach((k) => (out[k] = norm(v[k])));
          return out;
        }
        return v;
      };
      return JSON.stringify(norm(obj), null, space);
    }

    function setByPath(obj, pathArr, value) {
      let cur = obj;
      for (let i = 0; i < pathArr.length - 1; i++) {
        const k = pathArr[i];
        if (!isObj(cur[k])) cur[k] = {};
        cur = cur[k];
      }
      cur[pathArr[pathArr.length - 1]] = value;
    }

    function delByPath(obj, pathArr) {
      let cur = obj;
      for (let i = 0; i < pathArr.length - 1; i++) {
        const k = pathArr[i];
        if (!isObj(cur[k])) return;
        cur = cur[k];
      }
      delete cur[pathArr[pathArr.length - 1]];
    }

    function insertUsingAnchors(l, c, s) {
      if (l.includes(c)) return l;
      const i = s.indexOf(c);
      if (i < 0) { l.push(c); return l; }
      for (let j = i - 1; j >= 0; j--) {
        const p = l.indexOf(s[j]);
        if (p >= 0) { l.splice(p + 1, 0, c); return l; }
      }
      for (let j = i + 1; j < s.length; j++) {
        const p = l.indexOf(s[j]);
        if (p >= 0) { l.splice(p, 0, c); return l; }
      }
      l.push(c);
      return l;
    }

    function convertLookupAppIds(fieldDef, map) {
      const def = clone(fieldDef);
      let changed = false;
      const walk = (d) => {
        if (!d || typeof d !== 'object') return;
        const ra = d.lookup?.relatedApp;
        if (ra && ra.app != null) {
          const before = String(ra.app);
          const after = map?.[before];
          if (after && String(after) !== before) {
            d.lookup.relatedApp.app = String(after);
            changed = true;
          }
        }
        if (d.type === 'SUBTABLE' && d.fields && typeof d.fields === 'object') {
          Object.values(d.fields).forEach(walk);
        }
      };
      walk(def);
      return { def, changed };
    }

    function makeUniqueCode(base, usedSet) {
      let c = base + '_';
      while (usedSet.has(c)) c += '_';
      return c;
    }

    function replaceCodesInObject(obj, codeMap) {
      const walk = (v) => {
        if (Array.isArray(v)) return v.map(walk);
        if (v && typeof v === 'object') {
          for (const k of Object.keys(v)) {
            const val = v[k];
            if (k === 'fields' && Array.isArray(val)) {
              v[k] = val.map((x) => codeMap[x] || x);
              continue;
            }
            if ((k === 'code' || k === 'field') && typeof val === 'string' && codeMap[val]) {
              v[k] = codeMap[val];
              continue;
            }
            v[k] = walk(val);
          }
        }
        return v;
      };
      return walk(obj);
    }

    function el(tag, attrs = {}, children = []) {
      const e = document.createElement(tag);
      for (const [k, v] of Object.entries(attrs)) {
        if (k === 'className') e.className = v;
        else if (k === 'textContent') e.textContent = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
        else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'dataset' && typeof v === 'object') Object.assign(e.dataset, v);
        else e.setAttribute(k, v);
      }
      for (const c of (Array.isArray(children) ? children : [children])) {
        if (c == null) continue;
        e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      }
      return e;
    }

    // 改善18: タイムスタンプフォーマット
    function formatTime(isoStr) {
      if (!isoStr) return '';
      const d = new Date(isoStr);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }

    // 改善21: 簡易ハッシュ (undoスタック識別)
    function quickHash(set) {
      return [...set].sort().join('|');
    }

    return {
      esc, clone, now, isObj, deepEqual, stableStringify,
      setByPath, delByPath, insertUsingAnchors,
      convertLookupAppIds, makeUniqueCode, replaceCodesInObject, el,
      formatTime, quickHash,
    };
  })();

  // =================================================================
  //  Module 2: Storage (localStorage + IndexedDB fallback)
  // =================================================================
  const Storage = (() => {
    const DB_NAME = 'kdExportTreeDB';
    const STORE = 'snapshots';

    function openDB() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }

    async function idbGet(key) {
      try {
        const db = await openDB();
        return new Promise((resolve) => {
          const tx = db.transaction(STORE, 'readonly');
          const req = tx.objectStore(STORE).get(key);
          req.onsuccess = () => resolve(req.result ?? null);
          req.onerror = () => resolve(null);
        });
      } catch { return null; }
    }

    async function idbSet(key, value) {
      try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).put(value, key);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => reject(tx.error);
        });
      } catch { return false; }
    }

    function lsGet(key) {
      try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
    }

    function lsSet(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        console.warn('localStorage full, falling back to IndexedDB', e);
        return false;
      }
    }

    return {
      getPrefs: () => lsGet('kdExportTree.pref'),
      setPrefs: (v) => lsSet('kdExportTree.pref', v),
      async getSnapshot() {
        const ls = lsGet('kdExportTree.snap');
        if (ls) return ls;
        return idbGet('snap');
      },
      async setSnapshot(v) {
        if (!lsSet('kdExportTree.snap', v)) {
          await idbSet('snap', v);
        }
      },
      // 改善25: 操作ログ保存
      getLogs: () => lsGet('kdExportTree.logs') || [],
      setLogs: (v) => lsSet('kdExportTree.logs', v),
    };
  })();

  // =================================================================
  //  Module 3: API Layer
  // =================================================================
  const API = (() => {
    function callApi(path, method, params, preview) {
      const p = preview ? path.replace('/k/v1/', '/k/v1/preview/') : path;
      return kintone.api(kintone.api.url(p, true), method, params);
    }

    async function callWithRetry(path, method, params, preview, retries = 2) {
      for (let i = 0; i <= retries; i++) {
        try {
          return await callApi(path, method, params, preview);
        } catch (e) {
          if (i === retries) throw e;
          await new Promise((r) => setTimeout(r, 800 * (i + 1)));
        }
      }
    }

    const ENDPOINTS = [
      { key: 'fields', label: 'フィールド', group: '基本設定', get: '/k/v1/app/form/fields.json' },
      { key: 'views', label: '一覧', group: '基本設定', get: '/k/v1/app/views.json' },
      { key: 'layout', label: 'フォームレイアウト', group: '基本設定', get: '/k/v1/app/form/layout.json' },
      { key: 'status', label: 'プロセス管理', group: '業務設定', get: '/k/v1/app/status.json' },
      { key: 'actions', label: 'レコードアクション', group: '業務設定', get: '/k/v1/app/actions.json' },
      { key: 'reports', label: 'レポート', group: '業務設定', get: '/k/v1/app/reports.json' },
      { key: 'notifGeneral', label: '通知（一般）', group: '通知', get: '/k/v1/app/notifications/general.json' },
      { key: 'notifPerRecord', label: '通知（レコード条件）', group: '通知', get: '/k/v1/app/notifications/perRecord.json' },
      { key: 'notifReminder', label: '通知（リマインダー）', group: '通知', get: '/k/v1/app/notifications/reminder.json' },
      { key: 'aclApp', label: '権限（アプリ）', group: '権限', get: '/k/v1/app/acl.json' },
      { key: 'aclRecord', label: '権限（レコード）', group: '権限', get: '/k/v1/record/acl.json' },
      { key: 'aclField', label: '権限（フィールド）', group: '権限', get: '/k/v1/field/acl.json' },
    ];

    // 改善15: デプロイAPI
    async function deployApp(appId) {
      return callApi('/k/v1/preview/app/deploy.json', 'POST', { apps: [{ app: appId }] }, false);
    }

    async function getDeployStatus(appId) {
      return callApi('/k/v1/preview/app/deploy.json', 'GET', { apps: [appId] }, false);
    }

    return { callApi, callWithRetry, ENDPOINTS, deployApp, getDeployStatus };
  })();

  // =================================================================
  //  Module 4: Diff Engine (純粋関数)
  // =================================================================
  const DiffEngine = (() => {
    const { deepEqual, isObj, clone } = Utils;

    const keyFns = {
      notifGeneral: (n) => `${n?.entity?.type ?? ''}:${n?.entity?.code ?? ''}`,
      notifPerRecord: (n) => `${(n?.filterCond ?? '').trim()}|${(n?.title ?? '').trim()}`,
      notifReminder: (n) => {
        const t = n?.timing || {};
        return `${t.code ?? ''}|${t.daysLater ?? ''}|${t.hoursLater ?? ''}|${t.time ?? ''}|${(n?.filterCond ?? '').trim()}|${(n?.title ?? '').trim()}`;
      },
      aclApp: (r) => `${r?.entity?.type ?? ''}:${r?.entity?.code ?? ''}`,
      aclRecord: (r) => (r?.filterCond ?? '').trim() || '(no-filter)',
      aclField: (r) => (r?.code ?? '').trim() || '(no-code)',
    };

    function makeNode({ id, kind, label, op = 'same', pathStr = '', source, target, meta = {}, children = [] }) {
      return { id, kind, label, op, pathStr, source, target, meta, children };
    }

    function flattenNodes(root) {
      const out = [];
      const walk = (n) => { out.push(n); (n.children || []).forEach(walk); };
      walk(root);
      return out;
    }

    function summarizeOp(node) {
      const flat = flattenNodes(node).filter((n) => n.kind === 'leaf');
      const diff = flat.filter((n) => n.op !== 'same').length;
      return { diff, total: flat.length };
    }

    function diffObjectToTree({ entityKey, itemKey, label, source, target, baseId, basePath = [], maxDepth = 4, depth = 0, excludeKeys = new Set() }) {
      const nodeOp =
        source === undefined && target !== undefined ? 'removed' :
        source !== undefined && target === undefined ? 'added' :
        deepEqual(source, target) ? 'same' : 'changed';

      if (depth >= maxDepth || Array.isArray(source) || Array.isArray(target) || !isObj(source) || !isObj(target)) {
        const mut = source === undefined
          ? { type: 'delPath', path: basePath.slice() }
          : { type: 'setPath', path: basePath.slice(), value: source };
        return makeNode({ id: baseId, kind: 'leaf', label, op: nodeOp, pathStr: basePath.join('.'), source, target, meta: { entityKey, itemKey, mut } });
      }

      const keys = [...new Set([...Object.keys(source || {}), ...Object.keys(target || {})])]
        .filter((k) => !excludeKeys.has(k)).sort();
      const children = keys.map((k) =>
        diffObjectToTree({
          entityKey, itemKey, label: k, source: source?.[k], target: target?.[k],
          baseId: `${baseId}.${k}`, basePath: basePath.concat([k]), maxDepth, depth: depth + 1, excludeKeys,
        })
      );
      const allSame = children.every((c) => c.op === 'same' || (c.kind !== 'leaf' && summarizeOp(c).diff === 0));
      return makeNode({ id: baseId, kind: 'group', label, op: allSame ? 'same' : 'changed', pathStr: basePath.join('.'), source, target, meta: { entityKey, itemKey }, children });
    }

    function buildViewsTree(ek, s, t, d) {
      const sv = s?.views || {}, tv = t?.views || {};
      const ks = [...new Set([...Object.keys(sv), ...Object.keys(tv)])].sort();
      const ch = ks.map((k) => {
        const sV = sv[k], tV = tv[k];
        const op = !tV ? 'added' : !sV ? 'removed' : deepEqual(sV, tV) ? 'same' : 'changed';
        const id = `views@@${k}`;
        const n = makeNode({ id, kind: 'item', label: k, op, source: sV, target: tV, meta: { entityKey: 'views', itemKey: k }, children: [] });

        if (!sV && tV) {
          n.children.push(makeNode({ id: `${id}@@rm`, kind: 'leaf', label: '削除', op: 'removed', meta: { entityKey: 'views', itemKey: k, mut: { type: 'removeItem' } }, source: null, target: tV }));
          return n;
        }

        const sF = sV?.fields || [], tF = tV?.fields || [];
        const diff = sF.length !== tF.length || sF.some((v, i) => v !== tF[i]);
        const fN = makeNode({ id: `${id}@@f`, kind: 'group', label: 'fields', op: diff ? 'changed' : 'same', source: sF, target: tF, meta: { entityKey: 'views', itemKey: k }, children: [] });

        if (diff) {
          fN.children.push(makeNode({ id: `${id}@@f@@ord`, kind: 'leaf', label: '順序同期', op: 'changed', meta: { entityKey: 'views', itemKey: k, mut: { type: 'views.fields.setAll', value: sF } } }));
        }

        [...new Set([...sF, ...tF])].forEach((c) => {
          const inS = sF.includes(c), inT = tF.includes(c);
          let o = inS && !inT ? 'added' : !inS && inT ? 'removed' : sF.indexOf(c) !== tF.indexOf(c) ? 'moved' : 'same';
          if (o !== 'same') {
            fN.children.push(makeNode({
              id: `${id}@@f@@${c}`, kind: 'leaf', label: c, op: o,
              meta: {
                entityKey: 'views', itemKey: k,
                mut: o === 'added' ? { type: 'views.fields.addOne', fieldCode: c, sourceFields: sF }
                  : o === 'removed' ? { type: 'views.fields.removeOne', fieldCode: c }
                  : { type: 'views.fields.moveOne', fieldCode: c, toIndex: sF.indexOf(c) },
              },
            }));
          }
        });

        n.children.push(fN);
        n.children.push(diffObjectToTree({ entityKey: 'views', itemKey: k, label: '設定', source: sV || {}, target: tV || {}, baseId: `${id}@@p`, maxDepth: d, excludeKeys: new Set(['fields']) }));
        n.op = !tV ? 'added' : !sV ? 'removed' : summarizeOp(n).diff === 0 ? 'same' : 'changed';
        return n;
      });
      return makeNode({ id: 'cat@@views', kind: 'cat', label: '一覧 (Views)', op: ch.every((c) => summarizeOp(c).diff === 0) ? 'same' : 'changed', children: ch });
    }

    function buildFieldsTree(ek, s, t, d) {
      const sp = s?.properties || {}, tp = t?.properties || {};
      const ks = [...new Set([...Object.keys(sp), ...Object.keys(tp)])].sort();
      const ch = ks.map((k) => {
        const sP = sp[k], tP = tp[k];
        const op = !tP ? 'added' : !sP ? 'removed' : deepEqual(sP, tP) ? 'same' : 'changed';
        const id = `fields@@${k}`;
        const n = makeNode({ id, kind: 'item', label: `${k} ${sP?.label || tP?.label || ''}`, op, source: sP, target: tP, meta: { entityKey: 'fields', itemKey: k }, children: [] });

        if (!sP && tP) {
          n.children.push(makeNode({ id: `${id}@@rm`, kind: 'leaf', label: '削除', op: 'removed', meta: { entityKey: 'fields', itemKey: k, mut: { type: 'removeItem' } }, source: null, target: tP }));
          return n;
        }

        if (sP?.type === 'SUBTABLE' || tP?.type === 'SUBTABLE') {
          const sF = sP?.fields || {}, tF = tP?.fields || {};
          const subKs = [...new Set([...Object.keys(sF), ...Object.keys(tF)])].sort();
          const subCh = subKs.map((sk) => {
            const ss = sF[sk], tt = tF[sk];
            const sop = !tt ? 'added' : !ss ? 'removed' : deepEqual(ss, tt) ? 'same' : 'changed';
            const sid = `${id}@@sub@@${sk}`;
            const sn = makeNode({ id: sid, kind: 'item', label: sk, op: sop, source: ss, target: tt, meta: { entityKey: 'fields', itemKey: k, innerKey: sk }, children: [] });

            if (!ss && tt) sn.children.push(makeNode({ id: `${sid}@@rm`, kind: 'leaf', label: '削除', op: 'removed', meta: { entityKey: 'fields', itemKey: k, mut: { type: 'delPath', path: ['fields', sk] } } }));
            else if (ss && !tt) sn.children.push(makeNode({ id: `${sid}@@add`, kind: 'leaf', label: '追加', op: 'added', meta: { entityKey: 'fields', itemKey: k, mut: { type: 'setPath', path: ['fields', sk], value: ss } } }));

            sn.children.push(diffObjectToTree({ entityKey: 'fields', itemKey: k, label: '設定', source: ss || {}, target: tt || {}, baseId: `${sid}@@p`, basePath: ['fields', sk], maxDepth: d }));
            sn.op = summarizeOp(sn).diff === 0 ? 'same' : 'changed';
            return sn;
          });
          n.children.push(makeNode({ id: `${id}@@subgrp`, kind: 'group', label: 'サブテーブル', op: subCh.every((x) => summarizeOp(x).diff === 0) ? 'same' : 'changed', children: subCh }));
        }

        n.children.push(diffObjectToTree({ entityKey: 'fields', itemKey: k, label: '設定', source: sP || {}, target: tP || {}, baseId: `${id}@@p`, maxDepth: d, excludeKeys: new Set(['fields']) }));
        n.op = summarizeOp(n).diff === 0 ? 'same' : 'changed';
        return n;
      });
      return makeNode({ id: 'cat@@fields', kind: 'cat', label: 'フィールド (Fields)', op: ch.every((c) => summarizeOp(c).diff === 0) ? 'same' : 'changed', children: ch });
    }

    function buildGenericTree(ek, s, t, lbl, d, keyFn) {
      const isArr = ek.startsWith('notif') || ek.startsWith('acl');
      const propName = ek.startsWith('notif') ? 'notifications' : ek.startsWith('acl') ? 'rights' : ek === 'actions' ? 'actions' : 'reports';
      const sO = s?.[propName] || (isArr ? [] : {});
      const tO = t?.[propName] || (isArr ? [] : {});
      const sm = isArr ? new Map(sO.map((x) => [keyFn(x), x])) : sO;
      const tm = isArr ? new Map(tO.map((x) => [keyFn(x), x])) : tO;
      const ks = [...new Set([...(isArr ? sm.keys() : Object.keys(sm)), ...(isArr ? tm.keys() : Object.keys(tm))])].sort();
      const ch = ks.map((k) => {
        const sV = isArr ? sm.get(k) : sm[k], tV = isArr ? tm.get(k) : tm[k];
        const op = !tV ? 'added' : !sV ? 'removed' : deepEqual(sV, tV) ? 'same' : 'changed';
        const id = `${ek}@@${k}`;
        const n = makeNode({ id, kind: 'item', label: k, op, source: sV, target: tV, meta: { entityKey: ek, itemKey: k }, children: [] });
        if (!sV && tV) {
          n.children.push(makeNode({ id: `${id}@@rm`, kind: 'leaf', label: '削除', op: 'removed', meta: { entityKey: ek, itemKey: k, mut: { type: 'removeItem' } }, source: null, target: tV }));
          return n;
        }
        n.children.push(diffObjectToTree({ entityKey: ek, itemKey: k, label: '設定', source: sV || {}, target: tV || {}, baseId: `${id}@@p`, maxDepth: d }));
        n.op = summarizeOp(n).diff === 0 ? 'same' : 'changed';
        return n;
      });
      return makeNode({ id: `cat@@${ek}`, kind: 'cat', label: lbl, op: ch.every((c) => summarizeOp(c).diff === 0) ? 'same' : 'changed', children: ch });
    }

    function buildSingletonTree(ek, s, t, lbl) {
      const sV = ek === 'layout' ? s?.layout : s;
      const tV = ek === 'layout' ? t?.layout : t;
      const op = deepEqual(sV, tV) ? 'same' : 'changed';
      return makeNode({
        id: `cat@@${ek}`, kind: 'cat', label: lbl, op, meta: { entityKey: ek }, children: [
          makeNode({
            id: `${ek}@@all`, kind: 'item', label: `${lbl}全体`, op, source: sV, target: tV, meta: { entityKey: ek, itemKey: '__all__' }, children: [
              makeNode({ id: `${ek}@@all@@repl`, kind: 'leaf', label: '置換', op, meta: { entityKey: ek, itemKey: '__all__', mut: { type: 'replaceAll' } }, source: sV, target: tV }),
            ],
          }),
        ],
      });
    }

    // 改善28: Inline diff モード追加
    function makeDiffHtml(a, b, mode = 'sideBySide') {
      const A = (Utils.stableStringify(a, 2) ?? '').split('\n');
      const B = (Utils.stableStringify(b, 2) ?? '').split('\n');
      const N = A.length, M = B.length;

      if (N > 5000 || M > 5000) {
        return `<pre style="color:var(--muted)">データが大きすぎます (${N}行 / ${M}行)。Source/Target タブで個別に確認してください。</pre>`;
      }

      const dp = Array.from({ length: N + 1 }, () => new Uint32Array(M + 1));
      for (let i = 1; i <= N; i++) {
        for (let j = 1; j <= M; j++) {
          dp[i][j] = A[i - 1] === B[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }

      const out = [];
      let i = N, j = M;
      while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && A[i - 1] === B[j - 1]) {
          out.push({ t: 'eq', l: A[i - 1], r: B[j - 1] }); i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
          out.push({ t: 'ins', l: '', r: B[j - 1] }); j--;
        } else {
          out.push({ t: 'del', l: A[i - 1], r: '' }); i--;
        }
      }
      out.reverse();

      const { esc } = Utils;

      if (mode === 'inline') {
        return `<div class="diff-inline">${out.map((x) => {
          if (x.t === 'eq') return `<div class="diff-line">${esc(x.l)}</div>`;
          if (x.t === 'del') return `<div class="diff-line diff-del-line">- ${esc(x.l)}</div>`;
          return `<div class="diff-line diff-ins-line">+ ${esc(x.r)}</div>`;
        }).join('')}</div>`;
      }

      return `<div class="diff-table">${out.map((x) =>
        `<div class="diff-row"><div class="diff-cell l ${x.t === 'del' ? 'diff-del' : ''}">${esc(x.l)}</div><div class="diff-cell ${x.t === 'ins' ? 'diff-ins' : ''}">${esc(x.r)}</div></div>`
      ).join('')}</div>`;
    }

    function computeGlobalSummary(trees) {
      let added = 0, changed = 0, removed = 0, same = 0;
      for (const tree of Object.values(trees)) {
        for (const n of flattenNodes(tree)) {
          if (n.kind !== 'leaf') continue;
          if (n.op === 'added') added++;
          else if (n.op === 'changed') changed++;
          else if (n.op === 'removed') removed++;
          else same++;
        }
      }
      return { added, changed, removed, same, total: added + changed + removed + same };
    }

    // 改善26: カテゴリ毎の選択件数を算出
    function computeCategorySummary(tree, selectedLeaf) {
      const leaves = flattenNodes(tree).filter((n) => n.kind === 'leaf');
      const selected = leaves.filter((n) => selectedLeaf.has(n.id)).length;
      const diff = leaves.filter((n) => n.op !== 'same').length;
      return { selected, diff, total: leaves.length };
    }

    // 改善24: フィールド依存チェック
    function checkFieldDependencies(trees, selectedLeaf, rawSrc) {
      const warnings = [];
      if (!trees?.fields) return warnings;

      const selectedFieldCodes = new Set();
      const allFieldLeaves = flattenNodes(trees.fields).filter((n) => n.kind === 'leaf');

      for (const leaf of allFieldLeaves) {
        if (selectedLeaf.has(leaf.id) && leaf.meta?.entityKey === 'fields' && leaf.meta?.itemKey) {
          selectedFieldCodes.add(leaf.meta.itemKey);
        }
      }

      // lookupフィールドの参照チェック
      const srcProps = rawSrc?.fields?.properties || {};
      for (const code of selectedFieldCodes) {
        const field = srcProps[code];
        if (!field) continue;

        // LOOKUPの参照先フィールド
        if (field.lookup?.fieldMappings) {
          for (const mapping of field.lookup.fieldMappings) {
            if (mapping.field && !selectedFieldCodes.has(mapping.field)) {
              warnings.push(`${code} のルックアップコピー先フィールド "${mapping.field}" が選択されていません`);
            }
          }
        }

        // REFERENCE_TABLE の参照
        if (field.referenceTable?.condition?.field) {
          const refField = field.referenceTable.condition.field;
          if (!selectedFieldCodes.has(refField)) {
            warnings.push(`${code} の関連レコード条件フィールド "${refField}" が選択されていません`);
          }
        }
      }

      return warnings;
    }

    // 改善18: レポート生成
    function generateDiffReport(trees, globalSummary, srcApp, tgtApp) {
      const lines = [];
      lines.push(`# Kintone Diff Report`);
      lines.push(`- Source: App ${srcApp}`);
      lines.push(`- Target: App ${tgtApp}`);
      lines.push(`- Generated: ${Utils.now()}`);
      lines.push(`- Tool: ${TOOL.name} v${TOOL.version}`);
      lines.push('');
      lines.push(`## Summary`);
      lines.push(`| Status | Count |`);
      lines.push(`|--------|-------|`);
      lines.push(`| Added | ${globalSummary.added} |`);
      lines.push(`| Changed | ${globalSummary.changed} |`);
      lines.push(`| Removed | ${globalSummary.removed} |`);
      lines.push(`| Same | ${globalSummary.same} |`);
      lines.push(`| **Total** | **${globalSummary.total}** |`);
      lines.push('');

      for (const [key, tree] of Object.entries(trees)) {
        const sum = summarizeOp(tree);
        if (sum.diff === 0) continue;
        lines.push(`## ${tree.label || key}`);
        lines.push(`差分: ${sum.diff} / ${sum.total}`);
        lines.push('');

        const items = (tree.children || []).filter((c) => summarizeOp(c).diff > 0);
        for (const item of items) {
          lines.push(`### ${item.label}`);
          lines.push(`- Status: **${item.op}**`);
          const leaves = flattenNodes(item).filter((n) => n.kind === 'leaf' && n.op !== 'same');
          for (const leaf of leaves) {
            lines.push(`  - \`${leaf.pathStr || leaf.label}\`: ${leaf.op}`);
          }
          lines.push('');
        }
      }

      return lines.join('\n');
    }

    return {
      keyFns, makeNode, flattenNodes, summarizeOp,
      diffObjectToTree, buildViewsTree, buildFieldsTree, buildGenericTree, buildSingletonTree,
      makeDiffHtml, computeGlobalSummary, computeCategorySummary, checkFieldDependencies,
      generateDiffReport,
    };
  })();

  // =================================================================
  //  Module 5: Request Generator
  // =================================================================
  const RequestGen = (() => {
    const { clone, setByPath, delByPath, insertUsingAnchors, convertLookupAppIds, makeUniqueCode, replaceCodesInObject, isObj } = Utils;
    const { flattenNodes } = DiffEngine;
    const { keyFns } = DiffEngine;

    function applyMutations(base, muts) {
      const out = clone(base) || {};
      for (const m of muts) {
        if (m.type === 'setPath') setByPath(out, m.path, m.value);
        else if (m.type === 'delPath') delByPath(out, m.path);
        else if (m.type === 'views.fields.setAll') out.fields = (m.value || []).slice();
        else if (m.type === 'views.fields.addOne') insertUsingAnchors((out.fields = (out.fields || []).slice()), m.fieldCode, m.sourceFields || []);
        else if (m.type === 'views.fields.removeOne') out.fields = (out.fields || []).filter((x) => x !== m.fieldCode);
        else if (m.type === 'views.fields.moveOne') {
          const f = (out.fields || []).filter((x) => x !== m.fieldCode);
          f.splice(Math.max(0, Math.min(f.length, m.toIndex ?? f.length)), 0, m.fieldCode);
          out.fields = f;
        } else if (m.type === 'upsertWhole' || m.type === 'replaceAll') {
          Object.keys(out).forEach((k) => delete out[k]);
          Object.assign(out, clone(m.value));
        }
      }
      return out;
    }

    function generate(ctx) {
      const { sourceAppId, targetAppId, trees, selectedLeafIds, rawSrc, rawTgt, modes, lookupAppIdMap } = ctx;
      const requests = [];
      const leafMap = new Map();
      Object.values(trees).forEach((r) => flattenNodes(r).forEach((n) => { if (n.kind === 'leaf') leafMap.set(n.id, n); }));

      const getMutations = (ek, ik) => {
        const muts = [];
        let remove = false;
        for (const id of selectedLeafIds) {
          const n = leafMap.get(id);
          if (n?.meta?.entityKey === ek && n?.meta?.itemKey === ik) {
            if (n.meta.mut?.type === 'removeItem') remove = true;
            else if (n.meta.mut) muts.push(n.meta.mut);
          }
        }
        return { muts, remove };
      };

      // 1) Fields
      const fAdd = {}, fUpd = {}, fDel = [];
      const tgtProps = rawTgt.fields?.properties || {};
      const usedCodes = new Set(Object.keys(tgtProps));
      const codeMap = {};
      const srcPropsAll = rawSrc.fields?.properties || {};
      const tgtPropsAll = rawTgt.fields?.properties || {};
      const fieldCodes = [...new Set([...Object.keys(srcPropsAll), ...Object.keys(tgtPropsAll)])];

      for (const code of fieldCodes) {
        const { muts, remove } = getMutations('fields', code);
        if (!muts.length && !remove) continue;
        const mode = modes[`fields@@${code}`] || 'src';
        const sVal0 = rawSrc.fields?.properties?.[code];
        const tVal0 = rawTgt.fields?.properties?.[code];
        if (remove) { if (mode === 'src') fDel.push(code); continue; }

        const base = mode === 'tgt' ? (tVal0 || {}) : (tVal0 || sVal0 || {});
        let finalDef = mode === 'tgt' ? clone(tVal0) : applyMutations(base, muts);
        let lookupChanged = false;
        if (mode === 'src' && finalDef) {
          const conv = convertLookupAppIds(finalDef, lookupAppIdMap);
          finalDef = conv.def;
          lookupChanged = conv.changed;
        }
        const exists = !!tVal0;
        if (!exists) { fAdd[code] = finalDef; usedCodes.add(code); continue; }
        if (mode === 'src' && lookupChanged) {
          const newCode = makeUniqueCode(code, usedCodes);
          usedCodes.add(newCode);
          codeMap[code] = newCode;
          finalDef = clone(finalDef);
          finalDef.code = newCode;
          fAdd[newCode] = finalDef;
          continue;
        }
        fUpd[code] = finalDef;
      }

      if (Object.keys(fAdd).length) requests.push({ method: 'POST', url: '/k/v1/preview/app/form/fields.json', body: { app: targetAppId, properties: fAdd } });
      if (Object.keys(fUpd).length) requests.push({ method: 'PUT', url: '/k/v1/preview/app/form/fields.json', body: { app: targetAppId, properties: fUpd } });
      if (fDel.length) requests.push({ method: 'DELETE', url: '/k/v1/preview/app/form/fields.json', body: { app: targetAppId, fields: fDel } });

      // 2) Views
      const vUpd = {};
      const srcViews = rawSrc.views?.views || {};
      const tgtViews = rawTgt.views?.views || {};
      for (const k of [...new Set([...Object.keys(srcViews), ...Object.keys(tgtViews)])]) {
        const { muts, remove } = getMutations('views', k);
        if (!muts.length && !remove) continue;
        const mode = modes[`views@@${k}`] || 'src';
        const sVal = srcViews[k], tVal = tgtViews[k];
        if (remove && mode === 'src') continue;
        let val = mode === 'tgt' ? clone(tVal) : applyMutations(tVal || sVal || {}, muts);
        if (!val) continue;
        if (Object.keys(codeMap).length) val = replaceCodesInObject(val, codeMap);
        vUpd[k] = val;
      }
      if (Object.keys(vUpd).length) requests.push({ method: 'PUT', url: '/k/v1/preview/app/views.json', body: { app: targetAppId, views: vUpd } });

      // 3) Actions / Reports
      ['actions', 'reports'].forEach((ek) => {
        const up = {}, del = [];
        const sObj = rawSrc[ek]?.[ek] || {};
        const tObj = rawTgt[ek]?.[ek] || {};
        for (const k of [...new Set([...Object.keys(sObj), ...Object.keys(tObj)])]) {
          const { muts, remove } = getMutations(ek, k);
          if (!muts.length && !remove) continue;
          const mode = modes[`${ek}@@${k}`] || 'src';
          const sVal = sObj[k], tVal = tObj[k];
          if (remove && mode === 'src') { if (ek === 'reports') del.push(k); continue; }
          let val = mode === 'tgt' ? clone(tVal) : applyMutations(tVal || sVal || {}, muts);
          if (!val) continue;
          if (Object.keys(codeMap).length) val = replaceCodesInObject(val, codeMap);
          up[k] = val;
        }
        if (Object.keys(up).length) requests.push({ method: 'PUT', url: `/k/v1/preview/app/${ek}.json`, body: { app: targetAppId, [ek]: up } });
        if (del.length) requests.push({ method: 'DELETE', url: '/k/v1/preview/app/reports.json', body: { app: targetAppId, reports: del } });
      });

      // 4) Notifications / ACL
      const handleList = (ek, url, prop, fn) => {
        if (![...selectedLeafIds].some((id) => leafMap.get(id)?.meta?.entityKey === ek)) return;
        const sL = rawSrc[ek]?.[prop] || [], tL = rawTgt[ek]?.[prop] || [];
        let fin = [...tL].filter((t) => {
          const k = fn(t), { remove } = getMutations(ek, k), mode = modes[`${ek}@@${k}`] || 'src';
          return !(remove && mode === 'src');
        }).map((t) => {
          const k = fn(t), { muts } = getMutations(ek, k), mode = modes[`${ek}@@${k}`] || 'src';
          return muts.length && mode === 'src' ? (sL.find((x) => fn(x) === k) || t) : t;
        });
        sL.forEach((s) => {
          const k = fn(s);
          if (tL.some((t) => fn(t) === k)) return;
          const { muts } = getMutations(ek, k), mode = modes[`${ek}@@${k}`] || 'src';
          if (muts.length && mode === 'src') fin.push(s);
        });
        requests.push({ method: 'PUT', url, body: { app: targetAppId, [prop]: fin } });
      };
      handleList('notifGeneral', '/k/v1/preview/app/notifications/general.json', 'notifications', keyFns.notifGeneral);
      handleList('notifPerRecord', '/k/v1/preview/app/notifications/perRecord.json', 'notifications', keyFns.notifPerRecord);
      handleList('notifReminder', '/k/v1/preview/app/notifications/reminder.json', 'notifications', keyFns.notifReminder);
      handleList('aclApp', '/k/v1/preview/app/acl.json', 'rights', keyFns.aclApp);
      handleList('aclRecord', '/k/v1/preview/record/acl.json', 'rights', keyFns.aclRecord);
      handleList('aclField', '/k/v1/preview/field/acl.json', 'rights', keyFns.aclField);

      // 5) Status / Layout
      if (selectedLeafIds.has('status@@all@@repl')) {
        const m = modes['status@@all'] || 'src';
        requests.push({ method: 'PUT', url: '/k/v1/preview/app/status.json', body: { app: targetAppId, ...(m === 'src' ? rawSrc.status : rawTgt.status) } });
      }
      if (selectedLeafIds.has('layout@@all@@repl')) {
        const m = modes['layout@@all'] || 'src';
        let layout = (m === 'src' ? rawSrc.layout : rawTgt.layout)?.layout;
        if (layout && Object.keys(codeMap).length) layout = replaceCodesInObject(clone(layout), codeMap);
        requests.push({ method: 'PUT', url: '/k/v1/preview/app/form/layout.json', body: { app: targetAppId, layout } });
      }

      return {
        tool: TOOL.name, version: TOOL.version, generatedAt: Utils.now(),
        sourceAppId, targetAppId,
        meta: { lookupAppIdMap: clone(lookupAppIdMap) },
        requests,
      };
    }

    async function runRequests(reqs, log) {
      const results = [];
      for (let i = 0; i < reqs.length; i++) {
        const r = reqs[i];
        const label = `[${i + 1}/${reqs.length}] ${r.method} ${r.url.split('/').pop()}`;
        log(`${label}...`);
        try {
          await kintone.api(kintone.api.url(r.url, true), r.method, r.body);
          results.push({ index: i, status: 'ok', label });
          log(`${label} ✔`);
        } catch (e) {
          results.push({ index: i, status: 'error', label, error: e.message || String(e) });
          log(`${label} ✘ ${e.message || e}`);
          const successCount = results.filter((x) => x.status === 'ok').length;
          log(`\n⚠ ${i + 1}件目で失敗。${successCount}件は適用済み。残り${reqs.length - i - 1}件は未実行。`);
          throw new Error(`${label} failed: ${e.message}. ${successCount}/${reqs.length} applied.`);
        }
      }
      return results;
    }

    return { generate, runRequests, applyMutations };
  })();

  // =================================================================
  //  Module 6: State Management
  // =================================================================
  const StateManager = (() => {
    const listeners = new Set();

    const state = {
      srcApp: '', tgtApp: '',
      srcPrev: false, tgtPrev: false,
      lang: 'default',
      trees: null,
      activeCat: 'views',
      expanded: new Set(),
      selectedLeaf: new Set(),
      activeNodeId: null,
      filter: { hideSame: false, onlyDiff: true, onlySel: false, deep: false, q: '', added: true, changed: true, removed: true },
      rawSrc: {},
      rawTgt: {},
      modes: {},
      theme: 'dark',
      lookupAppIdMap: {},
      globalSummary: null,
      // 改善20: 右パネル折りたたみ
      rightPanelOpen: true,
      // 改善21: Undo
      undoStack: [],
      redoStack: [],
      // 改善25: 操作ログ
      operationLogs: [],
      // 改善28: diff表示モード
      diffMode: 'sideBySide',
      // 改善29: ピン留め
      pinnedNodes: new Set(),
    };

    function getState() { return state; }

    function setState(partial) {
      Object.assign(state, partial);
      notify();
    }

    function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
    function notify() { for (const fn of listeners) fn(state); }

    // 改善21: Undo/Redo
    function pushUndo() {
      state.undoStack.push(new Set(state.selectedLeaf));
      if (state.undoStack.length > 50) state.undoStack.shift();
      state.redoStack = [];
    }

    function undo() {
      if (state.undoStack.length === 0) return false;
      state.redoStack.push(new Set(state.selectedLeaf));
      state.selectedLeaf = state.undoStack.pop();
      notify();
      return true;
    }

    function redo() {
      if (state.redoStack.length === 0) return false;
      state.undoStack.push(new Set(state.selectedLeaf));
      state.selectedLeaf = state.redoStack.pop();
      notify();
      return true;
    }

    // 改善25: 操作ログ追加
    function addLog(action, detail) {
      const entry = { time: Utils.now(), action, detail };
      state.operationLogs.push(entry);
      if (state.operationLogs.length > 200) state.operationLogs.shift();
      Storage.setLogs(state.operationLogs);
    }

    function savePrefs() {
      Storage.setPrefs({
        srcApp: state.srcApp, tgtApp: state.tgtApp, srcPrev: state.srcPrev, tgtPrev: state.tgtPrev,
        lang: state.lang, activeCat: state.activeCat, filter: state.filter, modes: state.modes,
        theme: state.theme, lookupAppIdMap: state.lookupAppIdMap, rightPanelOpen: state.rightPanelOpen,
        diffMode: state.diffMode, pinnedNodes: [...state.pinnedNodes],
      });
    }

    function loadPrefs() {
      const p = Storage.getPrefs() || {};
      state.srcApp = p.srcApp ?? '';
      state.tgtApp = p.tgtApp ?? '';
      state.srcPrev = !!p.srcPrev;
      state.tgtPrev = !!p.tgtPrev;
      state.lang = p.lang ?? 'default';
      state.activeCat = p.activeCat ?? 'views';
      if (p.filter) Object.assign(state.filter, p.filter);
      if (p.modes) state.modes = p.modes;
      if (p.theme) state.theme = p.theme;
      if (p.lookupAppIdMap) state.lookupAppIdMap = p.lookupAppIdMap;
      if (p.rightPanelOpen != null) state.rightPanelOpen = p.rightPanelOpen;
      if (p.diffMode) state.diffMode = p.diffMode;
      if (p.pinnedNodes) state.pinnedNodes = new Set(p.pinnedNodes);
      state.operationLogs = Storage.getLogs();
    }

    async function snapshotSave() {
      if (!state.trees) return;
      await Storage.setSnapshot({
        savedAt: Utils.now(),
        srcApp: state.srcApp, tgtApp: state.tgtApp, srcPrev: state.srcPrev, tgtPrev: state.tgtPrev,
        lang: state.lang, activeCat: state.activeCat, filter: state.filter, modes: state.modes,
        theme: state.theme, lookupAppIdMap: state.lookupAppIdMap,
        trees: state.trees, rawSrc: state.rawSrc, rawTgt: state.rawTgt,
        expanded: [...state.expanded], selectedLeaf: [...state.selectedLeaf],
        globalSummary: state.globalSummary, pinnedNodes: [...state.pinnedNodes],
      });
    }

    async function snapshotLoad() {
      const s = await Storage.getSnapshot();
      if (!s?.trees) return false;
      state.srcApp = s.srcApp ?? '';
      state.tgtApp = s.tgtApp ?? '';
      state.srcPrev = !!s.srcPrev;
      state.tgtPrev = !!s.tgtPrev;
      state.lang = s.lang ?? 'default';
      state.activeCat = s.activeCat ?? 'views';
      if (s.filter) Object.assign(state.filter, s.filter);
      if (s.modes) state.modes = s.modes;
      if (s.theme) state.theme = s.theme;
      if (s.lookupAppIdMap) state.lookupAppIdMap = s.lookupAppIdMap;
      state.trees = s.trees;
      state.rawSrc = s.rawSrc;
      state.rawTgt = s.rawTgt;
      state.expanded = new Set(s.expanded);
      state.selectedLeaf = new Set(s.selectedLeaf);
      state.globalSummary = s.globalSummary ?? null;
      if (s.pinnedNodes) state.pinnedNodes = new Set(s.pinnedNodes);
      return true;
    }

    return { getState, setState, subscribe, savePrefs, loadPrefs, snapshotSave, snapshotLoad, pushUndo, undo, redo, addLog };
  })();

  // =================================================================
  //  Module 7: UI
  // =================================================================
  const UI = (() => {
    const { esc, el } = Utils;
    const { flattenNodes, summarizeOp, computeCategorySummary } = DiffEngine;

    function createStyles() {
      return `
        :root{ --bg:#040612;--panel:#0a1024;--panel2:#0d1630;--card:#121e3d; --text:#f6f8ff;--muted:#95a3c8;--line:#26365f;--brand:#67a4ff;--brand2:#8a6cff; --shadow:0 24px 70px rgba(3,9,24,.72); --mono:ui-monospace,SFMono-Regular,monospace; --sans:Inter,system-ui,-apple-system,sans-serif; --warn:#ffcb66;--danger:#ff8080;--success:#68e6a5; }
        .light-mode{ --bg:#eef2ff;--panel:#ffffff;--panel2:#f8f9ff;--card:#ffffff; --text:#1b2640;--muted:#61708f;--line:#d8def0;--brand:#2f65ff;--brand2:#744dff; --shadow:0 12px 38px rgba(31,45,93,.14);--warn:#a56a00;--danger:#dc3c6a;--success:#1f9d62; }
        #${ROOT_ID}{position:fixed;inset:0;z-index:999999;background:radial-gradient(circle at 10% -10%,rgba(103,164,255,.35),transparent 42%),radial-gradient(circle at 100% 100%,rgba(138,108,255,.25),transparent 38%),rgba(0,0,0,.66);display:flex;align-items:center;justify-content:center;font-family:var(--sans);color:var(--text)}
        #${ROOT_ID} *{box-sizing:border-box}
        #${ROOT_ID} .app{width:min(1600px,97vw);height:min(94vh,97vh);background:linear-gradient(180deg,rgba(255,255,255,.02),rgba(255,255,255,0)),var(--panel);border:1px solid var(--line);border-radius:24px;box-shadow:var(--shadow);overflow:hidden;display:flex;flex-direction:column}
        #${ROOT_ID} .top{padding:14px 18px;background:linear-gradient(90deg,rgba(103,164,255,.14),rgba(138,108,255,.08));border-bottom:1px solid var(--line);display:flex;align-items:center;gap:12px}
        #${ROOT_ID} .brand-meta{display:flex;flex-direction:column;gap:2px}
        #${ROOT_ID} .brand-sub{font-size:11px;color:var(--muted);letter-spacing:.04em}
        #${ROOT_ID} .dot{width:11px;height:11px;border-radius:999px;background:linear-gradient(180deg,var(--brand),var(--brand2));animation:pulse 2s infinite;box-shadow:0 0 12px rgba(103,164,255,.6)}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        #${ROOT_ID} .sp{flex:1}
        #${ROOT_ID} .btn{background:var(--panel2);border:1px solid var(--line);color:var(--text);padding:7px 12px;border-radius:10px;cursor:pointer;font-size:12px;font-weight:700;white-space:nowrap;transition:all .15s}
        #${ROOT_ID} .btn:hover:not(:disabled){filter:brightness(1.15)}
        #${ROOT_ID} .btn.primary{background:linear-gradient(90deg,var(--brand),var(--brand2));color:#fff;border-color:transparent}
        #${ROOT_ID} .btn.dng{background:rgba(255,93,93,.1);color:#ff5d5d;border-color:rgba(255,93,93,.3)}
        #${ROOT_ID} .btn.warn{background:rgba(255,204,102,.1);color:var(--warn);border-color:rgba(255,204,102,.3)}
        #${ROOT_ID} .btn.success{background:rgba(43,213,118,.1);color:var(--success);border-color:rgba(43,213,118,.3)}
        #${ROOT_ID} .btn:disabled{opacity:.5;cursor:not-allowed}
        #${ROOT_ID} .grid{display:flex;flex:1;min-height:0}
        #${ROOT_ID} .side{width:340px;background:var(--panel2);border-right:1px solid var(--line);padding:14px;display:flex;flex-direction:column;gap:12px;overflow:auto}
        #${ROOT_ID} .main{flex:1;background:var(--panel);display:flex;flex-direction:column;min-width:0}
        #${ROOT_ID} .right{width:520px;background:var(--panel2);border-left:1px solid var(--line);display:flex;flex-direction:column;min-width:0;transition:width .2s}
        #${ROOT_ID} .right.collapsed{width:0;overflow:hidden;border-left:none}
        #${ROOT_ID} .card{background:linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,0)),var(--card);border:1px solid var(--line);border-radius:14px;padding:12px}
        #${ROOT_ID} label{font-size:11px;color:var(--muted);display:block;margin-bottom:5px;font-weight:700}
        #${ROOT_ID} input[type="text"],#${ROOT_ID} textarea.inp{width:100%;padding:8px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text);outline:none;font-size:12px;box-sizing:border-box;transition:border-color .15s}
        #${ROOT_ID} input[type="text"]:focus,#${ROOT_ID} textarea.inp:focus{border-color:var(--brand)}
        #${ROOT_ID} textarea.inp{font-family:var(--mono);resize:vertical;min-height:48px}
        #${ROOT_ID} .row{display:flex;gap:10px}
        #${ROOT_ID} .row>div{flex:1}
        #${ROOT_ID} .chips{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
        #${ROOT_ID} .chip{display:inline-flex;gap:6px;align-items:center;background:#142236;border:1px solid var(--line);border-radius:999px;padding:6px 10px;font-size:12px;color:var(--muted);cursor:pointer;user-select:none;transition:all .15s}
        #${ROOT_ID} .chip.on{color:var(--text);border-color:rgba(78,161,255,.55);box-shadow:0 0 0 3px rgba(78,161,255,.12) inset}
        #${ROOT_ID} .chip b{color:var(--text)}
        #${ROOT_ID} .cats{display:flex;flex-direction:column;gap:4px;overflow:auto;min-height:0}
        #${ROOT_ID} .cat{display:flex;align-items:center;gap:10px;padding:10px;border-radius:12px;border:1px solid transparent;cursor:pointer;transition:all .15s}
        #${ROOT_ID} .cat:hover{background:#0c1624}
        #${ROOT_ID} .cat.on{background:#0c1624;border-color:rgba(78,161,255,.35)}
        .light-mode #${ROOT_ID} .cat:hover,.light-mode #${ROOT_ID} .cat.on{background:#eef3f9}
        .light-mode #${ROOT_ID} .chip{background:#e8edf3}
        #${ROOT_ID} .badge{margin-left:auto;background:#142236;border:1px solid var(--line);border-radius:999px;padding:2px 8px;font-size:12px;color:var(--muted);white-space:nowrap}
        #${ROOT_ID} .badge.red{color:#ffd2d2;border-color:rgba(255,93,93,.35);background:rgba(255,93,93,.12)}
        #${ROOT_ID} .badge.green{color:#c9ffe2;border-color:rgba(43,213,118,.35);background:rgba(43,213,118,.12)}
        #${ROOT_ID} .badge.blue{color:#d6ebff;border-color:rgba(78,161,255,.35);background:rgba(78,161,255,.12)}
        #${ROOT_ID} .mode-sw{font-size:10px;font-weight:900;padding:2px 6px;border-radius:4px;cursor:pointer;border:1px solid var(--line);transition:all .15s}
        #${ROOT_ID} .mode-sw.src{color:#4ea1ff;border-color:#4ea1ff;background:rgba(78,161,255,.1)}
        #${ROOT_ID} .mode-sw.tgt{color:#43d576;border-color:#43d576;background:rgba(43,213,118,.1)}
        #${ROOT_ID} .toolbar{padding:10px 14px;border-bottom:1px solid var(--line);display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        #${ROOT_ID} .hint{font-size:12px;color:var(--muted)}
        #${ROOT_ID} .summary-bar{font-size:12px;padding:4px 10px;border-radius:6px;background:rgba(78,161,255,.08);border:1px solid rgba(78,161,255,.2);color:var(--text);display:flex;gap:12px;align-items:center}
        #${ROOT_ID} .summary-bar .s-item{display:flex;gap:4px;align-items:center}
        #${ROOT_ID} .summary-bar .s-dot{width:8px;height:8px;border-radius:50%}
        #${ROOT_ID} .treeWrap{flex:1;min-height:0;overflow:auto;padding:12px 14px}
        #${ROOT_ID} .treeRow{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:var(--card);margin-bottom:6px;outline:none;transition:all .12s}
        #${ROOT_ID} .treeRow:hover,#${ROOT_ID} .treeRow:focus-visible{filter:brightness(1.05);box-shadow:0 0 0 2px var(--brand)}
        #${ROOT_ID} .treeRow.pinned{border-left:3px solid var(--brand)}
        #${ROOT_ID} .indent{width:calc(var(--d)*16px);flex-shrink:0}
        #${ROOT_ID} .caret{width:24px;height:24px;border-radius:8px;border:1px solid var(--line);background:#142236;color:var(--text);cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;flex-shrink:0;transition:transform .15s}
        #${ROOT_ID} .caret.hide{opacity:.35;cursor:default}
        #${ROOT_ID} .caret.open{transform:rotate(90deg)}
        #${ROOT_ID} .tlabel{flex:1;min-width:0}
        #${ROOT_ID} .tlabel .t1{font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        #${ROOT_ID} .tlabel .t2{font-size:11px;color:var(--muted);font-family:var(--mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        #${ROOT_ID} .hl{background:rgba(78,161,255,.25);border-radius:2px;padding:0 1px}
        #${ROOT_ID} .op{display:inline-flex;align-items:center;justify-content:center;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:900;border:1px solid var(--line);flex-shrink:0}
        #${ROOT_ID} .op.same{opacity:.55}
        #${ROOT_ID} .op.added{background:rgba(78,161,255,.12);border-color:rgba(78,161,255,.35);color:#d6ebff}
        #${ROOT_ID} .op.changed{background:rgba(255,204,102,.12);border-color:rgba(255,204,102,.35);color:#ffe8ba}
        #${ROOT_ID} .op.removed{background:rgba(255,93,93,.12);border-color:rgba(255,93,93,.35);color:#ffd2d2}
        #${ROOT_ID} .op.moved{background:rgba(156,117,255,.12);border-color:rgba(156,117,255,.35);color:#e6dbff}
        #${ROOT_ID} .actions{display:flex;gap:6px;flex-shrink:0}
        #${ROOT_ID} .small{padding:5px 8px;border-radius:8px}
        #${ROOT_ID} .pin-btn{cursor:pointer;font-size:14px;opacity:.4;transition:opacity .15s}
        #${ROOT_ID} .pin-btn.pinned{opacity:1;color:var(--brand)}
        #${ROOT_ID} .foot{padding:10px 14px;border-top:1px solid var(--line);display:flex;align-items:center;gap:8px;background:linear-gradient(0deg,var(--panel),var(--panel2));flex-wrap:wrap}
        #${ROOT_ID} .sum{font-size:12px;color:var(--muted)}
        #${ROOT_ID} .progress{height:8px;background:#09111d;border:1px solid var(--line);border-radius:999px;overflow:hidden}
        #${ROOT_ID} .bar{height:100%;width:0;background:linear-gradient(90deg,var(--brand),var(--brand2));transition:width .2s}
        #${ROOT_ID} .toastWrap{position:absolute;right:16px;bottom:16px;display:flex;flex-direction:column;gap:10px;pointer-events:none;z-index:10}
        #${ROOT_ID} .toast{pointer-events:none;background:#0b111a;border:1px solid var(--line);border-radius:14px;padding:10px 12px;min-width:260px;box-shadow:0 10px 35px rgba(0,0,0,.45);animation:toastIn .3s ease}
        @keyframes toastIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        #${ROOT_ID} .toast b{display:block}
        #${ROOT_ID} .toast .t{font-size:12px;color:var(--muted)}
        #${ROOT_ID} .rightHead{padding:10px 14px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:8px}
        #${ROOT_ID} .tabs{display:flex;gap:6px}
        #${ROOT_ID} .tab{padding:5px 10px;border-radius:999px;border:1px solid var(--line);background:#142236;font-size:12px;color:var(--muted);cursor:pointer;transition:all .15s}
        #${ROOT_ID} .tab.on{color:var(--text);border-color:rgba(78,161,255,.55);box-shadow:0 0 0 3px rgba(78,161,255,.12) inset}
        #${ROOT_ID} .rightBody{flex:1;min-height:0;overflow:auto}
        #${ROOT_ID} pre{margin:0;padding:12px 14px;white-space:pre-wrap;word-break:break-word;font-family:var(--mono);font-size:12px}
        #${ROOT_ID} .modal-overlay{position:absolute;inset:0;background:rgba(0,0,0,.7);display:none;align-items:center;justify-content:center;z-index:5}
        #${ROOT_ID} .modal-overlay.on{display:flex}
        #${ROOT_ID} .modal-panel{width:min(1100px,94vw);max-height:min(84vh,94vh);background:var(--panel);border:1px solid var(--line);border-radius:16px;overflow:hidden;display:flex;flex-direction:column}
        #${ROOT_ID} .modal-top{padding:12px 14px;border-bottom:1px solid var(--line);display:flex;gap:10px;align-items:center;flex-wrap:wrap}
        #${ROOT_ID} .modal-body{flex:1;min-height:0;overflow:auto;background:var(--panel2)}
        #${ROOT_ID} .modal-body textarea{width:100%;height:100%;min-height:400px;background:var(--panel2);color:var(--text);border:none;resize:none;outline:none;font-family:var(--mono);font-size:12px;padding:12px;white-space:pre;box-sizing:border-box}
        #${ROOT_ID} .confirm-panel{width:min(520px,90vw);background:var(--panel);border:1px solid var(--line);border-radius:16px;overflow:hidden}
        #${ROOT_ID} .confirm-body{padding:16px 20px;font-size:14px;line-height:1.6}
        #${ROOT_ID} .confirm-foot{padding:12px 20px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:10px}
        #${ROOT_ID} .diff-table{display:grid;grid-template-columns:1fr 1fr;gap:0;font-family:var(--mono);font-size:11px;line-height:1.4}
        #${ROOT_ID} .diff-row{display:contents}
        #${ROOT_ID} .diff-cell{padding:2px 6px;border-bottom:1px solid var(--line);white-space:pre-wrap;word-break:break-all}
        #${ROOT_ID} .diff-cell.l{border-right:1px solid var(--line)}
        #${ROOT_ID} .diff-del{background:rgba(255,93,93,.15)}
        #${ROOT_ID} .diff-ins{background:rgba(78,161,255,.15)}
        #${ROOT_ID} .diff-inline{font-family:var(--mono);font-size:11px;line-height:1.6;padding:8px 12px}
        #${ROOT_ID} .diff-line{padding:1px 6px;white-space:pre-wrap;word-break:break-all}
        #${ROOT_ID} .diff-del-line{background:rgba(255,93,93,.15);color:#ffa0a0}
        #${ROOT_ID} .diff-ins-line{background:rgba(78,161,255,.15);color:#a0d4ff}
        #${ROOT_ID} .warn-box{background:rgba(255,204,102,.08);border:1px solid rgba(255,204,102,.3);border-radius:8px;padding:10px 12px;margin:8px 0;font-size:12px;color:var(--warn)}
        #${ROOT_ID} .warn-box ul{margin:4px 0 0 16px;padding:0}
        #${ROOT_ID} .warn-box li{margin:2px 0}
        #${ROOT_ID} .log-panel{font-family:var(--mono);font-size:11px;padding:12px;max-height:300px;overflow:auto}
        #${ROOT_ID} .log-entry{padding:3px 0;border-bottom:1px solid var(--line);display:flex;gap:12px}
        #${ROOT_ID} .log-time{color:var(--muted);flex-shrink:0}
        #${ROOT_ID} .log-action{color:var(--brand);flex-shrink:0;font-weight:700}
        #${ROOT_ID} .ctx-menu{position:absolute;background:var(--panel);border:1px solid var(--line);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.4);padding:4px;z-index:20;min-width:160px}
        #${ROOT_ID} .ctx-item{padding:8px 12px;border-radius:6px;font-size:12px;cursor:pointer;transition:background .1s}
        #${ROOT_ID} .ctx-item:hover{background:rgba(78,161,255,.12)}
        #${ROOT_ID} .shortcut-panel{font-size:13px;line-height:1.8;padding:16px 20px}
        #${ROOT_ID} .shortcut-panel kbd{background:var(--card);border:1px solid var(--line);border-radius:4px;padding:2px 6px;font-family:var(--mono);font-size:11px}
        #${ROOT_ID} .drop-overlay{position:absolute;inset:0;background:rgba(78,161,255,.12);border:3px dashed var(--brand);border-radius:18px;display:none;align-items:center;justify-content:center;z-index:15;font-size:24px;font-weight:900;color:var(--brand)}
        #${ROOT_ID} .drop-overlay.on{display:flex}
      `;
    }

    let rootEl = null;
    let autoSaveTimer = null;
    let contextMenuEl = null;

    function $(sel) { return rootEl.querySelector(sel); }
    function $$(sel) { return rootEl.querySelectorAll(sel); }

    function toast(title, text, ms = 2200) {
      const wrap = $('#xToasts');
      if (!wrap) return;
      const t = el('div', { className: 'toast' }, [
        el('b', { textContent: title }),
        el('div', { className: 't', textContent: text }),
      ]);
      wrap.appendChild(t);
      setTimeout(() => t.remove(), ms);
    }

    function setProg(pct, text) {
      const bar = $('#xProg');
      const status = $('#xStatus');
      if (bar) bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
      if (status) status.textContent = text || '';
    }

    function setChip(chipEl, on) {
      if (!chipEl) return;
      chipEl.classList.toggle('on', !!on);
      const b = chipEl.querySelector('b');
      if (b) b.textContent = on ? 'ON' : 'OFF';
    }

    function customConfirm(message) {
      return new Promise((resolve) => {
        const overlay = el('div', { className: 'modal-overlay on' });
        const panel = el('div', { className: 'confirm-panel' }, [
          el('div', { className: 'confirm-body' }),
          el('div', { className: 'confirm-foot' }, [
            el('button', { className: 'btn', textContent: 'キャンセル', onClick: () => { overlay.remove(); resolve(false); } }),
            el('button', { className: 'btn dng', textContent: '実行する', onClick: () => { overlay.remove(); resolve(true); } }),
          ]),
        ]);
        const body = panel.querySelector('.confirm-body');
        message.split('\n').forEach((line, i) => {
          if (i > 0) body.appendChild(document.createElement('br'));
          body.appendChild(document.createTextNode(line));
        });
        overlay.appendChild(panel);
        rootEl.querySelector('.app').appendChild(overlay);
        const onKey = (e) => { if (e.key === 'Escape') { overlay.remove(); resolve(false); document.removeEventListener('keydown', onKey); } };
        document.addEventListener('keydown', onKey);
      });
    }

    // 改善27: コンテキストメニュー
    function showContextMenu(x, y, items) {
      hideContextMenu();
      contextMenuEl = el('div', { className: 'ctx-menu', style: { left: x + 'px', top: y + 'px' } },
        items.map((it) => el('div', { className: 'ctx-item', textContent: it.label, onClick: () => { hideContextMenu(); it.action(); } }))
      );
      rootEl.querySelector('.app').appendChild(contextMenuEl);
      const onClickAway = (e) => {
        if (!contextMenuEl?.contains(e.target)) { hideContextMenu(); document.removeEventListener('click', onClickAway); }
      };
      setTimeout(() => document.addEventListener('click', onClickAway), 0);
    }

    function hideContextMenu() {
      if (contextMenuEl) { contextMenuEl.remove(); contextMenuEl = null; }
    }

    // 改善30: ショートカットヘルプモーダル
    function showShortcutHelp() {
      const overlay = el('div', { className: 'modal-overlay on' });
      const panel = el('div', { className: 'confirm-panel', style: { width: 'min(600px,90vw)' } }, [
        el('div', { className: 'shortcut-panel' }, [
          el('div', { style: { fontWeight: '900', fontSize: '16px', marginBottom: '12px' }, textContent: '⌨️ ショートカットキー' }),
          ...[
            ['Escape', 'パネルを閉じる / ツールを閉じる'],
            ['Ctrl+Z', '選択を元に戻す (Undo)'],
            ['Ctrl+Shift+Z', '選択をやり直す (Redo)'],
            ['↑ / ↓', 'ツリーノード移動'],
            ['← / →', 'ツリーノード折りたたみ/展開'],
            ['Enter / Space', 'チェックボックス切替'],
            ['Ctrl+E', 'JSON出力'],
            ['Ctrl+S', 'スナップ保存'],
          ].map(([key, desc]) =>
            el('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } }, [
              el('kbd', { textContent: key }),
              document.createTextNode(desc),
            ])
          ),
        ]),
        el('div', { className: 'confirm-foot' }, [
          el('button', { className: 'btn primary', textContent: '閉じる', onClick: () => overlay.remove() }),
        ]),
      ]);
      overlay.appendChild(panel);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
      rootEl.querySelector('.app').appendChild(overlay);
    }

    // 改善25: 操作ログモーダル
    function showLogModal() {
      const state = StateManager.getState();
      const overlay = el('div', { className: 'modal-overlay on' });
      const logContent = el('div', { className: 'log-panel' });
      const logs = state.operationLogs.slice().reverse();
      if (logs.length === 0) {
        logContent.appendChild(el('div', { style: { color: 'var(--muted)', padding: '20px' }, textContent: '操作ログはありません' }));
      } else {
        logs.forEach((log) => {
          logContent.appendChild(el('div', { className: 'log-entry' }, [
            el('span', { className: 'log-time', textContent: Utils.formatTime(log.time) }),
            el('span', { className: 'log-action', textContent: log.action }),
            el('span', { textContent: log.detail || '' }),
          ]));
        });
      }
      const panel = el('div', { className: 'modal-panel', style: { maxWidth: '700px' } }, [
        el('div', { className: 'modal-top' }, [
          el('div', { style: { fontWeight: '900' }, textContent: '操作ログ' }),
          el('span', { className: 'sp' }),
          el('button', { className: 'btn dng', textContent: '閉じる', onClick: () => overlay.remove() }),
        ]),
        el('div', { className: 'modal-body' }, [logContent]),
      ]);
      overlay.appendChild(panel);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
      rootEl.querySelector('.app').appendChild(overlay);
    }

    function inject() {
      const old = document.getElementById(ROOT_ID);
      if (old) old.remove();

      rootEl = document.createElement('div');
      rootEl.id = ROOT_ID;

      const styleEl = document.createElement('style');
      styleEl.textContent = createStyles();
      rootEl.appendChild(styleEl);

      const appEl = document.createElement('div');
      appEl.className = 'app';
      appEl.innerHTML = `
        <div class="top">
          <span class="dot"></span>
          <div class="brand-meta">
            <b>${esc(TOOL.name)}</b>
            <span class="brand-sub">Preview Reflect Console • v${esc(TOOL.version)}</span>
          </div>
          <span class="sp"></span>
          <button class="btn" id="xShortcuts" title="ショートカット">⌨️</button>
          <button class="btn" id="xLogs" title="操作ログ">📋</button>
          <button class="btn" id="xTheme">🌙</button>
          <button class="btn dng" id="xClose">Close</button>
        </div>
        <div class="grid">
          <div class="side">
            <div class="card">
              <label>接続ターゲット</label>
              <div class="row">
                <div><label>Source AppID</label><input type="text" id="xSrc" placeholder="例: 355"></div>
                <div><label>Target AppID</label><input type="text" id="xTgt" placeholder="例: 333"></div>
              </div>
              <div class="row" style="margin-top:8px">
                <div><label>source preview</label><div class="chips"><div class="chip" id="xSrcPrev"><b>OFF</b><span>preview</span></div></div></div>
                <div><label>target preview</label><div class="chips"><div class="chip" id="xTgtPrev"><b>OFF</b><span>preview</span></div></div></div>
              </div>
              <div style="margin-top:8px"><label>lang</label><input type="text" id="xLang" value="default"></div>
              <div style="margin-top:8px">
                <label>Lookup AppID Map (JSON: {"src":"tgt",...})</label>
                <textarea class="inp" id="xLookupMap" rows="2" placeholder='例: {"77":"177","85":"185"}'></textarea>
              </div>
              <div style="margin-top:10px;display:flex;gap:10px;align-items:center">
                <button class="btn primary" id="xLoad">差分取得</button>
                <div style="flex:1">
                  <div class="progress"><div class="bar" id="xProg"></div></div>
                  <div style="opacity:.7;font-size:12px;margin-top:6px" id="xStatus">未取得</div>
                </div>
              </div>
            </div>
            <div class="card">
              <label>表示/選択</label>
              <div class="chips" style="margin-top:8px">
                <button class="chip" id="fOnlyDiff">DiffOnly</button>
                <button class="chip" id="fOnlySel">Selected</button>
                <button class="chip" id="fAdded">Added</button>
                <button class="chip" id="fChanged">Changed</button>
                <button class="chip" id="fRemoved">Removed</button>
              </div>
              <div style="margin-top:10px"><label>検索 (ハイライト)</label><input type="text" id="xSearch" placeholder="例: fields / 通知"></div>
              <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
                <button class="btn small" id="xSelVisible">表示を選択</button>
                <button class="btn small" id="xUnselAll">全解除</button>
                <button class="btn small" id="xSelDiffs">差分全選択</button>
                <button class="btn small" id="xSelAllCatDiffs" title="全カテゴリの差分を一括選択">全Cat差分選択</button>
              </div>
              <div style="margin-top:6px;display:flex;gap:6px">
                <button class="btn small" id="xExpandAll">全展開</button>
                <button class="btn small" id="xCollapseAll">全折畳</button>
                <button class="btn small" id="xUndo" title="Ctrl+Z">↩ Undo</button>
                <button class="btn small" id="xRedo" title="Ctrl+Shift+Z">↪ Redo</button>
              </div>
            </div>
            <div class="card" style="display:flex;flex-direction:column;min-height:0">
              <label>カテゴリ</label>
              <div class="cats" id="xCats" style="margin-top:8px"></div>
              <div id="xDepWarnings"></div>
              <div style="margin-top:auto;padding:8px 4px 0;font-size:11px;color:var(--muted);border-top:1px solid var(--line)">⚠️ 削除/通知/権限はSafeMergeで実行されます</div>
            </div>
          </div>
          <div class="main">
            <div class="toolbar">
              <div class="hint" id="xHint">反映方針: [Src/Tgt] で適用する値を即時切替できます</div>
              <div class="summary-bar" id="xSummaryBar" style="display:none"></div>
              <span class="sp"></span>
              <button class="btn" id="xToggleRight" title="右パネル表示切替">◧</button>
              <button class="btn" id="xCopySel">選択IDコピー</button>
            </div>
            <div class="treeWrap" id="xTree" tabindex="0"></div>
            <div class="foot">
              <div class="sum" id="xSum">選択: 0件</div>
              <span class="sp"></span>
              <button class="btn" id="xImportBtn">JSON読込</button>
              <button class="btn" id="xSaveSnap" disabled>スナップ保存</button>
              <button class="btn" id="xFullExport" disabled>設定保存 (Full)</button>
              <button class="btn" id="xDiffReport" disabled title="差分レポート出力">📝 レポート</button>
              <button class="btn" id="xExport" disabled>JSON出力</button>
              <input type="file" id="xImportInput" accept=".json" style="display:none">
            </div>
          </div>
          <div class="right" id="xRightPanel">
            <div class="rightHead">
              <div style="font-weight:900">Diff</div><span class="sp"></span>
              <div class="tabs">
                <div class="tab on" data-tab="diff">差分</div>
                <div class="tab" data-tab="src">Source</div>
                <div class="tab" data-tab="tgt">Target</div>
              </div>
              <div style="margin-left:8px">
                <button class="btn small" id="xDiffMode" title="Inline/Side-by-Side切替">⇔</button>
              </div>
            </div>
            <div class="rightBody" id="xRightBody"><pre style="color:var(--muted)">ツリーの項目をクリックするとここに表示します。</pre></div>
          </div>
        </div>
        <div class="toastWrap" id="xToasts"></div>
        <div class="drop-overlay" id="xDropOverlay">📂 JSONファイルをドロップ</div>
        <div class="modal-overlay" id="xJsonModal">
          <div class="modal-panel">
            <div class="modal-top">
              <div style="font-weight:900">Export Patch JSON</div>
              <span class="sp"></span>
              <button class="btn success" id="xDeploy" title="Preview → 本番デプロイ">🚀 Deploy</button>
              <button class="btn primary" id="xRun">反映を実行 (Preview)</button>
              <div style="width:10px"></div>
              <button class="btn" id="xJsonCopy">コピー</button>
              <button class="btn" id="xJsonDl">ダウンロード</button>
              <button class="btn dng" id="xJsonClose">閉じる</button>
            </div>
            <div class="modal-body"><textarea id="xJsonText" spellcheck="false"></textarea></div>
          </div>
        </div>
      `;
      rootEl.appendChild(appEl);
      document.body.appendChild(rootEl);
      return rootEl;
    }

    // --- filter ---
    function matchesQuery(node, q) {
      return !q || `${node.label} ${node.pathStr || ''}`.toLowerCase().includes(q);
    }

    function nodeHasSelected(node, selectedLeaf) {
      return node.kind === 'leaf'
        ? selectedLeaf.has(node.id)
        : flattenNodes(node).some((n) => n.kind === 'leaf' && selectedLeaf.has(n.id));
    }

    function filterTree(rootNode, state) {
      const q = (state.filter.q || '').trim().toLowerCase();
      const hs = state.filter.hideSame, od = state.filter.onlyDiff, os = state.filter.onlySel;
      const recur = (node) => {
        if (node.kind === 'leaf') {
          if ((hs || od) && node.op === 'same') return null;
          if (os && !state.selectedLeaf.has(node.id)) return null;
          if (!state.filter.added && node.op === 'added') return null;
          if (!state.filter.changed && node.op === 'changed') return null;
          if (!state.filter.removed && node.op === 'removed') return null;
          return matchesQuery(node, q) ? node : null;
        }
        const kids = (node.children || []).map(recur).filter(Boolean);
        if (kids.length === 0 && q && !matchesQuery(node, q)) return null;
        if ((hs || od) && summarizeOp({ ...node, children: kids }).diff === 0 && !(os && nodeHasSelected(node, state.selectedLeaf))) return null;
        if (os && !nodeHasSelected(node, state.selectedLeaf) && !kids.some((k) => nodeHasSelected(k, state.selectedLeaf))) return null;
        return { ...node, children: kids };
      };
      return recur(rootNode);
    }

    // 改善19: 検索ハイライトヘルパー
    function highlightText(text, query) {
      if (!query) return [document.createTextNode(text)];
      const lower = text.toLowerCase();
      const q = query.toLowerCase();
      const idx = lower.indexOf(q);
      if (idx < 0) return [document.createTextNode(text)];
      const nodes = [];
      if (idx > 0) nodes.push(document.createTextNode(text.slice(0, idx)));
      nodes.push(el('span', { className: 'hl', textContent: text.slice(idx, idx + q.length) }));
      if (idx + q.length < text.length) nodes.push(document.createTextNode(text.slice(idx + q.length)));
      return nodes;
    }

    // --- render functions ---
    function renderSummaryBar(state) {
      const bar = $('#xSummaryBar');
      if (!bar) return;
      const s = state.globalSummary;
      if (!s) { bar.style.display = 'none'; return; }
      bar.style.display = 'flex';
      bar.innerHTML = '';
      const items = [
        { label: 'Added', count: s.added, color: '#4ea1ff' },
        { label: 'Changed', count: s.changed, color: '#ffcc66' },
        { label: 'Removed', count: s.removed, color: '#ff5d5d' },
        { label: 'Same', count: s.same, color: '#9aa7b6' },
      ];
      items.forEach((it) => {
        bar.appendChild(el('div', { className: 's-item' }, [
          el('span', { className: 's-dot', style: { background: it.color } }),
          document.createTextNode(`${it.label}: ${it.count}`),
        ]));
      });
      bar.appendChild(el('span', { style: { marginLeft: '8px', fontWeight: '900' } }, [`Total: ${s.total}`]));
    }

    // 改善23: 仮想スクロール対応ツリーレンダリング
    function renderTree(state) {
      const wrap = $('#xTree');
      if (!wrap) return;
      wrap.innerHTML = '';
      const raw = state.trees?.[state.activeCat];
      if (!raw) {
        wrap.appendChild(el('div', { style: { padding: '14px', color: 'var(--muted)' }, textContent: '差分取得してください' }));
        return;
      }
      const filtered = filterTree(raw, state);
      if (!filtered) {
        wrap.appendChild(el('div', { style: { padding: '14px', color: 'var(--muted)' }, textContent: '表示項目なし' }));
        return;
      }

      const rows = [];
      const walk = (n, d) => {
        rows.push({ n, d });
        if ((n.children || []).length && state.expanded.has(n.id)) n.children.forEach((c) => walk(c, d + 1));
      };
      walk(filtered, 0);

      const VIRTUAL_THRESHOLD = 300;
      const ROW_HEIGHT = 52;
      const searchQ = (state.filter.q || '').trim();

      if (rows.length > VIRTUAL_THRESHOLD) {
        // 改善23: 仮想スクロールモード
        const container = el('div', { style: { height: (rows.length * ROW_HEIGHT) + 'px', position: 'relative' } });
        const viewport = el('div', { style: { position: 'absolute', left: '0', right: '0', top: '0' } });
        container.appendChild(viewport);
        wrap.appendChild(container);

        let lastStart = -1;
        const renderSlice = () => {
          const scrollTop = wrap.scrollTop;
          const visibleCount = Math.ceil(wrap.clientHeight / ROW_HEIGHT) + 4;
          const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 2);
          const end = Math.min(rows.length, start + visibleCount);
          if (start === lastStart) return;
          lastStart = start;
          viewport.innerHTML = '';
          viewport.style.top = (start * ROW_HEIGHT) + 'px';
          for (let idx = start; idx < end; idx++) {
            viewport.appendChild(buildTreeRow(rows[idx].n, rows[idx].d, idx, state, searchQ, []));
          }
        };
        renderSlice();
        wrap.addEventListener('scroll', renderSlice, { passive: true });
      } else {
        // 通常レンダリング
        const rowEls = [];
        rows.forEach(({ n, d }, idx) => {
          const row = buildTreeRow(n, d, idx, state, searchQ, rowEls);
          rowEls.push(row);
          wrap.appendChild(row);
        });
      }
    }

    function buildTreeRow(n, d, idx, state, searchQ, rowEls) {
      const hasChild = (n.children || []).length > 0;
      const leaves = flattenNodes(n).filter((x) => x.kind === 'leaf');
      const selCount = leaves.filter((x) => state.selectedLeaf.has(x.id)).length;
      const isPinned = state.pinnedNodes.has(n.id);

      const indent = el('div', { className: 'indent', style: { '--d': String(d) } });

      const isOpen = state.expanded.has(n.id);
      const caret = el('div', {
        className: 'caret' + (hasChild ? (isOpen ? ' open' : '') : ' hide'),
        textContent: '▸',
        onClick: (e) => {
          e.stopPropagation();
          if (hasChild) {
            state.expanded.has(n.id) ? state.expanded.delete(n.id) : state.expanded.add(n.id);
            renderTree(state);
            StateManager.savePrefs();
          }
        },
      });

      const chk = el('input', {
        type: 'checkbox',
        style: { transform: 'scale(1.15)', accentColor: '#4ea1ff', flexShrink: '0' },
        onClick: (e) => e.stopPropagation(),
        onChange: () => {
          StateManager.pushUndo();
          const w = chk.checked;
          leaves.forEach((l) => (w ? state.selectedLeaf.add(l.id) : state.selectedLeaf.delete(l.id)));
          updateFooter(state);
          renderTree(state);
          renderDepWarnings(state);
        },
      });
      chk.checked = selCount === leaves.length && leaves.length > 0;
      chk.indeterminate = selCount > 0 && selCount < leaves.length;

      const t1 = el('div', { className: 't1' }, highlightText(n.label, searchQ));
      const t2 = el('div', { className: 't2' }, highlightText(n.pathStr || n.id, searchQ));
      const label = el('div', { className: 'tlabel' }, [t1, t2]);

      const op = el('div', { className: `op ${n.op}`, textContent: n.op });

      // 改善29: ピン留めボタン
      const pinBtn = el('span', {
        className: 'pin-btn' + (isPinned ? ' pinned' : ''),
        textContent: '📌',
        title: 'ピン留め',
        onClick: (e) => {
          e.stopPropagation();
          isPinned ? state.pinnedNodes.delete(n.id) : state.pinnedNodes.add(n.id);
          StateManager.savePrefs();
          renderTree(state);
        },
      });

      const act = el('div', { className: 'actions' });
      if (n.kind === 'item' || n.id.includes('@@__all__')) {
        const m = state.modes[n.id] || 'src';
        const sw = el('div', {
          className: `mode-sw ${m}`, title: 'Payload Source', textContent: m === 'src' ? 'Src' : 'Tgt',
          onClick: (e) => { e.stopPropagation(); state.modes[n.id] = m === 'src' ? 'tgt' : 'src'; renderTree(state); StateManager.savePrefs(); },
        });
        act.appendChild(sw);
      }
      act.appendChild(el('button', {
        className: 'btn small', textContent: 'Diff',
        onClick: (e) => { e.stopPropagation(); state.activeNodeId = n.id; setRightTab('diff'); renderRight(state); },
      }));
      act.appendChild(pinBtn);

      const row = el('div', {
        className: 'treeRow' + (isPinned ? ' pinned' : ''), tabindex: '0',
        onClick: () => { state.activeNodeId = n.id; renderRight(state); },
        // 改善27: 右クリックコンテキストメニュー
        onContextmenu: (e) => {
          e.preventDefault();
          const menuItems = [
            { label: 'この項目をDiffで表示', action: () => { state.activeNodeId = n.id; setRightTab('diff'); renderRight(state); } },
            { label: isPinned ? 'ピン解除' : 'ピン留め', action: () => { isPinned ? state.pinnedNodes.delete(n.id) : state.pinnedNodes.add(n.id); StateManager.savePrefs(); renderTree(state); } },
            { label: 'この項目の子を全選択', action: () => { StateManager.pushUndo(); leaves.forEach((l) => state.selectedLeaf.add(l.id)); updateFooter(state); renderTree(state); renderDepWarnings(state); } },
            { label: 'この項目の子を全解除', action: () => { StateManager.pushUndo(); leaves.forEach((l) => state.selectedLeaf.delete(l.id)); updateFooter(state); renderTree(state); renderDepWarnings(state); } },
            { label: 'Source JSONをコピー', action: () => { navigator.clipboard.writeText(Utils.stableStringify(n.source, 2) || ''); toast('Copy', 'Source copied'); } },
          ];
          showContextMenu(e.clientX, e.clientY, menuItems);
        },
        onKeydown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); chk.checked = !chk.checked; chk.dispatchEvent(new Event('change')); }
          else if (e.key === 'ArrowRight' && hasChild && !state.expanded.has(n.id)) { state.expanded.add(n.id); renderTree(state); }
          else if (e.key === 'ArrowLeft' && hasChild && state.expanded.has(n.id)) { state.expanded.delete(n.id); renderTree(state); }
          else if (e.key === 'ArrowDown') { e.preventDefault(); const next = rowEls[idx + 1]; if (next) next.focus(); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); const prev = rowEls[idx - 1]; if (prev) prev.focus(); }
        },
      }, [indent, caret, chk, label, op, act]);

      return row;
    }

    function renderRight(state) {
      const body = $('#xRightBody');
      if (!body) return;
      const node = state.activeNodeId
        ? flattenNodes(state.trees?.[state.activeCat] || { children: [] }).find((n) => n.id === state.activeNodeId)
        : null;
      if (!node) { body.innerHTML = ''; body.appendChild(el('pre', { style: { color: 'var(--muted)' }, textContent: '選択なし' })); return; }
      const tab = rootEl.dataset.rightTab || 'diff';
      if (tab === 'src') {
        body.innerHTML = '';
        body.appendChild(el('pre', { textContent: Utils.stableStringify(node.source, 2) }));
      } else if (tab === 'tgt') {
        body.innerHTML = '';
        body.appendChild(el('pre', { textContent: Utils.stableStringify(node.target, 2) }));
      } else {
        body.innerHTML = DiffEngine.makeDiffHtml(node.source, node.target, state.diffMode);
      }
    }

    function renderCats(state) {
      const wrap = $('#xCats');
      if (!wrap) return;
      wrap.innerHTML = '';
      const grps = ['基本設定', '業務設定', '通知', '権限'];
      grps.forEach((g) => {
        wrap.appendChild(el('div', { textContent: g, style: { margin: '6px 0 4px', fontSize: '12px', fontWeight: '900', color: 'var(--muted)' } }));
        API.ENDPOINTS.filter((x) => x.group === g).forEach((x) => {
          const t = state.trees?.[x.key];
          const sum = t ? summarizeOp(t) : { diff: 0, total: 0 };
          // 改善26: カテゴリ毎の選択件数バッジ
          const catSum = t ? computeCategorySummary(t, state.selectedLeaf) : { selected: 0 };
          const badges = [
            el('div', { className: `badge ${sum.diff ? 'red' : 'green'}`, textContent: `${sum.diff}/${sum.total}` }),
          ];
          if (catSum.selected > 0) {
            badges.push(el('div', { className: 'badge blue', textContent: `✓${catSum.selected}` }));
          }

          const d = el('div', {
            className: 'cat' + (state.activeCat === x.key ? ' on' : ''),
            onClick: () => { state.activeCat = x.key; state.activeNodeId = null; renderAll(); StateManager.savePrefs(); },
          }, [
            el('div', { style: { display: 'flex', flexDirection: 'column', flex: '1' } }, [
              el('div', { style: { fontWeight: '900' }, textContent: x.label }),
              el('div', { style: { opacity: '.7', fontSize: '12px' }, textContent: x.key }),
            ]),
            ...badges,
          ]);
          wrap.appendChild(d);
        });
      });
    }

    // 改善24: 依存チェック警告表示
    function renderDepWarnings(state) {
      const wrap = $('#xDepWarnings');
      if (!wrap) return;
      wrap.innerHTML = '';
      if (!state.trees) return;
      const warnings = DiffEngine.checkFieldDependencies(state.trees, state.selectedLeaf, state.rawSrc);
      if (warnings.length === 0) return;

      const box = el('div', { className: 'warn-box' }, [
        el('div', { style: { fontWeight: '700' }, textContent: '⚠️ フィールド依存チェック' }),
        el('ul', {}, warnings.map((w) => el('li', { textContent: w }))),
      ]);
      wrap.appendChild(box);
    }

    function updateFooter(state) {
      const sum = $('#xSum');
      if (sum) sum.textContent = `選択: ${state.selectedLeaf.size}件`;
      const exp = $('#xExport');
      if (exp) exp.disabled = state.selectedLeaf.size === 0;
      const snap = $('#xSaveSnap');
      if (snap) snap.disabled = !state.trees;
      const full = $('#xFullExport');
      if (full) full.disabled = !state.trees;
      const report = $('#xDiffReport');
      if (report) report.disabled = !state.trees;
    }

    function setRightTab(t) {
      $$('.tab').forEach((x) => x.classList.toggle('on', x.dataset.tab === t));
      rootEl.dataset.rightTab = t;
    }

    function renderAll() {
      const state = StateManager.getState();
      const src = $('#xSrc'), tgt = $('#xTgt'), lang = $('#xLang'), search = $('#xSearch'), lookupMap = $('#xLookupMap');
      if (src) src.value = state.srcApp;
      if (tgt) tgt.value = state.tgtApp;
      if (lang) lang.value = state.lang;
      if (search) search.value = state.filter.q;
      if (lookupMap) {
        try { lookupMap.value = Object.keys(state.lookupAppIdMap).length ? JSON.stringify(state.lookupAppIdMap) : ''; } catch { lookupMap.value = ''; }
      }
      setChip($('#xSrcPrev'), state.srcPrev);
      setChip($('#xTgtPrev'), state.tgtPrev);
      setChip($('#fOnlyDiff'), state.filter.onlyDiff);
      setChip($('#fOnlySel'), state.filter.onlySel);
      setChip($('#fAdded'), state.filter.added);
      setChip($('#fChanged'), state.filter.changed);
      setChip($('#fRemoved'), state.filter.removed);
      rootEl.className = state.theme === 'light' ? 'light-mode' : '';
      const themeBtn = $('#xTheme');
      if (themeBtn) themeBtn.textContent = state.theme === 'light' ? '☀️' : '🌙';

      // 改善20: 右パネル折りたたみ
      const rightPanel = $('#xRightPanel');
      if (rightPanel) rightPanel.classList.toggle('collapsed', !state.rightPanelOpen);

      renderSummaryBar(state);
      renderCats(state);
      renderTree(state);
      renderRight(state);
      updateFooter(state);
      renderDepWarnings(state);
    }

    // --- fetch ---
    async function fetchAll() {
      const state = StateManager.getState();
      const src = state.srcApp.trim(), tgt = state.tgtApp.trim();
      if (!src || !tgt) throw new Error('Source/Target AppID 必須');

      StateManager.pushUndo();
      state.selectedLeaf.clear();
      state.activeNodeId = null;
      setProg(0, '開始...');

      const allSrc = {}, allTgt = {};
      for (let i = 0; i < API.ENDPOINTS.length; i++) {
        const ep = API.ENDPOINTS[i];
        setProg(Math.round((i / API.ENDPOINTS.length) * 100), `取得: ${ep.label}`);
        try {
          const [S, T] = await Promise.all([
            API.callWithRetry(ep.get, 'GET', { app: src, lang: state.lang }, state.srcPrev),
            API.callWithRetry(ep.get, 'GET', { app: tgt, lang: state.lang }, state.tgtPrev),
          ]);
          allSrc[ep.key] = S;
          allTgt[ep.key] = T;
        } catch (err) {
          console.error(err);
          allSrc[ep.key] = null;
          allTgt[ep.key] = null;
          toast('Skip', `${ep.label}: ${err.message}`, 2500);
        }
      }

      setProg(100, '計算中...');
      const maxDepth = state.filter.deep ? 8 : 4;
      const trees = {};
      trees.views = DiffEngine.buildViewsTree('views', allSrc.views, allTgt.views, maxDepth);
      trees.fields = DiffEngine.buildFieldsTree('fields', allSrc.fields, allTgt.fields, maxDepth);
      trees.actions = DiffEngine.buildGenericTree('actions', allSrc.actions, allTgt.actions, 'アクション', maxDepth, null);
      trees.reports = DiffEngine.buildGenericTree('reports', allSrc.reports, allTgt.reports, 'レポート', maxDepth, null);
      trees.notifGeneral = DiffEngine.buildGenericTree('notifGeneral', allSrc.notifGeneral, allTgt.notifGeneral, '通知(一般)', maxDepth, DiffEngine.keyFns.notifGeneral);
      trees.notifPerRecord = DiffEngine.buildGenericTree('notifPerRecord', allSrc.notifPerRecord, allTgt.notifPerRecord, '通知(レコード)', maxDepth, DiffEngine.keyFns.notifPerRecord);
      trees.notifReminder = DiffEngine.buildGenericTree('notifReminder', allSrc.notifReminder, allTgt.notifReminder, '通知(リマインダ)', maxDepth, DiffEngine.keyFns.notifReminder);
      trees.aclApp = DiffEngine.buildGenericTree('aclApp', allSrc.aclApp, allTgt.aclApp, '権限(アプリ)', maxDepth, DiffEngine.keyFns.aclApp);
      trees.aclRecord = DiffEngine.buildGenericTree('aclRecord', allSrc.aclRecord, allTgt.aclRecord, '権限(レコード)', maxDepth, DiffEngine.keyFns.aclRecord);
      trees.aclField = DiffEngine.buildGenericTree('aclField', allSrc.aclField, allTgt.aclField, '権限(フィールド)', maxDepth, DiffEngine.keyFns.aclField);
      trees.status = DiffEngine.buildSingletonTree('status', allSrc.status, allTgt.status, 'プロセス管理');
      trees.layout = DiffEngine.buildSingletonTree('layout', allSrc.layout, allTgt.layout, 'レイアウト');

      const globalSummary = DiffEngine.computeGlobalSummary(trees);

      StateManager.setState({ trees, rawSrc: allSrc, rawTgt: allTgt, globalSummary });
      Object.values(trees).forEach((r) => (r.children || []).forEach((ch) => state.expanded.add(ch.id)));
      setProg(100, '完了');

      StateManager.addLog('差分取得', `Src:${src} → Tgt:${tgt} | Added:${globalSummary.added} Changed:${globalSummary.changed} Removed:${globalSummary.removed}`);
      toast('差分取得完了', `追加:${globalSummary.added} 変更:${globalSummary.changed} 削除:${globalSummary.removed} 同一:${globalSummary.same}`, 4000);
    }

    // --- bind events ---
    function bindEvents() {
      const state = StateManager.getState();
      const bind = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', fn);
      };

      bind('xClose', () => { clearInterval(autoSaveTimer); rootEl.remove(); });
      bind('xTheme', () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; StateManager.savePrefs(); renderAll(); });
      bind('xSrcPrev', () => { state.srcPrev = !state.srcPrev; StateManager.savePrefs(); renderAll(); });
      bind('xTgtPrev', () => { state.tgtPrev = !state.tgtPrev; StateManager.savePrefs(); renderAll(); });
      bind('fOnlyDiff', () => { state.filter.onlyDiff = !state.filter.onlyDiff; StateManager.savePrefs(); renderAll(); });
      bind('fOnlySel', () => { state.filter.onlySel = !state.filter.onlySel; StateManager.savePrefs(); renderAll(); });
      bind('fAdded', () => { state.filter.added = !state.filter.added; StateManager.savePrefs(); renderAll(); });
      bind('fChanged', () => { state.filter.changed = !state.filter.changed; StateManager.savePrefs(); renderAll(); });
      bind('fRemoved', () => { state.filter.removed = !state.filter.removed; StateManager.savePrefs(); renderAll(); });

      // 改善30
      bind('xShortcuts', showShortcutHelp);
      // 改善25
      bind('xLogs', showLogModal);

      $('#xSearch').addEventListener('input', (e) => { state.filter.q = e.target.value; renderTree(state); StateManager.savePrefs(); });
      $('#xLang').addEventListener('input', (e) => { state.lang = e.target.value; StateManager.savePrefs(); });
      $('#xSrc').addEventListener('input', (e) => { state.srcApp = e.target.value; StateManager.savePrefs(); });
      $('#xTgt').addEventListener('input', (e) => { state.tgtApp = e.target.value; StateManager.savePrefs(); });

      $('#xLookupMap').addEventListener('change', (e) => {
        const v = e.target.value.trim();
        if (!v) { state.lookupAppIdMap = {}; StateManager.savePrefs(); return; }
        try {
          const parsed = JSON.parse(v);
          if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Object required');
          state.lookupAppIdMap = parsed;
          StateManager.savePrefs();
          toast('Lookup Map', '更新しました');
        } catch (err) {
          toast('Error', `JSON parse error: ${err.message}`, 3000);
        }
      });

      bind('xExpandAll', () => {
        if (state.trees?.[state.activeCat]) {
          flattenNodes(state.trees[state.activeCat]).forEach((n) => (n.children || []).length && state.expanded.add(n.id));
          renderTree(state);
        }
      });
      bind('xCollapseAll', () => { state.expanded.clear(); renderTree(state); });

      bind('xSelVisible', () => {
        StateManager.pushUndo();
        const t = filterTree(state.trees?.[state.activeCat], state);
        if (t) flattenNodes(t).forEach((n) => n.kind === 'leaf' && state.selectedLeaf.add(n.id));
        updateFooter(state);
        renderTree(state);
        renderDepWarnings(state);
      });
      bind('xUnselAll', () => { StateManager.pushUndo(); state.selectedLeaf.clear(); updateFooter(state); renderTree(state); renderDepWarnings(state); });
      bind('xSelDiffs', () => {
        StateManager.pushUndo();
        const t = state.trees?.[state.activeCat];
        if (t) flattenNodes(t).forEach((n) => n.kind === 'leaf' && n.op !== 'same' && state.selectedLeaf.add(n.id));
        renderTree(state);
        updateFooter(state);
        renderDepWarnings(state);
        toast('選択', '差分を選択しました');
      });

      // 改善16: 全カテゴリ横断の差分一括選択
      bind('xSelAllCatDiffs', () => {
        if (!state.trees) return;
        StateManager.pushUndo();
        let count = 0;
        for (const tree of Object.values(state.trees)) {
          flattenNodes(tree).forEach((n) => {
            if (n.kind === 'leaf' && n.op !== 'same') { state.selectedLeaf.add(n.id); count++; }
          });
        }
        updateFooter(state);
        renderTree(state);
        renderCats(state);
        renderDepWarnings(state);
        StateManager.addLog('全Cat差分選択', `${count}件選択`);
        toast('全カテゴリ選択', `${count}件の差分を選択`);
      });

      // 改善21: Undo/Redo
      bind('xUndo', () => { if (StateManager.undo()) { updateFooter(state); renderTree(state); renderCats(state); renderDepWarnings(state); toast('Undo', '選択を戻しました'); } });
      bind('xRedo', () => { if (StateManager.redo()) { updateFooter(state); renderTree(state); renderCats(state); renderDepWarnings(state); toast('Redo', '選択をやり直しました'); } });

      // 改善20: 右パネル折りたたみ
      bind('xToggleRight', () => { state.rightPanelOpen = !state.rightPanelOpen; StateManager.savePrefs(); renderAll(); });

      // 改善28: Diff表示モード切替
      bind('xDiffMode', () => {
        state.diffMode = state.diffMode === 'sideBySide' ? 'inline' : 'sideBySide';
        StateManager.savePrefs();
        renderRight(state);
        toast('Diff Mode', state.diffMode === 'sideBySide' ? 'Side-by-Side' : 'Inline');
      });

      $$('.tab').forEach((t) => t.addEventListener('click', () => { setRightTab(t.dataset.tab); renderRight(state); }));

      bind('xCopySel', () => { navigator.clipboard.writeText([...state.selectedLeaf].join('\n')); toast('コピー', 'IDコピー'); });
      bind('xSaveSnap', async () => { await StateManager.snapshotSave(); StateManager.addLog('スナップ保存', '手動保存'); toast('保存', 'スナップを保存しました'); });

      bind('xLoad', async () => {
        try { await fetchAll(); renderAll(); StateManager.savePrefs(); }
        catch (e) { console.error(e); toast('Error', e.message, 4000); setProg(0, 'Error'); }
      });

      bind('xFullExport', () => {
        if (!state.rawSrc || !state.rawTgt) return;
        const data = {
          tool: TOOL.name, version: TOOL.version, exportedAt: Utils.now(),
          sourceAppId: state.srcApp, targetAppId: state.tgtApp,
          snapshot: { source: state.rawSrc, target: state.rawTgt },
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `kintone_settings_full_${state.srcApp}_to_${state.tgtApp}_${Date.now()}.json`;
        a.click();
        StateManager.addLog('Full Export', `Src:${state.srcApp} → Tgt:${state.tgtApp}`);
        toast('Export', '全設定ファイルを保存しました');
      });

      // 改善18: 差分レポート出力
      bind('xDiffReport', () => {
        if (!state.trees || !state.globalSummary) return;
        const md = DiffEngine.generateDiffReport(state.trees, state.globalSummary, state.srcApp, state.tgtApp);
        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `diff_report_${state.srcApp}_to_${state.tgtApp}_${Date.now()}.md`;
        a.click();
        StateManager.addLog('レポート出力', `Markdown diff report`);
        toast('レポート', '差分レポートを出力しました');
      });

      bind('xExport', () => {
        try {
          const p = RequestGen.generate({
            sourceAppId: state.srcApp,
            targetAppId: state.tgtApp,
            trees: state.trees,
            selectedLeafIds: state.selectedLeaf,
            rawSrc: state.rawSrc,
            rawTgt: state.rawTgt,
            modes: state.modes,
            lookupAppIdMap: state.lookupAppIdMap,
          });
          $('#xJsonText').value = JSON.stringify(p, null, 2);
          $('#xJsonModal').classList.add('on');
          StateManager.addLog('JSON出力', `${p.requests.length}件のリクエスト`);
        } catch (e) { console.error(e); toast('Error', e.message, 4000); }
      });

      bind('xImportBtn', () => $('#xImportInput').click());

      // 改善17: ドラッグ&ドロップ JSON 読込
      const appEl = rootEl.querySelector('.app');
      const dropOverlay = $('#xDropOverlay');
      let dragCounter = 0;
      appEl.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragCounter++;
        if (dropOverlay) dropOverlay.classList.add('on');
      });
      appEl.addEventListener('dragleave', () => {
        dragCounter--;
        if (dragCounter <= 0) { dragCounter = 0; if (dropOverlay) dropOverlay.classList.remove('on'); }
      });
      appEl.addEventListener('dragover', (e) => e.preventDefault());
      appEl.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCounter = 0;
        if (dropOverlay) dropOverlay.classList.remove('on');
        const file = e.dataTransfer?.files?.[0];
        if (file && file.name.endsWith('.json')) {
          loadJsonFile(file);
        } else {
          toast('Error', 'JSONファイルをドロップしてください', 3000);
        }
      });

      $('#xImportInput').addEventListener('change', (e) => {
        const f = e.target.files[0];
        if (f) loadJsonFile(f);
        e.target.value = '';
      });

      function loadJsonFile(f) {
        const r = new FileReader();
        r.onload = () => {
          try {
            const json = JSON.parse(r.result);
            if (!json.requests || !Array.isArray(json.requests)) throw new Error('Invalid JSON: requests array not found');
            $('#xJsonText').value = JSON.stringify(json, null, 2);
            $('#xJsonModal').classList.add('on');
            if (json.sourceAppId) { state.srcApp = json.sourceAppId; $('#xSrc').value = state.srcApp; }
            if (json.targetAppId) { state.tgtApp = json.targetAppId; $('#xTgt').value = state.tgtApp; }
            StateManager.savePrefs();
            StateManager.addLog('JSON読込', f.name);
            toast('Import', 'JSON読込完了');
          } catch (err) { toast('Error', 'Import Failed: ' + err.message, 4000); }
        };
        r.readAsText(f);
      }

      bind('xJsonClose', () => $('#xJsonModal').classList.remove('on'));
      bind('xJsonCopy', () => { navigator.clipboard.writeText($('#xJsonText').value); toast('Copy', 'JSON copied'); });
      bind('xJsonDl', () => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([$('#xJsonText').value], { type: 'application/json' }));
        a.download = `patch_${state.srcApp}_to_${state.tgtApp}.json`;
        a.click();
      });

      bind('xRun', async () => {
        const confirmed = await customConfirm(
          'Targetアプリ（Preview）に対し、表示中のJSONの変更を適用します。\n\n' +
          '※ FieldsはPOST/PUT/DELETEを正しく分割して反映します。\n' +
          '※ lookup appId変換したフィールドは、同codeがある場合 code末尾_ でPOSTします。\n' +
          '※ Views/Layoutはcode置換を伴う場合があります。\n\n' +
          '実行しますか？'
        );
        if (!confirmed) return;

        try {
          const json = JSON.parse($('#xJsonText').value);
          const logEl = $('#xJsonText');
          logEl.value = '実行中...\n';
          await RequestGen.runRequests(json.requests, (msg) => { logEl.value += msg + '\n'; });
          logEl.value += '\n完了しました。Kintoneの設定画面（プレビュー）で確認してください。';
          StateManager.addLog('Preview反映', `${json.requests.length}件のリクエスト実行`);
          toast('完了', '反映完了 (Preview)');
        } catch (e) {
          toast('エラー', e.message, 5000);
          $('#xJsonText').value += '\nエラー発生: ' + e.message;
        }
      });

      // 改善15: デプロイボタン
      bind('xDeploy', async () => {
        const tgtApp = state.tgtApp.trim();
        if (!tgtApp) { toast('Error', 'Target AppID が未設定です', 3000); return; }
        const confirmed = await customConfirm(
          `Target App (${tgtApp}) のPreview変更を本番にデプロイします。\n\n` +
          'この操作は取り消せません。\n' +
          '本番環境に影響があります。\n\n' +
          'デプロイを実行しますか？'
        );
        if (!confirmed) return;

        try {
          toast('Deploy', 'デプロイ開始...', 3000);
          await API.deployApp(tgtApp);
          StateManager.addLog('Deploy', `App ${tgtApp} をデプロイ`);

          // デプロイ状態をポーリング
          let status = 'PROCESSING';
          for (let i = 0; i < 30; i++) {
            await new Promise((r) => setTimeout(r, 2000));
            try {
              const res = await API.getDeployStatus(tgtApp);
              status = res?.apps?.[0]?.status || 'UNKNOWN';
              if (status === 'SUCCESS') break;
              if (status === 'FAIL' || status === 'CANCEL') break;
            } catch { /* continue polling */ }
          }

          if (status === 'SUCCESS') {
            toast('Deploy 完了', `App ${tgtApp} のデプロイが完了しました`, 5000);
          } else {
            toast('Deploy 状態', `ステータス: ${status}`, 5000);
          }
        } catch (e) {
          toast('Deploy エラー', e.message, 5000);
        }
      });

      // グローバルキーボード
      document.addEventListener('keydown', (e) => {
        // Escape
        if (e.key === 'Escape') {
          hideContextMenu();
          const jsonModal = $('#xJsonModal');
          if (jsonModal?.classList.contains('on')) { jsonModal.classList.remove('on'); return; }
          clearInterval(autoSaveTimer);
          rootEl.remove();
          return;
        }

        // 改善21: Ctrl+Z / Ctrl+Shift+Z
        if (e.ctrlKey || e.metaKey) {
          if (e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            if (StateManager.undo()) { updateFooter(state); renderTree(state); renderCats(state); renderDepWarnings(state); toast('Undo', '選択を戻しました'); }
          } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
            e.preventDefault();
            if (StateManager.redo()) { updateFooter(state); renderTree(state); renderCats(state); renderDepWarnings(state); toast('Redo', 'やり直し'); }
          } else if (e.key === 'e') {
            e.preventDefault();
            document.getElementById('xExport')?.click();
          } else if (e.key === 's') {
            e.preventDefault();
            document.getElementById('xSaveSnap')?.click();
          }
        }
      });

      // 改善22: 自動スナップ保存 (2分間隔)
      autoSaveTimer = setInterval(async () => {
        if (state.trees) {
          await StateManager.snapshotSave();
          console.log('[kdExportTree] Auto-saved snapshot');
        }
      }, 120000);
    }

    return { inject, bindEvents, renderAll, toast };
  })();

  // =================================================================
  //  Bootstrap
  // =================================================================
  UI.inject();
  StateManager.loadPrefs();
  UI.bindEvents();

  (async () => {
    const restored = await StateManager.snapshotLoad();
    if (restored) UI.toast('復元', 'スナップを復元');
    UI.renderAll();
  })();

})();
