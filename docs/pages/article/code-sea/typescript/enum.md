---
title: Enum 使用實例
author: Opshell
createdAt: '2024-08-10'
categories:
  - 使用實例
tags:
  - TypeScript
editLink: true
isPublished: true
image: ''
description: ''
keywords: ''
---
# enum 按鍵使用實例

1. 用enum列舉常用modules的參數類別
2. 權限表弄enum
3. 產品如果需要快捷鍵支援的話，也會做這種類似MOUSE、方向鍵、keydown之類操作(策略模式+enum)
```ts
enum Key {
  UP = "ArrowUp",
  DOWN = "ArrowDown",
  LEFT = "ArrowLeft",
  RIGHT = "ArrowRight",
  Q = "Q",
  W = "W",
  E = "E",
  R = "R",
}

const handleUp = () => {
  console.log("Move up");
};

const handleDown = () => {
  console.log("Move down");
};

const handleLeft = () => {
  console.log("Move left");
};

const keyStrategies: { [key in Key]: () => void } = {
  [Key.UP]: handleUp,
  [Key.DOWN]: handleDown,
  [Key.LEFT]: handleLeft,
  [Key.RIGHT]: handleRight,
  [Key.Q]: handleQ,
  [Key.W]: handleW,
  [Key.E]: handleE,
  [Key.R]: handleR,
};

const handleKeydown = (event: KeyboardEvent) => {
  const key = event.key as Key;
  if (key in keyStrategies) {
    keyStrategies[key]();
  }
};

```

