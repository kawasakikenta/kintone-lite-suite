'use strict';

/**
 * 「反映元アプリから本番へ」のエンジン（仮実装）。取り決めは deploy/sourceTypes.ts を参照。実装担当が置き換える。署名は変えない。
 */

import type { SourceDeployOptions, SourceDeployResult } from '../deploy/sourceTypes.js';

/** 反映先プレビューへ書き込み（runApplyPreviewStandalone + composed）、goal が production なら続けて本番へ反映する。 */
export async function runSourceToProductionStandalone(opts: SourceDeployOptions): Promise<SourceDeployResult> {
  void opts;
  throw new Error('runSourceToProductionStandalone は未実装です');
}
