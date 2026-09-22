// 期間字串 → 月數與「Xy Ym」。月初入職、月底離職，所以頭尾兩個月都算，加 1。
export function monthsOf(period: string): number {
    const [start, end] = period.split(' - ').map(s => s.trim());
    const toDate = (s: string) => {
        const [y, m] = s.split('.').map(Number);
        return new Date(y, m - 1);
    };
    const from = toDate(start);
    const to = end === 'Now' ? new Date() : toDate(end);
    return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1;
}

export function formatMonths(total: number): string {
    const years = Math.floor(total / 12);
    const months = total % 12;
    return [years ? `${years}y` : '', months ? `${months}m` : ''].filter(Boolean).join(' ') || '0m';
}
