<!--
    Markdown 語法圖鑑的內文。兩個地方共用，改這裡兩邊一起變：
    - pages/markdown-theme-preview.md（文章）
    - pages/design-system.md 的 Markdown 分頁
    引入的頁面要自己 import MdPrism、MdSpec、MdUsageSpectrum（@features/markdown-guide）。
-->

光經過三稜鏡，會散成好幾種顏色。寫文章也是：我在編輯器裡打的是一行一行純文字，
經過 VitePress 和這個站自己加的幾條規則，才變成你現在看到的樣子。

這一頁把部落格裡**用過的每一種語法**都攤開來。每張卡片由上往下讀：先是寫法，再來是這個站**實際渲染**出來的樣子
（不是截圖，改了主題這裡會跟著變），最後說明為什麼這樣呈現，以及讀文章的時候該怎麼理解它。
點稜鏡的任何一道光就會切到那一層；往下讀的時候，導覽會跟著停在旁邊。

<MdGuide>
<template v-slot:overview>

## 先看光譜：哪些語法真的在用 {#spectrum}

先統計再設計。把 262 篇文章掃一遍，數出每種語法有幾篇用過，長條越長代表越常出現；點任何一條會跳到它的說明。

<MdUsageSpectrum />

幾個從光譜看得出來的事：

- **程式碼層很粗**：這是一個技術部落格，程式碼區塊與增刪標記是主角，所以程式碼的呈現花最多心思。
- **提示容器和一般引用一樣常用**：比起「引用別人」，我同樣常需要「提醒你」，所以五種容器各有一套形狀，讓你不用讀字就知道輕重。
- **螢光標記是 0**：規則寫好了，但渲染那一步一直沒掛上 class、也沒有樣式，寫了看不出差別，所以沒人用。這次修好了，下面會看到它。

</template>
<template v-slot:text>

## 文字層：一句話裡的強調 {#text}

文字層處理的是**同一句話裡**的差別。原則是：每一種強調只代表一種意思，看到樣式就知道作者的語氣。

### 粗體：術語膠囊 {#bold}

<MdSpec layer="text" origin="標準 Markdown" :posts="45">

```md
Vue 的 **響應式** 靠的是 **Proxy**。
```

<template v-slot:render>

Vue 的 **響應式** 靠的是 **Proxy**。

</template>

<template v-slot:why>

技術文章裡的粗體幾乎都是**名詞**：一個術語、一個 API。所以這個站把 `<strong>` 畫成跟行內程式碼同底色的品牌色膠囊，而不是單純加粗——
加粗在中文字裡很難看出來，膠囊一眼就跳出來。

</template>

<template v-slot:read>

看到膠囊，就當成「這是一個可以拿去搜尋的關鍵字」。只想抓重點的話，把一篇文章的膠囊串起來讀，大概就是它的骨架。

</template>

</MdSpec>

### 屬性著色：替字加上語意 {#attrs}

<MdSpec layer="text" origin="VitePress 內建" :posts="13">

```md
**Shell**{.brand} 是介面，
**波函數**{.info} 是引用的概念，
用 **Vue3**{.vue} 和 **TypeScript**{.typescript} 寫，
結果 **成功**{.success} 或 **失敗**{.error}。
```

<template v-slot:render>

**Shell**{.brand} 是介面，
**波函數**{.info} 是引用的概念，
用 **Vue3**{.vue} 和 **TypeScript**{.typescript} 寫，
結果 **成功**{.success} 或 **失敗**{.error}。

</template>

<template v-slot:why>

`{.class}` 是 markdown-it-attrs，可以把 class 掛在前一個元素上。這個站準備了一組**有語意**的顏色：
`brand` 是我自己的觀點、`info` 是引用來的知識、`vue`／`typescript` 用官方品牌色、`success`／`error`／`warning` 是對錯與注意。
跟粗體一起用，就是一顆有顏色的膠囊。

</template>

<template v-slot:read>

琥珀色的是作者想讓你記住的主張；靛藍色的是背景知識，不懂可以先跳過；綠色與紅色是「這樣對」「這樣錯」。

</template>

</MdSpec>

### 螢光標記：整句重點 {#mark}

<MdSpec layer="text" origin="站台自訂" :posts="0">

