'use strict';

import { csvImportUnsupportedFields } from './record-csv-import.js';
import { csvEscape } from './record-query.js';
import { reportCsv } from './record-quality.js';

export function buildCsvImportTemplate(properties: Record<string, any>) {
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) throw new Error('フィールド設定の応答が不正です');
  const codes: string[] = [], excluded: Array<{ code: string; reason: string }> = [];
  const unsupported = csvImportUnsupportedFields(properties);
  const guide: unknown[][] = [['フィールドコード', 'フィールド名', '種類', '必須', '重複禁止', '初期値（設定値）', '選択肢（表示順）', '入力方法・制約']];
  for (const [code, field] of Object.entries(properties)) {
    if (unsupported.has(code)) { excluded.push({ code, reason: unsupported.get(code)! }); continue; }
    codes.push(code);
    const notes: string[] = [];
    if (['USER_SELECT', 'ORGANIZATION_SELECT', 'GROUP_SELECT'].includes(field.type)) notes.push('表示名ではなくログイン名・組織コード・グループコード。複数はセル内カンマ区切り');
    if (['CHECK_BOX', 'MULTI_SELECT'].includes(field.type)) notes.push('選択肢の値をセル内カンマ区切り（カンマを含む選択肢はこの取込機能で指定不可）');
    if (field.type === 'DATE') notes.push('YYYY-MM-DD');
    if (field.type === 'TIME') notes.push('HH:mm');
    if (field.type === 'DATETIME') notes.push('タイムゾーン付き日時（例: 2026-01-01T09:00:00+09:00）');
    if (field.type === 'NUMBER') notes.push('桁区切り・単位なしの数値');
    if (field.lookup) notes.push('ルックアップ元のキー値。参照先の権限と値の一致を確認');
    for (const [key, label] of [['minLength', '最小文字数'], ['maxLength', '最大文字数'], ['minValue', '最小値'], ['maxValue', '最大値']]) {
      if (field[key] !== undefined && field[key] !== null && field[key] !== '') notes.push(`${label}: ${field[key]}`);
    }
    const defaults = field.defaultNowValue === true || field.defaultNowValue === 'true' ? '現在の日付・日時' : JSON.stringify(field.defaultValue ?? '');
    const choices = Object.entries(field.options || {}).sort(([, a]: any, [, b]: any) => Number(a.index) - Number(b.index)).map(([value]) => value);
    guide.push([code, field.label || code, field.type, field.required === true || field.required === 'true' ? '必須' : '', field.unique === true || field.unique === 'true' ? '禁止' : '', defaults, JSON.stringify(choices), notes.join(' / ')]);
  }
  if (!codes.length) throw new Error('CSV取込に対応するフィールドがありません');
  return {
    columnCount: codes.length,
    csv: '\uFEFF' + codes.map(csvEscape).join(',') + '\r\n',
    guideCsv: reportCsv(guide),
    excludedCsv: reportCsv([['除外フィールドコード', '理由'], ...excluded.map(item => [item.code, item.reason])]),
    readme: [
      '【使い方】',
      '1. import.csv の2行目からデータを入力し、UTF-8のCSVとして保存してください。1行目はフィールドコードです。',
      '2. fields.csv で必須・選択肢・初期値・入力形式を確認できます。excluded.csv はこの取込機能の対象外です。',
      '3. 「CSVからレコードを追加」でファイルを選び、「CSVを事前検査」を実行してください。',
      '',
      '【同梱ファイル】',
      '- import.csv   … 取込用ひな形（ヘッダー行のみ）',
      '- fields.csv   … 列ごとの入力ガイド（必須・重複禁止・初期値・選択肢・制約）',
      '- excluded.csv … 取込に使えないフィールドと理由',
      '',
      '【注意】',
      '- 初期値は説明用です。ひな形にサンプルレコードや初期値は挿入していません。空セルを送っても初期値に置き換わるとは限りません。初期値を使う項目は列を削除するか、値を明示してください。',
      '- 取込は新規追加です。ファイル・テーブル・計算結果・システム項目・ルックアップのコピー先は含めません。',
      '- Excelで編集する場合、先頭ゼロ・長い番号・日付の自動変換に注意し、文字列として読み込んでください。',
      '- fields.csv / excluded.csv は閲覧用で、数式と解釈される文字列の先頭にアポストロフィを付けています。import.csv のコードは変更していません。',
      '- フィールド設定だけでは実行ユーザーの登録権限やルックアップ先の値は判定できません。取得時点の設定です。'
    ].join('\r\n')
  };
}
