---
title: 中階 TypeScript 該會什麼：面試會加考的那幾題
image: ''
description: '除了型別推論，中階的 TypeScript 工程師至少要會 Omit、Pick、Partial、Record、Exclude、Extract 這六個工具型別、interface 繼承、泛型、Mapped Types、看得懂 tsconfig，以及替沒有型別的套件補 declare。逐題附上範例與回答方向。'
keywords: ''
author: Opshell
createdAt: '2024-09-11'
categories:
  - TypeScript
tags:
  - TypeScript
  - 面試題
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的面試題清單寫成全文，每題補上範例與回答方向，「型別繼承」那段補成 extends 與 declare global 兩種情況。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
職缺上寫「熟悉 TypeScript」，到底要熟到什麼程度？會寫 `interface`、會幫參數標型別，大概只算入門。這篇是我心中「中階」的那條線：主要是看在 `Vue 3` 裡實踐過多少 `TS` 的專案內容。如果職缺有註明用 `TS`，我會加考這個。寫給準備面試的人，也寫給要出題的人。
:::

## 懶人包
- 中階的線：除了型別推論，要會 `Omit`、`Pick`、`Partial`、`Record`、`Exclude`、`Extract` 這些常用的型別處理方法。
- 還要懂 `interface` 的繼承、泛型、Mapped Types，`tsconfig` 也要能自己看得懂怎麼配。
- 會加考三題：專案變大時怎麼管理重複的型別、解釋六個工具型別、解釋泛型的用途與實作。
- 加分題：怎麼手動配置 `declare`，補上套件沒有提供的型別。

## 技術拆解

### 面試會加考的三題
1. 當專案越來越大，你會如何管理可能導致重複的 `types` 和 `interface`？
2. 試著解釋這六個常用的 `TS` 型別處理用法：`Omit`、`Pick`、`Partial`、`Record`、`Exclude`、`Extract`。
3. 請解釋泛型的用途和具體實作方式。

其他的還會有：如何手動配置 `declare` 來避免一些套件可能沒有提供 type 的問題。

下面一題一題拆，每題附上我期待聽到的方向。

### 第一題：重複的型別怎麼管
這題沒有標準答案，想聽的是「你有沒有被重複型別痛過」。幾個好的方向：

- **單一來源**：同一個實體只定義一次核心型別，其他形狀都從它推導（這就是第二題那六個工具型別的用武之地）。
- **分層放置**：全域共用的放 `types/`，只屬於某個功能的就放在功能資料夾裡，不要什麼都丟全域。
- **從來源產生**：API 型別可以從 OpenAPI 文件產生，或用 `Zod` 這類 schema 同時產生型別與驗證，見 [Zod 與 TS 型別管理的心智負擔](./zod-與-ts-型別管理的心智負擔)。

答「每個檔案自己定義需要的欄位」的，通常就是還沒踩過後端改一個欄位、前端要改十個地方的坑。

### 第二題：六個工具型別
先準備一個核心型別，其他全部從它長出來：

```ts
interface User {
    id: number;
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'editor' | 'viewer';
}
```

**Omit：拿掉某些欄位**
```ts
type PublicUser = Omit<User, 'password'>; // 給前端顯示用，密碼不該出現
```

**Pick：只留某些欄位**
```ts
type UserPreview = Pick<User, 'id' | 'name'>; // 下拉選單只需要這兩個
```

**Partial：全部變成可選**
```ts
type UserPatch = Partial<Omit<User, 'id'>>; // 更新時只傳有改的欄位，id 不能改

function updateUser(id: number, patch: UserPatch) { }
updateUser(1, { name: 'Opshell' });
```

**Record：用一組 key 對應同一種值**
```ts
type RoleLabel = Record<User['role'], string>;

const roleLabel: RoleLabel = {
    admin: '管理員',
    editor: '編輯',
    viewer: '訪客'
}; // 少寫一個角色就報錯
```

**Exclude：從聯集裡剔除**
```ts
type Role = User['role'];
type StaffRole = Exclude<Role, 'viewer'>; // 'admin' | 'editor'
```

**Extract：從聯集裡挑出共同的**
```ts
type ReadonlyRole = Extract<Role, 'viewer' | 'guest'>; // 'viewer'，guest 不在 Role 裡所以被過濾掉
```

記法很簡單：`Omit` / `Pick` 是對-|物件的欄位|-動刀，`Exclude` / `Extract` 是對-|聯集的成員|-動刀。面試時能講出這個分類，比背出定義更加分。

