---
title: as const 與 satisfies —— 型別的微妙邊界
image: ''
description: 'as const 把值鎖成唯讀的字面值，satisfies 檢查約束又保留原本的推斷，兩個合起來 as const satisfies 兩邊都要。順便釐清 satisfies 也會做多餘屬性檢查、字面值推斷變死板，以及它比 as 誠實在哪裡。'
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
Claude 於 2026-10-05 補完：依原本的筆記與群組討論寫成全文，修正「satisfies 加額外屬性不會報錯」的說法（實測 TS 5.9 會報錯），補上字面值推斷的副作用與 as const 當 enum 用的寫法。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
`TypeScript` 世界裡最微妙的體驗之一，就是 `as const` 與 `satisfies`。兩者看似相似，但實際用起來差很多。我們群組裡就花了一早上，才把這件事講清楚，中間還有人實測結果跟討論對不上。這篇把那一早上的結論整理起來，所有範例都用 `TypeScript` 5.9 跑過。
:::

## 懶人包
- `as const`：把值標記為唯讀，並推斷成範圍最小的字面值型別。
- `satisfies`：檢查值有沒有符合某個型別，但-|保留原本推斷出來的型別|-，不會被「蓋掉」。
- `as const satisfies`：字面值、唯讀、約束三個一起拿。
- `satisfies` 對物件字面值一樣會做多餘屬性檢查，要允許額外欄位得在型別裡開索引簽章。
- 寧可 `satisfies` 也不要 `as`：前者會檢查，後者只是叫編譯器相信你。

## 技術拆解

### as const：鎖起來
`as const` 做兩件事：

1. 把值標記為不可變（`readonly`）。
2. 推斷為範圍最小的字面值型別。

```ts
const theme = 'dark' as const;
// type: 'dark'（字面值）

const sizes = ['small', 'large'] as const;
// type: readonly ['small', 'large']
type Size = (typeof sizes)[number]; // 'small' | 'large'
```

物件也一樣，每個屬性都變成 `readonly` 的字面值。它像是把東西放進壓克力展示櫃：看得清清楚楚，但誰都別想動。

### satisfies：檢查，但不改名
`satisfies` 是在保持原始推斷的前提下，確保那些值符合某個型別約束。

```ts
type Config = {
    theme: 'light' | 'dark';
    size: 'small' | 'large';
};

const config2 = {
    theme: 'dark',
    size: 'large'
} satisfies Config;
```

跟直接標註型別比一比：

```ts
const config1: Config = {
    theme: 'dark',
    size: 'large'
};
```

`const config1: Config` 是強制指定 `Config` 型別，從此 `config1.theme` 的型別就是 `'light' | 'dark'`，你當初寫的 `'dark'` 被忘掉了。`satisfies Config` 則是確認值符合 `Config` 約束，但保持精確推斷，`config2.theme` 還是 `'dark'`。

差在哪？寫成函式以後就會看到字面值保留的差異：

```ts
function onlyDark(t: 'dark') { }

// 這裡會出現 Argument of type '"light" | "dark"' is not assignable to parameter of type '"dark"'.
onlyDark(config1.theme);

// 這裡正常
onlyDark(config2.theme);
```

型別標註像幫人貼上職稱：「他是工程師」，至於他會什麼，公司就不記得了；`satisfies` 像是面試：確認你符合工程師的資格，但你履歷上寫的每一項技能都留著。

### satisfies 還是會做多餘屬性檢查
這裡是那天討論卡最久的地方。一開始的說法是「`satisfies` 只做型別檢查，額外屬性一樣可用」：

```ts
const config = {
    theme: 'dark',
    size: 'large',
    extra: 'value' // ❌ 報錯
} satisfies Config;
```

實際一跑，這行會報 `Object literal may only specify known properties, and 'extra' does not exist in type 'Config'.`。原因是 `satisfies` 後面接物件字面值的時候，跟型別標註一樣會觸發 excess property checking（多餘屬性檢查），對它來說那是多出來的一個 key，要先定義新增的這個 key 是什麼型別。

~~所以那天群組裡說「我這邊有蚯蚓」的人沒有眼花，是 `TypeScript` 比我們嚴格。~~

想允許額外屬性，有兩種修法。一種是直接在型別裡開索引簽章：

```ts
type Config = {
    theme: 'light' | 'dark';
    size: 'small' | 'large';
    [key: string]: unknown;
};
```

