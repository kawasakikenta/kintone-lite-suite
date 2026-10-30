/**
 * 差分比較の 1対多で「環境内の全アプリ」を比較先へ一括設定するときの純粋ヘルパー。
 * DOM に触れないため、追加対象の選別・件数の数え方・メッセージを単体テストできる。
 */

/** 1対多比較で、HTML を比較先ごとに自動保存してよい最大件数。超えると自動保存はせず理由を表示する。 */
export const MULTI_AUTO_HTML_MAX_TARGETS = 10;

/** 比較先がこの件数を超えたら、時間とメモリの目安を利用者へ示す。 */
export const MULTI_LARGE_TARGET_THRESHOLD = 100;

export interface MultiTargetCandidate {
  appId: string;
  appName?: string;
}

export interface MultiTargetKey {
  appId: string;
  guestId: string;
}

export interface MultiTargetSource {
  appId: string;
  guestId: string;
  preview: boolean;
}

export interface MultiTargetFillPlan {
  /** 新たに比較先へ入れるアプリ（入力順・重複なし） */
  add: Array<{ appId: string; appName: string }>;
  /** 同じアプリID・ゲストスペースIDの行が既にあった、または候補内で重複していた件数 */
  alreadyPresent: number;
  /** 比較元と同じ接続先のため外した件数（0 か 1） */
  skippedSelf: number;
  /** アプリIDが正の整数でないため外した件数 */
  invalid: number;
}

const POSITIVE_INT = /^[1-9]\d*$/;

/**
 * 比較先へ追加する候補を選別する。
 * - 既存の行（appId + guestId が同じ）と候補内の重複は追加しない
 * - 比較元と同じアプリID・ゲストスペースIDで、比較元と比較先の環境（本番/プレビュー）が同じなら外す
 *   （同じ接続先どうしの比較になるため）。環境が違う場合は意味のある比較なので外さない
 */
export function planMultiTargetFill(options: {
  candidates: MultiTargetCandidate[];
  guestId: string;
  existing: MultiTargetKey[];
  source?: MultiTargetSource | null;
  targetPreview: boolean;
}): MultiTargetFillPlan {
  const guestId = String(options.guestId || '').trim();
  const seen = new Set<string>();
  options.existing.forEach((entry) => {
    const appId = String(entry.appId || '').trim();
    if (appId) seen.add(`${appId}::${String(entry.guestId || '').trim()}`);
  });
  const source = options.source;
  const sourceAppId = String(source?.appId || '').trim();
  const selfIsSameEndpoint = !!source && !!sourceAppId
    && String(source.guestId || '').trim() === guestId
    && !!source.preview === !!options.targetPreview;
  const plan: MultiTargetFillPlan = { add: [], alreadyPresent: 0, skippedSelf: 0, invalid: 0 };
  options.candidates.forEach((candidate) => {
    const appId = String(candidate.appId || '').trim();
    if (!POSITIVE_INT.test(appId)) { plan.invalid += 1; return; }
    if (selfIsSameEndpoint && appId === sourceAppId) { plan.skippedSelf += 1; return; }
    const key = `${appId}::${guestId}`;
    if (seen.has(key)) { plan.alreadyPresent += 1; return; }
    seen.add(key);
    plan.add.push({ appId, appName: String(candidate.appName || '').trim() });
  });
  return plan;
}

/** 一括設定の結果メッセージ。追加・既存・除外の件数を隠さず示す。 */
export function describeMultiTargetFill(plan: MultiTargetFillPlan, totalTargets: number, guestId = ''): string {
  const where = guestId ? `（ゲストスペース ${guestId}）` : '';
  if (!plan.add.length && !plan.alreadyPresent && !plan.skippedSelf && !plan.invalid) {
    return `比較先に設定できるアプリがありません${where}`;
  }
  const parts = [
    `比較先へ ${plan.add.length} 件を追加しました${where}`,
    plan.alreadyPresent ? `設定済みのため ${plan.alreadyPresent} 件は追加していません` : '',
    plan.skippedSelf ? `比較元と同じ接続先のため ${plan.skippedSelf} 件を除きました` : '',
    plan.invalid ? `アプリIDを読み取れない ${plan.invalid} 件を除きました` : ''
  ].filter(Boolean);
  return `${parts.join('。')}。比較先は合計 ${totalTargets} 件です`;
}

/** 比較先が多いときに、実行前後に示す時間とメモリの注意。少なければ空文字。 */
export function multiTargetScaleNote(targetCount: number): string {
  if (targetCount <= MULTI_LARGE_TARGET_THRESHOLD) return '';
  return `比較先が ${targetCount} 件あります。1 件ずつ順に取得するため時間がかかり、結果はこのページのメモリに保持します。「中止」で止められます`;
}

/** 比較が終わった後、大量の結果を保持していることを知らせる注意。少なければ空文字。 */
export function multiRetainNote(resultCount: number): string {
  if (resultCount <= MULTI_LARGE_TARGET_THRESHOLD) return '';
  return `${resultCount}件分の比較結果をメモリに保持しています。保存が済んだらページを再読み込みすると解放できます`;
}

export interface MultiAutoHtmlPlan {
  /** 比較先ごとの HTML 自動保存を行うか */
  enabled: boolean;
  /** 件数が多いため、オンのまま自動保存を行わない場合 true */
  suppressedByCount: boolean;
  /** 利用者へ示す理由（suppressedByCount のときだけ） */
  note: string;
}

/**
 * 1対多の HTML 自動保存は比較先ごとに 1 ファイルをダウンロードする。
 * 件数が多いとブラウザの複数ダウンロード確認やダウンロード欄の氾濫を招くため、上限を超えたら自動保存しない。
 */
export function planMultiAutoHtml(targetCount: number, checked: boolean): MultiAutoHtmlPlan {
  if (!checked) return { enabled: false, suppressedByCount: false, note: '' };
  if (targetCount > MULTI_AUTO_HTML_MAX_TARGETS) {
    return {
      enabled: false,
      suppressedByCount: true,
      note: `比較先が ${targetCount} 件（自動保存は ${MULTI_AUTO_HTML_MAX_TARGETS} 件まで）のため、HTMLは自動保存しませんでした。結果表の各行、またはExcelの一括保存から必要な分を保存してください`
    };
  }
  return { enabled: true, suppressedByCount: false, note: '' };
}