```md
Cookie 本身不安全，-|安全的是 HttpOnly 加 Secure|-。
```

<template v-slot:render>

Cookie 本身不安全，-|安全的是 HttpOnly 加 Secure|-。

</template>

<template v-slot:why>

膠囊適合一個詞，但有時候重點是**一整句**。`config.mts` 裡有一條自訂規則把 `-|…|-` 轉成 `<span class="mark">`，
以前渲染規則的名字寫錯、class 一直沒掛上去，這次修好並補上樣式：只塗下半截，像真的拿螢光筆畫過課本。選 `-|` 當記號，是因為它在一般文字裡幾乎不會出現，不會誤判。

</template>

<template v-slot:read>

被螢光筆畫到的句子就是「考試會考」的那一句。膠囊是名詞，螢光是結論。

</template>

</MdSpec>

### 刪除線：作者的小聲旁白 {#strike}

<MdSpec layer="text" origin="標準 Markdown" :posts="33">

```md
IE 8 不支援 MaxAge ~~(但是現在沒人在管 IE 了啦)~~
```

<template v-slot:render>

IE 8 不支援 MaxAge ~~(但是現在沒人在管 IE 了啦)~~

</template>

<template v-slot:why>

刪除線本來是「這段作廢」。在這個部落格它幾乎都拿來寫**吐槽**：括號包起來、劃掉，假裝沒說。
刻意保留預設樣式，因為「說了又劃掉」本身就是笑點，換成別的樣式就不好笑了。

</template>

<template v-slot:read>

不是錯誤，是作者在旁邊小聲講話。跳過不影響理解，讀了比較好笑。

</template>

</MdSpec>

### 行內程式碼 {#inline-code}

<MdSpec layer="text" origin="標準 Markdown" :posts="114">

```md
用 `defineProps` 宣告，記得先 `pnpm add vue`。
```

<template v-slot:render>

用 `defineProps` 宣告，記得先 `pnpm add vue`。

</template>

<template v-slot:why>

等寬字型加淺底色，和內文明顯分開。凡是**照抄就能用**的東西：函式名、指令、檔名、設定值，一律放這裡。

</template>

<template v-slot:read>

看到灰底等寬字，就是「原封不動複製」的意思，大小寫和符號都不要改。

</template>

</MdSpec>

</template>
<template v-slot:block>

## 區塊層：一段話的外框 {#block}

區塊層決定**一整段**是什麼性質。這裡最重要的設計是**形狀語言**：邊框越多，越需要停下來。

### 標題 {#heading}

<MdSpec layer="block" origin="標準 Markdown" :posts="127">

```md
## 區塊層：一段話的外框 {#block}
### 標題 {#heading}
```

<template v-slot:render>

往上看——這一頁的標題本身就是範例。一般文章裡 `##` 上面有一條分隔線、`###` 沒有（這裡是分頁的第一個標題，分頁本身就是分隔，所以省掉）；兩層都會出現在目錄裡。
後面的 `{#block}` 是自訂錨點，網址 `#block` 不會因為改了標題文字就失效。

</template>

<template v-slot:why>

`##` 是「換一個話題」，所以給它一條線當章節的分界；`###` 只是同一個話題裡的小節，不需要再切一刀。
目錄只收到第四層，再深的標題通常代表文章該拆了。

</template>

<template v-slot:read>

文章很長的時候，用右邊目錄跳；或是用鍵盤 <kbd>Ctrl</kbd> + <kbd>↑</kbd>／<kbd>↓</kbd> 在章節之間移動。

</template>

</MdSpec>

### 提示容器：五種輕重 {#container}

<MdSpec layer="block" origin="VitePress 內建" :posts="36">

```md
::: info
背景知識，想深入再看。
:::

::: tip 自訂標題也可以
順手的小技巧。
:::

::: warning
這裡容易踩坑。
:::

::: danger
這樣寫會壞掉。
:::

::: details
點開才看得到的長內容。
:::
```

<template v-slot:render>

::: info
背景知識，想深入再看。
:::

::: tip 自訂標題也可以
順手的小技巧。
:::

::: warning
這裡容易踩坑。
:::

::: danger
這樣寫會壞掉。
:::

::: details
點開才看得到的長內容。
:::

</template>

<template v-slot:why>

