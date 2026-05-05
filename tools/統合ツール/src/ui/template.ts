'use strict';

import cssText from './styles.css';
import {
  TOOL_ID, TOOL_VERSION, SECTION_DEFS, SETTINGS_EXPORT_SCOPE_DEFS,
  FEATURE_DEFS, DEFAULT_SUBTAB_STATE,
  DIALOG_DEFAULT_WIDTH, DIALOG_DEFAULT_HEIGHT,
  DIALOG_MIN_WIDTH, DIALOG_MIN_HEIGHT, DIALOG_MARGIN,
  DEFAULT_APP_ID
} from '../constants.js';
import { esc } from '../utils.js';
import { getToolDocument } from './dialog.js';

export function buildRoot(targetDocument = document, options: any = {}) {
  const doc = targetDocument || document;
  const root = doc.createElement('div');
  root.id = TOOL_ID;
  root.className = options.popout
    ? 'screen-launcher launcher-tabbed launcher-show-advanced suite-popout-tab tab-is-diff-or-reflect tab-needs-app-inputs tab-needs-target tab-needs-connection-actions'
    : 'screen-launcher launcher-tabbed launcher-show-advanced tab-is-diff-or-reflect tab-needs-app-inputs tab-needs-target tab-needs-connection-actions';
  const getRiskLabel = (riskLevel) => riskLevel === 'warning' ? '要注意' : '比較的安全';
  const launcherFeatures = [...FEATURE_DEFS].sort((a, b) => {
    const aOrder = Number.isFinite(a.usageOrder) ? a.usageOrder : 999;
    const bOrder = Number.isFinite(b.usageOrder) ? b.usageOrder : 999;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return String(a.label || '').localeCompare(String(b.label || ''));
  });
  const primaryFeatureKeys = new Set(
    launcherFeatures
      .filter((feature) => Number.isFinite(feature.usageOrder) && feature.usageOrder <= 5)
      .map((feature) => feature.key)
  );
  const launcherGroupDefs = [
    { key: 'change', label: '変更・反映', desc: '差分確認からプレビュー反映まで' },
    { key: 'vis', label: '可視化・出力', desc: '設計書、図、分析、設定保存' },
    { key: 'data', label: 'データ・保守', desc: 'レコード操作とAPI調査' }
  ];
  const launcherFeaturesByGroup: Record<string, any[]> = launcherGroupDefs.reduce((acc: Record<string, any[]>, group) => {
    acc[group.key] = launcherFeatures.filter((feature) => feature.group === group.key);
    return acc;
  }, {});
  const renderFeatureCard = (f) => {
    const recommended = Array.isArray(f.recommendedFor) ? f.recommendedFor : [];
    const tier = primaryFeatureKeys.has(f.key) ? 'primary' : 'secondary';
    const orderLabel = Number.isFinite(f.usageOrder) ? String(f.usageOrder).padStart(2, '0') : '--';
    return `<div class="feature-card feature-card--${tier}" data-act="openFeature" data-feature="${f.key}" data-group="${f.group || ''}" data-launcher-tier="${tier}" role="button" tabindex="0" aria-label="${esc(f.label)} を開く">
      <div class="feature-card-top">
        <div class="feature-card-icon">${f.icon || ''}</div>
        <div class="feature-card-meta">
          <div class="feature-card-order">${orderLabel}</div>
          <div class="feature-card-group">${esc(f.groupLabel || '')}</div>
        </div>
      </div>
      <div class="feature-card-badges">
        ${f.badge ? `<span class="feature-badge feature-badge--${f.badge.tone || 'recommended'}" aria-label="バッジ: ${esc(f.badge.label || '')}">
          <span class="feature-badge-icon" aria-hidden="true">${f.badge.icon || '•'}</span>
          <span class="feature-badge-label">${esc(f.badge.label || '')}</span>
        </span>` : `<span class="feature-risk feature-risk--${f.riskLevel === 'warning' ? 'warning' : 'safe'}">${getRiskLabel(f.riskLevel)}</span>`}
      </div>
      <div class="feature-card-label">${f.label}</div>
      <div class="feature-card-desc">${f.desc}</div>
      ${recommended.length ? `<div class="feature-card-tags">${recommended.map((item) => `<span class="feature-card-tag">${esc(item)}</span>`).join('')}</div>` : ''}
      <div class="feature-card-go" aria-hidden="true">開く</div>
    </div>`;
  };
  const renderLauncherFeatureGroup = (groupKey) => (launcherFeaturesByGroup[groupKey] || []).map(renderFeatureCard).join('');
  root.innerHTML = `<style>${cssText}</style>` + `
        <div class="h" data-dialog-drag-handle="1">
          <div class="h-brand" aria-hidden="true">
            <span class="suite-mark"></span>
          </div>
          <div class="h-title-launcher">
            <div class="ht">kintone 統合変更ツール</div>
            <div class="hs">使う機能カードを選んでください。進め方は右上の<strong>操作ガイド</strong>から。</div>
            <div><span class="tool-ver hs" data-act="copyToolInfo" title="クリックでツール識別情報をクリップボードにコピー（問い合わせ・再現調査用）">ビルド ${TOOL_VERSION}</span></div>
          </div>
          <div class="h-title-feature">
            <button class="h-back" data-act="backToLauncher">← 戻る</button>
            <div class="h-title-feature-main">
              <div class="ht" id="u_featureTitle"></div>
              <div class="feature-breadcrumb" id="u_featureBreadcrumb" aria-live="polite" role="navigation" aria-label="現在地">ホーム / 機能</div>
              <div class="feature-conn" id="u_featureConn" hidden></div>
            </div>
          </div>
          <div class="h-actions">
            <span id="u_envBadge" class="kus-env-badge-host" aria-live="polite"></span>
            <button class="x size" data-act="startGuidedTour" title="初回: 全工程 / 復習: 差分のみ / 反映直前: 反映まで">操作ガイド</button>
            <button class="x size" data-act="openShortcutHelp" title="キーボードショートカット一覧 (?)" aria-label="キーボードショートカット一覧">?</button>
            <details class="kus-display-prefs" id="u_displayPrefs">
              <summary class="x size" title="ダーク/フォントサイズ/コントラスト/配色/フォーカスリング/ダイアログ位置/説明文の詳細度を切り替え">表示</summary>
              <div class="kus-display-prefs__panel" role="dialog" aria-label="表示設定">
                <div class="kus-display-prefs__group">
                  <div class="kus-display-prefs__title">テーマ</div>
                  <div class="kus-display-prefs__row">
                    <button type="button" class="btn sub" data-act="setDisplayPref" data-pref="theme" data-value="light">ライト</button>
                    <button type="button" class="btn sub" data-act="setDisplayPref" data-pref="theme" data-value="dark">ダーク</button>
                    <button type="button" class="btn sub" data-act="setDisplayPref" data-pref="theme" data-value="contrast">高コントラスト</button>
                  </div>
                </div>
                <div class="kus-display-prefs__group">
                  <div class="kus-display-prefs__title">フォントサイズ</div>
                  <div class="kus-display-prefs__row">
                    <button type="button" class="btn sub" data-act="setDisplayPref" data-pref="fontSize" data-value="sm">小</button>
                    <button type="button" class="btn sub" data-act="setDisplayPref" data-pref="fontSize" data-value="md">標準</button>
                    <button type="button" class="btn sub" data-act="setDisplayPref" data-pref="fontSize" data-value="lg">大</button>
                  </div>
                </div>
                <div class="kus-display-prefs__group">
                  <div class="kus-display-prefs__title">差分カラーパレット</div>
                  <div class="kus-display-prefs__row">
                    <button type="button" class="btn sub" data-act="setDisplayPref" data-pref="palette" data-value="default" title="追加=緑 / 削除=赤 / 変更=橙（標準）">標準</button>
                    <button type="button" class="btn sub" data-act="setDisplayPref" data-pref="palette" data-value="cb" title="追加=青 / 削除=黄 / 変更=紫（色覚多様性配慮）">色覚対応</button>
                  </div>
                </div>
                <div class="kus-display-prefs__group">
                  <div class="kus-display-prefs__title">フォーカスリング</div>
                  <div class="kus-display-prefs__row">
                    <button type="button" class="btn sub" data-act="setDisplayPref" data-pref="focusRing" data-value="default">標準</button>
                    <button type="button" class="btn sub" data-act="setDisplayPref" data-pref="focusRing" data-value="strong">強調</button>
                  </div>
                </div>
                <div class="kus-display-prefs__group">
                  <div class="kus-display-prefs__title">ダイアログ位置</div>
                  <div class="kus-display-prefs__row">
                    <button type="button" class="btn sub" data-act="setDialogAlign" data-value="left">左</button>
                    <button type="button" class="btn sub" data-act="setDialogAlign" data-value="center">中央</button>
                    <button type="button" class="btn sub" data-act="setDialogAlign" data-value="right">右</button>
                  </div>
                </div>
                <div class="kus-display-prefs__group">
                  <div class="kus-display-prefs__title">説明文の詳細度</div>
                  <div class="kus-display-prefs__row">
                    <button type="button" class="btn sub" data-act="setDisplayPref" data-pref="verbosity" data-value="brief">簡潔</button>
                    <button type="button" class="btn sub" data-act="setDisplayPref" data-pref="verbosity" data-value="normal">標準</button>
                    <button type="button" class="btn sub" data-act="setDisplayPref" data-pref="verbosity" data-value="detail">詳細</button>
                  </div>
                </div>
                <div class="kus-display-prefs__foot">
                  <span class="muted">設定はセッション内のみ（タブを閉じるとリセット）</span>
                  <button type="button" class="btn sub" data-act="resetDisplayPrefs">既定に戻す</button>
                </div>
              </div>
            </details>
            <button class="x size" data-act="dialogSizeDefault">標準</button>
            <button class="x size" data-act="dialogSizeLarge">大</button>
            <button class="x size" data-act="dialogSizeWide" title="2画面用ワイドサイズ">ワイド</button>
            <button class="x size" data-act="dialogSizeMax">最大</button>
            <button class="x size" data-act="toggleHeaderCollapse" id="u_headerCollapseBtn" title="ヘッダーを折りたたむ／展開する" aria-label="ヘッダーを折りたたむ">▲</button>
            <button class="x" data-act="close">閉じる</button>
          </div>
        </div>
        <div class="body">
          <div class="card common-card" id="u_connectionPanel">
            <section class="connection-section connection-section--step1 connection-section--app-inputs" aria-labelledby="conn-app-heading">
              <div class="connection-step-banner connection-step-banner--step1">
                <div class="connection-step-banner-main">
                  <span class="connection-step-title" id="conn-app-heading">接続設定</span>
                  <span class="connection-step-indicator" id="u_step1Indicator" data-step-state="pending">未入力</span>
                  <span class="connection-summary-inline" id="u_connectionSummaryInline" aria-live="polite"></span>
                </div>
                <button type="button" class="connection-toggle-btn" data-act="toggleConnectionPanel" id="u_connectionToggleBtn" aria-expanded="true" aria-controls="u_connectionStep1Body" title="接続設定の表示/非表示を切り替え">設定を折りたたむ</button>
              </div>
              <div class="connection-step1-body" id="u_connectionStep1Body">
              <p class="connection-section-lead" id="u_connectionLead">動作対象のアプリIDを <strong>比較元</strong> に入力します。<br>差分比較・プレビュー反映を使う場合のみ <strong>比較先</strong> も入力してください（ER図／設計書／レコード管理／設定一括取得 などは比較元だけでOK）。</p>
              <p class="muted connection-lookup-note">ルックアップ参照先アプリIDが環境で異なる場合のみ、下の「ルックアップ参照先アプリID変換」を開いて設定します。</p>
              <div class="grid connection-grid">
              <div class="conn-source">
                <label for="u_sourceApp" id="u_sourceAppLabel">比較元アプリID <span class="req">必須</span> <span class="conn-label-hint" title="このツール全体の動作対象アプリ。1アプリだけ操作する機能（ER図 / 設計書 / レコード管理 など）もここに入力します。">動作対象</span></label>
                <input type="text" id="u_sourceApp" value="${esc(DEFAULT_APP_ID)}" autocomplete="off">
              </div>
              <div class="conn-source">
                <label for="u_sourceGuest" id="u_sourceGuestLabel">比較元 ゲストID</label>
                <input type="text" id="u_sourceGuest" placeholder="空欄で通常スペース" autocomplete="off">
              </div>
              <div class="conn-target">
                <label for="u_targetApp" id="u_targetAppLabel">比較先アプリID <span class="req-soft" title="差分比較・プレビュー反映を使うときに必須。1アプリだけ操作する機能では空のままで構いません。">差分比較時</span></label>
                <input type="text" id="u_targetApp" value="${esc(DEFAULT_APP_ID)}" autocomplete="off">
              </div>
              <div class="conn-target">
                <label for="u_targetGuest" id="u_targetGuestLabel">比較先 ゲストID</label>
                <input type="text" id="u_targetGuest" placeholder="空欄で通常スペース" autocomplete="off">
              </div>
            </div>
            <div class="btns connection-step-btns connection-quick-btns" style="margin-top:8px">
              <button type="button" class="btn sub connection-secondary-action connection-secondary-action--primary" data-act="setBothCurrent" title="今開いているアプリのIDを比較元と比較先の両方に一括セット（最も多いケース）">両方=現在アプリ</button>
              <button type="button" class="btn sub connection-secondary-action" data-act="setSourceCurrent" title="今開いているアプリのIDを比較元（動作対象）にセット">比較元=現在アプリ</button>
              <button type="button" class="btn sub connection-secondary-action conn-target-action" data-act="copySourceToTarget" title="比較元のID/ゲスト/プレビュー設定を比較先にコピー">比較先←比較元</button>
              <button type="button" class="btn sub connection-secondary-action conn-target-action" data-act="swapSourceTarget" title="比較元と比較先の接続情報を入れ替え">比較元/比較先入替</button>
            </div>
            <div class="connection-preview-controls" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px">
              <span class="muted" style="font-size:12px">取得環境</span>
              <label class="chip" title="比較元をプレビューAPIから取得します"><input type="checkbox" id="u_sourcePreview"> 比較元プレビュー</label>
              <label class="chip" title="比較先をプレビューAPIから取得します"><input type="checkbox" id="u_targetPreview" checked> 比較先プレビュー</label>
            </div>
            <div class="connection-preset-panel" aria-labelledby="conn-preset-heading">
              <div class="connection-preset-head">
                <div>
                  <div class="connection-preset-title" id="conn-preset-heading">接続プリセット</div>
                  <div class="connection-preset-desc">よく使う比較元・比較先・ゲスト設定を保存して、次回すぐ呼び出せます。</div>
                </div>
                <div class="connection-preset-count" id="u_connectionPresetSummary">保存なし</div>
              </div>
              <div class="connection-preset-controls">
                <select id="u_connectionPresetSelect" class="connection-preset-select" aria-label="接続プリセットを選択">
                  <option value="">（保存済みプリセットなし）</option>
                </select>
                <button type="button" class="btn sub" data-act="applyConnectionPreset">読み込み</button>
                <button type="button" class="btn sub" data-act="deleteConnectionPreset">削除</button>
              </div>
              <div class="connection-preset-save">
                <input type="text" id="u_connectionPresetName" placeholder="プリセット名（任意）" autocomplete="off">
                <button type="button" class="btn sub" data-act="saveConnectionPreset">現在の接続を保存</button>
              </div>
            </div>
            <details class="diff-fold connection-app-search" open>
              <summary class="diff-fold-summary">
                <span class="diff-fold-title">アプリID検索・入力支援</span>
                <span class="diff-fold-sub">アプリ名、ID、URLから比較元/比較先/複数比較先へ追加</span>
              </summary>
              <div class="diff-fold-body">
                <div class="connection-search-grid">
                  <input type="text" id="u_connectionSearchKeyword" placeholder="アプリ名 / アプリID / URL" autocomplete="off">
                  <input type="text" id="u_connectionSearchGuest" placeholder="検索用ゲストID（任意）" autocomplete="off">
                  <select id="u_connectionSearchAssign" style="max-width:220px">
                    <option value="source">比較元に設定</option>
                    <option value="target">比較先に設定</option>
                    <option value="diffMulti">複数比較先へ追加</option>
                    <option value="settingsExport">設定一括取得へ追加</option>
                  </select>
                  <button type="button" class="btn sub" data-act="connectionSearchApps">検索</button>
                </div>
                <div id="u_connectionSearchResult" class="result connection-search-result"></div>
              </div>
            </details>
            <details class="diff-fold diff-fold--lookup">
              <summary class="diff-fold-summary">
                <span class="diff-fold-title">ルックアップ参照先アプリID変換（任意）</span>
                <span class="diff-fold-sub">初期は閉じた状態</span>
              </summary>
              <div class="diff-fold-body">
              <div class="muted" style="margin-bottom:4px;line-height:1.6">ルックアップフィールドを反映する際、参照先アプリIDを自動変換します。開発→本番など環境間でアプリIDが異なる場合に設定してください。</div>
              <div id="u_lookupMapRows"></div>
              <div class="btns" style="margin-top:4px">
                <button type="button" class="btn sub" data-act="addLookupMapRow" title="変換元AppID → 変換先AppID の行を追加します">+ 変換ルールを追加</button>
              </div>
              <input type="hidden" id="u_lookupMap">
              </div>
            </details>
            </div>
            </section>
          </div>
          <div class="kus-header-diff-suite" id="u_headerDiffSuite">
            <!-- 「比較データ取得・一括フロー」フォールドはヒーローバーと重複のため削除。
                 「差分比較してプラン確認」「共通データ取得」は ⚙ 詳細 popover の中に集約 -->
            <span id="u_step2Indicator" data-step-state="pending" hidden>未取得</span>
            <span id="u_commonDataState" hidden>共通データ未取得</span>
              <section class="diff-pane-embed" aria-label="差分の条件・一覧">
              <div class="subpane active">

              <!-- 主要アクションバー：1行コンパクト -->
              <section class="diff-hero diff-hero--compact" aria-label="差分の主要アクション">
                <button type="button" class="btn-stage diff-hero__run" data-stage="diff" id="u_runDiffPrimary" data-act="runDiff" title="現在の比較設定で差分を取得します（Ctrl+Enter）">
                  <span class="btn-stage__icon" aria-hidden="true">🔍</span>
                  <span>差分比較</span>
                </button>
                <div class="diff-hero__state kv" id="u_bundleState">未取得</div>
                <div class="diff-hero__menu" role="group" aria-label="補助操作">
                  <details class="diff-hero__pop">
                    <summary class="btn sub diff-hero__pop-btn" title="設定JSONの読込・保存">📥 JSON</summary>
                    <div class="diff-hero__pop-body">
                      <button type="button" class="btn sub" data-act="importSourceBundle">比較元 読込</button>
                      <button type="button" class="btn sub" data-act="importTargetBundle">比較先 読込</button>
                      <button type="button" class="btn sub" data-act="clearBundle">読込解除</button>
                      <button type="button" class="btn sub" data-act="exportBundleJson">💾 設定保存</button>
                    </div>
                  </details>
                  <details class="diff-hero__pop">
                    <summary class="btn sub diff-hero__pop-btn" title="差分結果の出力">📤 出力</summary>
                    <div class="diff-hero__pop-body">
                      <button type="button" class="btn sub" data-act="exportDiffJson">JSON</button>
                      <button type="button" class="btn sub" data-act="exportDiffHtml">HTML</button>
                      <button type="button" class="btn sub" data-act="exportPatchJson">パッチ</button>
                      <hr style="margin:4px 0;border:0;border-top:1px solid #e2e8f0">
                      <button type="button" class="btn sub" data-act="kusExportDiffJson" title="差分スナップショット（rows / fetchIssues / filters）を JSON で保存">📸 差分スナップショット保存</button>
                      <button type="button" class="btn sub" data-act="kusImportDiffJson" title="保存した差分スナップショット JSON を読み込み">📂 スナップショット読込</button>
                      <button type="button" class="btn sub" data-act="kusExportDiffMd" title="差分結果を Markdown 表で保存">📝 差分 MD</button>
                      <button type="button" class="btn sub" data-act="kusExportDiffCsv" title="差分結果を Excel 用 CSV (UTF-8 BOM) で保存">📊 差分 CSV</button>
                      <button type="button" class="btn sub" data-act="kusExportDiffPdf" title="差分結果を印刷ダイアログ（PDF 保存）">🖨 差分 PDF</button>
                      <button type="button" class="btn sub" data-act="kusExportDiffPdfCover" title="表紙・ロゴ付き PDF（設計書ペインの設定を使用）">📕 差分 PDF（表紙付き）</button>
                      <hr style="margin:4px 0;border:0;border-top:1px solid #e2e8f0">
                      <button type="button" class="btn sub" data-act="kusExportPlanMd" title="現在の反映プランを Markdown で保存（PR 添付向け）">📝 反映プラン MD 保存</button>
                      <button type="button" class="btn sub" data-act="kusExportPlanMermaid" title="反映プランを Mermaid フロー図として保存">📊 反映プラン Mermaid</button>
                      <button type="button" class="btn sub" data-act="kusShowApiDiff" title="送信予定 API リクエストの旧/新差分プレビュー">🔍 API 差分プレビュー</button>
                      <button type="button" class="btn sub" data-act="kusExportDryrunOverlay" title="ドライラン重ね差分 JSON を保存">🧪 ドライラン重ね差分</button>
                      <button type="button" class="btn sub" data-act="kusCaptureSnapshot" title="現在の反映状態の HTML スナップショットを保存">📸 状態スナップショット</button>
                    </div>
                  </details>
                  <details class="diff-hero__pop diff-hero__pop--advanced">
                    <summary class="btn sub diff-hero__pop-btn" title="高度な操作・比較条件の調整">⚙ 詳細</summary>
                    <div class="diff-hero__pop-body">
                      <button type="button" class="btn sub" data-act="runDiffAndPlan" title="差分比較とプラン確認をまとめて実行">差分比較→プラン確認</button>
                      <button type="button" class="btn sub" data-act="prefetchCommonData" title="比較元と比較先のデータを先に取得">共通データ事前取得</button>
                      <hr style="margin:4px 0;border:0;border-top:1px solid #e2e8f0">
                      <button type="button" class="btn sub" data-act="toggleDiffAdvanced" title="比較対象セクション・無視キー・複数比較先などを開閉">▾ 比較条件の調整を開く</button>
                    </div>
                  </details>
                </div>
              </section>

              <details class="diff-advanced-fold" id="u_diffAdvancedFold">
                <summary class="diff-advanced-fold__summary">
                  <span class="diff-advanced-fold__chev" aria-hidden="true">▸</span>
                  <span class="diff-advanced-fold__title">比較条件の調整</span>
                  <span class="diff-advanced-fold__sub">必要なときだけ開きます（セクション選択 / 無視キー / 複数比較先）</span>
                </summary>
                <div class="diff-advanced-fold__body">

              <details class="diff-fold diff-fold--scopes">
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">比較対象セクション</span>
                  <span class="diff-fold-sub">API 取得範囲（各チップにマウスを載せると API パスが表示されます）</span>
                </summary>
                <div class="diff-fold-body">
                  <div class="scope-launcher-card">
                    <div class="scope-launcher-copy">
                      <div class="scope-launcher-kicker">ポップアップ選択</div>
                      <div class="scope-launcher-title">比較に使うセクションをまとめて選びます</div>
                      <div class="scope-launcher-summary" id="u_diffScopeSummary">読み込み中...</div>
                    </div>
                    <div class="scope-launcher-actions">
                      <button type="button" class="btn sub" data-act="openDiffScopePicker">比較対象を選ぶ</button>
                    </div>
                  </div>
                </div>
              </details>

              <details class="diff-fold diff-fold--ignore">
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">差分ノイズを減らす</span>
                  <span class="diff-fold-sub">ノイズ差分を減らす（初期は閉じた状態）</span>
                </summary>
                <div class="diff-fold-body">
                <div class="muted" style="margin-top:0;line-height:1.6">比較時に値が違っても無視する JSON キー名を指定します。以下のキーは常に自動で除外されます。<code>*At</code> / <code>*Id</code> のように <code>*</code> ワイルドカードも使えます。</div>
                <div id="u_ignoreDefaultChips" class="chips" style="min-height:28px;padding:4px 6px;margin-top:6px"></div>
                <div class="muted" style="margin-top:8px">追加で無視したいキー名（ワンクリックで無視リストへ追加）</div>
                <div class="btns" style="margin-top:4px;flex-wrap:wrap">
                  <button type="button" class="btn sub" data-act="addPresetKey" data-key="code" style="font-size:11px;padding:2px 8px" title="code キーの値差分を無視（フィールドコードなど識別子の揺れ対策）">＋code</button>
                  <button type="button" class="btn sub" data-act="addPresetKey" data-key="index" style="font-size:11px;padding:2px 8px" title="index キーを無視（並び順のみの差分を抑えたいとき）">＋index</button>
                  <button type="button" class="btn sub" data-act="addPresetKey" data-key="enabled" style="font-size:11px;padding:2px 8px" title="enabled（有効/無効）の差分を無視">＋enabled</button>
                  <button type="button" class="btn sub" data-act="addPresetKey" data-key="name" style="font-size:11px;padding:2px 8px" title="name の表記ゆれを無視">＋name</button>
                  <button type="button" class="btn sub" data-act="addPresetKey" data-key="label" style="font-size:11px;padding:2px 8px" title="label（表示名）の差分を無視">＋label</button>
                </div>
                <div class="muted" style="margin-top:8px">よく使う無視プリセット</div>
                <div class="chips" style="margin-top:4px">
                  <label class="chip" title="index / no / order など順序系を無視キーにまとめて追加します"><input type="checkbox" id="u_ignorePresetFieldOrder"> フィールド順序(index/no)無視</label>
                  <label class="chip" title="revision・日時・作成者/更新者などメタ情報を無視します"><input type="checkbox" id="u_ignorePresetMeta"> 日時/更新者/revision無視</label>
                  <label class="chip" title="name と label を無視キーに追加します"><input type="checkbox" id="u_ignorePresetLabelName"> name/label差分を無視</label>
                </div>
                <div class="muted" style="margin-top:8px">セクション別正規化プリセット</div>
                <div class="chips" style="margin-top:4px">
                  <label class="chip" title="ビュー・グラフ・アクションの並びをソートしてから比較し、順序差分を抑えます"><input type="checkbox" id="u_diffNormalizeViewOrder"> ビュー/グラフ/アクション順序を正規化</label>
                  <label class="chip" title="権限・通知・カテゴリなどの配列順をソートしてから比較します"><input type="checkbox" id="u_diffNormalizePermissionOrder"> 権限/通知/カテゴリ順序を正規化</label>
                  <label class="chip" title="すべての設定（プロセス管理などを含む）で配列の順序を無視します。順序が変わっただけの不要な差分を抑えます。"><input type="checkbox" id="u_diffNormalizeGeneralArrayOrder"> すべての配列順序を無視 (強力)</label>
                </div>
                <div class="muted" style="margin-top:8px">追加した無視キー（×で削除）</div>
                <input type="hidden" id="u_ignoreKeys">
                <div id="u_ignoreKeysTags" class="chips" style="min-height:32px;border:1px solid #d6dee8;border-radius:6px;padding:4px 6px;background:#fff;margin-top:4px;align-items:center"></div>
                <div class="btns" style="margin-top:4px">
                  <input type="text" id="u_ignoreKeyInput" placeholder="キー名 / *At / a.b.c のパス" style="flex:1;min-width:0" title="単純なキー名のほか、*At のような末尾ワイルドカード、a.b.c[0] のようなパスも指定できます">
                  <button type="button" class="btn sub" data-act="addIgnoreKey">追加</button>
                </div>
                <div id="u_ignoreImpactPreview" class="muted" style="margin-top:6px;font-size:11px;line-height:1.5">差分比較を実行すると、現在の無視キー設定で何件除外されるかをここに表示します。</div>
                <div class="muted" style="margin-top:10px">無視キー設定セット（名前付きで保存・再利用）</div>
                <div class="btns" style="margin-top:4px;flex-wrap:wrap;gap:6px">
                  <input type="text" id="u_ignorePresetName" placeholder="例: 監査用 / 軽量比較" style="flex:1;min-width:0" title="現在の無視キー設定に名前を付けて保存します">
                  <button type="button" class="btn sub" data-act="saveIgnorePreset" title="現在のキー一覧をこの名前で保存">保存</button>
                  <select id="u_ignorePresetSelect" title="保存済みセットを読み込み" style="min-width:160px"><option value="">-- 読込 --</option></select>
                  <button type="button" class="btn sub" data-act="loadIgnorePreset" title="選んだセットを現在の無視キーに置き換え">読込</button>
                  <button type="button" class="btn sub" data-act="mergeIgnorePreset" title="選んだセットを現在の無視キーに追加（マージ）">追加</button>
                  <button type="button" class="btn sub" data-act="deleteIgnorePreset" title="選んだセットを削除">削除</button>
                </div>
                </div>
              </details>

              <!-- (旧「差分の実行・保存・設定JSON読込」フォールドはヒーローバーへ移動) -->
              <details class="diff-fold diff-fold--multi">
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">複数比較先の一括比較</span>
                  <span class="diff-fold-sub">同じ比較元に対し複数アプリを比較</span>
                </summary>
                <div class="diff-fold-body">
                <div class="muted" style="margin-top:0;line-height:1.6">比較元 / 比較セクション / 無視キー / 正規化は現在の差分条件を使います。比較先ゲストID / プレビューは上の比較先設定を共通利用します。</div>
                <textarea id="u_diffMultiTargets" rows="3" placeholder="アプリIDを改行またはカンマ区切りで入力" style="margin-top:6px" title="比較先アプリIDを列挙"></textarea>
                <div class="btns" style="margin-top:4px">
                  <button type="button" class="btn sub" data-act="diffMultiUseCurrentTarget" title="上部の比較先アプリIDを1行追加">現在の比較先を追加</button>
                  <button type="button" class="btn sub" data-act="runMultiTargetDiff" title="各IDに対し順に差分を計算">複数比較先を比較</button>
                </div>
                <div id="u_diffMultiTargetResult" class="result" style="max-height:260px;margin-top:6px"></div>
                </div>
              </details>

                </div>
              </details>
              <!-- /diff-advanced-fold -->

              <details class="diff-fold diff-fold--review" id="u_diffReviewFold">
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">差分結果の整理・出力</span>
                  <span class="diff-fold-sub is-empty-state" id="u_diffSelectionState">⏳ まだ差分を実行していません</span>
                </summary>
                <div class="diff-fold-body diff-review-body">
                  <!-- 高優先：必須フィルタ + 検索（横1行） -->
                  <div class="diff-review-toolbar" role="group" aria-label="差分の必須フィルタ">
                    <select id="u_diffFilterSection" title="表示する差分のセクションを限定" class="diff-review-toolbar__sel">
                      <option value="">全セクション</option>
                    </select>
                    <select id="u_diffFilterType" title="追加/削除/変更など種別で限定" class="diff-review-toolbar__sel">
                      <option value="">全種別</option>
                      <option value="added">追加</option>
                      <option value="removed">削除</option>
                      <option value="changed">変更</option>
                      <option value="moved">移動</option>
                      <option value="same">同一</option>
                    </select>
                    <select id="u_diffFilterSeverity" title="重要度で限定" class="diff-review-toolbar__sel">
                      <option value="">全重要度</option>
                      <option value="high">高</option>
                      <option value="medium">中</option>
                      <option value="low">低</option>
                    </select>
                    <input type="text" id="u_diffSearch" placeholder="パス/値で検索（Ctrl+F）" class="diff-review-toolbar__search" title="パスや値の一部で絞り込み（Ctrl/Cmd+F でフォーカス）">
                    <button type="button" class="btn sub diff-review-toolbar__clear" data-act="clearDiffFilters" title="フィルタをすべてクリア">クリア</button>
                    <div class="diff-review-toolbar__quick btns">
                      <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="severity_high" title="重要度「高」だけ表示">⚠ 高のみ</button>
                      <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="type_added" title="追加差分だけ">+ 追加</button>
                      <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="type_removed" title="削除差分だけ">− 削除</button>
                      <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="type_changed" title="変更差分だけ">~ 変更</button>
                      <span class="diff-review-toolbar__sep" aria-hidden="true">|</span>
                      <button type="button" class="btn sub" data-act="diffSectionsExpandAll" title="すべての差分セクションを展開">⇊ 全展開</button>
                      <button type="button" class="btn sub" data-act="diffSectionsCollapseAll" title="すべての差分セクションを折りたたみ">⇈ 全折りたたみ</button>
                      <button type="button" class="btn sub" data-act="copyDiffResult" title="現在表示している差分結果をクリップボードへコピー">📋 結果をコピー</button>
                    </div>
                  </div>
                  <div class="diff-active-filters" id="u_diffActiveFilters" aria-live="polite"></div>

                  <!-- 最高優先：実際の差分結果（最大スペースを与える） -->
                  <div class="result diff-result-main" id="u_result"></div>

                  <!-- 中優先：選択操作・出力（コンパクト1行） -->
                  <div class="diff-review-actions" role="group" aria-label="出力と選択操作">
                    <div class="diff-review-actions__group">
                      <span class="diff-review-actions__lbl">📤 出力</span>
                      <select id="u_diffExportMode" title="保存・コピーに含める行の範囲" class="diff-review-actions__sel">
                        <option value="all">全件</option>
                        <option value="selected">選択行のみ</option>
                        <option value="visible">表示中のみ</option>
                        <option value="favorites">お気に入りのみ</option>
                      </select>
                      <select id="u_diffExportContent" title="出力内容" class="diff-review-actions__sel">
                        <option value="diffOnly">行データのみ</option>
                        <option value="withCompared">行+比較設定</option>
                      </select>
                    </div>
                    <div class="diff-review-actions__group">
                      <span class="diff-review-actions__lbl">✓ 選択</span>
                      <button type="button" class="btn sub" data-act="selectVisibleDiffs" title="表示中を選択">表示中</button>
                      <button type="button" class="btn sub" data-act="selectAllDiffs" title="全行を選択">全件</button>
                      <button type="button" class="btn sub" data-act="clearDiffSelection" title="選択を外す">解除</button>
                      <button type="button" class="btn sub" data-act="toggleDiffFavoritesOnly" id="u_diffFavoritesOnlyBtn" title="お気に入り行だけ表示">★のみ: OFF</button>
                    </div>
                  </div>

                  <!-- 低優先：詳細設定（折り畳み・初期閉） -->
                  <details class="diff-fold diff-fold--review-extra">
                    <summary class="diff-fold-summary">
                      <span class="diff-fold-title">詳細設定（プリセット / 表示 / 警告 / 選択セット）</span>
                      <span class="diff-fold-sub">普段は閉じてOK。必要なときだけ開きます</span>
                    </summary>
                    <div class="diff-fold-body" style="display:flex;flex-direction:column;gap:8px">
                      <div id="u_diffOnboarding" class="diff-onboarding" style="display:none" role="note">
                        <div class="diff-onboarding-body">
                          <p class="diff-onboarding-text"><strong>ヒント</strong> 差分比較後は、ここで絞り込み・帯グラフ・別ウィンドウ・Shift+範囲選択が使えます。</p>
                          <button type="button" class="btn sub" data-act="dismissDiffOnboarding">了解して閉じる</button>
                        </div>
                      </div>
                      <fieldset class="diff-extra-section">
                        <legend>セクションプリセット</legend>
                        <div class="btns">
                          <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="reset">解除</button>
                          <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="sec_field">フィールド</button>
                          <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="sec_layout">レイアウト</button>
                          <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="sec_view">ビュー</button>
                          <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="sec_process">プロセス</button>
                          <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="no_acl">権限非表示</button>
                        </div>
                      </fieldset>
                      <fieldset class="diff-extra-section">
                        <legend>テーブル絞り込み</legend>
                        <div class="btns">
                          <label class="chip"><input type="checkbox" id="u_diffFilterTableOnly"> テーブル内フィールドのみ</label>
                          <input type="text" id="u_diffFilterTableKeyword" placeholder="テーブル名 / コードで絞り込み" style="flex:1;min-width:160px">
                        </div>
                      </fieldset>
                      <fieldset class="diff-extra-section">
                        <legend>表示設定</legend>
                        <div class="btns">
                          <label class="chip"><input type="checkbox" id="u_diffSearchFieldName"> フィールド名で検索</label>
                          <label class="chip"><input type="checkbox" id="u_charDiff" checked> 文字単位ハイライト</label>
                          <label class="chip"><input type="checkbox" id="u_diffIncludeSame" checked> 差分なしも表示</label>
                          <button type="button" class="btn sub" data-act="toggleDiffTheme" id="u_diffThemeBtn">テーマ: ライト</button>
                          <button type="button" class="btn sub" data-act="collapseDiffSections">全折畳</button>
                          <button type="button" class="btn sub" data-act="expandDiffSections">全展開</button>
                          <button type="button" class="btn sub" data-act="openDiffPopout">別ウィンドウ</button>
                        </div>
                      </fieldset>
                      <fieldset class="diff-extra-section">
                        <legend>選択セット保存</legend>
                        <div class="diff-selection-set-row">
                          <input type="text" id="u_diffSelectionSetName" class="diff-selection-set-name" placeholder="例: レビュー用" style="flex:1;min-width:120px">
                          <button type="button" class="btn sub" data-act="saveDiffSelectionSet">保存</button>
                          <select id="u_diffSelectionSetSelect" class="diff-selection-set-select"><option value="">-- 読込 --</option></select>
                          <button type="button" class="btn sub" data-act="loadDiffSelectionSet">読込</button>
                          <button type="button" class="btn sub" data-act="deleteDiffSelectionSet">削除</button>
                        </div>
                      </fieldset>
                      <fieldset class="diff-extra-section">
                        <legend>件数警告・無視キー候補</legend>
                        <div class="btns" style="margin-bottom:6px">
                          <label style="font-size:11px;color:#475569">しきい値:</label>
                          <input type="text" id="u_diffWarnThreshold" placeholder="例: 200 / 0でOFF" style="max-width:160px">
                        </div>
                        <div class="warnbox" id="u_diffWarnBox" style="display:none;margin-bottom:6px"></div>
                        <div class="muted" style="font-size:11px;margin-bottom:4px">おすすめ無視キー候補</div>
                        <div id="u_diffSuggestedIgnore" class="chips" style="min-height:32px;border:1px solid #d6dee8;border-radius:6px;padding:6px;background:#fff"></div>
                        <div class="muted" style="margin-top:6px;line-height:1.5;font-size:10px">ショートカット: Ctrl+F 検索 / Esc クリア / Ctrl+A 全件選択 / Shift+クリックで範囲選択</div>
                      </fieldset>
                    </div>
                  </details>
                </div>
              </details>
              <input type="file" id="u_sourceBundleFile" accept=".json" style="display:none">
              <input type="file" id="u_targetBundleFile" accept=".json" style="display:none">
              </div>
              </section>
            </div>
          <!-- step3「機能選択」は接続パネル内のクイックボタンと重複していたため統合・削除 -->
          <span id="u_step3Indicator" data-step-state="pending" hidden>未選択</span>

          <div class="launcher-menu" id="u_launcherMenu">
            <!-- launcher-hero（"変更作業ダッシュボード"見出し+メトリクス）はカテゴリタブと重複のため削除 -->

            <div class="launcher-tab-nav" id="u_launcherGroupFilters" role="tablist" aria-label="機能カテゴリ">
              ${launcherGroupDefs.map((group, index) => `
                <button type="button" class="chip launcher-tab-btn${index === 0 ? ' is-active' : ''}" data-act="setLauncherGroup" data-group="${group.key}" role="tab" aria-selected="${index === 0 ? 'true' : 'false'}" aria-pressed="${index === 0 ? 'true' : 'false'}" aria-controls="u_launcherPanel_${group.key}" tabindex="${index === 0 ? '0' : '-1'}">
                  <span class="launcher-tab-btn__label">${group.label}</span>
                  <span class="launcher-tab-btn__meta">${(launcherFeaturesByGroup[group.key] || []).length}</span>
                </button>
              `).join('')}
              <button type="button" class="chip launcher-tab-btn" data-act="setLauncherGroup" data-group="history" role="tab" aria-selected="false" aria-pressed="false" aria-controls="u_launcherPanel_history" tabindex="-1">
                <span class="launcher-tab-btn__label">履歴・復元</span>
                <span class="launcher-tab-btn__meta">作業</span>
              </button>
            </div>

            <div class="launcher-filter-bar" aria-label="機能の絞り込み">
              <div class="launcher-command-row">
                <input
                  type="search"
                  id="u_launcherSearch"
                  class="launcher-search-input"
                  placeholder="🔍 機能を検索  (例: 差分 / レコード / 設計書)"
                  autocomplete="off"
                  aria-label="機能検索">
                <button type="button" class="btn sub launcher-clear-btn" data-act="clearLauncherFilter">クリア</button>
              </div>
              <div class="launcher-active-filters" id="u_launcherActiveFilters" aria-live="polite"></div>
              <div class="launcher-filter-meta" id="u_launcherVisibleCount">表示中: ${(launcherFeaturesByGroup.change || []).length}/${(launcherFeaturesByGroup.change || []).length}</div>
            </div>

            <div class="launcher-panels">
              <section class="launcher-panel is-active" data-launcher-panel="change" id="u_launcherPanel_change" role="tabpanel" aria-label="変更・反映">
                <div class="launcher-panel-head">
                  <div>
                    <p class="launcher-section-title">変更・反映</p>
                    <p class="launcher-section-desc">差分確認、プラン確認、プレビュー反映までをここに集約します。</p>
                  </div>
                </div>
                <div class="change-wizard" aria-label="変更作業ウィザード">
                  <div class="change-wizard-head">
                    <div>
                      <p class="change-wizard-title">変更作業ウィザード</p>
                      <p class="change-wizard-desc">接続確認から記録出力まで順番に進めます。</p>
                    </div>
                    <button type="button" class="btn change-wizard-start" data-act="startChangeWizard">開始</button>
                  </div>
                  <div class="launcher-flow" aria-label="基本フロー">
                    <button type="button" class="launcher-flow-step is-primary" data-act="openWizardStep" data-wizard-step="connection">
                      <span class="launcher-flow-no">01</span>
                      <span class="launcher-flow-copy">
                        <span class="launcher-flow-main">接続確認</span>
                        <span class="launcher-flow-sub">アプリIDとゲストID</span>
                      </span>
                    </button>
                    <button type="button" class="launcher-flow-step" data-act="openWizardStep" data-wizard-step="diff">
                      <span class="launcher-flow-no">02</span>
                      <span class="launcher-flow-copy">
                        <span class="launcher-flow-main">差分比較</span>
                        <span class="launcher-flow-sub">設定差分を取得</span>
                      </span>
                    </button>
                    <button type="button" class="launcher-flow-step" data-act="openWizardStep" data-wizard-step="plan">
                      <span class="launcher-flow-no">03</span>
                      <span class="launcher-flow-copy">
                        <span class="launcher-flow-main">プラン確認</span>
                        <span class="launcher-flow-sub">反映内容を確認</span>
                      </span>
                    </button>
                    <button type="button" class="launcher-flow-step" data-act="openWizardStep" data-wizard-step="apply">
                      <span class="launcher-flow-no">04</span>
                      <span class="launcher-flow-copy">
                        <span class="launcher-flow-main">プレビュー反映</span>
                        <span class="launcher-flow-sub">比較先へ書き込み</span>
                      </span>
                    </button>
                    <button type="button" class="launcher-flow-step" data-act="openWizardStep" data-wizard-step="design">
                      <span class="launcher-flow-no">05</span>
                      <span class="launcher-flow-copy">
                        <span class="launcher-flow-main">記録出力</span>
                        <span class="launcher-flow-sub">設計書・差分資料</span>
                      </span>
                    </button>
                  </div>
                </div>
                <div class="feature-grid feature-grid--launcher">
                  ${renderLauncherFeatureGroup('change')}
                </div>
              </section>

              <section class="launcher-panel" data-launcher-panel="vis" id="u_launcherPanel_vis" role="tabpanel" aria-label="可視化・出力">
                <div class="launcher-panel-head">
                  <div>
                    <p class="launcher-section-title">可視化・出力</p>
                    <p class="launcher-section-desc">設計書、ER図、プロセス図、影響分析、設定バックアップをまとめています。</p>
                  </div>
                </div>
                <div class="feature-grid feature-grid--launcher">
                  ${renderLauncherFeatureGroup('vis')}
                </div>
              </section>

              <section class="launcher-panel" data-launcher-panel="data" id="u_launcherPanel_data" role="tabpanel" aria-label="データ・保守">
                <div class="launcher-panel-head">
                  <div>
                    <p class="launcher-section-title">データ・保守</p>
                    <p class="launcher-section-desc">レコード操作やAPI調査など、保守寄りの機能を分けて配置します。</p>
                  </div>
                </div>
                <div class="feature-grid feature-grid--launcher">
                  ${renderLauncherFeatureGroup('data')}
                </div>
              </section>

              <section class="launcher-panel launcher-panel--history" data-launcher-panel="history" id="u_launcherPanel_history" role="tabpanel" aria-label="履歴・復元">
                <section class="work-history-panel" id="u_sessionSummaryPanel" aria-label="このセッションの操作サマリ">
                  <div class="work-history-head">
                    <div>
                      <p class="work-history-title">このセッションの操作サマリ</p>
                      <p class="work-history-desc">タブを閉じるとリセットされます（永続化なし）。</p>
                    </div>
                  </div>
                  <div id="u_sessionSummary" class="kus-session-summary" aria-live="polite"></div>
                </section>
                <section class="work-history-panel" id="u_workHistoryPanel" aria-label="作業履歴・復元">
                  <div class="work-history-head">
                    <div>
                      <p class="work-history-title">作業履歴・復元</p>
                      <p class="work-history-desc">接続先、スコープ、フィルタ、レビュー状態を保存して、あとから同じ条件へ戻します。</p>
                    </div>
                    <div class="work-history-actions">
                      <span class="work-history-summary" id="u_workHistorySummary">履歴なし</span>
                      <button type="button" class="btn sub" data-act="saveWorkHistory">現在の作業を保存</button>
                      <button type="button" class="btn sub" data-act="clearWorkHistory">クリア</button>
                    </div>
                  </div>
                  <div class="work-history-list" id="u_workHistoryList" aria-live="polite">
                    <div class="work-history-empty">まだ保存された作業はありません</div>
                  </div>
                </section>
              </section>
            </div>
            <div class="launcher-empty-state" id="u_launcherEmptyState" hidden>
              <p class="launcher-empty-title">一致する機能がありません</p>
              <p class="launcher-empty-desc">検索語を変えるか、クリアで表示を戻してください。</p>
            </div>
          </div>

          <!-- タブナビゲーション（ヘッダー直下に sticky 配置・主要4タブのみ常時表示） -->
          <div class="kus-tab-bar" id="u_kusTabBar">
            <div class="tabs">
              <div class="tab-group tab-group--primary" data-group="change">
                <button class="tab" data-tab="diff" data-state="idle">差分比較</button>
                <button class="tab active" data-tab="reflect" data-state="selected">プレビュー反映</button>
                <button class="tab" data-tab="field" data-state="idle">フィールド追加</button>
                <button class="tab" data-tab="jsconfig" data-state="idle">JS/CSS設定</button>
              </div>

              <details class="kus-tab-more" id="u_kusTabMore">
                <summary class="kus-tab-more__summary" title="可視化・出力 / データ・保守 系の補助機能">⋯ その他</summary>
                <div class="kus-tab-more__body">
                  <div class="kus-tab-more__group">
                    <div class="kus-tab-more__group-lbl">可視化・出力</div>
                    <button class="tab" data-tab="er" data-state="idle">ER図</button>
                    <button class="tab" data-tab="processFlow" data-state="idle">プロセス図</button>
                    <button class="tab" data-tab="design" data-state="idle">設計書</button>
                    <button class="tab" data-tab="settingsExport" data-state="idle">設定一括取得</button>
                    <button class="tab" data-tab="analyze" data-state="idle">分析</button>
                  </div>
                  <div class="kus-tab-more__group">
                    <div class="kus-tab-more__group-lbl">データ・保守</div>
                    <button class="tab" data-tab="recordMgr" data-state="idle">レコード管理</button>
                    <button class="tab" data-tab="apiTester" data-state="idle">APIテスター</button>
                  </div>
                </div>
              </details>
            </div>
          </div>

          <div class="card tab-card">

            <!-- 差分比較タブの中身は kus-header-diff-suite に集約しているため、ここは空 -->
            <div class="pane" data-pane="diff"></div>

            <div class="pane active" data-pane="reflect">
              <!-- ========================================================================
                   シンプル化されたプレビュー反映タブ
                   - 詳細操作はモーダルへ集約（標準/詳細/JSON/プラン/履歴/レポート/補助）
                   - メインは「次のアクション + チェックリスト + 反映ボタン」だけに絞る
                   ======================================================================== -->
              <div class="reflect-simple-shell">
                <!-- ヒーローカード: 次のアクション -->
                <section class="reflect-hero-card" id="u_reflectHeroCard" aria-live="polite">
                  <div class="reflect-hero-card__loading">読み込み中...</div>
                </section>

                <!-- ステータスバッジ + 反映先 + 安全設定 -->
                <section class="reflect-status-grid">
                  <div class="reflect-status-grid__target">
                    <div class="reflect-status-grid__label">反映先</div>
                    <div class="reflect-target-badge" id="u_reflectTargetBadge" title="反映先アプリの情報"></div>
                    <div class="reflect-target-meta" id="u_reflectMode">比較元: API / 比較先: プレビューAPI</div>
                  </div>
                  <div class="reflect-status-grid__badges">
                    <div class="reflect-status-grid__label">状態</div>
                    <div id="u_reflectFooterBadges" aria-live="polite"></div>
                  </div>
                  <div class="reflect-status-grid__safety">
                    <div class="reflect-status-grid__label">安全設定</div>
                    <label class="chip" title="反映直前に比較先プレビューの設定JSONを自動保存します（推奨）">
                      <input type="checkbox" id="u_autoBackupPreview" checked> バックアップ自動保存 <span class="kus-recommended-mark">★</span>
                    </label>
                    <label class="chip" title="APIエラーが出た時点で残りの反映を止めます（推奨）">
                      <input type="checkbox" id="u_stopOnError" checked> エラー時中断 <span class="kus-recommended-mark">★</span>
                    </label>
                    <input type="checkbox" id="u_doDeploy" disabled style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none" tabindex="-1" aria-hidden="true">
                  </div>
                </section>

                <!-- 反映前チェックリスト -->
                <section class="reflect-checklist-card">
                  <div class="reflect-apply-checklist" id="u_reflectApplyChecklist" aria-label="反映前チェックリスト">
                    <div class="reflect-apply-checklist__head">
                      <span>反映前チェック</span>
                      <span id="u_reflectChecklistStatus">0 / 3</span>
                    </div>
                    <div class="reflect-apply-checklist__items">
                      <label class="reflect-apply-check"><input type="checkbox" data-reflect-apply-check="diff"> 差分比較済み</label>
                      <label class="reflect-apply-check"><input type="checkbox" data-reflect-apply-check="plan"> 実行前プラン確認済み</label>
                      <label class="reflect-apply-check"><input type="checkbox" data-reflect-apply-check="target"> 反映先は比較先プレビュー</label>
                    </div>
                  </div>
                </section>

                <!-- ルート選択カード（モーダル起動） -->
                <section class="reflect-route-grid">
                  <div class="reflect-route-grid__title">反映する内容を決める</div>
                  <div class="reflect-route-grid__cards">
                    <button type="button" class="reflect-route-card reflect-route-card--standard" data-act="openReflectScopePicker">
                      <div class="reflect-route-card__no">01</div>
                      <div class="reflect-route-card__body">
                        <div class="reflect-route-card__title">標準ルート <span class="reflect-route-card__count" id="u_reflectScopeCountBadge" aria-label="選択中のセクション数">0</span></div>
                        <div class="reflect-route-card__desc">セクション単位で反映対象を選びます。まずはこちら。</div>
                        <div class="reflect-route-card__summary" id="u_reflectScopeSummary">読み込み中...</div>
                      </div>
                      <div class="reflect-route-card__chev">›</div>
                    </button>
                    <button type="button" class="reflect-route-card reflect-route-card--node" data-act="openReflectNodeModal">
                      <div class="reflect-route-card__no">02</div>
                      <div class="reflect-route-card__body">
                        <div class="reflect-route-card__title">詳細ルート</div>
                        <div class="reflect-route-card__desc">差分ごとに「比較元 / 比較先」を切替えて部分反映します。</div>
                        <div class="reflect-route-card__summary" id="u_reflectNodeSummary">候補未読込</div>
                      </div>
                      <div class="reflect-route-card__chev">›</div>
                    </button>
                    <button type="button" class="reflect-route-card reflect-route-card--json" data-act="openReflectJsonModal">
                      <div class="reflect-route-card__no">{ }</div>
                      <div class="reflect-route-card__body">
                        <div class="reflect-route-card__title">JSON</div>
                        <div class="reflect-route-card__desc">パッチJSONを直接編集して反映（開発者向け）。</div>
                        <div class="reflect-route-card__summary" id="u_reflectJsonSummary">未読込</div>
                      </div>
                      <div class="reflect-route-card__chev">›</div>
                    </button>
                  </div>
                </section>

                <!-- 詳細レビュー: フィールド/他設定をkintone風に確認・編集する導線 -->
                <section class="reflect-detail-review" aria-label="詳細レビュー">
                  <div class="reflect-detail-review__head">
                    <div>
                      <div class="reflect-detail-review__kicker">詳細レビュー（任意）</div>
                      <div class="reflect-detail-review__title">kintoneフォーム風に並べて確認・上書き</div>
                    </div>
                    <div class="reflect-detail-review__sub">範囲を絞ったあと、フィールド粒度で内容を確認したい時に使います。</div>
                  </div>
                  <div class="reflect-detail-review__buttons">
                    <button type="button" class="reflect-detail-btn" data-act="openReflectPreviewEditor" id="u_openFieldEditorBtnMain">
                      <span class="reflect-detail-btn__icon" aria-hidden="true">🧱</span>
                      <span class="reflect-detail-btn__text">
                        <span class="reflect-detail-btn__title">フィールド設定エディタ</span>
                        <span class="reflect-detail-btn__desc">比較元⇔比較先のフィールドをkintoneのフォーム設定風に並べて、ドラッグ＆ドロップで上書き。</span>
                      </span>
                      <span class="reflect-detail-btn__chev" aria-hidden="true">›</span>
                    </button>
                    <button type="button" class="reflect-detail-btn" data-act="openSectionPreviewEditor" id="u_openOtherEditorBtnMain">
                      <span class="reflect-detail-btn__icon" aria-hidden="true">🧩</span>
                      <span class="reflect-detail-btn__text">
                        <span class="reflect-detail-btn__title">他設定エディタ</span>
                        <span class="reflect-detail-btn__desc">ビュー / レイアウト / プロセス管理 / 通知 / 権限などを、セクション単位で個別調整。</span>
                      </span>
                      <span class="reflect-detail-btn__chev" aria-hidden="true">›</span>
                    </button>
                  </div>
                </section>

                <!-- 危険ゾーン: メイン反映ボタン -->
                <section class="reflect-danger-zone">
                  <div class="reflect-danger-zone__head">
                    <span class="reflect-danger-zone__label">プレビュー反映</span>
                    <div class="reflect-footer-next" id="u_reflectFooterNext" aria-live="polite"></div>
                  </div>
                  <div class="reflect-danger-zone__buttons">
                    <button type="button" class="btn sub" data-act="previewApplyPlan" id="u_footerPlan" title="プラン内容を確認モーダルで表示">実行前プラン確認</button>
                    <button type="button" class="btn ok" data-act="applyPreview" id="u_footerApply" title="選択内容を比較先プレビューへ反映">プレビューへ反映</button>
                  </div>
                  <div class="reflect-danger-zone__prod-note">
                    <strong>本番反映</strong> はツールから実行できません。kintone管理画面から手動デプロイしてください。
                  </div>
                </section>

                <!-- フッターリンク: 履歴・レポート・補助 -->
                <section class="reflect-footer-links">
                  <button type="button" class="reflect-footer-link" data-act="openReflectReportModal" id="u_openReportBtn">
                    <span class="reflect-footer-link__icon">📊</span>
                    <span>直近の反映結果</span>
                    <span class="reflect-footer-link__badge" id="u_reflectReportBadge"></span>
                  </button>
                  <button type="button" class="reflect-footer-link" data-act="openReflectHistoryModal">
                    <span class="reflect-footer-link__icon">🕘</span>
                    <span>反映履歴</span>
                    <span class="reflect-footer-link__badge" id="u_reflectHistoryBadge"></span>
                  </button>
                  <button type="button" class="reflect-footer-link" data-act="openReflectSupportModal">
                    <span class="reflect-footer-link__icon">🛟</span>
                    <span>バックアップ・復元・ドライラン</span>
                  </button>
                  <div id="u_backupStatus" class="reflect-footer-links__backup-status" style="display:none"></div>
                  <div class="reflect-post-apply-host" id="u_reflectPostApply" aria-live="polite" style="display:none"></div>
                </section>
              </div>

              <!-- ========================================================================
                   モーダル群: 詳細ルート / JSON / プラン確認 / 履歴 / レポート / 補助
                   ======================================================================== -->

              <!-- モーダル: 詳細ルート（ノード選択） -->
              <div class="reflect-modal-overlay" id="u_reflectNodeModal" hidden>
                <div class="reflect-modal-backdrop" data-act="closeReflectModal" data-modal="node"></div>
                <div class="reflect-modal-card reflect-modal-card--xl" role="dialog" aria-modal="true" aria-labelledby="u_reflectNodeModalTitle">
                  <header class="reflect-modal-head">
                    <div>
                      <div class="reflect-modal-kicker">02 詳細ルート</div>
                      <h3 class="reflect-modal-title" id="u_reflectNodeModalTitle">差分ごとに反映対象を選ぶ</h3>
                      <p class="reflect-modal-sub">差分候補から「比較元 / 比較先」を切替え、必要な変更だけを反映します。</p>
                    </div>
                    <button type="button" class="reflect-modal-close" data-act="closeReflectModal" data-modal="node" aria-label="閉じる">×</button>
                  </header>
                  <div class="reflect-modal-body">
                    <div class="warnbox" id="u_nodeWarn" style="display:none">一部だけ選んで反映するには、先に差分比較を実行してから「差分候補を読込」を押してください。</div>
                    <div id="u_reflectHint" class="kv" style="display:none"></div>
                    <div id="u_nodeControls" class="reflect-node-controls" style="display:none">
                      <div class="reflect-node-controls__primary">
                        <button class="btn btn-primary-emphasis" data-act="runDiffLoadReflectNodes">差分比較して候補作成</button>
                        <button class="btn sub" data-act="selectVisibleReflectNodes">表示中を選択</button>
                        <button class="btn ok" data-act="reflectModeVisibleSrc">表示中を比較元にする</button>
                      </div>
                      <div class="reflect-quick-presets" id="u_reflectQuickPresets" aria-label="差分選択クイックプリセット"></div>
                      <details class="diff-fold reflect-inline-fold reflect-inline-fold--node">
                        <summary class="diff-fold-summary">
                          <span class="diff-fold-title">補助操作</span>
                          <span class="diff-fold-sub">解除、比較先維持、Undo / Redo、JSON保存</span>
                        </summary>
                        <div class="diff-fold-body">
                          <div class="reflect-node-controls__secondary">
                            <button class="btn sub" data-act="loadReflectNodes">現在の差分から候補読込</button>
                            <button class="btn sub" data-act="clearVisibleReflectNodes">表示中の選択解除</button>
                            <button class="btn ok" data-act="reflectModeVisibleTgt">表示中を比較先にする</button>
                            <button class="btn sub" data-act="selectHighSeverityReflectNodes">高重要度を選択</button>
                            <button class="btn sub" data-act="selectReflectNodesAll">候補を全選択</button>
                            <button class="btn sub" data-act="clearReflectNodes">候補を全解除</button>
                            <button class="btn ok" data-act="reflectModeAllSrc">すべて比較元にする</button>
                            <button class="btn ok" data-act="reflectModeAllTgt">すべて比較先にする</button>
                            <button class="btn sub" data-act="reflectUndo">元に戻す</button>
                            <button class="btn sub" data-act="reflectRedo">やり直す</button>
                            <button class="btn sub" data-act="exportReflectSelection" title="選択ノード・モードをJSONで保存">選択をJSONで保存</button>
                            <button class="btn sub" data-act="importReflectSelection" title="保存した選択JSONを読み込み">選択JSONを読込</button>
                            <input type="file" id="u_reflectSelectionFileInput" accept="application/json" style="display:none">
                          </div>
                        </div>
                      </details>
                    </div>
                    <div id="u_nodeFilterBlock" style="display:none;margin-bottom:8px">
                      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
                        <input type="text" id="u_nodeSearch" placeholder="パス / セクション名 / 理由 / 影響 で絞り込み" style="flex:1;min-width:140px;padding:4px 8px;border:1px solid #d6dee8;border-radius:6px;font-size:11px">
                        <select id="u_nodeFilterSection" style="padding:4px 6px;border:1px solid #d6dee8;border-radius:6px;font-size:11px"><option value="">全セクション</option></select>
                        <select id="u_nodeFilterType" style="padding:4px 6px;border:1px solid #d6dee8;border-radius:6px;font-size:11px">
                          <option value="">全種別</option><option value="added">追加</option><option value="removed">削除</option><option value="changed">変更</option><option value="moved">移動</option>
                        </select>
                        <select id="u_nodeFilterSeverity" style="padding:4px 6px;border:1px solid #d6dee8;border-radius:6px;font-size:11px">
                          <option value="">全重要度</option><option value="HIGH">高</option><option value="MEDIUM">中</option><option value="LOW">低</option>
                        </select>
                        <button class="btn sub" type="button" data-act="toggleReflectPropertyPanel" style="padding:4px 8px;font-size:10px">プロパティで絞る</button>
                        <button class="btn sub" data-act="clearReflectNodeFilters" style="padding:4px 8px;font-size:10px">絞り込み解除</button>
                      </div>
                      <div id="u_nodePropertyPanel" style="display:none;margin-top:8px;border:1px solid #d6dee8;border-radius:8px;background:#f8fafc;padding:8px 10px">
                        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px">
                          <div style="font-size:11px;font-weight:700;color:#334155">絞り込むプロパティ</div>
                          <div style="display:flex;gap:6px">
                            <button class="btn sub" type="button" data-act="selectAllReflectProperties" style="padding:3px 7px;font-size:10px">全選択</button>
                            <button class="btn sub" type="button" data-act="clearReflectProperties" style="padding:3px 7px;font-size:10px">全解除</button>
                          </div>
                        </div>
                        <div id="u_nodePropertyChips" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px"></div>
                        <div id="u_nodePropertyList" style="max-height:160px;overflow:auto;background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:6px"></div>
                      </div>
                      <div id="u_activeFilterChips" class="reflect-active-chips" aria-live="polite"></div>
                    </div>
                    <div class="reflect-node-workbench" id="u_reflectNodeWorkbench" style="display:none;">
                      <div class="reflect-node-pane">
                        <div class="reflect-node-list-wrap">
                          <div class="result" id="u_reflectNodeList" style="max-height:none;border:1px solid #dbe3ed;border-radius:8px;overflow:auto;flex:1"></div>
                        </div>
                      </div>
                      <div class="reflect-node-detail" id="u_reflectNodeDetail"></div>
                    </div>
                  </div>
                  <footer class="reflect-modal-foot">
                    <button type="button" class="btn sub" data-act="closeReflectModal" data-modal="node">閉じる</button>
                    <button type="button" class="btn sub" data-act="previewApplyPlan">プラン確認</button>
                    <button type="button" class="btn ok" data-act="applyPreview">この差分を反映</button>
                  </footer>
                </div>
              </div>

              <!-- モーダル: JSON パッチ -->
              <div class="reflect-modal-overlay" id="u_reflectJsonModal" hidden>
                <div class="reflect-modal-backdrop" data-act="closeReflectModal" data-modal="json"></div>
                <div class="reflect-modal-card reflect-modal-card--xl" role="dialog" aria-modal="true" aria-labelledby="u_reflectJsonModalTitle">
                  <header class="reflect-modal-head">
                    <div>
                      <div class="reflect-modal-kicker">{ } JSON ルート（部分反映）</div>
                      <h3 class="reflect-modal-title" id="u_reflectJsonModalTitle">本番に入れる差分だけをJSONで受け渡し</h3>
                      <p class="reflect-modal-sub">「10個の修正のうち3個だけ本番に入れたい」用のメイン動線です。差分比較結果から絞り込んでJSON出力 → 別環境で取込 → 反映、までを1モーダル内で完結できます。</p>
                    </div>
                    <button type="button" class="reflect-modal-close" data-act="closeReflectModal" data-modal="json" aria-label="閉じる">×</button>
                  </header>
                  <div class="reflect-modal-body">
                    <ol class="patch-json-steps" aria-label="JSONルートのステップ">
                      <li><span class="patch-json-step-no">1</span><span><strong>選ぶ</strong>: 差分比較で本番に入れたい行を選択／全件取込</span></li>
                      <li><span class="patch-json-step-no">2</span><span><strong>出す</strong>: 選択範囲をパッチJSONとしてエクスポート（共有・レビュー可）</span></li>
                      <li><span class="patch-json-step-no">3</span><span><strong>取込</strong>: 反映先の環境でこのモーダルにJSONを取り込み、内容を確認</span></li>
                      <li><span class="patch-json-step-no">4</span><span><strong>反映</strong>: 内容OKなら「この内容で反映」で比較先プレビューに書き込み</span></li>
                    </ol>
                    <div id="u_patchJsonPanel" style="display:block">
                      <div class="patch-json-toolbar btns" style="margin-bottom:6px;flex-wrap:wrap;gap:6px">
                        <span class="patch-json-toolbar-label">入力:</span>
                        <button class="btn sub" data-act="patchJsonUseCurrentDiff" title="現在の差分比較結果を全件パッチJSONとして取り込みます">📥 差分比較結果を全件取込</button>
                        <button class="btn sub" data-act="patchJsonUseSelectedDiff" title="差分タブで選択中の行だけをパッチJSONとして取り込みます（部分反映の主動線）">⭐ 選択中の差分だけ取込</button>
                        <button class="btn sub" data-act="patchJsonLoadFile" title="保存済みのパッチJSONファイルを読み込みます">📂 JSONファイル読込</button>
                        <input type="file" id="u_patchJsonFileInput" accept=".json" style="display:none">
                        <span class="patch-json-toolbar-sep" aria-hidden="true">|</span>
                        <span class="patch-json-toolbar-label">出力:</span>
                        <button class="btn sub" data-act="patchJsonExport" title="現在エディタにある内容をパッチJSONとしてダウンロードします">💾 JSONエクスポート</button>
                        <button class="btn sub" data-act="patchJsonCopy" title="クリップボードにコピー">📋 コピー</button>
                        <button class="btn sub" data-act="patchJsonClear" title="エディタを空にします">✕ クリア</button>
                      </div>
                      <div id="u_patchJsonSummary" style="display:none;margin-bottom:6px"></div>
                      <details class="patch-json-fold" id="u_patchJsonRangeFold" style="display:none;margin:6px 0;border:1px solid #dbe3ed;border-radius:8px;background:#f8fafc">
                        <summary style="cursor:pointer;padding:8px 10px;font-size:12px;font-weight:700;color:#0f172a">📋 このJSONに含まれる差分範囲（行一覧）</summary>
                        <div id="u_patchJsonRangeBody" style="padding:8px 10px 10px;border-top:1px dashed #cbd5e1"></div>
                      </details>
                      <div style="margin-top:8px;font-size:11px;font-weight:700;color:#334155">JSON エディタ（編集可）</div>
                      <div id="u_patchJsonEditor" style="width:100%;height:300px;border-radius:6px;"></div>
                      <details class="patch-json-fold" style="margin-top:10px;border:1px solid #dbe3ed;border-radius:8px;background:#f8fafc">
                        <summary style="cursor:pointer;padding:8px 10px;font-size:12px;font-weight:700;color:#0f172a">🔍 比較元 / 比較先 のリッチ差分プレビュー</summary>
                        <div id="u_patchJsonDiff" style="margin:8px 10px 10px;min-height:120px;max-height:320px;overflow:auto;border:1px solid #dbe3ed;border-radius:8px;background:#fff;padding:8px;color:#64748b;font-size:11px">パッチJSONを読み込むと、比較元 / 比較先の差分比較をここに表示します。</div>
                      </details>
                    </div>
                  </div>
                  <footer class="reflect-modal-foot">
                    <button type="button" class="btn sub" data-act="closeReflectModal" data-modal="json">閉じる</button>
                    <button type="button" class="btn sub" data-act="patchJsonExport" title="このJSONをファイル保存（部分反映の受け渡し）">💾 JSONエクスポート</button>
                    <button type="button" class="btn ok" data-act="applyPatchJson" title="現在のJSONの内容を比較先プレビューへ反映">この内容で反映</button>
                  </footer>
                </div>
              </div>

              <!-- モーダル: プラン確認 -->
              <div class="reflect-modal-overlay" id="u_reflectPlanModal" hidden>
                <div class="reflect-modal-backdrop" data-act="closeReflectModal" data-modal="plan"></div>
                <div class="reflect-modal-card reflect-modal-card--xl" role="dialog" aria-modal="true" aria-labelledby="u_reflectPlanModalTitle">
                  <header class="reflect-modal-head">
                    <div>
                      <div class="reflect-modal-kicker">📋 プラン確認</div>
                      <h3 class="reflect-modal-title" id="u_reflectPlanModalTitle">実行前プラン</h3>
                      <p class="reflect-modal-sub">比較先プレビューに送信される予定のAPIリクエストを確認してから反映します。</p>
                    </div>
                    <button type="button" class="reflect-modal-close" data-act="closeReflectModal" data-modal="plan" aria-label="閉じる">×</button>
                  </header>
                  <div class="reflect-modal-body">
                    <div class="reflect-plan-inline" id="u_reflectPlanInline" aria-live="polite"></div>
                    <div class="reflect-plan-preview" id="u_reflectPlanPreview" aria-live="polite"></div>
                  </div>
                  <footer class="reflect-modal-foot">
                    <button type="button" class="btn sub" data-act="exportDryRunPlan">ドライランJSONを保存</button>
                    <button type="button" class="btn sub" data-act="closeReflectModal" data-modal="plan">閉じる</button>
                    <button type="button" class="btn ok" data-act="applyPreview" data-source="planModal">このプランで反映</button>
                  </footer>
                </div>
              </div>

              <!-- モーダル: 履歴 -->
              <div class="reflect-modal-overlay" id="u_reflectHistoryModal" hidden>
                <div class="reflect-modal-backdrop" data-act="closeReflectModal" data-modal="history"></div>
                <div class="reflect-modal-card reflect-modal-card--md" role="dialog" aria-modal="true" aria-labelledby="u_reflectHistoryModalTitle">
                  <header class="reflect-modal-head">
                    <div>
                      <div class="reflect-modal-kicker">🕘 履歴</div>
                      <h3 class="reflect-modal-title" id="u_reflectHistoryModalTitle">反映履歴</h3>
                      <p class="reflect-modal-sub">この端末（localStorage）に保存された反映ログを確認できます。</p>
                    </div>
                    <button type="button" class="reflect-modal-close" data-act="closeReflectModal" data-modal="history" aria-label="閉じる">×</button>
                  </header>
                  <div class="reflect-modal-body">
                    <div id="u_reflectApplyHistory" class="reflect-apply-history" aria-live="polite"></div>
                  </div>
                  <footer class="reflect-modal-foot">
                    <button type="button" class="btn sub" data-act="exportApplyHistory">JSONで書き出し</button>
                    <button type="button" class="btn sub" data-act="closeReflectModal" data-modal="history">閉じる</button>
                  </footer>
                </div>
              </div>

              <!-- モーダル: レポート -->
              <div class="reflect-modal-overlay" id="u_reflectReportModal" hidden>
                <div class="reflect-modal-backdrop" data-act="closeReflectModal" data-modal="report"></div>
                <div class="reflect-modal-card reflect-modal-card--md" role="dialog" aria-modal="true" aria-labelledby="u_reflectReportModalTitle">
                  <header class="reflect-modal-head">
                    <div>
                      <div class="reflect-modal-kicker">📊 レポート</div>
                      <h3 class="reflect-modal-title" id="u_reflectReportModalTitle">直近の反映結果</h3>
                      <p class="reflect-modal-sub">最後に実行した反映のセクション別成否を確認します。</p>
                    </div>
                    <button type="button" class="reflect-modal-close" data-act="closeReflectModal" data-modal="report" aria-label="閉じる">×</button>
                  </header>
                  <div class="reflect-modal-body">
                    <div id="u_reflectApplyReport" class="reflect-apply-report" aria-live="polite"></div>
                  </div>
                  <footer class="reflect-modal-foot">
                    <button type="button" class="btn sub" data-act="closeReflectModal" data-modal="report">閉じる</button>
                  </footer>
                </div>
              </div>

              <!-- モーダル: 補助操作 -->
              <div class="reflect-modal-overlay" id="u_reflectSupportModal" hidden>
                <div class="reflect-modal-backdrop" data-act="closeReflectModal" data-modal="support"></div>
                <div class="reflect-modal-card reflect-modal-card--md" role="dialog" aria-modal="true" aria-labelledby="u_reflectSupportModalTitle">
                  <header class="reflect-modal-head">
                    <div>
                      <div class="reflect-modal-kicker">🛟 補助</div>
                      <h3 class="reflect-modal-title" id="u_reflectSupportModalTitle">バックアップ・復元・差分</h3>
                      <p class="reflect-modal-sub">反映先の保存・復元・プレビュー⇔本番の差分など、運用補助の操作を集めています。</p>
                    </div>
                    <button type="button" class="reflect-modal-close" data-act="closeReflectModal" data-modal="support" aria-label="閉じる">×</button>
                  </header>
                  <div class="reflect-modal-body">
                    <div class="reflect-support-grid">
                      <div class="reflect-support-item">
                        <div class="reflect-support-item__title">プレビュー比較</div>
                        <p class="reflect-support-item__desc">比較先アプリのプレビューと本番の差分を確認します。デプロイ待ちの変更がわかります。</p>
                        <button type="button" class="btn sub" data-act="runPreviewProdDiff" id="u_footerPreviewProdDiff">プレビュー⇔本番を比較</button>
                      </div>
                      <div class="reflect-support-item">
                        <div class="reflect-support-item__title">バックアップ</div>
                        <p class="reflect-support-item__desc">比較先のプレビュー設定をJSONで保存します。反映で選んだセクションが対象です。</p>
                        <button type="button" class="btn sub" data-act="backupTargetPreview">今の比較先を保存</button>
                        <button type="button" class="btn sub" data-act="importTargetPreviewBackupFile">保存済みJSONを読込</button>
                        <button type="button" class="btn sub" data-act="restoreTargetPreviewBackup">直前保存を戻す</button>
                        <input type="file" id="u_targetPreviewBackupFileInput" accept="application/json" style="display:none">
                      </div>
                      <div class="reflect-support-item">
                        <div class="reflect-support-item__title">ドライラン</div>
                        <p class="reflect-support-item__desc">APIを実行せず、予定リクエスト一式をJSONで保存します。</p>
                        <button type="button" class="btn sub" data-act="exportDryRunPlan" id="u_footerDryRun">ドライランJSONを保存</button>
                      </div>
                      <div class="reflect-support-item">
                        <div class="reflect-support-item__title">フィールド調整</div>
                        <p class="reflect-support-item__desc">比較元と比較先のフィールド設定を、kintoneのフォーム設定風に並べて調整できます。</p>
                        <button type="button" class="btn sub" data-act="openReflectPreviewEditor" id="u_openFieldEditorBtn">フィールド設定エディタ</button>
                      </div>
                      <div class="reflect-support-item">
                        <div class="reflect-support-item__title">他設定エディタ</div>
                        <p class="reflect-support-item__desc">ビュー / レイアウト / プロセス管理 / 通知 / 権限などをセクション単位で調整します。</p>
                        <button type="button" class="btn sub" data-act="openSectionPreviewEditor">他設定エディタを開く</button>
                      </div>
                    </div>
                    <div id="u_backupStatus" style="display:none;margin-top:10px;padding:6px 10px;border-radius:6px;font-size:11px;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46"></div>
                  </div>
                  <footer class="reflect-modal-foot">
                    <button type="button" class="btn sub" data-act="closeReflectModal" data-modal="support">閉じる</button>
                  </footer>
                </div>
              </div>

              <!-- モーダル: フィールド設定エディタ（既存ペイン） -->
              <div class="reflect-modal-overlay" id="u_reflectFieldEditorModal" hidden>
                <div class="reflect-modal-backdrop" data-act="closeReflectModal" data-modal="fieldEditor"></div>
                <div class="reflect-modal-card reflect-modal-card--xl" role="dialog" aria-modal="true">
                  <header class="reflect-modal-head">
                    <div>
                      <div class="reflect-modal-kicker">🧱 フィールド調整</div>
                      <h3 class="reflect-modal-title">フィールド設定エディタ</h3>
                      <p class="reflect-modal-sub">kintoneの「フォーム設定」風に、比較元⇔比較先のフィールドを並べ替え・上書きできます。</p>
                    </div>
                    <button type="button" class="reflect-modal-close" data-act="closeReflectModal" data-modal="fieldEditor" aria-label="閉じる">×</button>
                  </header>
                  <div class="reflect-modal-body">
                    <section class="opt-card reflect-preview-editor-card" id="u_reflectPreviewEditorFold">
                      <p class="reflect-preview-editor-lead">フィールドを並べ替えたり、比較元カードから比較先カードへドラッグ＆ドロップで設定上書き（code/typeは保持）できます。JSON編集とUndoにも対応します。</p>
                      <div id="u_reflectPreviewPlayground" class="reflect-preview-playground"></div>
                    </section>
                  </div>
                  <footer class="reflect-modal-foot">
                    <button type="button" class="btn sub" data-act="closeReflectModal" data-modal="fieldEditor">閉じる</button>
                  </footer>
                </div>
              </div>

              <!-- モーダル: 他設定エディタ（既存ペイン） -->
              <div class="reflect-modal-overlay" id="u_reflectOtherEditorModal" hidden>
                <div class="reflect-modal-backdrop" data-act="closeReflectModal" data-modal="otherEditor"></div>
                <div class="reflect-modal-card reflect-modal-card--xl" role="dialog" aria-modal="true">
                  <header class="reflect-modal-head">
                    <div>
                      <div class="reflect-modal-kicker">🧩 他設定</div>
                      <h3 class="reflect-modal-title">他設定エディタ</h3>
                      <p class="reflect-modal-sub">セクション（ビュー・レイアウト・プロセス管理・通知・権限など）を選び、比較先JSONを直接調整できます。</p>
                    </div>
                    <button type="button" class="reflect-modal-close" data-act="closeReflectModal" data-modal="otherEditor" aria-label="閉じる">×</button>
                  </header>
                  <div class="reflect-modal-body">
                    <section class="opt-card">
                      <div id="u_sectionPreviewEditor" class="section-preview-editor"></div>
                    </section>
                  </div>
                  <footer class="reflect-modal-foot">
                    <button type="button" class="btn sub" data-act="closeReflectModal" data-modal="otherEditor">閉じる</button>
                  </footer>
                </div>
              </div>

              <!-- 後方互換: ロジック側が参照する隠しスロット -->
              <div class="reflect-legacy-slots" hidden aria-hidden="true">
                <div id="u_applyScopeBlock"><div class="chips diff-scope-chips" id="u_applyScopes"></div></div>
                <div id="u_reflectMainTitle"></div>
                <div id="u_reflectAssist"></div>
                <div id="u_reflectHowto"></div>
                <div id="u_reflectOverview"></div>
                <div class="reflect-layout" id="u_reflectLayout"></div>
                <input type="checkbox" id="u_nodeMode">
                <label class="reflect-simple-toggle chip"><input type="checkbox" id="u_reflectSimpleMode"></label>
                <button type="button" id="u_modeSectionBtn" data-act="reflectModeSection"></button>
                <button type="button" id="u_modeNodeBtn" data-act="reflectModeNode"></button>
                <button data-act="togglePatchJsonPanel"></button>
              </div>
            </div>
            <div class="pane" data-pane="field">
              <div class="subtabs">
                <button class="subtab active" data-subtab-parent="field" data-subtab="json">JSON編集</button>
                <button class="subtab" data-subtab-parent="field" data-subtab="source">比較元から追加</button>
                <button class="subtab" data-subtab-parent="field" data-subtab="bulk">一括整備</button>
              </div>
              <div class="subpane active" data-subpane-parent="field" data-subpane="json">
                <div class="subpane-note">フィールド定義JSONを直接編集して、比較先へ反映します。</div>
              <details class="diff-fold diff-fold--field-json" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">JSONの編集と反映</span>
                  <span class="diff-fold-sub">properties 形式・上書きオプション</span>
                </summary>
                <div class="diff-fold-body">
              <div style="margin-top:0">
                <label title="kintone の field 定義と同じ properties オブジェクト">追加フィールドJSON（properties形式）</label>
                <div id="u_fieldJson" style="width:100%;height:300px;border-radius:6px;"></div>
              </div>
              <div class="grid2" style="margin-top:8px">
                <label class="chip" title="既存の同一 code のフィールドを置き換えます"><input type="checkbox" id="u_overwriteField"> 同一コードは上書き</label>
                <span class="muted" style="font-size:11px;align-self:center;line-height:1.45">本番デプロイはツールから実行できません。</span>
              </div>
              <input type="checkbox" id="u_deployField" disabled style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none" tabindex="-1" aria-hidden="true" title="">
              <div class="btns">
                <button type="button" class="btn warn" data-act="applyField" title="比較先プレビューにフィールドを追加・更新します">比較先(プレビュー)へフィールド適用</button>
                <button type="button" class="btn sub" data-act="loadTargetFields" title="現在の比較先アプリの fields.json を読み込み">比較先の現在値を読込</button>
                <button type="button" class="btn sub" data-act="formatFieldJson" style="margin-left:8px">JSON整形</button>
                <button type="button" class="btn sub" data-act="importFieldJson">JSONファイル読込</button>
                <button type="button" class="btn sub" data-act="exportFieldJson">JSON保存</button>
              </div>
                </div>
              </details>
              </div>
              <div class="subpane" data-subpane-parent="field" data-subpane="source">
                <div class="subpane-note">比較元アプリの既存フィールドを選択して JSON に取り込みます。</div>
              <details class="diff-fold diff-fold--field-src" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">比較元からフィールドを選んでマージ</span>
                  <span class="diff-fold-sub">一覧取得 → チェック → JSON に挿入</span>
                </summary>
                <div class="diff-fold-body">
              <div style="margin-top:0">
                <div class="step" style="font-size:12px;margin-bottom:6px">比較元アプリから選択して追加</div>
                <div class="btns">
                  <button type="button" class="btn sub" data-act="loadSourceFieldsList" title="比較元アプリのフィールド一覧APIを呼び出します">比較元フィールド一覧を取得</button>
                </div>
                <div id="u_sourceFieldListContainer" style="display:none;margin-top:8px">
                  <div style="max-height:220px;overflow:auto;border:1px solid #cbd5e1;background:#fff;border-radius:6px;padding:4px">
                    <table style="border:none;margin:0" id="u_sourceFieldTable">
                      <thead style="position:sticky;top:-4px;background:#f8fafc;z-index:1;box-shadow:0 1px 0 #e2e8f0">
                        <tr>
                          <th style="width:30px;text-align:center"><input type="checkbox" id="u_sourceFieldCheckAll" title="表示中の全行を選択"></th>
                          <th>コード / ラベル</th>
                          <th style="width:120px">タイプ</th>
                        </tr>
                      </thead>
                      <tbody id="u_sourceFieldTbody"></tbody>
                    </table>
                  </div>
                  <div class="btns" style="margin-top:8px">
                    <button type="button" class="btn ok" data-act="insertSelectedSourceFields" title="上の JSON エディタにマージします">選択したフィールドをJSONに挿入（マージ）</button>
                    <button type="button" class="btn sub" data-act="closeSourceFieldsList">閉じる</button>
                  </div>
                </div>
              </div>
                </div>
              </details>
              </div>
              <div class="subpane" data-subpane-parent="field" data-subpane="bulk">
              <details class="diff-fold diff-fold--field-bulk" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">フィールド一括操作（比較先）</span>
                  <span class="diff-fold-sub">プレフィックス変換 → 上のJSONへ出力</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="font-size:12px;margin-bottom:6px">フィールド一括操作（比較先アプリ）</div>
              <div class="muted" style="margin-bottom:8px;line-height:1.55">比較先アプリの現在のフィールドを元に一括操作し、上の「追加フィールドJSON」に結果を出力します。未使用候補の調査は「分析 > 影響分析」に集約しました。</div>
              <div class="grid2" style="margin-bottom:6px">
                <div>
                  <label title="各フィールド code の先頭に付与する文字列">プレフィックス（コード先頭に追加）</label>
                  <input type="text" id="u_fieldPrefix" placeholder="例: bk_" title="空にしないで実行してください（追加モード時）">
                </div>
                <div style="display:flex;align-items:flex-end">
                  <label class="chip" title="指定プレフィックスで始まる code から先頭を削ります"><input type="checkbox" id="u_fieldPrefixRemove"> プレフィックスを削除する</label>
                </div>
              </div>
              <div class="btns">
                <button type="button" class="btn ok" data-act="runBulkFieldRename" title="比較先のフィールド定義を読み、結果をJSON欄に反映">プレフィックス追加/削除を実行</button>
                <button type="button" class="btn sub" data-act="openAnalyzeFieldImpactUnused" title="分析タブの未使用フィルタへ移動します">未使用候補は分析で確認</button>
              </div>
              <div id="u_bulkFieldResult" class="result" style="max-height:150px;margin-top:8px;display:none;padding:8px;font-size:11px"></div>
                </div>
              </details>
              </div>

              <input type="file" id="u_fieldJsonFile" accept=".json" style="display:none">
            </div>

            <div class="pane" data-pane="design">
              <div class="subpane active" data-subpane-parent="design" data-subpane="export">
              <div class="subpane-note">比較元アプリの設定を設計書として出力します。</div>
              <details class="diff-fold diff-fold--design-export" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">設計書出力</span>
                  <span class="diff-fold-sub">Markdown / Excel 形式で出力</span>
                </summary>
                <div class="diff-fold-body">
              <div class="btns" style="margin-top:0">
                <button type="button" class="btn dark" data-act="exportDesignXlsx" title="表形式のExcel設計書を出力します">設計書Excel出力</button>
                <button type="button" class="btn sub" data-act="exportDesignMd" title="ドキュメント向けMarkdownファイル">設計書Markdown出力</button>
                <button type="button" class="btn sub" data-act="copyDesignMd" title="Markdownをクリップボードにコピー">Markdownコピー</button>
              </div>
                </div>
              </details>
              <details class="diff-fold diff-fold--design-diff">
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">設計書差分レポート</span>
                  <span class="diff-fold-sub">2アプリ間の設計書をMarkdownレベルで比較</span>
                </summary>
                <div class="diff-fold-body">
              <div class="muted" style="margin-top:0;line-height:1.6">比較元・比較先の設計書内容を比較し、差分をMarkdownレポートとして出力します。</div>
              <div class="btns" style="margin-top:8px">
                <button type="button" class="btn ok" data-act="exportDesignDiffMd" title="比較元・比較先の設計書MDを生成して差分をまとめます">設計書差分レポート出力</button>
              </div>
                </div>
              </details>
              </div>
            </div>

            <div class="pane" data-pane="jsconfig">
              <div class="subtabs">
                <button class="subtab active" data-subtab-parent="jsconfig" data-subtab="editor">設定編集</button>
                <button class="subtab" data-subtab-parent="jsconfig" data-subtab="batch">一括ダウンロード</button>
              </div>
              <div class="subpane active" data-subpane-parent="jsconfig" data-subpane="editor">
                <div class="subpane-note">単一アプリの JS/CSS 設定を取得・編集・反映します。</div>
              <details class="diff-fold diff-fold--jsconfig-edit" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">JS/CSS設定の取得・編集・反映</span>
                  <span class="diff-fold-sub">/app/customize.json</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">JS/CSS設定の取得・表示・反映</div>
              <div class="muted" style="margin-top:8px;line-height:1.6">比較元アプリIDの JS/CSS カスタマイズ設定（<code>/app/customize.json</code>）を取得・表示します。編集後に比較先(プレビュー)へ反映も可能です。</div>
              <div class="grid2" style="margin-top:8px">
                <label class="chip" title="プレビュー環境のカスタマイズ設定を読みます"><input type="checkbox" id="u_jsconfigPreview"> プレビュー版を取得</label>
                <span class="muted" style="font-size:11px;align-self:center;line-height:1.45">反映後のデプロイは管理画面で手動行ってください。</span>
              </div>
              <input type="checkbox" id="u_jsconfigDeployAfter" disabled style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none" tabindex="-1" aria-hidden="true" title="">
              <div class="btns">
                <button type="button" class="btn" data-act="fetchJsConfig" title="比較元アプリIDで customize.json を取得">JS/CSS設定を取得</button>
                <button type="button" class="btn sub" data-act="exportJsConfigJson">JSON出力</button>
                <button type="button" class="btn sub" data-act="importJsConfigJson">JSONファイル読込</button>
                <button type="button" class="btn warn" data-act="applyJsConfig" title="下のJSONを比較先プレビューへ">比較先(プレビュー)へ反映</button>
              </div>
              <div style="margin-top:8px">
                <label>JS/CSS設定JSON（編集可能）</label>
                <textarea id="u_jsconfigJson" style="min-height:140px" placeholder='{"desktop":{"js":[...],"css":[...]},"mobile":{"js":[...],"css":[...]}}' title="desktop / mobile の js・css 配列"></textarea>
              </div>
              <div class="result" id="u_jsconfigResult" style="max-height:300px;margin-top:8px"></div>
              <input type="file" id="u_jsconfigFile" accept=".json" style="display:none">
                </div>
              </details>
              </div>
              <div class="subpane" data-subpane-parent="jsconfig" data-subpane="batch">
                <div class="subpane-note">比較先のスペース配下にある複数アプリの JS/CSS 実ファイルをまとめて取得します。</div>
              <details class="diff-fold diff-fold--jsconfig-batch" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">全アプリ JS/CSS 一括ZIP（比較先）</span>
                  <span class="diff-fold-sub">スペース内アプリを走査</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">全アプリのJS/CSS一括ダウンロード（比較先）</div>
              <div class="muted" style="margin-top:8px;line-height:1.6">現在アクセスしているスペース（またはゲストスペース）内の全アプリをスキャンし、JS/CSSファイルの添付そのものを一括でZIP化します。設定一括取得の <code>customize.json</code> バックアップとは用途が異なります。</div>
              <div class="btns" style="margin-top:10px">
                <button type="button" class="btn ok" data-act="runBatchJsConfigDownload" title="時間がかかる場合があります">全アプリのJS/CSSを一括ダウンロード（ZIP）</button>
              </div>
                </div>
              </details>
              </div>
            </div>

            <div class="pane" data-pane="recordMgr">
              <div class="subtabs">
                <button class="subtab active" data-subtab-parent="recordMgr" data-subtab="status">ステータス更新</button>
                <button class="subtab" data-subtab-parent="recordMgr" data-subtab="files">添付DL</button>
                <button class="subtab" data-subtab-parent="recordMgr" data-subtab="csv">CSV</button>
                <button class="subtab" data-subtab-parent="recordMgr" data-subtab="backup">バックアップ</button>
                <button class="subtab" data-subtab-parent="recordMgr" data-subtab="copy">アプリ間コピー</button>
              </div>
              <div class="subpane active" data-subpane-parent="recordMgr" data-subpane="status">
                <div class="subpane-note">一覧条件に合うレコードのプロセス管理を一括で進めます。</div>
              <details class="diff-fold diff-fold--rec-status" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">ステータス一括更新（比較先）</span>
                  <span class="diff-fold-sub">一覧とアクションを指定してプロセス進行</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">ステータス一括更新（比較先アプリ）</div>
              <div class="muted" style="margin-top:8px;line-height:1.55">一覧条件に合致する全レコードのプロセス管理ステータスを一括で進めます。</div>
              <div class="grid2" style="margin-top:8px">
                <div>
                  <label title="APIで一覧を取得して選ぶか、クエリ文字列を直接指定">対象一覧（一覧ID / クエリ）</label>
                  <div style="display:flex;gap:4px">
                    <input type="text" id="u_batchProcView" placeholder="一覧を選択 (APIから取得)" style="flex:1">
                    <button type="button" class="btn sm" data-act="loadViewsForProc">一覧取得</button>
                  </div>
                  <select id="u_batchProcViewSelect" style="display:none;margin-top:4px"></select>
                </div>
                <div>
                  <label title="プロセス管理で定義したアクション名">アクション名</label>
                  <input type="text" id="u_batchProcAction" placeholder="例: 承認, 差し戻し">
                </div>
                <div>
                  <label title="空欄可">次の処理者 (オプション)</label>
                  <input type="text" id="u_batchProcAssignee" placeholder="ログイン名">
                </div>
              </div>
              <div class="btns" style="margin-top:10px">
                <button type="button" class="btn ok" data-act="runBatchProcess" title="対象レコードすべてにアクションを適用">一括更新を実行</button>
              </div>
                </div>
              </details>
              </div>
              <div class="subpane" data-subpane-parent="recordMgr" data-subpane="files">
                <div class="subpane-note">一覧条件に合う添付ファイルをまとめて ZIP 取得します。</div>
              <details class="diff-fold diff-fold--rec-files" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">添付ファイル一括ZIP（比較先）</span>
                  <span class="diff-fold-sub">一覧・ファイルフィールド・ZIP名</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">添付ファイル一括DL（比較先アプリ）</div>
              <div class="muted" style="margin-top:8px;line-height:1.55">一覧条件に合致する全レコードの添付ファイルをZIP形式で一括ダウンロードします。</div>
              <div class="grid2" style="margin-top:8px">
                <div>
                  <label>対象一覧（一覧ID / クエリ）</label>
                  <div style="display:flex;gap:4px">
                    <input type="text" id="u_batchDlView" placeholder="一覧を選択 (APIから取得)" style="flex:1">
                    <button type="button" class="btn sm" data-act="loadViewsForDl">一覧取得</button>
                  </div>
                  <select id="u_batchDlViewSelect" style="display:none;margin-top:4px"></select>
                </div>
                <div>
                  <label title="添付ファイル型フィールドのフィールドコード">ファイルフィールドコード</label>
                  <input type="text" id="u_batchDlFileCode" value="添付ファイル">
                </div>
                <div>
                  <label title="ZIP内のサブフォルダ名に使うフィールド">フォルダ名フィールド</label>
                  <input type="text" id="u_batchDlFolderCode" placeholder="空ならレコード番号">
                </div>
                <div>
                  <label>ZIPファイル名</label>
                  <input type="text" id="u_batchDlZipName" value="download_files.zip">
                </div>
              </div>
              <div class="btns" style="margin-top:10px">
                <button type="button" class="btn ok" data-act="runBatchFileDownload">一括ダウンロードを実行</button>
              </div>
                </div>
              </details>
              </div>
              <div class="subpane" data-subpane-parent="recordMgr" data-subpane="csv">
                <div class="subpane-note">CSV のエクスポートとインポートを同じ場所にまとめています。</div>
              <details class="diff-fold diff-fold--rec-csv-exp" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">CSVエクスポート（比較先）</span>
                  <span class="diff-fold-sub">一覧条件で全件出力</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">レコードCSVエクスポート（比較先アプリ）</div>
              <div class="muted" style="margin-top:8px;line-height:1.55">一覧条件に合致する全レコードをCSV形式（UTF-8, BOM付き）でエクスポートします。</div>
              <div class="grid2" style="margin-top:8px">
                <div>
                  <label>対象一覧（一覧ID / クエリ）</label>
                  <div style="display:flex;gap:4px">
                    <input type="text" id="u_csvExportView" placeholder="一覧を選択 (APIから取得)" style="flex:1">
                    <button type="button" class="btn sm" data-act="loadViewsForCsv">一覧取得</button>
                  </div>
                  <select id="u_csvExportViewSelect" style="display:none;margin-top:4px"></select>
                </div>
                <div>
                  <label>CSVファイル名</label>
                  <input type="text" id="u_csvExportName" value="records.csv">
                </div>
              </div>
              <div class="btns" style="margin-top:10px">
                <button type="button" class="btn ok" data-act="runCsvExport">CSVエクスポートを実行</button>
              </div>
                </div>
              </details>
              <details class="diff-fold diff-fold--rec-csv-imp" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">CSVインポート（比較先）</span>
                  <span class="diff-fold-sub">ヘッダ行にフィールドコード</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">レコードCSVインポート（比較先アプリ）</div>
              <div class="muted" style="margin-top:8px;line-height:1.55">CSVファイルからレコードを一括登録します。1行目がフィールドコードのヘッダ行である必要があります。</div>
              <div class="grid2" style="margin-top:8px">
                <div style="display:flex;align-items:center">
                  <input type="file" id="u_csvImportFile" accept=".csv" style="display:none" onchange="document.getElementById('u_csvImportFileName').textContent=this.files[0]?this.files[0].name:'未選択'">
                  <button type="button" class="btn sm" onclick="document.getElementById('u_csvImportFile').click()">CSVファイルを選択</button>
                  <span id="u_csvImportFileName" class="muted" style="margin-left:8px;font-size:12px">未選択</span>
                </div>
              </div>
              <div class="btns" style="margin-top:10px">
                <button type="button" class="btn warn" data-act="runCsvImport" title="既存レコードの更新ルールはAPI仕様に従います">CSVから一括登録を実行</button>
              </div>
                </div>
              </details>
              </div>
              <div class="subpane" data-subpane-parent="recordMgr" data-subpane="backup">
                <div class="subpane-note">対象レコードを CSV・添付ファイル・コメント込みで ZIP バックアップし、必要に応じてアプリ設定JSONも同梱します。</div>
              <details class="diff-fold diff-fold--rec-backup" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">データバックアップ（比較先）</span>
                  <span class="diff-fold-sub">CSV + 添付 + コメント + 任意で設定JSON</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">データ一括バックアップ（比較先アプリ）</div>
              <div class="muted" style="margin-top:8px;line-height:1.6">一覧条件に合致するレコードをバックアップします。ZIP には <code>records.csv</code>、添付ファイル、コメントJSON、マニフェストに加えて、必要なら <code>app_settings/</code> 配下へアプリ設定JSONもまとめて保存します。設定だけを取りたい場合は「設定一括取得」を使う方が軽量です。</div>
              <div class="grid2" style="margin-top:8px">
                <div>
                  <label>対象一覧（一覧ID / クエリ）</label>
                  <div style="display:flex;gap:4px">
                    <input type="text" id="u_recordBackupView" placeholder="一覧を選択 (APIから取得)" style="flex:1">
                    <button type="button" class="btn sm" data-act="loadViewsForBackup">一覧取得</button>
                  </div>
                  <select id="u_recordBackupViewSelect" style="display:none;margin-top:4px"></select>
                </div>
                <div>
                  <label>ZIPファイル名</label>
                  <input type="text" id="u_recordBackupZipName" value="record_backup.zip">
                </div>
              </div>
              <div class="chips" style="margin-top:8px">
                <label class="chip" title="添付ファイル型フィールドとサブテーブル内の添付をまとめて保存します"><input type="checkbox" id="u_recordBackupIncludeFiles" checked> 添付ファイルを含める</label>
                <label class="chip" title="各レコードのコメントを JSON で保存します"><input type="checkbox" id="u_recordBackupIncludeComments" checked> コメントを含める</label>
                <label class="chip" title="同じ比較先アプリの設定JSONも ZIP に同梱します。JS/CSS設定も対象にできます"><input type="checkbox" id="u_recordBackupIncludeAppSettings" checked> アプリ設定も含める</label>
                <label class="chip" title="APIラボのプラグイン設定取得APIも試します。アプリ設定を含める時のみ利用します"><input type="checkbox" id="u_recordBackupIncludePluginConfig"> プラグイン設定も取得</label>
              </div>
              <div style="margin-top:10px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc">
                <div style="display:flex;gap:8px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap">
                  <div>
                    <div style="font-size:11px;color:#64748b;font-weight:700">同梱するアプリ設定JSON</div>
                    <div class="muted" style="margin-top:2px;font-size:11px;line-height:1.5">JS/CSS設定を含めて、必要な設定セクションを選べます。アプリ設定を含める時だけ使います。</div>
                  </div>
                  <div class="btns" style="margin-top:0">
                    <button type="button" class="btn sub" data-act="recordBackupScopeAll" title="同梱する設定セクションをすべてオンにします">全選択</button>
                    <button type="button" class="btn sub" data-act="recordBackupScopeNone" title="同梱する設定セクションをすべてオフにします">全解除</button>
                  </div>
                </div>
                <div class="chips diff-scope-chips" id="u_recordBackupAppScopes" style="margin-top:8px">
                  ${SETTINGS_EXPORT_SCOPE_DEFS.map((s) =>
                    `<label class="chip" title="${esc(s.label)} を同梱します"><input type="checkbox" value="${s.key}" checked>${s.label}</label>`
                  ).join('')}
                </div>
              </div>
              <div class="btns" style="margin-top:10px">
                <button type="button" class="btn dark" data-act="runRecordBackup" title="CSV・添付・コメントに加えて、必要ならアプリ設定JSONも同梱したZIPを作成します">バックアップを実行</button>
              </div>
              <div class="result" id="u_recordBackupResult" style="max-height:220px;margin-top:8px"></div>
                </div>
              </details>
              </div>
              <div class="subpane" data-subpane-parent="recordMgr" data-subpane="copy">
                <div class="subpane-note">比較元アプリのレコードを比較先へまとめて複製します。</div>
              <details class="diff-fold diff-fold--rec-copy" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">アプリ間レコードコピー（比較元→比較先）</span>
                  <span class="diff-fold-sub">型不一致・添付は注意</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">アプリ間レコード一括コピー（比較元 → 比較先）</div>
              <div class="muted" style="margin-top:8px;line-height:1.6">比較元アプリのレコードを取得し、比較先アプリへそのままコピーします。※フィールドコードや型が一致する項目のみ正常に転送されます。<br>ルックアップ項目やプロセス管理、添付ファイル等は正しくコピーできない場合があります。</div>
              <div class="grid2" style="margin-top:8px">
                <div>
                  <label title="kintone レコード取得APIの query に相当">コピー対象（比較元）のクエリ</label>
                  <input type="text" id="u_recordCopyQuery" placeholder="例: order by $id asc" value="order by $id asc">
                </div>
              </div>
              <div class="btns" style="margin-top:10px">
                <button type="button" class="btn warn" data-act="runRecordCopy" title="大量レコードは時間とAPI制限に注意">比較先へレコードをコピー</button>
              </div>
                </div>
              </details>
              </div>
            </div>

            
            <div class="pane" data-pane="er">
              <div class="subpane active" data-subpane-parent="er" data-subpane="diagram">
                <div class="subpane-note">比較元アプリを起点に、ルックアップ・関連レコード・アクションでつながるアプリを図にします。</div>
                <div class="er-route-panel">
                  <div class="er-route-main">
                    <div class="er-route-copy">
                      <div class="er-route-badge">標準生成</div>
                      <div class="er-route-title">現在の比較元アプリからER図を開く</div>
                      <div class="er-route-sub">通常はこのまま生成できます。探索範囲を広げる場合だけ詳細オプションを調整してください。</div>
                      <div class="er-route-meta" aria-label="標準設定">
                        <span>Dagre</span>
                        <span>標準密度</span>
                        <span>サブテーブルON</span>
                      </div>
                    </div>
                    <div class="er-route-actions">
                      <button type="button" class="btn" data-act="generateERDiagram" title="新しいタブでインタラクティブなERを開きます">ER図を開く</button>
                      <button type="button" class="btn sub" data-act="exportERDiagramHtml" title="単体HTMLファイルとして保存">HTML保存</button>
                    </div>
                  </div>
                  <details class="er-route-details">
                    <summary>
                      <span>詳細オプション</span>
                      <small>追加起点・表示密度・逆引き探索</small>
                    </summary>
                    <div class="er-option-grid">
                      <div>
                        <label title="Cytoscape のレイアウトアルゴリズム">初期レイアウト</label>
                        <select id="u_erLayout" title="グラフの並べ方">
                          <option value="dagre">Dagre（推奨）</option>
                          <option value="breadthfirst">ツリー</option>
                          <option value="cose">フォース</option>
                          <option value="concentric">同心円</option>
                          <option value="grid">グリッド</option>
                          <option value="circle">円形</option>
                        </select>
                      </div>
                      <div>
                        <label title="フィールド表示の粒度">表示密度</label>
                        <select id="u_erFieldDensity">
                          <option value="compact">簡易</option>
                          <option value="standard" selected>標準</option>
                          <option value="full">詳細</option>
                        </select>
                      </div>
                      <div>
                        <label title="0 は無制限に近い挙動（実装上の上限あり）">探索深さ</label>
                        <input type="text" id="u_erMaxDepth" value="0" placeholder="0で無制限">
                      </div>
                      <div>
                        <label title="カンマ区切りで複数指定">追加の起点アプリID</label>
                        <input type="text" id="u_erExtraApps" value="" placeholder="例: 123, 456, 789">
                      </div>
                    </div>
                    <div class="er-option-chips">
                      <label class="chip" title="サブテーブル内フィールドもERに含めます"><input type="checkbox" id="u_erIncludeSubtable" checked> サブテーブル項目を含める</label>
                      <label class="chip" title="参照先だけでなく、現在アプリを参照しているアプリも探索します（全アプリを走査）"><input type="checkbox" id="u_erIncludeReverseLookup"> 逆引き探索を有効化</label>
                    </div>
                    <div class="er-support-actions">
                      <button type="button" class="btn sub" data-act="openAnalyzeFieldGraph" title="フィールド依存関係は分析タブへ移動しました">フィールド依存は分析で確認</button>
                    </div>
                  </details>
                </div>
              </div>
            </div>

            <div class="pane" data-pane="apiTester">
              <details class="diff-fold diff-fold--api" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">kintone API テスター</span>
                  <span class="diff-fold-sub">kintone.api を直接呼び出し</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">リクエストの組み立てと実行</div>
              <div class="muted" style="margin-top:8px;line-height:1.55">指定したエンドポイントに対して kintone.api を直接実行し、レスポンスを確認します。※ゲストスペースIDを指定すると <code>/k/guest/{id}/v1/...</code> 等が使われます。<strong>POST/PUT/DELETE</strong> は <code>/v1/preview/</code> を含むパスのみ可能です（本番への書き込み・デプロイAPIは不可）。</div>
              <div class="grid2" style="margin-top:8px">
                <div>
                  <label title="よく使うAPIを選ぶと、メソッド・パス・Bodyの参考値を反映します">APIプリセット（参考値）</label>
                  <select id="u_apiTesterPreset">
                    <option value="">-- プリセットを選択 --</option>
                  </select>
                </div>
                <div>
                  <label>補足</label>
                  <div id="u_apiTesterPresetHint" class="muted" style="min-height:34px;padding:8px 10px;border:1px dashed #cbd5e1;border-radius:7px;background:#f8fafc;">プリセットを選択すると、入力例と注意点が表示されます。</div>
                </div>
              </div>
              <div class="api-tester-layout">
                <div class="api-tester-main">
                  <div class="grid2">
                    <div>
                      <label>メソッド</label>
                      <select id="u_apiTesterMethod" title="HTTP メソッド">
                        <option value="GET" selected>GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </div>
                    <div>
                      <label title="相対パスまたは完全URL">エンドポイント（パス または URL）</label>
                      <input type="text" id="u_apiTesterPath" list="u_apiTesterPathSuggest" placeholder="書き込み例: /k/v1/preview/app/form/fields.json">
                      <datalist id="u_apiTesterPathSuggest"></datalist>
                    </div>
                  </div>
                  <div style="margin-top:8px">
                    <label title="GET のときは無視されることがあります">リクエストBody (JSONフォーマット)</label>
                    <textarea id="u_apiTesterBody" style="min-height:100px;font-family:monospace" placeholder='{"app": 1, "id": 100}'></textarea>
                  </div>
                  <div class="btns" style="margin-top:10px;display:flex;">
                    <button type="button" class="btn warn" data-act="runApiTester" title="GETは本番パス可。POST/PUT/DELETEはプレビューパスのみ">APIを実行</button>
                    <button type="button" class="btn sub" data-act="clearApiTesterHistory" style="margin-left:auto;">履歴クリア</button>
                  </div>
                  <div class="result" id="u_apiTesterResult" style="max-height:300px;margin-top:8px;overflow:auto">実行結果がここに表示されます</div>
                </div>
                <aside class="api-tester-side">
                  <div class="api-tester-side-title">最近の実行履歴</div>
                  <div id="u_apiTesterHistoryList" class="api-tester-history-list">
                    <div style="color:#94a3b8;font-size:11px;font-style:italic;padding:8px;">履歴はありません</div>
                  </div>
                </aside>
              </div>
                </div>
              </details>
            </div>

            <div class="pane" data-pane="processFlow">
              <details class="diff-fold diff-fold--proc-main" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">プロセス管理フロー図（Mermaid）</span>
                  <span class="diff-fold-sub">比較元アプリの status.json から生成</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">プロセス管理の可視化（比較元アプリ）</div>
              <div class="muted" style="margin-top:8px;line-height:1.55">比較元アプリのプロセス管理設定からフロー図（Mermaid）を生成し表示します。</div>
              <div class="btns">
                <button type="button" class="btn" data-act="renderProcessFlow" title="下にMermaidソースとプレビューを表示">フロー図を取得・描画</button>
              </div>
              <div class="grid2" style="margin-top:8px">
                <div>
                  <label>Mermaid構文</label>
                  <textarea id="u_mermaidText" style="min-height:200px" readonly title="生成結果（読み取り専用）"></textarea>
                </div>
                <div>
                  <label>フロー図プレビュー</label>
                  <div id="u_mermaidView" style="min-height:200px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;padding:10px;overflow:auto"></div>
                </div>
              </div>
                </div>
              </details>

              <div id="u_simContainer" style="display:none;margin-top:20px">
              <details class="diff-fold diff-fold--proc-sim" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">フローシミュレーション（動作テスト）</span>
                  <span class="diff-fold-sub">フロー図取得後に利用できます</span>
                </summary>
                <div class="diff-fold-body">
                <div class="muted" style="margin-top:0;line-height:1.55">現在のプロセス管理の設定をもとに、擬似的にステータスを進行させてテストします。（上図にハイライト表示されます）</div>
                <div class="grid2" style="margin-top:8px; align-items:flex-end;">
                  <div>
                    <label>現在ステータス</label>
                    <div id="u_simCurrentStatus" style="padding:5px 12px;background:#e2e8f0;border-radius:4px;font-weight:bold;text-align:center;color:#0f172a;min-height:30px;box-sizing:border-box">未開始</div>
                  </div>
                  <div>
                    <label>アクション実行</label>
                    <div style="display:flex;gap:4px">
                      <select id="u_simActionSelect" style="flex:1" disabled title="利用可能なアクションが入ります"><option value="">-- 開始してください --</option></select>
                      <button type="button" class="btn ok" data-act="simExecuteAction">実行</button>
                      <button type="button" class="btn sub" data-act="simStart">最初から</button>
                    </div>
                  </div>
                </div>
                </div>
              </details>
              </div>
            </div>

            <div class="pane" data-pane="settingsExport">
              <div class="subtabs">
                <button class="subtab active" data-subtab-parent="settingsExport" data-subtab="export">一括取得</button>
                <button class="subtab" data-subtab-parent="settingsExport" data-subtab="template">テンプレート</button>
              </div>
              <div class="subpane active" data-subpane-parent="settingsExport" data-subpane="export">
                <div class="subpane-note">複数アプリの設定JSONをまとめて保存します。レコードデータや添付のバックアップとは分けています。</div>
              <details class="diff-fold diff-fold--settings-apps" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">対象アプリ・ゲスト・プレビュー</span>
                  <span class="diff-fold-sub">IDリストの編集とアプリ検索</span>
                </summary>
                <div class="diff-fold-body">
              <div class="muted" style="margin-top:0;line-height:1.6">複数アプリの設定をまとめてバックアップします。レコードデータや添付ファイル本体は含まず、JS/CSS は <code>customize.json</code> として保存します。必要に応じてプラグイン設定も一緒に保存できます。</div>
              <div class="grid2" style="margin-top:8px">
                <div>
                  <label title="取得するアプリの数値IDを列挙">対象アプリID（カンマ/改行区切り）</label>
                  <textarea id="u_settingsExportAppIds" style="min-height:88px" placeholder="74, 120, 305" title="カンマ・改行・スペース区切りで複数指定"></textarea>
                  <div class="inline" style="margin-top:8px">
                    <input type="text" id="u_settingsExportSearchKeyword" placeholder="アプリ名で検索" style="flex:1" title="スペース内のアプリを名前で検索し結果からIDを選べます">
                    <button type="button" class="btn sub" data-act="settingsExportSearchApps">検索</button>
                  </div>
                  <div class="result" id="u_settingsExportSearchResult" style="max-height:140px;margin-top:6px"></div>
                </div>
                <div>
                  <label title="ゲストスペース利用時は共通のゲストID">ゲストID（任意 / 全アプリ共通）</label>
                  <input type="text" id="u_settingsExportGuest" placeholder="空で通常空間" title="空欄で通常スペース">
                  <label class="chip" style="margin-top:8px" title="プレビュー環境の設定JSONを取得します"><input type="checkbox" id="u_settingsExportPreview"> プレビュー設定を取得</label>
                  <label class="chip" style="margin-top:8px" title="APIラボのプラグイン設定取得APIも試します。取得できない場合はバックアップ自体は継続します。"><input type="checkbox" id="u_settingsExportIncludePluginConfig"> プラグイン設定も取得</label>
                  <div class="btns" style="margin-top:8px">
                    <button type="button" class="btn sub" data-act="settingsExportUseCurrent" title="今開いているアプリIDをリストに追記">現在のAppを追加</button>
                    <button type="button" class="btn sub" data-act="settingsExportUseSource" title="共通設定の比較元アプリIDを追記">比較元を追加</button>
                    <button type="button" class="btn sub" data-act="settingsExportUseTarget" title="共通設定の比較先アプリIDを追記">比較先を追加</button>
                  </div>
                </div>
              </div>
                </div>
              </details>
              <details class="diff-fold diff-fold--settings-scopes">
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">取得対象セクション</span>
                  <span class="diff-fold-sub">JS/CSS設定を含めて、必要な項目を全部選択できます</span>
                </summary>
                <div class="diff-fold-body">
                <div class="scope-launcher-card">
                  <div class="scope-launcher-copy">
                    <div class="scope-launcher-kicker">ポップアップ選択</div>
                    <div class="scope-launcher-title">取得したいセクションだけをまとめて選びます</div>
                    <div class="scope-launcher-summary" id="u_settingsExportScopeSummary">読み込み中...</div>
                  </div>
                  <div class="scope-launcher-actions">
                    <button type="button" class="btn sub" data-act="openSettingsExportScopePicker">取得対象を選ぶ</button>
                  </div>
                </div>
                </div>
              </details>
              <div class="btns" style="margin-top:10px;align-items:center">
                <span style="font-weight:600;font-size:12px;color:#0f172a;margin-right:4px">▶ 実行:</span>
                <button type="button" class="btn ok" data-act="runSettingsExportJson" title="1ファイルのJSONにまとめて保存">JSONで一括取得</button>
                <button type="button" class="btn dark" data-act="runSettingsExportZip" title="アプリごとに分割してZIP">ZIPで一括取得</button>
                <span style="font-size:11px;color:#64748b;margin-left:6px">※ 上のフォームでアプリIDとセクションを指定後、ここで実行</span>
              </div>
              <div class="result" id="u_settingsExportResult" style="max-height:220px;margin-top:8px"></div>
              </div>
              <div class="subpane" data-subpane-parent="settingsExport" data-subpane="template">
                <div class="subpane-note">比較元アプリの設定をローカル保存して再利用します。</div>
              <details class="diff-fold diff-fold--settings-tpl" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">設定テンプレート（ブラウザ保存）</span>
                  <span class="diff-fold-sub">比較元の全設定を名前付きで保存・復元</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0;font-size:12px;margin-bottom:6px">設定テンプレート管理（保存・再利用）</div>
              <div class="muted" style="margin-bottom:8px;line-height:1.6">現在の比較元アプリの全設定を「テンプレート」としてブラウザに保存します。後で呼び出して「設定ファイル読込」として再利用できます。<br>標準アプリ構成を保存する際に便利です。</div>
              <div class="grid2" style="margin-bottom:6px">
                <div>
                  <label>保存済みデータ一覧</label>
                  <div style="display:flex;gap:4px">
                    <select id="u_templateSelect" style="flex:1" title="localStorage に保存したテンプレート"><option value="">-- 保存済なし --</option></select>
                    <button type="button" class="btn ok" data-act="loadTemplate" title="比較元バンドルとして読み込み">設定復元</button>
                    <button type="button" class="btn sub" data-act="deleteTemplate">削除</button>
                  </div>
                </div>
                <div>
                  <label>新規保存名</label>
                  <div style="display:flex;gap:4px">
                    <input type="text" id="u_templateSaveName" placeholder="例: 顧客管理_標準v1" style="flex:1">
                    <button type="button" class="btn sub" data-act="saveTemplate" title="現在の比較元設定を保存">比較元を保存データに</button>
                  </div>
                </div>
              </div>
                </div>
              </details>
              </div>
            </div>

            <div class="pane" data-pane="analyze">
              <div class="subtabs">
                <button class="subtab active" data-subtab-parent="analyze" data-subtab="dashboard">ダッシュボード</button>
                <button class="subtab" data-subtab-parent="analyze" data-subtab="fieldImpact">影響分析</button>
                <button class="subtab" data-subtab-parent="analyze" data-subtab="notifications">通知設定</button>
                <button class="subtab" data-subtab-parent="analyze" data-subtab="permissions">権限</button>
                <button class="subtab" data-subtab-parent="analyze" data-subtab="layoutPreview">レイアウト</button>
                <button class="subtab" data-subtab-parent="analyze" data-subtab="fieldGraph">依存グラフ</button>
              </div>

              <!-- サブペイン: ダッシュボード -->
              <div class="subpane active" data-subpane-parent="analyze" data-subpane="dashboard">
                <div class="subpane-note">比較元アプリのフィールド参照、通知、権限、レイアウト、カスタマイズをまとめて確認します。詳細調査が必要な領域へすぐ移動できます。</div>
                <section class="opt-card analyze-dashboard-card">
                  <div class="opt-title">影響分析ダッシュボード</div>
                  <div class="btns" style="margin-top:8px">
                    <button type="button" class="btn" data-act="runAnalyzeDashboard">ダッシュボードを更新</button>
                    <button type="button" class="btn sub" data-act="openAnalyzeSubtab" data-analyze-subtab="fieldImpact">フィールド詳細へ</button>
                    <button type="button" class="btn sub" data-act="openAnalyzeSubtab" data-analyze-subtab="fieldGraph">依存グラフへ</button>
                  </div>
                  <div id="u_analyzeDashboardResult" class="result analyze-dashboard-result"></div>
                </section>
              </div>

              <!-- サブペイン: 影響分析 -->
              <div class="subpane" data-subpane-parent="analyze" data-subpane="fieldImpact">
                <div class="subpane-note">フィールドコードがビュー・計算式・プロセス等でどこから参照されているかを横断検索します。未使用候補の確認もここに集約しました。</div>
                <section class="opt-card" style="margin:12px">
                  <div class="opt-title">フィールドコード影響分析</div>
                  <div class="btns" style="margin-top:8px">
                    <input type="text" id="u_analyzeFieldSearch" placeholder="コード/ラベルで検索..." style="flex:1;min-width:120px">
                    <select id="u_analyzeFieldFilter">
                      <option value="">全フィールド</option>
                      <option value="unused">未使用のみ</option>
                      <option value="used">使用中のみ</option>
                    </select>
                    <button type="button" class="btn" data-act="runFieldImpactAnalysis">影響分析を実行</button>
                    <button type="button" class="btn sub" data-act="exportFieldImpactCsv">CSV出力</button>
                  </div>
                  <div id="u_analyzeFieldImpactResult" class="result" style="margin-top:10px;max-height:500px"></div>
                </section>
              </div>

              <!-- サブペイン: 通知設定 -->
              <div class="subpane" data-subpane-parent="analyze" data-subpane="notifications">
                <div class="subpane-note">一般通知・レコード条件通知・リマインダーの3種を統合して可視化します。</div>
                <section class="opt-card" style="margin:12px">
                  <div class="opt-title">通知設定の可視化</div>
                  <div class="btns" style="margin-top:8px">
                    <button type="button" class="btn" data-act="runNotificationVisualizer">通知設定を取得・表示</button>
                  </div>
                  <div id="u_analyzeNotificationResult" class="result" style="margin-top:10px;max-height:500px"></div>
                </section>
              </div>

              <!-- サブペイン: 権限 -->
              <div class="subpane" data-subpane-parent="analyze" data-subpane="permissions">
                <div class="subpane-note">アプリ権限・フィールド権限・レコード権限をマトリクス表で表示します。</div>
                <section class="opt-card" style="margin:12px">
                  <div class="opt-title">権限マトリクスビュー</div>
                  <div class="btns" style="margin-top:8px">
                    <button type="button" class="btn" data-act="runPermissionMatrix">権限情報を取得・表示</button>
                  </div>
                  <div id="u_analyzePermissionResult" class="result" style="margin-top:10px;max-height:500px"></div>
                </section>
              </div>

              <!-- サブペイン: レイアウト -->
              <div class="subpane" data-subpane-parent="analyze" data-subpane="layoutPreview">
                <div class="subpane-note">layout.json を解析して kintone フォームレイアウトを擬似的に再現します。</div>
                <section class="opt-card" style="margin:12px">
                  <div class="opt-title">レイアウトプレビューア</div>
                  <div class="btns" style="margin-top:8px">
                    <button type="button" class="btn" data-act="runLayoutPreview">レイアウトを取得・表示</button>
                    <label class="chip"><input type="checkbox" id="u_analyzeLayoutDiff"> 差分比較モード（比較先と並べて表示）</label>
                  </div>
                  <div id="u_analyzeLayoutResult" class="result" style="margin-top:10px;max-height:600px;overflow:auto"></div>
                </section>
              </div>

              <!-- サブペイン: 依存グラフ -->
              <div class="subpane" data-subpane-parent="analyze" data-subpane="fieldGraph">
                <div class="subpane-note">フィールド間の依存関係（計算式・ルックアップ等）を Cytoscape で可視化します。ERタブの旧依存マップ機能はここに集約しました。</div>
                <section class="opt-card" style="margin:12px">
                  <div class="opt-title">フィールド依存関係グラフ</div>
                  <div class="btns" style="margin-top:8px">
                    <button type="button" class="btn" data-act="runFieldDependencyGraph">依存グラフを生成</button>
                  </div>
                  <div id="u_analyzeFieldGraphResult" style="margin-top:10px"></div>
                </section>
              </div>
            </div>

          </div>

          <div class="kus-host-hidden" aria-hidden="true">
            <div class="status-row status-bar" id="u_statusBar" role="status">
              <div class="status status--neutral" id="u_status">待機中</div>
              <button type="button" class="btn sub status-copy-btn" data-act="copyStatusMessage" title="ステータスをコピー">コピー</button>
            </div>
          </div>
        </div>
        <div class="busy-overlay" id="u_busyOverlay">
          <div class="busy-chip">
            <span class="busy-spinner"></span>
            <span id="u_busyText">処理中...</span>
          </div>
        </div>
        <div class="tour-overlay" id="u_tourOverlay">
          <div class="tour-backdrop" data-act="tourClose"></div>
          <div class="tour-spotlight" id="u_tourSpotlight" style="display:none"></div>
          <div class="tour-card" id="u_tourCard">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
              <div>
                <div class="tour-step" id="u_tourStepLabel">基本フロー 1 / 1</div>
                <div class="tour-title" id="u_tourTitle">操作ガイド</div>
              </div>
              <button class="tour-close" data-act="tourClose" title="閉じる">×</button>
            </div>
            <div class="tour-body" id="u_tourBody"></div>
            <div class="tour-progress"><span id="u_tourProgress"></span></div>
            <div class="tour-actions">
              <div class="muted" id="u_tourHint">対象箇所を順番に案内します</div>
              <div class="tour-nav">
                <button class="btn sub" data-act="tourPrev" id="u_tourPrev">戻る</button>
                <button class="btn ok" data-act="tourNext" id="u_tourNext">次へ</button>
              </div>
            </div>
          </div>
        </div>
        <div class="scope-picker-overlay" id="u_scopePickerModal" hidden>
          <div class="scope-picker-backdrop" data-act="closeScopePicker"></div>
          <div class="scope-picker-card" role="dialog" aria-modal="true" aria-labelledby="u_scopePickerTitle">
            <div class="scope-picker-head">
              <div>
                <div class="scope-picker-title" id="u_scopePickerTitle">セクション選択</div>
                <div class="scope-picker-sub" id="u_scopePickerSub">必要な項目だけを選びます。</div>
              </div>
              <button type="button" class="scope-picker-close" data-act="closeScopePicker" title="閉じる">×</button>
            </div>
            <div class="scope-picker-body">
              <div class="scope-picker-panel" data-scope-picker-panel="diff">
                <div class="btns" style="margin-top:0">
                  <button type="button" class="btn sub" data-act="diffScopeAll" title="一覧のチェックをすべてオンにします">比較セクション全選択</button>
                  <button type="button" class="btn sub" data-act="diffScopeNone" title="一覧のチェックをすべてオフにします">比較セクション全解除</button>
                </div>
                <div class="chips diff-scope-chips scope-picker-chips" id="u_diffScopes"></div>
              </div>
              <div class="scope-picker-panel" data-scope-picker-panel="reflect">
                <div class="reflect-sidebar reflect-sidebar--modal">
                  <div class="sidebar-head">
                    <div class="sidebar-head-row">
                      <span>反映するセクション</span>
                      <span style="font-size:10px;font-weight:400;color:#64748b" id="u_sidebarCount">0 / 0</span>
                    </div>
                    <p class="sidebar-hint">1. チェックで反映対象を選ぶ 2. 行クリックで内容確認</p>
                  </div>
                  <div id="u_sectionOptionsBlock" class="scope-picker-inline-options" style="display:none">
                    <label class="chip"><input type="checkbox" id="u_applyDiffOnly"> 前回差分のあるセクションのみ反映</label>
                  </div>
                  <div class="sidebar-sections" id="u_reflectSidebarSections"></div>
                  <div class="sidebar-footer">
                    <button type="button" class="btn sub" data-act="reflectSidebarOverview">全体概要</button>
                    <button class="btn sub" data-act="applyScopeAll">全選択</button>
                    <button class="btn sub" data-act="applyScopeNone">全解除</button>
                    <button class="btn sub" data-act="applyScopeDiffOnly" id="u_applyScopeDiffOnlyBtn">差分のみ</button>
                    <button class="btn sub" data-act="applyScopeHighRisk">高重要度</button>
                    <button class="btn sub" data-act="applyScopePreset" data-scope-preset="safe">安全寄り</button>
                    <button class="btn sub" data-act="applyScopePreset" data-scope-preset="visual">画面系</button>
                    <button class="btn sub" data-act="applyScopePreset" data-scope-preset="permissions">権限系</button>
                    <button class="btn sub" data-act="applyScopePreset" data-scope-preset="customize">JS/CSS</button>
                  </div>
                  <div class="reflect-preset-row" title="接続先とセクション選択をまとめてプリセットに保存/復元します">
                    <span class="reflect-preset-row__label">反映プリセット</span>
                    <select id="u_reflectPresetSelect" class="reflect-preset-row__select" aria-label="プリセット選択"></select>
                    <button type="button" class="btn sub" data-act="applyReflectPreset">読込</button>
                    <button type="button" class="btn sub" data-act="saveReflectPreset">現在の内容で保存</button>
                    <button type="button" class="btn sub" data-act="deleteReflectPreset">削除</button>
                  </div>
                </div>
              </div>
              <div class="scope-picker-panel" data-scope-picker-panel="settingsExport">
                <div class="btns" style="margin-top:0">
                  <button type="button" class="btn sub" data-act="settingsExportScopeAll" title="全セクションをオン">全選択</button>
                  <button type="button" class="btn sub" data-act="settingsExportScopeNone" title="すべてオフ">全解除</button>
                </div>
                <div class="chips diff-scope-chips scope-picker-chips" id="u_settingsExportScopes"></div>
              </div>
            </div>
            <div class="scope-picker-actions">
              <button type="button" class="btn ok" data-act="closeScopePicker">閉じる</button>
            </div>
          </div>
        </div>
        <div class="shortcut-help-overlay" id="u_shortcutHelpModal" hidden>
          <div class="shortcut-help-backdrop" data-act="closeShortcutHelp"></div>
          <div class="shortcut-help-card" role="dialog" aria-modal="true" aria-labelledby="u_shortcutHelpTitle">
            <div class="shortcut-help-head">
              <div>
                <div class="shortcut-help-title" id="u_shortcutHelpTitle">キーボードショートカット</div>
                <div class="shortcut-help-sub">入力欄以外でキーを押すと反応します。Esc で閉じる。</div>
              </div>
              <button type="button" class="shortcut-help-close" data-act="closeShortcutHelp" aria-label="閉じる" title="閉じる">×</button>
            </div>
            <div class="shortcut-help-body">
              <div class="shortcut-help-group">
                <div class="shortcut-help-group-title">全画面共通</div>
                <ul class="shortcut-help-list">
                  <li><kbd>?</kbd><span>このヘルプを開く / 閉じる</span></li>
                  <li><kbd>Esc</kbd><span>モーダル・検索クリアなどを閉じる</span></li>
                  <li><kbd>/</kbd> / <kbd>Ctrl</kbd>+<kbd>K</kbd><span>ランチャーを開いて機能検索にフォーカス</span></li>
                  <li><kbd>Enter</kbd> / <kbd>Space</kbd><span>機能カードを開く（フォーカス時）</span></li>
                </ul>
              </div>
              <div class="shortcut-help-group">
                <div class="shortcut-help-group-title">差分比較タブ</div>
                <ul class="shortcut-help-list">
                  <li><kbd>Ctrl</kbd>+<kbd>F</kbd><span>差分内検索にフォーカス</span></li>
                  <li><kbd>Ctrl</kbd>+<kbd>A</kbd><span>表示中の差分行を全選択</span></li>
                  <li><kbd>j</kbd> / <kbd>k</kbd><span>差分行のフォーカスを次/前へ移動</span></li>
                  <li><kbd>v</kbd><span>フォーカス中の行のレビュー済みをトグル</span></li>
                  <li><kbd>x</kbd><span>フォーカス中の行の選択をトグル</span></li>
                  <li><kbd>↑</kbd> / <kbd>↓</kbd><span>チェックボックス間を移動（フォーカス時）</span></li>
                  <li><kbd>Shift</kbd>+クリック<span>チェック範囲を一括選択</span></li>
                </ul>
              </div>
              <div class="shortcut-help-group">
                <div class="shortcut-help-group-title">操作ガイド表示中</div>
                <ul class="shortcut-help-list">
                  <li><kbd>→</kbd> / <kbd>Enter</kbd><span>次のステップへ進む</span></li>
                  <li><kbd>←</kbd><span>前のステップへ戻る</span></li>
                  <li><kbd>Esc</kbd><span>ガイドを終了</span></li>
                </ul>
              </div>
            </div>
            <div class="shortcut-help-actions">
              <button type="button" class="btn ok" data-act="closeShortcutHelp">閉じる</button>
            </div>
          </div>
        </div>
      `;
  return root;
}

export function copyTextToClipboard(text) {
  const raw = String(text ?? '');
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(raw).then(() => true).catch(() => false);
  }
  return new Promise((resolve) => {
    try {
      const doc = getToolDocument();
      const ta = doc.createElement('textarea');
      ta.value = raw;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      doc.body.appendChild(ta);
      ta.select();
      const ok = doc.execCommand('copy');
      doc.body.removeChild(ta);
      resolve(ok);
    } catch (e) {
      resolve(false);
    }
  });
}
