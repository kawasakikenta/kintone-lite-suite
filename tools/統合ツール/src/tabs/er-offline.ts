'use strict';

/**
 * 設定取得で保存した設定JSON・ZIP から、kintone に問い合わせずに ER図を作るための読み込み（DOM 非依存。通信しない）。
 * アプリごとの設定のうち、フィールド設定（fieldSettings）・アプリ情報（appInfo）・アクション設定（actionSettings）を使い、
 * kintone から読み取ったときと同じ ER モデル（er-model.ts の buildErAppModel）を作る。
 * 読み込んだ中に無いアプリへの関連は、図では「未取得の参照先」になる。
 */

import { buildErAppModel, buildFailedErAppModel, type ErAppModel } from './er-model.js';
import { pickAllSettingsBundles } from '../settingsBundleImport.js';
import { normalizeIdInputText } from '../utils.js';

export interface ErOfflineSource {
  /** 読み込んだアプリの設定（App ID → 設定。同じ App ID が複数あるときは後のもの） */
  bundles: Map<number, any>;
  /** 読み込んだ順の App ID */
  appIds: number[];
  /** 読み込んだファイルの名前 */
  fileName: string;
  /** 読み込んだ設定の取得日時の範囲（ISO 形式。どの設定にも無ければ空） */
  fetchedAtFrom: string;
  fetchedAtTo: string;
  /** すべてのアプリに共通のゲストスペースID（通常空間・混在のときは空） */
  guestId: string;
  /** すべてのアプリがプレビュー環境の設定なら true（混在・本番は false） */
  preview: boolean;
  /** 接続先の表示（例: 「通常空間 / 本番」「ゲストスペース 5 / プレビュー」「通常空間・ゲストスペースが混在 / 本番」） */
  connectionText: string;
  /** 読み込み時の注意（アプリIDの無い設定・重複など） */
  warnings: string[];
}

const ER_OFFLINE_SECTIONS: Array<[key: string, label: string]> = [
  ['fieldSettings', 'フィールド設定'],
  ['appInfo', 'アプリ情報'],
  ['actionSettings', 'アクション設定']
];

const hasOwn = (record: unknown, key: string): boolean =>
  !!record && typeof record === 'object' && Object.prototype.hasOwnProperty.call(record, key);

/**
 * 設定のゲストスペースID（入力欄と同じく全角数字は半角にする）。数字でなければ止める。
 * 設定JSONの値は入力欄を通らないため、ここで確かめないと、接続先の表示・保存するファイル名・図の Markdown などに別の文字が入る。
 */
function offlineGuestId(bundle: any, appId: number): string {
  const text = normalizeIdInputText(bundle?.guestId ?? '').trim();
  if (text && !/^\d+$/.test(text)) {
    throw new Error(`設定JSONのゲストスペースIDが半角数字ではありません（App ${appId}: ${text.slice(0, 40)}）。設定取得で保存した JSON または ZIP か確認してください`);
  }
  return text;
}

/** 設定JSON（`apps` 配列・単体・`bundles`・差分比較の `{ source, target }` の比較元）・設定取得の ZIP を読んだ値から、ER図の読み込み元を作る。 */
export function buildErOfflineSource(raw: unknown, fileName = ''): ErOfflineSource {
  const candidates = pickAllSettingsBundles(raw, undefined, true, true);
  const bundles = new Map<number, any>();
  const appIds: number[] = [];
  let missingAppId = 0;
  const duplicated: number[] = [];
  const guestIds = new Set<string>();
  const previews = new Set<boolean>();
  const fetchedTimes: number[] = [];
  for (const bundle of candidates) {
    const text = String(bundle?.appId ?? '').trim();
    const appId = /^\d+$/.test(text) ? Number(text) : NaN;
    if (!Number.isSafeInteger(appId) || appId <= 0) { missingAppId += 1; continue; }
    if (bundles.has(appId)) { if (!duplicated.includes(appId)) duplicated.push(appId); }
    else appIds.push(appId);
    bundles.set(appId, bundle);
  }
  for (const appId of appIds) {
    const bundle = bundles.get(appId);
    guestIds.add(offlineGuestId(bundle, appId));
    previews.add(bundle?.preview === true);
    const time = Date.parse(String(bundle?.fetchedAt ?? ''));
    if (Number.isFinite(time)) fetchedTimes.push(time);
  }
  if (!appIds.length) {
    throw new Error('設定JSONにアプリIDのある設定が見つかりません。設定取得で保存した JSON または ZIP か確認してください');
  }
  const warnings: string[] = [];
  if (missingAppId) warnings.push(`アプリIDの無い設定 ${missingAppId}件は読み込めませんでした`);
  if (duplicated.length) warnings.push(`同じアプリIDが複数あったため後の設定を使用しました（App ${duplicated.slice(0, 5).join(', ')}${duplicated.length > 5 ? ` ほか ${duplicated.length - 5} 件` : ''}）`);
  const withoutFields = appIds.filter((appId) => !hasOwn(bundles.get(appId)?.sections, 'fieldSettings'));
  if (withoutFields.length) {
    warnings.push(`${withoutFields.length}アプリの設定にフィールド設定が含まれていないため、それらは「取得失敗」として図に出ます（App ${withoutFields.slice(0, 5).join(', ')}${withoutFields.length > 5 ? ' ほか' : ''}）`);
  }
  const guestId = guestIds.size === 1 ? [...guestIds][0] : '';
  const preview = previews.size === 1 && previews.has(true);
  const spaceText = guestIds.size > 1 ? '通常空間・ゲストスペースが混在' : (guestId ? `ゲストスペース ${guestId}` : '通常空間');
  const envText = previews.size > 1 ? '本番・プレビューが混在' : (preview ? 'プレビュー' : '本番');
  const sorted = fetchedTimes.slice().sort((a, b) => a - b);
  return {
    bundles,
    appIds,
    fileName: String(fileName || ''),
    fetchedAtFrom: sorted.length ? new Date(sorted[0]).toISOString() : '',
    fetchedAtTo: sorted.length ? new Date(sorted[sorted.length - 1]).toISOString() : '',
    guestId,
    preview,
    connectionText: `${spaceText} / ${envText}`,
    warnings
  };
}

