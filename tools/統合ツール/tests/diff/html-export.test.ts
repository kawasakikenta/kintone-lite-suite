import { describe, expect, it } from 'vitest';
import {
  buildDiffExportPayload,
  buildDiffHtml,
  buildDiffWarningInfo,
  buildPatchPayload,
  selectDiffHtmlRowsForExport
} from '../../src/diff/export';
import { buildDiffHtmlStandaloneExport } from '../../src/tabs/diff-export-standalone';

function extractInlineScript(html: string): string {
  const match = html.match(/<script>([\s\S]*)<\/script>/);
  if (!match) throw new Error('inline report script was not found');
  return match[1];
}

function extractInlineJsonConst(html: string, name: string): any {
  const script = extractInlineScript(html);
  const match = script.match(new RegExp(`\\bconst ${name} = (.+);\\r?\\n`));
  if (!match) throw new Error(`${name} was not found in inline report script`);
  return JSON.parse(match[1]);
}

describe('diff/html export', () => {
  it('preserves partial comparison issues in warning totals and JSON metadata', () => {
    const partialIssues = [{
      sectionKey: 'customizeSettings',
      section: 'JS/CSS',
      side: 'source',
      message: '一部ファイルは本文比較を省略し、fileKey で比較します',
      files: [{ fileName: 'large.js', fileKey: 'large-key', reason: 'oversize', byteSize: 2 * 1024 * 1024 }]
    }];
    const warning = buildDiffWarningInfo([], [], partialIssues);

    expect(warning).toMatchObject({
      diffCount: 0,
      issueCount: 0,
      partialIssueCount: 1,
      total: 1
    });

    const payload = buildDiffExportPayload({
      sourceBundle: { appId: '1', sections: {} },
      targetBundle: { appId: '2', sections: {} },
      rows: [],
      fetchIssues: [],
      partialIssues
    });

    expect(payload.summary).toMatchObject({
      fetchIssueCount: 0,
      partialIssueCount: 1,
      incompleteComparison: true
    });
    expect(payload.partialIssues).toEqual(partialIssues);
    expect(payload.sectionSummaries).toContainEqual(expect.objectContaining({
      sectionKey: 'customizeSettings',
      partialIssueCount: 1
    }));
  });

  it('redacts identical plugin settings and customize bodies from JSON and HTML exports', () => {
    const rows = [{
      sectionKey: 'pluginSettings', section: 'プラグイン', type: 'same', path: 'pluginSettings',
      left: { plugins: [{ id: 'plugin-1', config: { token: 'PLUGIN_SAME_SECRET' } }] },
      right: { plugins: [{ id: 'plugin-1', config: { token: 'PLUGIN_SAME_SECRET' } }] }
    }, {
      sectionKey: 'customizeSettings', section: 'JS/CSS', type: 'same', path: 'customizeSettings.desktop.js[0].file._body',
      left: 'CUSTOM_SAME_SECRET', right: 'CUSTOM_SAME_SECRET'
    }];
    const sourceBundle = { appId: '1', sections: { pluginSettings: {}, customizeSettings: {} } };
    const targetBundle = { appId: '2', sections: { pluginSettings: {}, customizeSettings: {} } };

    const payload = buildDiffExportPayload({ sourceBundle, targetBundle, rows });
    const html = buildDiffHtml(sourceBundle, targetBundle, rows, ['pluginSettings', 'customizeSettings'], '', {
      fetchIssues: [], truncation: null
    });
    const serializedPayload = JSON.stringify(payload);

    expect(serializedPayload).not.toContain('PLUGIN_SAME_SECRET');
    expect(serializedPayload).not.toContain('CUSTOM_SAME_SECRET');
    expect(serializedPayload).toContain('同一の機密値は安全のため省略しました');
    expect(html).not.toContain('PLUGIN_SAME_SECRET');
    expect(html).not.toContain('CUSTOM_SAME_SECRET');
    expect(html).toContain('同一の機密値は安全のため省略しました');
    expect(html).toContain('機密値を重複収録しないため値を省略しています');
  });

  it('emits syntactically valid inline script for the standalone report', () => {
    const sourceBundle = {
      appId: '1',
      guestId: '',
      preview: false,
      sections: {
        fieldSettings: {
          properties: {
            field_a: { code: 'field_a', label: '旧ラベル', type: 'SINGLE_LINE_TEXT' }
          }
        },
        layoutSettings: { layout: [] }
      },
      meta: { sectionRevisions: { fieldSettings: '1' } }
    };
    const targetBundle = {
      appId: '2',
      guestId: '',
      preview: false,
      sections: {
        fieldSettings: {
          properties: {
            field_a: { code: 'field_a', label: '新ラベル', type: 'SINGLE_LINE_TEXT' }
          }
        },
        layoutSettings: { layout: [] }
      },
      meta: { sectionRevisions: { fieldSettings: '2' } }
    };
    const rows = [{
      _id: 'row-1',
      sectionKey: 'fieldSettings',
      section: 'フィールド',
      type: 'changed',
      path: 'fieldSettings.properties.field_a.label',
      left: '旧ラベル',
      right: '新ラベル',
      severity: 'low'
    }];

    const html = buildDiffHtml(sourceBundle, targetBundle, rows, ['fieldSettings'], '', {});

    expect(() => new Function(extractInlineScript(html))).not.toThrow();
  });

  it('coalesces report search, caches row text, and exposes stable rendering status', () => {
    const bundle = {
      appId: '1', guestId: '', preview: false,
      sections: { appSettings: { name: 'アプリ' } }, meta: {}
    };
    const rows = [{
      _id: 'search-row', sectionKey: 'appSettings', section: 'アプリ設定', type: 'changed',
      path: 'appSettings.name', left: '旧名称', right: '新名称', severity: 'medium'
    }];
    const html = buildDiffHtml(bundle, { ...bundle, appId: '2' }, rows, ['appSettings'], '', {});
    const script = extractInlineScript(html);

    expect(() => new Function(script)).not.toThrow();
    expect(script).toContain('const ROW_SEARCH_TEXT_CACHE = new WeakMap();');
    expect(script).toContain('const REPORT_SEARCH_DEBOUNCE_MS = 150;');
    expect(script).toContain('function rowSearchText(row)');
    expect(script).toContain('ROW_SEARCH_TEXT_CACHE.get(row)');
    expect(script).toContain('ROW_SEARCH_TEXT_CACHE.set(row, text)');
    expect(script).toContain('function scheduleReportSearchRender()');
    expect(script).toContain('reportSearchFrame = window.requestAnimationFrame');
    expect(script).toContain("searchInput.addEventListener('compositionstart'");
    expect(script).toContain("searchInput.addEventListener('compositionend'");
    expect(script).toContain('searchCompositionActive || event.isComposing');
    expect(script).toContain("main.setAttribute('aria-busy', busy ? 'true' : 'false')");
    expect(script).toContain("'件、未確認 ' + viewState.progress.pending + '件'");

    expect(html).toContain('id="reportFilterStatus" class="report-filter-status" role="status" aria-live="polite" aria-atomic="true"');
    expect(html).toContain('id="main" aria-busy="false"');
    expect(html.indexOf('id="reportFilterStatus"')).toBeLessThan(html.indexOf('id="main"'));
    expect(html).toContain('@supports (content-visibility:auto)');
    expect(html).toContain('.drow,.fj-block,.fc-card{content-visibility:auto;contain-intrinsic-size:auto 180px}');
    expect(html).toContain('.drow[aria-current="true"]');
    expect(html).toContain('.fc-card:focus-within{content-visibility:visible}');
  });

  it('exposes severity review and the comparison controls', () => {
    const sourceBundle = {
      appId: '1', guestId: '', preview: false,
      sections: { fieldSettings: { properties: {} }, layoutSettings: { layout: [] } },
      meta: { sectionRevisions: { fieldSettings: '1' } }
    };
    const targetBundle = {
      appId: '2', guestId: '', preview: false,
      sections: { fieldSettings: { properties: {} }, layoutSettings: { layout: [] } },
      meta: { sectionRevisions: { fieldSettings: '2' } }
    };
    const html = buildDiffHtml(sourceBundle, targetBundle, [], ['fieldSettings'], '', {});

    // 重要度は文字ラベル付きで表示・絞り込み・並び替えできる
    expect(html).toContain('data-severity-chip');
    expect(html).toContain('id="diffSeveritySel"');
    expect(html).toContain('全重要度');
    expect(html).toContain('重要度が高い順（高→中→低）');
    expect(html).toContain('.severity-chip--high');

    // 素のJSON比較・確認済み・CSV/MD 出力・確認済み統計を追加
    expect(html).toContain('id="rawJson"');
    expect(html).toContain('id="hideReviewed"');
    expect(html).toContain('id="csvBtn"');
    expect(html).toContain('id="mdBtn"');
    expect(html).toContain('id="stat-reviewed"');

    // 選択差分→反映JSON・比較元/比較先JSON出力・選択統計
    expect(html).toContain('id="reflectJsonBtn"');
    expect(html).toContain('id="reflectJsonCopyBtn"');
    expect(html).toContain('id="srcJsonBtn"');
    expect(html).toContain('id="tgtJsonBtn"');
    expect(html).toContain('id="stat-selected"');

    // KV差分色付けと関連レコード一覧設定の日本語キーラベル
    const script = extractInlineScript(html);
    expect(html).toContain('tr.kv-add>td');
    expect(script).toContain('SETTING_KEY_LABELS');
    expect(script).toContain('renderSettingKvTable');

    // 英語見出しの日本語化
    expect(html).not.toContain('Visual Diff / Settings Review');
    expect(html).not.toContain('Kintone Settings Diff');
    expect(html).not.toContain('Field Detail Popup');
  });

  it('keeps severity filtering and sticky focus treatment explicit in the generated report', () => {
    const bundle = {
      appId: '1', guestId: '', preview: false,
      sections: { fieldSettings: { properties: {} } }, meta: {}
    };
    const rows = [{
      _id: 'high-row', sectionKey: 'fieldSettings', section: 'フィールド', type: 'changed',
      path: 'fieldSettings.properties.critical.required', left: false, right: true, severity: 'high'
    }, {
      _id: 'medium-row', sectionKey: 'fieldSettings', section: 'フィールド', type: 'changed',
      path: 'fieldSettings.properties.notice.label', left: '旧', right: '新', severity: 'medium'
    }, {
      _id: 'low-row', sectionKey: 'fieldSettings', section: 'フィールド', type: 'changed',
      path: 'fieldSettings.properties.memo.defaultValue', left: '', right: '任意', severity: 'low'
    }];
    const html = buildDiffHtml(bundle, { ...bundle, appId: '2' }, rows, ['fieldSettings'], '', {});
    const script = extractInlineScript(html);

    expect(() => new Function(script)).not.toThrow();
    expect(script).toContain("let severityFilterValue = 'all';");
    expect(script).toContain("normalizeSeverity(row && row.severity) === severityFilterValue");
    expect(script).toContain("severityRank(a && a.severity) - severityRank(b && b.severity)");
    expect(script).toContain(`data-severity="' + severity + '"`);
    expect(script).toContain(`重要度 ' + severityLabel(severity)`);
    expect(script).toContain("style.setProperty('--diff-toolbar-offset', offset + 'px')");
    expect(html).toContain('.sec-head{position:sticky;top:var(--diff-toolbar-offset)');
    expect(html).toContain('scroll-margin-top:calc(var(--diff-toolbar-offset) + 12px)');
    expect(html).toContain('.drow--focus{position:relative;z-index:1;opacity:1');
    expect(html).toContain('.drow--focus .drow-head::before{content:"現在"');
  });

  it('builds a review-first responsive hierarchy without exposing raw paths as the primary title', () => {
    const sourceBundle = {
      appId: '1', guestId: '', preview: false,
      sections: { appSettings: { name: '旧アプリ', description: '旧説明' } }, meta: {}
    };
    const targetBundle = {
      appId: '2', guestId: '', preview: false,
      sections: { appSettings: { name: '新アプリ', description: '新説明' } }, meta: {}
    };
    const rows = [{
      _id: 'description', sectionKey: 'appSettings', section: 'アプリ設定', type: 'changed',
      path: 'appSettings.description', left: '旧説明', right: '新説明', severity: 'high'
    }, {
      _id: 'name', sectionKey: 'appSettings', section: 'アプリ設定', type: 'changed',
      path: 'appSettings.name', left: '旧アプリ', right: '新アプリ', severity: 'medium'
    }, {
      _id: 'long', sectionKey: 'appSettings', section: 'アプリ設定', type: 'changed',
      path: 'appSettings.longText', left: 'a'.repeat(1500), right: 'b'.repeat(1500), severity: 'low'
    }];
    const html = buildDiffHtml(sourceBundle, targetBundle, rows, ['appSettings'], '', {});
    const script = extractInlineScript(html);

    expect(() => new Function(script)).not.toThrow();
    expect(script).toContain('"_reportDisplayTitle":"説明"');
    expect(script).toContain('id="reviewQueueHost"');
    expect(script).toContain('最優先レビュー');
    expect(script).toContain('data-priority-filter');
    expect(script).toContain('data-clear-filter');
    expect(script).toContain('一覧条件をすべて解除');
    expect(script).toContain('class="path-tech"');
    expect(script).toContain('renderInlineLane(\'source\', \'del\'');
    expect(script).toContain('renderDuoLaneHeader(\'source\', \'比較元\')');
    expect(script).toContain('長い設定値を表示');
    expect(script).toContain('requestAnimationFrame(() => document.getElementById(\'diffSeveritySel\')?.focus())');
    expect(script).toContain('requestAnimationFrame(() => document.getElementById(\'diffSortSel\')?.focus())');
    expect(script).toContain('const focusType = typeFilterValue;');
    expect(html).toContain('id="mobileSidebarToggle"');
    expect(html).toContain('aria-controls="sidebarPanels"');
    expect(html).toContain('@media (max-width:560px)');
    expect(html).toContain('.long-value>summary:focus-visible');
  });

  it('uses structured comparison cards and an accessible fixed mobile filter drawer', () => {
    const sourceBundle = {
      appId: '101', guestId: '', preview: false,
      sections: { appSettings: { name: '比較元アプリ' } }, meta: {}
    };
    const targetBundle = {
      appId: '202', guestId: '', preview: false,
      sections: { appSettings: { name: '比較先アプリ' } }, meta: {}
    };
    const html = buildDiffHtml(sourceBundle, targetBundle, [], ['appSettings'], '', {});
    const script = extractInlineScript(html);

    expect(() => new Function(script)).not.toThrow();
    expect(html).toContain('class="topbar-eyebrow-row"');
    expect(html).toContain('class="topbar-app-card topbar-app-card--source"');
    expect(html).toContain('class="topbar-app-card topbar-app-card--target"');
    expect(html).toContain('class="topbar-app-eyebrow">BEFORE</span>');
    expect(html).toContain('class="topbar-app-eyebrow">AFTER</span>');
    expect(html).not.toContain('class="topbar-apps"');
    expect(html).toContain('.topbar-eyebrow-row{display:flex;align-items:center;justify-content:space-between');
    expect(html).toContain('.header-badge{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;white-space:nowrap;writing-mode:horizontal-tb');
    expect(html).toContain('.topbar-compare{grid-template-columns:1fr;gap:4px}');
    expect(html).toContain('.topbar-arrow{height:14px;transform:rotate(90deg)}');

    expect(html).toContain('id="sidebarBackdrop"');
    expect(html).toContain('id="sidebarDrawerClose"');
    expect(html).toContain('.sidebar-panels{display:none;position:fixed;top:0;right:0;bottom:0');
    expect(script).toContain("panel.setAttribute('role', 'dialog')");
    expect(script).toContain("panel.setAttribute('aria-modal', 'true')");
    expect(script).toContain("main.setAttribute('inert', '')");
    expect(script).toContain("document.body.classList.add('sidebar-drawer-open')");
    expect(html).toContain('body.sidebar-drawer-open .report-toast{display:none}');
    expect(html).toContain('id="reportToast" class="report-toast" role="status"');
    expect(html).toContain('.review-progress-note,.review-queue-samples{display:none}');
    expect(script).toContain("if (e.key === 'Escape')");
    expect(script).toContain('mobileSidebarReturnFocus.focus()');
  });

  it('keeps review progress, zero-result recovery, density and focused review in one workflow', () => {
    const bundle = {
      appId: '1', guestId: '', preview: false,
      sections: { appSettings: { name: '旧アプリ', description: '旧説明' } }, meta: {}
    };
    const rows = [{
      _id: 'high-row', sectionKey: 'appSettings', section: 'アプリ設定', type: 'changed',
      path: 'appSettings.name', left: '旧アプリ', right: '新アプリ', severity: 'high'
    }, {
      _id: 'medium-row', sectionKey: 'appSettings', section: 'アプリ設定', type: 'changed',
      path: 'appSettings.description', left: '旧説明', right: '新説明', severity: 'medium'
    }];
    const html = buildDiffHtml(bundle, { ...bundle, appId: '2' }, rows, ['appSettings'], '', {});
    const script = extractInlineScript(html);

    expect(() => new Function(script)).not.toThrow();
    expect(html).toContain('id="sidebarReviewProgressBar"');
    expect(html).toContain('role="progressbar" aria-label="レビュー進捗"');
    expect(script).toContain('function reviewProgressOf(rows)');
    expect(script).toContain('const sectionReviewProgress = new Map()');
    expect(script).toContain('class="sec-review-progress');
    expect(script).toContain("確認済み ' + progress.reviewed + '件 / 全 ' + progress.total + '件");
    expect(script).toContain('data-review-next');
    expect(script).toContain('確認して次へ');
    expect(script).toContain('未確認レビューを開始');
    expect(script).toContain('class="focus-context"');
    expect(script).toContain('id="focusContextPosition"');
    expect(script).toContain("focusPosition.textContent = (currentIndex >= 0 ? currentIndex + 1 : 0)");
    expect(script).toContain('確認状態はJSONファイルで保存・読込できます');
    expect(script).toContain('class="review-queue-actions"');
    expect(script).toContain('function reviewAndMoveNext(key)');
    expect(script).toContain('fieldJsonParts.groups.map((group) => group.reviewRow)');
    expect(script).toContain('rowLookup.set(reviewKey, reviewRow)');
    expect(script).toContain("document.querySelectorAll('#main [data-diff-row-key]')");
    expect(script).toContain("'<span class=\"row-display-only\"");
    expect(script).toContain("String(e.key || '').toLowerCase() === 'r'");
    expect(script).toContain('/^(INPUT|TEXTAREA|SELECT|BUTTON|A|SUMMARY)$/');
    expect(script).toContain('e.isComposing || e.repeat || inInteractiveTarget');
    expect(script).toContain('if (!isMobileSidebarOpen()) openMobileSidebar()');
    expect(script).toContain('element.getClientRects().length > 0');
    expect(script).toContain("diffFocusKey = '';");

    expect(script).toContain('function getReportViewState()');
    expect(script).toContain('const visibleRows = filterBaseRows.filter(typeFilterMatches).filter(severityFilterMatches)');
    expect(script).toContain('全体 <b>');
    expect(script).toContain('表示中 <b>');
    expect(script).toContain('未確認 <b>');
    expect(script).toContain('この条件に該当する行はありません');
    expect(script).toContain('data-clear-filter="all"');

    expect(script).toContain('data-density-toggle');
    expect(script).toContain('data-focus-mode');
    expect(script).toContain('data-mobile-toolbar-toggle');
    expect(html).toContain('body.mobile-toolbar-expanded .diff-toolbar-row--filters{display:grid');
    expect(html).toContain('body.diff-focus-mode .sec:not(:has(.drow--focus)){display:none}');
    expect(html).toContain('body.diff-focus-mode .drow:not(.drow--focus)');
    expect(html).toContain('body.diff-density-compact .drow{padding:8px 11px 9px}');
    expect(html).toContain('.drow--reviewed{opacity:1;background:linear-gradient');
    expect(html).not.toContain('.drow--reviewed{opacity:.62}');
    expect(html).toContain('button:disabled,.btn:disabled,.tchip:disabled');
    expect(script).toContain('>追加 ');
    expect(script).toContain('>削除 ');
    expect(script).toContain('>変更 ');
  });

  it('saves and atomically restores reviewed rows with deterministic report-bound keys', () => {
    const sourceBundle = {
      appId: '101', guestId: '8', preview: false, fetchedAt: '2026-08-17T01:00:00.000Z',
      sections: { appSettings: { name: '比較元' } }, meta: { revision: '10' }
    };
    const targetBundle = {
      appId: '202', guestId: '8', preview: true, fetchedAt: '2026-08-17T01:00:00.000Z',
      sections: { appSettings: { name: '比較先' } }, meta: { revision: '20' }
    };
    const rows = [{
      _id: 'd0', sectionKey: 'appSettings', section: 'アプリ設定', type: 'changed',
      path: 'appSettings.name', left: '比較元', right: '比較先', severity: 'high'
    }, {
      _id: 'd1', sectionKey: 'appSettings', section: 'アプリ設定', type: 'same',
      path: 'appSettings.description', left: '', right: '', severity: 'low'
    }, {
      _id: 'd2', sectionKey: 'appSettings', section: 'アプリ設定', type: 'changed',
      path: 'appSettings.states.__rename__', left: '旧', right: '新', severity: 'low', _displayOnly: true
    }];

    const first = buildDiffHtml(sourceBundle, targetBundle, rows, ['appSettings'], '', {});
    const regenerated = buildDiffHtml(
      { ...sourceBundle, fetchedAt: '2026-08-18T02:00:00.000Z', meta: { revision: '11' } },
      { ...targetBundle, fetchedAt: '2026-08-18T02:00:00.000Z', meta: { revision: '21' } },
      rows.map((row, index) => ({ ...row, _id: `different-${index}` })),
      ['appSettings'],
      '',
      {}
    );
    const changed = buildDiffHtml(
      sourceBundle,
      targetBundle,
      rows.map((row, index) => index === 0 ? { ...row, right: '別の比較先' } : row),
      ['appSettings'],
      '',
      {}
    );

    const firstMeta = extractInlineJsonConst(first, 'REPORT_META');
    const regeneratedMeta = extractInlineJsonConst(regenerated, 'REPORT_META');
    const changedMeta = extractInlineJsonConst(changed, 'REPORT_META');
    const reportRows = extractInlineJsonConst(first, 'REPORT_ROWS');
    const script = extractInlineScript(first);

    expect(firstMeta.reviewState).toMatchObject({
      kind: 'kintone-diff-review-state',
      version: 1,
      maxBytes: 2 * 1024 * 1024,
      actionableRowCount: 1
    });
    expect(firstMeta.reviewState.fingerprint).toBe(regeneratedMeta.reviewState.fingerprint);
    expect(firstMeta.reviewState.fingerprint).not.toBe(changedMeta.reviewState.fingerprint);
    expect(reportRows[0]._reviewKey).toMatch(/^review-v1-[0-9a-f]{16}-1$/);
    expect(reportRows[0]._reviewKey).not.toContain('d0');
    expect(reportRows[1]._reviewKey).toBeUndefined();
    expect(reportRows[2]._reviewKey).toBeUndefined();

    expect(first).toContain('id="reviewStateSaveBtn"');
    expect(first).toContain('id="reviewStateLoadBtn"');
    expect(first).toContain('id="reviewStateFile" accept="application/json,.json" hidden');
    expect(first).toContain('id="reviewStateStatus"');
    expect(script).toContain('function validateReviewStatePayload(payload)');
    expect(script).toContain("payload.reportFingerprint !== REVIEW_STATE_FINGERPRINT");
    expect(script).toContain('別の差分レポートのレビュー状態なので読み込めません');
    expect(script).toContain('const nextReviewedKeys = validateReviewStatePayload(payload)');
    expect(script.indexOf('const nextReviewedKeys = validateReviewStatePayload(payload)'))
      .toBeLessThan(script.indexOf('reviewedKeys.clear();'));
    expect(script).toContain('Number(file.size || 0) > REVIEW_STATE_MAX_BYTES');
    expect(script).toContain("row.type !== 'same' && !row._displayOnly && row._reviewKey");
    expect(script).toContain("row._reviewKey || row._id");
    expect(script).not.toContain('localStorage');
    expect(script).not.toContain('sessionStorage');
    expect(() => new Function(script)).not.toThrow();
  });

  it('provides keyboard-operable tabs and modal focus management', () => {
    const bundle = {
      appId: '1', guestId: '', preview: false,
      sections: { fieldSettings: { properties: {} } }, meta: {}
    };
    const html = buildDiffHtml(bundle, { ...bundle, appId: '2' }, [], ['fieldSettings'], '', {});
    const script = extractInlineScript(html);

    expect(html).toContain('aria-controls="reportPaneDiff"');
    expect(html).toContain('role="tabpanel" aria-labelledby="reportTabDiff"');
    expect(html).toContain('aria-describedby="fieldDetailModalSub" tabindex="-1"');
    expect(script).toContain("'ArrowLeft', 'ArrowRight', 'Home', 'End'");
    expect(script).toContain("e.key === 'Tab' && detailModalOpen");
    expect(script).toContain('fieldDetailReturnFocus');
    expect(() => new Function(script)).not.toThrow();
  });

  it('adds accessible bounded navigation, live position, and responsive side labels', () => {
    const sourceBundle = {
      appId: '1', guestId: '', preview: false,
      sections: {
        fieldSettings: { properties: { field_a: { code: 'field_a', label: '旧', type: 'SINGLE_LINE_TEXT' } } },
        viewSettings: { views: { 一覧: { name: '一覧', type: 'LIST', index: '0' } } }
      },
      meta: {}
    };
    const targetBundle = {
      appId: '2', guestId: '', preview: false,
      sections: {
        fieldSettings: { properties: { field_a: { code: 'field_a', label: '新', type: 'SINGLE_LINE_TEXT' } } },
        viewSettings: { views: { 一覧: { name: '一覧', type: 'LIST', index: '1' } } }
      },
      meta: {}
    };
    const rows = [{
      _id: 'field-row', sectionKey: 'fieldSettings', section: 'フィールド', type: 'changed',
      path: 'fieldSettings.properties.field_a.label', left: '旧', right: '新'
    }, {
      _id: 'view-row', sectionKey: 'viewSettings', section: '一覧', type: 'changed',
      path: 'viewSettings.views.一覧.index', left: '0', right: '1'
    }];
    const html = buildDiffHtml(sourceBundle, targetBundle, rows, ['fieldSettings', 'viewSettings'], '', {});
    const script = extractInlineScript(html);

    expect(() => new Function(script)).not.toThrow();
    expect(script).toContain('id="diffNavPosition"');
    expect(script).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(script).toContain('Math.min(diffNavigationTargets.length - 1, Math.max(0, currentIndex + delta))');
    expect(script).toContain("showToast(delta < 0 ? '先頭の差分です' : '末尾の差分です')");
    expect(script).toContain('diffNavigationTargets.length === 0 || atStart || atEnd');
    expect(script).toContain('collapsed.delete(target.sectionKey)');
    expect(script).toContain('active.focus({ preventScroll: true })');
    expect(script).toContain('data-diff-row-key');
    expect(script).toContain(`aria-current="' + (focused ? 'true' : 'false') + '"`);
    expect(script).toContain('navigationRows.filter((row) => !row._displayOnly)');
    expect(script).toContain("el.setAttribute('role', 'status')");
    expect(script).toContain("document.createElement('button')");
    expect(html).toContain('data-side-label="比較元"');
    expect(html).toContain('data-side-label="比較先"');
    expect(html).toContain('@media (prefers-reduced-motion:reduce)');
  });

  it('colors differing keys inside the reference-table key/value snapshot', () => {
    const referenceTableSrc = {
      condition: { field: '物件ID', relatedField: '子会社ID' },
      displayFields: ['会社名', '住所'],
      relatedApp: { app: '475', code: '' },
      size: '5',
      sort: 'レコード番号 desc'
    };
    const referenceTableTgt = {
      condition: { field: '保有会社選択', relatedField: '子会社ID' },
      displayFields: ['会社名', '住所'],
      relatedApp: { app: '471', code: '' },
      size: '5',
      sort: '子会社ID asc'
    };
    const mkBundle = (appId: string, referenceTable: any) => ({
      appId, guestId: '', preview: false,
      sections: { fieldSettings: { properties: {
        保有会社情報: { code: '保有会社情報', label: '保有会社情報', type: 'REFERENCE_TABLE', referenceTable }
      } }, layoutSettings: { layout: [] } },
      meta: { sectionRevisions: { fieldSettings: appId } }
    });
    const rows = [{
      _id: 'r1', sectionKey: 'fieldSettings', section: 'フィールド', type: 'changed',
      path: 'fieldSettings.properties.保有会社情報.referenceTable.relatedApp.app',
      left: '475', right: '471', severity: 'low'
    }];
    const html = buildDiffHtml(
      mkBundle('475', referenceTableSrc),
      mkBundle('471', referenceTableTgt),
      rows, ['fieldSettings'], '', {}
    );
    const script = extractInlineScript(html);
    // 埋め込みスクリプトは有効な JS のまま
    expect(() => new Function(script)).not.toThrow();
    // 関連レコード一覧設定のキーは日本語ラベルへ変換される
    expect(script).toContain('参照するアプリ');
    expect(script).toContain('表示条件（フィールドの一致）');
  });

  it('embeds both compared bundles and the field-unit JSON compare / reflect helpers', () => {
    const sourceBundle = {
      appId: '1', guestId: '', preview: false,
      sections: {
        fieldSettings: { properties: { field_a: { code: 'field_a', label: '旧', type: 'SINGLE_LINE_TEXT' } } },
        viewSettings: { views: { 一覧: { name: '一覧', type: 'LIST', index: '0' } } }
      },
      meta: { sectionRevisions: { fieldSettings: '1' } }
    };
    const targetBundle = {
      appId: '2', guestId: '', preview: false,
      sections: {
        fieldSettings: { properties: { field_a: { code: 'field_a', label: '新', type: 'SINGLE_LINE_TEXT' } } },
        viewSettings: { views: { 一覧: { name: '一覧', type: 'LIST', index: '1' } } }
      },
      meta: { sectionRevisions: { fieldSettings: '2' } }
    };
    const rows = [{
      _id: 'row-1', sectionKey: 'fieldSettings', section: 'フィールド', type: 'changed',
      path: 'fieldSettings.properties.field_a.label', left: '旧', right: '新', severity: 'low'
    }];
    const html = buildDiffHtml(sourceBundle, targetBundle, rows, ['fieldSettings', 'viewSettings'], '', {});
    const script = extractInlineScript(html);

    expect(() => new Function(script)).not.toThrow();
    // 作成時に利用した両アプリのセクションデータが埋め込まれている
    expect(script).toContain('const SOURCE_SECTIONS');
    expect(script).toContain('const TARGET_SECTIONS');
    // フィールド単位のWinMerge風JSON比較と反映JSONビルダー
    expect(script).toContain('buildFieldJsonGroups');
    expect(script).toContain('renderFieldJsonBlockHtml');
    expect(script).toContain('buildReflectJson');
    expect(script).toContain('const TARGET_PREVIEW_API_PREFIX = "/k/v1/preview";');
    expect(script).toContain("TARGET_PREVIEW_API_PREFIX + '/app/form/fields.json'");
    // フィールド単位ビューにも種別チップの絞り込みがある
    expect(script).toContain('data-field-status-chip');
    // フィールド詳細ポップアップの下部にあった「設定差分」リストは撤去済み
    expect(script).not.toContain('<h3>設定差分</h3>');
  });

  it('keeps raw compared settings out of diffOnly HTML while preserving diff row values', () => {
    const sourceBundle = {
      appId: '1', guestId: '', preview: false,
      sections: {
        fieldSettings: { properties: { field_a: { code: 'field_a', label: 'SOURCE_FIELD_SECRET', type: 'SINGLE_LINE_TEXT' } } },
        layoutSettings: { layout: [{ type: 'ROW', marker: 'SOURCE_LAYOUT_SECRET', fields: [] }] }
      },
      meta: {}
    };
    const targetBundle = {
      appId: '2', guestId: '', preview: false,
      sections: {
        fieldSettings: { properties: { field_a: { code: 'field_a', label: 'TARGET_FIELD_SECRET', type: 'SINGLE_LINE_TEXT' } } },
        layoutSettings: { layout: [{ type: 'ROW', marker: 'TARGET_LAYOUT_SECRET', fields: [] }] }
      },
      meta: {}
    };
    const rows = [{
      _id: 'row-1', sectionKey: 'fieldSettings', section: 'フィールド', type: 'changed',
      path: 'fieldSettings.properties.field_a.label', left: 'ROW_SOURCE_VALUE', right: 'ROW_TARGET_VALUE'
    }, {
      _id: 'same-1', sectionKey: 'fieldSettings', section: 'フィールド', type: 'same',
      path: 'fieldSettings.properties.same_marker', left: 'SAME_ROW_SECRET', right: 'SAME_ROW_SECRET'
    }];

    const safeHtml = buildDiffHtml(sourceBundle, targetBundle, rows, ['fieldSettings', 'layoutSettings'], '', {
      exportContentMode: 'diffOnly',
      exportContentLabel: '差分行のみ（安全共有向け）'
    });
    const safeScript = extractInlineScript(safeHtml);
    const detailedHtml = buildDiffHtml(sourceBundle, targetBundle, rows, ['fieldSettings', 'layoutSettings'], '', {
      exportContentMode: 'withCompared',
      exportContentLabel: '比較設定込み（フィールド詳細・反映JSON）'
    });

    expect(safeHtml).toContain('差分行のみ・設定本文は未収録');
    expect(safeHtml).toContain('ROW_SOURCE_VALUE');
    expect(safeHtml).toContain('ROW_TARGET_VALUE');
    expect(safeHtml).not.toContain('SOURCE_FIELD_SECRET');
    expect(safeHtml).not.toContain('TARGET_FIELD_SECRET');
    expect(safeHtml).not.toContain('SOURCE_LAYOUT_SECRET');
    expect(safeHtml).not.toContain('TARGET_LAYOUT_SECRET');
    expect(safeHtml).not.toContain('SAME_ROW_SECRET');
    expect(safeScript).toContain('const HAS_COMPARED_CONTENT = false;');
    expect(safeScript).toContain('const FIELD_PROPS_SRC = {};');
    expect(safeScript).toContain('const SOURCE_SECTIONS = {};');
    expect(safeScript).toContain('const LAYOUT_ROWS_SRC = [];');
    expect(safeHtml).toContain('id="rawJson" disabled aria-disabled="true"');
    expect(safeHtml).toContain('id="reflectJsonBtn" disabled aria-disabled="true"');
    expect(safeHtml).toContain('id="reportTabSettingsLike"');
    expect(safeHtml).toMatch(/id="reportTabSettingsLike"[^>]* disabled aria-disabled="true"/);
    expect(() => new Function(safeScript)).not.toThrow();

    expect(detailedHtml).toContain('SOURCE_FIELD_SECRET');
    expect(detailedHtml).toContain('TARGET_FIELD_SECRET');
    expect(detailedHtml).toContain('SOURCE_LAYOUT_SECRET');
    expect(detailedHtml).toContain('TARGET_LAYOUT_SECRET');
    expect(detailedHtml).toContain('SAME_ROW_SECRET');
    expect(extractInlineScript(detailedHtml)).toContain('const HAS_COMPARED_CONTENT = true;');
  });

  it('makes standalone HTML safe by default and forwards an explicit compared-content mode and label', () => {
    const sections = {
      fieldSettings: { properties: { marker: { code: 'marker', label: 'STANDALONE_SECTION_SECRET', type: 'SINGLE_LINE_TEXT' } } }
    };
    const base = {
      rows: [{
        sectionKey: 'fieldSettings', section: 'フィールド', type: 'changed',
        path: 'fieldSettings.properties.marker.label', left: 'OLD_ROW_VALUE', right: 'NEW_ROW_VALUE'
      }],
      fetchIssues: [],
      sourceBundle: { appId: '101', sections, meta: {} },
      targetBundle: { appId: '202', sections, meta: {} },
      scopes: ['fieldSettings'],
      ignoreKeys: '',
      normalizationPresetState: {}
    };

    const safeOutput = buildDiffHtmlStandaloneExport(base);
    const detailedOutput = buildDiffHtmlStandaloneExport({
      ...base,
      exportContentMode: 'withCompared',
      exportContentLabel: '比較設定込み（テスト）'
    });

    expect(safeOutput.html).not.toContain('STANDALONE_SECTION_SECRET');
    expect(safeOutput.html).toContain('差分行のみ（安全共有向け）');
    expect(detailedOutput.html).toContain('STANDALONE_SECTION_SECRET');
    expect(detailedOutput.html).toContain('比較設定込み（テスト）');
  });

  it('builds a valid evidence report when the comparison has zero differences', () => {
    const sections = { fieldSettings: { properties: {} }, layoutSettings: { layout: [] } };
    const output = buildDiffHtmlStandaloneExport({
      rows: [],
      fetchIssues: [],
      sourceBundle: { appId: '101', guestId: '', preview: false, sections, meta: {} },
      targetBundle: { appId: '202', guestId: '', preview: false, sections, meta: {} },
      scopes: ['fieldSettings'],
      ignoreKeys: '',
      normalizationPresetState: {}
    });

    expect(output.filename).toMatch(/\.html$/);
    expect(output.html).toContain('差分 <b>0件</b>');
    expect(output.html).toContain('アプリ 101');
    expect(output.html).toContain('アプリ 202');
    expect(() => new Function(extractInlineScript(output.html))).not.toThrow();
  });

  it('adds the same-section evidence row when object key insertion order differs', () => {
    const fieldA = { code: 'field_a', label: 'フィールドA', type: 'SINGLE_LINE_TEXT' };
    const fieldB = { code: 'field_b', label: 'フィールドB', type: 'NUMBER' };
    const sourceBundle = {
      appId: '1', guestId: '', preview: false,
      sections: { fieldSettings: { properties: { field_a: fieldA, field_b: fieldB } } },
      meta: {}
    };
    const targetBundle = {
      appId: '2', guestId: '', preview: false,
      sections: { fieldSettings: { properties: { field_b: fieldB, field_a: fieldA } } },
      meta: {}
    };

    const html = buildDiffHtml(sourceBundle, targetBundle, [], ['fieldSettings'], '', {});
    const script = extractInlineScript(html);

    expect(html).toContain('差分 <b>0件</b>');
    expect(html).toContain('id="stat-same">1</b>');
    expect(script).toContain('"_id":"same:fieldSettings"');
  });

  it('uses the completed engine result to preserve same evidence after ignored metadata differences', () => {
    const sourceBundle = {
      appId: '1', guestId: '', preview: false,
      sections: { fieldSettings: { revision: '10', properties: {} } }, meta: {}
    };
    const targetBundle = {
      appId: '2', guestId: '', preview: false,
      sections: { fieldSettings: { revision: '11', properties: {} } }, meta: {}
    };

    const html = buildDiffHtml(sourceBundle, targetBundle, [], ['fieldSettings'], '', {
      fetchIssues: [],
      truncation: null
    });

    expect(html).toContain('id="stat-same">1</b>');
    expect(extractInlineScript(html)).toContain('"_id":"same:fieldSettings"');
  });

  it('does not duplicate internal fetch caches or plugin config in an identical-section report', () => {
    const bodySecret = 'INTERNAL_BODY_SHOULD_NOT_BE_EMBEDDED';
    const pluginSecret = 'INTERNAL_PLUGIN_CONFIG_SHOULD_NOT_BE_EMBEDDED';
    const sections = {
      customizeSettings: {
        scope: 'ALL',
        desktop: {
          js: [{
            type: 'FILE',
            file: { fileKey: 'same-key', name: 'same.js' },
            _bodyText: bodySecret,
            _bodyHash: 'deadbeef',
            _bodyUnavailable: 'oversize'
          }],
          css: []
        },
        mobile: { js: [], css: [] },
        _partial: { kind: 'customizeBody', message: 'internal metadata' }
      },
      pluginSettings: {
        plugins: [{ id: 'plugin-1', _config: { token: pluginSecret } }]
      }
    };
    const sourceBundle = { appId: '1', guestId: '', preview: false, sections, meta: {} };
    const targetBundle = { appId: '2', guestId: '', preview: false, sections: structuredClone(sections), meta: {} };

    const html = buildDiffHtml(
      sourceBundle,
      targetBundle,
      [],
      ['customizeSettings', 'pluginSettings'],
      '',
      { fetchIssues: [], truncation: null }
    );

    expect(html).not.toContain(bodySecret);
    expect(html).not.toContain(pluginSecret);
    expect(html).not.toContain('"_bodyText"');
    expect(html).not.toContain('"_config"');
    expect(html).toContain('"_id":"same:customizeSettings"');
    expect(html).toContain('"_id":"same:pluginSettings"');
  });

  it('sanitizes one-sided supplemental caches without deleting valid underscore-named fields', () => {
    const bodySecret = 'ONE_SIDED_BODY_CACHE_SHOULD_NOT_BE_EMBEDDED';
    const pluginSecret = 'ONE_SIDED_PLUGIN_CACHE_SHOULD_NOT_BE_EMBEDDED';
    const fieldSettings = {
      properties: {
        _body: { code: '_body', label: 'KEEP_BODY_FIELD', type: 'SINGLE_LINE_TEXT' },
        _config: { code: '_config', label: 'KEEP_CONFIG_FIELD', type: 'SINGLE_LINE_TEXT' }
      }
    };
    const customizeSettings = {
      scope: 'ALL',
      desktop: {
        js: [{
          type: 'FILE',
          file: { fileKey: 'kept-file-key', name: 'one-sided.js' },
          _bodyText: bodySecret,
          _bodyHash: 'deadbeef'
        }],
        css: []
      },
      mobile: { js: [], css: [] }
    };
    const pluginSettings = {
      plugins: [{ id: 'kept-plugin-id', _config: { token: pluginSecret } }]
    };
    const sourceBundle = {
      appId: '1', guestId: '', preview: false,
      sections: { fieldSettings }, meta: {}
    };
    const targetBundle = {
      appId: '2', guestId: '', preview: false,
      sections: { fieldSettings: structuredClone(fieldSettings), customizeSettings, pluginSettings }, meta: {}
    };
    const rows = [{
      _id: 'customize-added', sectionKey: 'customizeSettings', section: 'JS/CSS', type: 'added',
      path: 'customizeSettings', left: undefined, right: customizeSettings
    }, {
      _id: 'plugin-added', sectionKey: 'pluginSettings', section: 'プラグイン', type: 'added',
      path: 'pluginSettings', left: undefined, right: pluginSettings
    }];

    const html = buildDiffHtml(
      sourceBundle,
      targetBundle,
      rows,
      ['fieldSettings', 'customizeSettings', 'pluginSettings'],
      '',
      { fetchIssues: [], truncation: null }
    );

    expect(html).not.toContain(bodySecret);
    expect(html).not.toContain(pluginSecret);
    expect(html).toContain('kept-file-key');
    expect(html).toContain('kept-plugin-id');
    expect(html).toContain('KEEP_BODY_FIELD');
    expect(html).toContain('KEEP_CONFIG_FIELD');
    expect(html).toContain('共有先と保管場所を確認してください');
    expect(sourceBundle.sections).not.toHaveProperty('customizeSettings');
    expect(targetBundle.sections.customizeSettings.desktop.js[0]._bodyText).toBe(bodySecret);
    expect(targetBundle.sections.pluginSettings.plugins[0]._config.token).toBe(pluginSecret);
  });

  it('keeps fetch failures in report metadata without leaking the section scratch value', () => {
    const scratchError = 'FIELD_FETCH_SCRATCH_SHOULD_NOT_BE_EMBEDDED';
    const sourceBundle = {
      appId: '1', guestId: '', preview: false,
      sections: { fieldSettings: { _fetchError: scratchError } }, meta: {}
    };
    const targetBundle = {
      appId: '2', guestId: '', preview: false,
      sections: { fieldSettings: { properties: {} } }, meta: {}
    };
    const html = buildDiffHtml(sourceBundle, targetBundle, [], ['fieldSettings'], '', {
      fetchIssues: [{ sectionKey: 'fieldSettings', section: 'フィールド設定', side: 'source', message: 'HTTP 403' }],
      truncation: null
    });

    expect(html).not.toContain(scratchError);
    expect(html).toContain('API取得失敗 1件');
    expect(html).toContain('HTTP 403');
    expect(extractInlineScript(html)).toContain('"fetchIssues"');
  });

  it('does not synthesize same evidence for a scope where diff collection was truncated', () => {
    const bundle = {
      appId: '1', guestId: '', preview: false,
      sections: { fieldSettings: { properties: {} } }, meta: {}
    };
    const html = buildDiffHtml(bundle, { ...bundle, appId: '2' }, [], ['fieldSettings'], '', {
      fetchIssues: [],
      truncation: {
        truncated: true,
        diffLimit: 1000,
        sections: [{ sectionKey: 'fieldSettings', section: 'フィールド設定' }]
      }
    });

    expect(html).toContain('id="stat-same">0</b>');
    expect(extractInlineScript(html)).not.toContain('"_id":"same:fieldSettings"');
  });

  it('preserves partial, unscanned, and complete truncation semantics', () => {
    const bundle = {
      appId: '1', guestId: '', preview: false,
      sections: {
        fieldSettings: { properties: {} },
        viewSettings: { views: {} },
        reportSettings: { reports: {} }
      },
      meta: {}
    };
    const html = buildDiffHtml(bundle, { ...bundle, appId: '2' }, [], ['fieldSettings', 'viewSettings', 'reportSettings'], '', {
      fetchIssues: [],
      truncation: {
        truncated: true,
        diffLimit: 1000,
        sections: [
          {
            sectionKey: 'fieldSettings', section: 'フィールド設定', scanned: true,
            partiallyScanned: true, scanStatus: 'partial', droppedDiff: 0, omittedDiffCount: null
          },
          {
            sectionKey: 'viewSettings', section: 'ビュー', scanned: false,
            partiallyScanned: false, scanStatus: 'unscanned', droppedDiff: 0, omittedDiffCount: null
          },
          {
            sectionKey: 'reportSettings', section: 'グラフ', scanned: true,
            partiallyScanned: false, scanStatus: 'complete', droppedDiff: 1, omittedDiffCount: 1
          }
        ]
      }
    });
    const script = extractInlineScript(html);

    expect(html).toContain('部分走査・総件数不明（表示件数は下限）');
    expect(html).toContain('未走査・件数不明');
    expect(html).toContain('走査完了・未収録件数既知: グラフ（1件）');
    expect(html).toContain('ビュー');
    expect(script).toContain('"partiallyScanned":true');
    expect(script).toContain('"scanStatus":"partial"');
    expect(script).toContain('"scanned":false');
    expect(script).toContain('"scanStatus":"unscanned"');
    expect(script).toContain('"omittedDiffCount":null');
    expect(script).toContain('"scanStatus":"complete"');
    expect(script).toContain('"omittedDiffCount":1');
    expect(script).toContain('const DIFF_NAV_RANGE_NOTE = "（部分走査・未走査を含む・総件数不明）";');
    expect(script).toContain("diffNavigationTargets.length + DIFF_NAV_RANGE_NOTE");
  });

  it('does not call an omitted scope identical in a filtered export', () => {
    const sourceBundle = {
      appId: '1', guestId: '', preview: false,
      sections: {
        fieldSettings: { properties: { a: { code: 'a', label: '旧', type: 'SINGLE_LINE_TEXT' } } },
        viewSettings: { views: { 一覧: { name: '一覧', index: '0', type: 'LIST' } } }
      }, meta: {}
    };
    const targetBundle = {
      appId: '2', guestId: '', preview: false,
      sections: {
        fieldSettings: { properties: { a: { code: 'a', label: '新', type: 'SINGLE_LINE_TEXT' } } },
        viewSettings: { views: { 一覧: { name: '一覧', index: '1', type: 'LIST' } } }
      }, meta: {}
    };
    const filteredRows = [{
      _id: 'field-only', sectionKey: 'fieldSettings', section: 'フィールド設定', type: 'changed',
      path: 'fieldSettings.properties.a.label', left: '旧', right: '新'
    }];

    const html = buildDiffHtml(
      sourceBundle,
      targetBundle,
      filteredRows,
      ['fieldSettings', 'viewSettings'],
      '',
      { fetchIssues: [], truncation: null, exportMode: 'filtered', exportLabel: '表示中' }
    );

    const script = extractInlineScript(html);
    expect(script).toContain('"exportMode":"filtered"');
    expect(script).not.toContain('"_id":"same:viewSettings"');
    expect(html).toContain('差分 <b>1件</b>');
  });

  it('makes offline reflect JSON safety, incompleteness, and guest API routing explicit', () => {
    const sourceBundle = {
      appId: '1', guestId: '', preview: false,
      sections: {
        fieldSettings: { properties: {} },
        processSettings: { states: {}, actions: [] }
      },
      meta: {}
    };
    const targetBundle = {
      appId: '2', guestId: '88', preview: true,
      sections: {
        fieldSettings: { properties: { target_only: { code: 'target_only', label: '比較先のみ', type: 'SINGLE_LINE_TEXT' } } },
        processSettings: { enable: true, states: {}, actions: [] }
      },
      meta: {}
    };
    const rows = [{
      _id: 'target-only', sectionKey: 'fieldSettings', section: 'フィールド設定', type: 'added',
      path: 'fieldSettings.properties.target_only', left: undefined,
      right: targetBundle.sections.fieldSettings.properties.target_only
    }, {
      _id: 'display-only', sectionKey: 'processSettings', section: 'プロセス管理', type: 'changed',
      path: 'processSettings.states.__rename__', left: { name: '旧' }, right: { name: '新' }, _displayOnly: true
    }];

    const html = buildDiffHtml(sourceBundle, targetBundle, rows, ['fieldSettings', 'processSettings'], '', {
      fetchIssues: [{ sectionKey: 'appSettings', section: 'アプリ設定', side: 'source', message: '403' }],
      partialIssues: [{ sectionKey: 'customizeSettings', section: 'JS/CSS', side: 'target', message: 'oversize' }],
      truncation: { truncated: true, diffLimit: 1000, sections: [{ sectionKey: 'fieldSettings' }] }
    });
    const script = extractInlineScript(html);

    expect(() => new Function(script)).not.toThrow();
    expect(script).toContain('const TARGET_PREVIEW_API_PREFIX = "/k/guest/88/v1/preview";');
    expect(script).toContain("row.type !== 'same' && !row._displayOnly");
    expect(script).toContain('if (!row || row._displayOnly || row.type === \'same\') return;');
    expect(script).toContain('replacesEntireSection');
    expect(script).toContain('destructive');
    expect(script).toContain('warnings: warnings');
    expect(script).toContain('requiresExplicitDeleteOptIn: true');
    expect(script).toContain('const FIELD_REFLECT_BATCH_LIMIT = 100;');
    expect(script).toContain('buildPluginReflectRequests');
    expect(script).toContain('比較元のみのプラグインだけを追加します');
    expect(script).toContain('/^[\\t\\r\\n ]*[=+\\-@]/');
    expect(script).toContain('method: null');
    expect(script).not.toContain("method: 'DELETE', api: TARGET_PREVIEW_API_PREFIX + '/app/form/fields.json'");
    expect(script).toContain('if (sec && sec.enable !== undefined) p.enable = sec.enable;');
    expect(script).not.toContain('enable: !!(sec && sec.enable)');
    expect(script).toContain('"incompleteComparison":true');
    expect(script).toContain('"reflectJsonAvailable":false');
    expect(script).toContain('"partialIssueCount":1');
    expect(script).toContain('if (!CAN_BUILD_REFLECT_JSON) return null;');
    expect(script).toContain('showToast(REFLECT_JSON_BLOCK_REASON);');
    expect(script).toContain("purpose: 'comparisonEvidence'");
    expect(html).toContain('id="reflectJsonBtn" disabled aria-disabled="true"');
    expect(html).toContain('id="reflectJsonCopyBtn" disabled aria-disabled="true"');
    expect(html).toContain('id="srcJsonBtn">比較元JSON</button>');
    expect(html).toContain('id="tgtJsonBtn">比較先JSON</button>');
    expect(html).toContain('比較結果が不完全なため、反映JSONの選択・保存・コピーを無効にしています');
    expect(html).toContain('本文未検証 1件');
  });

  it.each([
    ['設定取得失敗', {
      fetchIssues: [{ sectionKey: 'fieldSettings', section: 'フィールド設定', side: 'source', message: '403' }],
      partialIssues: [],
      truncation: null
    }],
    ['本文未検証', {
      fetchIssues: [],
      partialIssues: [{ sectionKey: 'customizeSettings', section: 'JS/CSS', side: 'target', message: 'oversize' }],
      truncation: null
    }],
    ['差分検出上限', {
      fetchIssues: [],
      partialIssues: [],
      truncation: { truncated: true, diffLimit: 1000, sections: [{ sectionKey: 'fieldSettings' }] }
    }]
  ])('blocks reflect JSON for an incomplete withCompared report: %s', (_label, incompleteOptions) => {
    const sourceBundle = {
      appId: '1', guestId: '', preview: false,
      sections: { fieldSettings: { properties: { a: { code: 'a', label: '旧', type: 'SINGLE_LINE_TEXT' } } } },
      meta: {}
    };
    const targetBundle = {
      appId: '2', guestId: '', preview: false,
      sections: { fieldSettings: { properties: { a: { code: 'a', label: '新', type: 'SINGLE_LINE_TEXT' } } } },
      meta: {}
    };
    const rows = [{
      _id: 'field-a-label', sectionKey: 'fieldSettings', section: 'フィールド設定', type: 'changed',
      path: 'fieldSettings.properties.a.label', left: '旧', right: '新'
    }];

    const html = buildDiffHtml(sourceBundle, targetBundle, rows, ['fieldSettings'], '', {
      ...incompleteOptions,
      exportContentMode: 'withCompared'
    });
    const script = extractInlineScript(html);

    expect(() => new Function(script)).not.toThrow();
    expect(script).toContain('"reflectJsonAvailable":false');
    expect(script).toContain('const CAN_BUILD_REFLECT_JSON = !!REPORT_META.reflectJsonAvailable;');
    expect(script).toContain('const selectable = CAN_BUILD_REFLECT_JSON &&');
    expect(script).toContain('const isReflectSelectable = CAN_BUILD_REFLECT_JSON &&');
    expect(script).toContain("? (CAN_BUILD_REFLECT_JSON && row.type !== 'same'");
    expect(html).toContain('id="reflectJsonBtn" disabled aria-disabled="true"');
    expect(html).toContain('id="reflectJsonCopyBtn" disabled aria-disabled="true"');
    expect(html).toContain('id="srcJsonBtn">比較元JSON</button>');
    expect(html).toContain('id="tgtJsonBtn">比較先JSON</button>');
  });

  it('keeps reflect JSON available for a complete withCompared report', () => {
    const sourceBundle = {
      appId: '1', guestId: '', preview: false,
      sections: { fieldSettings: { properties: { a: { code: 'a', label: '旧', type: 'SINGLE_LINE_TEXT' } } } },
      meta: {}
    };
    const targetBundle = {
      appId: '2', guestId: '', preview: false,
      sections: { fieldSettings: { properties: { a: { code: 'a', label: '新', type: 'SINGLE_LINE_TEXT' } } } },
      meta: {}
    };
    const rows = [{
      _id: 'field-a-label', sectionKey: 'fieldSettings', section: 'フィールド設定', type: 'changed',
      path: 'fieldSettings.properties.a.label', left: '旧', right: '新'
    }];

    const html = buildDiffHtml(sourceBundle, targetBundle, rows, ['fieldSettings'], '', {
      fetchIssues: [], partialIssues: [], truncation: null, exportContentMode: 'withCompared'
    });

    expect(extractInlineScript(html)).toContain('"reflectJsonAvailable":true');
    expect(html).toContain('id="reflectJsonBtn">反映JSON保存</button>');
    expect(html).toContain('id="reflectJsonCopyBtn">反映JSONコピー</button>');
  });

  it('preserves severity in the exported patch rows', () => {
    const payload = buildPatchPayload([{
      sectionKey: 'appAcl', section: 'アプリのアクセス権', type: 'changed',
      path: 'appAcl.rights[0].accessibility', left: 'READ', right: 'WRITE', severity: 'high'
    }], { appId: '1', sections: {} }, { appId: '2', sections: {} });

    expect(payload.sections['アプリのアクセス権'][0].severity).toBe('high');
  });

  it('calls out process state rename notices even when they are excluded from actionable counts', () => {
    const sourceBundle = { appId: '1', guestId: '', preview: false, sections: { processSettings: {} }, meta: {} };
    const targetBundle = { appId: '2', guestId: '', preview: false, sections: { processSettings: {} }, meta: {} };
    const rows = [{
      _id: 'rename-1',
      sectionKey: 'processSettings',
      section: 'プロセス管理',
      type: 'changed',
      path: 'processSettings.states.__rename__',
      left: { name: '未処理' },
      right: { name: '受付' },
      _displayOnly: true,
      _stateRenameNotice: true
    }];

    const html = buildDiffHtml(sourceBundle, targetBundle, rows, ['processSettings'], '', {});
    expect(html).toContain('プロセスの状態名変更候補が 1 件あります');
    expect(html).toContain('追加・削除・変更件数には含めていません');
  });

  it('prioritizes actual differences over display-only helpers and same rows', () => {
    const selection = selectDiffHtmlRowsForExport([
      { _id: 'display-1', type: 'added', _displayOnly: true },
      { _id: 'same-1', type: 'same' },
      { _id: 'display-2', type: 'removed', _displayOnly: true },
      { _id: 'actual-late', type: 'changed' },
      { _id: 'display-3', type: 'added', _displayOnly: true }
    ], 3);

    expect(selection.rows.map((row) => row._id)).toEqual(['display-1', 'display-2', 'actual-late']);
    expect(selection.summary.policy).toBe('actualDiff > displayOnly > same');
    expect(selection.summary.categories.actualDiff).toEqual({ total: 1, rendered: 1, omitted: 0 });
    expect(selection.summary.categories.displayOnly).toEqual({ total: 3, rendered: 2, omitted: 1 });
    expect(selection.summary.categories.same).toEqual({ total: 1, rendered: 0, omitted: 1 });
  });

  it('warns when display-row expansion exceeds the HTML report limit without dropping a later actual difference', () => {
    const fields = Object.fromEntries(Array.from({ length: 2000 }, (_, index) => {
      const code = `child_${index}`;
      return [code, { code, label: code, type: 'SINGLE_LINE_TEXT' }];
    }));
    const sourceBundle = {
      appId: '1', guestId: '', preview: false,
      sections: { fieldSettings: { properties: {} } }, meta: {}
    };
    const targetBundle = {
      appId: '2', guestId: '', preview: false,
      sections: { fieldSettings: { properties: {} } }, meta: {}
    };
    const rows = [{
      _id: 'table-parent', sectionKey: 'fieldSettings', section: 'フィールド', type: 'added',
      path: 'fieldSettings.properties.table_a', left: undefined,
      right: { code: 'table_a', label: 'テーブルA', type: 'SUBTABLE', fields }, severity: 'medium'
    }, {
      _id: 'actual-late', sectionKey: 'viewSettings', section: 'ビュー', type: 'changed',
      path: 'viewSettings.views.list.index', left: '0', right: '1', severity: 'low'
    }];

    const html = buildDiffHtml(sourceBundle, targetBundle, rows, ['fieldSettings', 'viewSettings'], '', {});

    expect(html).toContain('表示用展開後 2002 件のうち 2000 件を収録し、2 件を省略しました');
    expect(html).toContain('省略: 実差分 0 件 / 表示専用の補助行 2 件 / 同一行 0 件');
    expect(html).toContain('actual-late');
    expect(html).not.toContain('このレポートは不完全です');
    expect(extractInlineScript(html)).toContain('"reflectJsonAvailable":false');
    expect(html).toContain('id="reflectJsonBtn" disabled aria-disabled="true"');
    expect(html).toContain('id="srcJsonBtn">比較元JSON</button>');
  });
});
