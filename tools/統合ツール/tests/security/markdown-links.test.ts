import { describe, expect, it } from 'vitest';
import { buildDiffHtml, bundleToMarkdown } from '../../src/diff/export';
import { buildHTML } from '../../src/tabs/er.js';
import { buildErMarkdownSpec } from '../../src/tabs/er-model';
import { buildSettingsMarkdownIndex } from '../../src/tabs/settings-export-standalone';
import { buildProcessBatchOverviewMarkdown, buildProcessSpecMarkdown, formatProcessSimulationHistory } from '../../src/tabs/process-standalone';
import { buildJsConfigBatchIndexMarkdown } from '../../src/tabs/jsconfig-standalone';

/**
 * kintone の設定の文字列（アプリ名・フィールド名・選択肢など。アプリの管理者なら誰でも書ける）や、読み込んだ設定JSONの文字列に
 * Markdown のリンク・画像の記法が入っていても、出力した Markdown を表示した人の環境で外部の画像を読みに行ったり、
 * 名前と違う宛先へのリンクになったりしないこと（記法の「[」を逃がし、HTML のタグはタグにしない）。
 */
const IMAGE = '![x](https://evil.example/p.png)';
const LINK = '[ここを開く](javascript:alert(1))';
const TAG = '<img src="https://evil.example/q.png">';
const ESCAPED_LINK = '\\[ここを開く](javascript:alert(1))';
const HOSTILE = `${IMAGE} ${LINK} ${TAG}`;

