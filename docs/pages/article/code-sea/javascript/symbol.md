---
title: 'Symbol：獨一無二的 key，用在哪？'
image: ''
description: '兩個 Symbol 就算描述一樣也不會相等，所以很適合當不會撞名的 key。整理 Symbol 的特性、在 Vue provide/inject 的用法、不能被 JSON 序列化的限制，以及 Symbol.iterator 讓物件能被 for...of。'
keywords: ''
author: Opshell
createdAt: '2024-09-13'
categories:
  - JavaScript
tags:
  - JavaScript
  - Symbol
  - Vue
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：把原本的討論筆記整理成全文，修好原本辨識錯亂的 Symbol.iterator 範例。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
`Symbol` 是很多人「知道有這東西，但還沒實際在專案上用過」的語法。這篇整理自一段社群裡的討論：大家實際會把它用在哪、有什麼限制。

寫給聽過 `Symbol`，但不知道什麼時候該拿出來用的人。
:::

## 懶人包
- `Symbol` 是用來創造**獨一無二的值**，就算描述一樣，兩個 `Symbol` 也不會相等。
- 常見用途：當作不會撞名的 key（例如 Vue 的 `provide`／`inject`）、在執行環境內當作唯一識別碼、做「不容易被碰到」的屬性。
- 用 `Symbol` 當 key 的屬性，`for...in`、`Object.keys()`、`Object.getOwnPropertyNames()`、`JSON.stringify` 都看不到。
- `Symbol` **不能被序列化**，不能放進 JSON 傳給後端或存進 `localStorage`，只能活在當前的執行環境。
- `Symbol.iterator` 這種內建的 Symbol，可以讓自己的物件被 `for...of` 迭代，但平常很少用到。

## 技術拆解

### 獨一無二
`Symbol` 是創造獨特值用的，即便你把兩個變數都弄成一樣描述的 `Symbol`，它們之間也不會相等：

```ts
const mySymbol1 = Symbol('xxx');
const mySymbol2 = Symbol('xxx');

console.log(mySymbol1 === mySymbol2); // false
console.log(mySymbol1.description);   // 'xxx'，只是給人看的標籤
```

用生活比喻：`Symbol('xxx')` 像是幫你打一把新鑰匙，鑰匙圈上的名牌寫著 `xxx`。就算兩把鑰匙的名牌寫一樣的字，它們還是開不了對方的鎖。

例外是 `Symbol.for('xxx')`：它會去一個全域的登記處查，同樣的名字拿到的是**同一個** `Symbol`，適合要跨檔案、跨 iframe 共用的情況。

### 常見的兩個用法
討論裡提到最常見的兩個情境：

1. **代替 uuid**：在同一個執行環境裡，需要一個保證不重複的識別值時，`Symbol()` 一行就有，不用引入產生 uuid 的套件。
2. **建立「私有屬性」**：用 `Symbol` 當 key 的屬性，一般的遍歷方式都看不到。

第二點要打個引號，因為它不是真的私有：

```ts
const secret = Symbol('secret');
const user = { name: 'Opshell', [secret]: 'token' };

for (const key in user) { console.log(key); } // 只有 'name'
Object.keys(user);                             // ['name']
Object.getOwnPropertyNames(user);              // ['name']
JSON.stringify(user);                          // '{"name":"Opshell"}'

Object.getOwnPropertySymbols(user);            // [Symbol(secret)]，還是找得到
Reflect.ownKeys(user);                         // ['name', Symbol(secret)]
```

它比較像是「藏在抽屜裡」而不是「鎖在保險箱」。要真正的私有，class 裡用 `#` 開頭的私有欄位才是正解。

### 不能被序列化
`Symbol` 是個不能被序列化的東西，要跨傳資料、轉成 JSON 就會出問題，只能用在當前的執行環境：

```ts
JSON.stringify({ id: Symbol('a') });  // '{}'，值是 Symbol 的屬性直接消失
JSON.stringify([Symbol('a')]);        // '[null]'
```

所以「代替 uuid」只適用在前端自己內部用，要傳給後端、存進資料庫、放進 `localStorage` 的 id，還是乖乖用 `crypto.randomUUID()`。

## 例子與對比

### Vue 的 provide／inject：防止 key 意外重複
這是在 Vue 專案裡最實用的地方，[官方文件](https://vuejs.org/guide/components/provide-inject#working-with-symbol-keys)也推薦這樣做。

假設兩個不同的功能，都剛好用字串當 key：

```ts
const key1 = 'cod';
const key2 = 'cod';
```

因為 `key1` 和 `key2` 的值相同，比較深層的那個 `provide` 會把另一個蓋掉，inject 拿到的不是你要的東西，而且完全不會報錯。改成 `Symbol` 就不會有這個問題：

```ts
const key1 = Symbol();
const key2 = Symbol();
```

搭配 TypeScript 的 `InjectionKey`，連型別都一起帶過去：

```ts
// keys.ts
import type { InjectionKey, Ref } from 'vue';

export const themeKey: InjectionKey<Ref<'light' | 'dark'>> = Symbol('theme');
```

```vue
<!-- Parent.vue -->
<script setup lang="ts">
import { provide, ref } from 'vue';
import { themeKey } from './keys';

const theme = ref<'light' | 'dark'>('light');
provide(themeKey, theme);
</script>
```

```vue
<!-- Child.vue -->
<script setup lang="ts">
import { inject } from 'vue';
import { themeKey } from './keys';

const theme = inject(themeKey); // 型別自動是 Ref<'light' | 'dark'> | undefined
</script>
```

### Symbol.iterator：讓物件能被 for...of
討論的最後提到一個進階用法：一般物件不能用 `for...of` 迭代，如果要讓它可以，物件裡就必須先有一個 `Symbol.iterator` 方法，回傳一個有 `next()` 的迭代器：

```ts
const iterableObj = {
    items: ['a', 'b', 'c'],
    [Symbol.iterator]() {
        let index = 0;
        const items = this.items;

        return {
            next() {
                if (index < items.length) {
                    return { value: items[index++], done: false };
                }
                return { value: undefined, done: true };
            }
        };
    }
};

for (const item of iterableObj) {
    console.log(item); // 輸出 'a'、'b'、'c'
}
```

用 generator 寫會短很多：

```ts
const iterableObj = {
    items: ['a', 'b', 'c'],
    *[Symbol.iterator]() {
        yield* this.items;
    }
};
```

這只是為了讓自訂物件可以被迭代所做的功夫，基本上很少用到；大部分情況直接 `for (const item of obj.items)` 就好了。

### 什麼時候用、什麼時候別用

| 情境 | 用 `Symbol`？ | 替代 |
|---|---|---|
| Vue `provide`／`inject` 的 key | 是 | — |
| 前端內部、不出執行環境的唯一識別 | 可以 | 自增數字 |
| 要傳給後端或存起來的 id | 否 | `crypto.randomUUID()` |
| 真正的私有屬性 | 否 | class 的 `#private` 欄位 |
| 讓自訂物件可以 `for...of` | 是（`Symbol.iterator`） | 直接迭代裡面的陣列 |

## 結論
`Symbol` 的核心只有一句：**每一個都獨一無二**。最實用的地方是當作不會撞名的 key，在 Vue 裡就是 `provide`／`inject`；它不能序列化、也不是真的私有，這兩點記住就不會用錯地方。

知道有這東西但還沒用過的話，下次寫 `provide` 的時候就是個好機會。
