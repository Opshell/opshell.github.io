---
title: 透過 const 設定表 + Object.entries 優化重複邏輯
image: ''
description: '連動下拉選單寫成三段 if，每段都在呼叫 API、重置欄位、更新列表，只差參數。把「差異」抽成一張 const 設定表，流程只寫一次，再用 Object.entries 批次重置欄位；順便修掉設定表裡最容易踩的響應式快照坑。'
keywords: ''
author: Opshell
createdAt: '2025-05-19'
categories:
  - JavaScript
tags:
  - JavaScript
  - TypeScript
  - Vue
  - 重構
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的兩段程式碼寫成全文（重構前後對照、設定表的響應式快照坑、修正版）。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
後台表單很常有「單位類別 → 縣市 → 區 → 單位」這種一層連一層的下拉選單：上一層一換，下一層就要重抓選項、把已選的值清掉。常見的情況是第一版先用 `if` 一段一段寫出來，能動，但三段長得幾乎一模一樣。這篇寫給同樣看著重複程式碼覺得哪裡怪怪的人：怎麼把「差異」抽成資料，讓流程只寫一次。
:::

## 懶人包
- 三段 `if` 做的事都一樣（打 API、重置欄位、更新列表），只是參數不同，這種情況就把差異抽成一張 `const` 設定表。
- 流程只寫一次：用 `changer` 去查表，拿到 `params`、`resetFields`、`updateLists`，再用 `Object.entries` 批次重置欄位。
- 設定表裡要讀 `ref` 的值，一定要包成函式 `() => ({ ... })`，不然你拿到的是建表那一刻的快照。
- 新增一層選單，從「複製一段 `if` 再改三個地方」變成「表上加一列」。

## 技術拆解

### 重構前：三段長得一樣的 if
原本的寫法是這樣，`changer` 告訴我們是哪一層的下拉選單變了：

```ts
function getOptionsHandler(changer: 'class' | 'county' | 'area') {
    if (departmentClassId.value === 0) {
        cityList.value = [];
        townshipList.value = [];
        unitList.value = [];
        return;
    }

    if (changer === 'class') {
        getOptions({
            departmentClassId: departmentClassId.value
        }).then((res) => {
            setFieldValue('countyId', 0); // 縣市重置
            setFieldValue('areaId', 0); // 區重置
            setFieldValue('departmentIds', []); // 單位重置

            cityList.value = res.place;
            townshipList.value = [];
            unitList.value = [];
        });
    }

    if (changer === 'county') {
        getOptions({
            departmentClassId: departmentClassId.value,
            countyId: countyId.value
        }).then((res) => {
            setFieldValue('areaId', 0); // 區重置
            setFieldValue('departmentIds', res.department.map((item: giOptionItem) => {
                return item.id;
            }));

            townshipList.value = res.place;
            unitList.value = res.department;
        });
    }

    if (changer === 'area') {
        getOptions({
            departmentClassId: departmentClassId.value,
            countyId: countyId.value,
            areaId: areaId.value
        }).then((res) => {
            setFieldValue('departmentIds', res.department.map((item: giOptionItem) => {
                return item.id;
            }));

            unitList.value = res.department;
        });
    }
};
getOptionsHandler('class');
```

仔細看，每一段都在做同樣的三件事：

1. 用某組參數呼叫 `getOptions`。
2. 把下游的欄位重置。
3. 把回傳的 `place`、`department` 塞進對應的列表，或清空。

會變的只有「參數是哪幾個」「要重置哪些欄位」「哪個列表吃哪個資料」。-|會變的東西是資料，不會變的東西才是流程|-，這就是抽設定表的訊號。

### 重構後：差異放進 const 設定表
同樣的模式用在另一個只看中央廚房（類別固定）的頁面，第二版就改成先寫一張表，再寫一個查表的函式：

```ts
const CENTRAL_KITCHEN_CLASS_ID = 3;

interface GetOptionsResponse {
    place?: any[]
    department?: any[]
}
const config = {
    county: {
        params: { departmentClassId: CENTRAL_KITCHEN_CLASS_ID },
        resetFields: { countyId: 0, areaId: 0, departmentId: 0 },
        updateLists: [
            { target: cityList, source: 'place' },
            { target: townshipList, source: [] },
            { target: unitList, source: [] }
        ]
    },
    area: {
        params: { departmentClassId: CENTRAL_KITCHEN_CLASS_ID, countyId: countyId.value },
        resetFields: { areaId: 0, departmentId: 0 },
        updateLists: [
            { target: townshipList, source: 'place' },
            { target: unitList, source: 'department' }
        ]
    },
    department: {
        params: { departmentClassId: CENTRAL_KITCHEN_CLASS_ID, countyId: countyId.value, areaId: areaId.value },
        resetFields: { departmentId: 0 },
        updateLists: [
            { target: unitList, source: 'department' }
        ]
    }
};

type tOptionKey = 'date' | 'countyId' | 'areaId' | 'departmentId';

function getOptionsHandler(changer: 'county' | 'area' | 'department') {
    const { params, resetFields, updateLists } = config[changer];

    getOptions(params)
        .then((res: GetOptionsResponse) => {
            console.log('getOptions', res);

            // 重置欄位
            Object.entries(resetFields).forEach(([key, value]) => setFieldValue(key as tOptionKey, value));

            // 更新列表
            updateLists.forEach(({ target, source }) => {
                target.value = typeof source === 'string' ? (res[source] ?? []) : source;
            });
        })
        .catch((error) => {
            console.error(`Failed to fetch options for ${changer}:`, error);
            Object.entries(resetFields).forEach(([key, value]) => setFieldValue(key as tOptionKey, value));
            updateLists.forEach(({ target }) => {
                target.value = [];
            });
        });
}
getOptionsHandler('county');
```

