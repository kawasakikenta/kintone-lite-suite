'use strict';

export interface ProcessActionChoice {
  name: string;
  from: string;
  to: string;
  filterCond: string;
  type: string;
  assigneeType: string;
  assigneeCandidates: string[];
  executableUsers: string[];
  ambiguous: boolean;
}

function describeEntities(entities: any): string[] {
  if (!Array.isArray(entities)) return [];
  const types = { USER: 'ユーザー', GROUP: 'グループ', ORGANIZATION: '組織', FIELD_ENTITY: 'フィールド', CREATOR: 'アプリ作成者', CUSTOM_FIELD: '共通管理項目' };
  return entities.map(item => {
    const entity = item?.entity || {};
    return `${types[entity.type] || entity.type || '不明'}${entity.code ? `: ${entity.code}` : ''}${item?.includeSubs ? '（下位組織を含む）' : ''}`;
  });
}

export function readProcessActionChoices(response: any): ProcessActionChoice[] {
  if (!Array.isArray(response?.actions)) throw new Error('プロセス管理のアクション情報が不正です。再取得してください。');
  const counts = new Map<string, number>();
  for (const action of response.actions) {
    const key = JSON.stringify([action?.from, action?.name]);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return response.actions.map((action: any) => {
    if (!action || typeof action.name !== 'string' || typeof action.from !== 'string' || typeof action.to !== 'string') throw new Error('プロセス管理のアクション情報が不正です。再取得してください。');
    const assignee = response.states?.[action.to]?.assignee;
    return { name: action.name, from: action.from, to: action.to, filterCond: String(action.filterCond || ''),
      type: String(action.type || 'PRIMARY'), assigneeType: String(assignee?.type || ''),
      assigneeCandidates: describeEntities(assignee?.entities), executableUsers: describeEntities(action.executableUser?.entities),
      ambiguous: counts.get(JSON.stringify([action.from, action.name])) > 1 };
  });
}

export function describeProcessAction(action: ProcessActionChoice): string {
  const assignees = { ONE: '候補から1人を選択', ALL: '候補全員', ANY: '候補のうち1人' };
  return [
    `${action.from} → ${action.to}`,
    `実行条件: ${action.filterCond || '条件なし'}`,
    `実行者: ${action.type === 'SECONDARY' ? action.executableUsers.join(' / ') || 'レコード閲覧可能なユーザー全員' : '現在の作業者（未指定時はレコード閲覧可能なユーザー）'}`,
    `次の作業者: ${assignees[action.assigneeType] || '設定なし'}${action.assigneeCandidates.length ? ` / ${action.assigneeCandidates.join(' / ')}` : ' / 候補設定なし'}`,
    action.assigneeType === 'ONE' && action.assigneeCandidates.length ? '作業者ログイン名の指定が必要になる場合があります。フィールド・組織等の候補はレコードごとに異なります。' : '',
    action.ambiguous ? '同じ遷移元に同名アクションが複数あります。この名前はREST APIで指定できません。kintone側のアクション名を見直してください。' : ''
  ].filter(Boolean).join('\n');
}

export function processActionQuery(action: ProcessActionChoice, statusFieldCode: string): string {
  if (action.ambiguous) throw new Error('同じ遷移元に同名アクションが複数あるため、REST APIで指定できません。');
  if (!statusFieldCode) throw new Error('ステータスのフィールドコードを取得できません。アクションを再取得してください。');
  return [`${statusFieldCode} in (${JSON.stringify(action.from)})`, action.filterCond ? `(${action.filterCond})` : ''].filter(Boolean).join(' and ');
}