/**
 * 読み込んだ設定から 1 アプリの ER モデルを作る。読み込んでいないアプリは null（図では「未取得の参照先」）。
 * 設定に無いセクションは、取得に失敗したときと同じように理由を付けて示す（フィールド設定が無ければ取得失敗、アプリ情報・アクション設定が無ければ一部取得）。
 */
export function buildErModelFromOfflineSource(source: ErOfflineSource, rawAppId: number | string): ErAppModel | null {
  const appId = Number(rawAppId);
  const bundle = source.bundles.get(appId);
  if (!bundle) return null;
  const sections = bundle.sections && typeof bundle.sections === 'object' ? bundle.sections : {};
  const missing = (key: string): string | undefined => {
    if (hasOwn(sections, key)) return undefined;
    const label = ER_OFFLINE_SECTIONS.find(([k]) => k === key)?.[1] || key;
    return `読み込んだ設定JSONに${label}が含まれていません`;
  };
  const sourceGuestId = offlineGuestId(bundle, appId);
  const fieldsMissing = missing('fieldSettings');
  if (fieldsMissing) {
    return buildFailedErAppModel(appId, new Error(`${fieldsMissing}（設定取得で「フィールド設定」を含めて保存してください）`), {
      appInfoResponse: sections.appInfo,
      sourceGuestId
    });
  }
  try {
    return buildErAppModel({
      appId,
      fieldsResponse: sections.fieldSettings,
      appInfoResponse: sections.appInfo,
      actionsResponse: sections.actionSettings,
      appInfoError: missing('appInfo'),
      actionsError: missing('actionSettings'),
      sourceGuestId
    });
  } catch (e) {
    // 想定外の形の設定でも、1 アプリの取得失敗として扱い、図全体は止めない
    return buildFailedErAppModel(appId, e, { appInfoResponse: sections.appInfo, sourceGuestId });
  }
}

/** 読み込んだ設定のうち、アプリ情報のスペースIDが一致するアプリ（「スペースID」で起点を足すときに使う。通信しない）。 */
export function listOfflineSpaceApps(source: ErOfflineSource, spaceId: string): Array<{ appId: string; name: string }> {
  const id = String(spaceId || '').trim();
  if (!id) return [];
  return source.appIds
    .map((appId) => ({ appId, info: source.bundles.get(appId)?.sections?.appInfo }))
    .filter(({ info }) => info && typeof info === 'object' && String(info.spaceId ?? '') === id)
    .map(({ appId, info }) => ({ appId: String(appId), name: typeof info.name === 'string' ? info.name : '' }));
}

/** 取得日時の表示（例: 2026/11/20 10:39、範囲は「2026/11/20 10:39〜2026/11/21 09:00」）。 */
export function describeOfflineFetchedAt(source: Pick<ErOfflineSource, 'fetchedAtFrom' | 'fetchedAtTo'>, format: (date: Date) => string): string {
  if (!source.fetchedAtFrom) return '取得日時不明';
  const from = format(new Date(source.fetchedAtFrom));
  const to = source.fetchedAtTo ? format(new Date(source.fetchedAtTo)) : from;
  return from === to ? from : `${from}〜${to}`;
}
