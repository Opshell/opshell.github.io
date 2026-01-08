export function formatNumber(num: number | string, digits: number = 1): string {
    const n = Number(num);
    if (isNaN(n)) return String(num); // 處理還沒載入時的 '--'

    if (n < 1000) return String(n);

    // 處理 k, m
    if (n >= 1000000) {
        return (n / 1000000).toFixed(digits).replace(/\.0$/, '') + 'm';
    }
    if (n >= 1000) {
        return (n / 1000).toFixed(digits).replace(/\.0$/, '') + 'k';
    }
    return String(n);
}