'use strict';

import cssText from './styles.css';
import {
  TOOL_ID, TOOL_VERSION, SECTION_DEFS, SETTINGS_EXPORT_SCOPE_DEFS,
  FEATURE_DEFS, PREVIEW_COMPARE_PRESETS, DEFAULT_SUBTAB_STATE,
  DIALOG_DEFAULT_WIDTH, DIALOG_DEFAULT_HEIGHT,
  DIALOG_MIN_WIDTH, DIALOG_MIN_HEIGHT, DIALOG_MARGIN,
  DEFAULT_APP_ID
} from '../constants.js';
import { esc } from '../utils.js';
import { getToolDocument } from './dialog.js';

export function buildRoot(targetDocument = document, options = {}) {
  const doc = targetDocument || document;
  const root = doc.createElement('div');
  root.id = TOOL_ID;
  root.className = options.popout ? 'screen-launcher suite-popout-tab tab-is-diff-or-reflect' : 'screen-launcher tab-is-diff-or-reflect';
  root.innerHTML = `<style>${cssText}</style>` + `
        <div class="h" data-dialog-drag-handle="1">
          <div class="h-brand" aria-hidden="true">
            <span class="suite-mark"></span>
          </div>
          <div class="h-title-launcher">
            <div class="ht">kintone 統合変更ツール</div>
            <div class="hs">通常は<strong>新しいタブ</strong>で開きます（ポップアップ拒否時はこのタブ内）。アプリ画面のタブはそのまま操作できます。接続情報を確認してから右のメニューで作業を開きます。</div>
            <div><span class="tool-ver hs" data-act="copyToolInfo" title="クリックでツール識別情報をクリップボードにコピー（問い合わせ・再現調査用）">ビルド ${TOOL_VERSION}</span></div>
          </div>
          <div class="h-title-feature">
            <button class="h-back" data-act="backToLauncher">← 戻る</button>
            <div>
              <div class="ht" id="u_featureTitle"></div>
              <div class="feature-conn" id="u_featureConn"></div>
            </div>
          </div>
          <div class="h-actions">
            <button class="x size" data-act="startGuidedTour">操作ガイド</button>
            <button class="x size" data-act="dialogSizeDefault">標準</button>
            <button class="x size" data-act="dialogSizeLarge">大</button>
            <button class="x size" data-act="dialogSizeMax">最大</button>
            <button class="x" data-act="close">閉じる</button>
          </div>
        </div>
        <div class="body">
          <div class="card common-card" id="u_connectionPanel">
            <section class="connection-section" aria-labelledby="conn-app-heading">
              <h3 class="connection-section-title" id="conn-app-heading">アプリとゲスト</h3>
              <p class="connection-section-lead">比較元・比較先の数値IDと、ゲストスペース利用時はゲストIDを入力します。</p>
              <div class="grid connection-grid">
              <div>
                <label for="u_sourceApp">比較元アプリID</label>
                <input type="text" id="u_sourceApp" value="${esc(DEFAULT_APP_ID)}" autocomplete="off">
              </div>
              <div>
                <label for="u_sourceGuest">比較元 ゲストID</label>
                <input type="text" id="u_sourceGuest" placeholder="空欄で通常スペース" autocomplete="off">
              </div>
              <div>
                <label for="u_targetApp">比較先アプリID</label>
                <input type="text" id="u_targetApp" value="${esc(DEFAULT_APP_ID)}" autocomplete="off">
              </div>
              <div>
                <label for="u_targetGuest">比較先 ゲストID</label>
                <input type="text" id="u_targetGuest" placeholder="空欄で通常スペース" autocomplete="off">
              </div>
            </div>
            </section>
            <div class="preview-compare-panel">
              <div class="preview-compare-head">
                <span class="preview-compare-title">プレビュー比較（取得するAPI）</span>
              </div>
              <p class="muted preview-compare-lead" style="margin:6px 0 10px;line-height:1.6">差分・共通データ取得で使う<strong>読み取り先</strong>をプリセットで選びます。反映タブの書き込みは別途説明のとおりプレビュー固定です。</p>
              <div class="preview-preset-grid" role="group" aria-label="プレビュー比較プリセット">
                ${PREVIEW_COMPARE_PRESETS.map((p) => `<button type="button" class="preview-preset-btn${p.recommended ? ' preview-preset-btn--rec' : ''}" data-act="setPreviewPreset" data-preset="${esc(p.id)}" title="${esc(p.hint)}" aria-pressed="false">
                  <span class="pp-title">${p.recommended ? '<span class="pp-rec-tag">推奨</span> ' : ''}${esc(p.label)}</span>
                  <span class="pp-sub">${esc(p.shortLine)}</span>
                </button>`).join('')}
              </div>
              <div id="u_previewCompareSummary" class="preview-compare-summary" aria-live="polite"></div>
              <p id="u_previewPresetCustomNote" class="preview-preset-custom-note" style="display:none">チェックボックスを個別に変更したため、上記プリセットとは異なる組み合わせになっています。</p>
              <details class="diff-fold preview-compare-advanced" style="margin-top:10px">
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">詳細: 比較元/比較先のプレビューを個別に切替</span>
                  <span class="diff-fold-sub">プリセットと同じ結果なら開く必要はありません</span>
                </summary>
                <div class="diff-fold-body">
                  <div class="grid2" style="margin-top:0">
                    <label class="chip" title="オンにすると比較元はプレビュー環境の設定APIを参照します"><input type="checkbox" id="u_sourcePreview"> 比較元はプレビュー</label>
                    <label class="chip" title="オンにすると比較先の取得はプレビュー環境の設定APIを参照します（反映PUTは常にプレビュー）"><input type="checkbox" id="u_targetPreview" checked> 比較先はプレビュー</label>
                  </div>
                </div>
              </details>
            </div>
            <section class="connection-section connection-section--actions" aria-labelledby="conn-quick-heading">
              <h3 class="connection-section-title" id="conn-quick-heading">よく使う操作</h3>
              <div class="btns connection-quick-btns">
              <button type="button" class="btn sub" data-act="setSourceCurrent" title="今開いているアプリのIDを比較元にセット">比較元=現在アプリ</button>
              <button type="button" class="btn sub" data-act="copySourceToTarget" title="比較元のID/ゲスト/プレビュー設定を比較先にコピー">比較先←比較元</button>
              <button type="button" class="btn sub" data-act="swapSourceTarget" title="比較元と比較先の接続情報を入れ替え">比較元/比較先入替</button>
            </div>
            </section>
            <details class="diff-fold diff-fold--lookup">
              <summary class="diff-fold-summary">
                <span class="diff-fold-title">ルックアップ参照先アプリID変換（任意）</span>
                <span class="diff-fold-sub">環境間で参照先アプリIDが違うときのみ開いてください</span>
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
            <div class="step connection-step-banner">共通データ取得 / クイック実行（全タブ共通）</div>
            <p class="muted connection-step-desc">比較元・比較先の設定を使い、一覧で共有するデータを先に取り込めます。「差分→プラン」は連続実行のショートカットです。</p>
            <div class="btns connection-step-btns">
              <button class="btn sub" data-act="prefetchCommonData">共通データ取得（比較元+比較先）</button>
              <button class="btn btn-primary-emphasis" data-act="runDiffAndPlan">差分比較 → 反映プラン確認</button>
            </div>
            <div class="kv" id="u_commonDataState">共通データ未取得</div>
            <div class="muted connection-footnote">共通設定は全タブで使います。推奨: 差分比較 → 反映プラン確認 → プレビュー反映。</div>
            </div>

          <div class="launcher-menu" id="u_launcherMenu">
            <div class="launcher-menu-head">
              <p class="launcher-lead">作業メニュー</p>
              <p class="launcher-tagline">カードをクリックして開きます。戻るボタンでいつでもこの画面に戻れます。</p>
            </div>
            <div class="feature-grid">
              ${FEATURE_DEFS.map((f) => `<div class="feature-card" data-act="openFeature" data-feature="${f.key}" role="button" tabindex="0">
                <div class="feature-card-icon">${f.icon || ''}</div>
                <div class="feature-card-label">${f.label}</div>
                <div class="feature-card-desc">${f.desc}</div>
                <div class="feature-card-go" aria-hidden="true">開く</div>
              </div>`).join('')}
            </div>
          </div>

          <div class="card tab-card">
            <div class="tabs">
              <div class="tab-group" data-group="change">
                <div class="tab-group-lbl">変更・反映</div>
                <button class="tab active" data-tab="diff">差分比較</button>
                <button class="tab" data-tab="reflect">プレビュー反映</button>
                <button class="tab" data-tab="field">フィールド追加</button>
                <button class="tab" data-tab="jsconfig">JS/CSS設定</button>
              </div>
              
              <div class="tab-group" data-group="vis">
                <div class="tab-group-lbl">可視化・出力</div>
                <button class="tab" data-tab="er">ER図</button>
                <button class="tab" data-tab="processFlow">プロセス図</button>
                <button class="tab" data-tab="design">設計書</button>
                <button class="tab" data-tab="settingsExport">設定一括取得</button>
              </div>
              
              <div class="tab-group" data-group="data">
                <div class="tab-group-lbl">データ・保守</div>
                <button class="tab" data-tab="recordMgr">レコード管理</button>
                <button class="tab" data-tab="sql">SQL実行</button>
                <button class="tab" data-tab="apiTester">APIテスター</button>
              </div>
            </div>

            <div class="pane active" data-pane="diff">
              <div class="subtabs">
                <button class="subtab active" data-subtab-parent="diff" data-subtab="conditions">比較条件</button>
                <button class="subtab" data-subtab-parent="diff" data-subtab="view">結果整理</button>
                <button class="subtab" data-subtab-parent="diff" data-subtab="history">履歴・監視</button>
              </div>
              <div class="subpane active" data-subpane-parent="diff" data-subpane="conditions">
                <div class="subpane-note">上部の<strong>プレビュー比較プリセット</strong>で本番/プレビューAPIの組み合わせを決めてから、セクションと実行操作を進めます。細かいオプションは折りたたみにあります。</div>
              <div class="step">手順1: 比較条件を決めて差分を取得</div>

              <details class="diff-fold diff-fold--scopes" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">比較対象セクション</span>
                  <span class="diff-fold-sub">API 取得範囲（各チップにマウスを載せると API パスが表示されます）</span>
                </summary>
                <div class="diff-fold-body">
                  <div class="btns" style="margin-top:0">
                    <button type="button" class="btn sub" data-act="diffScopeAll" title="一覧のチェックをすべてオンにします">比較セクション全選択</button>
                    <button type="button" class="btn sub" data-act="diffScopeNone" title="一覧のチェックをすべてオフにします">比較セクション全解除</button>
                  </div>
                  <div class="chips diff-scope-chips" id="u_diffScopes"></div>
                </div>
              </details>

              <details class="diff-fold diff-fold--ignore">
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">無視キー・プリセット・正規化</span>
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
                  <label class="chip" title="ビュー・レポート・アクションの並びをソートしてから比較し、順序差分を抑えます"><input type="checkbox" id="u_diffNormalizeViewOrder"> ビュー/グラフ/アクション順序を正規化</label>
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
                  <span class="diff-fold-title">バンドル読込・差分の実行・保存</span>
                  <span class="diff-fold-sub">オフライン JSON やエクスポート操作</span>
                </summary>
                <div class="diff-fold-body">
              <div class="kv" id="u_bundleState">比較元: API取得 / 比較先: API取得</div>
              <div class="btns">
                <button type="button" class="btn sub" data-act="importSourceBundle">比較元バンドル読込</button>
                <button type="button" class="btn sub" data-act="importTargetBundle">比較先バンドル読込</button>
                <button type="button" class="btn sub" data-act="clearBundle">バンドル読込解除</button>
                <button type="button" class="btn sub" data-act="exportBundleJson">バンドル保存</button>
              </div>
              <div class="btns">
                <button type="button" class="btn" data-act="runDiff">差分比較を実行</button>
                <button type="button" class="btn sub" data-act="copyDiffSummary">差分コピー</button>
                <button type="button" class="btn sub" data-act="exportDiffJson">差分JSON保存</button>
                <button type="button" class="btn sub" data-act="exportDiffHtml">差分HTML保存</button>
                <button type="button" class="btn dark" data-act="exportDiffXlsx">差分Excel保存</button>
                <button type="button" class="btn sub" data-act="exportPatchJson">パッチJSON保存</button>
              </div>
                </div>
              </details>
              </div>
              <div class="subpane" data-subpane-parent="diff" data-subpane="view">
                <div class="subpane-note">取得済みの差分の絞り込みと出力です。まず下の「フィルタ・出力」を開き、必要なら「拡大・クイック・選択セット」を開いてください。</div>
              <details class="diff-fold diff-fold--view-extras">
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">拡大・クイック・選択セット</span>
                  <span class="diff-fold-sub">別ウィンドウ・一括プリセット・チェック選択の保存（普段は閉じたままでOK）</span>
                </summary>
                <div class="diff-fold-body">
              <div id="u_diffOnboarding" class="diff-onboarding" style="display:none" role="note">
                <div class="diff-onboarding-body">
                  <p class="diff-onboarding-text"><strong>ヒント</strong> 下の結果欄は<strong>このサブタブ</strong>を開いているときだけ差分テーブルを表示します。帯グラフ・セクションピル・別ウィンドウ・Shift+範囲選択が使えます。</p>
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
              <div class="kv" id="u_diffSelectionState">差分未実行</div>
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
                </div>
                <div>
                  <label title="ファイル保存やコピー時に含める差分の範囲">出力対象 / 内容 / 選択操作</label>
                  <div class="btns" style="margin-top:0">
                    <select id="u_diffExportMode" style="flex:1;min-width:160px" title="保存・コピーに含める行の範囲">
                      <option value="all">出力対象: 全差分</option>
                      <option value="selected">出力対象: 選択差分</option>
                      <option value="visible">出力対象: 現在表示中</option>
                      <option value="favorites">出力対象: お気に入り</option>
                    </select>
                    <select id="u_diffExportContent" style="flex:1;min-width:180px" title="比較対象の生設定をレポートに含めるか">
                      <option value="diffOnly">出力内容: 差分のみ</option>
                      <option value="withCompared">出力内容: 差分 + 比較設定</option>
                    </select>
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
                  <input type="text" id="u_diffSearch" placeholder="例: fieldSettings.properties.customer_code" title="Ctrl/Cmd+F でもフォーカスできます（比較条件タブの説明参照）">
                  <div class="btns" style="margin-top:6px">
                    <label class="chip" title="ONにすると、フィールドコード/フィールド名（ラベル）を優先して検索します"><input type="checkbox" id="u_diffSearchFieldName"> フィールド名で確認</label>
                  </div>
                </div>
                <div>
                  <label>比較ビュー表示</label>
                  <div class="btns" style="margin-top:0">
                    <label class="chip" title="変更行内の文字単位で追加削除を着色"><input type="checkbox" id="u_charDiff" checked> 文字単位ハイライト</label>
                    <label class="chip" title="同一種別の行もテーブルに出す"><input type="checkbox" id="u_diffIncludeSame"> 差分なしも表示</label>
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
                  <input type="text" id="u_diffWarnThreshold" placeholder="例: 200 / 0でOFF" style="max-width:180px" title="0 または空で警告オフ。超過時は結果整理の上にメッセージが出ます">
                </div>
                <div class="warnbox" id="u_diffWarnBox" style="display:none;margin-top:6px"></div>
              </div>
              <div style="margin-top:8px">
                <label title="直近の差分結果から、よくあるノイズキーを提案します">おすすめ無視キー候補（低影響差分から抽出）</label>
                <div id="u_diffSuggestedIgnore" class="chips" style="min-height:32px;border:1px solid #d6dee8;border-radius:6px;padding:6px;background:#fff;margin-top:4px;align-items:center"></div>
                <div class="muted" style="margin-top:4px;line-height:1.55">ショートカット: Ctrl/Cmd+F 検索, Esc 検索クリア, Ctrl/Cmd+Shift+C 差分コピー, Ctrl/Cmd+A 全件選択（検索欄以外フォーカス時）, Shift+クリックでチェック範囲選択, 矢印キーでチェック間移動</div>
              </div>
                </div>
              </details>
              </div>
              <div class="subpane" data-subpane-parent="diff" data-subpane="history">
                <div class="subpane-note">比較履歴、監視、複数比較先チェックをまとめています。</div>
              <details class="diff-fold diff-fold--snap" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">比較スナップショット履歴</span>
                  <span class="diff-fold-sub">過去の比較結果の一覧・復元</span>
                </summary>
                <div class="diff-fold-body">
                <div class="btns" style="margin-top:0">
                  <button type="button" class="btn sub" data-act="clearDiffSnapshots" title="保存済みスナップショットをすべて削除">履歴全削除</button>
                </div>
                <div id="u_diffSnapshotList" class="result" style="max-height:220px;margin-top:6px"></div>
                </div>
              </details>
              <details class="diff-fold diff-fold--multi" open>
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
              <input type="file" id="u_sourceBundleFile" accept=".json" style="display:none">
              <input type="file" id="u_targetBundleFile" accept=".json" style="display:none">
            </div>

            <div class="pane" data-pane="reflect">
              <input type="checkbox" id="u_nodeMode" style="display:none">
              <details class="diff-fold diff-fold--reflect-hint">
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">プレビュー反映の操作ヒント</span>
                  <span class="diff-fold-sub">初めてのときだけ開いて確認</span>
                </summary>
                <div class="diff-fold-body">
              <div class="muted" style="margin-top:0;line-height:1.65">差分比較が未実行または条件変更時は、反映前に自動で差分比較を実行します。<strong>左の一覧</strong>でチェック＝反映対象、<strong>行クリック</strong>でそのセクションの差分サマリーを表示します（<strong>全体概要</strong>はサイドバー下のボタン）。プラン確認・反映・デプロイは<strong>画面下の固定バー</strong>から行います。</div>
                </div>
              </details>
              <div id="u_applyScopeBlock" style="display:none"><div class="chips diff-scope-chips" id="u_applyScopes"></div></div>
              <div class="reflect-layout" id="u_reflectLayout">
                <div class="reflect-sidebar">
                  <div class="sidebar-head">
                    <div class="sidebar-head-row">
                      <span>反映セクション</span>
                      <span style="font-size:10px;font-weight:400;color:#64748b" id="u_sidebarCount">0 / 0</span>
                    </div>
                    <p class="sidebar-hint">チェックで反映に含める · 行クリックで詳細パネル</p>
                  </div>
                  <div class="sidebar-sections" id="u_reflectSidebarSections"></div>
                  <div class="sidebar-footer">
                    <button type="button" class="btn sub" data-act="reflectSidebarOverview">全体概要</button>
                    <button class="btn sub" data-act="applyScopeAll">全選択</button>
                    <button class="btn sub" data-act="applyScopeNone">全解除</button>
                    <button class="btn sub" data-act="applyScopeDiffOnly" id="u_applyScopeDiffOnlyBtn">差分のみ</button>
                    <button class="btn sub" data-act="applyScopeHighRisk">高重要度</button>
                  </div>
                </div>
                <div class="reflect-main">
                  <div class="main-header reflect-main-header">
                    <div class="reflect-main-header__text">
                      <div class="main-title" id="u_reflectMainTitle">反映概要</div>
                      <div class="main-meta" id="u_reflectMode">比較元: API / 比較先: プレビューAPI</div>
                    </div>
                    <div class="reflect-main-header__controls">
                      <button type="button" class="btn sub" data-act="openReflectPreviewEditor" title="フィールド差分プレビューエディタまでスクロールして展開します">差分プレビューエディタ</button>
                      <label class="reflect-simple-toggle chip" title="ノード選択・JSON差分反映を隠し、セクション反映に集中します">
                        <input type="checkbox" id="u_reflectSimpleMode"> 簡易表示
                      </label>
                      <div class="reflect-mode-tabs" role="tablist" aria-label="反映モード">
                        <button type="button" class="btn ok reflect-mode-tab" id="u_modeSectionBtn" data-act="reflectModeSection" aria-selected="true">セクション</button>
                        <button type="button" class="btn sub reflect-mode-tab" id="u_modeNodeBtn" data-act="reflectModeNode" aria-selected="false">ノード選択</button>
                      </div>
                    </div>
                  </div>
                  <div class="main-body" id="u_reflectMainBody">
                    <div id="u_reflectAssist"></div>
                    <div id="u_reflectHowto" style="margin-bottom:10px"></div>
                    <div class="reflect-plan-inline" id="u_reflectPlanInline" aria-live="polite"></div>
                    <div id="u_reflectOverview"></div>
                    <div id="u_reflectHint" class="kv" style="display:none"></div>
                    <div id="u_sectionOptionsBlock" style="display:none">
                      <label class="chip"><input type="checkbox" id="u_applyDiffOnly"> 前回差分のあるセクションのみ反映</label>
                    </div>
                    <div class="warnbox" id="u_nodeWarn" style="display:none">注: ノードモードは「前回差分」から選択して反映します。まず差分比較を実行してください。</div>
                    <div id="u_nodeControls" style="display:none">
                      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
                        <button class="btn sub" data-act="loadReflectNodes" style="padding:4px 8px;font-size:10px">差分ノード読込</button>
                        <button class="btn sub" data-act="selectVisibleReflectNodes" style="padding:4px 8px;font-size:10px">表示中を選択</button>
                        <button class="btn sub" data-act="clearVisibleReflectNodes" style="padding:4px 8px;font-size:10px">表示中解除</button>
                        <button class="btn sub" data-act="selectHighSeverityReflectNodes" style="padding:4px 8px;font-size:10px">高重要度を選択</button>
                        <button class="btn ok" data-act="reflectModeVisibleSrc" style="padding:4px 8px;font-size:10px">表示中を比較元</button>
                        <button class="btn ok" data-act="reflectModeVisibleTgt" style="padding:4px 8px;font-size:10px">表示中を比較先</button>
                        <button class="btn sub" data-act="selectReflectNodesAll" style="padding:4px 8px;font-size:10px">全選択</button>
                        <button class="btn sub" data-act="clearReflectNodes" style="padding:4px 8px;font-size:10px">全解除</button>
                        <button class="btn ok" data-act="reflectModeAllSrc" style="padding:4px 8px;font-size:10px">一括で比較元</button>
                        <button class="btn ok" data-act="reflectModeAllTgt" style="padding:4px 8px;font-size:10px">一括で比較先</button>
                        <button class="btn sub" data-act="reflectUndo" style="padding:4px 8px;font-size:10px">Undo</button>
                        <button class="btn sub" data-act="reflectRedo" style="padding:4px 8px;font-size:10px">Redo</button>
                      </div>
                    </div>
                    <div id="u_nodeFilterBlock" style="display:none;margin-bottom:8px">
                      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
                        <input type="text" id="u_nodeSearch" placeholder="パス / セクション で絞り込み" style="flex:1;min-width:140px;padding:4px 8px;border:1px solid #d6dee8;border-radius:6px;font-size:11px">
                        <select id="u_nodeFilterSection" style="padding:4px 6px;border:1px solid #d6dee8;border-radius:6px;font-size:11px"><option value="">全セクション</option></select>
                        <select id="u_nodeFilterType" style="padding:4px 6px;border:1px solid #d6dee8;border-radius:6px;font-size:11px">
                          <option value="">全種別</option><option value="added">追加</option><option value="removed">削除</option><option value="changed">変更</option>
                        </select>
                        <select id="u_nodeFilterSeverity" style="padding:4px 6px;border:1px solid #d6dee8;border-radius:6px;font-size:11px">
                          <option value="">全重要度</option><option value="HIGH">高</option><option value="MEDIUM">中</option><option value="LOW">低</option>
                        </select>
                        <button class="btn sub" type="button" data-act="toggleReflectPropertyPanel" style="padding:4px 8px;font-size:10px">プロパティ選択</button>
                        <button class="btn sub" data-act="clearReflectNodeFilters" style="padding:4px 8px;font-size:10px">絞り込み解除</button>
                      </div>
                      <div id="u_nodePropertyPanel" style="display:none;margin-top:8px;border:1px solid #d6dee8;border-radius:8px;background:#f8fafc;padding:8px 10px">
                        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px">
                          <div style="font-size:11px;font-weight:700;color:#334155">対象プロパティ（kintone設定風チェックリスト）</div>
                          <div style="display:flex;gap:6px">
                            <button class="btn sub" type="button" data-act="selectAllReflectProperties" style="padding:3px 7px;font-size:10px">全選択</button>
                            <button class="btn sub" type="button" data-act="clearReflectProperties" style="padding:3px 7px;font-size:10px">全解除</button>
                          </div>
                        </div>
                        <div id="u_nodePropertyChips" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px"></div>
                        <div id="u_nodePropertyList" style="max-height:160px;overflow:auto;background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:6px"></div>
                      </div>
                    </div>
                    <div class="reflect-node-workbench" id="u_reflectNodeWorkbench" style="display:none">
                      <div class="reflect-node-pane">
                        <div class="reflect-node-list-wrap">
                          <div class="result" id="u_reflectNodeList" style="max-height:none;border:1px solid #dbe3ed;border-radius:8px;overflow:auto;flex:1"></div>
                        </div>
                      </div>
                      <div class="reflect-node-detail" id="u_reflectNodeDetail"></div>
                    </div>
                    <div id="u_patchJsonPanel" style="display:none">
                      <div class="opt-card" style="margin-top:8px">
                        <div class="opt-title">JSON差分反映</div>
                        <div class="muted" style="margin-bottom:6px">パッチJSONファイルを読み込むか、直接編集して比較先プレビューに反映します。</div>
                        <div class="btns" style="margin-bottom:6px">
                          <button class="btn sub" data-act="patchJsonLoadFile">JSONファイル読込</button>
                          <input type="file" id="u_patchJsonFileInput" accept=".json" style="display:none">
                          <button class="btn sub" data-act="patchJsonClear">クリア</button>
                        </div>
                        <div id="u_patchJsonSummary" style="display:none;margin-bottom:6px;padding:6px 10px;border-radius:6px;font-size:11px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af"></div>
                        <textarea id="u_patchJsonEditor" placeholder='パッチJSONをここに貼り付け、またはファイルから読み込み...' style="width:100%;min-height:160px;max-height:320px;font-family:monospace;font-size:11px;resize:vertical;border:1px solid #d1d5db;border-radius:6px;padding:8px;box-sizing:border-box"></textarea>
                        <div class="btns" style="margin-top:6px">
                          <button class="btn ok" data-act="applyPatchJson">この内容で反映</button>
                        </div>
                      </div>
                    </div>
                    <details class="diff-fold" id="u_reflectPreviewEditorFold" style="margin-top:8px" open>
                      <summary class="diff-fold-summary">
                        <span class="diff-fold-title">フィールド差分プレビューエディタ（試験）</span>
                        <span class="diff-fold-sub">追加/削除/編集/ドラッグ上書きの事前確認UI</span>
                      </summary>
                      <div class="diff-fold-body">
                        <div class="muted" style="margin-top:0;line-height:1.6">統合ツール内でフィールド差分のプレビューを操作できる補助エディタです。ドラッグ＆ドロップで別カードへ設定上書き（code/typeは保持）、JSON編集とUndoにも対応します。</div>
                        <div id="u_reflectPreviewPlayground" class="reflect-preview-playground"></div>
                      </div>
                    </details>
                  </div>
                  <div class="reflect-footer-stack">
                    <div class="reflect-footer-badges" id="u_reflectFooterBadges" aria-live="polite"></div>
                    <div class="reflect-footer-options" id="u_reflectOptionsCard">
                      <div class="reflect-footer-options__label">反映オプション</div>
                      <div class="reflect-footer-options__chips">
                        <label class="chip" title="反映直前に比較先プレビューの設定JSONを自動保存します"><input type="checkbox" id="u_autoBackupPreview" checked> バックアップ自動保存</label>
                        <label class="chip" title="APIエラーが出た時点で残りの反映を止めます"><input type="checkbox" id="u_stopOnError" checked> エラー時中断</label>
                        <label class="chip reflect-opt-deploy" title="プレビューへの書き込み後、本番反映用のデプロイAPIを続けて呼びます"><input type="checkbox" id="u_doDeploy"> 反映後デプロイ（本番）</label>
                      </div>
                      <div id="u_backupStatus" style="display:none;margin-top:6px;padding:6px 10px;border-radius:6px;font-size:11px;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46"></div>
                    </div>
                    <div class="reflect-footer-actions main-footer" id="u_reflectFooter">
                      <div class="reflect-footer-actions__preview">
                        <span class="reflect-footer-zone-label">プレビューAPI</span>
                        <button type="button" class="btn sub" data-act="runDiff" id="u_footerRunDiff" title="差分比較を実行します">差分比較</button>
                        <button type="button" class="btn sub" data-act="previewApplyPlan" id="u_footerPlan" title="比較先プレビューに対するAPIリクエスト内容を結果欄に表示します（実行前の確認）">反映プラン確認</button>
                        <button type="button" class="btn sub" data-act="backupTargetPreview" title="比較先のプレビュー設定をJSONファイルとして保存します">バックアップ</button>
                        <button type="button" class="btn ok" data-act="applyPreview" id="u_footerApply" title="選択セクションを比較先のプレビュー環境へ書き込みます。未確認時はプラン確認が先に開きます">比較元 → 比較先(プレビュー) 反映</button>
                        <button type="button" class="btn sub reflect-footer-advanced-btn" data-act="togglePatchJsonPanel" title="パッチJSONを直接読み込んで反映するパネルを開きます">JSON差分反映</button>
                      </div>
                      <div class="reflect-footer-actions__prod">
                        <span class="reflect-footer-zone-label reflect-footer-zone-label--prod">本番デプロイ</span>
                        <button type="button" class="btn btn-deploy-foot" data-act="deployOnly" title="プレビュー内容を本番にデプロイするAPIのみ実行します">デプロイのみ</button>
                      </div>
                      <span class="footer-status" id="u_reflectFooterStatus"></span>
                    </div>
                  </div>
                </div>
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
                <textarea id="u_fieldJson" placeholder='{"text_1":{"type":"SINGLE_LINE_TEXT","code":"text_1","label":"テキスト"}}' title="有効なフィールド型・code・label を含むJSON"></textarea>
              </div>
              <div class="grid2" style="margin-top:8px">
                <label class="chip" title="既存の同一 code のフィールドを置き換えます"><input type="checkbox" id="u_overwriteField"> 同一コードは上書き</label>
                <label class="chip" title="フィールド更新APIの後にデプロイを実行します"><input type="checkbox" id="u_deployField"> 更新後にデプロイ</label>
              </div>
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
                  <span class="diff-fold-sub">プレフィックス・未使用検出 → 上のJSONへ出力</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="font-size:12px;margin-bottom:6px">フィールド一括操作（比較先アプリ）</div>
              <div class="muted" style="margin-bottom:8px;line-height:1.55">比較先アプリの現在のフィールドを元に一括操作し、上の「追加フィールドJSON」に結果を出力します。</div>
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
                <button type="button" class="btn sub" data-act="runDetectUnusedFields" title="式・ビュー等から参照されていないフィールドを推定">影響のない（未使用）フィールドを検出</button>
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
                <label class="chip" title="PUT 後にデプロイAPIを続けて呼びます"><input type="checkbox" id="u_jsconfigDeployAfter"> 反映後にデプロイ</label>
              </div>
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
                <div class="subpane-note">比較先のスペース配下にある複数アプリの JS/CSS をまとめて取得します。</div>
              <details class="diff-fold diff-fold--jsconfig-batch" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">全アプリ JS/CSS 一括ZIP（比較先）</span>
                  <span class="diff-fold-sub">スペース内アプリを走査</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">全アプリのJS/CSS一括ダウンロード（比較先）</div>
              <div class="muted" style="margin-top:8px;line-height:1.6">現在アクセスしているスペース（またはゲストスペース）内の全アプリをスキャンし、JS/CSSファイルの添付を一括でZIP化します。</div>
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
              <div class="subtabs">
                <button class="subtab active" data-subtab-parent="er" data-subtab="diagram">ER図</button>
                <button class="subtab" data-subtab-parent="er" data-subtab="dependency">依存関係</button>
              </div>
              <div class="subpane active" data-subpane-parent="er" data-subpane="diagram">
                <div class="subpane-note">比較元アプリ起点で関連アプリをたどり、ER 図を生成します。</div>
              <details class="diff-fold diff-fold--er-diag" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">ER図のオプションと生成</span>
                  <span class="diff-fold-sub">レイアウト・深さ・別タブ表示</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">ER図自動生成（比較元アプリ起点）</div>
              <div class="muted" style="margin-top:8px;line-height:1.55">比較元アプリからルックアップと関連レコードを辿って、関連するアプリのスキーマ（ER図）を自動取得・描画します。</div>
              <div class="grid2" style="margin-top:10px">
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
                  <label title="カンマ区切りで複数指定">追加の起点アプリID（任意）</label>
                  <input type="text" id="u_erExtraApps" value="" placeholder="例: 123, 456, 789">
                </div>
                <div>
                  <label>追加オプション</label>
                  <div class="chips" style="margin-top:4px">
                    <label class="chip" title="サブテーブル内フィールドもERに含めます"><input type="checkbox" id="u_erIncludeSubtable" checked> サブテーブル項目を含める</label>
                    <label class="chip" title="参照先だけでなく、現在アプリを参照しているアプリも探索します（全アプリを走査）"><input type="checkbox" id="u_erIncludeReverseLookup"> 逆引き探索を有効化</label>
                  </div>
                </div>
              </div>
              <div class="btns" style="margin-top:10px">
                <button type="button" class="btn" data-act="generateERDiagram" title="新しいタブでインタラクティブなERを開きます">ER図を生成 (別タブ表示)</button>
                <button type="button" class="btn sub" data-act="exportERDiagramHtml" title="単体HTMLファイルとして保存">ER図HTML保存</button>
              </div>
                </div>
              </details>
              </div>
              <div class="subpane" data-subpane-parent="er" data-subpane="dependency">
                <div class="subpane-note">フィールド参照や依存関係をネットワーク図として可視化します。</div>
              <details class="diff-fold diff-fold--er-dep" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">フィールド依存関係マップ</span>
                  <span class="diff-fold-sub">式・書式・プロセスなどの参照を可視化</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">フィールド依存関係マップ（比較元アプリ）</div>
              <div class="muted" style="margin-top:8px;line-height:1.55">計算式や条件付書式、プロセス管理など、フィールド間の参照・依存関係をネットワーク図として可視化します。</div>
              <div class="btns" style="margin-top:10px">
                <button type="button" class="btn" data-act="generateFieldDepMap" title="別タブでネットワーク図を表示">依存関係マップを生成 (別タブ表示)</button>
              </div>
                </div>
              </details>
              </div>
            </div>

            
            <div class="pane" data-pane="sql">
              <details class="diff-fold diff-fold--sql" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">kintone SQL（比較元ベース）</span>
                  <span class="diff-fold-sub">Alasql でレコードにSQLライクにアクセス</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">kintone SQL 実行（比較元アプリベース）</div>
              <div class="muted" style="margin-top:8px;line-height:1.55">Alasqlを用いて、Kintone上でSQLライクにデータアクセス・集計を行います。</div>
              <div class="btns" style="margin-top:10px">
                <button type="button" class="btn ok" data-act="launchKintoneSql" title="別UIのSQLエディタを開きます">SQLエディタを開く</button>
              </div>
                </div>
              </details>
            </div>

            <div class="pane" data-pane="apiTester">
              <details class="diff-fold diff-fold--api" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">kintone API テスター</span>
                  <span class="diff-fold-sub">kintone.api を直接呼び出し</span>
                </summary>
                <div class="diff-fold-body">
              <div class="step" style="margin-top:0">リクエストの組み立てと実行</div>
              <div class="muted" style="margin-top:8px;line-height:1.55">指定したエンドポイントに対して kintone.api を直接実行し、レスポンスを確認します。※ゲストスペースIDを指定すると <code>/k/guest/{id}/v1/...</code> 等が使われます。</div>
              <div style="display:flex;gap:16px;margin-top:8px;">
                <div style="flex:5;min-width:0;">
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
                      <input type="text" id="u_apiTesterPath" placeholder="例: /k/v1/record.json または /app/settings">
                    </div>
                  </div>
                  <div style="margin-top:8px">
                    <label title="GET のときは無視されることがあります">リクエストBody (JSONフォーマット)</label>
                    <textarea id="u_apiTesterBody" style="min-height:100px;font-family:monospace" placeholder='{"app": 1, "id": 100}'></textarea>
                  </div>
                  <div class="btns" style="margin-top:10px;display:flex;">
                    <button type="button" class="btn warn" data-act="runApiTester" title="本番データの変更に注意">APIを実行</button>
                    <button type="button" class="btn sub" data-act="clearApiTesterHistory" style="margin-left:auto;">履歴クリア</button>
                  </div>
                  <div class="result" id="u_apiTesterResult" style="max-height:300px;margin-top:8px;overflow:auto">実行結果がここに表示されます</div>
                </div>
                <div style="flex:2;max-width:280px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px;display:flex;flex-direction:column;">
                  <div style="font-size:12px;font-weight:800;color:#334155;margin-bottom:8px;">⏱️ 最近の実行履歴</div>
                  <div id="u_apiTesterHistoryList" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px;">
                    <div style="color:#94a3b8;font-size:11px;font-style:italic;padding:8px;">履歴はありません</div>
                  </div>
                </div>
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
                <div class="subpane-note">複数アプリの設定をまとめて取得して JSON / ZIP で出力します。セクション一覧は折りたたみ可能です。</div>
              <details class="diff-fold diff-fold--settings-apps" open>
                <summary class="diff-fold-summary">
                  <span class="diff-fold-title">対象アプリ・ゲスト・プレビュー</span>
                  <span class="diff-fold-sub">IDリストの編集とアプリ検索</span>
                </summary>
                <div class="diff-fold-body">
              <div class="muted" style="margin-top:0;line-height:1.6">複数アプリの設定をまとめて取得し、JSONまたはZIPで出力します（JS/CSS設定は「JS/CSS設定」タブで取得）。</div>
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
                  <span class="diff-fold-sub">チェックしたAPI設定だけ取得（初期は閉じるとすっきり）</span>
                </summary>
                <div class="diff-fold-body">
                <div class="btns" style="margin-top:0">
                  <button type="button" class="btn sub" data-act="settingsExportScopeAll" title="全セクションをオン">全選択</button>
                  <button type="button" class="btn sub" data-act="settingsExportScopeNone" title="すべてオフ">全解除</button>
                </div>
                <div class="chips diff-scope-chips" id="u_settingsExportScopes"></div>
                </div>
              </details>
              <div class="btns" style="margin-top:10px">
                <button type="button" class="btn" data-act="runSettingsExportJson" title="1ファイルのJSONにまとめて保存">JSON出力</button>
                <button type="button" class="btn dark" data-act="runSettingsExportZip" title="アプリごとに分割してZIP">ZIP出力</button>
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
          </div>

          <div class="status-row status-bar" id="u_statusBar" role="status" aria-live="polite" aria-relevant="text">
            <div class="status status--neutral" id="u_status">待機中</div>
            <button type="button" class="btn sub status-copy-btn" data-act="copyStatusMessage" title="ステータス行の内容をコピー（エラー時はスタックトレース付き）">コピー</button>
          </div>

          <div class="card result-card">
            <div class="result-card-head">
              <span class="result-card-mark" aria-hidden="true"></span>
              <div>
                <div class="result-card-title">結果</div>
                <div class="result-card-sub">開いているタブに応じたログやプレビュー。差分の詳細テーブルは差分比較の「結果整理」サブタブ時のみ表示されます。</div>
              </div>
            </div>
            <div class="result" id="u_result"></div>
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
