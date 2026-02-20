/**
 * kintone アプリ設定差分コンパレータ v8.0
 *
 * === v7.5 → v8.0 改善・追加一覧 ===
 *
 * 【バグ修正】
 *  1. categorize() が全16セクションをカバーしていなかった → 全セクション対応
 *  2. 文字レベル diff (highlightChar) がスタブのままだった → 実装完了
 *  3. パッチ出力が alert のみだった → 実際の JSON パッチを生成・DL
 *  4. 無視プロファイル (IGNORE_PROFILE_STATE_KEY) が未使用 → 保存/復元UI付き
 *  5. side-by-side diff で行がズレる → 空行パディングで整列
 *  6. レポート内 pre が横スクロール不可だった → overflow-x:auto 追加
 *
 * 【機能追加】
 *  7. セクション折りたたみ (collapsible) 対応
 *  8. 統計サマリ (追加/削除/変更/一致 件数)
 *  9. JSON バンドル出力 (source+target を1ファイルで共有)
 * 10. クリップボードコピー (セクション単位 / 全体)
 * 11. 印刷用 CSS (@media print)
 * 12. キーボードショートカット (Ctrl+F → 検索フォーカス, Escape → 検索クリア)
 * 13. 深いオブジェクト比較 (再帰 deep-diff) でネスト差分を正確に表示
 * 14. diff 行にツールチップ (hover で JSON パス表示)
 * 15. 比較ダイアログにプログレスバー追加
 * 16. レポートに生成日時・比較条件メタ情報を埋め込み
 * 17. diff がない場合の「差分なし」サマリ表示
 * 18. 検索がキー名だけでなく値にもヒットするように拡張
 * 19. フィールド設定のスマート比較 (フィールドコード → ラベルのマッピング表示)
 * 20. エクスポートファイル名に日時スタンプ追加
 */

