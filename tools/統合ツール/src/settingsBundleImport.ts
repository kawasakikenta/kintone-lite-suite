'use strict';

import { ensureBundleShape } from './api.js';

export interface SettingsBundlePickOptions {
  side?: 'source' | 'target';
  appId?: string;
}

function unwrapBundleCandidates(raw: any, side?: 'source' | 'target'): any[] {
  if (!raw || typeof raw !== 'object') return [];
  if (raw.source && raw.target) return unwrapBundleCandidates(side === 'target' ? raw.target : raw.source, side);
  if (raw.bundle) return unwrapBundleCandidates(raw.bundle, side);
  if (Array.isArray(raw.apps)) return raw.apps;
  if (Array.isArray(raw.bundles)) return raw.bundles;
  if (raw.sections && raw.appId != null) return [raw];
  return [raw];
}

export function pickSettingsBundle(raw: any, options: SettingsBundlePickOptions = {}) {
  const side = options.side || 'source';
  const appId = String(options.appId || '').trim();
  const candidates = unwrapBundleCandidates(raw, side)
    .map((item) => {
      try { return ensureBundleShape(item); } catch { return null; }
    })
    .filter(Boolean);
  if (!candidates.length) throw new Error('設定JSON内にアプリ設定バンドルが見つかりません');
  if (appId) {
    const matched = candidates.find((b: any) => String(b?.appId || '') === appId);
    if (matched) return matched;
    if (candidates.length > 1) throw new Error(`設定JSON内に App ${appId} のバンドルが見つかりません`);
  }
  return candidates[0];
}

/**
 * 設定JSON（設定一括取得の apps 配列、単体バンドル等）に含まれる全アプリのバンドルを返す。
 * 設計書の複数アプリ一括生成など、1ファイルから複数アプリ分を取り込みたい場合に使う。
 */
export function pickAllSettingsBundles(raw: any, side?: 'source' | 'target') {
  const candidates = unwrapBundleCandidates(raw, side)
    .map((item) => {
      try { return ensureBundleShape(item); } catch { return null; }
    })
    .filter(Boolean);
  if (!candidates.length) throw new Error('設定JSON内にアプリ設定バンドルが見つかりません');
  return candidates;
}

export async function readSettingsBundleFile(file: File, options: SettingsBundlePickOptions = {}) {
  const text = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(String((e.target as FileReader).result || ''));
    reader.onerror = () => reject(new Error('ファイルの読み取りに失敗しました'));
    reader.readAsText(file);
  });
  return pickSettingsBundle(JSON.parse(text), options);
}
