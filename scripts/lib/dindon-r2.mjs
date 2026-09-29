import { createHash } from 'node:crypto';
import * as path from 'node:path';
import process from 'node:process';
import { AwsClient } from 'aws4fetch';

// 叮咚記帳的 R2 儲體 dindon-demo（網域 dindon-demo.opshell.me）：功能演示（sync-dindon-demos）與宣傳短片（sync-dindon-promo）共用。
// 建置步驟與權杖的權限見 docs/devlog/R2-儲體建置與流程.md。
//
// 上傳要 R2 的 API 權杖（物件讀取和寫入，只套用到 dindon-demo），寫在倉庫根目錄的 .env.local（已 gitignore）：
//   R2_DINDON_ENDPOINT=https://<帳號 ID>.r2.cloudflarestorage.com（不含儲體名稱）
//   R2_DINDON_ACCESS_KEY_ID=…
//   R2_DINDON_SECRET_ACCESS_KEY=…

export const BUCKET = 'dindon-demo';
/**
 * 儲體裡的分區：功能演示直接放根目錄（最早就這樣放，網址不要動），宣傳短片放 promo/。
 * 各腳本 --prune 只清自己那一區，不會刪到別人的檔案
 */
export const PROMO_DIR = 'promo/';
export const PUBLIC_BASE = 'https://dindon-demo.opshell.me/';

export const CONTENT_TYPES = { '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
export const contentType = file => CONTENT_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';

/** 02-dedupe.mp4 → 02-dedupe.1a2b3c4d.mp4：內容變了網址就變，可以放心讓瀏覽器與 CDN 長期快取 */
export function hashedName(file, body) {
    const { name, ext } = path.parse(file);
    return `${name}.${createHash('sha256').update(body).digest('hex').slice(0, 8)}${ext}`;
}

/** 讀倉庫根目錄的 .env.local／.env（沒有也沒關係：--dry 照樣能跑） */
export function loadEnv(root) {
    for (const file of ['.env.local', '.env']) {
        try {
            process.loadEnvFile(path.join(root, file));
        } catch {
            // 沒有這個檔
        }
    }
}

/** 金鑰不齊就結束程式；dry 的時候不用金鑰 */
export function createR2({ dry = false } = {}) {
    const {
        R2_DINDON_ENDPOINT: endpoint,
        R2_DINDON_ACCESS_KEY_ID: accessKeyId,
        R2_DINDON_SECRET_ACCESS_KEY: secretAccessKey
    } = process.env;
    if (!dry && !(endpoint && accessKeyId && secretAccessKey)) {
        console.error('缺少 R2 的金鑰：在倉庫根目錄的 .env.local 設 R2_DINDON_ENDPOINT、R2_DINDON_ACCESS_KEY_ID、R2_DINDON_SECRET_ACCESS_KEY（格式見 scripts/lib/dindon-r2.mjs 開頭）。\n只想看會傳哪些檔案：加 --dry');
        process.exit(1);
    }

    const client = new AwsClient({ accessKeyId: accessKeyId ?? '', secretAccessKey: secretAccessKey ?? '', service: 's3', region: 'auto' });
    const bucketUrl = `${endpoint?.replace(/\/$/, '')}/${BUCKET}`;
    const objectUrl = key => `${bucketUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;

    async function r2Fetch(url, init) {
        const response = await client.fetch(url, init);
        if (!response.ok && !(init?.method === 'HEAD' && response.status === 404)) {
            throw new Error(`R2 ${init?.method ?? 'GET'} ${url} → ${response.status} ${await response.text()}`);
        }
        return response;
    }

    return {
        /** R2 上已經有同名檔案就不傳（檔名帶雜湊：同名＝同內容）。有傳回 true */
        async putIfMissing({ key, body, type }) {
            if ((await r2Fetch(objectUrl(key), { method: 'HEAD' })).ok) return false;
            await r2Fetch(objectUrl(key), {
                method: 'PUT',
                body,
                headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable' }
            });
            return true;
        },

        /** 前綴底下現有的所有檔名（空字串＝整個儲體） */
        async listKeys(prefix = '') {
            const keys = [];
            let token = '';
            do {
                const query = new URLSearchParams({ 'list-type': '2', prefix, ...(token ? { 'continuation-token': token } : {}) });
                const xml = await (await r2Fetch(`${bucketUrl}?${query}`)).text();
                keys.push(...[...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map(match => match[1]));
                token = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/)?.[1] ?? '';
            } while (token);
            return keys;
        },

        async remove(key) {
            await r2Fetch(objectUrl(key), { method: 'DELETE' });
        }
    };
}
