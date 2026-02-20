(() => {
  'use strict';

  // ========================================
  // ユーティリティ関数
  // ========================================
  
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  
  const chunk = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) {
      out.push(arr.slice(i, i + size));
    }
    return out;
  };

  // ========================================
  // 一覧情報取得
  // ========================================
  
  async function getViews(app) {
    const url = kintone.api.url('/k/v1/app/views.json', true);
    const resp = await kintone.api(url, 'GET', { app });
    
    // オブジェクトを配列に変換し、indexでソート
    const views = Object.entries(resp.views)
      .map(([name, view]) => ({
        name,
        ...view
      }))
      .filter(v => v.type === 'LIST') // リスト形式の一覧のみ
      .sort((a, b) => Number(a.index) - Number(b.index));
    
    return views;
  }

  // ========================================
  // 一覧条件に一致するレコードID取得
  // ========================================
  
  async function getRecordIdsByView(app, query, limit = null) {
    const url = kintone.api.url('/k/v1/records.json', true);
    const ids = [];
    let offset = 0;
    const batchSize = 500;

    while (true) {
      // クエリ構築（ソートとリミット/オフセットを追加）
      let q = query ? `${query} ` : '';
      q += `order by $id asc limit ${batchSize} offset ${offset}`;

      const resp = await kintone.api(url, 'GET', {
        app,
        query: q,
        fields: ['$id']
      });

      const records = resp.records;
      if (records.length === 0) break;

      for (const rec of records) {
        ids.push(Number(rec.$id.value));
        
        // limit指定がある場合はそこで打ち切り
        if (limit && ids.length >= limit) {
          return ids.slice(0, limit);
        }
      }

      offset += batchSize;

      // 500件未満なら終了
      if (records.length < batchSize) break;
      
      // レート制限対策
      await sleep(100);
    }

    return ids;
  }

  // ========================================
  // ステータス一括更新処理
  // ========================================
  
  async function updateStatusesBatch({
    app,
    action,
    assignee,
    ids,
    stopOnError = false,
    intervalMs = 150,
    onProgress = null
  }) {
    const url = kintone.api.url('/k/v1/records/status.json', true);
    const batches = chunk(ids, 100);
    const result = { ok: [], ng: [] };

    for (let i = 0; i < batches.length; i++) {
      const batchIds = batches[i];
      const body = {
        app,
        records: batchIds.map((id) => {
          const r = { id, action };
          if (assignee) r.assignee = assignee;
          return r;
        })
      };

      try {
        await kintone.api(url, 'PUT', body);
        result.ok.push(...batchIds);
        
        const progress = {
          current: i + 1,
          total: batches.length,
          batchSize: batchIds.length,
          succeeded: result.ok.length,
          failed: result.ng.length
        };
        
        console.log(
          `[KTProcByView] ${progress.current}/${progress.total} バッチ完了 ` +
          `(${batchIds.length}件) - 成功: ${progress.succeeded}件`
        );
        
        if (onProgress) onProgress(progress);
        
      } catch (e) {
        result.ng.push({
          batchIndex: i,
          ids: batchIds,
          error: e,
          message: e.message || String(e)
        });
        
        console.error(
          `[KTProcByView] ${i + 1}/${batches.length} バッチ失敗 ` +
          `(${batchIds.length}件)`,
          e
        );
        
        if (stopOnError) break;
      }

      if (intervalMs && i < batches.length - 1) {
        await sleep(intervalMs);
      }
    }

    return result;
  }

  // ========================================
  // スタイル追加
  // ========================================
  
  function addStyles() {
    if (document.getElementById('kt-proc-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'kt-proc-styles';
    style.textContent = `
      @keyframes ktFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes ktSlideIn {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .kt-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: ktFadeIn 0.2s ease;
      }
      .kt-dialog {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        width: 520px;
        max-width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        animation: ktSlideIn 0.3s ease;
      }
      .kt-form-group {
        margin-bottom: 20px;
      }
      .kt-form-label {
        display: block;
        margin-bottom: 6px;
        font-weight: 600;
        color: #333;
        font-size: 14px;
      }
      .kt-form-input,
      .kt-form-select {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        box-sizing: border-box;
        transition: border-color 0.2s;
      }
      .kt-form-input:focus,
      .kt-form-select:focus {
        outline: none;
        border-color: #3498db;
        box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
      }
      .kt-form-checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
      }
      .kt-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      .kt-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .kt-btn-primary {
        background: #3498db;
        color: white;
      }
      .kt-btn-primary:hover:not(:disabled) {
        background: #2980b9;
      }
      .kt-btn-success {
        background: #27ae60;
        color: white;
      }
      .kt-btn-success:hover:not(:disabled) {
        background: #229954;
      }
      .kt-btn-secondary {
        background: #95a5a6;
        color: white;
      }
      .kt-btn-secondary:hover:not(:disabled) {
        background: #7f8c8d;
      }
      .kt-info-box {
        background: #e8f4f8;
        border-left: 4px solid #3498db;
        padding: 12px;
        border-radius: 4px;
        margin-bottom: 20px;
      }
      .kt-warning-box {
        background: #fff3cd;
        border-left: 4px solid #ffc107;
        padding: 12px;
        border-radius: 4px;
        margin-bottom: 20px;
      }
      .kt-help-text {
        font-size: 12px;
        color: #666;
        margin-top: 4px;
      }
      .kt-record-count {
        font-size: 13px;
        color: #666;
        margin-top: 8px;
        padding: 8px 12px;
        background: #f8f9fa;
        border-radius: 4px;
      }
      .kt-record-count.loading {
        color: #999;
      }
      .kt-record-count.error {
        color: #e74c3c;
        background: #fdf2f2;
      }
    `;
    document.head.appendChild(style);
  }

  // ========================================
  // 実行UI（モーダルダイアログ）
  // ========================================
  
  async function createExecutionDialog() {
    addStyles();
    
    const app = kintone.app.getId();
    if (!app) {
      alert('アプリIDを取得できません');
      return;
    }

    // 一覧情報を取得
    let views = [];
    try {
      views = await getViews(app);
    } catch (e) {
      console.error('[KTProcByView] 一覧取得エラー:', e);
      alert(`一覧情報の取得に失敗しました:\n${e.message || String(e)}`);
      return;
    }

    if (views.length === 0) {
      alert('利用可能な一覧がありません');
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'kt-proc-overlay';
    overlay.className = 'kt-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'kt-dialog';

    // 現在表示中の一覧名を取得
    const currentViewName = new URLSearchParams(location.hash.slice(1)).get('view') || '';

    dialog.innerHTML = `
      <div style="padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #333;">ステータス一括更新</h2>
          <button id="kt-close-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999; line-height: 1;">×</button>
        </div>

        <form id="kt-exec-form">
          <div class="kt-form-group">
            <label class="kt-form-label">
              対象一覧 <span style="color: #e74c3c;">*</span>
            </label>
            <select id="kt-view-select" class="kt-form-select" required>
              <option value="">-- 一覧を選択 --</option>
              ${views.map(v => `
                <option value="${v.id}" 
                        data-query="${encodeURIComponent(v.filterCond || '')}"
                        ${v.name === currentViewName ? 'selected' : ''}>
                  ${v.name}
                </option>
              `).join('')}
            </select>
            <div id="kt-record-count" class="kt-record-count" style="display: none;"></div>
          </div>

          <div class="kt-form-group">
            <label class="kt-form-label">
              アクション名 <span style="color: #e74c3c;">*</span>
            </label>
            <input 
              type="text" 
              id="kt-action" 
              class="kt-form-input"
              placeholder="例: 承認, 却下, 差し戻し"
              required
            />
            <div class="kt-help-text">プロセス管理で設定したアクション名を入力</div>
          </div>

          <div class="kt-form-group">
            <label class="kt-form-label">処理者（オプション）</label>
            <input 
              type="text" 
              id="kt-assignee" 
              class="kt-form-input"
              placeholder="例: user@example.com"
            />
            <div class="kt-help-text">次の処理者を指定する場合はログイン名を入力</div>
          </div>

          <div class="kt-form-group">
            <label class="kt-form-label">オプション</label>
            
            <label class="kt-form-checkbox">
              <input type="checkbox" id="kt-stop-on-error">
              <span>エラー時に処理を停止する</span>
            </label>
          </div>

          <div class="kt-form-group">
            <label class="kt-form-label">待機時間（ミリ秒）</label>
            <input 
              type="number" 
              id="kt-interval" 
              class="kt-form-input"
              value="150"
              min="0"
              max="5000"
              step="50"
            />
            <div class="kt-help-text">バッチ間の待機時間（API制限対策）</div>
          </div>

          <div style="display: flex; gap: 10px; margin-top: 24px;">
            <button 
              type="button" 
              id="kt-test-btn" 
              class="kt-btn kt-btn-primary"
              style="flex: 1;"
            >
              🧪 テスト実行
            </button>
            <button 
              type="submit" 
              class="kt-btn kt-btn-success"
              style="flex: 1;"
            >
              ▶️ 本実行
            </button>
            <button 
              type="button" 
              id="kt-cancel-btn" 
              class="kt-btn kt-btn-secondary"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // 要素参照
    const viewSelect = document.getElementById('kt-view-select');
    const recordCountDiv = document.getElementById('kt-record-count');

    // 一覧選択時にレコード件数を取得
    let currentQuery = '';
    let currentRecordCount = 0;
    let countAbortController = null;

    const updateRecordCount = async () => {
      const selected = viewSelect.options[viewSelect.selectedIndex];
      if (!selected || !selected.value) {
        recordCountDiv.style.display = 'none';
        currentQuery = '';
        currentRecordCount = 0;
        return;
      }

      currentQuery = decodeURIComponent(selected.dataset.query || '');
      
      // 前回のリクエストをキャンセル
      if (countAbortController) {
        countAbortController.abort();
      }
      countAbortController = new AbortController();

      recordCountDiv.style.display = 'block';
      recordCountDiv.className = 'kt-record-count loading';
      recordCountDiv.textContent = '件数を取得中...';

      try {
        const ids = await getRecordIdsByView(app, currentQuery);
        currentRecordCount = ids.length;
        recordCountDiv.className = 'kt-record-count';
        recordCountDiv.innerHTML = `対象レコード: <strong>${currentRecordCount.toLocaleString()}件</strong>`;
      } catch (e) {
        if (e.name === 'AbortError') return;
        console.error('[KTProcByView] 件数取得エラー:', e);
        recordCountDiv.className = 'kt-record-count error';
        recordCountDiv.textContent = `件数取得エラー: ${e.message || String(e)}`;
        currentRecordCount = 0;
      }
    };

    viewSelect.addEventListener('change', updateRecordCount);

    // 初期選択があれば件数取得
    if (viewSelect.value) {
      updateRecordCount();
    }

    // フォーム値を取得
    const getFormValues = () => ({
      viewId: viewSelect.value,
      viewName: viewSelect.options[viewSelect.selectedIndex]?.text || '',
      query: currentQuery,
      action: document.getElementById('kt-action').value.trim(),
      assignee: document.getElementById('kt-assignee').value.trim() || null,
      stopOnError: document.getElementById('kt-stop-on-error').checked,
      intervalMs: parseInt(document.getElementById('kt-interval').value, 10)
    });

    // バリデーション
    const validate = () => {
      const v = getFormValues();
      if (!v.viewId) {
        alert('一覧を選択してください');
        return false;
      }
      if (!v.action) {
        alert('アクション名を入力してください');
        return false;
      }
      if (currentRecordCount === 0) {
        alert('対象レコードが0件です');
        return false;
      }
      return true;
    };

    // 閉じる
    const closeDialog = () => overlay.remove();
    
    document.getElementById('kt-close-btn').onclick = closeDialog;
    document.getElementById('kt-cancel-btn').onclick = closeDialog;

    // テスト実行
    document.getElementById('kt-test-btn').onclick = async () => {
      if (!validate()) return;
      const values = getFormValues();

      alert(
        `【テスト実行】\n\n` +
        `一覧: ${values.viewName}\n` +
        `対象レコード: ${currentRecordCount.toLocaleString()}件\n` +
        `アクション: ${values.action}\n` +
        `${values.assignee ? `処理者: ${values.assignee}\n` : ''}\n` +
        `※実際の更新は行われません`
      );
    };

    // 本実行
    document.getElementById('kt-exec-form').onsubmit = async (e) => {
      e.preventDefault();
      if (!validate()) return;

      const values = getFormValues();

      const confirmMsg = 
        `以下の内容で実行します:\n\n` +
        `一覧: ${values.viewName}\n` +
        `対象レコード: ${currentRecordCount.toLocaleString()}件\n` +
        `アクション: ${values.action}\n` +
        `${values.assignee ? `処理者: ${values.assignee}\n` : ''}\n` +
        `よろしいですか？`;

      if (!confirm(confirmMsg)) return;

      closeDialog();

      try {
        const result = await KTProcByView.run({
          query: values.query,
          action: values.action,
          assignee: values.assignee,
          stopOnError: values.stopOnError,
          intervalMs: values.intervalMs,
          confirm: false
        });

        if (result.completed) {
          if (confirm('更新が完了しました。一覧を再読み込みしますか？')) {
            location.reload();
          }
        }
      } catch (e) {
        console.error(e);
        alert(`エラーが発生しました:\n${e.message || String(e)}`);
      }
    };

    // Escキーで閉じる
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        closeDialog();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);

    // オーバーレイクリックで閉じる
    overlay.onclick = (e) => {
      if (e.target === overlay) closeDialog();
    };
  }

  // ========================================
  // プログレスダイアログ
  // ========================================
  
  function createProgressDialog(totalRecords) {
    addStyles();
    
    const overlay = document.createElement('div');
    overlay.className = 'kt-overlay';
    overlay.style.zIndex = '10001';

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      min-width: 400px;
      max-width: 500px;
    `;

    dialog.innerHTML = `
      <h3 style="margin: 0 0 20px 0; color: #333;">ステータス更新中...</h3>
      <div id="kt-progress-text" style="margin-bottom: 15px; color: #666;">
        準備中...
      </div>
      <div style="width: 100%; height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden;">
        <div id="kt-progress-fill" style="height: 100%; background: linear-gradient(90deg, #4CAF50, #45a049); width: 0%; transition: width 0.3s ease;"></div>
      </div>
      <div style="margin-top: 10px; font-size: 12px; color: #999;">
        対象: ${totalRecords.toLocaleString()}件
      </div>
    `;

    overlay.appendChild(dialog);

    return {
      element: overlay,
      update: ({ current, total, succeeded, failed }) => {
        const percent = Math.round((current / total) * 100);
        document.getElementById('kt-progress-fill').style.width = `${percent}%`;
        document.getElementById('kt-progress-text').textContent = 
          `${current}/${total} バッチ処理中... (成功: ${succeeded}件${failed > 0 ? `, 失敗: ${failed}件` : ''})`;
      },
      close: () => overlay.remove()
    };
  }

  // ========================================
  // 結果表示
  // ========================================
  
  function showResultDialog(result) {
    const { ok, ng } = result;
    const failedCount = ng.reduce((sum, n) => sum + n.ids.length, 0);
    
    const isSuccess = ng.length === 0;
    const message = isSuccess
      ? `✅ ${ok.length.toLocaleString()}件のレコードを正常に更新しました`
      : `⚠️ ${ok.length.toLocaleString()}件成功、${failedCount.toLocaleString()}件失敗しました`;

    const details = ng.length > 0
      ? '\n\n【失敗詳細】\n' + 
        ng.slice(0, 5).map((n, i) => 
          `バッチ${n.batchIndex + 1}: ${n.ids.length}件 - ${n.message}`
        ).join('\n') +
        (ng.length > 5 ? `\n... 他 ${ng.length - 5}バッチ` : '')
      : '';

    alert(message + details);
  }

  // ========================================
  // メインAPI
  // ========================================
  
  window.KTProcByView = {
    // 一覧情報を取得
    async getViews() {
      const app = kintone.app.getId();
      const views = await getViews(app);
      console.log('[KTProcByView] 一覧一覧:', views);
      return views;
    },

    // 一覧条件に一致するレコードIDを取得
    async getRecordIds(query = '') {
      const app = kintone.app.getId();
      const ids = await getRecordIdsByView(app, query);
      console.log('[KTProcByView] 対象レコード:', ids.length, '件');
      return ids;
    },

    // メイン実行
    async run(options = {}) {
      const {
        query = '',
        action,
        assignee = null,
        stopOnError = false,
        intervalMs = 150,
        confirm: needConfirm = true,
        showProgress = true,
        showResult = true
      } = options;

      if (!action) {
        throw new Error(
          'action パラメータは必須です\n' +
          '例: KTProcByView.run({ action: "承認", query: "ステータス in (\\"未処理\\")" })'
        );
      }

      const app = kintone.app.getId();
      if (!app) {
        throw new Error('アプリIDを取得できません（一覧画面で実行してください）');
      }

      // 対象レコード取得
      console.log('[KTProcByView] レコード取得中...');
      const ids = await getRecordIdsByView(app, query);

      if (!ids.length) {
        throw new Error('条件に一致するレコードがありません');
      }

      if (needConfirm) {
        const msg = 
          `${ids.length.toLocaleString()}件のレコードに対して\n` +
          `アクション「${action}」を実行します\n` +
          `${assignee ? `処理者: ${assignee}\n` : ''}\n` +
          `よろしいですか？`;
        
        if (!window.confirm(msg)) {
          console.log('[KTProcByView] ユーザーによりキャンセルされました');
          return { cancelled: true };
        }
      }

      console.log(
        `[KTProcByView] 実行開始\n` +
        `アプリ: ${app}\n` +
        `アクション: ${action}\n` +
        `${assignee ? `処理者: ${assignee}\n` : ''}` +
        `対象: ${ids.length}件`
      );

      let progressDialog = null;
      if (showProgress) {
        progressDialog = createProgressDialog(ids.length);
        document.body.appendChild(progressDialog.element);
      }

      try {
        const res = await updateStatusesBatch({
          app,
          action,
          assignee,
          ids,
          stopOnError,
          intervalMs,
          onProgress: progressDialog 
            ? (p) => progressDialog.update({
                ...p,
                failed: p.failed
              })
            : null
        });

        const failedCount = res.ng.reduce((sum, n) => sum + n.ids.length, 0);
        console.log(
          `[KTProcByView] 実行完了\n` +
          `成功: ${res.ok.length}件\n` +
          `失敗: ${failedCount}件`
        );

        if (showResult) {
          showResultDialog(res);
        }

        return { app, ids, result: res, completed: true };

      } catch (e) {
        console.error('[KTProcByView] 予期しないエラー:', e);
        alert(`エラーが発生しました:\n${e.message || String(e)}`);
        throw e;

      } finally {
        if (progressDialog) {
          setTimeout(() => progressDialog.close(), 500);
        }
      }
    },

    // UIを表示
    showUI() {
      const existing = document.getElementById('kt-proc-overlay');
      if (existing) existing.remove();
      
      createExecutionDialog();
    }
  };

  // ========================================
  // kintone一覧画面にボタンを追加
  // ========================================
  
  kintone.events.on('app.record.index.show', (event) => {
    if (document.getElementById('kt-batch-update-btn')) return event;

    const headerSpace = kintone.app.getHeaderMenuSpaceElement();
    if (!headerSpace) return event;

    const btn = document.createElement('button');
    btn.id = 'kt-batch-update-btn';
    btn.textContent = '📝 ステータス一括更新';
    btn.style.cssText = `
      padding: 8px 16px;
      background: #3498db;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      margin-left: 10px;
    `;
    
    btn.onmouseover = () => {
      btn.style.background = '#2980b9';
    };
    
    btn.onmouseout = () => {
      btn.style.background = '#3498db';
    };

    btn.onclick = () => KTProcByView.showUI();

    headerSpace.appendChild(btn);

    return event;
  });
KTProcByView.showUI()
  // ========================================
  // 初期化完了
  // ========================================
  
  console.log(
    '%c[KTProcByView] 準備完了',
    'color: green; font-weight: bold;',
    '\n\n使い方:\n' +
    '  KTProcByView.showUI()  // 実行画面を表示\n' +
    '  KTProcByView.getViews()  // 一覧情報を取得\n' +
    '  KTProcByView.run({ action: "承認", query: "..." })  // 直接実行'
  );

})();