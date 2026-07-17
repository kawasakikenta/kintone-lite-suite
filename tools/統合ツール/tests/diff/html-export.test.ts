import { describe, expect, it } from 'vitest';
import { buildDiffHtml } from '../../src/diff/export';

function extractInlineScript(html: string): string {
  const match = html.match(/<script>([\s\S]*)<\/script>/);
  if (!match) throw new Error('inline report script was not found');
  return match[1];
}

describe('diff/html export', () => {
  it('emits syntactically valid inline script for the standalone report', () => {
    const sourceBundle = {
      appId: '1',
      guestId: '',
      preview: false,
      sections: {
        fieldSettings: {
          properties: {
            field_a: { code: 'field_a', label: '旧ラベル', type: 'SINGLE_LINE_TEXT' }
          }
        },
        layoutSettings: { layout: [] }
      },
      meta: { sectionRevisions: { fieldSettings: '1' } }
    };
    const targetBundle = {
      appId: '2',
      guestId: '',
      preview: false,
      sections: {
        fieldSettings: {
          properties: {
            field_a: { code: 'field_a', label: '新ラベル', type: 'SINGLE_LINE_TEXT' }
          }
        },
        layoutSettings: { layout: [] }
      },
      meta: { sectionRevisions: { fieldSettings: '2' } }
    };
    const rows = [{
      _id: 'row-1',
      sectionKey: 'fieldSettings',
      section: 'フィールド',
      type: 'changed',
      path: 'fieldSettings.properties.field_a.label',
      left: '旧ラベル',
      right: '新ラベル',
      severity: 'low'
    }];

    const html = buildDiffHtml(sourceBundle, targetBundle, rows, ['fieldSettings'], '', {});

    expect(() => new Function(extractInlineScript(html))).not.toThrow();
  });

  it('drops severity/importance UI and exposes the new comparison controls', () => {
    const sourceBundle = {
      appId: '1', guestId: '', preview: false,
      sections: { fieldSettings: { properties: {} }, layoutSettings: { layout: [] } },
      meta: { sectionRevisions: { fieldSettings: '1' } }
    };
    const targetBundle = {
      appId: '2', guestId: '', preview: false,
      sections: { fieldSettings: { properties: {} }, layoutSettings: { layout: [] } },
      meta: { sectionRevisions: { fieldSettings: '2' } }
    };
    const html = buildDiffHtml(sourceBundle, targetBundle, [], ['fieldSettings'], '', {});

    // 重要度（severity）などの抽象指標は UI から除去されている
    expect(html).not.toContain('data-severity-chip');
    expect(html).not.toContain('全重要度');
    expect(html).not.toContain('.meta-tag.sev-high');
    expect(html).not.toContain('重要度が高い順');

    // 素のJSON比較・確認済み・CSV/MD 出力・確認済み統計を追加
    expect(html).toContain('id="rawJson"');
    expect(html).toContain('id="hideReviewed"');
    expect(html).toContain('id="csvBtn"');
    expect(html).toContain('id="mdBtn"');
    expect(html).toContain('id="stat-reviewed"');

    // KV差分色付けと関連レコード一覧設定の日本語キーラベル
    const script = extractInlineScript(html);
    expect(html).toContain('tr.kv-add>td');
    expect(script).toContain('SETTING_KEY_LABELS');
    expect(script).toContain('renderSettingKvTable');

    // 英語見出しの日本語化
    expect(html).not.toContain('Visual Diff / Settings Review');
    expect(html).not.toContain('Kintone Settings Diff');
    expect(html).not.toContain('Field Detail Popup');
  });

  it('colors differing keys inside the reference-table key/value snapshot', () => {
    const referenceTableSrc = {
      condition: { field: '物件ID', relatedField: '子会社ID' },
      displayFields: ['会社名', '住所'],
      relatedApp: { app: '475', code: '' },
      size: '5',
      sort: 'レコード番号 desc'
    };
    const referenceTableTgt = {
      condition: { field: '保有会社選択', relatedField: '子会社ID' },
      displayFields: ['会社名', '住所'],
      relatedApp: { app: '471', code: '' },
      size: '5',
      sort: '子会社ID asc'
    };
    const mkBundle = (appId: string, referenceTable: any) => ({
      appId, guestId: '', preview: false,
      sections: { fieldSettings: { properties: {
        保有会社情報: { code: '保有会社情報', label: '保有会社情報', type: 'REFERENCE_TABLE', referenceTable }
      } }, layoutSettings: { layout: [] } },
      meta: { sectionRevisions: { fieldSettings: appId } }
    });
    const rows = [{
      _id: 'r1', sectionKey: 'fieldSettings', section: 'フィールド', type: 'changed',
      path: 'fieldSettings.properties.保有会社情報.referenceTable.relatedApp.app',
      left: '475', right: '471', severity: 'low'
    }];
    const html = buildDiffHtml(
      mkBundle('475', referenceTableSrc),
      mkBundle('471', referenceTableTgt),
      rows, ['fieldSettings'], '', {}
    );
    const script = extractInlineScript(html);
    // 埋め込みスクリプトは有効な JS のまま
    expect(() => new Function(script)).not.toThrow();
    // 関連レコード一覧設定のキーは日本語ラベルへ変換される
    expect(script).toContain('参照するアプリ');
    expect(script).toContain('表示条件（フィールドの一致）');
  });
});
