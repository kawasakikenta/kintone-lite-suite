import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiPost } from '../../src/api';

describe('apiPost retry count', () => {
  const network = () => Object.assign(new Error('Network Error'), { code: 'NETWORK' });

  beforeEach(() => {
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: any) => { fn(); return 0 as any; }) as any);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as any).kintone;
  });

  it('retries a communication failure by default', async () => {
    const api = vi.fn().mockRejectedValueOnce(network()).mockResolvedValueOnce({ ids: ['1'] });
    (globalThis as any).kintone = { api };
    await expect(apiPost('/k/v1', '/records.json', { app: '7', records: [{}] })).resolves.toEqual({ ids: ['1'] });
    expect(api).toHaveBeenCalledTimes(2);
  });

  it('sends a record addition only once when the caller passes 1 (a lost response must not create the records twice)', async () => {
    const api = vi.fn().mockRejectedValue(network());
    (globalThis as any).kintone = { api };
    await expect(apiPost('/k/v1', '/records.json', { app: '7', records: [{}] }, 1)).rejects.toThrow(/Network Error/);
    expect(api).toHaveBeenCalledTimes(1);
  });
});
