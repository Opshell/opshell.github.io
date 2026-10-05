---
title: 'clip-path：用 CSS 剪紙，剪出形狀也剪出動畫'
image: ''
description: 'clip-path 把元素剪成任何形狀，被剪掉的部分不佔視覺也不吃點擊。整理 inset、circle、polygon、path 與新的 shape() 怎麼用，以及拿它做揭露動畫時要注意的點數規則。'
keywords: ''
author: Opshell
createdAt: '2024-10-04'
categories:
  - 未分類
tags:
  - CSS
  - clip-path
  - animation
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：原本只有標題，依標題從頭寫成全文。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
設計稿上的斜切區塊、圓形頭像、六角形卡片，或是「從中間展開」的轉場，常見的做法是請設計切圖，或疊一堆偽元素去遮。其實 `clip-path` 一行就能解決，而且還能做動畫。這篇整理它的幾種形狀函式和動畫時的眉角。
:::

## 懶人包
- `clip-path` 像拿剪刀剪紙：剪掉的部分看不見，也點不到，但元素原本佔的空間不變。
- 常用四個形狀：`inset()` 長方形、`circle()`／`ellipse()` 圓、`polygon()` 多邊形、`path()` 任意路徑。
- 同一種形狀、同樣點數之間可以直接 transition，揭露動畫用它比用 `width` 或 `overflow` 順很多。
- `path()` 只吃 px，不能響應式；需要響應式的曲線，看新的 `shape()`。
- 陰影會被一起剪掉，要陰影就用 `filter: drop-shadow()` 加在父層。

## 技術拆解

### 先搞懂「剪」是什麼意思
`clip-path` 不會改變排版，元素還是佔原本那麼大的位置，只是畫面上「露出來」的範圍被限制了。跟 `mask` 的差別是：`clip-path` 是一刀切，邊界外全沒；`mask` 是用圖片的透明度決定，可以有半透明漸層。

### inset()：最常用的長方形
```css
.box {
    /* 上 右 下 左，往內縮多少；round 可以加圓角 */
    clip-path: inset(10px 20px 10px 20px round 12px);
}
```

拿來做「從左到右揭露」最方便：從 `inset(0 100% 0 0)` 到 `inset(0 0 0 0)`。

### circle() 與 ellipse()
```css
.avatar {
    clip-path: circle(50% at 50% 50%);
}
```

`at` 後面是圓心位置。做「從按鈕位置展開成全畫面」的轉場時，把圓心設在按鈕的座標，半徑從 `0` 動到 `150%` 就有那種水波擴散的效果。

### polygon()：多邊形
```css
.hexagon {
    clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%);
}

.slanted-section {
    clip-path: polygon(0 0, 100% 0, 100% 85%, 0 100%);
}
```

每一組是一個頂點的 `x y`，用百分比就會跟著元素大小縮放。斜切的區塊背景用這招，再也不用為了一條斜線切一張圖。

### path() 與 shape()
`path()` 吃的是 SVG 路徑字串，什麼曲線都畫得出來，但-|只能用 px|-，元素一變寬形狀就不對了。

新的 `shape()` 函式就是為了解決這個問題，語法像 SVG 路徑，但可以用百分比和 `calc()`。支援度還在擴大中，用之前以 caniuse 與 MDN 為準。

## 例子與對比

### 揭露動畫：clip-path vs width
```css
/* 做法 A：動 width */
.reveal-a {
    width: 0;
    overflow: hidden;
    transition: width .4s ease;
}

.reveal-a.is-show {
    width: 100%;
}

/* 做法 B：動 clip-path */
.reveal-b {
    clip-path: inset(0 100% 0 0);
    transition: clip-path .4s ease;
}

.reveal-b.is-show {
    clip-path: inset(0 0 0 0);
}
```

| | 動 `width` | 動 `clip-path` |
|---|---|---|
| 會不會觸發重新排版 | 會，每一幀都重排 | 不會 |
| 文字在動畫中 | 會被擠壓、換行亂跳 | 原地不動，只是慢慢露出來 |
| 能做的方向 | 只能往一邊長 | 上下左右、從中間、從圓心都行 |

做法 A 動畫時文字會一直重新換行，看起來很像在抖；做法 B 文字從頭到尾都在原位，只是遮罩在移動，順很多。

### 動畫的點數規則
兩個 `polygon()` 之間要能 transition，-|頂點數量必須一樣|-。想從三角形變成四邊形，就給三角形多一個重疊的點：

```css
.shape {
    /* 三角形，但寫成四個點（最後兩點重疊） */
    clip-path: polygon(50% 0, 100% 100%, 0 100%, 0 100%);
    transition: clip-path .4s ease;
}

.shape:hover {
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
}
```

不同函式之間（`circle()` 到 `polygon()`）不能動，會直接跳過去。

### 陰影被剪掉怎麼辦
`box-shadow` 畫在元素邊界外，會被 `clip-path` 一起剪掉。解法是在外面包一層，對父層下 `filter: drop-shadow()`，它會沿著剪出來的形狀畫陰影：

```css
.shape-wrapper {
    filter: drop-shadow(0 4px 8px rgb(0 0 0 / .2));
}
```

## 結論
`clip-path` 是那種學了就會一直想用的屬性：斜切背景、特殊形狀、揭露動畫，原本要切圖、疊偽元素、動 `width` 的事情，都能一行處理。記住三件事就好：被剪的地方點不到、同函式同點數才能動、陰影要交給父層。

剪紙這門手藝，終於從美勞課畢業進到 CSS 了。
