---
title: 'height: auto 終於能做動畫了：interpolate-size 與 calc-size'
image: ''
description: '手風琴展開要動畫，卡在 height: auto 不能 transition。整理過去的三種繞路（max-height、grid 0fr→1fr、JS 量高度），以及新的 interpolate-size 和 calc-size() 怎麼用、怎麼漸進增強。'
keywords: ''
author: Opshell
createdAt: '2024-10-17'
categories:
  - 未分類
tags:
  - CSS
  - animation
  - interpolate-size
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的三個參考連結寫成全文，補了舊做法對比與漸進增強的寫法。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
手風琴、下拉選單、「展開更多」，只要內容高度不固定，想加個展開動畫就會撞到同一面牆：`height: auto` 不能做 transition。這些年大家發明了一堆繞路的方法，直到 CSS 終於給了官方解。這篇把新舊做法放在一起比，寫給還在用 `max-height: 9999px` 的朋友。
:::

## 懶人包
- `height: 0` 到 `height: auto` 不會有動畫，因為瀏覽器不知道怎麼在「數字」和「關鍵字」之間插值。
- 舊做法三選一：`max-height` 硬給大數字、`grid-template-rows: 0fr → 1fr`、JavaScript 量 `scrollHeight`。
- 新做法：在 `:root` 寫一行 `interpolate-size: allow-keywords`，`auto`、`fit-content` 這些關鍵字就能直接做動畫。
- 只想針對單一屬性，用 `calc-size(auto, size)`。
- 新屬性目前是 Chromium 系先支援，不支援的瀏覽器只是沒動畫、照樣能用，很適合漸進增強。

## 技術拆解

### 為什麼 auto 不能動
transition 的原理是「從 A 數字到 B 數字，中間每一幀算一個值」。`0px` 到 `200px` 很好算，但 `0px` 到 `auto`？`auto` 不是一個數字，是「你自己看著辦」，瀏覽器沒辦法在中間插一個「一半的 auto」。所以它直接跳過去，動畫就沒了。

### 舊做法一：max-height 硬給大數字
```css
.panel {
    max-height: 0;
    overflow: hidden;
    transition: max-height .3s ease;
}

.panel.is-open {
    max-height: 1000px;
}
```

能動，但有兩個毛病：內容只有 100px 的話，前 900px 的時間都在「空轉」，收合時會先卡一下才開始動；內容超過 1000px 就被切掉。就像為了裝一顆蘋果買了一個行李箱。

### 舊做法二：grid 0fr → 1fr
`grid-template-rows` 的 `fr` 是可以插值的，利用這點包一層：

```css
.panel {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows .3s ease;
}

.panel.is-open {
    grid-template-rows: 1fr;
}

.panel__inner {
    overflow: hidden;
}
```

這招動畫時間準確，也不用 JavaScript，是新屬性出來前最推薦的做法。代價是要多一層 DOM，而且內層要 `overflow: hidden`。

### 舊做法三：JavaScript 量高度
展開前用 `scrollHeight` 量出真正的高度，設成具體的 px，動畫跑完再改回 `auto`。最精準，但要處理 `transitionend`、內容變動時重量，寫起來囉嗦。

### 新做法：interpolate-size
```css
:root {
    interpolate-size: allow-keywords;
}

.panel {
    height: 0;
    overflow: hidden;
    transition: height .3s ease;
}

.panel.is-open {
    height: auto;
}
```

就這樣，沒有了。`interpolate-size` 是會繼承的屬性，寫在 `:root` 整個網站都生效。它之所以要手動開啟、不是預設行為，是怕改變既有網站的表現（本來不會動的東西突然動起來）。

### calc-size()：只開一個屬性
不想全站打開，可以在單一屬性上用 `calc-size()`：

```css
.panel.is-open {
    height: calc-size(auto, size);
}
```

第二個參數 `size` 代表「第一個參數算出來的那個尺寸」，所以還能再加工，例如 `calc-size(auto, size + 20px)`。

### details 也能一起用
原生的 `<details>` 配上 `::details-content` 偽元素，就能做出不用 JavaScript 的手風琴動畫：

```css
details::details-content {
    height: 0;
    overflow: hidden;
    transition: height .3s ease, content-visibility .3s allow-discrete;
}

details[open]::details-content {
    height: auto;
}
```

`content-visibility` 那段是因為收合時瀏覽器會把內容藏起來，要用 `allow-discrete` 讓它等動畫跑完再藏。

## 例子與對比

| 做法 | 動畫時間準確 | 要 JavaScript | 多一層 DOM | 支援度 |
|---|---|---|---|---|
| `max-height` | 不準 | 不用 | 不用 | 全部 |
| `grid 0fr → 1fr` | 準 | 不用 | 要 | 全部 |
| JS 量高度 | 準 | 要 | 不用 | 全部 |
| `interpolate-size` | 準 | 不用 | 不用 | Chromium 129 起，其他以 caniuse 為準 |

### 漸進增強的寫法
因為不支援的瀏覽器只是「沒動畫、直接展開」，功能完全正常，所以可以放心直接用新寫法。想要舊瀏覽器也有動畫，就把 grid 做法當底，用 `@supports` 疊上去：

```css
.panel {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows .3s ease;
}

.panel.is-open {
    grid-template-rows: 1fr;
}

@supports (interpolate-size: allow-keywords) {
    :root {
        interpolate-size: allow-keywords;
    }
}
```

說實話，多數情況我會選擇直接用新寫法，讓舊瀏覽器沒動畫就好 ~~（動畫是錦上添花，不是雪中送炭）~~。

## 參考
- [This new CSS property just solved animating to height auto](https://www.youtube.com/watch?v=JN-nme9oF10)
- [Transitioning to Auto Height](https://css-tricks.com/transitioning-to-auto-height/)
- [这啥?CSS calc-size和interpolate-size,真学不动了](https://www.zhangxinxu.com/wordpress/2024/11/css-calc-interpolate-size/)

## 結論
`height: auto` 的動畫問題困擾了前端十幾年，現在一行 `interpolate-size: allow-keywords` 就收工。那些 `max-height: 9999px` 可以光榮退休了。

學不動也沒關係，這個真的值得學，畢竟它是讓你少寫程式的那種新東西。
