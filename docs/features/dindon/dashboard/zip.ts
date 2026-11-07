/**
 * 只「儲存」不壓縮的 zip（method 0），給後台一鍵下載截圖用（Flowsker #601）。
 * 截圖本來就是壓過的 JPEG／PNG，再 deflate 幾乎縮不了，所以不值得為此加一個 zip 套件。
 * 格式照 PKWARE APPNOTE.TXT 6.3.10：4.3.7 local file header、4.3.12 central directory、4.3.16 end of central directory。
 * 不支援 zip64：一包超過 4 GB 或 65535 個檔案就丟錯，後台的截圖遠遠用不到。
 */

export interface ZipEntry {
    /** 包內的路徑，用 `/` 分隔；可以有中文（會設 UTF-8 旗標） */
    name: string;
    data: Uint8Array;
    /** 解壓後檔案的修改時間，沒給用現在 */
    modified?: Date;
}

const LOCAL_HEADER = 0x04034B50;
const CENTRAL_HEADER = 0x02014B50;
const END_OF_CENTRAL = 0x06054B50;
/** 2.0：只用到 stored，1.0 其實就夠，但有些解壓工具看到資料夾或 UTF-8 旗標時期待 2.0 */
const VERSION = 20;
/** general purpose bit 11：檔名是 UTF-8（APPNOTE 4.4.4）。沒設的話 Windows 會用 CP437／Big5 亂解中文檔名 */
const FLAG_UTF8 = 0x0800;
const MAX_U32 = 0xFFFFFFFF;

let crcTable: Uint32Array | null = null;

/** CRC-32（IEEE 802.3，多項式 0xEDB88320 反射），zip 每個檔案都要附 */
export function crc32(data: Uint8Array): number {
    if (!crcTable) {
        crcTable = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
            crcTable[n] = c >>> 0;
        }
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

/** MS-DOS 的日期與時間（APPNOTE 4.4.6）：本地時間、秒數只有偶數，1980 年以前存成 1980-01-01 */
export function dosDateTime(date: Date): { time: number; date: number } {
    if (date.getFullYear() < 1980) return { time: 0, date: (1 << 5) | 1 };
    return {
        time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
        date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
    };
}

export function createZip(entries: ZipEntry[]): Uint8Array<ArrayBuffer> {
    if (entries.length > 0xFFFF) throw new Error('zip 最多 65535 個檔案');
    const encoder = new TextEncoder();
    const prepared = entries.map((entry) => {
        const name = encoder.encode(entry.name);
        if (name.length > 0xFFFF) throw new Error(`檔名太長：${entry.name}`);
        return { name, data: entry.data, crc: crc32(entry.data), ...dosDateTime(entry.modified ?? new Date()) };
    });

    const localSize = prepared.reduce((sum, e) => sum + 30 + e.name.length + e.data.length, 0);
    const centralSize = prepared.reduce((sum, e) => sum + 46 + e.name.length, 0);
    if (localSize + centralSize > MAX_U32) throw new Error('檔案太大，超過 zip 的 4 GB 上限');

    const out = new Uint8Array(new ArrayBuffer(localSize + centralSize + 22));
    const view = new DataView(out.buffer);
    let at = 0;
    const u16 = (value: number) => {
        view.setUint16(at, value, true);
        at += 2;
    };
    const u32 = (value: number) => {
        view.setUint32(at, value, true);
        at += 4;
    };
    const bytes = (value: Uint8Array) => {
        out.set(value, at);
        at += value.length;
    };

    const offsets: number[] = [];
    for (const e of prepared) {
        offsets.push(at);
        u32(LOCAL_HEADER);
        u16(VERSION);
        u16(FLAG_UTF8);
        u16(0); // method 0 = stored
        u16(e.time);
        u16(e.date);
        u32(e.crc);
        u32(e.data.length); // 壓縮後大小：stored 跟原本一樣
        u32(e.data.length);
        u16(e.name.length);
        u16(0); // extra field
        bytes(e.name);
        bytes(e.data);
    }

    const centralStart = at;
    prepared.forEach((e, i) => {
        u32(CENTRAL_HEADER);
        u16(VERSION); // version made by：高位 0 = MS-DOS，外部屬性用不到
        u16(VERSION);
        u16(FLAG_UTF8);
        u16(0);
        u16(e.time);
        u16(e.date);
        u32(e.crc);
        u32(e.data.length);
        u32(e.data.length);
        u16(e.name.length);
        u16(0); // extra field
        u16(0); // file comment
        u16(0); // disk number start
        u16(0); // internal attributes
        u32(0); // external attributes
        u32(offsets[i]);
        bytes(e.name);
    });

    // 大小要在寫 end record 之前算：寫的過程中 at 會一直往後走
    const centralLength = at - centralStart;
    u32(END_OF_CENTRAL);
    u16(0); // 這是第幾片
    u16(0); // central directory 從第幾片開始
    u16(prepared.length);
    u16(prepared.length);
    u32(centralLength);
    u32(centralStart);
    u16(0); // zip 註解長度
    return out;
}
