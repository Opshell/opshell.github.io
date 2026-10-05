---
title: 'Hoisting，以及那些讓你以為是 Hoisting 的東西'
image: ''
description: 'var 會被提升成 undefined、let 和 const 有暫時性死區、函式宣告整個被搬上去。另外整理一個常被誤會成 hoisting 的現象：console.log 印物件，看到的卻是後來才改的內容。'
keywords: ''
author: Opshell
createdAt: '2024-10-04'
categories:
  - JavaScript
tags:
  - JavaScript
  - debug
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的筆記寫成全文（真正的 hoisting，加上 console.log 物件參考造成的假象）。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
趕火車班不會講的東西大概都講了：hoisting，和會讓你以為是 hoisting 的東西也是。

常見的情況是：在程式的前面 `console.log` 一個物件，後面才 `delete` 它的屬性，結果前面印出來的東西，那個屬性已經不見了。看起來就像後面的程式「被提升」到前面先執行了。其實不是，這篇把真的 hoisting 和這個假象分開講清楚。
:::

## 懶人包
- Hoisting 是指**宣告**在執行前就先被登記，不是程式碼真的被搬到最上面。
- `var` 會先被登記成 `undefined`；`let`、`const`、`class` 也有登記，但宣告前碰到會丟 `ReferenceError`（暫時性死區）。
- 函式宣告整個被提升，可以先呼叫再宣告；函式表達式、箭頭函式則跟著變數的規則走。
- `console.log` 物件看到「未來」的內容不是 hoisting：`delete` 和 `console.log` 一樣是同步執行，是 DevTools 展開物件時才去讀**同一個參考**的當下內容。
- 要看「印的那一刻」的樣子，就印一份複本：`structuredClone(obj)` 或 `JSON.stringify(obj)`。

## 技術拆解

### 真正的 hoisting
JavaScript 在執行一段程式之前，會先掃一遍，把裡面的宣告登記起來。用開會比喻：會議開始前，主持人先把今天會出現的人名寫在白板上，但人還沒到場。

```ts
console.log(a); // undefined：名字在白板上，人還沒到，先給 undefined
var a = 1;

console.log(b); // ReferenceError：名字在白板上，但規定到場前不准叫
let b = 2;

sayHi(); // 'hi'：函式宣告連人帶內容一起先到場
function sayHi() {
    console.log('hi');
}

sayBye(); // TypeError: sayBye is not a function（var 版本是 undefined，不能呼叫）
var sayBye = function () {
    console.log('bye');
};
```

| 宣告方式 | 有沒有被登記 | 宣告前使用 |
|---|---|---|
| `var` | 有，值是 `undefined` | 拿到 `undefined` |
| `let`／`const` | 有 | `ReferenceError`（暫時性死區） |
| `class` | 有 | `ReferenceError` |
| `function` 宣告 | 有，連內容 | 可以正常呼叫 |
| 函式表達式／箭頭函式 | 跟著 `var`／`let`／`const` 的規則 | 不能呼叫 |

`let` 跟 `const` 常被說成「沒有 hoisting」，其實有，證據是這個：

```ts
const name = 'outer';

function test() {
    console.log(name); // ReferenceError，而不是印出 'outer'
    const name = 'inner';
}
```

如果 `const name` 沒被提升，這裡應該往外找到 `'outer'` 才對；它丟錯，代表內層的 `name` 早就被登記了，只是還在死區裡不准碰。

### 讓你以為是 hoisting 的東西
這是原本筆記的重點：物件的 `delete` 指令和 `console.log` 是一樣的同步指令，照順序執行，誰也沒被提升。只是物件的 reference 特性，會讓你看到不同地方散落的 log，都指向同一個物件，而且還一樣的內容，你就會以為它被 hoisting 了。

```ts
const user = { name: 'Opshell', token: 'abc123' };

console.log('刪除前', user);
delete user.token;
console.log('刪除後', user);
```

在 Chrome DevTools 裡，兩行收合起來的預覽通常是對的（第一行有 `token`），但**點開第一行**，你會發現 `token` 不見了，旁邊還有一個小小的 `i` 圖示，滑上去寫著「這個值是在第一次展開時才讀取的」。

原因是 `console.log` 印物件時，存的是**參考**，不是複本。你點開的那一刻，DevTools 才順著參考去讀物件現在的樣子，而那時候 `delete` 早就跑完了。兩行 log 指向同一個物件，所以展開後一模一樣。

用比喻來說：`console.log` 不是幫物件拍照，是幫你記下它家的地址，你點開的時候才去它家看，家具當然是最新的擺法。

## 例子與對比

### 想看「當下」的樣子
```ts
const user = { name: 'Opshell', token: 'abc123' };

console.log('刪除前', structuredClone(user)); // 深拷貝，保留當下的樣子
console.log('刪除前', JSON.stringify(user)); // 直接變字串，最保險
console.log('刪除前', { ...user });           // 淺拷貝，巢狀物件還是會被影響
delete user.token;
```

| 寫法 | 印出當下的樣子 | 巢狀物件 | 備註 |
|---|---|---|---|
| `console.log(obj)` | 預覽是，展開不是 | 不是 | 最容易誤會 |
| `console.log({ ...obj })` | 第一層是 | 不是 | 淺拷貝 |
| `console.log(structuredClone(obj))` | 是 | 是 | 函式、DOM 不能複製 |
| `console.log(JSON.stringify(obj))` | 是 | 是 | 變成字串，`undefined` 和函式會消失 |
| 中斷點 `debugger` | 是 | 是 | 直接停在那一刻，最準 |

在 Vue 裡印響應式物件也是同一個道理，`console.log(state)` 看到的是 `Proxy`，展開時讀的是最新值；想看當下的資料，用 `structuredClone(toRaw(state))` 或 `JSON.stringify(state)`。

### 怎麼判斷是不是真的 hoisting
- 印的是**原始型別**（數字、字串）還出現「未來的值」→ 真的是執行順序的問題，去查是不是 `var` 或非同步。
- 印的是**物件**，展開後內容是「未來的」→ 八成是參考，印一份複本再看一次。
- 拿不準，就下 `debugger` 中斷點，一步一步跑，誰先誰後一目了然。

## 結論
Hoisting 是宣告先登記、值晚點到；`console.log` 物件看到未來，是參考在作怪，兩個是完全不同的事。

下次看到 log 穿越時空，先別怪 hoisting，~~它已經背太多黑鍋了~~，印一份複本再說。
