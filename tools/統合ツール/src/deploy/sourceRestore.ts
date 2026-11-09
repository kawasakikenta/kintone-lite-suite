'use strict';

/**
 * 「バックアップから戻す」（本番反映の中で完結する復元）の純粋関数。DOM・API 非依存。
 *
 * 本番反映が保存したバックアップ（反映前の本番、または反映前のプレビュー）を反映元にして、同じアプリを反映先に、
 * 「反映元アプリから本番へ」の段階 1 から差分を確認して戻す。画面（deploy-source-ui.ts / deploy-lite-ui.ts）は、
 * 結果の戻し元の選び方（pick*）と、段階 1 へ設定する内容（prepareSourceRestore）をここから受け取る。
 */

import type { Bundle } from '../api.js';
import { formatReflectDateTime } from '../reflect/applyProgress.js';
import { REFLECT_SECTION_KEYS } from '../reflect/sections.js';
import { pickAllSettingsBundles } from '../settingsBundleImport.js';
import type { SourceDeployGoal, SourceDeployResult } from './sourceTypes.js';
import type { DeployBackupFile, DeployRunResult } from './types.js';

export type SourceRestoreEnvironment = 'production' | 'preview';

/** 戻す内容（バックアップ）と戻すアプリ。 */
export interface SourceRestoreRequest {
  /** バックアップの JSON 本体（メモリ上。本番反映のバックアップ `bundles`、またはプレビューへの書き込み前のバックアップ `bundle`） */
  content: unknown;
  /** 戻すアプリ（反映先） */
  appId: string;
  guestId: string;
  /** バックアップを保存した日時（ISO 8601） */
  generatedAt: string;
  /** production: 反映前の本番（目標は本番まで）。preview: 反映前のプレビュー（目標はプレビューまで） */
  environment: SourceRestoreEnvironment;
}

/** 段階 1 へ設定する内容。 */
export interface SourceRestorePlan {
  /** バックアップに含まれるすべてのアプリの設定（設定JSONの読み込みと同じ形） */
  bundles: Bundle[];
  bundleIndex: number;
  bundle: Bundle;
  /** 反映する項目（バックアップにある反映可能な項目） */
  scopes: string[];
  goal: SourceDeployGoal;
  targetAppId: string;
  targetGuestId: string;
  generatedAt: string;
  environment: SourceRestoreEnvironment;
  /** バックアップが書き込んだ項目を記録しているときのその一覧（アプリを選び直したときの項目の範囲） */
  declaredScopes?: unknown;
}

/** 戻せるか。ok のときは plan、そうでなければ利用者向けの理由（message）。 */
export type SourceRestorePreparation = { ok: true; plan: SourceRestorePlan; message?: undefined } | { ok: false; message: string; plan?: undefined };

/** 本番反映が保存したバックアップ JSON か（kind: 'kintone-deploy-backup'）。 */
export function isDeployBackupFile(value: unknown): value is DeployBackupFile {
  return !!value && typeof value === 'object' && (value as { kind?: unknown }).kind === 'kintone-deploy-backup' && Array.isArray((value as { bundles?: unknown }).bundles);
}

/** バックアップの環境から、戻した後の目標を決める（反映前の本番を戻すなら本番まで、反映前のプレビューを戻すならプレビューまで）。 */
export function restoreGoalFor(environment: SourceRestoreEnvironment): SourceDeployGoal {
  return environment === 'production' ? 'production' : 'preview';
}

/**
 * バックアップのアプリ設定にある、反映できる項目（取得に失敗した項目は除く）。
 * declared があれば（バックアップが書き込んだ項目を記録している場合）、その範囲に絞る。
 */
export function restorableScopes(bundle: Pick<Bundle, 'sections'> | undefined, declared?: unknown): string[] {
  const sections = (bundle?.sections || {}) as Record<string, any>;
  const limit = Array.isArray(declared) ? new Set(declared.map(String)) : null;
  return REFLECT_SECTION_KEYS.filter((key) => {
    if (limit && !limit.has(key)) return false;
    const section = sections[key];
    return Object.prototype.hasOwnProperty.call(sections, key) && !!section && typeof section === 'object' && !section._fetchError;
  });
}

const sameApp = (bundle: Pick<Bundle, 'appId' | 'guestId'>, appId: string, guestId: string) => String(bundle.appId || '') === appId && String(bundle.guestId || '') === guestId;

/** 戻す内容から、段階 1 へ設定する内容を作る。複数アプリのバックアップは、戻すアプリの設定を選ぶ。 */
export function prepareSourceRestore(request: SourceRestoreRequest): SourceRestorePreparation {
  let bundles: Bundle[];
  try {
    bundles = pickAllSettingsBundles(request.content, 'source', true) as Bundle[];
  } catch (error: any) {
    return { ok: false, message: `バックアップを読み込めません。${error?.message || String(error)}` };
  }
  const appId = String(request.appId || ''), guestId = String(request.guestId || '');
  const bundleIndex = bundles.findIndex((bundle) => sameApp(bundle, appId, guestId));
  if (bundleIndex < 0) return { ok: false, message: `バックアップに App ${appId} の設定がありません。` };
  const bundle = bundles[bundleIndex];
  const declared = (request.content as { scopes?: unknown } | null)?.scopes;
  const scopes = restorableScopes(bundle, declared);
  if (!scopes.length) return { ok: false, message: 'バックアップに戻せる内容が見つかりません。' };
  return {
    ok: true,
    plan: { bundles, bundleIndex, bundle, scopes, goal: restoreGoalFor(request.environment), targetAppId: appId, targetGuestId: guestId, generatedAt: request.generatedAt, environment: request.environment, declaredScopes: declared }
  };
}

