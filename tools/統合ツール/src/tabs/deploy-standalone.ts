'use strict';

/**
 * 本番反映ツールのエンジン（仮実装）。取り決めは deploy/types.ts を参照。
 * 実装担当が置き換える。署名（関数名・引数・戻り値）は変えない。
 */

import type { DeployAppRef, DeployBatchMode, DeployInspectOptions, DeployInspectResult, DeployRunOptions, DeployRunResult } from '../deploy/types.js';

/** 入力された対象アプリの問題（未入力・重複・形式・まとめて反映の条件）を利用者向けの 1 文で返す。問題が無ければ空文字。 */
export function validateDeployTargets(targets: DeployAppRef[], batchMode: DeployBatchMode): string {
  void targets; void batchMode;
  throw new Error('validateDeployTargets は未実装です');
}

/** 本番とプレビューの差分を確認する（書き込みなし）。 */
export async function inspectDeployTargetsStandalone(opts: DeployInspectOptions): Promise<DeployInspectResult> {
  void opts;
  throw new Error('inspectDeployTargetsStandalone は未実装です');
}

/** 直前の再確認 → バックアップ → 反映の依頼 → 完了の確認。 */
export async function runDeployStandalone(opts: DeployRunOptions): Promise<DeployRunResult> {
  void opts;
  throw new Error('runDeployStandalone は未実装です');
}
