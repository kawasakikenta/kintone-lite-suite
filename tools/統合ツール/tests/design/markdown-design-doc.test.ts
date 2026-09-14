import { describe, it, expect } from 'vitest';
import { bundleToMarkdown } from '../../src/diff/export';

function makeBundle(sections: Record<string, any>) {
  return { appId: '10', guestId: '', preview: true, fetchedAt: '2026-01-01 00:00:00', sections };
}

function visibleMarkdown(md: string) {
  return md.replace(/\n?<details><summary>APIレスポンス（生データ）<\/summary>[\s\S]*?<\/details>/g, '');
}

describe('design/bundleToMarkdown (REST API レスポンス準拠の日本語化)', () => {
  it('アプリ設定のテーマ（CLIPBOARD 等の追加テーマ）を日本語化する', () => {
    const md = bundleToMarkdown(makeBundle({
      appSettings: { name: 'テスト', theme: 'CLIPBOARD', icon: { type: 'PRESET', key: 'APP60' } }
    }));
    expect(md).toContain('クリップボード');
    expect(md).toContain('プリセット');
    expect(md).not.toMatch(/\| *CLIPBOARD *\|/);
  });

  it('フィールド権限は accessibility（READ/WRITE/NONE）を日本語化する', () => {
    const md = bundleToMarkdown(makeBundle({
      fieldAcl: {
        rights: [{
          code: 'metrics',
          entities: [
            { entity: { type: 'USER', code: 'user1' }, accessibility: 'READ', includeSubs: false },
            { entity: { type: 'GROUP', code: 'g1' }, accessibility: 'NONE', includeSubs: false }
          ]
        }]
      }
    }));
    expect(md).toContain('閲覧のみ');
    expect(md).toContain('アクセス不可');
    expect(md).toContain('アクセス権');
  });

  it('アプリ権限はレコード閲覧（recordViewable）を出力する', () => {
    const md = bundleToMarkdown(makeBundle({
      appAcl: {
        rights: [{
          entity: { type: 'GROUP', code: 'everyone' },
          includeSubs: false,
          appEditable: false,
          recordViewable: true,
          recordAddable: true,
          recordEditable: false,
          recordDeletable: false,
          recordImportable: false,
          recordExportable: false
        }]
      }
    }));
    expect(md).toContain('閲覧');
    expect(md).toMatch(/\| *○ *\|/);
  });

  it('リマインダー通知は timing.code を基準フィールドとして表示し、負の daysLater を「日前」と表記する', () => {
    const md = bundleToMarkdown(makeBundle({
      reminderNotifications: {
        timezone: 'Asia/Tokyo',
        notifications: [{
          timing: { code: '締切日', daysLater: '-3', time: '09:00' },
          filterCond: '',
          title: '締切前リマインド',
          targets: [{ entity: { type: 'USER', code: 'user1' }, includeSubs: false }]
        }]
      }
    }));
    expect(md).toContain('基準フィールド');
    expect(md).toContain('締切日');
    expect(md).toContain('3日前');
    expect(md).not.toContain('-3日後');
  });

  it('アプリアクションは destApp / entities（REST API のプロパティ名）を参照する', () => {
    const md = bundleToMarkdown(makeBundle({
      actionSettings: {
        actions: {
          '見積作成': {
            name: '見積作成',
            index: '0',
            destApp: { app: '12', code: '' },
            entities: [{ type: 'GROUP', code: 'sales' }],
            mappings: [{ srcType: 'FIELD', srcField: 'a', destField: 'b' }]
          }
        }
      }
    }));
    expect(md).toContain('12');
    expect(md).toContain('グループ');
    expect(md).toContain('`sales`');
    expect(md).toContain('利用できるユーザー');
  });

  it('HTMLラベル内の数値文字参照を設計書の表示部分では通常文字に戻す', () => {
    const md = bundleToMarkdown(makeBundle({
      appSettings: {
        name: '契約&amp;#65289;',
        description: '<div>概要&#65289;&nbsp;追記</div>'
      },
      fieldSettings: {
        properties: {
          customer: { code: 'customer', label: '顧客&#xFF09;', type: 'SINGLE_LINE_TEXT' },
          noteLabel: { code: 'noteLabel', label: '<div>注意&#65289;&nbsp;テキスト</div>', type: 'LABEL' }
        }
      },
      layoutSettings: {
        layout: [{
          type: 'ROW',
          fields: [{ type: 'LABEL', label: '<span>フォーム&#65289;</span>' }]
        }]
      }
    }));
    const visible = visibleMarkdown(md);

    expect(visible).toContain('契約）');
    expect(visible).toContain('概要） 追記');
    expect(visible).toContain('顧客）');
    expect(visible).toContain('注意） テキスト');
    expect(visible).toContain('[ラベル]フォーム）');
    expect(visible).not.toContain('&#65289;');
    expect(visible).not.toContain('&#xFF09;');
    expect(visible).not.toContain('&amp;#65289;');
    expect(visible).not.toContain('<div>');
  });

  it('ヘッダーに取得環境・アプリ名・失敗セクションを出し、ISO の取得日時には日本時間を添える', () => {
    const md = bundleToMarkdown({ appId: '10', guestId: '3', preview: false, fetchedAt: '2026-05-02T09:00:00.000Z', sections: {
      appSettings: { name: '営業案件' },
      viewSettings: { _fetchError: '権限不足' }
    } });
    expect(md).toContain('| 取得環境 | 本番（運用中の設定） |');
    expect(md).toContain('| アプリ名 | 営業案件 |');
    expect(md).toContain('| ゲストスペースID | 3 |');
    expect(md).toContain('| 取得できなかったセクション | ビュー設定 |');
    expect(md).toMatch(/\| 取得日時 \| 2026\/5\/2 18:00:00 JST（2026-05-02T09:00:00.000Z） \|/);
    const local = bundleToMarkdown(makeBundle({ appSettings: { name: 'x' } }));
    expect(local).toContain('| 取得環境 | プレビュー（未公開の設定） |');
    expect(local).toContain('| 取得日時 | 2026-01-01 00:00:00 |');
  });

  it('フィールド表にルックアップ・関連レコード・単位・文字数などの参照先/制約を出す', () => {
    const md = visibleMarkdown(bundleToMarkdown(makeBundle({
      fieldSettings: {
        properties: {
          customer: { code: 'customer', label: '顧客', type: 'SINGLE_LINE_TEXT', minLength: '1', maxLength: '64',
            lookup: { relatedApp: { app: '12', code: '' }, relatedKeyField: 'name', fieldMappings: [{ field: 'addr', relatedField: 'addr' }] } },
          amount: { code: 'amount', label: '金額', type: 'NUMBER', unit: '円', unitPosition: 'AFTER', digit: true, minValue: '0' },
          related: { code: 'related', label: '履歴', type: 'REFERENCE_TABLE', referenceTable: { relatedApp: { app: '20' }, condition: { field: 'customer', relatedField: 'customer' }, displayFields: ['date', 'memo'], size: '5' } },
          table: { code: 'table', label: '明細', type: 'SUBTABLE', fields: { qty: { code: 'qty', label: '数量', type: 'NUMBER', unit: '個' } } }
        }
      }
    })));
    expect(md).toContain('| 参照先/制約 |');
    expect(md).toContain('ルックアップ: App 12 キー `name` / 転記 1項目 / 文字数 1〜64');
    expect(md).toContain('単位: 円（後） / 桁区切りあり / 値 0〜');
    expect(md).toContain('関連レコード: App 20 条件 `customer` = `customer` / 表示 2項目 / 5件表示');
    expect(md).toContain('| qty | 数量 | 数値 |  |  |  | 単位: 個 |');
  });

  it('rawJson: false では API レスポンスの生データを含めない', () => {
    const bundle = makeBundle({ appSettings: { name: 'x', theme: 'WHITE' } });
    expect(bundleToMarkdown(bundle)).toContain('APIレスポンス（生データ）');
    const md = bundleToMarkdown(bundle, { rawJson: false });
    expect(md).not.toContain('APIレスポンス（生データ）');
    expect(md).toContain('| アプリ名 | x |');
  });
});