五種容器的標籤改成中文加英文（`config.mts` 的 `container`），因為很多文章是從 iThome 鐵人賽搬來的，兩種讀者都有。
形狀刻意不同：`tip` 只有左邊一條線（最輕）、`info` 整框靛藍（一塊獨立的補充）、`warning` 黃色全框（要停下來）、
`danger` 左右兩條紅線把內容**夾住**（被擋住、出錯了）、`details` 收起來（不想看可以不看）。

</template>

<template v-slot:read>

不用先讀字，看框就知道：一條線可以略過、整框值得看、紅線夾住的一定要看。

</template>

</MdSpec>

### 引言：有出處的話 {#quote}

<MdSpec layer="block" origin="站台自訂" :posts="2">

```md
::: quote 皮耶·泰亞爾·德·夏爾丹
我們不是人類擁有靈性體驗，而是靈性存在擁有人類體驗。
:::
```

<template v-slot:render>

::: quote 皮耶·泰亞爾·德·夏爾丹
我們不是人類擁有靈性體驗，而是靈性存在擁有人類體驗。
:::

</template>

<template v-slot:why>

一般引用 `>` 沒有地方放作者。自訂的 `quote` 容器把 `:::` 後面那串字當成出處，輸出成 `<figure>` 加 `<figcaption>`，
語意上就是「一段話和它的來源」。內文換成襯線斜體、前後加大引號，和程式碼味很重的內文拉開距離。

</template>

<template v-slot:read>

這是別人的話，而且是值得停下來想一想的那種。出處在右下角。

</template>

</MdSpec>

### 一般引用 {#blockquote}

<MdSpec layer="block" origin="標準 Markdown" :posts="36">

```md
> **核心定義**：「水合」指的是把靜態結構灌入狀態，
> 讓它變成可以互動的東西。
```

<template v-slot:render>

> **核心定義**：「水合」指的是把靜態結構灌入狀態，
> 讓它變成可以互動的東西。

</template>

<template v-slot:why>

綠色左線加淡綠底，向 Vue 文件的引用樣式致敬。它比引言安靜，用在定義、規格原文、或歌詞式的小段落。

</template>

<template v-slot:read>

這段話的權威在別處，通常是官方文件或一個定義。想查原文，就從這裡出發。

</template>

</MdSpec>

### 表格 {#table}

<MdSpec layer="block" origin="標準 Markdown" :posts="7">

```md
| 語法 | 層 | 意思 |
|---|---|---|
| `**` | 文字 | 術語 |
| `:::` | 區塊 | 提醒 |
| `[!code ++]` | 程式碼 | 新增 |
```

<template v-slot:render>

| 語法 | 層 | 意思 |
|---|---|---|
| `**` | 文字 | 術語 |
| `:::` | 區塊 | 提醒 |
| `[!code ++]` | 程式碼 | 新增 |

</template>

<template v-slot:why>

斑馬紋的底色跟著深淺色走（以前寫死淺灰，深色模式整列看不見，修過一次）。表格只用在真的要**比較**的時候，例如規範、選項對照。

</template>

<template v-slot:read>

先看第一欄找到你要的那一列，再橫著讀。

</template>

</MdSpec>

### 任務清單 {#task}

<MdSpec layer="block" origin="站台自訂" :posts="1">

```md
[x] 盤點部落格的語法
[x] 補上螢光筆樣式
[ ] 掛上腳註外掛
```

<template v-slot:render>

[x] 盤點部落格的語法
[x] 補上螢光筆樣式
[ ] 掛上腳註外掛

</template>

<template v-slot:why>

這是手寫的 markdown-it 區塊規則，不是 GitHub 的 `- [ ]`：**行首**直接寫 `[ ]` 或 `[x]` 就好，連續幾行會自動包成一組。
勾勾是用 CSS 畫的，打勾時有一段小動畫。

</template>

<template v-slot:read>

有勾的是作者已經做完的，空的是還欠著的。可以點，但重新整理就會回到原狀——它是作者的進度表，不是你的待辦。

</template>

</MdSpec>

### 圖片 {#image}

<MdSpec layer="block" origin="標準 Markdown" :posts="61">

```md
![原子化 SCSS 的檔案結構](/images/article/原子化SCSS-2.jpg)
```

<template v-slot:render>

![原子化 SCSS 的檔案結構](/images/article/原子化SCSS-2.jpg)

