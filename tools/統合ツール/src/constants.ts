'use strict';

export const TOOL_ID = 'kintone-unified-suite-v2';
export const TOOL_VERSION = '2.5.0';

export interface ExternalLibrarySpec {
  version?: string;
  altVersion?: string;
  cdnUrl?: string;
  altCdnUrl?: string;
  cdnCandidates?: readonly string[];
  cssUrl?: string;
}

/** 実行時に読み込む外部ライブラリ/CDN 一覧 */
export const EXTERNAL_LIBRARIES: Readonly<Record<string, Readonly<ExternalLibrarySpec>>> = Object.freeze({
  jszip: Object.freeze({
    version: '3.10.1',
    cdnUrl: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
  }),
  cytoscape: Object.freeze({
    version: '3.28.1',
    cdnUrl: 'https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.28.1/cytoscape.min.js',
    altVersion: '3.26.0',
    altCdnUrl: 'https://cdn.jsdelivr.net/npm/cytoscape@3.26.0/dist/cytoscape.min.js'
  }),
  dagre: Object.freeze({
    version: '0.8.5',
    cdnUrl: 'https://cdn.jsdelivr.net/npm/dagre@0.8.5/dist/dagre.min.js'
  }),
  cytoscapeDagre: Object.freeze({
    version: '2.5.0',
    cdnUrl: 'https://cdn.jsdelivr.net/npm/cytoscape-dagre@2.5.0/cytoscape-dagre.min.js',
    altCdnUrl: 'https://cdn.jsdelivr.net/npm/cytoscape-dagre@2.5.0/cytoscape-dagre.js'
  })
});

function resolveDefaultAppId(): string {
  try {
    if (typeof kintone !== 'undefined' && kintone?.app?.getId) {
      return String(kintone.app.getId() || '');
    }
  } catch (e) { /* ignore */ }
  return '';
}

export const DEFAULT_APP_ID: string = resolveDefaultAppId();

/**
 * 開いている画面がゲストスペースならその ID（通常スペースや kintone 外では空）。
 * 現在のアプリを既定の対象にするとき、アプリ ID と組で使う。空のままだと通常スペースの API を呼んでしまう。
 */
export function guestIdFromKintonePath(pathname: unknown): string {
  const match = /^\/k\/guest\/(\d+)\//.exec(String(pathname || ''));
  return match ? match[1] : '';
}

function resolveDefaultGuestId(): string {
  try {
    return typeof window === 'undefined' ? '' : guestIdFromKintonePath(window.location?.pathname);
  } catch (e) { return ''; }
}

export const DEFAULT_GUEST_ID: string = DEFAULT_APP_ID ? resolveDefaultGuestId() : '';
export const DIALOG_STATE_KEY = `${TOOL_ID}:dialogState`;

export const DIALOG_MARGIN = 16;
export const DIALOG_DEFAULT_WIDTH = 980;
// ノートPC（1366x768 / 1440x900）でも縦に余裕を残すため、ビューポートに合わせる
export const DIALOG_DEFAULT_HEIGHT = 720;

export interface SectionDef {
  key: string;
  label: string;
  endpoint: string;
  put: boolean;
  previewEndpoint?: boolean;
  paramBuilder?: (app: number | string) => Record<string, unknown>;
  putBuilder?: (d: any) => Record<string, unknown>;
}

type CustomizePutResource =
  | { type: 'FILE'; file: { fileKey: string } }
  | { type: 'URL'; url: string };

function sanitizeCustomizeResourceList(value: any): CustomizePutResource[] {
  if (!Array.isArray(value)) return [];
  const resources: CustomizePutResource[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const type = String(item.type || '').toUpperCase();
    if (type === 'FILE') {
      const fileKey = item?.file?.fileKey;
      if (fileKey == null || String(fileKey) === '') continue;
      resources.push({ type: 'FILE', file: { fileKey: String(fileKey) } });
      continue;
    }
    if (type === 'URL') {
      const url = item.url;
      if (url == null || String(url) === '') continue;
      resources.push({ type: 'URL', url: String(url) });
    }
  }
  return resources;
}

/**
 * GET結果や差分比較用の補助値を、app/customize PUT の許可形へ変換する。
 * 元入力は変更せず、FILE/URL 以外や不足した項目は送信対象から除外する。
 */
