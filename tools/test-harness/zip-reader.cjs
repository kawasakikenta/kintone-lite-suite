'use strict';
// 画面ハーネス用: ダウンロードされた ZIP を、作成側の実装とは別に読み戻す（中央ディレクトリの解析・inflate・CRC-32 の照合）。
const assert = require('node:assert/strict');
const zlib = require('node:zlib');

/** @returns {Map<string, { data: Buffer, method: number, flags: number, isFolder: boolean }>} 名前 → エントリ（出現順） */
function readZip(buffer) {
  let end = buffer.length - 22;
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end -= 1;
  assert.ok(end >= 0, 'ZIP の終端レコードが見つかりません');
  const count = buffer.readUInt16LE(end + 10);
  let pos = buffer.readUInt32LE(end + 16);
  const entries = new Map();
  for (let i = 0; i < count; i += 1) {
    assert.equal(buffer.readUInt32LE(pos), 0x02014b50, '中央ディレクトリの署名が不正です');
    const flags = buffer.readUInt16LE(pos + 8);
    const method = buffer.readUInt16LE(pos + 10);
    const crc = buffer.readUInt32LE(pos + 16);
    const compressedSize = buffer.readUInt32LE(pos + 20);
    const size = buffer.readUInt32LE(pos + 24);
    const nameLength = buffer.readUInt16LE(pos + 28);
    const extraLength = buffer.readUInt16LE(pos + 30);
    const commentLength = buffer.readUInt16LE(pos + 32);
    const localOffset = buffer.readUInt32LE(pos + 42);
    const name = buffer.subarray(pos + 46, pos + 46 + nameLength).toString('utf8');
    assert.equal(buffer.readUInt32LE(localOffset), 0x04034b50, `${name}: ローカルヘッダの署名が不正です`);
    const dataStart = localOffset + 30 + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28);
    const raw = buffer.subarray(dataStart, dataStart + compressedSize);
    assert.ok(method === 0 || method === 8, `${name}: 未対応の圧縮方式 ${method}`);
    const data = method === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw);
    assert.equal(data.length, size, `${name}: 展開後の大きさが一致しません`);
    if (typeof zlib.crc32 === 'function') assert.equal(zlib.crc32(data), crc, `${name}: CRC-32 が一致しません`);
    assert.equal(flags & 0x0800, 0x0800, `${name}: UTF-8 のファイル名フラグがありません`);
    entries.set(name, { data, method, flags, isFolder: name.endsWith('/') });
    pos += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

module.exports = { readZip };
