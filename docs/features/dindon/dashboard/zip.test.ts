import { describe, expect, it } from 'vitest';
import { crc32, createZip, dosDateTime } from './zip';

const text = (s: string) => new TextEncoder().encode(s);

/** 照 APPNOTE 讀回來：從 end record 找 central directory，再跟著 offset 讀每個 local header，兩邊要一致 */
function readZip(zip: Uint8Array) {
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    const end = zip.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054B50);
    const count = view.getUint16(end + 10, true);
    const centralSize = view.getUint32(end + 12, true);
    const centralStart = view.getUint32(end + 16, true);
    expect(centralStart + centralSize).toBe(end);

    const decoder = new TextDecoder();
    const files: { name: string; data: Uint8Array; crc: number; flags: number; method: number; time: number; date: number }[] = [];
    let at = centralStart;
    for (let i = 0; i < count; i++) {
        expect(view.getUint32(at, true)).toBe(0x02014B50);
        const flags = view.getUint16(at + 8, true);
        const method = view.getUint16(at + 10, true);
        const crc = view.getUint32(at + 16, true);
        const size = view.getUint32(at + 20, true);
        expect(view.getUint32(at + 24, true)).toBe(size);
        const nameLength = view.getUint16(at + 28, true);
        const offset = view.getUint32(at + 42, true);
        const name = decoder.decode(zip.subarray(at + 46, at + 46 + nameLength));

        expect(view.getUint32(offset, true)).toBe(0x04034B50);
        expect(view.getUint16(offset + 6, true)).toBe(flags);
        expect(view.getUint32(offset + 14, true)).toBe(crc);
        expect(view.getUint16(offset + 26, true)).toBe(nameLength);
        const dataStart = offset + 30 + nameLength + view.getUint16(offset + 28, true);
        files.push({
            name,
            data: zip.subarray(dataStart, dataStart + size),
            crc,
            flags,
            method,
            time: view.getUint16(offset + 10, true),
            date: view.getUint16(offset + 12, true)
        });
        at += 46 + nameLength;
    }
    return files;
}

describe('crc32', () => {
    it('對上公認的檢查值', () => {
        expect(crc32(text('123456789'))).toBe(0xCBF43926);
        expect(crc32(text('The quick brown fox jumps over the lazy dog'))).toBe(0x414FA339);
        expect(crc32(new Uint8Array())).toBe(0);
    });
});

describe('dosDateTime', () => {
    it('年從 1980 起算、月從 1、秒只存一半', () => {
        expect(dosDateTime(new Date(2026, 10, 7, 13, 45, 31))).toEqual({
            time: (13 << 11) | (45 << 5) | 15,
            date: (46 << 9) | (11 << 5) | 7
        });
    });
});

describe('createZip', () => {
    it('讀得回每個檔案：中文檔名設 UTF-8 旗標、不壓縮、CRC 對得上', () => {
        const png = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0, 255, 1, 2]);
        const when = new Date(2026, 10, 7, 9, 30, 0);
        const files = readZip(createZip([
            { name: '回報12-截圖01.png', data: png, modified: when },
            { name: 'b.txt', data: text('hello'), modified: when }
        ]));
        expect(files.map(f => f.name)).toEqual(['回報12-截圖01.png', 'b.txt']);
        expect([...files[0].data]).toEqual([...png]);
        expect(new TextDecoder().decode(files[1].data)).toBe('hello');
        for (const f of files) {
            expect(f.method).toBe(0);
            expect(f.flags & 0x0800).toBe(0x0800);
            expect(f.crc).toBe(crc32(f.data));
            expect(f.date).toBe(dosDateTime(when).date);
        }
    });

    it('空的也是合法的 zip（只有 end record）', () => {
        const zip = createZip([]);
        expect(zip.length).toBe(22);
        expect(readZip(zip)).toEqual([]);
    });
});