### 第三題：泛型
一句話版本：如果函式的參數是用來接收「值」的，泛型就是用來接收「型別」的。

```ts
function first<T>(list: T[]): T | undefined {
    return list[0];
}

const n = first([1, 2, 3]); // n: number | undefined，不用自己標
```

實務上最常見的是 API 回應的包裝：

```ts
interface ApiResult<T> {
    status: boolean;
    data: T;
}

async function getJson<T>(url: string): Promise<ApiResult<T>> {
    const res = await fetch(url);
    return res.json() as Promise<ApiResult<T>>;
}
```

想聽到的是「什麼時候該用」：同一段邏輯要服務很多種型別，又不想退回 `any` 的時候。更完整的說明可以看 [Generics (泛型)](./泛型) 和 [any 外更好的選擇](./any%20外更好的選擇)。

### Mapped Types：工具型別是怎麼做出來的
會用 `Partial` 是中階，知道 `Partial` 怎麼寫出來是加分。Mapped Types 就是用 `in keyof` 走過每個 key，產生一個新型別：

```ts
type Nullable<T> = {
    [K in keyof T]: T[K] | null;
};

type UserForm = Nullable<Pick<User, 'name' | 'email'>>;
// { name: string | null; email: string | null }，表單還沒填的時候很好用
```

### 型別繼承與 declare
`interface` 的繼承用 `extends`，適合把共用欄位抽成基底：

```ts
interface BaseEntity {
    id: number;
    created_at?: string;
}

interface ImageData extends BaseEntity {
    title: string;
    file: string;
}
```

另一種情況是全域型別。下面這種寫法把型別宣告到全域，任何檔案不用 import 就能用：

```ts
declare global {
    interface giImageData {
        id: number;
        title: string;
        file_name: string;
        size: number;
        file: string;
        type?: number;
        active?: 0 | 1;
        created_at?: string | Date;
    }
}
```

`declare global` 也是第三題延伸「套件沒提供型別」的解法：套件把東西掛在 `window` 上卻沒給型別，就在全域的 `Window` 介面補上去，利用的是 `interface` 同名會合併的特性（見 [interface vs type](./interface-vs-type)）：

```ts
declare global {
    interface Window {
        dataLayer: unknown[];
    }
}
```

全域型別很方便，但也很容易氾濫，什麼都丟進全域，第一題的「重複型別」就會從這裡開始長出來。

### tsconfig 要看得懂
不用背每個選項，但這幾個要知道在做什麼：

| 選項 | 為什麼要懂 |
| :--- | :--- |
| `strict` | 一次打開一整組嚴格檢查，關掉它的專案寫 `TS` 等於寫註解 |
| `paths` | `@/components` 這種別名怎麼來的，跟打包工具的 alias 要對得上 |
| `moduleResolution` | 用 `Vite` 的專案通常是 `bundler`，import 解析不到常常是這裡 |
| `types` / `include` | 全域型別、`.d.ts` 為什麼沒生效 |
| `noUncheckedIndexedAccess` | 打開後 `list[0]` 會是 `T \| undefined`，更誠實但要多寫檢查 |

## 例子與對比

### 入門 vs 中階

| | 入門 | 中階 |
| :--- | :--- | :--- |
| 定義型別 | 每個地方各寫一份 | 一個核心型別，其他用工具型別推導 |
| 遇到型別錯誤 | `as any` | 縮小型別、寫型別守衛 |
| API 回應 | `data: any` | 泛型包裝，或 schema 驗證 |
| 套件沒型別 | `// @ts-ignore` | 自己寫 `declare` 補上 |
| `tsconfig` | 照範本複製 | 知道每個關鍵選項在幹嘛 |

延伸閱讀：[PJCHENDER 的 TypeScript 鐵人賽](https://pjchender.dev/ironman-2021/ironman-2021-day02/)，從基礎一路講到這些進階用法，很適合拿來自我檢查。

## 結論
中階不是會多少語法，而是-|知道型別可以「推導」而不是「重寫」|-。六個工具型別、泛型、Mapped Types，說穿了都是同一件事：讓型別跟著來源走，改一個地方，其他地方自動跟上。

面試時答不出定義沒關係，能講出「我在哪裡用過、解決了什麼重複」，就已經過線了。~~背得出來但沒用過的，通常第二個追問就露餡。~~
