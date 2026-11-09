import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEPLOY_APPS_PER_REQUEST,
  apiDelete,
  apiPost,
  apiPut,
  assertAllowsMutatingRestCall,
  fetchAppDeployStatus,
  isRevisionConflictError,
  requestAppDeploy
} from '../../src/api';
import { RunCancelledError, __resetRunControlForTests, activeRun, beginRun, requestCancel } from '../../src/runControl';

// アプリの更新（deploy.json）は本番反映ツール専用の例外。requestAppDeploy 以外の経路では従来どおり拒否される。

afterEach(() => {
  __resetRunControlForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const stubApi = (impl: (...args: any[]) => any = async () => ({})) => {
  const api = vi.fn(impl);
  vi.stubGlobal('kintone', { api });
  return api;
};

describe('assertAllowsMutatingRestCall の deploy 例外', () => {
  it('既定では deploy.json への書き込みをすべて拒否する', () => {
    for (const prefix of ['/k/v1', '/k/v1/preview', '/k/guest/3/v1/preview']) {
      for (const method of ['POST', 'PUT', 'DELETE']) {
        expect(() => assertAllowsMutatingRestCall(prefix, '/app/deploy.json', method)).toThrow(/デプロイ/);
      }
    }
    expect(() => assertAllowsMutatingRestCall('/k/v1/preview', '/app/deploy.json', 'POST', {})).toThrow(/デプロイ/);
    expect(() => assertAllowsMutatingRestCall('/k/v1/preview', '/app/deploy.json', 'POST', { allowAppDeploy: false })).toThrow(/デプロイ/);
  });

  it('allowAppDeploy は、パスが完全一致・POST・プレビュー prefix のときだけ許可する', () => {
    expect(() => assertAllowsMutatingRestCall('/k/v1/preview', '/app/deploy.json', 'POST', { allowAppDeploy: true })).not.toThrow();
    expect(() => assertAllowsMutatingRestCall('/k/guest/3/v1/preview', '/app/deploy.json', 'post', { allowAppDeploy: true })).not.toThrow();
    // 本番 prefix・PUT/DELETE は許可しない
    expect(() => assertAllowsMutatingRestCall('/k/v1', '/app/deploy.json', 'POST', { allowAppDeploy: true })).toThrow(/デプロイ/);
    expect(() => assertAllowsMutatingRestCall('/k/guest/3/v1', '/app/deploy.json', 'POST', { allowAppDeploy: true })).toThrow(/デプロイ/);
    expect(() => assertAllowsMutatingRestCall('/k/v1/preview', '/app/deploy.json', 'PUT', { allowAppDeploy: true })).toThrow(/デプロイ/);
    expect(() => assertAllowsMutatingRestCall('/k/v1/preview', '/app/deploy.json', 'DELETE', { allowAppDeploy: true })).toThrow(/デプロイ/);
    // パスが少しでも違えば許可しない
    for (const path of ['/k/v1/preview/app/deploy.json', '/app/deploy.json?x=1', 'app/deploy.json', '/app/deploy.json/', '/foo/app/deploy.json', '\\app\\deploy.json', '/app/deploy.json#/file.json']) {
      expect(() => assertAllowsMutatingRestCall('/k/v1/preview', path, 'POST', { allowAppDeploy: true })).toThrow(/デプロイ/);
    }
  });

  it('deploy 例外は他のパスの本番書き込みを許可しない', () => {
    expect(() => assertAllowsMutatingRestCall('/k/v1', '/app/customize.json', 'POST', { allowAppDeploy: true })).toThrow(/本番API/);
    expect(() => assertAllowsMutatingRestCall('/k/v1', '/app/form/fields.json', 'PUT', { allowAppDeploy: true })).toThrow(/本番API/);
  });

  it('apiPost / apiPut / apiDelete からの deploy.json は従来どおり拒否し、kintone.api を呼ばない', async () => {
    const api = stubApi();
    await expect(apiPost('/k/v1/preview', '/app/deploy.json', { apps: [{ app: '1' }] })).rejects.toThrow(/デプロイ/);
    await expect(apiPut('/k/v1/preview', '/app/deploy.json', { apps: [{ app: '1' }] })).rejects.toThrow(/デプロイ/);
    await expect(apiPost('/k/v1', '/app/deploy.json', { apps: [{ app: '1' }] })).rejects.toThrow(/デプロイ/);
    await expect(apiDelete('/k/v1/preview', '/app/deploy.json', { apps: [{ app: '1' }] })).rejects.toThrow(/デプロイ/);
    expect(api).not.toHaveBeenCalled();
  });
});

describe('requestAppDeploy', () => {
  it('プレビュー prefix の deploy.json へ 1 回だけ POST し、revision を添える', async () => {
    const api = stubApi();
    await requestAppDeploy('', [{ app: '1', revision: '12' }, { app: '2' }], false);
    expect(api).toHaveBeenCalledTimes(1);
    expect(api).toHaveBeenCalledWith('/k/v1/preview/app/deploy.json', 'POST', { apps: [{ app: '1', revision: '12' }, { app: '2' }] });
  });

  it('ゲストスペースは guest 付きの URL へ送り、revert のときは revert: true を付ける', async () => {
    const api = stubApi();
    await requestAppDeploy('7', [{ app: '5', revision: '3' }], true);
    expect(api).toHaveBeenCalledWith('/k/guest/7/v1/preview/app/deploy.json', 'POST', { apps: [{ app: '5', revision: '3' }], revert: true });
  });

  it('300 件まで受け付け、301 件・空・不正なID・重複・不正な revision は送信前に拒否する', async () => {
    const api = stubApi();
    const many = (count: number) => Array.from({ length: count }, (_, index) => ({ app: String(index + 1) }));
    await requestAppDeploy('', many(DEPLOY_APPS_PER_REQUEST), false);
    expect(api).toHaveBeenCalledTimes(1);
    api.mockClear();
    await expect(requestAppDeploy('', many(DEPLOY_APPS_PER_REQUEST + 1), false)).rejects.toThrow(/300/);
    await expect(requestAppDeploy('', [], false)).rejects.toThrow(/指定されていません/);
    await expect(requestAppDeploy('', [{ app: 'abc' }], false)).rejects.toThrow(/アプリID/);
    await expect(requestAppDeploy('', [{ app: '0' }], false)).rejects.toThrow(/アプリID/);
    await expect(requestAppDeploy('', [{ app: '1' }, { app: '1' }], false)).rejects.toThrow(/重複/);
    await expect(requestAppDeploy('', [{ app: '1', revision: 'x' }], false)).rejects.toThrow(/revision/);
    await expect(requestAppDeploy('', [{ app: '1', revision: '' }], false)).rejects.toThrow(/revision/);
    await expect(requestAppDeploy('../x', [{ app: '1' }], false)).rejects.toThrow(/ゲストスペースID/);
    expect(api).not.toHaveBeenCalled();
  });

  it('5xx やネットワークの失敗でも再送しない', async () => {
    vi.useFakeTimers();
    const api = stubApi(async () => { throw Object.assign(new Error('HTTP status 503'), { status: 503 }); });
    await expect(requestAppDeploy('', [{ app: '1' }], false)).rejects.toThrow(/503/);
    await vi.runAllTimersAsync();
    expect(api).toHaveBeenCalledTimes(1);
    api.mockRejectedValue(new Error('network error'));
    await expect(requestAppDeploy('', [{ app: '1' }], false)).rejects.toThrow(/network/);
    expect(api).toHaveBeenCalledTimes(2);
  });

  it('revision 競合は利用者向けの説明を付け、競合として判定できる', async () => {
    stubApi(async () => { throw Object.assign(new Error('リビジョンが最新ではありません'), { code: 'GAIA_CO02' }); });
    const error: any = await requestAppDeploy('', [{ app: '1', revision: '5' }], false).catch(e => e);
    expect(isRevisionConflictError(error)).toBe(true);
    expect(error.revisionConflict).toBe(true);
    expect(error.message).toContain('本番への反映は取得後に別の更新が入ったため中止しました');
    const revertError: any = await requestAppDeploy('', [{ app: '1', revision: '5' }], true).catch(e => e);
    expect(revertError.message).toContain('変更の中止は取得後に別の更新が入った');
  });

  it('その他の失敗は通信の情報（[API] の行）付きで投げる', async () => {
    stubApi(async () => { throw Object.assign(new Error('権限がありません'), { code: 'CB_NO02' }); });
    const error: any = await requestAppDeploy('', [{ app: '1' }, { app: '2' }], false).catch(e => e);
    expect(error.message).toContain('権限がありません');
    expect(error.message).toContain('[API] POST /k/v1/preview/app/deploy.json app=1');
    expect(error.code).toBe('CB_NO02');
  });

  it('中止要求後は送信せず RunCancelledError を投げ、送信した書き込みを記録する', async () => {
    const api = stubApi();
    beginRun();
    await requestAppDeploy('', [{ app: '1' }], false);
    expect(activeRun()?.writes).toBe(1);
    requestCancel();
    await expect(requestAppDeploy('', [{ app: '2' }], false)).rejects.toBeInstanceOf(RunCancelledError);
    expect(api).toHaveBeenCalledTimes(1);
    expect(activeRun()?.writes).toBe(1);
  });
});

describe('fetchAppDeployStatus', () => {
  it('プレビュー prefix の deploy.json を GET し、状態を返す', async () => {
    const api = stubApi(async () => ({ apps: [{ app: '1', status: 'PROCESSING' }, { app: 2, status: 'SUCCESS' }] }));
    await expect(fetchAppDeployStatus('4', ['1', '2'])).resolves.toEqual([{ app: '1', status: 'PROCESSING' }, { app: '2', status: 'SUCCESS' }]);
    expect(api).toHaveBeenCalledWith('/k/guest/4/v1/preview/app/deploy.json', 'GET', { apps: ['1', '2'] });
  });

  it('応答の形式が不正なら例外を投げる', async () => {
    stubApi(async () => ({}));
    await expect(fetchAppDeployStatus('', ['1'])).rejects.toThrow(/応答形式/);
    stubApi(async () => ({ apps: [{ app: '1' }] }));
    await expect(fetchAppDeployStatus('', ['1'])).rejects.toThrow(/応答形式/);
    stubApi(async () => ({ apps: 'x' }));
    await expect(fetchAppDeployStatus('', ['1'])).rejects.toThrow(/応答形式/);
  });

  it('301 件以上・不正なIDは問い合わせず拒否し、空の指定は何も問い合わせない', async () => {
    const api = stubApi();
    await expect(fetchAppDeployStatus('', Array.from({ length: 301 }, (_, index) => String(index + 1)))).rejects.toThrow(/300/);
    await expect(fetchAppDeployStatus('', ['x'])).rejects.toThrow(/アプリID/);
    await expect(fetchAppDeployStatus('', [])).resolves.toEqual([]);
    expect(api).not.toHaveBeenCalled();
  });
});
