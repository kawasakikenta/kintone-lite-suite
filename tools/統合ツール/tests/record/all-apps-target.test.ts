import { beforeEach, describe, expect, it, vi } from 'vitest';
import { joinAppIds, PER_APP_CONFIRM_APP_LIMIT, perAppConfirmLimitProblem, recordTargetSummary } from '../../src/entries/recordTargetApps';
import { runCsvImportBatchStandalone } from '../../src/tabs/record-standalone';
import { apiGet, apiPost } from '../../src/api';
import { kusConfirm } from '../../src/utils';

vi.mock('../../src/api', async original => ({ ...await original<typeof import('../../src/api')>(), apiGet: vi.fn(), apiPost: vi.fn() }));
vi.mock('../../src/utils', async original => ({ ...await original<typeof import('../../src/utils')>(), kusConfirm: vi.fn() }));

describe('全アプリを対象にするときの対象アプリ入力と確認画面', () => {
  it('候補のアプリIDをカンマ区切りにし、重複は除いて並びを保つ', () => {
    expect(joinAppIds([{ appId: '3' }, { appId: '1' }, { appId: '3' }, { appId: ' ' }, { appId: '12' }])).toBe('3, 1, 12');
    expect(joinAppIds([])).toBe('');
  });

  it('アプリごとに確認する書き込みは上限を超える指定を止め、上限までは通す', () => {
    const ids = (n: number) => Array.from({ length: n }, (_, i) => String(i + 1)).join(', ');
    expect(perAppConfirmLimitProblem(ids(PER_APP_CONFIRM_APP_LIMIT), 'ステータス更新')).toBe('');
    expect(perAppConfirmLimitProblem(ids(PER_APP_CONFIRM_APP_LIMIT + 1), 'ステータス更新'))
      .toBe(`ステータス更新はアプリごとに確認ダイアログを表示するため、一度に指定できるのは ${PER_APP_CONFIRM_APP_LIMIT} アプリまでです（指定 ${PER_APP_CONFIRM_APP_LIMIT + 1} アプリ）。対象アプリを分けて実行してください。`);
    expect(perAppConfirmLimitProblem('1, x', 'レコードコピー')).toBe('');
  });

  it('1 アプリの確認表示は従来どおり 1 行', () => {
    expect(recordTargetSummary('202', '')).toEqual(['対象アプリ', '#202 · 本番']);
    expect(recordTargetSummary('202', '5')).toEqual(['対象アプリ', '#202（ゲスト 5） · 本番']);
  });

  it('複数アプリは件数と先頭 20 件までを示し、残りは件数にまとめる', () => {
    const ids = Array.from({ length: 3000 }, (_, i) => String(i + 1));
    const [label, value] = recordTargetSummary(joinAppIds(ids.map((appId) => ({ appId }))), '');
    expect(label).toBe('対象アプリ');
    const lines = value.split('\n');
    expect(lines[0]).toBe('3000アプリ');
    expect(lines).toHaveLength(1 + 20 + 1);
    expect(lines[1]).toBe('#1 · 本番');
    expect(lines.at(-1)).toBe('…ほか 2980 件（合計 3000 件）');
  });

  it('20 件以下の複数アプリは省略せずに全部示す', () => {
    const [, value] = recordTargetSummary('1, 2, 3', '7');
    expect(value).toBe('3アプリ\n#1（ゲスト 7） · 本番\n#2（ゲスト 7） · 本番\n#3（ゲスト 7） · 本番');
  });

  it('入力が不正でも例外にせず入力欄の内容をそのまま示す', () => {
    expect(recordTargetSummary('1, abc', '')).toEqual(['対象アプリ', '#1, abc · 本番']);
    expect(recordTargetSummary('', '')).toEqual(['対象アプリ', '#未入力 · 本番']);
  });
});

describe('CSV取込の最終確認は多数のアプリでも長くならない', () => {
  const props = { title: { type: 'SINGLE_LINE_TEXT', label: '件名' } };
  const file = (csv: string) => ({ name: 'data.csv', text: vi.fn(async () => csv) });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiGet).mockReset().mockResolvedValue({ properties: props });
    vi.mocked(apiPost).mockReset().mockResolvedValue({ ids: ['1'], revisions: ['1'] });
    vi.mocked(kusConfirm).mockReturnValue(false);
  });

  it('先頭 20 アプリだけを並べ、アプリ総数は隠さない', async () => {
    const appIdsText = Array.from({ length: 120 }, (_, i) => String(i + 1)).join(', ');
    await runCsvImportBatchStandalone({ appIdsText, guestId: '', file: file('title\nA') }, vi.fn());
    const text = String(vi.mocked(kusConfirm).mock.calls[0][0]);
    expect(text).toContain('CSVから 120アプリの本番レコードへ追加します');
    expect(text).toContain('App 20: 1件');
    expect(text).not.toContain('App 21: ');
    expect(text).toContain('…ほか 100 アプリ（合計 120 アプリ）');
    expect(apiPost).not.toHaveBeenCalled();
  });

  it('20 アプリ以下は従来どおり全部並べる', async () => {
    await runCsvImportBatchStandalone({ appIdsText: '1, 2, 3', guestId: '', file: file('title\nA') }, vi.fn());
    const text = String(vi.mocked(kusConfirm).mock.calls[0][0]);
    expect(text).toContain('App 3: 1件');
    expect(text).not.toContain('…ほか');
  });

  it('事前検査の問題が多いときも、件数を示して先頭 20 アプリだけを載せる', async () => {
    vi.mocked(apiGet).mockRejectedValue(new Error('権限がありません'));
    const appIdsText = Array.from({ length: 45 }, (_, i) => String(i + 1)).join(',');
    await expect(runCsvImportBatchStandalone({ appIdsText, guestId: '', file: file('title\nA') }, vi.fn())).rejects.toThrow(/…ほか 25 アプリ（合計 45 アプリ）の詳細は「CSVを事前検査」で確認できます/);
    expect(kusConfirm).not.toHaveBeenCalled();
  });
});
