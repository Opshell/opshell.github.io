---
title: 幫文件站加鍵盤快捷鍵：enum + 策略模式，key 和 code 分開管
image: ''
description: '左右方向鍵翻上一篇、下一篇，按 Q 打開搜尋。用 enum 列舉按鍵、策略表對應動作，event.key 與 event.code 各管各的；再補上輸入框、輸入法與事件清除這些實務上一定會踩的坑。'
keywords: ''
author: Opshell
createdAt: '2024-09-19'
categories:
  - 使用實例
tags:
  - TypeScript
  - Vue
  - VitePress
  - 策略模式
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的程式碼寫成全文，補上 key 與 code 的分工、輸入框與輸入法的防呆、`in` 會查到原型鏈的問題，以及修正版。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
[Enum 使用實例](./enum) 第 3 點提到：產品如果需要快捷鍵支援，可以用策略模式 + `enum` 來做。那篇只放了骨架，這篇是一個完整、能直接放進 `VitePress` 文件站的版本：左右方向鍵切換上一篇、下一篇，按 `Q` 打開搜尋。`key` 和 `code` 的基本差別在 [keyCode 退休了](../javascript/keycode) 有整理，這裡專心講怎麼把它們組成一套好維護的快捷鍵。
:::

## 懶人包
- 用 `enum` 列舉按鍵，用一張「按鍵 → 動作」的策略表取代一長串 `if / else`，新增快捷鍵就是表上加一行。
- 方向鍵看 `event.key`，字母鍵看 `event.code`：前者是「這個鍵代表什麼」，後者是「按到哪個實體位置」，切到中文輸入法照樣抓得到。
- 一定要擋掉正在輸入的情況：焦點在輸入框、輸入法組字中、按著 Ctrl / Cmd 的時候都不要觸發。
- 查表用 `Object.hasOwn` 而不是 `in`，`in` 會連原型鏈上的 `toString` 都當成有。
- 在 `onMounted` 綁、`onBeforeUnmount` 拆，SSR 不會出事，換頁也不會越綁越多。

## 技術拆解

### 原本的寫法
```ts
// 鍵盤事件綁定
enum Key {
    LEFT = 'ArrowLeft',
    RIGHT = 'ArrowRight'
}
enum Code {
    Q = 'KeyQ'
}

function selectorClickHandler(selector: string) {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
        element.click();
    }
}

function leftHandler() {
    selectorClickHandler('.pager-link.prev');
}
function rightHandler() {
    selectorClickHandler('.pager-link.next');
}
function qHandler() {
    selectorClickHandler('.DocSearch.DocSearch-Button');
}

const keyStrategies: { [key in Key]: () => void } = {
    [Key.LEFT]: leftHandler,
    [Key.RIGHT]: rightHandler
};
const codeStrategies: { [key in Code]: () => void } = {
    [Code.Q]: qHandler
};

function keyDownHandler(event: KeyboardEvent) {
    const key = event.key as Key;
    if (key in keyStrategies) {
        keyStrategies[key]();
    }

    const Code = event.code as Code;
    if (Code in codeStrategies) {
        codeStrategies[Code]();
    }
}

onMounted(() => {
    window.addEventListener('keydown', keyDownHandler);
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', keyDownHandler);
});
```

骨架很清楚：

- `enum Key`、`enum Code` 把會用到的按鍵列出來，程式裡寫 `Key.LEFT` 比寫 `'ArrowLeft'` 不容易打錯。
- `keyStrategies`、`codeStrategies` 是策略表，`{ [key in Key]: () => void }` 這個型別保證 `enum` 裡的每一個按鍵都有對應的動作，`enum` 多一個值、表上沒補，編譯器會叫。
- `keyDownHandler` 只負責查表，不管「左鍵要做什麼」。
- 動作本身就是去點畫面上那顆按鈕，`VitePress` 預設主題的上一篇／下一篇連結和搜尋按鈕都在，不用自己重寫換頁邏輯。

### 為什麼要分成 key 和 code 兩張表
方向鍵用 `event.key` 判斷，`Q` 卻用 `event.code`，這不是手滑，是刻意的：

- `event.key` 是-|這個鍵代表的值|-。方向鍵不管什麼鍵盤配置、什麼輸入法，`key` 都是 `'ArrowLeft'`，用它最直覺。
- 字母鍵就不一樣了。切到注音輸入法按 `Q`，`event.key` 可能是 `'Process'` 或注音符號；按著 Shift 是 `'Q'`，沒按是 `'q'`。這時候改看 `event.code`，它代表的是-|實體按鍵的位置|-，永遠是 `'KeyQ'`。

