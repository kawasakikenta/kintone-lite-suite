import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { SECTION_DEFS } from '../../src/constants';
import { bundleToMarkdown, hasDesignSectionRenderer } from '../../src/diff/export';
import {
  BATCH_DESIGN_OVERVIEW_HEADERS,
  DESIGN_HTML_SECTION_RENDERERS,
  buildBatchDesignHtmlOverview,
  buildDesignHtml,
  normalizeDesignSearchText
} from '../../src/design/html';

const XSS = '<img src=x onerror=alert(1)>';

/** 業務アプリに近い設定（全セクション）。 */
function businessBundle(): any {
  return {
    appId: '401',
    guestId: '',
    preview: false,
    fetchedAt: '2026-11-20T01:39:00.000Z',
    sections: {
      appSettings: { name: '案件管理', description: '<p>案件の<b>台帳</b></p>', icon: { type: 'PRESET', key: 'APP72' }, theme: 'WHITE', enableComments: true, revision: '12' },
      appInfo: { appId: '401', code: 'DEAL', name: '案件管理', spaceId: '10' },
      fieldSettings: {
        properties: {
          deal_title: { type: 'SINGLE_LINE_TEXT', code: 'deal_title', label: '案件名', required: true, unique: true, maxLength: '100', minLength: '' },
          customer_code: {
            type: 'SINGLE_LINE_TEXT', code: 'customer_code', label: '顧客コード', required: false,
            lookup: { relatedApp: { app: '301', code: '' }, relatedKeyField: 'customer_code', fieldMappings: [{ field: 'customer_name', relatedField: 'customer_name' }, { field: 'cust_rank', relatedField: 'rank' }] }
          },
          customer_name: { type: 'SINGLE_LINE_TEXT', code: 'customer_name', label: '顧客名' },
          cust_rank: { type: 'SINGLE_LINE_TEXT', code: 'cust_rank', label: '顧客ランク' },
          phase: { type: 'DROP_DOWN', code: 'phase', label: 'フェーズ', defaultValue: 'リード', options: { 受注: { label: '受注', index: '2' }, リード: { label: 'リード', index: '0' }, 商談中: { label: '商談中', index: '1' } } },
          amount: { type: 'NUMBER', code: 'amount', label: '見込金額', unit: '円', unitPosition: 'AFTER', digit: true, minValue: '0' },
          weighted: { type: 'CALC', code: 'weighted', label: '加重金額', expression: 'amount*probability/100', format: 'NUMBER' },
          quotes: { type: 'REFERENCE_TABLE', code: 'quotes', label: '関連する見積', referenceTable: { relatedApp: { app: '402' }, condition: { field: 'customer_code', relatedField: 'customer_code' }, displayFields: ['quote_no', 'quote_total'], size: '5' } },
          grp_basic: { type: 'GROUP', code: 'grp_basic', label: '案件情報' },
          tasks: {
            type: 'SUBTABLE', code: 'tasks', label: '作業',
            fields: {
              task_name: { type: 'SINGLE_LINE_TEXT', code: 'task_name', label: '作業名', required: true },
              task_product: { type: 'SINGLE_LINE_TEXT', code: 'task_product', label: '商品', lookup: { relatedApp: { app: '302' }, relatedKeyField: 'product_code', fieldMappings: [] } }
            }
          },
          record_no: { type: 'RECORD_NUMBER', code: 'record_no', label: 'レコード番号' }
        }
      },
      layoutSettings: {
        layout: [
          { type: 'GROUP', code: 'grp_basic', layout: [{ type: 'ROW', fields: [{ type: 'SINGLE_LINE_TEXT', code: 'deal_title', size: { width: '300' } }, { type: 'LABEL', label: '<b>注意</b>書き', size: { width: '120' } }] }] },
          { type: 'ROW', fields: [{ type: 'SPACER', elementId: 'sp1' }, { type: 'HR' }, { type: 'NUMBER', code: 'amount', size: { width: '150' } }] },
          { type: 'SUBTABLE', code: 'tasks', fields: [{ type: 'SINGLE_LINE_TEXT', code: 'task_name', size: { width: '200' } }] }
        ]
      },
      formSettings: { properties: [] },
      viewSettings: {
        views: {
          すべて: { type: 'LIST', name: 'すべて', index: '0', fields: ['deal_title', 'amount'], filterCond: 'amount > 100', sort: 'record_no desc' },
          予定: { type: 'CALENDAR', name: '予定', index: '1', date: 'close_date', title: 'deal_title', device: 'DESKTOP' }
        }
      },
      reportSettings: { reports: { 月別受注: { chartType: 'LINE', chartMode: 'NORMAL', index: '0', groups: [{ code: 'close_date', per: 'MONTH' }], aggregations: [{ type: 'SUM', code: 'weighted' }, { type: 'COUNT' }], filterCond: '' } } },
      processSettings: {
        enable: true,
        states: { 未処理: { name: '未処理', index: '0', assignee: { type: 'ONE', entities: [] } }, 承認待ち: { name: '承認待ち', index: '1', assignee: { type: 'ANY', entities: [{ entity: { type: 'GROUP', code: 'managers' }, includeSubs: true }] } } },
        actions: [{ name: '承認に回す', from: '未処理', to: '承認待ち', filterCond: 'amount > 0' }]
      },
      pluginSettings: { plugins: [{ id: 'plugin1', name: 'カレンダー拡張', enabled: true, version: '1.2', _config: { apiKey: 'sk-live-SECRET-0001' } }, { id: 'plugin2', name: '一括更新', enabled: false }] },
      customizeSettings: {
        scope: 'ALL',
        desktop: { js: [{ type: 'URL', url: 'https://cdn.example.com/lib.js' }, { type: 'FILE', file: { fileKey: 'k1', name: 'core.js' }, _bodyText: 'const TOKEN = "tok_live_SECRET";', _bodyHash: 'abc' }], css: [] },
        mobile: { js: [], css: [{ type: 'FILE', file: { fileKey: 'k2', name: 'mobile.css' } }] }
      },
      actionSettings: {
        actions: {
          見積作成: { name: '見積作成', index: '0', destApp: { app: '402', code: '' }, mappings: [{ srcType: 'FIELD', srcField: 'customer_code', destField: 'customer_code' }, { srcType: 'RECORD_URL', destField: 'deal_url' }], entities: [{ entity: { type: 'ORGANIZATION', code: 'sales' }, includeSubs: false }], filterCond: 'phase in ("商談中")' }
        }
      },
      appAcl: { rights: [{ entity: { type: 'CREATOR' }, appEditable: true, recordViewable: true, recordAddable: true, recordEditable: true, recordDeletable: true, recordImportable: false, recordExportable: false, includeSubs: false }] },
      fieldAcl: { rights: [{ code: 'amount', entities: [{ entity: { type: 'GROUP', code: 'everyone' }, accessibility: 'READ', includeSubs: false }] }] },
      recordPermissions: { rights: [{ filterCond: 'phase in ("受注")', entities: [{ entity: { type: 'USER', code: 'boss' }, viewable: true, editable: false, deletable: false, includeSubs: false }] }] },
      notifications: { notifyToCommenter: true, notifications: [{ entity: { type: 'FIELD_ENTITY', code: 'owner' }, recordAdded: true, recordEdited: false, commentAdded: true, statusChanged: true, fileImported: false, includeSubs: false }] },
      perRecordNotifications: { notifications: [{ title: '大型案件', filterCond: 'amount >= 1000000', targets: [{ entity: { type: 'GROUP', code: 'managers' }, includeSubs: false }] }] },
      reminderNotifications: { timezone: 'Asia/Tokyo', notifications: [{ title: '締切前', filterCond: '', timing: { code: 'close_date', daysLater: '-3', time: '09:00' }, targets: [{ entity: { type: 'FIELD_ENTITY', code: 'owner' } }] }] },
      categories: { enabled: true, categories: { 東日本: { label: '東日本', index: '0', parent: null }, 関東: { label: '関東', index: '1', parent: '東日本' } } }
    }
  };
}

