/** 在字串左側或右側填充字元以達到指定長度
 * @param input 原始輸入
 * @param length 目標長度，預設為 2
 * @param padStr 填充用的字元，預設為 '0'
 * @param type 填充位置 'left' 或 'right'
 * @returns 填充後的字串
 */
export function pad(
    input: string | number,
    length = 2,
    padStr = '0',
    type: 'left' | 'right' = 'left'
): string {
    const str = String(input);
    if (type === 'left') {
        return str.padStart(length, padStr);
    }
    return str.padEnd(length, padStr);
}
