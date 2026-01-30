/** 深拷貝
 * @description 瀏覽器原生 API 支援 Date, RegExp, Map, Set, ArrayBuffer 等多種類型。
 * @warning 無法拷貝函式。
 * @param obj 要拷貝的物件
 */
export function deepCopy<T>(obj: T): T {
    return structuredClone(obj);
}

/** 一些情況中 structuredClone 不適用
 * @description JSON 相容型別（物件、陣列、字串、數字、布林、null）通常使用在前後端資料回傳的物件深拷貝
 * @warning 無法處理 Date 物件（會被轉成字串）、undefined（屬性會被移除）、Function、Map、Set 等複雜型別。
 * @param obj
 * @return obj
 */
export function deepCopyJJ<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

// 判斷是否為非 null 的物件
export function isObject(value: unknown): value is Record<string, any> {
    return value !== null && typeof value === 'object';
}

// 判斷物件是否為空
export function isObjEmpty<T extends object>(obj: T): boolean {
    return Object.keys(obj).length === 0;
}

/** [-] 深度比對兩個物件是否相等
 * @param objA 物件 A
 * @param objB 物件 B
 * @returns boolean
 */
export function isObjEqual<T extends object>(objA: T, objB: T): boolean {
    // 檢查記憶體位置是否相同
    if (objA === objB) { return true; }

    // 檢查是否其中一方為 null 或不是 object
    if (
        typeof objA !== 'object'
        || typeof objB !== 'object'
        || objA === null
        || objB === null
    ) {
        return false;
    }

    // 比較兩者的 key 數量
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) { return false; }

    // 遞迴遍歷比對 value
    for (const key of keysA) {
    // 使用 as keyof T 來確保 key 的型別正確
        const keyTyped = key as keyof T;

        // 如果 B 沒有 A 的 key，或者遞迴比對子屬性不相等，則回傳 false
        if (
            !Object.prototype.hasOwnProperty.call(objB, key)
            || !isObjEqual(objA[keyTyped] as any, objB[keyTyped] as any)
        ) {
            return false;
        }
    }

    // 5. 所有檢查都通過，物件相等
    return true;
}

// 簡化版的 hasOwnProperty 檢查
export function hasOwn(obj: object, key: string | symbol): key is keyof typeof obj {
    return Object.prototype.hasOwnProperty.call(obj, key);
}
