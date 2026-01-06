/** [- ]基本的 Throttle 函式 (節流)
 * 確保函式在指定的時間間隔 (limit) 內最多只執行一次。
 * 包含 Leading (立即執行) 與 Trailing (結束後補執行) 特性。
 *
 * @param func 要執行的函式
 * @param limit 時間間隔 (ms)
 * @returns 經過節流處理的新函式
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean = false;
    let lastFunc: ReturnType<typeof setTimeout> | undefined;
    let lastRan: number;

    return function (this: any, ...args: Parameters<T>) {
        const context = this;

        if (!inThrottle) {
            // [Leading] 第一次觸發，立即執行
            func.apply(context, args);
            lastRan = Date.now();
            inThrottle = true;

            // 設定計時器來重置 throttle 狀態
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        } else {
            // [Trailing] 如果還在冷卻時間內，清除舊的計時器，設定一個新的
            // 確保最後一次操作會在冷卻結束後執行
            clearTimeout(lastFunc);

            lastFunc = setTimeout(function () {
                if (Date.now() - lastRan >= limit) {
                func.apply(context, args);
                lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}