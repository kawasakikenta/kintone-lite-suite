import { describe, expect, it } from 'vitest';
import { buildReflectSectionPlan } from '../../src/reflect/standalonePlan';
import { resolveCustomizeFiles } from '../../src/reflect/customizeFiles';

const file = (key: string, name: string) => ({ type: 'FILE', file: { fileKey: key, name, contentType: 'text/javascript', size: '10' } });
const section = (js: any[]) => ({ revision: '5', scope: 'ALL', desktop: { js, css: [] }, mobile: { js: [], css: [] } });
const download = (bodies: Record<string, string>) => async (_guestId: string, fileKey: string) => new Blob([bodies[fileKey]], { type: 'text/javascript' });

describe('変更の要約は、内訳と同じ比較形を使う', () => {
  it('JS/CSS はファイル名で要約し、内容が同じなら変更として数えない', async () => {
    const source = section([file('src-a', 'common.js'), file('src-b', 'added.js')]);
    const target = section([file('tgt-a', 'common.js')]);
    const customizeFiles = await resolveCustomizeFiles(source, target, { sourceGuestId: '', targetGuestId: '', download: download({ 'src-a': 'same', 'src-b': 'new', 'tgt-a': 'same' }) });
    const plan = buildReflectSectionPlan('customizeSettings', source, target, { customizeFiles });
    expect(plan.status).toBe('change');
    expect(plan.items?.map(item => [item.kind, item.name])).toEqual([['追加', 'PC JS / added.js']]);
    expect(JSON.stringify(plan.items)).not.toContain('src-b');
  });
  it('一般設定にも要約を付ける', () => {
    const plan = buildReflectSectionPlan('appSettings', { theme: 'RED', enableComments: false }, { theme: 'WHITE', enableComments: true });
    expect(plan.items?.map(item => item.name)).toEqual(expect.arrayContaining(['テーマ', 'コメント機能']));
  });
});
