'use strict';

import { ensureBundleShape, pickBundleSections } from './api.js';

export interface SettingsBundlePickOptions {
  rawSettings?: boolean;
  /** 設計書の原文出力で、取得日時欠落や未知の bundle metadata を保持する。既定は従来互換。 */
  preserveMetadata?: boolean;
  side?: 'source' | 'target';
  appId?: string;
  sections?: readonly string[];
}

function preserveImportedMetadata(bundle: any, raw: any, preserve: boolean): any {
  if (!preserve || !bundle || !raw || typeof raw !== 'object') return bundle;
  // ensureBundleShape は欠落した fetchedAt を現在時刻で補完するため、原文出力では
  // 欠落を null のまま残し「いま取得した」と誤認させない。
  bundle.fetchedAt = Object.prototype.hasOwnProperty.call(raw, 'fetchedAt') ? raw.fetchedAt : null;
  // guestId / preview も ensureBundleShape の既定値をそのまま残すと、入力に無い
  // 接続先や取得環境を「通常空間 / 本番」と誤表示する。明示された false や空文字は保持し、
  // 欠落時だけキーを削除して未知として扱えるようにする。
  if (Object.prototype.hasOwnProperty.call(raw, 'guestId')) bundle.guestId = raw.guestId;
  else delete bundle.guestId;
  if (Object.prototype.hasOwnProperty.call(raw, 'preview')) bundle.preview = raw.preview;
  else delete bundle.preview;
  if (raw.meta && typeof raw.meta === 'object' && !Array.isArray(raw.meta)) {
    bundle.meta = {
      ...raw.meta,
      sectionRevisions: bundle.meta?.sectionRevisions || {}
    };
  }
  return bundle;
}

function limitImportedBundleToSections(bundle: any, sections?: readonly string[], raw?: any, preserveMetadata = false) {
  if (!Array.isArray(sections) || !sections.length) return preserveImportedMetadata(bundle, raw, preserveMetadata);
  const sourceSections = bundle?.sections || {};
  const picked = pickBundleSections(bundle, sections);
  sections.forEach((sectionKey) => {
    if (Object.prototype.hasOwnProperty.call(sourceSections, sectionKey)) return;
    picked.sections[sectionKey] = {
      _fetchError: '読み込んだ設定JSONに比較対象セクションが含まれていません'
    };
  });
  return preserveImportedMetadata(picked, raw, preserveMetadata);
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
      try { return { bundle: ensureBundleShape(item, options.rawSettings), raw: item }; } catch { return null; }
    })
    .filter(Boolean);
  if (!candidates.length) throw new Error('設定JSON内にアプリ設定バンドルが見つかりません');
  if (appId) {
    const matched = candidates.find((entry: any) => String(entry?.bundle?.appId || '') === appId);
    if (matched) return limitImportedBundleToSections(matched.bundle, options.sections, matched.raw, !!options.preserveMetadata);
    throw new Error(`設定JSON内に App ${appId} のバンドルが見つかりません`);
  }
  return limitImportedBundleToSections((candidates[0] as any).bundle, options.sections, (candidates[0] as any).raw, !!options.preserveMetadata);
}

/**
 * 設定JSON（設定一括取得の apps 配列、単体バンドル等）に含まれる全アプリのバンドルを返す。
 * 設計書の複数アプリ一括生成など、1ファイルから複数アプリ分を取り込みたい場合に使う。
 */
export function pickAllSettingsBundles(raw: any, side?: 'source' | 'target', rawSettings = false, preserveMetadata = false) {
  const candidates = unwrapBundleCandidates(raw, side)
    .map((item) => {
      try { return preserveImportedMetadata(ensureBundleShape(item, rawSettings), item, preserveMetadata); } catch { return null; }
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
