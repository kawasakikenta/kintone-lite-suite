/**
 * プレビュー反映 lite の入力補助（DOM 非依存）。
 * URL からのアプリID読み取り、ルックアップ変換の記法、進めない理由の説明、反映後の再確認判定を
 * 純粋関数として切り出し、単体テストの対象にする。
 */

import { extractAppIdFromInput, extractGuestIdFromInput } from '../handlers/diffFocus.js';

export interface AppReference { appId: string; guestId: string }

/**
 * 入力欄に貼り付けられた文字列からアプリIDとゲストスペースIDを読み取る。
 * 数字だけならそのまま、kintone の URL（/k/123/、/k/guest/5/123/、?app=123）なら抽出する。
 * 読み取れない場合は null。
 */
export function parseAppReference(text: string): AppReference | null {
  const raw = String(text || '').trim();
  if (!raw) return null;
  if (/^[1-9]\d*$/.test(raw)) return { appId: raw, guestId: '' };
  const appId = extractAppIdFromInput(raw);
  if (!/^[1-9]\d*$/.test(appId)) return null;
  return { appId, guestId: extractGuestIdFromInput(raw) };
}

/** 入力値が数字だけではなく、URL などから読み取りが必要かどうか。 */
export function needsAppReferenceParse(text: string): boolean {
  const raw = String(text || '').trim();
  return !!raw && !/^\d+$/.test(raw);
}

export type LookupMapParseResult =
  | { ok: true; value: Record<string, string>; count: number }
  | { ok: false; error: string };

const LOOKUP_PAIR_SEPARATOR = /\s*(?:→|->|=>|=|:|,|\t)\s*|\s+/;

/**
 * ルックアップ参照アプリIDの変換表を解析する。
 * JSON オブジェクト（{"旧":"新"}）に加えて、1 行 1 組の「旧ID → 新ID」記法を受け付ける。
 * 区切りは →, ->, =>, =, :, カンマ, 空白のいずれか。# で始まる行は無視する。
 */
export function parseLookupMapText(text: string): LookupMapParseResult {
  const trimmed = String(text || '').trim();
  if (!trimmed) return { ok: true, value: {}, count: 0 };
  const pairs: Array<[string, string]> = [];
  if (trimmed.startsWith('{')) {
    let parsed: unknown;
    try { parsed = JSON.parse(trimmed); } catch {
      return { ok: false, error: '参照先変換の JSON が壊れています。{"旧AppID":"新AppID"} 形式か、1 行ずつ「旧ID → 新ID」で入力してください。' };
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false, error: '参照先変換は {"旧AppID":"新AppID"} 形式のJSONを入力してください。' };
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) pairs.push([key, String(value)]);
  } else {
    for (const [index, line] of trimmed.split(/\r?\n/).entries()) {
      const body = line.trim();
      if (!body || body.startsWith('#')) continue;
      const parts = body.split(LOOKUP_PAIR_SEPARATOR).filter(Boolean);
      if (parts.length !== 2) return { ok: false, error: `参照先変換の ${index + 1} 行目を読み取れません。「旧ID → 新ID」の形式で入力してください。` };
      pairs.push([parts[0], parts[1]]);
    }
  }
  const out: Record<string, string> = Object.create(null);
  for (const [from, to] of pairs) {
    if (!/^[1-9]\d*$/.test(from) || !/^[1-9]\d*$/.test(to)) return { ok: false, error: `参照先変換のアプリIDには正の整数を指定してください（${from} → ${to}）。` };
    if (out[from] !== undefined && out[from] !== to) return { ok: false, error: `参照先変換で旧ID ${from} が複数の変換先（${out[from]}, ${to}）に指定されています。` };
    out[from] = to;
  }
  return { ok: true, value: out, count: Object.keys(out).length };
}

export function lookupMapError(result: LookupMapParseResult): string {
  return 'error' in result ? result.error : '';
}

export function lookupMapValue(result: LookupMapParseResult): Record<string, string> {
  return 'value' in result ? result.value : {};
}

export interface SetupBlockerInput {
  /** reflectConnectionError の結果（空文字なら接続先は有効） */
  connectionError: string;
  sourceMode: 'app' | 'json';
  hasSourceBundle: boolean;
  scopeCount: number;
  lookupError: string;
}

/**
 * 「差分を確認する」へ進めない理由を利用者向けの 1 文で返す。進める場合は空文字。
 * 入力の並び順（反映元 → 反映先 → 項目 → 詳細設定）に合わせて、最初に直すべきものを返す。
 */
export function describeReflectSetupBlocker(input: SetupBlockerInput): string {
  if (input.sourceMode === 'json' && !input.hasSourceBundle) return '比較元の設定JSONを読み込んでください。';
  if (input.connectionError) return input.connectionError;
  if (!input.scopeCount) return '反映する項目を 1 つ以上選んでください。';
  if (input.lookupError) return `詳細設定の参照先変換に誤りがあります。${input.lookupError}`;
  return '';
}

export interface PostApplyCheckInput {
  /** 再確認で比較した項目数 */
  scopeCount: number;
  /** 差分が残っている項目のラベル */
  changedLabels: string[];
  /** 取得に失敗した項目のラベル */
  errorLabels: string[];
}

export interface PostApplyCheckSummary { tone: 'ok' | 'warn'; message: string }

/** 反映後に差分を再取得した結果を、利用者向けの要約にする。 */
export function summarizePostApplyCheck(input: PostApplyCheckInput): PostApplyCheckSummary {
  const list = (labels: string[]) => labels.slice(0, 5).join('、') + (labels.length > 5 ? ` ほか ${labels.length - 5} 件` : '');
  if (input.errorLabels.length) return { tone: 'warn', message: `反映後の再確認：${input.errorLabels.length} 項目を取得できませんでした（${list(input.errorLabels)}）。取得し直して確認してください。` };
  if (input.changedLabels.length) return { tone: 'warn', message: `反映後の再確認：${input.changedLabels.length} 項目に差分が残っています（${list(input.changedLabels)}）。内容を確認して再反映してください。` };
  return { tone: 'ok', message: `反映後の再確認：${input.scopeCount} 項目はすべて反映元と一致しています。本番への公開は比較先の設定画面で行います。` };
}