/** 囲みのコード（``` や ~~~）の外だけを残す（囲みの中は Markdown として解釈されない）。 */
function outsideFences(md: string): string {
  const out: string[] = [];
  let fence = '';
  for (const line of md.split(/\r?\n/)) {
    const open = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) {
      if (open && open[1][0] === fence[0] && open[1].length >= fence.length && /^ {0,3}[`~]+\s*$/.test(line)) fence = '';
      continue;
    }
    if (open) { fence = open[1]; continue; }
    out.push(line);
  }
  return out.join('\n');
}

/**
 * 宛先が攻撃者の URL・javascript のリンクと画像のうち、「[」が逃がされていない（直前のバックスラッシュが偶数個の）もの。
 * リンクの文字の部分は CommonMark と同じく、逃がした文字（`\]` など）と 1 段の対になった角かっこを含められ、逃がした `]` では閉じない
 * （ツールが自分で付ける角かっこ `[名前]` の中に、名前の `](https://…)` で閉じさせる書き方も見つける）。
 * 逃がした「[」の中に、逃がしていない記法が入っていても見落とさないよう、見つけた位置の次の文字から探し直す。
 */
function liveHostileLinks(md: string): string[] {
  const text = outsideFences(md);
  const found: string[] = [];
  const re = /\[(?:\\.|[^\\[\]\n]|\[(?:\\.|[^\\[\]\n])*\])*\]\((?:https?:\/\/evil\.example|javascript:)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    let slashes = 0;
    for (let i = match.index - 1; i >= 0 && text[i] === '\\'; i -= 1) slashes += 1;
    if (slashes % 2 === 0) found.push(text.slice(Math.max(0, match.index - 1), match.index + match[0].length));
    re.lastIndex = match.index + 1;
  }
  return found;
}

/** 「<」が逃がされていない（&lt; でも \< でもない）img タグ。 */
function liveTags(md: string): string[] {
  const text = outsideFences(md);
  const found: string[] = [];
  const re = /<img\b/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    let slashes = 0;
    for (let i = match.index - 1; i >= 0 && text[i] === '\\'; i -= 1) slashes += 1;
    if (slashes % 2 === 0) found.push(text.slice(match.index, match.index + 40));
  }
  return found;
}

function expectNoLiveMarkup(md: string): void {
  expect(liveHostileLinks(md)).toEqual([]);
  expect(liveTags(md)).toEqual([]);
}

describe('Markdown の出力: kintone の文字列のリンク・画像の記法を逃がす', () => {
  it('判定の確認: 逃がしていない記法を見つけ、逃がした記法・囲みのコードの中は見つけない', () => {
    expect(liveHostileLinks(`a ${IMAGE}`)).toHaveLength(1);
    expect(liveHostileLinks(`a \\\\${LINK}`)).toHaveLength(1);
    expect(liveHostileLinks(`a !\\[x](https://evil.example/p.png) ${ESCAPED_LINK}`)).toEqual([]);
    expect(liveHostileLinks(`\`\`\`json\n${IMAGE}\n\`\`\``)).toEqual([]);
    // ツールが付ける角かっこを名前の「](…)」で閉じさせる書き方・対になった角かっこ・逃がした「[」の中の記法も見つける
    expect(liveHostileLinks('[x](https://evil.example/p.png)] → 完了')).toHaveLength(1);
    expect(liveHostileLinks('[[x]](javascript:alert(1))')).toHaveLength(1);
    expect(liveHostileLinks(`\\[a ${IMAGE}`)).toHaveLength(1);
    expect(liveHostileLinks('[x\\] y](https://evil.example/p.png)')).toHaveLength(1);
    // 逃がした「]」では閉じない（リンクにならない）
    expect(liveHostileLinks('[x\\](https://evil.example/p.png)] → 完了')).toEqual([]);
    expect(liveTags(`x ${TAG}`)).toHaveLength(1);
    expect(liveTags(`x &lt;img src=1> \\<img src=2> \\\\<img src=3>`)).toHaveLength(1);
  });

  it('設計書 Markdown: アプリ名・説明・フィールド名・選択肢・一覧名・部分取得の理由', () => {
    const md = bundleToMarkdown({
      appId: '1',
      guestId: '',
      preview: false,
      fetchedAt: '2026-11-28T00:00:00.000Z',
      sections: {
        appSettings: { name: HOSTILE, description: `<p>${IMAGE}</p>` },
        fieldSettings: {
          properties: {
            pick: { type: 'DROP_DOWN', code: 'pick', label: HOSTILE, options: { a: { label: IMAGE, index: '0' } } },
            back: { type: 'SINGLE_LINE_TEXT', code: 'back', label: `\\${LINK}` }
          }
        },
        viewSettings: { views: { v: { type: 'LIST', name: HOSTILE, index: '0', fields: [] } }, _partial: HOSTILE }
      }
    });
    expect(md).toContain('ここを開く');
    expectNoLiveMarkup(md);
  });

  it('ER図仕様書（パネルの「Markdown仕様書」）: アプリ名・フィールド名・関連名', () => {
    const md = buildErMarkdownSpec([
      { id: 1, name: HOSTILE, ok: true, status: 'complete', fields: [{ code: 'c', label: HOSTILE, type: 'SINGLE_LINE_TEXT' }],
        relations: [{ kind: 'LOOKUP', from: 'c', fromLabel: HOSTILE, toApp: 2, toField: 'k' }] },
      { id: 2, name: `\\${IMAGE}`, ok: true, status: 'complete', fields: [], relations: [] }
    ], undefined, { generatedAt: 'x' });
    expect(md).toContain('ここを開く');
    expectNoLiveMarkup(md);
  });

  it('ER図ビューアーの「Markdown 仕様書」の逃がし（mdEsc）', () => {
    const html = buildHTML([{ id: 1, name: 'A', ok: true, status: 'complete', allFields: [], relations: [] }], {
      startAppId: '1', startAppIds: ['1'], layoutName: 'dagre', fieldDensity: 'standard', source: {}
    });
    const script = html.match(/<script id="er-main" type="text\/plain">([\s\S]*?)<\/script>/)?.[1] || '';
    const line = script.split('\n').find((text) => text.startsWith('function mdEsc('));
    if (!line) throw new Error('mdEsc was not found in the ER viewer script');
    const mdEsc = new Function(`${line}\nreturn mdEsc;`)() as (value: unknown) => string;
    expectNoLiveMarkup(`| ${mdEsc(HOSTILE)} |`);
    expectNoLiveMarkup(`## ${mdEsc(`\\${LINK}`)}`);
    expect(mdEsc(LINK)).toBe(ESCAPED_LINK);
  });

  it('設定取得の INDEX.md: アプリ名', () => {
    const md = buildSettingsMarkdownIndex({ apps: [{ appId: '1', appName: HOSTILE, file: 'a.json', sections: { ok: 1, ng: 0 } }, { appId: '2', appName: `\\${IMAGE}`, file: 'b.json', sections: { ok: 1, ng: 0 } }] });
    expect(md).toContain('ここを開く');
    expectNoLiveMarkup(md);
  });

  it('差分 HTML レポートの「Markdownでコピー」の逃がし（mdCell）', () => {
    const html = buildDiffHtml({ appId: '1', sections: {} }, { appId: '2', sections: {} }, [], ['appSettings'], '', {});
    const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1] || '';
    const start = script.indexOf('  function mdCell(');
    const end = script.indexOf('\n  function ', start + 1);
    if (start < 0) throw new Error('mdCell was not found in the report script');
    const mdCell = new Function(`${script.slice(start, end)}\nreturn mdCell;`)() as (value: unknown, max?: number) => string;
    expectNoLiveMarkup(`| ${mdCell(HOSTILE, 500)} | ${mdCell(`\\${LINK}`, 500)} |`);
    // 表のセルの区切りと改行は、これまでどおり逃がす
    expect(mdCell('a|b\nc')).toBe('a\\|b<br>c');
  });
});

describe('lite にしかない Markdown の出力: kintone の文字列のリンク・画像の記法を逃がす', () => {
  // 状態名・アクション名・作業者のコードはプロセス管理の設定で、アプリの管理者が書ける
  const CLOSE_BRACKET = 'x](https://evil.example/p.png)';
  const hostileStates = {
    [HOSTILE]: { index: '0', assignee: { type: 'ONE', entities: [{ entity: { type: 'USER', code: IMAGE } }] } },
    [`\\${LINK}`]: { index: '1', assignee: { type: 'ONE', entities: [] } }
  };
  const hostileActions = [
    { name: HOSTILE, from: HOSTILE, to: `\\${LINK}`, filterCond: HOSTILE, type: 'PRIMARY' },
    { name: CLOSE_BRACKET, from: `\\${LINK}`, to: IMAGE, filterCond: '', type: 'PRIMARY' }
  ];

  it('プロセス管理仕様書 Markdown: アプリ名（見出し）・状態名・アクション名・始点と終端・構造上の注意', () => {
    const md = buildProcessSpecMarkdown({ appId: '1', appName: HOSTILE, states: hostileStates, actions: hostileActions });
    expect(md).toContain('ここを開く');
    expectNoLiveMarkup(md);
  });

  it('プロセス遷移シミュレーション履歴: 状態名・アクション名（ツールが付ける [ ] の中を閉じさせない）・作業者', () => {
    const history = [
      { from: HOSTILE, action: CLOSE_BRACKET, to: `\\${LINK}`, condition: HOSTILE },
      { from: `\\${LINK}`, action: HOSTILE, to: HOSTILE }
    ];
    const md = formatProcessSimulationHistory(history, HOSTILE, hostileStates);
    expect(md).toContain('ここを開く');
    expectNoLiveMarkup(md);
    expectNoLiveMarkup(formatProcessSimulationHistory([], HOSTILE, hostileStates));
    // ふだんの名前は今までどおり読める形のまま
    expect(formatProcessSimulationHistory([{ from: '未処理', action: '申請', to: '完了' }], '完了')).toContain('- 遷移経路: 未処理 [申請] → 完了');
  });

  it('プロセス図の一括出力 overview.md: アプリ名・構造上の注意・失敗理由・状態とアクションの表', () => {
    const md = buildProcessBatchOverviewMarkdown([
      { appId: '1', guestId: '', appName: HOSTILE, outcome: 'enabled', stateCount: 2, actionCount: 2, warnings: [HOSTILE], reason: '', file: 'diagrams/1.mmd', states: hostileStates, actions: hostileActions },
      { appId: '2', guestId: '', appName: `\\${IMAGE}`, outcome: 'failed', stateCount: 0, actionCount: 0, warnings: [], reason: HOSTILE, file: '' }
    ], { 'diagrams/1.mmd': 'stateDiagram-v2\n' }, { generatedAt: 'x', preview: false, cancelled: false, total: 2 });
    expect(md).toContain('ここを開く');
    expectNoLiveMarkup(md);
  });

  it('kintoneJS取得の一括 ZIP の INDEX.md: アプリ名・ファイル名・失敗理由', () => {
    const md = buildJsConfigBatchIndexMarkdown({
      guestId: '',
      apps: [{
        appId: '1', name: HOSTILE, folder: '1_x', scope: 'ALL', revision: '3',
        files: [{ entry: '1_x/desktop/js/0_a.js', area: 'desktop', kind: 'js', order: 0, name: 'a.js', fileKey: 'k', size: '1' }],
        urlEntries: [{ type: 'js', scope: 'desktop', url: 'https://cdn.example.com/a.js', order: 1 }],
        failures: []
      }, {
        appId: '2', name: `\\${IMAGE}`, folder: '2_x', scope: 'ALL', revision: '1', files: [], urlEntries: [], failures: []
      }],
      failures: [{ type: 'file', appId: '1', fileName: HOSTILE, reason: HOSTILE }]
    });
    expect(md).toContain('ここを開く');
    // 設定された外部 URL はこれまでどおりそのまま一覧する
    expect(md).toContain('| URL | https://cdn.example.com/a.js |');
    expectNoLiveMarkup(md);
  });
});