</template>

<template v-slot:why>

文章裡的圖片多半是截圖，字很小，所以每一張都掛了 medium-zoom：點一下放大到整個畫面，背景跟著深淺色走。
連續兩張圖中間會自動加一條分隔線，免得兩張截圖黏在一起看不出邊界。

</template>

<template v-slot:read>

看不清楚就點它。滑過去會微微放大，那就是「可以點」的意思。

</template>

</MdSpec>

</template>
<template v-slot:code>

## 程式碼層：讓程式碼自己說話 {#code}

這是一個技術部落格，程式碼層是最粗的那道光。所有程式碼區塊都用 Shiki 上色、主題是 **one-dark-pro**、一律有行號。

### 程式碼區塊 {#code-block}

<MdSpec layer="code" origin="VitePress 內建" :posts="95">

````md
```ts
const answer: number = 42;
```
````

<template v-slot:render>

```ts
const answer: number = 42;
```

</template>

<template v-slot:why>

上色用 one-dark-pro，是我和很多人在編輯器裡天天看的配色：
**關鍵字、字串、型別的顏色跟 IDE 一樣，讀起來就不用切換腦袋**。行號讓文章可以說「看第 3 行」。

</template>

<template v-slot:read>

右上角有語言標籤和複製鈕。注意 `vue-ts` 不是 Shiki 認得的語言，寫了會退回沒有顏色的純文字，Vue 檔請標 `vue`。

</template>

</MdSpec>

### 增刪標記：每一步只看改了什麼 {#diff}

<MdSpec layer="code" origin="VitePress 內建" :posts="17">

````md
```js
const config = {
    lineNumbers: false, // [!!code --]
    lineNumbers: true, // [!!code ++]
};
```
````

<template v-slot:render>

```js
const config = {
    lineNumbers: false, // [!code --]
    lineNumbers: true, // [!code ++]
};
```

</template>

<template v-slot:why>

這是全站用最兇的標記（17 篇、一百八十處左右），因為鐵人賽是**一步一步**教：每一天都在前一天的程式碼上加東西。
與其貼兩份讓讀者自己比，不如直接把新增的行塗綠、刪掉的行塗紅，標記用的註解在渲染時會被拿掉。

</template>

<template v-slot:read>

照著做的時候，只要改綠色和紅色的那幾行；其他行代表「跟上一步一樣」。

</template>

</MdSpec>

### 行高亮與錯誤標記 {#highlight}

<MdSpec layer="code" origin="VitePress 內建" :posts="2">

````md
```js{2}
const a = 1;
const b = 2;
const c = a + d; // [!!code error]
```
````

<template v-slot:render>

```js{2}
const a = 1;
const b = 2;
const c = a + d; // [!code error]
```

</template>

<template v-slot:why>

`{2}` 寫在語言後面，把第 2 行打亮，適合「這段裡只有這一行是重點」。`[!code error]` 把整行塗紅，示範錯誤寫法時用。
兩個都不改程式碼本身，讀者還是可以整段複製。

</template>

<template v-slot:read>

打亮的那一行是作者要你看的；紅色那行是反例，**不要照抄**。

</template>

</MdSpec>

### 程式碼分頁 {#code-group}

<MdSpec layer="code" origin="VitePress 內建" :posts="15">

````md
::: code-group
```sh [pnpm]
pnpm add vitepress
```
```sh [npm]
npm i vitepress
```
:::
````

<template v-slot:render>

::: code-group
```sh [pnpm]
pnpm add vitepress
```
```sh [npm]
npm i vitepress
```
:::

</template>

<template v-slot:why>

同一件事有好幾種版本（套件管理器、Input 與 Output、改前與改後），並排會很長，所以收進分頁。
方括號裡的字就是分頁名稱。

</template>

<template v-slot:read>

挑你在用的那一個分頁看就好，其他的是同一件事的另一種寫法。

</template>

</MdSpec>

</template>
<template v-slot:live>

## 互動層：會動的文章 {#live}

VitePress 的 markdown 最後會編譯成 Vue 元件，所以文章裡可以直接放**活的東西**。

### Vue 元件 {#vue}

<MdSpec layer="live" origin="VitePress 內建" :posts="21">