另一種是不動原本的 `Config`，在 `satisfies` 的地方臨時放寬：

```ts
const config2 = {
    theme: 'dark',
    size: 'large',
    extra: 'value'
} satisfies (Config & Record<string, unknown>);
```

代表型別本身允許額外屬性，但 `theme`、`size` 仍保有檢查能力。而且因為 `satisfies` 保留推斷，`config2.extra` 的型別還是 `string`，不會變成 `unknown`。

### 字面值推斷的副作用：有時候太死板
`satisfies` 保留推斷，有時候反而保留過頭了：

```ts
interface Data {
    name: string;
    enable: boolean;
    fish?: {
        name: string;
    };
}

const data = {
    name: 'cod',
    enable: true
} satisfies Data;

// data 的型別是 { name: string; enable: true; }
data.enable = false; // ❌ Type 'false' is not assignable to type 'true'.
```

`enable` 被推斷成 `true` 而不是 `boolean`，`fish` 也不見了。這跟額外屬性沒有關係，是因為約束裡的 `boolean` 其實是 `true | false` 的聯集，`TypeScript` 會盡量保留你寫下的那個字面值。深層一點的資料推導也會有類似的死板感。

所以判斷的方式是：這個值之後-|會不會被改|-？會改的狀態物件，用型別標註；寫完就不動的設定、對照表，用 `satisfies`。

### as const satisfies：兩邊都要
把兩者結合起來：

- `as const`：轉成字面值。
- `satisfies`：維持原始值 + 約束。
- `as const satisfies`：字面值 + 唯讀 + 約束。

```ts
const config = {
    theme: 'dark',
    size: 'large'
} as const satisfies Config;

onlyDark(config.theme); // ✅
config.theme = 'light'; // ❌ Cannot assign to 'theme' because it is a read-only property.
```

用了會發現新世界：設定檔寫錯值會被擋，用的地方又拿得到最精確的型別。

## 例子與對比

### 用 satisfies 約束 Record，但保留 key 的提示
很實用的一招：要求每個值都符合某個型別，又不想失去「到底有哪些 key」的資訊。

```ts
const routes = {
    home: '/',
    about: '/about'
} satisfies Record<string, string>;

routes.home; // ✅ 有提示
routes.contact; // ❌ Property 'contact' does not exist

const routes2: Record<string, string> = {
    home: '/',
    about: '/about'
};
routes2.contact; // 不報錯，key 的資訊被 Record<string, string> 蓋掉了
```

### 把 as const 當 enum 用
有些 linter（例如 `Biome`）有禁用 `enum` 的規則，建議用 `as const` 物件代替。要注意兩者實際上不同，但常見的替代寫法是這樣：

```ts
const Status = {
    Draft: 'draft',
    Published: 'published'
} as const;

type Status = (typeof Status)[keyof typeof Status]; // 'draft' | 'published'

function setStatus(status: Status) { }

setStatus(Status.Draft); // ✅
setStatus('published'); // ✅ 直接傳字面值也可以，這點 enum 做不到
```

`enum` 本身怎麼用、適合什麼情境，可以看 [Enum 使用實例](./enum)。

### 四種寫法一張表

| 寫法 | 會檢查 | 保留字面值 | 唯讀 |
| :--- | :--- | :--- | :--- |
| `const x: Config = {...}` | 會 | 不會 | 不會 |
| `const x = {...} as Config` | 只擋明顯不相容的 | 不會 | 不會 |
| `const x = {...} satisfies Config` | 會 | 會 | 不會 |
| `const x = {...} as const satisfies Config` | 會 | 會 | 會 |

`as Config` 那一列是重點：它只在兩個型別「沒什麼交集」的時候才報錯，值寫成 `'blue'` 會被擋，但 `{ theme: 'dark' } as Config` 少了 `size` 卻會安靜通過。`as` 是你對編譯器說「相信我」，`satisfies` 是請編譯器「幫我檢查」，這也是為什麼大家說寧可 `satisfies` 也不要 `as`。

## 結論
`TypeScript` 給了我們很多工具，讓我們在「靈活」與「嚴格」之間找平衡。`as const` 與 `satisfies` 就是這條平衡線上的兩個端點。

懂得何時該「鎖死」，何時該「寬容」，這就是工程師的日常哲學。真的拿不定主意的時候，先寫 `as const satisfies`，被擋下來了再退一步，總比一開始就 `as` 下去、出事了才回頭好。
