'use strict';

/**
 * 設定取得の「ZIPで保存」の ZIP（manifest.json と、アプリごとの設定 JSON）を、設定 JSON の読み込みと同じ形にする（DOM 非依存。通信しない）。
 * manifest.json の apps[].file にあるファイルを、その順に読む。manifest.json が無い ZIP は、`sections` を持つ JSON をすべて読む。
 * JS/CSS ファイル本体（customizeFiles のフォルダ）などの JSON 以外は読まない。
 */

import { readZipEntries } from './archive/zip-read.js';

export interface SettingsZipImport {
  /** 設定 JSON の読み込みと同じ形（pickAllSettingsBundles にそのまま渡せる） */
  raw: { bundles: any[] };
  /** 読み込んだ設定 JSON の ZIP 内のパス */
  files: string[];
  /** 利用者へ示す注意（manifest にあるのに ZIP に無いファイルなど） */
  warnings: string[];
}

const isBundle = (value: any) => !!value && typeof value === 'object' && !Array.isArray(value) && !!value.sections && typeof value.sections === 'object';

export async function readSettingsZip(bytes: Uint8Array): Promise<SettingsZipImport> {
  const entries = await readZipEntries(bytes, { include: (name) => /\.json$/i.test(name) });
  const decoder = new TextDecoder('utf-8');
  const jsonByName = new Map(entries.filter((entry) => !entry.name.endsWith('/')).map((entry) => [entry.name, entry.data]));
  const parse = (name: string): any => {
    try { return JSON.parse(decoder.decode(jsonByName.get(name)!)); }
    catch { throw new Error(`ZIP 内の「${name}」を JSON として読み込めません`); }
  };
  const warnings: string[] = [];
  const bundles: any[] = [];
  const files: string[] = [];
  const manifest = jsonByName.has('manifest.json') ? parse('manifest.json') : null;
  const listed = Array.isArray(manifest?.apps) ? manifest.apps.map((app: any) => String(app?.file || '')).filter(Boolean) : [];
  if (listed.length) {
    const missing: string[] = [];
    for (const name of listed) {
      if (!jsonByName.has(name)) { missing.push(name); continue; }
      const bundle = parse(name);
      if (!isBundle(bundle)) { missing.push(name); continue; }
      bundles.push(bundle);
      files.push(name);
    }
    if (missing.length) warnings.push(`manifest.json にある ${missing.length} 件の設定JSONを ZIP から読み込めませんでした（${missing.slice(0, 3).join('、')}${missing.length > 3 ? ' ほか' : ''}）`);
  } else {
    for (const name of [...jsonByName.keys()].filter((key) => key !== 'manifest.json').sort()) {
      const value = parse(name);
      if (isBundle(value)) { bundles.push(value); files.push(name); }
    }
  }
  if (!bundles.length) throw new Error('ZIP 内に設定JSONが見つかりません。設定取得の「設定をZIPで保存」で保存した ZIP か確認してください');
  return { raw: { bundles }, files, warnings };
}