```md
<script setup>
import { MdUsageSpectrum } from '@features/markdown-guide';
</script>

<ElTag tag="Markdown" />
<MdUsageSpectrum />
```

<template v-slot:render>

<ElTag tag="Markdown" style="display: inline-flex;" />

這一頁最上面的稜鏡、分頁、還有語法光譜，都是用這個方法放進來的元件。

</template>

<template v-slot:why>

`El` 開頭的基本元件全站自動註冊，直接寫就好；其他元件在 `<script setup>` 裡匯入。
文章要示範互動（設計系統、拖拉、表單）時，與其放一張動圖，不如放一個真的能操作的元件。

</template>

<template v-slot:read>

文章裡看起來像按鈕、標籤、卡片的東西，通常真的可以點。

</template>

</MdSpec>

### 沙盒：可以執行的範例 {#sandbox}

<MdSpec layer="live" origin="外掛" :posts="2">

````md
::: sandbox {template=vue3-ts}
```vue App.vue
<template>
  <button @click="count++">{{ count }}</button>
</template>
```
:::
````

<template v-slot:render>

會變成一個 Sandpack 編輯器：左邊改程式碼、右邊即時執行，還能一鍵開到 CodeSandbox。
它要載入外部的執行環境，比較重，這裡不放活的，實際效果請看
[〈Day 27 Sandbox〉](/article/code-sea/vitepress/2024鐵人賽/day27-sandbox.html)。

</template>

<template v-slot:why>

讀者最想做的事是「改一個值看看會怎樣」。`vitepress-plugin-sandpack` 讓程式碼區塊直接變成可以跑的環境，不用離開文章。

</template>

<template v-slot:read>

看到沙盒就大膽改。改壞了重新整理，什麼都不會留下。

</template>

</MdSpec>

</template>
<template v-slot:off>

## 還沒折射的光 {#off}

有些語法寫在文章裡、或套件裝了，但還沒啟用。誠實列出來，免得你以為是自己眼花。

### 腳註與數學式 {#footnote-math}

<MdSpec layer="off" origin="未啟用" :posts="2">

```md
Cookie 的規格在 RFC 6265[^1]。
圓周率 $\pi$ 包含了一切可能。
```

<template v-slot:render>

Cookie 的規格在 RFC 6265[^1]。
圓周率 $\pi$ 包含了一切可能。

</template>

<template v-slot:why>

`markdown-it-footnote` 有裝但沒有掛進 `config.mts`，`markdown.math` 也沒開，所以右邊照原樣印出來。
目前只有〈Cookie 與 Session〉用了腳註、〈Opshell 的哲學意義〉的副本用了 `$\pi$`，量不大，還沒決定要不要為它們多載一套外掛。

</template>

<template v-slot:read>

文章裡看到 `[^1]` 或 `$…$`，是作者想加註解或公式，目前還是原文。

</template>

</MdSpec>

### VitePress 內建、但還沒用過的 {#builtin-unused}

這些不用裝任何東西就能用，只是還沒有文章用到。之後用上了，會加進上面的光譜。

| 寫法 | 效果 | 適合拿來 |
|---|---|---|
| `> [!TIP]` | GitHub 風格的提示框 | 從 GitHub README 搬過來的內容 |
| `:tada:` | 轉成 emoji 🎉 | 輕鬆的文章 |
| `[[toc]]` | 在文中插入目錄 | 手機上沒有右側目錄時 |
| `// [!code focus]` | 其他行變模糊，只留這行 | 長程式碼裡只講一行 |
| `<<< @/snippets/a.ts` | 從檔案匯入程式碼 | 文章與範例程式碼同步 |
| `<Badge type="tip" text="new" />` | 標題旁的小徽章 | 標示版本、新功能 |

</template>
</MdGuide>

## 附錄：在這個部落格讀文章 {#shortcuts}

| 按鍵 | 做什麼 |
|---|---|
| <kbd>←</kbd>／<kbd>→</kbd> | 上一篇／下一篇 |
| <kbd>Ctrl</kbd> + <kbd>↑</kbd>／<kbd>↓</kbd> | 上一個／下一個章節 |
| 文章右上角的放大鈕 | 專注模式：收起兩側，只留文章 |

完整的 VitePress 語法清單在官方文件的 [Markdown Extensions](https://vitepress.dev/guide/markdown)。
