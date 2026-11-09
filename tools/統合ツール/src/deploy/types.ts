'use strict';

/**
 * 本番反映ツール（tools/本番反映.js）のエンジンと画面の取り決め。
 *
 * 流れ: 対象アプリを選ぶ → inspectDeployTargetsStandalone（本番とプレビューの差分を確認・書き込みなし）
 *   → 最終確認 → runDeployStandalone（直前の再確認 → バックアップ → 反映の依頼 → 完了の確認）。
 *
 * mode:
 * - 'deploy': プレビューの設定を本番へ反映する（kintone の「アプリを更新」と同じ。POST /preview/app/deploy.json）。
 * - 'revert': プレビューの未公開の変更を破棄する（kintone の「変更を中止」と同じ。revert: true）。
 *
 * 変更の要約（items）は常に before = 本番、after = プレビューの向きで作る。
 * revert のときは画面と記録が「破棄される変更」と読み替える。
 */

import type { Bundle } from '../api.js';
import type { ReflectItemSummary } from '../reflect/changeSummary.js';

export type DeployMode = 'deploy' | 'revert';

/**
 * sequential: 1 アプリずつ依頼し、完了を確認してから次へ進む。
 * atomic: 1 回の依頼にまとめる（kintone は 1 件でも失敗するとすべて取り消す）。最大 300 件・同じゲストスペースのアプリだけ。
 */
export type DeployBatchMode = 'sequential' | 'atomic';

export interface DeployAppRef {
  appId: string;
  /** ゲストスペースID（通常スペースは空文字） */
  guestId: string;
  /** 入力時に分かっているアプリ名（任意。確認結果の名前を優先する） */
  name?: string;
}

/**
 * changes: 本番とプレビューの revision が異なる（反映できる）。
 * clean: revision が一致（未公開の変更なし。反映の対象にしない）。
 * error: 取得失敗（選んだままでは進めない）。
 * processing: kintone が反映の処理中（完了を待ってから確認し直す）。
 */
export type DeployInspectState = 'changes' | 'clean' | 'error' | 'processing';

export interface DeploySectionDiff {
  sectionKey: string;
  /** 利用者向けの項目名（reflectSectionLabel と同じ） */
  label: string;
  /** change: 内容が異なる。same: 同じ。error: どちらかの取得に失敗 */
  status: 'change' | 'same' | 'error';
  /** 変更の要約（before = 本番、after = プレビュー）。status === 'change' のときだけ中身がある */
  items: ReflectItemSummary[];
  /** items の種類ごとの件数（'保持' は数えない） */
  counts: { added: number; changed: number; removed: number };
  /** status === 'error' の理由 */
  message?: string;
}

export interface DeployRemovedField {
  code: string;
  label: string;
  /** kintone のフィールドの種類（SINGLE_LINE_TEXT など） */
  type: string;
  /** テーブル内のフィールドなら、そのテーブルのフィールドコード */
  table?: string;
  /**
   * プレビューに、同じ種類・同じ表示名で本番に無いコードのフィールドがある場合、そのコード。
   * REST API ではフィールドコードの変更も「削除＋追加」に見えるため、コードを変えただけならレコードの値は残る可能性がある。
   */
  possibleRename?: string;
}

export interface DeployAppInspection {
  appId: string;
  guestId: string;
  /** 確認できたアプリ名（取得できなければ入力時の名前、それも無ければ空文字） */
  name: string;
  state: DeployInspectState;
  /** 本番の設定の revision（取得できなければ空文字） */
  productionRevision: string;
  /** プレビューの設定の revision（取得できなければ空文字）。反映の依頼にこの値を添える */
  previewRevision: string;
  /** state === 'changes' で、比べた項目の内容がすべて同じ（revision だけが異なる）とき true */
  contentSame?: boolean;
  /** 比べた項目ごとの結果。state === 'changes' のときだけ中身がある */
  sections: DeploySectionDiff[];
  /** 本番にあり、プレビューに無いフィールド（本番へ反映するとレコードの値も削除され、元に戻せない） */
  removedFields: DeployRemovedField[];
  /** 利用者向けの注意（反映は止めない） */
  warnings: string[];
  /** state === 'error' / 'processing' の理由（利用者向けの 1 行目から書く） */
  error?: string;
  /** 確認した日時（ISO 8601） */
  inspectedAt: string;
  /** バックアップに使う取得値（rawSettings で取得。画面には出さない）。state === 'changes' のときだけ */
  productionBundle?: Bundle;
  previewBundle?: Bundle;
}

