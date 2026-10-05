---
title: any、unknown 與 TS 工程師的掙扎
image: ''
description: 'any 讓編譯器閉嘴，unknown 逼你先檢查再使用。連 AI 都愛寫 any 和 as any 的時代，該怎麼用 linter、tsc 與執行期驗證把不確定性關在門口。'
keywords: ''
author: Opshell
createdAt: '2025-08-21'
categories:
  - TypeScript
tags:
  - TypeScript
  - 型別管理
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：保留原本的緣起與結語，補上懶人包、unknown 的縮小方式、as 斷言的問題、lint 設定與對照表。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
這篇是「型別管理」系列的一篇，跟 [as const 與 satisfies](./as-const-與-satisfies-型別的微妙邊界)、[Zod 與 TS 型別管理的心智負擔](./zod-與-ts-型別管理的心智負擔) 是同一場群組討論延伸出來的。寫給每次看到紅色蚯蚓，手指就不自覺打出 `any` 的人（包括 AI）。
:::

## 懶人包
- `any` 是編譯器直接放棄檢查，等於沒寫；`unknown` 是「我不知道它是什麼，所以你用之前要先證明」。
- 收到不確定的資料時用 `unknown`，再用 `typeof`、`instanceof`、`in` 或型別守衛把它縮小。
- `as` 斷言跟 `any` 一樣是在對編譯器說「相信我」，`as any` 更是雙重放棄。
- AI 也很愛寫 `any`，所以在 linter 禁掉它，並在每次修改後跑 `tsc`，比口頭約定可靠。

## 觀點拆解

### 緣起
`any` 這個型別，幾乎是所有人寫 `TypeScript` 的第一個捷徑。它能讓編譯器閉嘴，能讓程式碼立刻通過，甚至能救急。

但隨著專案變大，`any` 帶來的副作用就像癌細胞一樣蔓延：你再也不知道傳進來的是不是期望的格式，錯誤永遠出現在最遠的地方。

這時候，有些人會說：「那就用 `unknown` 吧！」

### any vs unknown
- `any`：編譯器直接放棄檢查，等於沒寫。
- `unknown`：需要顯式檢查或斷言，才能使用。

```ts
function print(value: unknown) {
    // console.log(value.toUpperCase()); // ❌ 報錯：'value' is of type 'unknown'
    if (typeof value === 'string') {
        console.log(value.toUpperCase()); // ✅ 這裡已經被縮小成 string
    }
}
```

而 `any` 則會默默允許一切，直到你在 runtime 崩潰。

用生活一點的比喻：`any` 是把陌生人直接放進家門，`unknown` 是先請他在門口出示證件。後者比較麻煩，但你至少知道家裡進來的是誰。

更陰險的是，`any` 會傳染：

```ts
const config: any = JSON.parse(raw);
const port = config.server.port; // port 也是 any
const url = `http://localhost:${port}`; // 這裡還是沒人檢查
```

一個 `any` 進來，順著屬性存取、函式回傳一路擴散出去，最後整條資料流都變成沒有型別的區域。`unknown` 則不會，它停在原地，等你證明它是什麼。

### 縮小 unknown 的幾種方式
```ts
interface User {
    id: number;
    name: string;
}

// 型別守衛：把檢查邏輯包成一個會回報結果的函式
function isUser(value: unknown): value is User {
    return typeof value === 'object'
        && value !== null
        && 'id' in value && typeof value.id === 'number'
        && 'name' in value && typeof value.name === 'string';
}

function greet(data: unknown) {
    if (data instanceof Error) {
        console.error(data.message);
        return;
    }

    if (isUser(data)) {
        console.log(`Hi, ${data.name}`); // data 是 User
    }
}
```

手寫型別守衛在欄位一多的時候會很痛，這也是 `Zod` 這類 schema 驗證工具存在的理由：同一份 schema 同時給你執行期的檢查和編譯期的型別。

### as 也是一種 any
`any` 的好朋友是 `as`。`value as User` 不會檢查任何東西，它只是你對編譯器說「相信我，這是 `User`」。至於 `as any`、`as unknown as User`，就是連「相信我」都懶得說，直接把檢查關掉。

~~我們都說過「相信我」，後來呢？~~

真的要約束一個值又想保留推斷，`satisfies` 比 `as` 誠實得多：它會檢查，而且不會改掉原本推斷出來的型別。詳見 [as const 與 satisfies](./as-const-與-satisfies-型別的微妙邊界)。

### AI 亂用 any
有趣的是，群組裡聊到，AI（包括 `ChatGPT`、`Claude`）其實也很愛亂寫 `any` 或 `as any`：一般變數比較少，但遇到型別檢查過不了的時候，它很喜歡一個 `as any` 把問題蓋掉，就算叫它別寫還是會寫。

所以很多團隊直接在 linter 禁止 `any`，並要求每次編輯後都要跑一次 `tsc`。規則寫進工具裡，人和 AI 都一視同仁。

當然，如果真的要放寬，還是可以用 `unknown` 搭配驗證，例如 `Zod`，才算健康。

## 例子與對比

### 用 typescript-eslint 把門關起來
`ESLint` flat config 的寫法大概長這樣（規則名稱以 `typescript-eslint` 官方文件為準）：

```js
// eslint.config.js
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
    tseslint.configs.strictTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: true
            }
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'error'
        }
    }
);
```

`no-explicit-any` 擋的是你親手寫出來的 `any`；`strictTypeChecked` 裡的 `no-unsafe-*` 系列則會擋住「從別處流進來的 `any`」被拿去賦值、呼叫、存取屬性，剛好對付上面說的傳染問題。

### 什麼時候用哪個

| 情況 | 建議 |
| :--- | :--- |
| `JSON.parse`、API 回應、`catch (error)` | `unknown`，再驗證或縮小 |
| 第三方套件沒給型別 | 自己寫 `declare` 補上，不要整包 `any` |
| 真的什麼型別都可以的泛型容器 | 用泛型 `T`，不是 `any` |
| 要約束物件又想保留字面值 | `satisfies`，不是 `as` |
| 舊專案正在遷移 | 暫時的 `any` 可以，但加註解說明何時拿掉 |

## 結論
程式裡的「不確定性」永遠存在。問題不在於你能不能偷懶，而是偷懶的代價是不是你願意承擔的。

在這點上，`unknown` 至少逼迫你「面對現實」，而 `any` 只是把垃圾掃到地毯下。地毯下的東西不會消失，它只會在你最沒空的那天，從最遠的地方冒出來。
