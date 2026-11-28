import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost } from '../../src/api';
import { kusConfirm } from '../../src/utils';
import { isUnconfirmedWriteFailure } from '../../src/tabs/record-query';
import { runCsvImportBatchStandalone } from '../../src/tabs/record-standalone';
import { RunCancelledError } from '../../src/runControl';

// レコードの追加は応答が届かなかったときに自動では送り直さない（二重に登録されるため）。そのうえで、
// 応答が届かなかった失敗を「kintone が拒否した（書き込まれていない）」と取り違えると、「確定済み 0件・未処理 N件」とだけ示し、
// 利用者が再実行して二重に登録してしまう。kintone のエラー応答（id・code・errors）が無い失敗は、形が分からなくても「確認できない」とする。

vi.mock('../../src/api', async original => ({ ...await original<typeof import('../../src/api')>(), apiGet: vi.fn(), apiPost: vi.fn() }));
vi.mock('../../src/utils', async original => ({ ...await original<typeof import('../../src/utils')>(), kusConfirm: vi.fn() }));

const props = { title: { type: 'SINGLE_LINE_TEXT', label: '件名' } };
const file = (csv: string) => ({ name: 'data.csv', text: vi.fn(async () => csv) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiGet).mockReset().mockResolvedValue({ properties: props });
  vi.mocked(kusConfirm).mockReturnValue(true);
});

describe('a record write whose failure has no kintone error response', () => {
  // 中継装置の 502 の HTML や、本文を読めなかった応答など、通信エラーの言葉を含まない失敗
  for (const [label, failure] of [
    ['an HTML body from a gateway', '<html><body>502 Bad Gateway</body></html>'],
    ['an error without a kintone code', new Error('予期しない応答です')],
    ['an empty object', {}]
  ] as const) {
    it(`is reported as unconfirmed, not as a rejected chunk (${label})`, async () => {
      vi.mocked(apiPost).mockRejectedValueOnce(failure);
      const error: any = await runCsvImportBatchStandalone({ appIdsText: '7', file: file('title\na\nb\n') }, vi.fn()).catch((caught) => caught);
      expect(apiPost).toHaveBeenCalledTimes(1);
      expect(error.message).toContain('kintone に書き込まれたかどうか確認できません');
      expect(error.message).toContain('再実行する前に、kintone 画面で対象アプリのレコード件数を確認してください');
    });
  }

  it('keeps a kintone rejection (with code or id) as not written, and a cancellation as not sent', () => {
    expect(isUnconfirmedWriteFailure({ code: 'CB_NO02', message: '権限がありません。' })).toBe(false);
    expect(isUnconfirmedWriteFailure(Object.assign(new Error('入力内容が正しくありません。'), { code: 'CB_VA01' }))).toBe(false);
    expect(isUnconfirmedWriteFailure(new RunCancelledError())).toBe(false);
    expect(isUnconfirmedWriteFailure('<html>502</html>')).toBe(true);
    expect(isUnconfirmedWriteFailure(new Error('予期しない応答です'))).toBe(true);
  });
});
