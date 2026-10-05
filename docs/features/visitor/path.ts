// 送給 POST /v1/blog/hit 的路徑（api.md 第 22 節）。後端把字串原樣當成一頁，
// 所以同一頁一定要送出同一個字串：一律先解碼、再用 encodeURI 編回去，中文與空白都變成百分比編碼。
// 後端不收空白，而文章檔名有 40 個帶空白，這也是不送原樣中文的原因。

// 這些頁面不計數：後台與帳號頁不是給讀者看的，而且手上有 Google 的登入憑證
const SKIP_PREFIXES = ['/dindon/dashboard/', '/dindon/account/'];

// 跟後端的上限一致，超過就不送，免得白打一次 400
const MAX_PATH_BYTES = 300;

/** 路由的路徑 → 要送的字串；不該計數或後端不收的回 null */
export function normalizeHitPath(routePath: string): string | null {
    let path = routePath.split(/[?#]/)[0];
    try {
        path = decodeURI(path);
    } catch {
        // 不合法的百分比編碼：照原樣處理，後面 encodeURI 會把 % 再編一次，至少每次都一樣
    }

    // /a/index.html 跟 /a/ 是同一頁
    path = path.replace(/\/index\.html$/, '/');
    if (!path.startsWith('/')) path = `/${path}`;

    if (SKIP_PREFIXES.some(prefix => path.startsWith(prefix))) return null;
    if (path.includes('..') || path.includes('//')) return null;

    const encoded = encodeURI(path);
    if (encoded.length > MAX_PATH_BYTES) return null;
    return encoded;
}