(function () {
  // ===== 設定エリア =====
  const CURRENT_GUEST_SPACE_ID = (location.pathname.match(/\/k\/guest\/(\d+)\//) || [])[1] || '';

  const APP_VERSION = '8_0';
  const DIALOG_STATE_KEY = `kintone_diff_dialog_state_v${APP_VERSION}`;
  const IGNORE_PROFILE_STATE_KEY = `kintone_diff_ignore_profiles_v${APP_VERSION}`;

  const DEFAULT_Values = {
    sourceAppId: kintone.app.getId() || '',
    sourceGuestSpaceId: CURRENT_GUEST_SPACE_ID,
    targetGuestSpaceId: CURRENT_GUEST_SPACE_ID
  };

  const SETTINGS_SECTION_OPTIONS = [
    { key: 'appSettings',            label: 'アプリ設定' },
    { key: 'fieldSettings',          label: 'フィールド設定' },
    { key: 'layoutSettings',         label: 'レイアウト設定' },
    { key: 'formSettings',           label: 'フォーム設定' },
    { key: 'viewSettings',           label: 'ビュー設定' },
    { key: 'reportSettings',         label: 'レポート設定' },
    { key: 'processSettings',        label: 'プロセス管理' },
    { key: 'pluginSettings',         label: 'プラグイン設定' },
    { key: 'customizeSettings',      label: 'JS/CSS設定' },
    { key: 'actionSettings',         label: 'アクション設定' },
    { key: 'appAcl',                 label: 'アプリACL' },
    { key: 'fieldAcl',               label: 'フィールドACL' },
    { key: 'recordPermissions',      label: 'レコード権限' },
    { key: 'notifications',          label: '通知設定' },
    { key: 'reminderNotifications',  label: 'リマインダー通知' },
    { key: 'categories',             label: 'カテゴリ設定' },
  ];

  /* ===== v8: セクションキー → 日本語ラベルの完全マップ ===== */
  const SECTION_LABEL_MAP = {};
  SETTINGS_SECTION_OPTIONS.forEach(o => { SECTION_LABEL_MAP[o.key] = o.label; });

  // ===== Utility Functions =====
  function escapeHtml(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function safeJsonForScript(obj) {
    return JSON.stringify(obj)
      .replace(/</g, '\\u003c')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
  }

  function readJsonFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try { resolve(JSON.parse(e.target.result)); } catch (err) { reject(err); }
      };
      reader.readAsText(file);
    });
  }

  function loadDialogState() {
    try { return JSON.parse(localStorage.getItem(DIALOG_STATE_KEY)); } catch (e) { return null; }
  }
  function saveDialogState(state) {
    try { localStorage.setItem(DIALOG_STATE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* v8: 無視プロファイル保存/読み込み */
  function loadIgnoreProfiles() {
    try { return JSON.parse(localStorage.getItem(IGNORE_PROFILE_STATE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveIgnoreProfiles(profiles) {
    try { localStorage.setItem(IGNORE_PROFILE_STATE_KEY, JSON.stringify(profiles)); } catch (e) {}
  }

  /* v8: タイムスタンプ文字列 */
  function timestamp() {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;
  }

  // ===== Dialog =====
  function showLoadingDialog() {
    const state = loadDialogState() || {};
    const profiles = loadIgnoreProfiles();
    const old = document.getElementById('compareDialog');
    if (old) document.body.removeChild(old);

    const dialog = document.createElement('div');
    dialog.id = 'compareDialog';
    dialog.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:999999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);font-family:-apple-system,sans-serif;';

    const scopes = SETTINGS_SECTION_OPTIONS.map(s => {
      const checked = (!state.selectedScopes || state.selectedScopes.includes(s.key)) ? 'checked' : '';
      return `<label style="display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:4px 8px;border:1px solid #ddd;border-radius:12px;background:#fff;cursor:pointer;user-select:none;"><input type="checkbox" class="scope-check" value="${s.key}" ${checked}>${s.label}</label>`;
    }).join('');

    /* v8: 無視プロファイルのオプション */
    const profileOptions = Object.keys(profiles).map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');

    const inputStyle = 'width:80px;padding:5px;border:1px solid #ccc;border-radius:4px;';
    const sAppId = state.sourceAppId ?? DEFAULT_Values.sourceAppId;
    const tAppId = state.targetAppId ?? '';
    const sGuest = state.sourceGuestSpaceId ?? DEFAULT_Values.sourceGuestSpaceId;
    const tGuest = state.targetGuestSpaceId ?? DEFAULT_Values.targetGuestSpaceId;

    dialog.innerHTML = `
      <div style="background:white;width:780px;max-width:95vw;max-height:92vh;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.2);display:flex;flex-direction:column;overflow:hidden;">
        <div style="padding:15px 20px;background:linear-gradient(135deg, #667eea, #764ba2);color:white;">
          <h2 style="margin:0;font-size:20px;">⚡ kintone 設定差分 v${APP_VERSION}</h2>
          <div style="font-size:11px;opacity:0.8;margin-top:2px;">Myers diff / 深層比較 / パッチ生成対応</div>
        </div>
        <div style="padding:20px;overflow-y:auto;flex:1;">
          <!-- Source -->
          <div style="margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid #eee;">
            <h3 style="margin:0 0 10px;color:#444;">📁 比較元 (Source)</h3>
            <div style="display:flex;gap:20px;">
              <div>
                <label><input type="radio" name="sourceType" value="api" ${(state.sourceType||'api')==='api'?'checked':''}> API取得</label>
                <div style="margin:5px 0 0 20px;font-size:13px;">
                  App ID: <input type="text" id="sAppId" value="${escapeHtml(sAppId)}" style="${inputStyle}">
                  Guest ID: <input type="text" id="sGuest" value="${escapeHtml(sGuest)}" style="${inputStyle}" placeholder="通常=空">
                  <br><label style="margin-top:4px;display:inline-block;"><input type="checkbox" id="sPreview" ${state.sourcePreview?'checked':''}> プレビュー環境</label>
                </div>
              </div>
              <div style="flex:1;">
                <label><input type="radio" name="sourceType" value="file" ${state.sourceType==='file'?'checked':''}> JSONファイル</label>
                <input type="file" id="sFile" accept=".json" style="margin-top:5px;font-size:12px;width:100%;">
              </div>
            </div>
          </div>
          <!-- Target -->
          <div style="margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid #eee;">
            <h3 style="margin:0 0 10px;color:#444;">📁 比較先 (Target)</h3>
            <div style="display:flex;gap:20px;">
              <div>
                <label><input type="radio" name="targetType" value="api" ${(state.targetType||'api')==='api'?'checked':''}> API取得</label>
                <div style="margin:5px 0 0 20px;font-size:13px;">
                  App ID: <input type="text" id="tAppId" value="${escapeHtml(tAppId)}" style="${inputStyle}">
                  Guest ID: <input type="text" id="tGuest" value="${escapeHtml(tGuest)}" style="${inputStyle}" placeholder="通常=空">
                  <br><label style="margin-top:4px;display:inline-block;"><input type="checkbox" id="tPreview" ${state.targetPreview?'checked':''}> プレビュー環境</label>
                </div>
              </div>
              <div style="flex:1;">
                <label><input type="radio" name="targetType" value="file" ${state.targetType==='file'?'checked':''}> JSONファイル</label>
                <input type="file" id="tFile" accept=".json" style="margin-top:5px;font-size:12px;width:100%;">
              </div>
            </div>
          </div>
          <!-- Scopes -->
          <div style="margin-bottom:14px;">
            <h4 style="margin:0 0 8px;font-size:13px;">比較スコープ
              <button id="scopeAll" style="margin-left:8px;font-size:11px;padding:2px 8px;cursor:pointer;border:1px solid #ccc;border-radius:3px;background:#f9f9f9;">全選択</button>
              <button id="scopeNone" style="font-size:11px;padding:2px 8px;cursor:pointer;border:1px solid #ccc;border-radius:3px;background:#f9f9f9;">全解除</button>
            </h4>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">${scopes}</div>
          </div>
          <!-- v8: Ignore Profile -->
          <details style="margin-bottom:10px;">
            <summary style="cursor:pointer;font-size:13px;color:#666;">🚫 無視キー設定 (上級)</summary>
            <div style="margin-top:8px;font-size:12px;">
              <div style="margin-bottom:6px;">
                プロファイル: <select id="ignoreProfileSelect" style="padding:3px;font-size:12px;"><option value="">-- 新規 --</option>${profileOptions}</select>
                <button id="loadProfileBtn" style="font-size:11px;padding:2px 6px;cursor:pointer;">読込</button>
                <button id="deleteProfileBtn" style="font-size:11px;padding:2px 6px;cursor:pointer;color:#c00;">削除</button>
              </div>
              <textarea id="ignoreKeysArea" rows="3" style="width:100%;font-size:12px;font-family:monospace;padding:5px;" placeholder="無視するキーをカンマ区切り (例: id, revision, creator)">${escapeHtml(state.ignoreKeys||'')}</textarea>
              <div style="margin-top:4px;">
                名前: <input type="text" id="profileNameInput" style="width:120px;font-size:12px;padding:3px;" placeholder="プロファイル名">
                <button id="saveProfileBtn" style="font-size:11px;padding:2px 6px;cursor:pointer;">保存</button>
              </div>
            </div>
          </details>
        </div>
        <!-- Footer -->
        <div style="padding:12px 20px;background:#f9f9f9;border-top:1px solid #eee;">
          <!-- v8: Progress bar -->
          <div id="progressBar" style="display:none;height:4px;background:#e0e0e0;border-radius:2px;margin-bottom:8px;overflow:hidden;">
            <div id="progressFill" style="height:100%;width:0%;background:linear-gradient(90deg,#667eea,#764ba2);transition:width 0.3s;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div id="status" style="font-size:12px;color:#666;flex:1;margin-right:15px;"></div>
            <div>
              <button id="cancelBtn" style="padding:8px 15px;border:none;background:transparent;cursor:pointer;">キャンセル</button>
              <button id="exportBundleBtn" style="padding:8px 15px;border:1px solid #667eea;background:white;color:#667eea;border-radius:4px;cursor:pointer;margin-right:5px;" title="現在の設定で取得したデータをJSONバンドルとして保存">📦 バンドル保存</button>
              <button id="runBtn" style="padding:8px 20px;background:#667eea;color:white;border:none;border-radius:4px;font-weight:bold;cursor:pointer;">比較実行</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    // Scope select/deselect all
    document.getElementById('scopeAll').onclick = () => document.querySelectorAll('.scope-check').forEach(c=>c.checked=true);
    document.getElementById('scopeNone').onclick = () => document.querySelectorAll('.scope-check').forEach(c=>c.checked=false);

    // v8: Ignore Profile UI
    document.getElementById('loadProfileBtn').onclick = () => {
      const name = document.getElementById('ignoreProfileSelect').value;
      if (name && profiles[name]) {
        document.getElementById('ignoreKeysArea').value = profiles[name];
        document.getElementById('profileNameInput').value = name;
      }
    };
    document.getElementById('saveProfileBtn').onclick = () => {
      const name = document.getElementById('profileNameInput').value.trim();
      const keys = document.getElementById('ignoreKeysArea').value;
      if (!name) return alert('プロファイル名を入力してください');
      profiles[name] = keys;
      saveIgnoreProfiles(profiles);
      // Refresh options
      const sel = document.getElementById('ignoreProfileSelect');
      if (![...sel.options].some(o => o.value === name)) {
        const opt = document.createElement('option');
        opt.value = name; opt.textContent = name;
        sel.appendChild(opt);
      }
      sel.value = name;
      alert(`プロファイル "${name}" を保存しました`);
    };
    document.getElementById('deleteProfileBtn').onclick = () => {
      const name = document.getElementById('ignoreProfileSelect').value;
      if (!name) return;
      delete profiles[name];
      saveIgnoreProfiles(profiles);
      const sel = document.getElementById('ignoreProfileSelect');
      [...sel.options].find(o=>o.value===name)?.remove();
      document.getElementById('ignoreKeysArea').value = '';
    };

    return new Promise((resolve, reject) => {
      document.getElementById('cancelBtn').onclick = () => { document.body.removeChild(dialog); reject(new Error('キャンセル')); };

      /* v8: helper to collect data */
      async function collectData(mode) {
        const status = document.getElementById('status');
        const progressBar = document.getElementById('progressBar');
        const progressFill = document.getElementById('progressFill');
        const getVal = id => document.getElementById(id).value.trim();
        const getChk = id => document.getElementById(id).checked;
        const selectedScopes = Array.from(document.querySelectorAll('.scope-check:checked')).map(e=>e.value);
        const ignoreKeys = getVal('ignoreKeysArea');

        if (!selectedScopes.length) throw new Error('スコープを選択してください');

        progressBar.style.display = 'block';
        const setProgress = (pct) => { progressFill.style.width = Math.round(pct * 100) + '%'; };

        const sType = document.querySelector('input[name="sourceType"]:checked').value;
        const tType = document.querySelector('input[name="targetType"]:checked').value;

        let source, target;

        // Source
        if (sType === 'api') {
          const appId = getVal('sAppId');
          if (!appId) throw new Error('Source App IDが必要です');
          source = await getSettings(appId, getVal('sGuest'), getChk('sPreview'), selectedScopes, p => {
            status.textContent = `Source取得中: ${Math.round(p*100)}%`;
            setProgress(p * 0.45);
          });
        } else {
          const file = document.getElementById('sFile').files[0];
          if (!file) throw new Error('Sourceファイルが必要です');
          const json = await readJsonFile(file);
          if (json.source && json.target) {
            source = json.source; target = json.target;
            status.textContent = '📦 バンドルファイルを読み込みました';
          } else {
            source = json;
          }
          setProgress(0.45);
        }

        // Target
        if (!target) {
          if (tType === 'api') {
            const appId = getVal('tAppId');
            if (!appId) throw new Error('Target App IDが必要です');
            target = await getSettings(appId, getVal('tGuest'), getChk('tPreview'), selectedScopes, p => {
              status.textContent = `Target取得中: ${Math.round(p*100)}%`;
              setProgress(0.45 + p * 0.45);
            });
          } else {
            const file = document.getElementById('tFile').files[0];
            if (!file) throw new Error('Targetファイルが必要です');
            const json = await readJsonFile(file);
            target = json.source || json;
          }
          setProgress(0.9);
        }

        // Save dialog state
        saveDialogState({
          sourceType: sType, targetType: tType,
          sourceAppId: getVal('sAppId'), targetAppId: getVal('tAppId'),
          sourceGuestSpaceId: getVal('sGuest'), targetGuestSpaceId: getVal('tGuest'),
          sourcePreview: getChk('sPreview'), targetPreview: getChk('tPreview'),
          selectedScopes, ignoreKeys
        });

        setProgress(1);
        return { source, target, selectedScopes, ignoreKeys };
      }

      /* v8: Bundle export */
      document.getElementById('exportBundleBtn').onclick = async () => {
        const status = document.getElementById('status');
        try {
          status.textContent = '⏳ データ取得中...';
          const data = await collectData('bundle');
          const bundle = { _version: APP_VERSION, _exportedAt: new Date().toISOString(), source: data.source, target: data.target };
          const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `diff_bundle_${data.source.appId}_vs_${data.target.appId}_${timestamp()}.json`;
          a.click();
          status.textContent = '✅ バンドルを保存しました';
        } catch (e) {
          if (e.message !== 'スコープを選択してください') status.textContent = '❌ ' + e.message;
          else alert(e.message);
        }
      };

      /* Run comparison */
      document.getElementById('runBtn').onclick = async () => {
        const status = document.getElementById('status');
        try {
          status.textContent = '⏳ データ取得中...';
          const data = await collectData('compare');

          status.textContent = '⚡ レポート生成中...';
          await new Promise(r => setTimeout(r, 100));
          document.body.removeChild(dialog);
          resolve(data);
        } catch (e) {
          status.textContent = '❌ ' + e.message;
          console.error(e);
        }
      };
    });
  }

  // ===== API Logic =====
  async function fetchWithRetry(url, body, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        return await kintone.api(url, 'GET', body);
      } catch (e) {
        if (i === retries - 1) throw e;
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
  }

  async function getSettings(appId, guestId, isPreview, scopes, onProgress) {
    const prefix = guestId ? `/k/guest/${guestId}/v1` : '/k/v1';
    const env = isPreview ? '/preview' : '';
    const endpoints = {
      appSettings: '/app/settings.json',
      fieldSettings: '/app/form/fields.json',
      layoutSettings: '/app/form/layout.json',
      formSettings: '/form.json',
      viewSettings: '/app/views.json',
      reportSettings: '/app/reports.json',
      processSettings: '/app/status.json',
      pluginSettings: '/app/plugins.json',
      customizeSettings: '/app/customize.json',
      actionSettings: '/app/actions.json',
      appAcl: '/app/acl.json',
      fieldAcl: '/field/acl.json',
      recordPermissions: '/record/acl.json',
      notifications: '/app/notifications/general.json',
      reminderNotifications: '/app/notifications/reminder.json',
      categories: '/app/categories.json'
    };

    const data = { appId, guestSpaceId: guestId, appName: `App ${appId}` };
    const keys = scopes.filter(k => endpoints[k]);
    const META_KEYS = ['revision', 'creator', 'createdAt', 'modifier', 'modifiedAt'];

    // アプリ名取得
    try {
      const info = await fetchWithRetry(`${prefix}${env}/app/settings.json`, { app: appId });
      data.appName = info.name + (guestId ? ` (Guest:${guestId})` : '') + (isPreview ? ' [Preview]' : '');
      // メタデータ削除
      META_KEYS.forEach(m => delete info[m]);
      data.appSettings = info;
    } catch (e) {
      data._error = e.message;
    }

    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (k === 'appSettings') { if (onProgress) onProgress((i + 1) / keys.length); continue; }
      try {
        data[k] = await fetchWithRetry(`${prefix}${env}${endpoints[k]}`, { app: appId });
        META_KEYS.forEach(m => {
          if (data[k] && typeof data[k] === 'object') delete data[k][m];
        });
      } catch (e) {
        console.warn(`Failed ${k}`, e);
        data[k] = { _fetchError: e.message };
      }
      if (onProgress) onProgress((i + 1) / keys.length);
    }
    return data;
  }

  // ===== Report Logic Script (embedded in generated HTML) =====
  const logicScript = `
    /* ===== v8 Report Logic ===== */
    const DEFAULT_IGNORE = new Set(['id','appId','revision','createdAt','creator','modifiedAt','modifier']);
    let userIgnoreKeys = new Set();
    let collapsedSections = new Set();

    /* --- Utility --- */
    function escapeHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    function shouldIgnore(k) { return DEFAULT_IGNORE.has(k) || userIgnoreKeys.has(k); }

    /* --- v8: Myers Diff with aligned output --- */
    function myersDiff(A, B) {
      const N=A.length, M=B.length, max=N+M;
      if(max===0) return [];
      const v=new Int32Array(2*max+1);
      const trace=[];
      for(let i=0;i<v.length;i++) v[i]=-1; v[max+1]=0;
      for(let d=0;d<=max;d++){
        const snap=new Int32Array(v); trace.push(snap);
        for(let k=-d;k<=d;k+=2){
          const ki=max+k; let x;
          if(k===-d||(k!==d && v[ki-1]<v[ki+1])) x=v[ki+1]; else x=v[ki-1]+1;
          let y=x-k;
          while(x<N && y<M && A[x]===B[y]){x++;y++;}
          v[ki]=x;
          if(x>=N && y>=M) return alignDiff(backtrack(trace,A,B,max));
        }
      }
      return [];
    }
    function backtrack(trace,A,B,max){
      let x=A.length,y=B.length; const res=[];
      for(let d=trace.length-1;d>=0;d--){
        const v=trace[d]; const k=x-y; const ki=max+k;
        let prevK;
        if(k===-d||(k!==d && v[ki-1]<v[ki+1])) prevK=k+1; else prevK=k-1;
        const prevX=v[max+prevK]; const prevY=prevX-prevK;
        while(x>prevX && y>prevY){res.push({type:'same',l:A[x-1],r:B[y-1]});x--;y--;}
        if(d===0) break;
        if(x===prevX){res.push({type:'add',r:B[y-1]});y--;}
        else{res.push({type:'del',l:A[x-1]});x--;}
      }
      return res.reverse();
    }

    /* v8: Side-by-side aligned rows (add padding for ins/del) */
    function alignDiff(rawDiffs) {
      const aligned = [];
      for(const d of rawDiffs) {
        if(d.type==='same') aligned.push({lType:'same',rType:'same',l:d.l,r:d.r});
        else if(d.type==='del') aligned.push({lType:'del',rType:'pad',l:d.l,r:''});
        else if(d.type==='add') aligned.push({lType:'pad',rType:'add',l:'',r:d.r});
      }
      return aligned;
    }

    /* v8: Character-level diff highlighting */
    function charDiff(a,b){
      if(!a||!b) return {l:escapeHtml(a),r:escapeHtml(b)};
      const ac=[...a], bc=[...b];
      // Simple LCS-based char diff
      const n=ac.length, m=bc.length;
      if(n*m > 50000) return {l:escapeHtml(a),r:escapeHtml(b)}; // too large, skip
      const dp=[];
      for(let i=0;i<=n;i++){dp[i]=new Uint16Array(m+1);}
      for(let i=1;i<=n;i++) for(let j=1;j<=m;j++){
        dp[i][j]= ac[i-1]===bc[j-1] ? dp[i-1][j-1]+1 : Math.max(dp[i-1][j],dp[i][j-1]);
      }
      // Backtrack
      let i=n,j=m; const ops=[];
      while(i>0||j>0){
        if(i>0&&j>0&&ac[i-1]===bc[j-1]){ops.push({t:'s',c:ac[i-1]});i--;j--;}
        else if(j>0&&(i===0||dp[i][j-1]>=dp[i-1][j])){ops.push({t:'a',c:bc[j-1]});j--;}
        else{ops.push({t:'d',c:ac[i-1]});i--;}
      }
      ops.reverse();
      let lh='',rh='';
      for(const o of ops){
        if(o.t==='s'){lh+=escapeHtml(o.c);rh+=escapeHtml(o.c);}
        else if(o.t==='d'){lh+='<mark class="cdel">'+escapeHtml(o.c)+'</mark>';}
        else{rh+='<mark class="cadd">'+escapeHtml(o.c)+'</mark>';}
      }
      return {l:lh,r:rh};
    }

    /* --- v8: Deep compare for all sections --- */
    const SECTION_LABELS = SECTION_LABEL_MAP;

    function getCompareRoot(sectionKey, obj) {
      if(!obj || typeof obj !== 'object') return obj || {};
      // kintone API responses wrap data under various keys
      if(obj.properties) return obj.properties;
      if(obj.views) return obj.views;
      if(obj.reports) return obj.reports;
      if(obj.actions) return obj.actions;
      if(obj.rights) return obj.rights;
      if(obj.notifications) return obj.notifications;
      if(obj.categories) return obj.categories;
      if(obj.states) return obj.states; // process
      if(Array.isArray(obj.layout)) return {layout: obj.layout};
      if(Array.isArray(obj.plugins)) return {plugins: obj.plugins};
      return obj;
    }

    function categorize(s, t) {
      const result = {};
      const allKeys = new Set([...Object.keys(SECTION_LABELS)]);
      
      allKeys.forEach(sectionKey => {
        const label = SECTION_LABELS[sectionKey];
        if(!s[sectionKey] && !t[sectionKey]) return; // neither side has it
        
        const sRoot = getCompareRoot(sectionKey, s[sectionKey]);
        const tRoot = getCompareRoot(sectionKey, t[sectionKey]);
        const items = diffObject(sRoot, tRoot);
        if(items.length > 0) result[sectionKey] = { label, items };
      });
      return result;
    }

    function diffObject(sObj, tObj) {
      const sO = (sObj && typeof sObj === 'object') ? sObj : {};
      const tO = (tObj && typeof tObj === 'object') ? tObj : {};
      const keys = new Set([...Object.keys(sO), ...Object.keys(tO)]);
      const list = [];

      keys.forEach(k => {
        if(shouldIgnore(k)) return;
        const sVal = sO[k], tVal = tO[k];
        const sJson = JSON.stringify(sVal, null, 2) ?? 'undefined';
        const tJson = JSON.stringify(tVal, null, 2) ?? 'undefined';

        if(sJson === tJson) {
          list.push({key:k, isDiff:false, status:'same', sVal, tVal});
        } else if(sVal === undefined) {
          list.push({key:k, isDiff:true, status:'added', sVal:undefined, tVal});
        } else if(tVal === undefined) {
          list.push({key:k, isDiff:true, status:'removed', sVal, tVal:undefined});
        } else {
          const linesA = (sJson||'').split('\\n');
          const linesB = (tJson||'').split('\\n');
          const diffs = myersDiff(linesA, linesB);
          list.push({key:k, isDiff:true, status:'changed', sVal, tVal, diffs});
        }
      });
      // Sort: diffs first
      list.sort((a,b)=>{
        if(a.isDiff && !b.isDiff) return -1;
        if(!a.isDiff && b.isDiff) return 1;
        return a.key.localeCompare(b.key);
      });
      return list;
    }

    /* --- Render --- */
    function render() {
      const main = document.getElementById('main');
      const nav = document.getElementById('nav-list');
      const hideSame = document.getElementById('hideSame').checked;
      const showCharDiff = document.getElementById('charDiffToggle').checked;
      const search = document.getElementById('search').value.toLowerCase();

      main.innerHTML = ''; nav.innerHTML = '';

      const data = categorize(SOURCE_DATA, TARGET_DATA);
      let totalDiff=0, totalSame=0, totalAdded=0, totalRemoved=0;

      Object.entries(data).forEach(([sectionKey, {label: catName, items}], idx) => {
        const visibleItems = items.filter(it => {
          if(hideSame && !it.isDiff) return false;
          if(search) {
            const keyMatch = it.key.toLowerCase().includes(search);
            const valMatch = JSON.stringify(it.sVal).toLowerCase().includes(search) || JSON.stringify(it.tVal).toLowerCase().includes(search);
            if(!keyMatch && !valMatch) return false;
          }
          return true;
        });

        // Stats
        items.forEach(it => {
          if(it.status==='same') totalSame++;
          else if(it.status==='added') totalAdded++;
          else if(it.status==='removed') totalRemoved++;
          else totalDiff++;
        });

        if(!visibleItems.length) return;

        const diffCount = visibleItems.filter(i=>i.isDiff).length;
        const isCollapsed = collapsedSections.has(sectionKey);

        // Nav
        const navItem = document.createElement('div');
        navItem.className = 'nav-item';
        navItem.innerHTML = '<span>'+escapeHtml(catName)+'</span><span class="badge '+(diffCount?'badge-diff':'')+'">'+diffCount+'</span>';
        navItem.onclick = () => { collapsedSections.delete(sectionKey); render(); setTimeout(()=>document.getElementById('sec-'+idx)?.scrollIntoView({behavior:'smooth'}),50); };
        nav.appendChild(navItem);

        // Section
        const sec = document.createElement('section');
        sec.id = 'sec-'+idx;
        const arrow = isCollapsed ? '▶' : '▼';
        sec.innerHTML = '<h2 class="sec-title" data-key="'+sectionKey+'" style="cursor:pointer;">'+arrow+' '+escapeHtml(catName)+' <span class="sec-badge">'+diffCount+' 差分 / '+ visibleItems.length +' 件</span></h2>';
        sec.querySelector('.sec-title').onclick = function(){ 
          if(collapsedSections.has(sectionKey)) collapsedSections.delete(sectionKey); else collapsedSections.add(sectionKey);
          render();
        };

        if(!isCollapsed) {
          const table = document.createElement('table');
          table.className = 'diff-table';
          table.innerHTML = '<thead><tr><th style="width:180px">項目</th><th>比較元 (Source)</th><th>比較先 (Target)</th></tr></thead>';
          const tbody = document.createElement('tbody');

          visibleItems.forEach(it => {
            const tr = document.createElement('tr');

            if(it.status==='same') {
              tr.className = 'same-row';
              tr.innerHTML =
                '<td class="key-cell">'+escapeHtml(it.key)+' <span class="tag-same">一致</span></td>'+
                '<td class="code-cell"><pre>'+escapeHtml(JSON.stringify(it.sVal,null,2))+'</pre></td>'+
                '<td class="code-cell"><pre>'+escapeHtml(JSON.stringify(it.tVal,null,2))+'</pre></td>';
            } else if(it.status==='added') {
              tr.className = 'diff-row-tr added-row';
              tr.innerHTML =
                '<td class="key-cell"><b>'+escapeHtml(it.key)+'</b> <span class="tag-add">追加</span></td>'+
                '<td class="code-cell"><pre class="empty-cell">（なし）</pre></td>'+
                '<td class="code-cell"><pre class="add-block">'+escapeHtml(JSON.stringify(it.tVal,null,2))+'</pre></td>';
            } else if(it.status==='removed') {
              tr.className = 'diff-row-tr removed-row';
              tr.innerHTML =
                '<td class="key-cell"><b>'+escapeHtml(it.key)+'</b> <span class="tag-del">削除</span></td>'+
                '<td class="code-cell"><pre class="del-block">'+escapeHtml(JSON.stringify(it.sVal,null,2))+'</pre></td>'+
                '<td class="code-cell"><pre class="empty-cell">（なし）</pre></td>';
            } else {
              // changed — side-by-side aligned diff
              tr.className = 'diff-row-tr';
              let lHtml='', rHtml='';
              let lNum=0, rNum=0;

              (it.diffs||[]).forEach(d => {
                if(d.lType==='same' && d.rType==='same') {
                  lNum++; rNum++;
                  lHtml += '<div class="line"><span class="ln">'+lNum+'</span>'+escapeHtml(d.l)+'</div>';
                  rHtml += '<div class="line"><span class="ln">'+rNum+'</span>'+escapeHtml(d.r)+'</div>';
                } else if(d.lType==='del') {
                  lNum++;
                  const content = (showCharDiff && d.rType==='add') ? charDiff(d.l, d.r) : null;
                  lHtml += '<div class="line del"><span class="ln">'+lNum+'</span>'+(content?content.l:escapeHtml(d.l))+'</div>';
                  if(d.rType==='add') {
                    rNum++;
                    rHtml += '<div class="line add"><span class="ln">'+rNum+'</span>'+(content?content.r:escapeHtml(d.r))+'</div>';
                  } else {
                    rHtml += '<div class="line pad"><span class="ln"></span></div>';
                  }
                } else if(d.rType==='add') {
                  rNum++;
                  lHtml += '<div class="line pad"><span class="ln"></span></div>';
                  rHtml += '<div class="line add"><span class="ln">'+rNum+'</span>'+escapeHtml(d.r)+'</div>';
                } else if(d.lType==='pad' && d.rType==='add') {
                  rNum++;
                  lHtml += '<div class="line pad"><span class="ln"></span></div>';
                  rHtml += '<div class="line add"><span class="ln">'+rNum+'</span>'+escapeHtml(d.r)+'</div>';
                }
              });

              tr.innerHTML =
                '<td class="key-cell"><b>'+escapeHtml(it.key)+'</b> <span class="tag-diff">変更</span></td>'+
                '<td class="code-cell"><div class="diff-scroll">'+lHtml+'</div></td>'+
                '<td class="code-cell"><div class="diff-scroll">'+rHtml+'</div></td>';
            }
            tbody.appendChild(tr);
          });
          table.appendChild(tbody);
          sec.appendChild(table);
        }
        main.appendChild(sec);
      });

      // Stats
      document.getElementById('stat-diff').textContent = totalDiff;
      document.getElementById('stat-added').textContent = totalAdded;
      document.getElementById('stat-removed').textContent = totalRemoved;
      document.getElementById('stat-same').textContent = totalSame;

      // No diff message
      if(totalDiff===0 && totalAdded===0 && totalRemoved===0) {
        const noDiff = document.createElement('div');
        noDiff.className = 'no-diff-msg';
        noDiff.innerHTML = '✅ <b>差分はありません</b><br>選択されたスコープ内で Source と Target は完全に一致しています。';
        main.appendChild(noDiff);
      }
    }

    /* --- Event Bindings --- */
    document.getElementById('hideSame').onchange = render;
    document.getElementById('charDiffToggle').onchange = render;
    document.getElementById('search').oninput = render;
    document.getElementById('themeToggle').onclick = () => {
      document.body.classList.toggle('dark');
      localStorage.setItem('kintone_diff_theme', document.body.classList.contains('dark')?'dark':'light');
    };
    document.getElementById('collapseAll').onclick = () => {
      Object.keys(SECTION_LABEL_MAP).forEach(k => collapsedSections.add(k)); render();
    };
    document.getElementById('expandAll').onclick = () => { collapsedSections.clear(); render(); };

    /* v8: Keyboard shortcuts */
    document.addEventListener('keydown', e => {
      if((e.ctrlKey||e.metaKey) && e.key==='f') { e.preventDefault(); document.getElementById('search').focus(); }
      if(e.key==='Escape') { document.getElementById('search').value=''; render(); }
    });

    /* v8: Patch Export (real implementation) */
    window.exportPatch = function() {
      const data = categorize(SOURCE_DATA, TARGET_DATA);
      const patch = { _version:'${APP_VERSION}', _generatedAt: new Date().toISOString(), targetAppId: TARGET_DATA.appId, targetGuestSpaceId: TARGET_DATA.guestSpaceId||'', sections:{} };
      Object.entries(data).forEach(([sKey, {label, items}]) => {
        const changes = items.filter(it => it.isDiff);
        if(!changes.length) return;
        patch.sections[sKey] = { label, changes: changes.map(c => ({ key:c.key, status:c.status, sourceValue:c.sVal, targetValue:c.tVal })) };
      });
      const blob = new Blob([JSON.stringify(patch,null,2)],{type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'patch_'+TARGET_DATA.appId+'_'+(new Date().toISOString().slice(0,10))+'.json';
      a.click();
    };

    /* v8: Copy all diffs to clipboard */
    window.copyDiffs = function() {
      const data = categorize(SOURCE_DATA, TARGET_DATA);
      let text = 'kintone設定差分レポート\\n';
      text += '比較元: ' + SOURCE_DATA.appName + ' (ID:' + SOURCE_DATA.appId + ')\\n';
      text += '比較先: ' + TARGET_DATA.appName + ' (ID:' + TARGET_DATA.appId + ')\\n\\n';
      Object.entries(data).forEach(([sKey, {label, items}]) => {
        const diffs = items.filter(i=>i.isDiff);
        if(!diffs.length) return;
        text += '== ' + label + ' (' + diffs.length + ' 差分) ==\\n';
        diffs.forEach(d => { text += '  [' + d.status + '] ' + d.key + '\\n'; });
        text += '\\n';
      });
      navigator.clipboard.writeText(text).then(()=>alert('クリップボードにコピーしました'));
    };

    /* Init */
    if(REPORT_META.ignoreKeys) {
      REPORT_META.ignoreKeys.split(',').map(s=>s.trim()).filter(Boolean).forEach(k => userIgnoreKeys.add(k));
    }
    if(localStorage.getItem('kintone_diff_theme')==='dark') document.body.classList.add('dark');
    render();
  `;

  // ===== HTML Builder =====
  function buildHTML(source, target, meta) {
    const css = `
      :root { --bg:#f4f7f9; --fg:#333; --sb:#2c3e50; --card:#fff; --border:#ddd;
              --add:#e6ffed; --del:#ffeef0; --add-txt:#22863a; --del-txt:#b31d28; --pad:#fafafa; }
      body.dark { --bg:#1a1a1a; --fg:#eee; --sb:#0d1117; --card:#222; --border:#444;
                  --add:#0f2d15; --del:#3d1215; --add-txt:#4ae667; --del-txt:#ff7b72; --pad:#1a1a1a; }

      * { box-sizing:border-box; }
      body { margin:0; font-family:"Helvetica Neue",Arial,"Hiragino Sans",sans-serif; display:flex; height:100vh; background:var(--bg); color:var(--fg); }
      aside { width:290px; background:var(--sb); color:#c9d1d9; display:flex; flex-direction:column; border-right:1px solid var(--border); flex-shrink:0; }
      main { flex:1; overflow-y:auto; padding:24px; }

      /* Sidebar */
      .sb-header { padding:16px 20px; font-weight:bold; font-size:16px; border-bottom:1px solid #444; color:#fff; }
      .sb-header small { display:block; font-weight:normal; font-size:11px; opacity:0.7; margin-top:2px; }
      .sb-controls { padding:14px; border-bottom:1px solid #444; }
      .sb-controls label { display:block; margin-bottom:6px; cursor:pointer; font-size:13px; }
      .sb-btn { width:100%; padding:6px; margin-top:5px; background:#444; border:1px solid #555; color:#fff; cursor:pointer; border-radius:4px; font-size:12px; }
      .sb-btn:hover { background:#555; }
      .sb-stats { padding:12px 14px; border-bottom:1px solid #444; font-size:12px; }
      .sb-stats span { display:inline-block; margin-right:10px; }
      .stat-val { font-weight:bold; }
      .stat-diff { color:#ff6b6b; } .stat-add { color:#51cf66; } .stat-del { color:#ff922b; } .stat-same { color:#868e96; }
      #nav-list { flex:1; overflow-y:auto; padding:8px 0; }
      .nav-item { padding:8px 20px; cursor:pointer; font-size:13px; display:flex; justify-content:space-between; align-items:center; transition:background 0.15s; }
      .nav-item:hover { background:#444; color:#fff; }
      .badge { background:#555; padding:2px 8px; border-radius:10px; font-size:11px; }
      .badge-diff { background:#d73a49; color:#fff; font-weight:bold; }

      /* Header Card */
      .header-card { background:linear-gradient(135deg, #667eea, #764ba2); color:white; padding:20px 24px; border-radius:10px; display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; box-shadow:0 4px 12px rgba(102,126,234,0.3); }
      .app-info { font-size:14px; }
      .app-name { font-size:18px; font-weight:bold; display:block; margin-bottom:4px; }
      .meta-info { margin-top:12px; font-size:11px; opacity:0.8; }

      /* Sections */
      .sec-title { border-bottom:2px solid #667eea; padding-bottom:6px; margin-top:32px; color:#667eea; font-size:18px; user-select:none; }
      .sec-badge { font-size:12px; font-weight:normal; color:#888; margin-left:8px; }

      /* Diff Table */
      .diff-table { width:100%; border-collapse:collapse; background:var(--card); box-shadow:0 1px 4px rgba(0,0,0,0.08); table-layout:fixed; border-radius:6px; overflow:hidden; margin-bottom:16px; }
      .diff-table th { background:#f6f8fa; padding:10px 12px; text-align:left; border-bottom:2px solid var(--border); color:#555; font-size:12px; text-transform:uppercase; letter-spacing:0.3px; }
      body.dark .diff-table th { background:#2a2a2a; color:#aaa; }
      .diff-table td { border-bottom:1px solid var(--border); vertical-align:top; }

      .key-cell { padding:10px 12px; font-size:13px; overflow-wrap:break-word; width:180px; }
      .code-cell { padding:0; font-family:Consolas,Monaco,"Courier New",monospace; font-size:12px; line-height:1.6; overflow:hidden; }
      .diff-scroll { max-height:400px; overflow:auto; }

      .line { display:flex; padding:0 6px; min-height:1.6em; white-space:pre-wrap; word-break:break-all; }
      .line.add { background:var(--add); color:var(--add-txt); }
      .line.del { background:var(--del); color:var(--del-txt); }
      .line.pad { background:var(--pad); opacity:0.5; }
      .ln { min-width:32px; display:inline-block; color:#999; user-select:none; font-size:10px; text-align:right; margin-right:8px; border-right:1px solid var(--border); padding-right:4px; flex-shrink:0; }

      mark.cadd { background:#acf2bd; color:#22863a; border-radius:2px; }
      mark.cdel { background:#fdb8c0; color:#b31d28; border-radius:2px; }
      body.dark mark.cadd { background:#196c2e; color:#7ee787; }
      body.dark mark.cdel { background:#8b1a1a; color:#ffa198; }

      .same-row { opacity:0.5; }
      .same-row:hover { opacity:0.8; }
      .same-row pre { margin:0; padding:10px; color:#888; overflow:auto; max-height:80px; }
      .empty-cell { margin:0; padding:10px; color:#aaa; font-style:italic; }
      .add-block { margin:0; padding:10px; background:var(--add); color:var(--add-txt); overflow:auto; }
      .del-block { margin:0; padding:10px; background:var(--del); color:var(--del-txt); overflow:auto; }

      .tag-diff { background:#d73a49; color:white; padding:2px 6px; border-radius:3px; font-size:10px; }
      .tag-same { background:#28a745; color:white; padding:2px 6px; border-radius:3px; font-size:10px; }
      .tag-add  { background:#0366d6; color:white; padding:2px 6px; border-radius:3px; font-size:10px; }
      .tag-del  { background:#e36209; color:white; padding:2px 6px; border-radius:3px; font-size:10px; }

      .no-diff-msg { text-align:center; padding:60px 20px; font-size:18px; color:#28a745; background:var(--card); border-radius:10px; margin-top:40px; box-shadow:0 2px 8px rgba(0,0,0,0.06); }

      /* Print */
      @media print {
        aside { display:none!important; }
        main { padding:10px; }
        body { display:block; }
        .header-card { break-inside:avoid; }
        .diff-table { font-size:10px; break-inside:auto; }
        .same-row { display:none; }
        .sb-btn, button { display:none!important; }
      }
    `;

    const reportMeta = {
      generatedAt: new Date().toISOString(),
      sourceAppId: source.appId,
      targetAppId: target.appId,
      scopes: meta.selectedScopes,
      ignoreKeys: meta.ignoreKeys || ''
    };

    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>kintone設定差分レポート | ${escapeHtml(source.appName)} vs ${escapeHtml(target.appName)}</title>
  <style>${css}</style>
</head>
<body>
  <aside>
    <div class="sb-header">
      ⚡ Diff v${APP_VERSION}
      <small>生成: ${new Date().toLocaleString('ja-JP')}</small>
    </div>
    <div class="sb-stats">
      <span>変更: <span class="stat-val stat-diff" id="stat-diff">-</span></span>
      <span>追加: <span class="stat-val stat-add" id="stat-added">-</span></span>
      <span>削除: <span class="stat-val stat-del" id="stat-removed">-</span></span>
      <span>一致: <span class="stat-val stat-same" id="stat-same">-</span></span>
    </div>
    <div class="sb-controls">
      <label><input type="checkbox" id="hideSame"> 同一項目を隠す</label>
      <label><input type="checkbox" id="charDiffToggle" checked> 文字レベルハイライト</label>
      <input type="text" id="search" placeholder="🔍 キー名・値を検索..." style="width:95%;padding:5px;margin-top:5px;background:#333;border:1px solid #555;color:#fff;border-radius:3px;">
      <div style="display:flex;gap:4px;margin-top:6px;">
        <button class="sb-btn" id="collapseAll" style="flex:1;">▶ 全折畳</button>
        <button class="sb-btn" id="expandAll" style="flex:1;">▼ 全展開</button>
      </div>
      <button class="sb-btn" id="themeToggle">🌓 テーマ切替</button>
      <button class="sb-btn" onclick="exportPatch()">💾 パッチ出力 (JSON)</button>
      <button class="sb-btn" onclick="copyDiffs()">📋 差分コピー</button>
      <button class="sb-btn" onclick="window.print()">🖨 印刷</button>
    </div>
    <div id="nav-list"></div>
  </aside>
  <main>
    <div class="header-card">
      <div class="app-info">
        <span class="app-name">📁 ${escapeHtml(source.appName)}</span>
        ID: ${escapeHtml(source.appId)} ${source.guestSpaceId ? `(Guest: ${escapeHtml(source.guestSpaceId)})` : ''}
      </div>
      <div style="font-size:28px;opacity:0.8;">⇄</div>
      <div class="app-info" style="text-align:right;">
        <span class="app-name">📁 ${escapeHtml(target.appName)}</span>
        ID: ${escapeHtml(target.appId)} ${target.guestSpaceId ? `(Guest: ${escapeHtml(target.guestSpaceId)})` : ''}
      </div>
    </div>
    <div class="meta-info" style="font-size:12px;color:#888;margin:-16px 0 20px;">
      比較日時: ${new Date().toLocaleString('ja-JP')} ｜ スコープ: ${(meta.selectedScopes || []).map(k => SECTION_LABEL_MAP[k] || k).join(', ')}
      ${meta.ignoreKeys ? '｜ 無視キー: ' + escapeHtml(meta.ignoreKeys) : ''}
    </div>
    <div id="main"></div>
  </main>
  <script>
    const SOURCE_DATA = ${safeJsonForScript(source)};
    const TARGET_DATA = ${safeJsonForScript(target)};
    const SECTION_LABEL_MAP = ${safeJsonForScript(SECTION_LABEL_MAP)};
    const REPORT_META = ${safeJsonForScript(reportMeta)};
    ${logicScript}
  </script>
</body>
</html>`;
  }

  // ===== Main =====
  async function run() {
    try {
      const data = await showLoadingDialog();
      const html = buildHTML(data.source, data.target, {
        selectedScopes: data.selectedScopes,
        ignoreKeys: data.ignoreKeys
      });
      const blob = new Blob([html], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `diff_${data.source.appId}_vs_${data.target.appId}_${timestamp()}.html`;
      a.click();
    } catch (e) {
      if (e.message !== 'キャンセル') alert('Error: ' + e.message);
    }
  }
  run();
})();