`getOptionsHandler` 從三段變成一段，而且它再也不知道「縣市」「區」是什麼，它只會照表操課。`Object.entries(resetFields)` 把 `{ areaId: 0, departmentId: 0 }` 攤成 `[['areaId', 0], ['departmentId', 0]]`，一個 `forEach` 就重置完，要重置幾個欄位都是表的事。

這就是策略模式的輕量版：不用 class、不用繼承，一個物件就是一張策略表。

### 這張表藏了一個坑：響應式快照
看 `area` 那一列：

```ts
params: { departmentClassId: CENTRAL_KITCHEN_CLASS_ID, countyId: countyId.value }
```

`config` 是在元件 setup 的時候建立的，那一刻 `countyId.value` 是 `0`，所以 `params.countyId` 就永遠是 `0`。使用者之後選了台北市，`countyId.value` 變了，但表裡存的是當初抄下來的數字，不是 `ref` 本身。~~恭喜，你得到一個永遠在查「縣市 0」的下拉選單。~~

這不是 `Vue` 的 bug，是 `JavaScript` 的基本規則：讀 `.value` 拿到的是當下的值。要讓表在「用的時候」才去讀，就把它包成函式：

```ts
params: () => ({ departmentClassId: CENTRAL_KITCHEN_CLASS_ID, countyId: countyId.value })
```

呼叫 `params()` 的那一刻才讀 `countyId.value`，拿到的就是使用者剛選的值。

### 另外兩個小地方
- `source: []` 跟 `source: 'place'` 混在同一個欄位，型別變成 `string | never[]`，判斷時還要 `typeof`。改成 `'place' | 'department' | null`，`null` 代表清空，意思更明確。
- `key as tOptionKey` 這個斷言是必要的：`Object.entries` 回傳的 key 一律是 `string`，`TypeScript` 不會幫你縮回 `'countyId' | 'areaId'`。原因跟 [Object.keys 偷偷幫你轉型了](./object-keys-偷偷幫你轉型了) 是同一件事。

## 例子與對比

### 修正版
把上面的問題都收掉，再用 `async/await` 把成功與失敗的路線拉直：

```ts
const CENTRAL_KITCHEN_CLASS_ID = 3;

type Changer = 'county' | 'area' | 'department';
type OptionField = 'countyId' | 'areaId' | 'departmentId';

interface GetOptionsResponse {
    place?: OptionItem[];
    department?: OptionItem[];
}

interface OptionStep {
    params: () => GetOptionsParams;
    resetFields: Partial<Record<OptionField, number>>;
    updateLists: { target: Ref<OptionItem[]>; source: keyof GetOptionsResponse | null }[];
}

const optionSteps: Record<Changer, OptionStep> = {
    county: {
        params: () => ({ departmentClassId: CENTRAL_KITCHEN_CLASS_ID }),
        resetFields: { countyId: 0, areaId: 0, departmentId: 0 },
        updateLists: [
            { target: cityList, source: 'place' },
            { target: townshipList, source: null },
            { target: unitList, source: null }
        ]
    },
    area: {
        params: () => ({ departmentClassId: CENTRAL_KITCHEN_CLASS_ID, countyId: countyId.value }),
        resetFields: { areaId: 0, departmentId: 0 },
        updateLists: [
            { target: townshipList, source: 'place' },
            { target: unitList, source: 'department' }
        ]
    },
    department: {
        params: () => ({
            departmentClassId: CENTRAL_KITCHEN_CLASS_ID,
            countyId: countyId.value,
            areaId: areaId.value
        }),
        resetFields: { departmentId: 0 },
        updateLists: [
            { target: unitList, source: 'department' }
        ]
    }
};

function resetFields(fields: OptionStep['resetFields']) {
    for (const [key, value] of Object.entries(fields)) {
        setFieldValue(key as OptionField, value);
    }
}

async function getOptionsHandler(changer: Changer) {
    const step = optionSteps[changer];

    try {
        const res = await getOptions(step.params());
        resetFields(step.resetFields);
        step.updateLists.forEach(({ target, source }) => {
            target.value = source ? (res[source] ?? []) : [];
        });
    } catch (error) {
        console.error(`Failed to fetch options for ${changer}:`, error);
        resetFields(step.resetFields);
        step.updateLists.forEach(({ target }) => {
            target.value = [];
        });
    }
}

getOptionsHandler('county');
```

`optionSteps` 標成 `Record<Changer, OptionStep>` 還有一個好處：哪天 `Changer` 多了一個 `'unit'`，表上沒補那一列，`TypeScript` 會直接報錯，不會等到使用者點下去才發現。

### 兩種寫法比一比

| | 三段 if | const 設定表 |
| :--- | :--- | :--- |
| 新增一層選單 | 複製一整段再改參數、重置、列表三處 | 表上加一列 |
| 改流程（例如加 loading） | 三段都要改 | 改一個函式 |
| 看懂某一層做什麼 | 讀那一段程式 | 看表上那一列 |
| 特例處理 | 很自然，直接在那段寫 | 要在表上加欄位或 callback |

最後一列是設定表的代價：像第一版裡「選完縣市要把所有單位預設勾起來」這種只有某一層才有的動作，放進表裡就要多一個欄位，例如 `afterFetch?: (res: GetOptionsResponse) => void`。特例一多，表就會長得比原本的 `if` 還難讀，那時候就該停下來想想是不是抽錯了。

## 結論
重複的程式碼不一定要抽，但「流程一樣、只差參數」的重複，幾乎都值得變成一張表。抽完之後，新增功能是填表，不是寫程式，Code Review 也只要看那一列。

只是記得表裡別直接抄 `.value`，不然你會得到一張很整齊、但永遠活在過去的表。
