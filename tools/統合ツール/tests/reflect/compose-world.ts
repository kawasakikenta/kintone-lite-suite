import { vi } from 'vitest';
import { createFakeKintone, makeApp, type FakeApp, type FakeOptions } from '../deploy/fake-kintone';
import { previewReflectStandalone, type ReflectOptions } from '../../src/tabs/reflect-standalone';

export const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const text = (code: string, extra: Record<string, any> = {}) => ({ type: 'SINGLE_LINE_TEXT', code, label: code, required: false, ...extra });
const row = (...codes: string[]) => ({ type: 'ROW', fields: codes.map(code => ({ type: 'SINGLE_LINE_TEXT', code, size: { width: '200' } })) });

/** 反映元（開発用アプリ 1）と反映先（アプリ 2）。反映先は本番とプレビューが同じ（未公開の変更なし）。 */
export function makeWorld(options: FakeOptions = {}, mutate?: (apps: Record<string, FakeApp>) => void) {
  const apps: Record<string, FakeApp> = {
    '1': makeApp({
      name: '開発用', prodRevision: '5', previewRevision: '5',
      production: {
        fieldSettings: { properties: { name: text('name', { label: '顧客名（新）', required: true }), added: text('added', { label: '追加項目' }) } },
        layoutSettings: { layout: [row('name'), row('added')] },
        viewSettings: { views: { List: { type: 'LIST', fields: ['name', 'added'], filterCond: 'name != ""', sort: '', index: '0' } } },
        appSettings: { theme: 'RED', enableComments: true }
      }
    }),
    '2': makeApp({
      name: '本番用', prodRevision: '10', previewRevision: '10',
      production: {
        fieldSettings: { properties: { name: text('name', { label: '顧客名' }) } },
        layoutSettings: { layout: [row('name')] },
        viewSettings: { views: {} },
        appSettings: { theme: 'WHITE', enableComments: false }
      }
    })
  };
  apps['2'].preview = copy(apps['2'].production);
  mutate?.(apps);
  const env = createFakeKintone(apps, options);
  vi.stubGlobal('kintone', { api: env.api });
  const reflect: ReflectOptions = { sourceAppId: '1', targetAppId: '2', scopes: ['fieldSettings', 'layoutSettings', 'viewSettings', 'appSettings'] };
  return {
    apps, env, reflect,
    preview: (extra: Partial<ReflectOptions> = {}) => previewReflectStandalone({ ...reflect, ...extra }, () => {}),
    writes: () => env.writes()
  };
}
