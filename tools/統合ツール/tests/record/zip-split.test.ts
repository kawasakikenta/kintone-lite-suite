import { describe, expect, it } from 'vitest';
import { LITE_ZIP_MAX_BYTES } from '../../src/archive/lite-zip';
import { planZipParts, zipDirectoryPrefixes, zipPartFileName, ZIP_MAX_BYTES, ZIP_MAX_ENTRIES, ZIP_PART_TARGET_BYTES } from '../../src/tabs/record-zip-split';

const MB = 1024 * 1024;
const unit = (id: string, ...sizes: number[]) => ({
  id,
  files: sizes.map((size, index) => ({ path: `record_${id}/files/f${index}.bin`, size }))
});
// 見積もりの余白（予約分・ヘッダ）を小さくして、境界を読みやすくする。
const small = { targetBytes: 100 * MB, maxBytes: 300 * MB, maxEntries: 1000, reservedEntries: 10, reservedBytes: 1 * MB };

describe('planZipParts', () => {
  it('keeps one part when everything fits', () => {
    const plan = planZipParts([unit('1', 10 * MB), unit('2', 10 * MB)], { limits: small });
    expect(plan.parts).toHaveLength(1);
    expect(plan.parts[0].unitIds).toEqual(['1', '2']);
    expect(plan.skipped).toEqual([]);
  });

  it('always returns a part even without attachments', () => {
    const plan = planZipParts([], { limits: small });
    expect(plan.parts).toHaveLength(1);
    expect(plan.parts[0].files).toEqual([]);
  });

  it('starts the next ZIP before the target is exceeded and never cuts a record in the middle', () => {
    // 1 レコード 40MB ×3。2 つで 80MB（余白を含めて目安 100MB 以内）、3 つ目は次の ZIP。
    const plan = planZipParts([unit('1', 20 * MB, 20 * MB), unit('2', 20 * MB, 20 * MB), unit('3', 20 * MB, 20 * MB)], { limits: small });
    expect(plan.parts.map((part) => part.unitIds)).toEqual([['1', '2'], ['3']]);
    expect(plan.parts[0].files).toHaveLength(4);
    expect(plan.parts.every((part) => part.splitUnitIds.length === 0)).toBe(true);
    // 各 ZIP の見積もりは目安を超えない
    expect(plan.parts.every((part) => part.estimatedBytes <= small.targetBytes - small.reservedBytes)).toBe(true);
  });

  it('puts a record larger than the target alone in its own ZIP (up to the hard limit)', () => {
    const plan = planZipParts([unit('1', 10 * MB), unit('2', 150 * MB), unit('3', 10 * MB)], { limits: small });
    expect(plan.parts.map((part) => part.unitIds)).toEqual([['1'], ['2'], ['3']]);
    expect(plan.parts[1].splitUnitIds).toEqual([]);
    expect(plan.skipped).toEqual([]);
  });

  it('splits one record across ZIPs only when the record alone exceeds the hard limit', () => {
    const plan = planZipParts([unit('1', 200 * MB, 200 * MB)], { limits: small });
    expect(plan.parts).toHaveLength(2);
    expect(plan.parts.map((part) => part.files.length)).toEqual([1, 1]);
    expect(plan.parts[0].splitUnitIds).toEqual(['1']);
    expect(plan.parts[1].splitUnitIds).toEqual(['1']);
  });

  it('skips only the single file that cannot fit in any ZIP and records the reason', () => {
    const plan = planZipParts([unit('1', 10 * MB, 400 * MB, 10 * MB), unit('2', 10 * MB)], { limits: small });
    expect(plan.skipped).toHaveLength(1);
    expect(plan.skipped[0]).toMatchObject({ unitId: '1', part: 1 });
    expect(plan.skipped[0].file.path).toBe('record_1/files/f1.bin');
    expect(plan.skipped[0].reason).toContain('1 ファイルが ZIP の上限');
    expect(plan.parts.flatMap((part) => part.files.map((file) => file.path))).toEqual([
      'record_1/files/f0.bin', 'record_1/files/f2.bin', 'record_2/files/f0.bin'
    ]);
  });

  it('keeps a skipped file with the part of the same record, or the part being filled otherwise', () => {
    const plan = planZipParts([unit('1', 90 * MB), unit('2', 400 * MB)], { limits: small });
    expect(plan.parts).toHaveLength(1);
    expect(plan.skipped.map((item) => [item.unitId, item.part])).toEqual([['2', 1]]);
  });

  it('counts folders as entries and splits before the entry limit', () => {
    // 1 レコード 1 ファイル → ファイル 1 + フォルダ（record_N と record_N/files）2 = 3 件。予算は 1000-10。
    const units = Array.from({ length: 400 }, (_, i) => unit(String(i + 1), 1));
    const plan = planZipParts(units, { limits: small });
    expect(plan.parts.length).toBeGreaterThan(1);
    for (const part of plan.parts) expect(part.entryCount).toBeLessThanOrEqual(small.maxEntries - small.reservedEntries);
    expect(plan.parts.reduce((sum, part) => sum + part.unitIds.length, 0)).toBe(400);
  });

  it('uses the real classic ZIP limits by default (65,535 entries / 4GB, target 2GB)', () => {
    expect(ZIP_MAX_ENTRIES).toBe(65535);
    expect(ZIP_MAX_BYTES).toBe(LITE_ZIP_MAX_BYTES);
    expect(ZIP_MAX_BYTES).toBe(0xfffffffe);
    const files = Array.from({ length: 70000 }, (_, i) => ({ path: `f/${i}.bin`, size: 1 }));
    const plan = planZipParts(files.map((file, i) => ({ id: String(i + 1), files: [file] })));
    expect(plan.parts.length).toBe(2);
    for (const part of plan.parts) expect(part.entryCount).toBeLessThanOrEqual(ZIP_MAX_ENTRIES - 32);
    const sized = planZipParts([unit('1', 1500 * MB), unit('2', 1000 * MB)]);
    expect(ZIP_PART_TARGET_BYTES).toBe(2 * 1024 * MB);
    expect(sized.parts).toHaveLength(2);
    expect(planZipParts([unit('1', 5000 * MB)]).skipped).toHaveLength(1);
  });

  it('treats a missing size as zero bytes but still counts the entry', () => {
    const plan = planZipParts([{ id: '1', files: [{ path: 'a/b.bin', size: Number.NaN }] }], { limits: small });
    expect(plan.parts[0].entryCount).toBe(2);
  });

  it('adds a part for the non-attachment content when the last part cannot hold it', () => {
    const fitting = planZipParts([unit('1', 10 * MB)], { limits: small, base: { entries: 5, bytes: 10 * MB } });
    expect(fitting.parts).toHaveLength(1);
    const full = planZipParts([unit('1', 290 * MB)], { limits: small, base: { entries: 5, bytes: 50 * MB } });
    expect(full.parts).toHaveLength(2);
    expect(full.parts[1].files).toEqual([]);
  });

  it('lists the folders above a path', () => {
    expect(zipDirectoryPrefixes('a/b/c.txt')).toEqual(['a', 'a/b']);
    expect(zipDirectoryPrefixes('c.txt')).toEqual([]);
  });
});

describe('zipPartFileName', () => {
  it('leaves the name alone when there is a single ZIP', () => {
    expect(zipPartFileName('backup.zip', 1, 1)).toBe('backup.zip');
  });
  it('inserts the part number before the extension and pads it for sorting', () => {
    expect(zipPartFileName('backup.zip', 2, 3)).toBe('backup_part2.zip');
    expect(zipPartFileName('backup.ZIP', 2, 12)).toBe('backup_part02.ZIP');
    expect(zipPartFileName('backup', 1, 2)).toBe('backup_part1.zip');
  });
});