所以這套分法是：功能鍵看 `key`，字母鍵看 `code`。~~台灣工程師的快捷鍵，不能假設使用者開的是英文輸入法。~~

### 要修的幾個地方
原本的版本能動，但放到真的網站上會遇到這些問題：

1. **在輸入框裡也會觸發**：使用者在搜尋框打字，按左右鍵想移動游標，結果整頁換到上一篇。按 `Q` 想打字，結果又開了一次搜尋。
2. **輸入法組字中也會觸發**：用注音打字選字時，按方向鍵是在選候選字，`event.isComposing` 會是 `true`，這時候不該攔截。
3. **跟系統快捷鍵打架**：`Cmd + ←` 在 Mac 是瀏覽器上一頁，不該被我們的左鍵吃掉。
4. **`in` 會查到原型鏈**：`'toString' in keyStrategies` 是 `true`。按鍵的值不太可能剛好是 `toString`，但 `event.key as Key` 這個斷言本身就是在說謊，`event.key` 什麼字串都可能出現。用 `Object.hasOwn` 寫成型別守衛，檢查跟型別縮小一次完成。
5. **變數名稱遮蔽**：`const Code = event.code as Code` 在函式裡宣告了一個跟 `enum Code` 同名的變數，型別位置的 `Code` 還能找到 `enum`，但值的 `Code` 已經被蓋掉了，讀的人很容易看錯，改成小寫 `code`。

## 例子與對比

### 修正版
放在自訂主題的 Layout 元件裡（`VitePress` 擴充預設主題的方式以官方文件為準）：

```vue
<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';

enum Key {
    LEFT = 'ArrowLeft',
    RIGHT = 'ArrowRight'
}
enum Code {
    Q = 'KeyQ'
}

function selectorClickHandler(selector: string) {
    document.querySelector<HTMLElement>(selector)?.click();
}

const keyStrategies: Record<Key, () => void> = {
    [Key.LEFT]: () => selectorClickHandler('.pager-link.prev'),
    [Key.RIGHT]: () => selectorClickHandler('.pager-link.next')
};
const codeStrategies: Record<Code, () => void> = {
    [Code.Q]: () => selectorClickHandler('.DocSearch.DocSearch-Button')
};

// 型別守衛：檢查是不是表上有的鍵，順便把 string 縮小成 Key / Code
function isKey(key: string): key is Key {
    return Object.hasOwn(keyStrategies, key);
}
function isCode(code: string): code is Code {
    return Object.hasOwn(codeStrategies, code);
}

// 焦點在可輸入的元素上時，按鍵是給使用者打字用的
function isTyping(target: EventTarget | null) {
    return target instanceof HTMLElement
        && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

function keyDownHandler(event: KeyboardEvent) {
    if (event.isComposing || event.repeat) { return; }
    if (event.ctrlKey || event.metaKey || event.altKey) { return; }
    if (isTyping(event.target)) { return; }

    if (isKey(event.key)) {
        keyStrategies[event.key]();
        return;
    }
    if (isCode(event.code)) {
        event.preventDefault(); // 避免 q 被打進剛打開的搜尋框
        codeStrategies[event.code]();
    }
}

onMounted(() => {
    window.addEventListener('keydown', keyDownHandler);
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', keyDownHandler);
});
</script>
```

`selectorClickHandler` 用 `querySelector<HTMLElement>` 的泛型加上 `?.`，比 `as HTMLElement` 再 `if` 誠實：找不到元素時型別就是 `null`，不用先騙編譯器再自己檢查。

事件綁在 `onMounted` 也很重要。`VitePress` 會在建置時做 SSR，伺服器端沒有 `window`，寫在 `setup` 頂層會直接炸；`onMounted` 只在瀏覽器執行，`onBeforeUnmount` 拆掉則確保元件重新掛載時不會綁出第二份。

### if / else vs 策略表

| | 一長串 if / else | enum + 策略表 |
| :--- | :--- | :--- |
| 新增快捷鍵 | 在函式裡再插一段判斷 | `enum` 加一個值、表上加一行 |
| 忘了寫對應動作 | 不會有任何提示 | 編譯器報錯 |
| 看有哪些快捷鍵 | 讀完整個函式 | 看那張表 |
| 防呆邏輯 | 每段各自處理 | 在查表前統一處理一次 |

## 結論
快捷鍵是那種「做起來五分鐘，做好要半天」的功能：會動很簡單，難的是不要在使用者打字、選字、按系統快捷鍵的時候跳出來搗亂。

把按鍵列成 `enum`、動作放進策略表、防呆集中在查表前面，之後要加 `/` 開搜尋、`T` 回到頂端，都只是表上多一行的事。~~至於要不要做 Vim 模式，那是另一個坑了。~~