4. 後端比較常用來列舉狀態或錯誤類型，例如某個資料的 type 種類、某個 service 會 throw 的錯誤類型等等。
前端我後來比較常用 defineConstants，[具體作法](https://vocus.cc/article/6695fd2cfd897800013893bc)
5. 狀態控管用 ENUM
6. 系統內應該會有不少需要判別字串是否符合某些POOL的條件，這就是enum的用意


19:43 Astolfo 我意思是說，可以善用zod去管理你的type
19:44 Astolfo 這樣心智負擔最小
19:44 Astolfo 我們推廣很久了
19:44 Astolfo 上車的人不多
19:44 Pod042-A 如果用不習慣窩推薦窩寫的套件0A0/
19:44 Ava 感恩提點(bow)(cheering)(cheering)
19:44 Astolfo 因為大部分的專案就是原本長那樣
19:44 鱈魚 滿推薦可以看看 ts-rest
https://ts-rest.com/recipies/frontend-only
19:44 Astolfo 我正在補坑，晚點把NOTION放過來
19:45 新手貓貓 耶
19:46 Pod042-A https://www.npmjs.com/package/willowisp
19:46 Pod042-A 不喜請噴
20:04 pz 用 zod 帶泛型的心智負擔其實也會小很多 lol
20:14 Astolfo https://jolly-mustang-64e.notion.site/Vue3-TS-Rest-Zod-225dd7c1825880438107e4f810bd2413
20:14 Astolfo 可以先看
20:14 Astolfo 我後面再來檢查還要補些什麼知識
20:15 Astolfo 文章的專案裡面其實還有i18n管理的Solution
20:15 Astolfo 日後再拿來講
20:15 Astolfo API麻煩自己代換成你們平常在用的
20:16 Astolfo 我是有掛proxy反向代理，如果你們是同源直接連接的話，vite就不用另外設定了
20:18 Ava 感謝分享(wow)
20:18 Astolfo 我很少在寫泛型了，反正每隻api都訂好好的
20:19 Astolfo 萬一網路塞車或者服務掛了，我至少可以知道api傳什麼
20:19 Astolfo 反正這樣也可以前後端同時作業
20:20 Charles 看起來是
但新頁面就用 Nuxt 處理了
呈現效果跟效能都很不錯
20:20 Astolfo 圖片
20:20 Astolfo 重要的是把schema集成以後才丟出去外露
20:21 Charles 比起改不動就直接擺爛好多了
20:22 竹子たけ 業務邏輯上面我只推薦寫 zod
泛型什麼應該都只使用在底層元件
20:25 Ava 原來泛行會有這樣的問題
20:26 Ava 對，這也是我想寫ts 的原因，每次找問題，光是api 格式就花很多時間
20:30 Astolfo 你還會發現我這包範例專案幾乎沒有ANY
20:31 Astolfo 公司的專案就不一定了，通常是用unknown取代
20:31 Ava 如果是外來套件，不清楚它會傳遞的格式是什麼，這樣的情況都是unknown嗎？
20:32 Pod042-A 除了真的是什麼型別都可以的泛型之外，一般業務邏輯不會需要any才對啊，每種值都有明確的型別要求，最對也只能是未知
20:32 Pod042-A 可以先用unknown，驗過才能限縮
20:32 Astolfo 外來套件通常會另外透過他曝露的interface去GLOBAL層再做一次declare封裝，把我們需要但他沒有的加進去
20:33 Pod042-A 除非像express的request那樣真的什麼都可以才會用any
20:33 Astolfo 所以根本不需要any
20:33 Astolfo 同名稱的interface可以合併
20:33 Astolfo 但是type不行，type是alias唯一命名
20:43 Charles type 只能用集合的邏輯去操作
（聯集、交集、差集等等）
20:43 Charles 還沒開始寫 TS 的時候一直被 Interface or Type 搞得很困惑
20:44 Charles 寫下去邊參考大專案的做法就知道該怎麼運用了
20:49 Astolfo 通常是混用啦
20:50 Astolfo 沒有要重複定義處理同名問題的我就沒什麼在用interface
20:50 Charles 相對來說 types 比較常用在被被不同 interfaces 引用到的情境
2025.08.21 星期四
09:02 NuxtDev萌新 真的，寫any等於沒寫，我也沒看過AI寫any
09:11 一隻狐狸 AI 很常寫 as，跟any沒什麼差別
09:12 Pod042-A 一般變數AI很少用any，但是type check的時候反而很喜歡用as any
09:28 Astolfo AI寫的可兇了，Claude和GPT都會
09:29 Astolfo 嚴格一點就satisfies
09:30 竹子たけ 寧可 satisfies 也不要 as
09:31 Astolfo as const相對就沒這麼有力了
09:32 排氣管管 AI 確實滿常寫 any 的，就算叫他別寫 any 還是會寫
所以有設定禁止 any 並要求每次編輯後都要 tsc 一下
09:32 Pod042-A 我都把as const當enum用
09:32 Astolfo 實際上這兩者不同
09:33 Astolfo as const：
標記為不可變 immutable，然後推斷出最小範圍的字面變數類型
09:33 Astolfo 對象會變成readonly
09:33 Pod042-A 我這邊專案有用biomejs當linter，禁用enum的規則他說用as const代替。說是enum沒辦法推斷型別之類的
09:34 Astolfo satisfies是保持原始類型推斷的前提下，確保那些值符合某個類型約束
09:34 dog 用 as const satisfies 會發現新世界
09:34 Pod042-A 自動推薦字面值？
09:35 Astolfo ```
type Config = {
  theme: 'light' | 'dark';
  size: 'small' | 'large';
}

const config = {
  theme: 'dark',
  size: 'large',
  extra: 'value'  // 額外屬性一樣可用
} satisfies Config;
```
09:35 Astolfo satisfies只做類型檢查
09:35 Astolfo 要型別檢查但需要點靈活彈性，就用satisfies
09:36 Pod042-A 其實我有點不懂，這個情況下const config: Config = {} 和 const config = {} satisfies Config 有什麼不一樣
09:36 Astolfo 差遠了
09:36 Astolfo const config: Config = {}
這個是強制指定Config類型
09:37 dog 就結合起來
as const 轉成字面量
satisfies 維持原始值+約束
as const satisfies 字面量+約束
09:37 Astolfo const config = {} satisfies Config
確保值符合 Config 約束，但保持精確推斷
09:38 Astolfo 你再擴充欄位的時候會遇到類型錯誤
09:38 Pod042-A 原來乳齒
09:38 Astolfo ```
const config1: Config = {
  theme: 'dark',
  size: 'large',
  extra: 'value'  // 這裡會錯
};

const config2 = {
  theme: 'dark',
  size: 'large',
  extra: 'value'
} satisfies Config;
```
09:39 Pod042-A 我都用ChatGPT教的 (typeof Type)[keyof typeof Type] 🤣
09:40 排氣管管 圖片
09:40 Pod042-A 這樣看起來行為一樣？？？
09:41 Astolfo 但他第二個有蚯蚓
09:41 排氣管管 我也是疑惑，因為上面的討論來看 satisfies 不該有錯誤？
09:42 Astolfo 你的TS版本是多少？
09:42 Pod042-A 會不會跟tsconfig設定有關？
09:42 鱈魚 不過 satisfies 有時候有點難用，像是

09:42 鱈魚
```
interface Data {
  name: string;
  enable: boolean;
  fish?: {
    name: string;
  }
}

const data = {
  name: 'cod',
  enable: true,
} satisfies Data;

// 指 Data 的時候  提示會提示
const data: {
  name: string;
  enable: true;
}
```


09:43 排氣管管 5.2
09:43 鱈魚 data 的 enable 是 true，而不是 boolean
09:43 鮑爾 satisfies 我都是用來作 record<string, someType> 限制，但又可以保留 key 的提示
09:43 鱈魚 還有一些深層資料推導都會有點死板
09:44 Pod042-A interface本來就可以有額外屬性，應該不能這樣判斷？
09:44 鮑爾 圖片
09:46 鮑爾 圖片
09:47 Astolfo 排氣那個應該是有觸發到excess property checking的現象
09:48 Astolfo type Config應該要改這樣：

type Config = {
  theme: 'light' | 'dark';
  size: 'small' | 'large';
  [key: string]: unknown;
};
09:48 Astolfo @排氣管管
09:49 排氣管管 感謝～來研究一下
09:49 Astolfo satisfies還是會excess檢查
09:50 Astolfo 對他來說那是多出來的一個key，要重新定義新增的類型是什麼
09:50 Pod042-A 型別宣告會變成型別沒有的屬性不給叫，satisfies的話物件本身的key可以叫🤔
09:51 Astolfo 但有個有趣的現象
09:51 Astolfo 你們寫成function以後會看到字面保留的差異

```ts
type Config = {
  theme: 'light' | 'dark';
  size: 'small' | 'large';
};

const config1: Config = {
  theme: 'dark',
  size: 'large',
};

const config2 = {
  theme: 'dark',
  size: 'large',
} satisfies Config;

function onlyDark(t: 'dark') { }
function onlyLarge(s: 'large') { }

 /*
這裡會出現Argument of type '"light" | "dark"' is not assignable to parameter of type '"dark"'.
 Type '"light"' is not assignable to type '"dark"'.ts(2345)
*/
onlyDark(config1.theme);

//這裡正常
onlyDark(config2.theme);
```
09:52 Astolfo 不擴充Config type的前提下

09:52 鱈魚 enable 判定成 true 與額外屬性應該是沒什麼關係？
