import { analyzeErDependencies, type ErDependencyAnalysis } from './er-analysis.js';
export { analyzeErDependencies, type ErDependencyAnalysis };

export type ErModelStatus = 'complete' | 'partial' | 'failed';

export type ErFieldDensity = 'none' | 'compact' | 'standard' | 'full';

export type ErIssueScope = 'fields' | 'metadata' | 'actions' | 'lookup' | 'referenceTable';

export interface ErModelIssue {
  scope: ErIssueScope;
  code: string;
  message: string;
  fieldCode?: string;
  fieldPath?: string;
}

export interface ErField {
  code: string;
  label: string;
  type: string;
  required: boolean;
  unique: boolean;
  isPK: boolean;
  isLookup: boolean;
  isRef: boolean;
  inSubtable: boolean;
  tableCode: string;
  tableLabel: string;
  path: string;
  displayPath: string;
  sub?: boolean;
}

export type ErRelationKind = 'LOOKUP' | 'REF' | 'ACTION';

export interface ErRelation {
  from: string;
  fromPath?: string;
  fromLabel: string;
  fromDisplay?: string;
  fromTableCode?: string;
  fromTableLabel?: string;
  toApp: number;
  toField: string;
  kind: ErRelationKind;
  /** REFERENCE_TABLE 表示部品のフィールドコード。 */
  controlField?: string;
  controlFieldPath?: string;
  controlFieldLabel?: string;
  /** REFERENCE_TABLE の condition.field。`from` と同じ値。 */
  sourceJoinField?: string;
}

export interface ErAppModel {
  id: number;
  name: string;
  spaceId: string | number | null;
  threadId: string | number | null;
  /**
   * 後方互換用の表示フィールド。生成時は allFields と同じで、
   * 表示密度の適用は selectErFieldsForDensity で行う。
   */
  fields: ErField[];
  /** API から取得できたフィールドを密度に関係なく保持する。 */
  allFields: ErField[];
  totalFieldCount: number;
  relations: ErRelation[];
  status: ErModelStatus;
  issues: ErModelIssue[];
  /** partial は表示可能、failed のみ false。 */
  ok: boolean;
  createdAt?: string;
  modifiedAt?: string;
  requiredCount: number;
  lookupCount: number;
  refCount: number;
  actionCount: number;
  relationCount: number;
  sourceGuestId: string;
}

export interface BuildErAppModelInput {
  appId: string | number;
  fieldsResponse: unknown;
  appInfoResponse?: unknown;
  actionsResponse?: unknown;
  appInfoError?: unknown;
  actionsError?: unknown;
  sourceGuestId?: string | number | null;
}

export interface FailedErAppModelContext {
  appInfoResponse?: unknown;
  sourceGuestId?: string | number | null;
}

export const DEFAULT_ER_MAX_FIELDS = 220;

