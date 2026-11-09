'use strict';

/**
 * 反映前のバックアップ（DOM 非依存の組み立てと、ブラウザのダウンロード）。
 * deploy は反映前の本番、revert は中止前のプレビューを保存する。プレビュー反映の「設定JSONから取得」でそのまま読み込める（bundles 配列）。
 */

import { embedCustomizeFileContents } from '../reflect/customizeFiles.js';
import { deepClone } from '../utils.js';
import type { Bundle } from '../api.js';
import type { DeployAppInspection, DeployBackupFile, DeployMode } from './types.js';

export interface DeployBackupBuild {
  file: DeployBackupFile;
  /** 本体を保存できなかった JS/CSS ファイルのうち、反映後も設定に残るもの */
  unavailableFiles: Array<{ appId: string; name: string; reason: string }>;
  /** 本体を保存できなかった JS/CSS ファイルのうち、反映で設定から外れるもの（元に戻せなくなるため、反映してはならない） */
  lostFiles: Array<{ appId: string; name: string; reason: string }>;
}

/** バンドルの JS/CSS 設定にある FILE 項目の fileKey。 */
function customizeFileKeys(bundle: Bundle | undefined): Set<string> {
  const keys = new Set<string>();
  const section = bundle?.sections?.customizeSettings;
  for (const platform of ['desktop', 'mobile']) for (const kind of ['js', 'css']) {
    const list = section?.[platform]?.[kind];
    if (!Array.isArray(list)) continue;
    for (const item of list) if (item?.type === 'FILE' && typeof item.file?.fileKey === 'string' && item.file.fileKey) keys.add(item.file.fileKey);
  }
  return keys;
}

/**
 * バックアップの内容を組み立てる。JS/CSS 設定に変更があるアプリは、ファイル本体を埋め込む。
 * 反映で設定から外れる（deploy: 本番にあってプレビューに同じ fileKey が無い / revert: その逆）ファイルは lostFiles に分ける。
 */
export async function buildDeployBackup(opts: { mode: DeployMode; targets: DeployAppInspection[]; onProgress?: (done: number, total: number) => void }): Promise<DeployBackupBuild> {
  const deploy = opts.mode === 'deploy';
  const bundles: Bundle[] = [];
  const unavailableFiles: DeployBackupBuild['unavailableFiles'] = [];
  const lostFiles: DeployBackupBuild['lostFiles'] = [];
  let done = 0;
  for (const target of opts.targets) {
    const source = deploy ? target.productionBundle : target.previewBundle;
    const other = deploy ? target.previewBundle : target.productionBundle;
    if (!source) throw new Error(`App ${target.appId} のバックアップ元の設定がありません。`);
    let bundle: Bundle = deepClone(source);
    const customizeChanged = target.sections.some(section => section.sectionKey === 'customizeSettings' && section.status === 'change');
    if (customizeChanged && bundle.sections?.customizeSettings && typeof bundle.sections.customizeSettings === 'object') {
      const embedded = await embedCustomizeFileContents(bundle.sections.customizeSettings, { guestId: target.guestId });
      bundle = { ...bundle, sections: { ...bundle.sections, customizeSettings: embedded.section } };
      const kept = customizeFileKeys(other);
      for (const item of embedded.unavailable) {
        (kept.has(item.fileKey) ? unavailableFiles : lostFiles).push({ appId: target.appId, name: item.name, reason: item.reason });
      }
    }
    bundles.push(bundle);
    done += 1;
    opts.onProgress?.(done, opts.targets.length);
  }
  const scopes = [...new Set(bundles.flatMap(bundle => Object.keys(bundle.sections || {})))];
  return {
    file: { kind: 'kintone-deploy-backup', version: 1, generatedAt: new Date().toISOString(), mode: opts.mode, environment: deploy ? 'production' : 'preview', scopes, bundles },
    unavailableFiles,
    lostFiles
  };
}

/** 既定のバックアップの保存: ブラウザのダウンロードを開始する。 */
export function downloadBackupFile(fileName: string, json: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