export function buildCustomizeSettingsPutPayload(value: any): Record<string, unknown> {
  const source = value && typeof value === 'object' ? value : {};
  const buildPlatform = (platform: 'desktop' | 'mobile') => ({
    js: sanitizeCustomizeResourceList(source?.[platform]?.js),
    css: sanitizeCustomizeResourceList(source?.[platform]?.css)
  });
  return {
    desktop: buildPlatform('desktop'),
    mobile: buildPlatform('mobile')
  };
}

export const SECTION_DEFS: readonly SectionDef[] = [
  { key: 'appSettings', label: 'アプリ設定', endpoint: '/app/settings.json', put: false },
  { key: 'appInfo', label: 'アプリ情報(ラベル)', endpoint: '/app.json', put: false, previewEndpoint: false, paramBuilder: (app) => ({ id: app }) },
  { key: 'fieldSettings', label: 'フィールド設定', endpoint: '/app/form/fields.json', put: true, putBuilder: (d) => ({ properties: d.properties || d }) },
  { key: 'layoutSettings', label: 'レイアウト設定', endpoint: '/app/form/layout.json', put: true, putBuilder: (d) => ({ layout: d.layout || d }) },
  { key: 'formSettings', label: 'フォーム設定', endpoint: '/form.json', put: false },
  { key: 'viewSettings', label: 'ビュー設定', endpoint: '/app/views.json', put: true, putBuilder: (d) => ({ views: d.views || d }) },
  { key: 'reportSettings', label: 'グラフ設定', endpoint: '/app/reports.json', put: true, putBuilder: (d) => ({ reports: d.reports || d }) },
  { key: 'processSettings', label: 'プロセス管理', endpoint: '/app/status.json', put: true, putBuilder: (d) => ({ enable: !!d.enable, states: d.states || {}, actions: d.actions || [] }) },
  { key: 'pluginSettings', label: 'プラグイン(※)', endpoint: '/app/plugins.json', put: true, putBuilder: (d) => ({ pluginIds: (d.plugins || []).map((p: any) => p.id) }) },
  { key: 'customizeSettings', label: 'JS/CSS設定', endpoint: '/app/customize.json', put: true, putBuilder: buildCustomizeSettingsPutPayload },
  { key: 'actionSettings', label: 'アクション設定', endpoint: '/app/actions.json', put: true, putBuilder: (d) => ({ actions: d.actions || d }) },
  { key: 'appAcl', label: 'アプリ権限', endpoint: '/app/acl.json', put: true, putBuilder: (d) => ({ rights: d.rights || d }) },
  { key: 'fieldAcl', label: 'フィールド権限', endpoint: '/field/acl.json', put: true, putBuilder: (d) => ({ rights: d.rights || d }) },
  { key: 'recordPermissions', label: 'レコード権限', endpoint: '/record/acl.json', put: true, putBuilder: (d) => ({ rights: d.rights || d }) },
  { key: 'notifications', label: '通知設定', endpoint: '/app/notifications/general.json', put: true, putBuilder: (d) => ({ notifications: d.notifications || d }) },
  { key: 'perRecordNotifications', label: 'レコード条件通知', endpoint: '/app/notifications/perRecord.json', put: true, putBuilder: (d) => ({ notifications: d.notifications || d }) },
  // PUT /app/notifications/reminder.json は notifications に加え timezone を必須的に要求するためソース側の値を引き継ぐ。
  { key: 'reminderNotifications', label: 'リマインダー通知', endpoint: '/app/notifications/reminder.json', put: true, putBuilder: (d) => {
    const body: Record<string, unknown> = { notifications: d?.notifications || (Array.isArray(d) ? d : []) };
    if (d && typeof d === 'object' && typeof (d as any).timezone === 'string' && (d as any).timezone) {
      body.timezone = (d as any).timezone;
    }
    return body;
  } },
  { key: 'categories', label: 'カテゴリ設定', endpoint: '/app/categories.json', put: true, putBuilder: (d) => ({ categories: d.categories || d }) }
];

export const SETTINGS_EXPORT_SCOPE_DEFS = SECTION_DEFS;

export { FEATURE_DEFS } from './featureDefs.mjs';

export interface TabConnectionNeed {
  appInputs: boolean;
  target: boolean;
  connectionActions: boolean;
}