const SKIPPED_FIELD_TYPES = new Set(['GROUP', 'SPACER', 'HR', 'LABEL']);

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeAppId(rawAppId: string | number): number {
  const appId = Number(rawAppId);
  if (!Number.isFinite(appId) || appId <= 0) {
    throw new TypeError(`Invalid kintone app id: ${String(rawAppId)}`);
  }
  return appId;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (isRecord(error) && typeof error.message === 'string' && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return fallback;
}

function fallbackAppName(appId: number): string {
  return `アプリ ${appId}`;
}

function readAppName(response: unknown, appId: number): string {
  return isRecord(response) && typeof response.name === 'string' && response.name.trim()
    ? response.name
    : fallbackAppName(appId);
}

function hasOwn(record: Record<string, any>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function positiveAppId(value: unknown): number | null {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export class ErFieldsUnavailableError extends Error {
  readonly appId: number;
  readonly originalError: unknown;

  constructor(appId: number, error?: unknown) {
    super(errorMessage(error, `アプリ ${appId} のフィールド設定を取得できません`));
    this.name = 'ErFieldsUnavailableError';
    this.appId = appId;
    this.originalError = error;
  }
}

function fieldIssue(
  scope: 'lookup' | 'referenceTable',
  code: string,
  message: string,
  fieldCode: string,
  fieldPath: string
): ErModelIssue {
  return { scope, code, message, fieldCode, fieldPath };
}

/**
 * フィールド、アプリ情報、アプリアクションの API 応答から ER モデルを組み立てる。
 * API 呼び出しは行わない pure function。
 *
 * fieldsResponse が取得できない場合は ErFieldsUnavailableError を投げる。
 * 呼び出し側で buildFailedErAppModel を使い failed モデルに変換できる。
 */
export function buildErAppModel(input: BuildErAppModelInput): ErAppModel {
  const appId = normalizeAppId(input.appId);
  const fieldResponse = input.fieldsResponse;
  if (!isRecord(fieldResponse) || !isRecord(fieldResponse.properties)) {
    throw new ErFieldsUnavailableError(appId, isRecord(fieldResponse) ? fieldResponse._fetchError : fieldResponse);
  }

  const issues: ErModelIssue[] = [];
  const appInfo = isRecord(input.appInfoResponse) ? input.appInfoResponse : null;
  const appInfoFetchError = input.appInfoError ?? appInfo?._fetchError;
  if (appInfoFetchError !== undefined && appInfoFetchError !== null) {
    issues.push({
      scope: 'metadata',
      code: 'metadata_fetch_failed',
      message: errorMessage(appInfoFetchError, `アプリ ${appId} のメタデータを取得できません`)
    });
  } else if (!appInfo || typeof appInfo.name !== 'string' || !appInfo.name.trim()) {
    issues.push({
      scope: 'metadata',
      code: 'metadata_response_invalid',
      message: `アプリ ${appId} のメタデータ応答が不完全です`
    });
  }

  const fields: ErField[] = [];
  const relations: ErRelation[] = [];

  const walk = (properties: Record<string, any>, parentTable = '', parentTableLabel = ''): void => {
    for (const [propertyKey, rawField] of Object.entries(properties)) {
      if (!isRecord(rawField)) continue;
      const type = typeof rawField.type === 'string' ? rawField.type : '';
      if (SKIPPED_FIELD_TYPES.has(type)) continue;

      const code = typeof rawField.code === 'string' && rawField.code ? rawField.code : propertyKey;
      const label = typeof rawField.label === 'string' && rawField.label ? rawField.label : code;
      const path = parentTable ? `${parentTable}.${code}` : code;
      const displayPath = parentTableLabel ? `${parentTableLabel} > ${label}` : label;

      if (type === 'SUBTABLE') {
        fields.push({
          code,
          label,
          type,
          required: false,
          unique: false,
          isPK: false,
          isLookup: false,
          isRef: false,
          sub: true,
          inSubtable: !!parentTable,
          tableCode: parentTable,
          tableLabel: parentTableLabel,
          path,
          displayPath
        });
        if (isRecord(rawField.fields)) {
          // allFields は表示密度・初期オプションに関係なく常に走査する。
          walk(rawField.fields, code, label);
        } else {
          issues.push({
            scope: 'fields',
            code: 'subtable_fields_invalid',
            message: `サブテーブル「${label}」の内部フィールドを読み取れません`,
            fieldCode: code,
            fieldPath: path
          });
        }
        continue;
      }

      const lookupWasNull = hasOwn(rawField, 'lookup') && rawField.lookup === null;
      const hasLookup = isRecord(rawField.lookup);
      const isReferenceTable = type === 'REFERENCE_TABLE';
      fields.push({
        code,
        label,
        type,
        required: !!rawField.required,
        unique: !!rawField.unique,
        // コード名は利用者が変更・再利用できるため、標準のレコード番号型だけを主キー扱いする。
        isPK: type === 'RECORD_NUMBER',
        isLookup: hasLookup,
        isRef: isReferenceTable,
        inSubtable: !!parentTable,
        tableCode: parentTable,
        tableLabel: parentTableLabel,
        path,
        displayPath
      });

      if (lookupWasNull) {
        issues.push(fieldIssue(
          'lookup',
          'lookup_null',
          `フィールド「${label}」のルックアップ設定が null です`,
          code,
          path
        ));
      }

      if (hasLookup) {
        const targetAppId = positiveAppId(rawField.lookup.relatedApp?.app);
        const toField = typeof rawField.lookup.relatedKeyField === 'string'
          ? rawField.lookup.relatedKeyField
          : '';
        if (targetAppId) {
          relations.push({
            from: code,
            fromPath: path,
            fromLabel: label,
            fromDisplay: displayPath,
            fromTableCode: parentTable,
            fromTableLabel: parentTableLabel,
            toApp: targetAppId,
            toField,
            kind: 'LOOKUP'
          });
          if (!toField) {
            issues.push(fieldIssue(
              'lookup',
              'lookup_related_key_missing',
              `フィールド「${label}」のルックアップ先キーが不明です`,
              code,
              path
            ));
          }
        } else {
          issues.push(fieldIssue(
            'lookup',
            'lookup_related_app_missing',
            `フィールド「${label}」のルックアップ先アプリが不明です`,
            code,
            path
          ));
        }
      }

      if (isReferenceTable) {
        if (rawField.referenceTable === null || !isRecord(rawField.referenceTable)) {
          issues.push(fieldIssue(
            'referenceTable',
            'reference_table_null',
            `関連レコード一覧「${label}」の設定が null または不正です`,
            code,
            path
          ));
          continue;
        }

        const referenceTable = rawField.referenceTable;
        const targetAppId = positiveAppId(referenceTable.relatedApp?.app);
        const condition = isRecord(referenceTable.condition) ? referenceTable.condition : null;
        const sourceJoinField = condition && typeof condition.field === 'string' ? condition.field : '';
        const toField = condition && typeof condition.relatedField === 'string' ? condition.relatedField : '';
        if (targetAppId && sourceJoinField) {
          relations.push({
            // kintone 公式仕様: condition.field が元アプリの結合フィールド。
            from: sourceJoinField,
            fromPath: sourceJoinField,
            fromLabel: sourceJoinField,
            fromDisplay: sourceJoinField,
            fromTableCode: '',
            fromTableLabel: '',
            toApp: targetAppId,
            toField,
            kind: 'REF',
            // 表示部品の code は結合元と混同しないよう別で保持する。
            controlField: code,
            controlFieldPath: path,
            controlFieldLabel: label,
            sourceJoinField
          });
          if (!toField) {
            issues.push(fieldIssue(
              'referenceTable',
              'reference_table_related_field_missing',
              `関連レコード一覧「${label}」の参照先結合フィールドが不明です`,
              code,
              path
            ));
          }
        } else {
          issues.push(fieldIssue(
            'referenceTable',
            'reference_table_condition_invalid',
            `関連レコード一覧「${label}」の参照先アプリまたは結合条件が不明です`,
            code,
            path
          ));
        }
      }
    }
  };

  walk(fieldResponse.properties);

  // REFERENCE_TABLE は表示部品と結合元フィールドが異なる。
  // walk 完了後に condition.field 側の表示名を解決する。
  const fieldsByCode = new Map<string, ErField>();
  for (const field of fields) {
    if (!fieldsByCode.has(field.code)) fieldsByCode.set(field.code, field);
    fieldsByCode.set(field.path, field);
  }
  for (const relation of relations) {
    if (relation.kind !== 'REF' || !relation.sourceJoinField) continue;
    const source = fieldsByCode.get(relation.sourceJoinField);
    if (!source) continue;
    relation.fromPath = source.path;
    relation.fromLabel = source.label;
    relation.fromDisplay = source.displayPath;
    relation.fromTableCode = source.tableCode;
    relation.fromTableLabel = source.tableLabel;
  }

  const actionResponse = isRecord(input.actionsResponse) ? input.actionsResponse : null;
  const actionFetchError = input.actionsError ?? actionResponse?._fetchError;
  if (actionFetchError !== undefined && actionFetchError !== null) {
    issues.push({
      scope: 'actions',
      code: 'actions_fetch_failed',
      message: errorMessage(actionFetchError, `アプリ ${appId} のアプリアクションを取得できません`)
    });
  } else if (!actionResponse || !isRecord(actionResponse.actions)) {
    issues.push({
      scope: 'actions',
      code: 'actions_response_invalid',
      message: `アプリ ${appId} のアプリアクション応答が不完全です`
    });
  } else {
    Object.entries(actionResponse.actions).forEach(([actionName, rawAction], index) => {
      if (!isRecord(rawAction)) return;
      const targetAppId = positiveAppId(rawAction.destApp?.app ?? rawAction.app?.app);
      if (!targetAppId) {
        issues.push({
          scope: 'actions',
          code: 'action_destination_invalid',
          message: `アプリアクション「${actionName}」の移動先アプリが不明です`
        });
        return;
      }
      const name = typeof rawAction.name === 'string' && rawAction.name ? rawAction.name : actionName;
      relations.push({
        from: `__ACTION__${index}`,
        fromLabel: name || `アクション${index + 1}`,
        toApp: targetAppId,
        toField: '',
        kind: 'ACTION'
      });
    });
  }

  const lookupCount = relations.filter((relation) => relation.kind === 'LOOKUP').length;
  const refCount = relations.filter((relation) => relation.kind === 'REF').length;
  const actionCount = relations.filter((relation) => relation.kind === 'ACTION').length;
  const appName = readAppName(appInfo, appId);
  const allFields = fields.slice();

  return {
    id: appId,
    name: appName,
    spaceId: appInfo?.spaceId ?? null,
    threadId: appInfo?.threadId ?? null,
    fields: allFields.slice(),
    allFields,
    totalFieldCount: allFields.filter((field) => field.type !== 'SUBTABLE').length,
    relations,
    status: issues.length ? 'partial' : 'complete',
    issues,
    ok: true,
    createdAt: typeof appInfo?.createdAt === 'string' ? appInfo.createdAt : undefined,
    modifiedAt: typeof appInfo?.modifiedAt === 'string' ? appInfo.modifiedAt : undefined,
    requiredCount: allFields.filter((field) => field.type !== 'SUBTABLE' && field.required).length,
    lookupCount,
    refCount,
    actionCount,
    relationCount: relations.length,
    sourceGuestId: input.sourceGuestId == null ? '' : String(input.sourceGuestId)
  };
}

/** fields API 自体が失敗した場合に呼び出し側で使うファクトリ。 */
export function buildFailedErAppModel(
  rawAppId: string | number,
  error: unknown,
  context: FailedErAppModelContext = {}
): ErAppModel {
  const appId = normalizeAppId(rawAppId);
  const appInfo = isRecord(context.appInfoResponse) ? context.appInfoResponse : null;
  const message = errorMessage(error, `アプリ ${appId} のフィールド設定を取得できません`);
  return {
    id: appId,
    name: readAppName(appInfo, appId),
    spaceId: appInfo?.spaceId ?? null,
    threadId: appInfo?.threadId ?? null,
    fields: [],
    allFields: [],
    totalFieldCount: 0,
    relations: [],
    status: 'failed',
    issues: [{ scope: 'fields', code: 'fields_fetch_failed', message }],
    ok: false,
    createdAt: typeof appInfo?.createdAt === 'string' ? appInfo.createdAt : undefined,
    modifiedAt: typeof appInfo?.modifiedAt === 'string' ? appInfo.modifiedAt : undefined,
    requiredCount: 0,
    lookupCount: 0,
    refCount: 0,
    actionCount: 0,
    relationCount: 0,
    sourceGuestId: context.sourceGuestId == null ? '' : String(context.sourceGuestId)
  };
}

/**
 * 密度を変えても allFields を破壊せず、表示対象だけを返す。
 */
export function selectErFieldsForDensity(
  app: Pick<ErAppModel, 'allFields' | 'relations'> & { fields?: ErField[] },
  density: ErFieldDensity | string,
  includeSubtable: boolean,
  maxFields: number = DEFAULT_ER_MAX_FIELDS
): ErField[] {
  if (density === 'none') return [];

  const canonicalFields = Array.isArray(app.allFields)
    ? app.allFields
    : (Array.isArray(app.fields) ? app.fields : []);
  const candidates = canonicalFields.filter((field) =>
    field.type !== 'SUBTABLE' && (includeSubtable || !field.inSubtable)
  );

  const linkedPaths = new Set<string>();
  for (const relation of Array.isArray(app.relations) ? app.relations : []) {
    if (relation.kind !== 'LOOKUP' && relation.kind !== 'REF') continue;
    const fromPath = String(relation.fromPath || relation.from || '').trim();
    if (fromPath) linkedPaths.add(fromPath);
    const controlPath = String(relation.controlFieldPath || relation.controlField || '').trim();
    if (controlPath) linkedPaths.add(controlPath);
  }

  const isEssential = (field: ErField): boolean => (
    field.isPK
    || field.unique
    || field.isLookup
    || field.isRef
    || linkedPaths.has(field.path)
    || linkedPaths.has(field.code)
  );

  let selected: ErField[];
  if (density === 'full') {
    selected = candidates;
  } else if (density === 'standard') {
    selected = candidates.filter((field) => isEssential(field) || field.required);
    if (!selected.length) selected = candidates.slice(0, 6);
  } else {
    selected = candidates.filter(isEssential);
    if (!selected.length) selected = candidates.slice(0, 6);
  }

  const limit = Number.isFinite(maxFields)
    ? Math.max(0, Math.floor(maxFields))
    : DEFAULT_ER_MAX_FIELDS;
  return selected.slice(0, limit);
}

/**
 * 設定取得JSON（SettingsBundle 形式: appId, appName, guestId, sections.formFields / fieldSettings,
 * sections.appSettings / appInfo, sections.actionSettings 等）から API 通信なしで ER 図の AppData モデルを構築する。
 */
export function buildErAppModelFromBundle(bundle: any): ErAppModel {
  if (!isRecord(bundle)) {
    throw new TypeError('Invalid settings bundle');
  }
  const sections = isRecord(bundle.sections) ? bundle.sections : {};
  const rawAppInfo = isRecord(sections.appInfo)
    ? sections.appInfo
    : (isRecord(bundle.appInfo) ? bundle.appInfo : (isRecord(bundle.appInfoResponse) ? bundle.appInfoResponse : null));
  const rawAppSettings = isRecord(sections.appSettings)
    ? sections.appSettings
    : (isRecord(bundle.appSettings) ? bundle.appSettings : null);
  const rawAppId = bundle.appId
    ?? bundle.id
    ?? rawAppInfo?.appId
    ?? rawAppInfo?.id
    ?? rawAppSettings?.appId;
  const appId = normalizeAppId(rawAppId);
  const sourceGuestId = bundle.guestId ?? bundle.sourceGuestId ?? '';

  const resolvedName = (typeof bundle.appName === 'string' && bundle.appName.trim())
    || (typeof bundle.name === 'string' && bundle.name.trim())
    || (typeof rawAppInfo?.name === 'string' && rawAppInfo.name.trim())
    || (typeof rawAppSettings?.name === 'string' && rawAppSettings.name.trim())
    || '';

  const appInfoError = bundle.appInfoError ?? rawAppInfo?._fetchError ?? rawAppSettings?._fetchError;
  const appInfoResponse = (rawAppInfo || rawAppSettings || resolvedName)
    ? {
        ...(rawAppSettings || {}),
        ...(rawAppInfo || {}),
        ...(resolvedName ? { name: resolvedName } : {})
      }
    : undefined;

  let rawFields: any = sections.formFields
    ?? sections.fieldSettings
    ?? sections.fields
    ?? bundle.formFields
    ?? bundle.fieldSettings
    ?? bundle.fieldsResponse
    ?? (isRecord(bundle.properties) ? bundle : undefined);

  if (
    isRecord(rawFields)
    && !isRecord(rawFields.properties)
    && rawFields._fetchError === undefined
    && Object.values(rawFields).some((v) => isRecord(v) && typeof v.type === 'string')
  ) {
    rawFields = { properties: rawFields };
  }

  let rawActions: any = sections.actionSettings
    ?? sections.actions
    ?? bundle.actionSettings
    ?? bundle.actionsResponse
    ?? bundle.actions;
  const actionsError = bundle.actionsError ?? (isRecord(rawActions) ? rawActions._fetchError : undefined);
  if (rawActions === undefined && actionsError === undefined) {
    rawActions = { actions: {} };
  } else if (isRecord(rawActions) && !isRecord(rawActions.actions) && rawActions._fetchError === undefined) {
    rawActions = { actions: rawActions };
  }

  try {
    return buildErAppModel({
      appId,
      fieldsResponse: rawFields,
      appInfoResponse,
      actionsResponse: rawActions,
      appInfoError,
      actionsError,
      sourceGuestId
    });
  } catch (err) {
    if (err instanceof ErFieldsUnavailableError) {
      return buildFailedErAppModel(appId, err, { appInfoResponse, sourceGuestId });
    }
    throw err;
  }
}

function sanitizeErIdentifier(value: unknown): string {
  return String(value == null ? '' : value)
    .replace(/[^a-zA-Z0-9_\u3000-\u9FFF\uF900-\uFAFF]/g, '_')
    .replace(/^_+|_+$/g, '') || 'unnamed';
}

function erEntityAlias(app: any): string {
  return `app_${String(app?.id ?? 'unknown').replace(/[^0-9A-Za-z_]/g, '_')}`;
}

function erOneLineLabel(value: unknown): string {
  return String(value == null ? '' : value).replace(/[\r\n]+/g, ' ').replace(/"/g, "'").trim();
}

function erExportStatusLabel(app: any): string {
  if (app?.status === 'partial') return '一部取得';
  if (app?.status === 'failed' || app?.ok === false) return '取得失敗';
  return '取得完了';
}

function erExportIssueText(app: any): string {
  return (Array.isArray(app?.issues) ? app.issues : [])
    .map((issue: any) => erOneLineLabel(issue?.message || issue?.code || '取得上の注意'))
    .filter(Boolean)
    .join(' / ');
}

function erExportRelationLabel(rel: any): string {
  const base = erOneLineLabel(rel?.fromDisplay || rel?.fromLabel || rel?.from || rel?.kind || '');
  if (rel?.kind === 'REF' && (rel?.sourceJoinField || rel?.from || rel?.toField)) {
    return `${base} [結合: ${erOneLineLabel(rel.sourceJoinField || rel.from || '?')} → ${erOneLineLabel(rel.toField || '?')}]`;
  }
  return base;
}

function erCanonicalFields(app: any): ErField[] {
  if (Array.isArray(app?.allFields)) return app.allFields;
  if (Array.isArray(app?.fields)) return app.fields;
  return [];
}

function erFieldDisplayName(field: any): string {
  if (!field) return '';
  if (field.inSubtable && field.tableLabel) {
    return `${field.tableLabel} > ${field.label || field.code || ''}`;
  }
  return String(field.label || field.code || field.path || '');
}

/**
 * アプリ配列から erDiagram 形式の Mermaid ソースを生成する純粋関数。
 * ルックアップ・関連レコード・アプリアクションのリレーションとフィールド定義を出力する。
 */
export function buildErMermaidSource(apps: any[], options?: { showAllFields?: boolean }): string {
  const safeApps = (Array.isArray(apps) ? apps : []).filter((a) => a && a.id != null);
  const appMap = new Map<string, any>();
  for (const app of safeApps) {
    appMap.set(String(app.id), app);
  }
  const showAll = options?.showAllFields;
  let m = 'erDiagram\n';

  for (const a of safeApps) {
    const n = erEntityAlias(a);
    const status = erExportStatusLabel(a);
    const issueText = erExportIssueText(a);
    const appName = erOneLineLabel(a.name || `アプリ ${a.id}`);
    m += `  %% ${n}: ${appName} (App ${a.id})\n`;
    m += `  %% 取得状態: ${status}${issueText ? ` / ${issueText}` : ''}\n`;

    const allFields = erCanonicalFields(a);
    const subtableFieldCount = allFields.filter((f) => f?.inSubtable).length;
    if (subtableFieldCount && showAll !== true) {
      m += `  %% サブテーブル内 ${subtableFieldCount}項目は親エンティティへ平坦化せず省略（ERモデルJSONに所属表を収録）\n`;
    }

    const visibleName = `${status === '取得完了' ? '' : `[${status}] `}${appName} (App ${a.id})`;
    m += `  ${n}["${visibleName}"] {\n`;

    const linkedCodes = new Set<string>();
    for (const rel of Array.isArray(a.relations) ? a.relations : []) {
      if (rel?.kind !== 'LOOKUP' && rel?.kind !== 'REF') continue;
      for (const k of [rel.fromPath, rel.from, rel.controlFieldPath, rel.controlField, rel.sourceJoinField]) {
        if (k) linkedCodes.add(String(k));
      }
    }

    for (const f of allFields) {
      if (!f || f.type === 'SUBTABLE') continue;
      if (showAll === false) {
        if (f.inSubtable) continue;
        const isKeyOrRel = f.isPK || f.isLookup || f.isRef || f.unique || linkedCodes.has(String(f.path || '')) || linkedCodes.has(String(f.code || ''));
        if (!isKeyOrRel) continue;
      } else if (showAll !== true && f.inSubtable) {
        continue;
      }
      let com = '';
      if (f.isPK) com = ' PK';
      else if (f.isLookup) com = ' FK';
      const fType = String(f.type || 'STRING').replace(/[^a-zA-Z0-9_]/g, '') || 'STRING';
      const fCode = sanitizeErIdentifier(f.inSubtable && f.path ? f.path : f.code);
      m += `    ${fType} ${fCode}${com}\n`;
    }
    m += '  }\n';
  }

  const mermaidExternalIds = new Set<string>();
  for (const a of safeApps) {
    for (const r of Array.isArray(a.relations) ? a.relations : []) {
      if (!r || r.toApp == null || String(r.toApp) === '') continue;
      const toKey = String(r.toApp);
      if (appMap.has(toKey) || mermaidExternalIds.has(toKey)) continue;
      mermaidExternalIds.add(toKey);
      const alias = erEntityAlias({ id: r.toApp });
      m += `  %% ${alias}: 未取得の参照先 (App ${erOneLineLabel(r.toApp)})\n`;
      m += `  ${alias}["未取得の参照先 (App ${erOneLineLabel(r.toApp)})"] {\n    string __unresolved\n  }\n`;
    }
  }

  for (const a of safeApps) {
    for (const r of Array.isArray(a.relations) ? a.relations : []) {
      if (!r || r.toApp == null || String(r.toApp) === '') continue;
      const t = appMap.get(String(r.toApp)) || { id: r.toApp };
      const label = erExportRelationLabel(r);
      if (r.kind === 'ACTION') {
        m += `  %% ACTION ${erEntityAlias(a)} -> ${erEntityAlias(t)}: ${label}\n`;
      } else {
        const relArrow = r.kind === 'LOOKUP' ? ' }o--o| ' : ' }o--o{ ';
        m += `  ${erEntityAlias(a)}${relArrow}${erEntityAlias(t)} : "${label}"\n`;
      }
    }
  }

  return m;
}

function countErConnectedComponents(apps: any[]): number {
  const validApps = (Array.isArray(apps) ? apps : []).filter((a) => a && a.id != null && String(a.id).trim() !== '');
  if (!validApps.length) return 0;
  const undirected = new Map<string, Set<string>>();
  for (const a of validApps) {
    undirected.set(String(a.id), new Set());
  }
  for (const a of validApps) {
    const fromId = String(a.id);
    for (const r of Array.isArray(a.relations) ? a.relations : []) {
      const toId = String(r?.toApp ?? '');
      if (!toId || !undirected.has(toId) || fromId === toId) continue;
      undirected.get(fromId)?.add(toId);
      undirected.get(toId)?.add(fromId);
    }
  }
  const visited = new Set<string>();
  let count = 0;
  for (const startId of undirected.keys()) {
    if (visited.has(startId)) continue;
    count += 1;
    const queue = [startId];
    visited.add(startId);
    while (queue.length) {
      const cur = queue.shift()!;
      for (const next of undirected.get(cur) || []) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
  }
  return count;
}

function erMdEsc(s: unknown): string {
  return String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ').trim();
}

function erRelationKeyConditionDetail(r: any): string {
  if (!r) return '';
  if (r.kind === 'LOOKUP') {
    const from = r.fromPath || r.from || '';
    const to = r.toField || '';
    return to ? `${from || '?'} -> ${to}` : String(from);
  }
  if (r.kind === 'REF') {
    const joinFrom = r.sourceJoinField || r.from || '?';
    const joinTo = r.toField || '?';
    return `${joinFrom} = ${joinTo}`;
  }
  if (r.kind === 'ACTION') {
    const label = r.fromLabel || r.fromDisplay || r.from || 'アクション';
    return r.toField ? `${label} -> ${r.toField}` : String(label);
  }
  return String(r.toField || r.from || '');
}

/**
 * アプリ一覧・リレーション一覧・各アプリのフィールド定義に加え、
 * analyzeErDependencies（循環参照/SCC、ハブアプリ、孤立アプリ、連結成分数など）の
 * グラフ分析サマリを含む「ER図仕様書 (Markdown)」を生成する純粋関数。
 */
export function buildErMarkdownSpec(
  apps: any[],
  analysis?: Partial<ErDependencyAnalysis> & Record<string, any>,
  options?: { generatedAt?: string }
): string {
  const safeApps = (Array.isArray(apps) ? apps : []).filter((a) => a && a.id != null);
  const appMap = new Map<string, any>();
  for (const app of safeApps) {
    appMap.set(String(app.id), app);
  }
  const computedAnalysis = analyzeErDependencies(safeApps);
  const dep: ErDependencyAnalysis & Record<string, any> = analysis && typeof analysis === 'object'
    ? {
        ...computedAnalysis,
        ...analysis,
        counts: { ...computedAnalysis.counts, ...(analysis.counts || {}) }
      }
    : computedAnalysis;

  const connectedComponentCount = typeof dep.connectedComponentCount === 'number'
    ? dep.connectedComponentCount
    : (typeof dep.connectedComponents === 'number' ? dep.connectedComponents : countErConnectedComponents(safeApps));
  const generatedAt = options?.generatedAt || new Date().toLocaleString('ja-JP');
  const totalRelations = safeApps.reduce((sum, a) => sum + (Array.isArray(a.relations) ? a.relations.length : 0), 0);
  const cycles = Array.isArray(dep.cycles) ? dep.cycles : [];
  const hubs = Array.isArray(dep.hubs) ? dep.hubs : [];
  const isolatedAppIds = Array.isArray(dep.isolatedAppIds) ? dep.isolatedAppIds : [];
  const selfReferences = Array.isArray(dep.selfReferences) ? dep.selfReferences : [];
  const unresolvedTargets = Array.isArray(dep.unresolvedTargets) ? dep.unresolvedTargets : [];
  const threshold = dep.highConnectionThreshold ?? 3;

  const lines: string[] = [];
  lines.push('# kintone ER図 仕様書');
  lines.push('');
  lines.push(`- 生成日時: ${generatedAt}`);
  lines.push(`- アプリ数: ${safeApps.length}`);
  lines.push(`- 総リレーション: ${totalRelations}`);
  lines.push(`- 取得完了: ${dep.counts.retrievalComplete}`);
  lines.push(`- 一部取得: ${dep.counts.retrievalPartial}`);
  lines.push(`- 取得失敗: ${dep.counts.retrievalFailed}`);
  lines.push('');

  lines.push('## グラフ分析サマリ');
  lines.push('');
  lines.push(`- 連結成分数: ${connectedComponentCount}`);
  lines.push(`- 複数アプリの循環参照 (SCC): ${cycles.length}件`);
  lines.push(`- 自己参照: ${selfReferences.length}件`);
  lines.push(`- ハブアプリ（接続数 ${threshold}件以上）: ${hubs.length}件`);
  lines.push(`- 孤立アプリ（関連なし）: ${isolatedAppIds.length}件`);
  lines.push(`- 未取得の参照先: ${unresolvedTargets.length}件`);
  lines.push('');

  lines.push('### 循環参照（強連結成分 / SCC）');
  if (cycles.length) {
    cycles.forEach((cycle, i) => {
      const names = Array.isArray(cycle.appNames) && cycle.appNames.length
        ? cycle.appNames.map(erMdEsc).join(' → ')
        : (cycle.appIds || []).map((id: string) => erMdEsc(appMap.get(String(id))?.name || `アプリ ${id}`)).join(' → ');
      const ids = (cycle.appIds || []).map((id: string) => `App ${erMdEsc(id)}`).join(', ');
      lines.push(`- 候補 ${i + 1}: ${names}${ids ? ` (${ids})` : ''}`);
    });
  } else {
    lines.push('- なし');
  }
  lines.push('');

  lines.push(`### ハブアプリ（接続数 ${threshold}件以上）`);
  if (hubs.length) {
    hubs.forEach((hub) => {
      lines.push(`- ${erMdEsc(hub.name)} (App ${erMdEsc(hub.appId)}): 入 ${hub.incoming} / 出 ${hub.outgoing} / 合計 ${hub.total}`);
    });
  } else {
    lines.push('- なし');
  }
  lines.push('');

  lines.push('### 孤立アプリ');
  if (isolatedAppIds.length) {
    isolatedAppIds.forEach((id) => {
      const app = appMap.get(String(id));
      const name = app?.name || `アプリ ${id}`;
      lines.push(`- ${erMdEsc(name)} (App ${erMdEsc(id)})`);
    });
  } else {
    lines.push('- なし');
  }
  lines.push('');

  if (selfReferences.length) {
    lines.push('### 自己参照');
    selfReferences.forEach((sr) => {
      lines.push(`- ${erMdEsc(sr.appName)} (App ${erMdEsc(sr.appId)}): ${erMdEsc(sr.kind)}${sr.field ? ` (${erMdEsc(sr.field)})` : ''}`);
    });
    lines.push('');
  }

  if (unresolvedTargets.length) {
    lines.push('### 未取得の参照先');
    unresolvedTargets.forEach((ut) => {
      lines.push(`- ${erMdEsc(ut.fromAppName)} (App ${erMdEsc(ut.fromAppId)}) → App ${erMdEsc(ut.toAppId || '不明')}: ${erMdEsc(ut.kind)}${ut.field ? ` (${erMdEsc(ut.field)})` : ''}`);
    });
    lines.push('');
  }

  lines.push('## アプリ一覧');
  lines.push('');
  lines.push('| アプリID | アプリ名 | 項目数 | 関連数 | 深さ | 状態 |');
  lines.push('|---:|---|---:|---:|---:|---|');
  safeApps.forEach((a) => {
    const fieldList = erCanonicalFields(a).filter((f) => f && f.type !== 'SUBTABLE');
    const relList = Array.isArray(a.relations) ? a.relations : [];
    lines.push(`| ${erMdEsc(a.id)} | ${erMdEsc(a.name || `アプリ ${a.id}`)} | ${fieldList.length} | ${relList.length} | ${a.depth || 0} | ${erExportStatusLabel(a)} |`);
  });
  lines.push('');

  lines.push('## リレーション一覧');
  lines.push('');
  if (totalRelations > 0) {
    lines.push('| 参照元アプリID | 参照元アプリ名 | フィールドコード | フィールド名 | リレーション種別 | 参照先アプリID | 参照先アプリ名 | キー・条件詳細 |');
    lines.push('|---:|---|---|---|---|---:|---|---|');
    safeApps.forEach((a) => {
      for (const r of Array.isArray(a.relations) ? a.relations : []) {
        if (!r) continue;
        const t = appMap.get(String(r.toApp));
        const fieldCode = r.kind === 'REF' ? (r.controlField || r.sourceJoinField || r.from || '') : (r.from || r.controlField || '');
        const fieldName = r.controlFieldLabel || r.fromDisplay || r.fromLabel || r.from || r.kind || '';
        const targetName = t ? (t.name || `アプリ ${t.id}`) : `未取得 (App ${r.toApp ?? '?'})`;
        lines.push(`| ${erMdEsc(a.id)} | ${erMdEsc(a.name || `アプリ ${a.id}`)} | ${erMdEsc(fieldCode)} | ${erMdEsc(fieldName)} | ${erMdEsc(r.kind || '')} | ${erMdEsc(r.toApp ?? '')} | ${erMdEsc(targetName)} | ${erMdEsc(erRelationKeyConditionDetail(r))} |`);
      }
    });
  } else {
    lines.push('リレーションはありません。');
  }
  lines.push('');

  safeApps.forEach((a) => {
    lines.push(`## ${erMdEsc(a.name || `アプリ ${a.id}`)} (App ${a.id})`);
    lines.push('');
    lines.push(`- 取得状態: ${erExportStatusLabel(a)}`);
    const issueText = erExportIssueText(a);
    if (issueText) lines.push(`- 取得上の注意: ${erMdEsc(issueText)}`);
    lines.push('');

    const vf = erCanonicalFields(a).filter((f) => f && f.type !== 'SUBTABLE');
    if (vf.length) {
      lines.push('### フィールド');
      lines.push('');
      lines.push('| コード | 名称 | 種類 | 必須 | 主キー | Lookup | 関連 | サブテーブル |');
      lines.push('|---|---|---|:---:|:---:|:---:|:---:|:---:|');
      vf.forEach((f) => {
        lines.push(`| ${erMdEsc(f.code || '')} | ${erMdEsc(erFieldDisplayName(f))} | ${erMdEsc(f.type || '')} | ${f.required ? '✓' : ''} | ${f.isPK ? '✓' : ''} | ${f.isLookup ? '✓' : ''} | ${f.isRef ? '✓' : ''} | ${f.inSubtable ? '✓' : ''} |`);
      });
      lines.push('');
    }

    const rels = Array.isArray(a.relations) ? a.relations : [];
    if (rels.length) {
      lines.push('### リレーション');
      lines.push('');
      lines.push('| 種類 | 関連名 | 表示部品 | 結合元フィールド | 宛先アプリ | 宛先フィールド |');
      lines.push('|---|---|---|---|---|---|');
      rels.forEach((r: any) => {
        const t = appMap.get(String(r.toApp));
        const targetLabel = t ? `${t.name || `アプリ ${t.id}`} (App ${r.toApp})` : `未取得 (App ${r.toApp})`;
        lines.push(`| ${erMdEsc(r.kind || '')} | ${erMdEsc(r.fromDisplay || r.fromLabel || r.from || r.kind || '')} | ${erMdEsc(r.controlFieldLabel || r.controlField || '')} | ${erMdEsc(r.kind === 'ACTION' ? '' : (r.sourceJoinField || r.from || ''))} | ${erMdEsc(targetLabel)} | ${erMdEsc(r.toField || '')} |`);
      });
      lines.push('');
    }
  });

  return lines.join('\n');
}

function erCsvCell(value: unknown): string {
  const raw = String(value == null ? '' : value);
  const safe = /^[\t\r\n ]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function erCsvLine(row: unknown[]): string {
  return row.map(erCsvCell).join(',');
}

/**
 * BOM (\uFEFF) 付きCSVでリレーション一覧
 * （参照元アプリID, 参照元アプリ名, フィールドコード, フィールド名, リレーション種別, 参照先アプリID, 参照先アプリ名, キー・条件詳細）
 * を出力する純粋関数（CSV数式インジェクション対策込み）。
 */
export function buildErRelationsCsv(apps: any[]): string {
  const safeApps = (Array.isArray(apps) ? apps : []).filter((a) => a && a.id != null);
  const appMap = new Map<string, any>();
  for (const app of safeApps) {
    appMap.set(String(app.id), app);
  }
  const rows: unknown[][] = [[
    '参照元アプリID',
    '参照元アプリ名',
    'フィールドコード',
    'フィールド名',
    'リレーション種別',
    '参照先アプリID',
    '参照先アプリ名',
    'キー・条件詳細'
  ]];
  for (const a of safeApps) {
    const fromAppName = a.name || `アプリ ${a.id}`;
    for (const r of Array.isArray(a.relations) ? a.relations : []) {
      if (!r) continue;
      const t = appMap.get(String(r.toApp));
      const fieldCode = r.kind === 'REF'
        ? (r.controlField || r.sourceJoinField || r.from || '')
        : (r.from || r.controlField || '');
      const fieldName = r.controlFieldLabel || r.fromDisplay || r.fromLabel || r.from || r.kind || '';
      const targetName = t ? (t.name || `アプリ ${t.id}`) : '未取得の参照先';
      rows.push([
        a.id,
        fromAppName,
        fieldCode,
        fieldName,
        r.kind || '',
        r.toApp ?? '',
        targetName,
        erRelationKeyConditionDetail(r)
      ]);
    }
  }
  return `\uFEFF${rows.map(erCsvLine).join('\n')}`;
}
