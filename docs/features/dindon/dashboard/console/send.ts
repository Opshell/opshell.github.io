import { fetchFailureHint } from './request';

// 控制台真的送出請求。不走 adminApi：這裡要的是原樣的回應（狀態碼、標頭、大小、時間），不是解析好的資料。

export interface SendInput {
    method: string;
    /** 完整網址（含 query） */
    url: string;
    /** 路徑（不含網域與 query），判斷 CORS 提示用 */
    path: string;
    token: string | null;
    body: unknown;
    signal?: AbortSignal;
}

export interface SendResult {
    /** 0＝沒收到回應（斷線、CORS、取消） */
    status: number;
    statusText: string;
    ms: number;
    size: number;
    contentType: string;
    /** 瀏覽器讀得到的回應標頭（跨網域時只有後端 expose 的那幾個） */
    headers: [string, string][];
    json?: unknown;
    text?: string;
    /** 圖片回應（大頭貼、截圖）：object URL，換下一個回應時要 revoke */
    imageUrl?: string;
    /** 沒收到回應時的說明 */
    failure?: string;
    aborted?: boolean;
}

export async function sendRequest(input: SendInput): Promise<SendResult> {
    const started = performance.now();
    let response: Response;
    try {
        response = await fetch(input.url, {
            method: input.method,
            cache: 'no-store',
            headers: {
                ...(input.token ? { Authorization: `Bearer ${input.token}` } : {}),
                ...(input.body !== undefined ? { 'Content-Type': 'application/json' } : {})
            },
            body: input.body !== undefined ? JSON.stringify(input.body) : undefined,
            signal: input.signal
        });
    } catch (error) {
        const aborted = error instanceof DOMException && error.name === 'AbortError';
        return {
            status: 0,
            statusText: '',
            ms: performance.now() - started,
            size: 0,
            contentType: '',
            headers: [],
            failure: aborted ? '已取消' : fetchFailureHint(input.path),
            aborted
        };
    }

    const blob = await response.blob();
    const ms = performance.now() - started;
    const contentType = response.headers.get('content-type') ?? '';
    const result: SendResult = {
        status: response.status,
        statusText: response.statusText,
        ms,
        size: blob.size,
        contentType,
        headers: [...response.headers.entries()]
    };

    if (contentType.startsWith('image/')) {
        result.imageUrl = URL.createObjectURL(blob);
        return result;
    }
    const text = await blob.text();
    if (contentType.includes('json') || /^\s*[[{]/.test(text)) {
        try {
            result.json = JSON.parse(text);
            return result;
        } catch {
            // 標頭說 JSON 但內容不是：當文字顯示
        }
    }
    result.text = text;
    return result;
}
