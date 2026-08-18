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

export const buildErAppModelFromResponses = buildErAppModel;
export const createFailedErAppModel = buildFailedErAppModel;