export interface DeployInspectOptions {
  targets: DeployAppRef[];
  /** 比べる項目（既定: DEPLOY_COMPARE_SECTION_KEYS） */
  sections?: readonly string[];
  /** 進捗（done / total はアプリ数） */
  onProgress?: (done: number, total: number, label: string) => void;
}

export interface DeployInspectResult {
  /** targets と同じ順 */
  apps: DeployAppInspection[];
  inspectedAt: string;
  counts: { changes: number; clean: number; error: number; processing: number };
}

/**
 * waiting: 待機中。checking: 直前の確認中。deploying: 反映中（kintone の処理待ち）。
 * success: 成功。failed: 失敗（kintone が FAIL を返した、または依頼が拒否された）。
 * cancelled: 取り消し（まとめて反映で、ほかのアプリの失敗のため kintone が取り消した）。
 * conflict: 確認後に更新された（本番またはプレビューの revision が変わった）。このアプリは依頼していない。
 * unknown: 依頼したが完了を確認できない（時間切れ・中止・状態の取得失敗）。kintone 側で処理が続いている可能性がある。
 * pending: 未実行（中止・前の失敗で止めた・事前検査で止めた）。
 */
export type DeployAppStatus = 'waiting' | 'checking' | 'deploying' | 'success' | 'failed' | 'cancelled' | 'conflict' | 'unknown' | 'pending';

export interface DeployAppOutcome {
  appId: string;
  guestId: string;
  name: string;
  status: DeployAppStatus;
  /** 利用者向けの理由・補足（1 行目から読めるように） */
  message?: string;
  /** 差分確認時の本番の revision */
  productionRevisionBefore: string;
  /** 依頼に添えたプレビューの revision */
  previewRevision: string;
  /** 成功後に確認した本番の revision */
  productionRevisionAfter?: string;
  /** 成功後に本番とプレビューの revision が一致したか（確認できなければ undefined） */
  verified?: boolean;
}

export interface DeployAppUpdate {
  appId: string;
  guestId: string;
  status: DeployAppStatus;
  message?: string;
}

export interface DeployBackupInfo {
  fileName: string;
  appCount: number;
  generatedAt: string;
  /** production: 反映前の本番（deploy）。preview: 中止前のプレビュー（revert） */
  environment: 'production' | 'preview';
  /** 本体を保存できなかった JS/CSS ファイル（反映後も設定に残るものだけ。外れるものが保存できなければ反映しない） */
  unavailableFiles: Array<{ appId: string; name: string; reason: string }>;
}

/**
 * バックアップ JSON の形。プレビュー反映の「設定JSONから取得」でそのまま読み込める（bundles 配列）。
 * customizeSettings の FILE 項目には、変更があるアプリだけファイル本体（file._content）を埋め込む。
 */
export interface DeployBackupFile {
  kind: 'kintone-deploy-backup';
  version: 1;
  generatedAt: string;
  mode: DeployMode;
  environment: 'production' | 'preview';
  scopes: string[];
  bundles: Bundle[];
}

export interface DeployPollOptions {
  /** 最初の状態確認までの待ち時間（既定 1000ms） */
  initialMs?: number;
  /** 状態確認の間隔の上限（既定 5000ms） */
  maxMs?: number;
  /** 1 回の依頼の完了を待つ上限（既定 300000ms）。超えたら unknown */
  timeoutMs?: number;
}

export interface DeployRunOptions {
  mode: DeployMode;
  batchMode: DeployBatchMode;
  /** sequential で、失敗・競合・確認できないが出たら残りを未実行にする（既定 true） */
  stopOnError?: boolean;
  /** 差分確認で確認し、最終確認で選んだアプリ（state === 'changes' のものだけ） */
  targets: DeployAppInspection[];
  onUpdate?: (update: DeployAppUpdate) => void;
  setStatus?: (message: string) => void;
  /** バックアップの保存（既定はブラウザのダウンロード）。テストで差し替える */
  saveBackup?: (fileName: string, json: string) => void;
  poll?: DeployPollOptions;
}

export interface DeployRunResult {
  mode: DeployMode;
  batchMode: DeployBatchMode;
  startedAt: string;
  finishedAt: string;
  /** targets と同じ順 */
  apps: DeployAppOutcome[];
  backup?: DeployBackupInfo;
  /** 実行ログ（内部の通信情報はここにだけ残す） */
  logs: string[];
  /** 利用者の「中止」で止めた */
  cancelled?: boolean;
  /** 反映の依頼を 1 件も送らずに止めた理由（事前検査・バックアップの失敗）。このときすべてのアプリは pending か conflict */
  blocked?: string;
}