/** 各タブが接続パネルのどの要素を必要とするかのマッピング */
export const TAB_CONNECTION_NEEDS: Record<string, TabConnectionNeed> = {
  diff:           { appInputs: true,  target: true,  connectionActions: true  },
  reflect:        { appInputs: true,  target: true,  connectionActions: true  },
  field:          { appInputs: true,  target: true,  connectionActions: false },
  jsconfig:       { appInputs: true,  target: true,  connectionActions: false },
  design:         { appInputs: true,  target: true,  connectionActions: false },
  recordMgr:      { appInputs: true,  target: true,  connectionActions: false },
  er:             { appInputs: true,  target: false, connectionActions: false },
  processFlow:    { appInputs: true,  target: false, connectionActions: false },
  apiTester:      { appInputs: false, target: false, connectionActions: false },
  settingsExport: { appInputs: false, target: false, connectionActions: false },
  analyze:        { appInputs: true,  target: true,  connectionActions: false }
};

export const META_KEYS: ReadonlySet<string> = new Set(['revision', 'creator', 'createdAt', 'modifier', 'modifiedAt']);

export const SYSTEM_FIELD_TYPES: ReadonlySet<string> = new Set([
  'STATUS',
  'STATUS_ASSIGNEE',
  'CREATED_TIME',
  'UPDATED_TIME',
  'CREATOR',
  'MODIFIER',
  'RECORD_NUMBER',
  'CATEGORY'
]);

export const DEFAULT_SUBTAB_STATE = Object.freeze({
  diff: 'conditions',
  reflect: 'settings',
  field: 'json',
  jsconfig: 'editor',
  recordMgr: 'status',
  er: 'diagram',
  settingsExport: 'export',
  analyze: 'dashboard'
} as const);

export interface TourStep {
  tab: string;
  diffSubTab?: string;
  subTab?: string;
  path: string;
  selector: string;
  title: string;
  body: string;
}

const TOUR_STEP_CONNECTION: TourStep = {
  tab: 'diff',
  diffSubTab: 'conditions',
  path: 'ヘッダー > 比較条件',
  selector: '#u_sourceApp',
  title: '比較元 / 比較先を決める',
  body: '上部の接続パネルで比較元・比較先のアプリIDとゲストIDを入力します。プレビュー/本番の切替もここで行います。'
};
const TOUR_STEP_SCOPE: TourStep = {
  tab: 'diff',
  diffSubTab: 'conditions',
  path: 'ヘッダー > 比較条件',
  selector: '[data-act="openDiffScopePicker"]',
  title: '比較対象セクションを選ぶ',
  body: '「比較対象を選ぶ」から、差分比較で確認したい設定だけを選びます。まずはフィールド・レイアウト・ビュー・プロセス管理あたりが見やすいです。'
};
const TOUR_STEP_NOISE: TourStep = {
  tab: 'diff',
  diffSubTab: 'conditions',
  path: 'ヘッダー > 比較条件',
  selector: '#u_ignoreKeyInput',
  title: 'ノイズ差分を減らす',
  body: '無視キーや正規化プリセットを使うと、順序違い・メタ情報の差分を抑えられます。比較が荒れるときはここを先に調整します。'
};
const TOUR_STEP_RUN_DIFF: TourStep = {
  tab: 'diff',
  diffSubTab: 'conditions',
  path: 'ヘッダー > 比較条件',
  selector: '#u_runDiffPrimary',
  title: '差分比較を実行する',
  body: '条件が決まったら差分比較を実行します。必要ならこのまま JSON / HTML / Excel / パッチJSON として保存できます。'
};
const TOUR_STEP_REVIEW: TourStep = {
  tab: 'diff',
  diffSubTab: 'conditions',
  path: 'ヘッダー > 差分結果の整理',
  selector: '#u_diffSearch',
  title: '結果を絞り込んで確認する',
  body: '差分比較後は「差分結果の整理・出力」から、セクション・種別・検索で絞り込めます。ここで反映対象を見極めます。'
};
const TOUR_STEP_CATEGORY_VIEW: TourStep = {
  tab: 'diff',
  diffSubTab: 'conditions',
  path: 'ヘッダー > 差分結果の整理',
  selector: '[data-act="setDiffViewMode"][data-mode="category"]',
  title: 'セクション別ビューで読み取る',
  body: '権限・プロセス・通知などフィールド以外の差分は「🗂 セクション別」表示が見やすいです。カテゴリ別タブ + マトリクスや遷移図で差分が直感的に把握できます（V キーで切替）。'
};
const TOUR_STEP_PLAN: TourStep = {
  tab: 'reflect',
  path: 'プレビュー反映',
  selector: '#u_footerPlan',
  title: '反映プランを先に確認する',
  body: '画面下の固定バーから「実行前プラン確認」を押し、API リクエスト内容や対象セクションを確認します。'
};
const TOUR_STEP_APPLY: TourStep = {
  tab: 'reflect',
  path: 'プレビュー反映',
  selector: '#u_footerApply',
  title: '比較先プレビューへ反映する',
  body: '固定バーの「プレビューへ反映」で比較先プレビューへ書き込みます。本番デプロイは kintone 管理画面から手動で実施します。'
};
const TOUR_STEP_RECORD: TourStep = {
  tab: 'design',
  subTab: 'export',
  path: '設計書 > 設計書出力',
  selector: '[data-act="exportDesignMd"]',
  title: '最後に記録を残す',
  body: '作業後は設計書や差分レポートを出力して、変更内容を記録します。複数アプリをまとめて保存したい場合は「設定一括取得」も使えます。'
};