const APP_NAMES = { '301': '顧客マスタ', '402': '見積管理' };

function cspOf(html: string): Map<string, string> {
  const match = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
  expect(match, 'CSP の meta がありません').toBeTruthy();
  return new Map(match![1].split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const [name, ...values] = part.split(/\s+/);
    return [name, values.join(' ')];
  }));
}

const sha = (text: string) => createHash('sha256').update(text, 'utf8').digest('base64');

/** 画面に出る文字（スクリプト・スタイル・原文 JSON を除き、タグを外して文字参照を戻す）。 */
function visibleText(html: string): string {
  return html
    .replace(/<script>[\s\S]*?<\/script>/g, '')
    .replace(/<style>[\s\S]*?<\/style>/g, '')
    .replace(/<details class="raw">[\s\S]*?<\/details>/g, '')
    .replace(/<br>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

/** Markdown の表のセル（エスケープとコード表記を戻した文字列）。 */
function markdownCells(md: string): string[] {
  const cells: string[] = [];
  for (const line of md.split('\n')) {
    if (!line.startsWith('| ') || /^\| ---/.test(line)) continue;
    const inner = line.slice(2, -2);
    for (const raw of inner.split(/(?<!\\) \| /)) {
      const text = raw
        .replace(/\\\|/g, '|').replace(/\\\*/g, '*').replace(/\\\\/g, '\\')
        .replace(/&lt;/g, '<').replace(/<br>/g, '\n').replace(/`/g, '')
        .trim();
      if (text) cells.push(text);
    }
  }
  return cells;
}

describe('設計書 HTML', () => {
  it('CSP: 通信・外部の読み込み・フォーム送信を禁じ、埋め込んだスクリプトとスタイルを 1 つずつハッシュで許可する', () => {
    const html = buildDesignHtml(businessBundle(), { appNames: APP_NAMES });
    const policy = cspOf(html);
    expect(html.indexOf('Content-Security-Policy')).toBeLessThan(html.indexOf('<style>'));
    for (const name of ['default-src', 'connect-src', 'object-src', 'base-uri', 'form-action', 'frame-src', 'img-src', 'font-src']) {
      expect(policy.get(name), name).toBe("'none'");
    }
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
    expect(scripts).toHaveLength(1);
    expect(styles).toHaveLength(1);
    expect(policy.get('script-src')).toBe(`'sha256-${sha(scripts[0])}'`);
    expect(policy.get('style-src')).toBe(`'sha256-${sha(styles[0])}'`);
    expect([...policy.values()].join(' ')).not.toMatch(/unsafe-inline|unsafe-eval|https?:/);
    // インラインのイベント属性・style 属性・javascript: を使わない（ハッシュの CSP で動く）
    const markup = html.replace(/<script>[\s\S]*?<\/script>/g, '').replace(/<style>[\s\S]*?<\/style>/g, '');
    expect(markup).not.toMatch(/\son[a-z]+\s*=/i);
    expect(markup).not.toMatch(/\sstyle\s*=/i);
    expect(html).not.toMatch(/<script[^>]*\ssrc=|<link\b|<iframe|<img\b/i);
    // ページ内のリンクだけ
    for (const [, href] of html.matchAll(/href="([^"]*)"/g)) expect(href.startsWith('#'), href).toBe(true);
  });

  it('ブラウザストレージ・通信の API をスクリプトで使わない', () => {
    const html = buildDesignHtml(businessBundle());
    const script = html.match(/<script>([\s\S]*?)<\/script>/)![1];
    expect(script).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie|fetch\(|XMLHttpRequest|WebSocket|sendBeacon|innerHTML|insertAdjacentHTML|document\.write|eval\(|new Function/);
  });

  it('kintone の設定の文字列は、どこに入っていてもタグ・スクリプトとして解釈させない', () => {
    const bundle = businessBundle();
    const s = bundle.sections;
    s.appSettings.name = `案件</script><script>alert(1)</script>${XSS}`;
    s.fieldSettings.properties.deal_title.label = `名前${XSS}`;
    s.fieldSettings.properties.phase.options.受注.label = `受注${XSS}`;
    s.fieldSettings.properties.weighted.expression = `amount${XSS}`;
    s.fieldSettings.properties[`code"><svg onload=alert(1)>`] = { type: 'SINGLE_LINE_TEXT', code: `code"><svg onload=alert(1)>`, label: '"\'&<>' };
    s.layoutSettings.layout[1].fields[0].elementId = `sp${XSS}`;
    s.viewSettings.views.すべて.filterCond = `a = "</td><script>alert(1)</script>"`;
    s.pluginSettings.plugins[1].name = `一括${XSS}`;
    s.customizeSettings.desktop.js[0].url = 'javascript:alert(1)';
    s.processSettings.states.未処理.name = `未処理${XSS}`;
    s.recordPermissions.rights[0].filterCond = `x = "${XSS}"`;
    s.categories.categories.東日本.label = `東${XSS}`;
    s.reminderNotifications.timezone = `Asia/Tokyo${XSS}`;
    const html = buildDesignHtml(bundle, { appNames: { '301': `顧客${XSS}` } });
    expect(html.match(/<script>/g)).toHaveLength(1);
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<svg');
    expect(html).not.toContain('</script><script>alert');
    const markup = html.replace(/<script>[\s\S]*?<\/script>/g, '').replace(/<style>[\s\S]*?<\/style>/g, '');
    const allowed = new Set(['html', 'head', 'meta', 'title', 'style', 'body', 'a', 'header', 'button', 'span', 'div', 'p', 'small', 'label', 'input', 'nav', 'ol', 'li', 'main', 'h1', 'h2', 'h3', 'dl', 'dt', 'dd', 'section', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'code', 'br', 'b', 'ul', 'details', 'summary', 'pre', 'footer', 'script', '!doctype']);
    for (const [, tag] of markup.matchAll(/<\/?([a-z!][a-z0-9]*)/gi)) expect(allowed.has(tag.toLowerCase()), tag).toBe(true);
    // 属性としてのイベントハンドラは無い（文字としての「 onerror=」は本文や属性の値に残るだけ）
    for (const [tag] of markup.matchAll(/<[a-z][^>]*>/gi)) {
      const names = [...tag.replace(/"[^"]*"/g, '""').matchAll(/\s([a-z-]+)(?==|\s|>)/gi)].map((m) => m[1].toLowerCase());
      expect(names.filter((name) => name.startsWith('on')), tag).toEqual([]);
    }
    // 文字としては読める
    expect(visibleText(html)).toContain(`受注${XSS}`);
    expect(visibleText(html)).toContain(`amount${XSS}`);
    expect(visibleText(html)).toContain('javascript:alert(1)');
  });

  it('プラグインの設定値と JS/CSS ファイルの本文は、原文（APIレスポンス）にも載せない。入力は変えない', () => {
    const bundle = businessBundle();
    const before = JSON.stringify(bundle);
    const html = buildDesignHtml(bundle);
    expect(html).not.toContain('sk-live-SECRET');
    expect(html).not.toContain('tok_live_SECRET');
    expect(html).not.toContain('_bodyHash');
    expect(visibleText(html)).toContain('カレンダー拡張');
    expect(visibleText(html)).toContain('ファイル: core.js');
    expect(JSON.stringify(bundle)).toBe(before);
  });

  it('Markdown の設計書の表にある値は、すべて HTML にも出る（同じ組み立て・同じ言葉）', () => {
    const bundle = businessBundle();
    const md = bundleToMarkdown(bundle, { appNames: APP_NAMES, rawJson: false });
    const text = visibleText(buildDesignHtml(bundle, { appNames: APP_NAMES }));
    const statusKeys = new Set(['available', 'empty', 'missing', 'fetch-error', 'partial']);
    const missing = markdownCells(md).filter((cell) => !statusKeys.has(cell) && !text.includes(cell));
    expect(missing).toEqual([]);
    // 参照先アプリ名・コピー項目・作業者の選び方など、Markdown と同じ言葉
    for (const phrase of ['ルックアップ: 顧客マスタ（App 301） キー customer_code / 転記 2項目（customer_name ← customer_name、cust_rank ← rank）', '関連レコード: 見積管理（App 402）', 'レコードのURL → deal_url', '候補の誰でも（先着）', '3日前', 'プロセス管理: 有効', '適用範囲（スコープ）', 'カテゴリー機能: 有効']) {
      expect(text).toContain(phrase);
    }
  });

  it('本文を持つセクションは Markdown と同じ（整形表示が無いセクションは原文だけ）', () => {
    for (const def of SECTION_DEFS) {
      expect(Object.prototype.hasOwnProperty.call(DESIGN_HTML_SECTION_RENDERERS, def.key), def.key).toBe(hasDesignSectionRenderer(def.key));
    }
    const html = buildDesignHtml(businessBundle());
    expect(visibleText(html)).toContain('（整形表示は未対応です。設定データは下の原文を参照してください）');
  });

  it('見出し・目次・取得状態: 取得できなかったセクションを理由つきで示し、0 件と読み違えさせない', () => {
    const bundle = businessBundle();
    bundle.sections.viewSettings = { _fetchError: '権限がありません。一覧の設定を取得できません。\n[API] GET /k/v1/app/views.json' };
    bundle.sections.pluginSettings._partial = { message: '一部のプラグイン設定を取得できませんでした' };
    delete bundle.sections.categories;
    const html = buildDesignHtml(bundle, { source: 'settings-json', generatedAt: new Date(2026, 10, 28, 15, 0) });
    const text = visibleText(html);
    expect(text).toContain('kintone アプリ設計書');
    expect(text).toMatch(/アプリID\s*401/);
    expect(text).toContain('本番（運用中の設定）');
    expect(text).toContain('2026-11-28 15:00');
    expect(text).toContain('読み込んだ設定JSON');
    expect(text).toContain('基本設定18種：未完了');
    expect(text).toContain('取得失敗 1・部分取得 1・未取得 1');
    expect(text).toContain('取得できていない設定の値は、0件や無効を意味しません。');
    // 内部の通信情報の行（[API] GET …）は、見出しの注意とセクションの警告には出さない
    expect(html).toMatch(/<li><a href="#sec-viewSettings">ビュー設定<\/a>（取得失敗）: 権限がありません。一覧の設定を取得できません。<\/li>/);
    expect(html).toContain('<div class="notice notice--err" role="note">⚠ 取得できませんでした: 権限がありません。一覧の設定を取得できません。</div>');
    // 取得状態の表の詳細にも出さない（生データの折りたたみにだけ残す。Markdown と同じ）
    expect(text).not.toContain('[API]');
    expect(text).toContain('（部分取得: ');
    // 目次: 本文のあるセクションへのリンク。取得失敗は目次にも示す
    expect(html).toMatch(/<a href="#sec-viewSettings"><span class="toc-label">ビュー設定<\/span><span class="badge badge--err" data-status="fetch-error">取得失敗<\/span><\/a>/);
    expect(html).not.toContain('href="#sec-categories"');
    for (const def of SECTION_DEFS.filter((d) => d.key !== 'categories')) expect(html, def.key).toContain(`id="sec-${def.key}"`);
  });

  it('フィールドの行に絞り込み用の文字（全角・半角と大文字・小文字をそろえる）を持つ。テーブル内のフィールドも対象', () => {
    const bundle = businessBundle();
    bundle.sections.fieldSettings.properties.ＡＢＣ = { type: 'NUMBER', code: 'ＡＢＣ', label: 'Ｗｉｄｅ名前' };
    const html = buildDesignHtml(bundle);
    expect(normalizeDesignSearchText('ＡＢＣ Ｗｉｄｅ')).toBe('abc wide');
    expect(html).toContain('data-search="abc wide名前"');
    expect(html).toContain('data-search="task_name 作業名"');
    expect(html).toMatch(/<input id="field-search" type="search"/);
    // トップレベル 12 + テーブル内 2
    expect(html).toContain('>14 件</a>');
  });

  it('フィールドコードが __proto__ や constructor でも、行を落とさずに出す', () => {
    const bundle = businessBundle();
    bundle.sections.fieldSettings.properties = JSON.parse('{"__proto__":{"type":"SINGLE_LINE_TEXT","code":"__proto__","label":"プロト"},"constructor":{"type":"NUMBER","code":"constructor","label":"コンストラクタ"}}');
    bundle.sections.fieldAcl = { rights: [{ code: 'constructor', entities: [] }] };
    const text = visibleText(buildDesignHtml(bundle));
    expect(text).toContain('プロト');
    expect(text).toContain('constructor — コンストラクタ');
  });

  it('整形できない形の設定でも例外にせず、Markdown と同じ文で原文へ案内する', () => {
    const bundle = businessBundle();
    bundle.sections.layoutSettings = { layout: { not: 'array' } };
    bundle.sections.actionSettings = { actions: [{ name: 'a', mappings: 'oops' }] };
    const html = buildDesignHtml(bundle);
    const md = bundleToMarkdown(bundle);
    const fallback = /（整形表示できる項目はありません。設定データは下の原文を参照してください）/g;
    expect(html.match(fallback)).toHaveLength(1);
    expect(md.match(fallback)).toHaveLength(1);
    // 配列でないレイアウトは、Markdown と同じく部分取得として理由を示す
    expect(visibleText(html)).toContain('（部分取得: layout は配列ではありません');
  });

  it('印刷: 目次と操作の部品を出さず、絞り込みは画面だけに効かせ、ページの上にアプリ名を出す', () => {
    const html = buildDesignHtml(businessBundle());
    const css = html.match(/<style>([\s\S]*?)<\/style>/)![1];
    expect(css).toMatch(/@media print\{[\s\S]*\.topbar,\.toc,\.toc-backdrop,\.skip,details\.raw/);
    expect(css).toContain('@media screen{.is-filtered,.print-only{display:none !important;}}');
    expect(html).toContain('<div class="fact print-only" hidden><dt>印刷日時</dt>');
    // @page の見出しは英数字以外を 16 進で書く（</style> などを作らない）
    const pageTitle = css.match(/@top-left\{content:("[^"]*")/)![1];
    expect(pageTitle).toMatch(/^"kintone\\20 /);
    expect(pageTitle).not.toMatch(/[<>&]/);
    expect(html).toContain('<dd id="printed-at"></dd>');
  });
});

describe('一括出力の overview.html', () => {
  it('ZIP の中の設計書へリンクし、アプリ名などを逃がす。スクリプトは持たない', () => {
    const html = buildBatchDesignHtmlOverview({
      facts: [['生成日時', '2026-11-28T06:00:00.000Z'], ['出力形式', '設計書HTML (html)']],
      notes: ['取得に失敗したアプリがあります。下の表のエラー内容を確認してください。'],
      rows: [
        { appId: '401', appName: `案件${XSS}`, guest: '(通常空間)', source: 'API', status: '成功', ok: true, files: ['設計書_案件 #1(app401).html'], remarks: '' },
        { appId: '999', appName: '', guest: '(通常空間)', source: '-', status: '失敗', ok: false, files: [], remarks: '指定したアプリが見つかりません' }
      ]
    });
    const policy = cspOf(html);
    expect(policy.get('script-src')).toBe("'none'");
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toContain('<img');
    expect(html).toContain(`href="${encodeURIComponent('設計書_案件 #1(app401).html')}"`);
    for (const header of BATCH_DESIGN_OVERVIEW_HEADERS) expect(html).toContain(`<th scope="col">${header}</th>`);
    expect(visibleText(html)).toContain('指定したアプリが見つかりません');
  });
});
