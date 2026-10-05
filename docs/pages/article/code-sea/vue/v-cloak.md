---
title: v-cloak：畫面閃過一堆 {{ }} 怎麼辦
image: ''
description: '用 script 標籤直接載入 Vue 時，畫面會先閃過還沒編譯的 {{ message }}。v-cloak 加上一行 CSS 就能把它藏起來；但如果你用的是 Vite + SFC，其實根本不需要它。'
keywords: ''
author: Opshell
createdAt: '2024-09-02'
categories:
  - vue
tags:
  - vue
  - v-cloak
  - 指令
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的筆記寫成全文，補上一定要搭配的 CSS、什麼情況才需要，以及 SFC 專案為什麼用不到。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
常見的情況是：舊網站或後端模板（PHP、.NET、Django）想局部加一點互動，直接用 `<script src>` 載入 `Vue`，把它掛在一塊現有的 HTML 上。結果每次重新整理，畫面都先閃過一堆 `{{ message }}`，一秒後才變成正確的文字。

這篇寫給用 CDN 或 script 標籤載入 `Vue` 的人；如果你的專案是 `Vite` + `.vue` 檔，可以直接跳到結論。
:::

## 懶人包
- 如果你用 `src` 載入 `Vue`，常常會看到 `{{ }}`，代表 `Vue` 還沒載完、還沒編譯那塊 HTML。
- 這時候你要考慮的是 `v-cloak`：它會一直留在元素上，直到 `Vue` 把元件掛載完成才被移除。
- `v-cloak` -|本身不會隱藏任何東西|-，一定要自己加一行 `[v-cloak] { display: none; }`。
- 用 `Vite` + SFC 的專案，模板在建置時就編譯好了，HTML 裡不會出現 `{{ }}`，不需要 `v-cloak`。

## 技術拆解

### 為什麼會看到 {{ }}
用 script 標籤載入的情境，瀏覽器的順序是這樣：

1. HTML 先下載、先畫出來，這時 `{{ message }}` 就是一段普通文字。
2. `Vue` 的 JS 下載、執行。
3. `createApp().mount('#app')` 把那塊 HTML 當成模板編譯，換成真正的資料。

1 和 3 之間的空檔，使用者看到的就是原始模板。網路越慢，閃得越久。

### v-cloak 做了什麼
`v-cloak` 是一個「沒有值」的指令，它的行為只有一個：-|編譯完成以前，這個屬性會一直在；掛載完成後，`Vue` 會把它拿掉|-。

所以它其實是一個「標記」，告訴你這塊還沒好。要讓它真的「看不見」，得靠 CSS：

```css
[v-cloak] {
    display: none;
}
```

這樣編譯完成以前，`v-cloak` 這塊是不會被看見的；`Vue` 拿掉屬性的那一刻，選擇器不再命中，元素就出現了。

::: warning 一定要放在 head 裡
這行 CSS 要在 HTML 一開始就生效，所以要寫在 `<head>` 的 `<style>` 或最先載入的 CSS 檔裡。如果寫在 `Vue` 載入之後才生效的 CSS，那就跟沒寫一樣。
:::

## 例子與對比

### 沒有 v-cloak

```html
<div id="app">
    {{ message }}
</div>

<script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
<script>
    Vue.createApp({
        data() {
            return { message: '哈囉！' };
        }
    }).mount('#app');
</script>
```

重新整理時，畫面會先閃一下 `{{ message }}`。

### 有 v-cloak

```html
<head>
    <style>
        [v-cloak] {
            display: none;
        }
    </style>
</head>
<body>
    <div id="app" v-cloak>
        {{ message }}
    </div>

    <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
    <script>
        Vue.createApp({
            data() {
                return { message: '哈囉！' };
            }
        }).mount('#app');
    </script>
</body>
```

`v-cloak` 放在掛載點本身或裡面任何元素都可以，放在掛載點上就是整塊一起藏。

### 三種情境

| 情境 | 會閃 `{{ }}` 嗎 | 需要 `v-cloak` 嗎 |
|---|---|---|
| CDN／script 標籤，模板寫在 HTML 裡 | 會 | 需要 |
| `Vite` + `.vue` 單一檔案元件 | 不會，模板建置時已編譯 | 不需要 |
| `Nuxt`／SSR | 不會，伺服器直接吐渲染好的 HTML | 不需要 |

::: tip 藏起來 vs 先放骨架
整塊 `display: none` 的代價是：載入期間那塊是空白的，版面可能會跳一下。如果那塊很大，可以考慮在 `v-cloak` 期間顯示骨架或保留高度，例如 `[v-cloak] { visibility: hidden; }` 保留佔位，體驗會比忽然長出來好。
:::

## 結論
`v-cloak` 是 `Vue` 在「直接寫在 HTML 裡」那個年代留下來的小工具，到今天在 CDN 局部導入的情境還是很實用。記住它只是個標記，真正負責隱身的是你那一行 CSS。

`v-cloak` 就像隱形斗篷的標籤，光掛著不會隱形，要穿上 CSS 才算數。