export interface TourCourse {
  label: string;
  description: string;
  steps: readonly TourStep[];
}

export const GUIDED_TOUR_COURSES: Readonly<Record<string, Readonly<TourCourse>>> = Object.freeze({
  full: {
    label: '初回（全工程）',
    description: '接続から記録出力までを順番に案内します（推奨）',
    steps: [TOUR_STEP_CONNECTION, TOUR_STEP_SCOPE, TOUR_STEP_NOISE, TOUR_STEP_RUN_DIFF, TOUR_STEP_REVIEW, TOUR_STEP_CATEGORY_VIEW, TOUR_STEP_PLAN, TOUR_STEP_APPLY, TOUR_STEP_RECORD]
  },
  diff: {
    label: '差分のみ確認',
    description: '差分比較とレビューに絞った短縮コース',
    steps: [TOUR_STEP_CONNECTION, TOUR_STEP_SCOPE, TOUR_STEP_NOISE, TOUR_STEP_RUN_DIFF, TOUR_STEP_REVIEW, TOUR_STEP_CATEGORY_VIEW]
  },
  apply: {
    label: '反映まで実施',
    description: '差分確認からプレビュー反映までをガイド',
    steps: [TOUR_STEP_RUN_DIFF, TOUR_STEP_REVIEW, TOUR_STEP_PLAN, TOUR_STEP_APPLY]
  }
});

// 旧コードとの互換用（フルコース＝旧 GUIDED_TOUR_STEPS）
export const GUIDED_TOUR_STEPS: readonly TourStep[] = Object.freeze(GUIDED_TOUR_COURSES.full.steps);

export const HIGH_IMPACT_SECTIONS: ReadonlySet<string> = new Set([
  'fieldSettings',
  'processSettings',
  'actionSettings',
  'appAcl',
  'fieldAcl',
  'recordPermissions'
]);

export const DIFF_IMPACT_REF_LIMIT = 6;

export const FIELD_REF_EXACT_KEYS: ReadonlySet<string> = new Set([
  'code',
  'field',
  'entity',
  'targetField',
  'sortField',
  'groupFieldCode'
]);

export const FIELD_REF_ARRAY_KEYS: ReadonlySet<string> = new Set([
  'fields',
  'displayFields',
  'columns'
]);

export const FIELD_REF_TOKEN_KEYS: ReadonlySet<string> = new Set([
  'condition',
  'filterCond',
  'expression',
  'formula',
  'sort'
]);

export interface DiffNormalizationPreset {
  label: string;
  sections: ReadonlySet<string>;
  ignoreKeys: ReadonlySet<string>;
  unorderedArrays: boolean;
  /** 環境ごとに変わる内部IDとして意味が確定するパスだけを除外する。 */
  ignoreAppReferencePaths?: boolean;
}

