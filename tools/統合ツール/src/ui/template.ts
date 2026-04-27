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
  root.className = options.popout ? 'screen-launcher suite-popout-tab tab-is-diff-or-reflect tab-needs-app-inputs tab-needs-target tab-needs-connection-actions' : 'screen-launcher tab-is-diff-or-reflect tab-needs-app-inputs tab-needs-target tab-needs-connection-actions';
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
  const primaryFeatures = launcherFeatures.filter((feature) => primaryFeatureKeys.has(feature.key));
  const secondaryFeatures = launcherFeatures.filter((feature) => !primaryFeatureKeys.has(feature.key));
  const secondaryFeatureCount = secondaryFeatures.length;
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
        </span>` : ''}
        <span class="feature-risk feature-risk--${f.riskLevel === 'warning' ? 'warning' : 'safe'}">${getRiskLabel(f.riskLevel)}</span>
      </div>
      <div class="feature-card-label">${f.label}</div>
      <div class="feature-card-desc">${f.desc}</div>
      ${recommended.length ? `<div class="feature-card-tags">${recommended.map((item) => `<span class="feature-card-tag">${esc(item)}</span>`).join('')}</div>` : ''}
      <div class="feature-card-go" aria-hidden="true">開く</div>
    </div>`;
  };
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
              <div class="feature-breadcrumb" id="u_featureBreadcrumb" aria-live="polite">ホーム / 機能</div>
              <div class="feature-conn" id="u_featureConn" hidden></div>
            </div>
          </div>
          <div class="h-actions">
            <span id="u_envBadge" class="kus-env-badge-host" aria-live="polite"></span>
            <button class="x size" data-act="startGuidedTour" title="初回: 全工程 / 復習: 差分のみ / 反映直前: 反映まで">操作ガイド</button>
            <button class="x size" data-act="openShortcutHelp" title="キーボードショートカット一覧 (?)" aria-label="キーボードショートカット一覧">?</button>
            <button class="x size" data-act="dialogSizeDefault">標準</button>
            <button class="x size" data-act="dialogSizeLarge">大</button>
            <button class="x size" data-act="dialogSizeMax">最大</button>
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
              <p class="connection-section-lead" id="u_connectionLead">比較元・比較先の数値IDと、ゲストスペース利用時はゲストIDを入力します。</p>
              <p class="muted connection-lookup-note">ルックアップ参照先アプリIDが環境で異なる場合のみ、下の「ルックアップ参照先アプリID変換」を開いて設定します。</p>
              <div class="grid connection-grid">
              <div class="conn-source">
                <label for="u_sourceApp" id="u_sourceAppLabel">比較元アプリID <span class="req">必須</span></label>
                <input type="text" id="u_sourceApp" value="${esc(DEFAULT_APP_ID)}" autocomplete="off">
              </div>
              <div class="conn-source">
                <label for="u_sourceGuest" id="u_sourceGuestLabel">比較元 ゲストID</label>
                <input type="text" id="u_sourceGuest" placeholder="空欄で通常スペース" autocomplete="off">
              </div>
              <div class="conn-target">
                <label for="u_targetApp" id="u_targetAppLabel">比較先アプリID <span class="req">必須</span></label>
                <input type="text" id="u_targetApp" value="${esc(DEFAULT_APP_ID)}" autocomplete="off">
              </div>
              <div class="conn-target">
                <label for="u_targetGuest" id="u_targetGuestLabel">比較先 ゲストID</label>
                <input type="text" id="u_targetGuest" placeholder="空欄で通常スペース" autocomplete="off">
              </div>
            </div>
            <div class="btns connection-step-btns connection-quick-btns" style="margin-top:8px">
              <button type="button" class="btn sub connection-secondary-action" data-act="setSourceCurrent" title="今開いているアプリのIDを比較元にセット">比較元=現在アプリ</button>
              <button type="button" class="btn sub connection-secondary-action" data-act="copySourceToTarget" title="比較元のID/ゲスト/プレビュー設定を比較先にコピー">比較先←比較元</button>
              <button type="button" class="btn sub connection-secondary-action" data-act="swapSourceTarget" title="比較元と比較先の接続情報を入れ替え">比較元/比較先入替</button>
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
            <div class="kus-header-diff-suite" id="u_headerDiffSuite">
            <section class="connection-section connection-section--step2 connection-section--actions diff-pane-step2" aria-labelledby="conn-diff-pane-heading">
                <div class="connection-step-banner">
                  <span class="connection-step-title" id="conn-diff-pane-heading">比較データ取得・一括フロー</span>
                  <span class="connection-step-indicator" id="u_step2Indicator" data-step-state="pending">未取得</span>
                </div>
                <p class="muted connection-step-desc">比較元・比較先の設定を先に取り込みます。迷ったら「差分比較してプラン確認」を押すと、差分確認から反映前チェックまで続けて進められます。</p>
                <div class="btns connection-step-btns">
                  <button class="btn btn-primary-emphasis" data-act="runDiffAndPlan" data-state="推奨">差分比較してプラン確認</button>
                  <button class="btn sub connection-secondary-cta" data-act="prefetchCommonData" data-state="選択中">共通データ取得（比較元+比較先）</button>
                </div>
                <div class="kv" id="u_commonDataState">共通データ未取得</div>
              </section>
              <section class="diff-pane-embed" aria-label="差分の条件・一覧">
              <div class="subpane active">
              <div class="step">比較条件を調整して差分を取得</div>

              <details class="diff-fold diff-fold--scopes" open>
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
                <div class="muted" style="margin-top:0;line-height:1.6">比較時に値が違っても無視する JSON キー名を指定します。以下のキーは常に自動で除外されます。</div>
                <div class="chips" style="min-height:28px;padding:4px 6px;margin-top:6px">
                  <span class="diff-static-chip-lbl" title="ツール側で常に差分計算から外すメタ系キー">常時除外</span>
                  <span class="chip diff-static-chip" title="常に除外">id</span>
                  <span class="chip diff-static-chip" title="常に除外">appid</span>
                  <span class="chip diff-static-chip" title="常に除外">revision</span>
                  <span class="chip diff-static-chip" title="常に除外">createdat</span>
                  <span class="chip diff-static-chip" title="常に除外">creator</span>
                  <span class="chip diff-static-chip" title="常に除外">modifiedat</span>
                  <span class="chip diff-static-chip" title="常に除外">modifier</span>
                </div>
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
                  <input type="text" id="u_ignoreKeyInput" placeholder="キー名を入力してEnterまたは追加" style="flex:1;min-width:0" title="カンマ区切りで複数指定可能な場合は設定保存形式に従います">
                  <button type="button" class="btn sub" data-act="addIgnoreKey">追加</button>
                </div>
                </div>
              </details>

              <details class="diff-fold diff-fold--run" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">差分の実行・保存・設定JSON読込</span>
                  <span class="diff-fold-sub">保存済み設定JSONの読込や各種エクスポート</span>
                </summary>
                <div class="diff-fold-body">
              <div class="kv" id="u_bundleState">比較元: API取得 / 比較先: API取得</div>
              <div class="btns">
                <button type="button" class="btn sub" data-act="importSourceBundle">比較元JSON読込</button>
                <button type="button" class="btn sub" data-act="importTargetBundle">比較先JSON読込</button>
                <button type="button" class="btn sub" data-act="clearBundle">JSON読込解除</button>
                <button type="button" class="btn sub" data-act="exportBundleJson">設定JSON保存</button>
              </div>
              <div class="btns">
                <button type="button" class="btn" id="u_runDiffPrimary" data-act="runDiff">差分比較を実行</button>
                <button type="button" class="btn sub" data-act="exportDiffJson">差分JSON保存</button>
                <button type="button" class="btn sub" data-act="exportDiffHtml">差分HTML保存</button>
                <button type="button" class="btn sub" data-act="exportPatchJson">パッチJSON保存</button>
              </div>
                </div>
              </details>
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
              <details class="diff-fold diff-fold--review" id="u_diffReviewFold">
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">差分結果の整理・出力</span>
                  <span class="diff-fold-sub">差分比較後に、絞り込み・選択・各種出力をまとめて行います</span>
                </summary>
                <div class="diff-fold-body">
                <div class="diff-view-overview">
                  <div class="diff-view-overview-main">
                    <div class="diff-view-overview-title">現在の比較結果</div>
                    <div class="kv diff-view-overview-state" id="u_diffSelectionState">差分未実行</div>
                  </div>
                  <div class="diff-view-overview-side">
                    <div class="diff-view-overview-side-title">主な操作</div>
                    <div class="diff-view-overview-side-body">フィルタ調整 → 必要行を選択 → JSON/HTML/Excel/パッチを出力。別ウィンドウ表示や選択セット保存もこのエリアで実行できます。</div>
                  </div>
                </div>
              <details class="diff-fold diff-fold--view-extras">
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">拡大・クイック・選択セット</span>
                  <span class="diff-fold-sub">別ウィンドウ・一括プリセット・チェック選択の保存（普段は閉じたままでOK）</span>
                </summary>
                <div class="diff-fold-body">
              <div id="u_diffOnboarding" class="diff-onboarding" style="display:none" role="note">
                <div class="diff-onboarding-body">
                  <p class="diff-onboarding-text"><strong>ヒント</strong> 差分比較後は、この整理エリアで絞り込み・帯グラフ・セクションピル・別ウィンドウ・Shift+範囲選択が使えます。</p>
                  <button type="button" class="btn sub" data-act="dismissDiffOnboarding">了解して閉じる</button>
                </div>
              </div>
              <div class="diff-ext-toolbar">
                <div class="btns diff-ext-toolbar-row">
                  <button type="button" class="btn sub" data-act="openDiffPopout" title="メイン画面と選択・折り畳みを同期した別ウィンドウで差分一覧を表示">差分を別ウィンドウで開く</button>
                </div>
                <div class="diff-preset-toolbar btns">
                  <span class="diff-preset-label">クイック</span>
                  <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="reset" title="セクション・種別・重要度の絞り込みをクリア">解除</button>
                  <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="severity_high" title="重要度「高」だけ表示">高</button>
                  <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="type_added" title="追加差分だけ">追加</button>
                  <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="type_removed" title="削除差分だけ">削除</button>
                  <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="type_changed" title="変更差分だけ">変更</button>
                  <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="sec_field" title="フィールド設定セクションに絞る">フィールド</button>
                  <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="sec_layout" title="レイアウト設定に絞る">レイアウト</button>
                  <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="sec_view" title="ビュー設定に絞る">ビュー</button>
                  <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="sec_process" title="プロセス管理に絞る">プロセス</button>
                  <button type="button" class="btn sub" data-act="diffUiPreset" data-preset="no_acl" title="アプリ/フィールド/レコード権限のセクションを除外して表示">権限非表示</button>
                </div>
                <div class="diff-selection-set-row">
                  <label class="diff-selection-set-lbl" for="u_diffSelectionSetName">選択セット</label>
                  <input type="text" id="u_diffSelectionSetName" class="diff-selection-set-name" placeholder="例: レビュー用" title="現在のチェック選択を名前付きで保存します">
                  <button type="button" class="btn sub" data-act="saveDiffSelectionSet" title="入力した名前で保存">保存</button>
                  <select id="u_diffSelectionSetSelect" class="diff-selection-set-select" title="保存済みセットを読み込み"><option value="">-- 読込 --</option></select>
                  <button type="button" class="btn sub" data-act="loadDiffSelectionSet" title="選択したセットを復元">読込</button>
                  <button type="button" class="btn sub" data-act="deleteDiffSelectionSet" title="選択したセットを削除">削除</button>
                </div>
              </div>
                </div>
              </details>
              <details class="diff-fold diff-fold--view-filter" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">フィルタ・出力対象・選択</span>
                  <span class="diff-fold-sub">セクション/種別/重要度の絞り込みとエクスポート範囲</span>
                </summary>
                <div class="diff-fold-body">
              <div class="grid2" style="margin-top:0">
                <div>
                  <label title="比較結果をセクション・種別・重要度で絞り込みます">差分フィルタ</label>
                  <div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-top:4px">
                    <select id="u_diffFilterSection" title="表示する差分のセクションを限定">
                      <option value="">全セクション</option>
                    </select>
                    <select id="u_diffFilterType" title="追加/削除/変更など種別で限定">
                      <option value="">全種別</option>
                      <option value="added">追加</option>
                      <option value="removed">削除</option>
                      <option value="changed">変更</option>
                      <option value="moved">移動</option>
                      <option value="same">同一</option>
                    </select>
                    <select id="u_diffFilterSeverity" title="エンリッチされた重要度で限定">
                      <option value="">全重要度</option>
                      <option value="high">高</option>
                      <option value="medium">中</option>
                      <option value="low">低</option>
                    </select>
                  </div>
                  <div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr));margin-top:6px">
                    <label class="chip" title="テーブル内フィールドの差分のみ表示します"><input type="checkbox" id="u_diffFilterTableOnly"> テーブル内フィールドのみ</label>
                    <input type="text" id="u_diffFilterTableKeyword" placeholder="テーブル名 / コードで絞り込み" title="フィールド設定のうちテーブル内フィールドを、親テーブル名またはコードで絞り込みます">
                  </div>
                  <div class="diff-active-filters" id="u_diffActiveFilters" aria-live="polite"></div>
                  <div class="btns" style="margin-top:6px">
                    <button type="button" class="btn sub" data-act="clearDiffFilters">差分フィルタをクリア</button>
                  </div>
                </div>
                <div>
                  <label title="保存やコピー時に含める範囲を選びます">出力対象（どの行を出すか）</label>
                  <div class="btns" style="margin-top:0">
                    <select id="u_diffExportMode" style="flex:1;min-width:160px" title="保存・コピーに含める行の範囲">
                      <option value="all">全件（同一を含む比較結果すべて）</option>
                      <option value="selected">選択済み行のみ（チェック行）</option>
                      <option value="visible">現在表示中のみ（フィルタ適用後）</option>
                      <option value="favorites">お気に入り行のみ（★）</option>
                    </select>
                    <select id="u_diffExportContent" style="flex:1;min-width:180px" title="比較対象の生設定をレポートに含めるか">
                      <option value="diffOnly">出力内容: 行データのみ</option>
                      <option value="withCompared">出力内容: 行データ + 比較設定</option>
                    </select>
                  </div>
                  <label title="画面上のチェック状態をまとめて変更します" style="margin-top:8px;display:block">選択操作（チェック行の操作）</label>
                  <div class="btns" style="margin-top:0">
                    <button type="button" class="btn sub" data-act="selectVisibleDiffs" title="現在フィルタで見えている行を選択状態にします">表示中を選択</button>
                    <button type="button" class="btn sub" data-act="selectAllDiffs" title="全行を選択">全件選択</button>
                    <button type="button" class="btn sub" data-act="clearDiffSelection" title="選択をすべて外す">選択解除</button>
                    <button type="button" class="btn sub" data-act="toggleDiffFavoritesOnly" id="u_diffFavoritesOnlyBtn" title="お気に入り登録した行だけ表示">お気に入りのみ: OFF</button>
                  </div>
                </div>
              </div>
                </div>
              </details>
              <details class="diff-fold diff-fold--view-display">
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">検索・比較ビューの見え方</span>
                  <span class="diff-fold-sub">パス検索・ハイライト・テーマ・折り畳み（必要なときだけ開く）</span>
                </summary>
                <div class="diff-fold-body">
              <div class="grid2" style="margin-top:0">
                <div>
                  <label title="パスや値の一部でインライン検索">比較ビュー検索（パス / 値）</label>
                  <input type="text" id="u_diffSearch" placeholder="例: fieldSettings.properties.customer_code" title="Ctrl/Cmd+F でもフォーカスできます（ヘッダー比較条件の説明参照）">
                  <div class="btns" style="margin-top:6px">
                    <label class="chip" title="ONにすると、フィールドコード/フィールド名（ラベル）を優先して検索します"><input type="checkbox" id="u_diffSearchFieldName"> フィールド名で確認</label>
                  </div>
                </div>
                <div>
                  <label>比較ビュー表示</label>
                  <div class="btns" style="margin-top:0">
                    <label class="chip" title="変更行内の文字単位で追加削除を着色"><input type="checkbox" id="u_charDiff" checked> 文字単位ハイライト</label>
                    <label class="chip" title="同一種別の行もテーブルに出す"><input type="checkbox" id="u_diffIncludeSame" checked> 差分なしも表示</label>
                    <button type="button" class="btn sub" data-act="toggleDiffTheme" id="u_diffThemeBtn" title="ライト/ダークの表示テーマ">比較テーマ: ライト</button>
                    <button type="button" class="btn sub" data-act="collapseDiffSections" title="セクション見出しをすべて閉じる">全折畳</button>
                    <button type="button" class="btn sub" data-act="expandDiffSections" title="セクション見出しをすべて開く">全展開</button>
                  </div>
                </div>
              </div>
                </div>
              </details>
              <details class="diff-fold diff-fold--view-extra">
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">件数警告・無視キー候補・ショートカット</span>
                  <span class="diff-fold-sub">大量差分の注意喚起や候補ボタン（普段は閉じてOK）</span>
                </summary>
                <div class="diff-fold-body">
              <div style="margin-top:0">
                <label title="差分件数+取得失敗が閾値を超えたとき警告">差分件数しきい値警告</label>
                <div class="btns" style="margin-top:4px">
                  <input type="text" id="u_diffWarnThreshold" placeholder="例: 200 / 0でOFF" style="max-width:180px" title="0 または空で警告オフ。超過時はこの整理エリアの上にメッセージが出ます">
                </div>
                <div class="warnbox" id="u_diffWarnBox" style="display:none;margin-top:6px"></div>
              </div>
              <div style="margin-top:8px">
                <label title="直近の差分結果から、よくあるノイズキーを提案します">おすすめ無視キー候補（低影響差分から抽出）</label>
                <div id="u_diffSuggestedIgnore" class="chips" style="min-height:32px;border:1px solid #d6dee8;border-radius:6px;padding:6px;background:#fff;margin-top:4px;align-items:center"></div>
                <div class="muted" style="margin-top:4px;line-height:1.55">ショートカット: Ctrl/Cmd+F 検索, Esc 検索クリア, Ctrl/Cmd+A 全件選択（検索欄以外フォーカス時）, Shift+クリックでチェック範囲選択, 矢印キーでチェック間移動</div>
              </div>
                </div>
              </details>
              <div class="result" id="u_result"></div>
              </div>
              </details>
              <input type="file" id="u_sourceBundleFile" accept=".json" style="display:none">
              <input type="file" id="u_targetBundleFile" accept=".json" style="display:none">
              </div>
              </section>
            </div>
            <section class="connection-section connection-section--step3 connection-section--actions" aria-labelledby="conn-feature-heading">
              <div class="connection-step-banner">
                <span class="connection-step-title" id="conn-feature-heading">機能選択</span>
                <span class="connection-step-indicator" id="u_step3Indicator" data-step-state="pending">未選択</span>
              </div>
              <p class="muted connection-step-desc">下のカードからやりたい作業を選びます。カードには「用途」と「安全性」を表示しているので、迷ったらまず「差分比較」から進めてください。</p>
              <div class="btns connection-step-btns connection-quick-btns">
                <button type="button" class="btn sub connection-secondary-action" data-act="setSourceCurrent" title="今開いているアプリのIDを比較元にセット">比較元=現在アプリ</button>
                <button type="button" class="btn sub connection-secondary-action" data-act="copySourceToTarget" title="比較元のID/ゲスト/プレビュー設定を比較先にコピー">比較先←比較元</button>
                <button type="button" class="btn sub connection-secondary-action" data-act="swapSourceTarget" title="比較元と比較先の接続情報を入れ替え">比較元/比較先入替</button>
              </div>
            </section>
            </div>

          <div class="launcher-menu" id="u_launcherMenu">
            <div class="launcher-menu-head launcher-hero">
              <div class="launcher-hero-copy">
                <p class="launcher-kicker">Unified Operations</p>
                <p class="launcher-lead">変更作業ダッシュボード</p>
                <p class="launcher-tagline">差分確認、反映、記録、保守をこの画面から開始します。</p>
              </div>
              <div class="launcher-metrics" aria-label="機能数">
                <span><strong>${primaryFeatures.length}</strong> 主要</span>
                <span><strong>${secondaryFeatureCount}</strong> 補助</span>
                <span><strong>${launcherFeatures.length}</strong> 全機能</span>
              </div>
            </div>
            <div class="change-wizard" aria-label="変更作業ウィザード">
              <div class="change-wizard-head">
                <div>
                  <p class="change-wizard-kicker">Guided Flow</p>
                  <p class="change-wizard-title">変更作業ウィザード</p>
                  <p class="change-wizard-desc">接続確認から差分比較、反映前確認、プレビュー反映、記録出力まで順番に進めます。</p>
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
            <section class="work-history-panel" id="u_sessionSummaryPanel" aria-label="このセッションの操作サマリ" style="margin-bottom:8px">
              <div class="work-history-head">
                <div>
                  <p class="work-history-kicker">Session Recap</p>
                  <p class="work-history-title">このセッションの操作サマリ</p>
                  <p class="work-history-desc">タブを閉じるとリセットされます（永続化なし）。自分の作業を俯瞰でき、ヒューマンエラーの自己点検につながります。</p>
                </div>
              </div>
              <div id="u_sessionSummary" class="kus-session-summary" aria-live="polite"></div>
            </section>
            <section class="work-history-panel" id="u_workHistoryPanel" aria-label="作業履歴・復元">
              <div class="work-history-head">
                <div>
                  <p class="work-history-kicker">Restore Point</p>
                  <p class="work-history-title">作業履歴・復元</p>
                  <p class="work-history-desc">接続先、スコープ、フィルタ、レビュー状態を保存して、あとから同じ作業条件へ戻します。</p>
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
            <section class="launcher-section launcher-section--primary" aria-label="メイン機能">
              <div class="launcher-section-head">
                <p class="launcher-section-title">よく使うメイン機能</p>
                <span class="launcher-section-sub">まずはここから</span>
              </div>
              <div class="feature-grid feature-grid--primary">
                ${primaryFeatures.map(renderFeatureCard).join('')}
              </div>
            </section>
            <section class="launcher-section launcher-section--secondary" aria-label="補助機能">
              <div class="launcher-tools">
                <div class="launcher-section-head">
                  <p class="launcher-section-title">補助機能</p>
                  <span class="launcher-section-sub">詳細設定・保守向け</span>
                </div>
                <div class="launcher-filter-bar" aria-label="機能の絞り込み">
                  <div class="launcher-command-row">
                    <input
                      type="search"
                      id="u_launcherSearch"
                      class="launcher-search-input"
                      placeholder="機能名・説明で検索（例: 差分 / レコード / 設計書）"
                      autocomplete="off"
                      aria-label="機能検索">
                    <button type="button" class="btn sub launcher-clear-btn" data-act="clearLauncherFilter">クリア</button>
                  </div>
                  <div class="launcher-group-filters" id="u_launcherGroupFilters" role="group" aria-label="機能グループ">
                    <button type="button" class="chip is-active" data-act="setLauncherGroup" data-group="all" aria-pressed="true">すべて</button>
                    <button type="button" class="chip" data-act="setLauncherGroup" data-group="change" aria-pressed="false">変更・反映</button>
                    <button type="button" class="chip" data-act="setLauncherGroup" data-group="vis" aria-pressed="false">可視化・出力</button>
                    <button type="button" class="chip" data-act="setLauncherGroup" data-group="data" aria-pressed="false">データ・保守</button>
                  </div>
                  <div class="launcher-active-filters" id="u_launcherActiveFilters" aria-live="polite"></div>
                  <div class="launcher-filter-meta" id="u_launcherVisibleCount">表示中: ${launcherFeatures.length}/${launcherFeatures.length}</div>
                </div>
                <button type="button" class="btn sub launcher-more-toggle" id="u_launcherToggleMore" data-act="toggleLauncherMore" aria-expanded="false">その他の ${secondaryFeatureCount} 機能を表示</button>
              </div>
              <div class="feature-grid feature-grid--secondary">
                ${secondaryFeatures.map(renderFeatureCard).join('')}
              </div>
              <div class="launcher-empty-state" id="u_launcherEmptyState" hidden>
                <p class="launcher-empty-title">一致する機能がありません</p>
                <p class="launcher-empty-desc">検索語やグループ絞り込みを変更するか、クリアを押して全件表示に戻してください。</p>
              </div>
            </section>
          </div>

          <div class="card tab-card">
            <div class="tabs">
              <div class="tab-group" data-group="change">
                <div class="tab-group-lbl">変更・反映</div>
                <button class="tab" data-tab="diff" data-state="idle">差分比較</button>
                <button class="tab active" data-tab="reflect" data-state="selected">プレビュー反映</button>
                <button class="tab" data-tab="field" data-state="idle">フィールド追加</button>
                <button class="tab" data-tab="jsconfig" data-state="idle">JS/CSS設定</button>
              </div>
              
              <div class="tab-group" data-group="vis">
                <div class="tab-group-lbl">可視化・出力</div>
                <button class="tab" data-tab="er" data-state="idle">ER図</button>
                <button class="tab" data-tab="processFlow" data-state="idle">プロセス図</button>
                <button class="tab" data-tab="design" data-state="idle">設計書</button>
                <button class="tab" data-tab="settingsExport" data-state="idle">設定一括取得</button>
                <button class="tab" data-tab="analyze" data-state="idle">分析</button>
              </div>
              
              <div class="tab-group" data-group="data">
                <div class="tab-group-lbl">データ・保守</div>
                <button class="tab" data-tab="recordMgr" data-state="idle">レコード管理</button>
                <button class="tab" data-tab="apiTester" data-state="idle">APIテスター</button>
              </div>
            </div>

            <div class="pane" data-pane="diff">
              <section class="opt-card feature-pane-card feature-pane-card--diff" style="display:block;margin:12px">
                <div class="opt-title">差分比較</div>
                <p class="muted" style="margin:0 0 10px;font-size:12px;line-height:1.6">比較条件は上のエリア、結果の確認は下の結果欄で確認します。</p>
                <div class="btns">
                  <button type="button" class="btn" data-act="runDiff">差分比較を実行</button>
                  <button type="button" class="btn sub" data-act="goDiffReview">結果の整理へ移動</button>
                </div>
              </section>
            </div>

            <div class="pane active" data-pane="reflect">
              <div class="subtabs subtabs--reflect-modes">
                <button class="subtab active" data-subtab-parent="reflect" data-subtab="settings" title="標準ルートでプレビューへ反映">
                  <span class="subtab-icon" aria-hidden="true">01</span>
                  <span class="subtab-label">標準ルート</span>
                  <span class="subtab-sub">まず使う</span>
                </button>
                <button class="subtab" data-subtab-parent="reflect" data-subtab="diff" title="差分比較結果から反映する項目を選択">
                  <span class="subtab-icon" aria-hidden="true">02</span>
                  <span class="subtab-label">詳細ルート</span>
                  <span class="subtab-sub">差分ごと</span>
                </button>
                <button class="subtab" data-subtab-parent="reflect" data-subtab="json" title="JSONを直接編集して反映（開発者向け）">
                  <span class="subtab-icon" aria-hidden="true">{ }</span>
                  <span class="subtab-label">JSON</span>
                  <span class="subtab-sub">必要時のみ</span>
                </button>
              </div>

              <!-- ===== Subpane: settings (kintone設定画面風 / 一般ユーザー向け) ===== -->
              <div class="subpane active" data-subpane-parent="reflect" data-subpane="settings">
                <section class="reflect-mode-hero reflect-mode-hero--settings">
                  <div class="reflect-mode-hero__icon" aria-hidden="true">01</div>
                  <div class="reflect-mode-hero__copy">
                    <div class="reflect-mode-hero__title">標準ルート</div>
                    <div class="reflect-mode-hero__desc">セクション単位で反映対象を決め、実行前プランと安全チェックを通して比較先プレビューへ反映します。迷ったときはこの画面だけで進めます。</div>
                  </div>
                </section>
                <div id="u_applyScopeBlock" style="display:none"><div class="chips diff-scope-chips" id="u_applyScopes"></div></div>
                <div class="reflect-settings-inner">
                  <div class="reflect-inner-tabs" role="tablist" aria-label="反映対象の切替">
                    <button type="button" class="reflect-inner-tab active" data-reflect-inner="overview" role="tab" aria-selected="true">概要</button>
                    <button type="button" class="reflect-inner-tab" data-reflect-inner="field" role="tab" aria-selected="false">フィールド調整</button>
                    <button type="button" class="reflect-inner-tab" data-reflect-inner="other" role="tab" aria-selected="false">他設定調整</button>
                  </div>

                  <div class="reflect-inner-pane active" data-reflect-inner-pane="overview">
                    <div class="reflect-layout" id="u_reflectLayout">
                      <div class="reflect-main">
                        <div class="main-header reflect-main-header">
                          <div class="reflect-main-header__text">
                            <div class="main-title" id="u_reflectMainTitle">いまの反映内容</div>
                            <div class="main-meta" id="u_reflectMode">比較元: API / 比較先: プレビューAPI</div>
                          </div>
                        </div>
                        <div class="main-body" id="u_reflectMainBody">
                          <div class="scope-launcher-card scope-launcher-card--reflect">
                            <div class="scope-launcher-copy">
                              <div class="scope-launcher-kicker">ステップ1</div>
                              <div class="scope-launcher-title">反映するセクションを絞ります</div>
                              <div class="scope-launcher-summary" id="u_reflectScopeSummary">読み込み中...</div>
                            </div>
                            <div class="scope-launcher-actions">
                              <button type="button" class="btn sub" data-act="openReflectScopePicker">反映セクションを選ぶ</button>
                            </div>
                          </div>
                          <div id="u_reflectAssist"></div>
                          <div id="u_reflectHowto" style="margin-bottom:10px"></div>
                          <div class="reflect-plan-inline" id="u_reflectPlanInline" aria-live="polite"></div>
                          <div class="reflect-plan-preview" id="u_reflectPlanPreview" aria-live="polite"></div>
                          <div class="reflect-post-apply-host" id="u_reflectPostApply" aria-live="polite" style="display:none"></div>
                          <div id="u_reflectApplyReport" class="reflect-apply-report" aria-live="polite"></div>
                          <div id="u_reflectApplyHistory" class="reflect-apply-history" aria-live="polite"></div>
                          <div id="u_reflectOverview"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="reflect-inner-pane" data-reflect-inner-pane="field">
                    <section class="opt-card reflect-preview-editor-card" id="u_reflectPreviewEditorFold" style="margin:12px">
                      <div class="opt-title">フィールド設定画面（プレビューエディタ）</div>
                      <p class="reflect-preview-editor-lead">kintoneの「フォーム設定」画面のように、フィールドを並べ替えたり、比較元カードから比較先カードへドラッグ＆ドロップで設定上書き（code/typeは保持）できます。JSON編集とUndoにも対応します。</p>
                      <div id="u_reflectPreviewPlayground" class="reflect-preview-playground"></div>
                    </section>
                  </div>

                  <div class="reflect-inner-pane" data-reflect-inner-pane="other">
                    <section class="opt-card" style="margin:12px">
                      <div class="opt-title">他設定の差分エディタ</div>
                      <p class="muted" style="margin:0 0 8px;font-size:12px">セクション（ビュー・レイアウト・プロセス管理・通知・権限など）を選び、比較元と比較先を見比べながら比較先JSONを調整できます。</p>
                      <div id="u_sectionPreviewEditor" class="section-preview-editor"></div>
                    </section>
                  </div>
                </div>
              </div>

              <!-- ===== Subpane: json (開発者向け) ===== -->
              <div class="subpane" data-subpane-parent="reflect" data-subpane="json">
                <section class="reflect-mode-hero reflect-mode-hero--json">
                  <div class="reflect-mode-hero__icon" aria-hidden="true">{ }</div>
                  <div class="reflect-mode-hero__copy">
                    <div class="reflect-mode-hero__title">JSON</div>
                    <div class="reflect-mode-hero__desc">パッチJSONを直接編集して反映できます。差分比較結果を取り込んで調整し、比較先プレビューに書き込みます。</div>
                  </div>
                </section>
                <div id="u_patchJsonPanel" style="display:block">
                  <div class="opt-card" style="margin:12px">
                    <div class="opt-title">パッチJSON編集</div>
                    <div class="muted" style="margin-bottom:6px">パッチJSONファイルを読み込むか、差分比較結果から生成した内容をそのまま使って、比較先プレビューに反映します。</div>
                    <div class="btns" style="margin-bottom:6px">
                      <button class="btn sub" data-act="patchJsonUseCurrentDiff">差分比較結果を読込</button>
                      <button class="btn sub" data-act="patchJsonLoadFile">JSONファイル読込</button>
                      <input type="file" id="u_patchJsonFileInput" accept=".json" style="display:none">
                      <button class="btn sub" data-act="patchJsonClear">クリア</button>
                    </div>
                    <div id="u_patchJsonSummary" style="display:none;margin-bottom:6px;padding:6px 10px;border-radius:6px;font-size:11px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af"></div>
                    <div id="u_patchJsonEditor" style="width:100%;height:400px;border-radius:6px;"></div>
                    <div style="margin-top:10px;font-size:11px;font-weight:700;color:#334155">JSON差分比較</div>
                    <div id="u_patchJsonDiff" style="margin-top:6px;min-height:120px;max-height:420px;overflow:auto;border:1px solid #dbe3ed;border-radius:8px;background:#fff;padding:8px;color:#64748b;font-size:11px">パッチJSONを読み込むと、比較元 / 比較先の差分比較をここに表示します。</div>
                    <div class="btns" style="margin-top:6px">
                      <button class="btn ok" data-act="applyPatchJson">この内容で反映</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ===== Subpane: diff (差分から反映フィールドを調整) ===== -->
              <div class="subpane" data-subpane-parent="reflect" data-subpane="diff">
                <section class="reflect-mode-hero reflect-mode-hero--diff">
                  <div class="reflect-mode-hero__icon" aria-hidden="true">02</div>
                  <div class="reflect-mode-hero__copy">
                    <div class="reflect-mode-hero__title">詳細ルート</div>
                    <div class="reflect-mode-hero__desc">差分ごとに「比較元を採用」「比較先を維持」を切り替え、必要な変更だけをプレビューへ反映します。標準ルートで足りないときに使います。</div>
                  </div>
                </section>
                <div class="reflect-layout">
                  <div class="reflect-main" style="width:100%">
                    <div class="main-body" style="padding:12px">
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
                            <span class="diff-fold-sub">解除、比較先維持、Undo / Redo、JSON保存が必要なときだけ開きます</span>
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
                              <button class="btn sub" data-act="exportReflectSelection" title="選択ノード・モードをJSONで保存してレビュアーに共有">選択をJSONで保存</button>
                              <button class="btn sub" data-act="importReflectSelection" title="保存した選択JSONを読み込み、同じノード・モードを復元">選択JSONを読込</button>
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
                  </div>
                </div>
              </div>


              <div class="reflect-footer-stack" style="margin-top:auto">
                <div class="reflect-footer-badges" id="u_reflectFooterBadges" aria-live="polite"></div>
                <div class="reflect-footer-options" id="u_reflectOptionsCard">
                  <div class="reflect-footer-options__label">反映前の安全設定</div>
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
                  <div class="reflect-footer-options__chips">
                    <label class="chip" title="反映直前に比較先プレビューの設定JSONを自動保存します（推奨）"><input type="checkbox" id="u_autoBackupPreview" checked> バックアップ自動保存 <span class="kus-recommended-mark" aria-label="推奨">★</span></label>
                    <label class="chip" title="APIエラーが出た時点で残りの反映を止めます（推奨）"><input type="checkbox" id="u_stopOnError" checked> エラー時中断 <span class="kus-recommended-mark" aria-label="推奨">★</span></label>
                    <span class="muted" style="font-size:11px;line-height:1.45;max-width:420px;display:inline-block;vertical-align:middle">本番デプロイAPIは利用できません。プレビュー反映後は管理画面から手動デプロイしてください。</span>
                    <input type="checkbox" id="u_doDeploy" disabled style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none" tabindex="-1" aria-hidden="true" title="">
                  </div>
                  <div id="u_backupStatus" style="display:none;margin-top:6px;padding:6px 10px;border-radius:6px;font-size:11px;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46"></div>
                </div>
                <div class="reflect-footer-actions main-footer" id="u_reflectFooter">
                  <div class="reflect-footer-actions__preview">
                    <span class="reflect-footer-zone-label">プレビュー反映</span>
                    <div class="reflect-footer-actions__primary">
                      <button type="button" class="btn sub" data-act="previewApplyPlan" id="u_footerPlan" title="比較先プレビューに対するAPIリクエスト内容を結果欄に表示します（実行前の確認）">実行前プラン確認</button>
                      <button type="button" class="btn ok" data-act="applyPreview" id="u_footerApply" title="選択した内容を比較先のプレビュー環境へ書き込みます。未確認時はプラン確認が先に開きます">プレビューへ反映</button>
                    </div>
                    <details class="diff-fold reflect-inline-fold reflect-inline-fold--footer">
                      <summary class="diff-fold-summary">
                        <span class="diff-fold-title">補助操作</span>
                        <span class="diff-fold-sub">反映セクションで選んだ項目を保存・復元します（JS/CSS含む）</span>
                      </summary>
                      <div class="diff-fold-body">
                        <div class="reflect-footer-actions__support">
                          <button type="button" class="btn sub" data-act="runPreviewProdDiff" id="u_footerPreviewProdDiff" title="比較先アプリのプレビューと本番の差分を比較します。デプロイ待ちの変更を確認できます">プレビュー⇔本番を比較</button>
                          <button type="button" class="btn sub" data-act="exportDryRunPlan" id="u_footerDryRun" title="APIを叩かずに、予定されているリクエスト一式をJSONファイルとして保存します（ドライラン）">ドライランJSONを保存</button>
                          <button type="button" class="btn sub" data-act="backupTargetPreview" title="比較先のプレビュー設定をJSONファイルとして保存します。反映セクションでチェックした項目を対象にし、JS/CSS設定も含められます">今の比較先を保存</button>
                          <button type="button" class="btn sub" data-act="restoreTargetPreviewBackup" title="このセッションで保存した直前バックアップを比較先プレビューへ戻します">直前保存を戻す</button>
                        </div>
                      </div>
                    </details>
                  </div>
                  <div class="reflect-footer-actions__prod">
                    <span class="reflect-footer-zone-label reflect-footer-zone-label--prod">本番反映</span>
                    <span class="muted" style="font-size:11px;line-height:1.45;max-width:220px;display:inline-block">デプロイはkintone管理画面から手動で行ってください。</span>
                  </div>
                  <span class="footer-status" id="u_reflectFooterStatus"></span>
                </div>
              </div>

              <!-- Keep hidden inputs used by logic -->
              <input type="checkbox" id="u_nodeMode" style="display:none">
              <label class="reflect-simple-toggle chip" style="display:none"><input type="checkbox" id="u_reflectSimpleMode"></label>
              <button type="button" id="u_modeSectionBtn" data-act="reflectModeSection" style="display:none"></button>
              <button type="button" id="u_modeNodeBtn" data-act="reflectModeNode" style="display:none"></button>
              <button data-act="togglePatchJsonPanel" style="display:none"></button>
              <button data-act="openReflectPreviewEditor" style="display:none"></button>
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
              <div class="btns" style="margin-top:10px">
                <button type="button" class="btn" data-act="runSettingsExportJson" title="1ファイルのJSONにまとめて保存">JSONバックアップ</button>
                <button type="button" class="btn dark" data-act="runSettingsExportZip" title="アプリごとに分割してZIP">ZIPバックアップ</button>
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
