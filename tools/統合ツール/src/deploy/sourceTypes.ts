'use strict';

/**
 * 「反映元アプリから本番へ」の取り決め。
 * 反映元（開発・検証用アプリまたは設定JSON）の設定を、選んだ変更と修正のとおりに反映先のプレビューへ書き込み、
 * goal が production なら、続けて反映先を本番へ反映する（アプリを更新）。
 */

import type { ReflectBaseline } from '../reflect/standalonePreflight.js';
import type { ReflectTargetPending } from '../reflect/targetPending.js';
import type { ReflectOptions, ReflectSectionUpdate, runApplyPreviewStandalone } from '../tabs/reflect-standalone.js';
import type { DeployAppInspection, DeployAppUpdate, DeployPollOptions, DeployRunResult } from './types.js';

export type SourceDeployGoal = 'production' | 'preview';

export interface SourceDeployOptions {
  /** 反映元・反映先・項目・参照先変換・保持（プレビュー反映と同じ） */
  reflect: ReflectOptions;
  /** 差分の抽出（previewReflectStandalone）の baseline。実行直前の再取得と照合する */
  reviewBaseline: ReflectBaseline;
  /** 項目ごとの送る設定（composeReflectSelectionStandalone の sections[].after）。無い項目は既定の計画どおり */
  composed: Record<string, any>;
  goal: SourceDeployGoal;
  /** 差分の抽出時の反映先の未公開の変更（previewReflectStandalone の targetPending） */
  targetPending?: ReflectTargetPending;
  /** targetPending が 'pending'（以前からの未公開の変更あり）でも本番へ反映する（最終確認で利用者が了承した） */
  allowPendingChanges?: boolean;
  onSectionUpdate?: (update: ReflectSectionUpdate) => void;
  onDeployUpdate?: (update: DeployAppUpdate) => void;
  setStatus?: (message: string) => void;
  poll?: DeployPollOptions;
}

export type SourceApplyResult = Awaited<ReturnType<typeof runApplyPreviewStandalone>>;

export interface SourceDeployResult {
  goal: SourceDeployGoal;
  /** 反映先プレビューへの書き込みの結果（バックアップ・項目ごとの結果・最後の revision） */
  apply: SourceApplyResult;
  /** 本番への反映の結果（goal === 'production' で、プレビューへの書き込みがすべて成功したときだけ） */
  deploy?: DeployRunResult;
  /** goal === 'production' なのに本番へ反映しなかった理由（書き込みの失敗・中止・確認の食い違い・未公開の変更の了承なし） */
  deploySkipped?: string;
  /** 本番へ反映する直前に確認した差分（記録用。productionBundle / previewBundle は除く） */
  deployInspection?: Omit<DeployAppInspection, 'productionBundle' | 'previewBundle'>;
}