export const DIFF_NORMALIZATION_PRESETS: Record<string, DiffNormalizationPreset> = {
  actionOrder: {
    label: 'アプリアクションの並び順',
    sections: new Set(['actionSettings']),
    ignoreKeys: new Set(['index']),
    unorderedArrays: false
  },
  viewOrder: {
    label: '一覧・グラフ・アクションの並び順',
    sections: new Set(['viewSettings', 'reportSettings', 'actionSettings']),
    ignoreKeys: new Set(['index', 'no', 'order']),
    unorderedArrays: true
  },
  permissionOrder: {
    label: '権限・通知・カテゴリの並び順',
    sections: new Set(['appAcl', 'fieldAcl', 'recordPermissions', 'notifications', 'perRecordNotifications', 'reminderNotifications', 'categories']),
    ignoreKeys: new Set(['index', 'no', 'order']),
    unorderedArrays: true
  },
  generalArrayOrder: {
    label: 'すべての並び順（プロセスなどを含む）',
    sections: new Set(['fieldSettings', 'processSettings', 'layoutSettings', 'actionSettings', 'appAcl', 'fieldAcl', 'recordPermissions', 'viewSettings', 'reportSettings', 'customizeSettings', 'notifications', 'perRecordNotifications', 'reminderNotifications', 'categories', 'pluginSettings', 'formSettings']),
    ignoreKeys: new Set(['index', 'no', 'order']),
    unorderedArrays: true
  },
  fieldOrder: {
    label: 'フィールド・レイアウトの並び順',
    sections: new Set(['fieldSettings', 'layoutSettings', 'formSettings']),
    ignoreKeys: new Set(['index', 'no', 'order', 'x', 'y']),
    unorderedArrays: true
  },
  processOrder: {
    label: 'プロセスの並び順',
    sections: new Set(['processSettings']),
    ignoreKeys: new Set(['index', 'no', 'order']),
    unorderedArrays: true
  },
  appReferences: {
    label: '環境固有ID（アプリ・一覧・グラフ・アクション）',
    // formSettings は旧 /form.json で fieldSettings と同じ参照IDを持つため、
    // 除外対象から漏らすと同じアプリIDの差分だけが再掲されてしまう。
    sections: new Set(['appInfo', 'fieldSettings', 'formSettings', 'viewSettings', 'reportSettings', 'actionSettings']),
    ignoreKeys: new Set(),
    unorderedArrays: false,
    ignoreAppReferencePaths: true
  },
  auditMeta: {
    label: '監査/リビジョン情報',
    sections: new Set(['fieldSettings', 'layoutSettings', 'viewSettings', 'reportSettings', 'processSettings', 'appSettings', 'formSettings', 'customizeSettings', 'pluginSettings', 'actionSettings', 'appAcl', 'fieldAcl', 'recordPermissions', 'notifications', 'perRecordNotifications', 'reminderNotifications', 'categories']),
    ignoreKeys: new Set(['id', 'revision', 'createdAt', 'createdat', 'creator', 'modifiedAt', 'modifiedat', 'modifier', 'updatedAt', 'updatedat', 'updatedBy', 'updatedby']),
    unorderedArrays: false
  },
  labelsAndText: {
    label: 'ラベル/説明文/ヘルプ',
    sections: new Set(['fieldSettings', 'layoutSettings', 'viewSettings', 'reportSettings', 'processSettings', 'appSettings', 'formSettings', 'actionSettings', 'notifications', 'perRecordNotifications', 'reminderNotifications']),
    ignoreKeys: new Set(['label', 'name', 'description', 'help', 'helpText', 'tooltip']),
    unorderedArrays: false
  },
  appearance: {
    label: '見た目/幅/座標',
    sections: new Set(['fieldSettings', 'layoutSettings', 'viewSettings', 'formSettings']),
    ignoreKeys: new Set(['width', 'height', 'minWidth', 'maxWidth', 'x', 'y', 'size', 'thumbnailSize', 'paginationStyle', 'pager']),
    unorderedArrays: false
  },
  fileKeys: {
    label: '添付/JS/CSS fileKey',
    sections: new Set(['customizeSettings', 'pluginSettings', 'appSettings']),
    ignoreKeys: new Set(['fileKey', 'filekey', 'contentKey', 'contentkey', 'blobKey', 'blobkey']),
    unorderedArrays: false
  },
  enabledFlags: {
    label: '有効/無効フラグ',
    sections: new Set(['processSettings', 'pluginSettings', 'customizeSettings', 'notifications', 'perRecordNotifications', 'reminderNotifications']),
    ignoreKeys: new Set(['enable', 'enabled', 'disabled', 'active']),
    unorderedArrays: false
  }
};

export const LINE_DIFF_MAX_CELLS = 90000;
export const CHAR_DIFF_MAX_CELLS = 20000;

export const ARRAY_KEY_CANDIDATES: readonly string[] = [
  'code',
  'id',
  'name',
  'entity',
  'field',
  'status',
  'state',
  'app',
  'from',
  'to',
  'key'
];

export const DEFAULT_IGNORE_KEYS: ReadonlySet<string> = new Set([
  'revision',
  'createdat',
  'creator',
  'modifiedat',
  'modifier'
]);
