/** 在物件陣列中，根據指定的鍵值對查找第一個匹配的物件。
 * @param array 物件陣列
 * @param key 要匹配的鍵
 * @param value 要匹配的值
 */
export function findInArray<T extends Record<string, any>>(
    array: T[],
    key: keyof T,
    value: any
): T | undefined {
    return array.find(item => item[key] === value);
}

/** 將物件陣列格式化為適用於 Select 元件的選項格式。
 * @param array 物件陣列
 * @param titleKey 作為選項標題的鍵
 * @param valueKey 作為選項值的鍵
 */
export function formatToOptions<T extends Record<string, any>>(
    array: T[],
    titleKey: keyof T,
    valueKey: keyof T
): { title: T[keyof T], value: T[keyof T] }[] {
    return array.map(item => ({
        title: item[titleKey],
        value: item[valueKey]
    }));
}

/** 將陣列轉換為物件
 * @example arrayToObject([{ id: 1, name: 'A' }], 'id', 'name') -> { 1: 'A' }
 */
export function arrayToObject<T extends Record<string, any>>(
    array: T[],
    keyProp: keyof T,
    valueProp: keyof T
): Record<string, T[keyof T]> {
    return Object.fromEntries(
        array.map(item => [item[keyProp], item[valueProp]])
    );
}