/** 段階 1 の「設定JSONから取得」で読み込んだ、本番反映のバックアップファイルから作る（最初のアプリを反映先にする）。 */
export function prepareSourceRestoreFromFile(parsed: unknown): SourceRestorePreparation {
  if (!isDeployBackupFile(parsed)) return { ok: false, message: '本番反映のバックアップファイルではありません。' };
  let bundles: Bundle[];
  try {
    bundles = pickAllSettingsBundles(parsed, 'source', true) as Bundle[];
  } catch (error: any) {
    return { ok: false, message: `バックアップを読み込めません。${error?.message || String(error)}` };
  }
  const first = bundles[0];
  if (!first?.appId) return { ok: false, message: 'バックアップにアプリの設定がありません。' };
  const environment: SourceRestoreEnvironment = parsed.environment === 'preview' ? 'preview' : 'production';
  const scopes = restorableScopes(first, parsed.scopes);
  if (!scopes.length) return { ok: false, message: 'バックアップに戻せる内容が見つかりません。' };
  return {
    ok: true,
    plan: { bundles, bundleIndex: 0, bundle: first, scopes, goal: restoreGoalFor(environment), targetAppId: String(first.appId), targetGuestId: String(first.guestId || ''), generatedAt: String(parsed.generatedAt || ''), environment, declaredScopes: parsed.scopes }
  };
}

/** バックアップのアプリを選び直したときの、反映する項目と反映先。 */
export function restoreSelectionFor(plan: Pick<SourceRestorePlan, 'bundles' | 'declaredScopes'>, index: number): { bundle: Bundle; scopes: string[]; targetAppId: string; targetGuestId: string } | null {
  const bundle = plan.bundles[index];
  if (!bundle) return null;
  return { bundle, scopes: restorableScopes(bundle, plan.declaredScopes), targetAppId: String(bundle.appId || ''), targetGuestId: String(bundle.guestId || '') };
}

/** 反映元の表示名（最終確認・記録）。 */
export function restoreSourceLabel(targetName: string, generatedAt: string): string {
  const stamp = generatedAt && !Number.isNaN(new Date(generatedAt).getTime()) ? formatReflectDateTime(new Date(generatedAt)) : '';
  return `反映前のバックアップ（${[targetName, stamp].filter(Boolean).join('・')}）`;
}

/** 「バックアップから戻しています」の表示と注意。 */
export const RESTORE_NOTICE_TITLE = 'バックアップから戻しています';
export const RESTORE_NOTICE_BODY = 'フィールドの削除は行わないため、反映で追加したフィールドは残ります。削除したフィールドの値は戻りません。反映先だけの一覧・グラフ・アクションは保持せず、参照先変換も使いません。';

/**
 * 「反映元アプリから本番へ」の結果から、戻す内容を選ぶ。
 * 本番へ反映した（成功・完了を確認できない）ときは反映前の本番のバックアップ、それ以外は反映先プレビューへの書き込み前のバックアップ。無ければ null。
 */
export function pickSourceRestoreRequest(result: SourceDeployResult, target: { appId: string; guestId: string }): SourceRestoreRequest | null {
  const content = result.deploy?.backup?.content;
  const outcome = result.deploy?.apps.find((app) => app.appId === target.appId && (app.guestId || '') === (target.guestId || ''));
  if (content && outcome && (outcome.status === 'success' || outcome.status === 'unknown')) {
    return { content, appId: target.appId, guestId: target.guestId || '', generatedAt: content.generatedAt, environment: 'production' };
  }
  const apply = result.apply.backup;
  if (apply) return { content: apply, appId: target.appId, guestId: target.guestId || '', generatedAt: apply.generatedAt, environment: 'preview' };
  return null;
}

export interface PublishRestoreOption {
  appId: string;
  guestId: string;
  name: string;
  request: SourceRestoreRequest;
}

/**
 * 「プレビューの変更を公開」の結果から、戻せるアプリを選ぶ（反映・中止が成功した、または完了を確認できないアプリのうち、バックアップに設定があるもの）。
 * 中止の結果のバックアップは中止前のプレビューで、戻した後の目標はプレビューまで。
 */
export function pickPublishRestoreOptions(result: DeployRunResult): PublishRestoreOption[] {
  const content = result.backup?.content;
  if (!content || !Array.isArray(content.bundles)) return [];
  const environment: SourceRestoreEnvironment = content.environment === 'preview' ? 'preview' : 'production';
  const options: PublishRestoreOption[] = [];
  for (const app of result.apps) {
    if (app.status !== 'success' && app.status !== 'unknown') continue;
    if (!content.bundles.some((bundle) => sameApp(bundle, app.appId, app.guestId || ''))) continue;
    options.push({ appId: app.appId, guestId: app.guestId || '', name: app.name, request: { content, appId: app.appId, guestId: app.guestId || '', generatedAt: content.generatedAt, environment } });
  }
  return options;
}
