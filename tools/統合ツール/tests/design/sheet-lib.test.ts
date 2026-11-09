import { describe, expect, it } from 'vitest';
import { readZip } from '../archive/zip-reader';
import { loadSheetLib } from '../../src/tabs/sheetLib';

describe('同梱の Excel ライブラリ（xlsx-js-style）', () => {
  it('セル書式つきの .xlsx を書き出し、標準的な ZIP として読み戻せる', async () => {
    const XLSX = await loadSheetLib();
    expect(XLSX.version).toBe('0.18.5');
    expect(XLSX.style_version).toBe('1.2.0');

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([['項目名', '種類'], ['金額', '数値']]);
    ws.A1.s = { font: { bold: true, name: 'Meiryo' }, fill: { patternType: 'solid', fgColor: { rgb: 'FFD9E1F2' } } };
    XLSX.utils.book_append_sheet(wb, ws, 'フィールド');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });

    const entries = Object.fromEntries(readZip(Buffer.from(out)).map((entry) => [entry.name, entry]));
    expect(Object.keys(entries)).toEqual(expect.arrayContaining(['[Content_Types].xml', 'xl/workbook.xml', 'xl/styles.xml', 'xl/worksheets/sheet1.xml']));
    expect(entries['xl/workbook.xml'].data.toString('utf8')).toContain('フィールド');
    const styles = entries['xl/styles.xml'].data.toString('utf8');
    expect(styles).toContain('FFD9E1F2');
    expect(styles).toContain('Meiryo');
  });

  it('同じライブラリを繰り返し返す', async () => {
    expect(await loadSheetLib()).toBe(await loadSheetLib());
  });
});
