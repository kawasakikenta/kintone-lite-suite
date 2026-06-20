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
});
