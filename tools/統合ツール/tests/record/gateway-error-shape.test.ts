import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost, apiPut, fetchRecordsByQuery } from '../../src/api';
import { kusConfirm } from '../../src/utils';
import { runBatchProcessStandalone, runCsvImportBatchStandalone } from '../../src/tabs/record-standalone';

// レコードの追加・ステータス更新は、応答が届かなかったときに送り直さない。そのうえで、中継装置・ゲートウェイの JSON のエラー
// （要求ID の id、errors の配列など。kintone のエラーコードは無い）を「kintone が拒否した（書き込まれていない）」と取り違えると、
// 反映済みだった塊を「確定済み 0件・未処理 N件」とだけ示し、利用者が再実行して二重に登録してしまう（security/write-rejection-shape.test.ts）。

vi.mock('../../src/api', async original => ({ ...await original<typeof import('../../src/api')>(), apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn(), fetchRecordsByQuery: vi.fn() }));
vi.mock('../../src/utils', async original => ({ ...await original<typeof import('../../src/utils')>(), kusConfirm: vi.fn() }));

const GATEWAY_LIKE_FAILURES: Array<[string, unknown]> = [
  ['a request id only', { id: 'gw-7f3a91', message: 'Service Unavailable' }],
  ['an empty errors array', { errors: [], message: 'Bad Gateway' }],
  ['a JSON:API errors array', { errors: [{ status: '504', title: 'Gateway Timeout' }] }],
  ['a non-kintone code with an id', { code: 'UPSTREAM_ERROR', id: 'edge-1', message: 'Bad Gateway' }]
];

const props = { title: { type: 'SINGLE_LINE_TEXT', label: '件名' } };
const file = (csv: string) => ({ name: 'data.csv', text: vi.fn(async () => csv) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiGet).mockReset().mockResolvedValue({ properties: props });
  vi.mocked(apiPost).mockReset();
  vi.mocked(apiPut).mockReset();
  vi.mocked(kusConfirm).mockReturnValue(true);
});

describe('CSV import: a gateway-like JSON error is reported as unconfirmed, not as a rejected chunk', () => {
  for (const [label, failure] of GATEWAY_LIKE_FAILURES) {
    it(`asks the user to count the records before re-running (${label})`, async () => {
      vi.mocked(apiPost).mockRejectedValueOnce(failure);
      const error: any = await runCsvImportBatchStandalone({ appIdsText: '7', file: file('title\na\nb\n') }, vi.fn()).catch((caught) => caught);
      expect(apiPost).toHaveBeenCalledTimes(1);
      expect(error.message).toContain('kintone に書き込まれたかどうか確認できません');
      expect(error.message).toContain('再実行する前に、kintone 画面で対象アプリのレコード件数を確認してください');
    });
  }
});

describe('status update: a gateway-like JSON error is reported as unconfirmed', () => {
  for (const [label, failure] of GATEWAY_LIKE_FAILURES) {
    it(`asks the user to check the status of the chunk (${label})`, async () => {
      vi.mocked(fetchRecordsByQuery).mockResolvedValue({ records: [{ $id: { type: '__ID__', value: '1' }, $revision: { type: '__REVISION__', value: '3' } }], mode: 'keyset' } as any);
      vi.mocked(apiPut).mockRejectedValueOnce(failure);
      const error: any = await runBatchProcessStandalone({ appId: '7', guestId: '', query: '', action: '承認', assignee: null }, vi.fn()).catch((caught) => caught);
      expect(apiPut).toHaveBeenCalledTimes(1);
      expect(error.message).toContain('kintone に書き込まれたかどうか確認できません');
      expect(error.message).toContain('失敗チャンクのレコードのステータス');
    });
  }
});
