---
title: 'Design Token 不是色票：seed、alias 與工程師的崩潰日常'
image: ''
description: 'guidelines 是 guidelines，design token 是 design token。從一堆色票講到 seed token、alias token 怎麼分層，為什麼兩位以上設計師、兩套以上主題時它特別重要，順便吐槽設計與工程協作時最常遇到的斷層。'
keywords: ''
author: Opshell
createdAt: '2024-09-20'
categories:
  - 未分類
tags:
  - design token
  - UI/UX
  - 協作
  - SCSS
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：把原本的吐槽與筆記整理成觀點文，截圖依內容放回，補了分層的程式碼範例。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
這篇起源於一段跟同行聊設計協作的對話，越聊越有共鳴：設計稿上只有一堆色票、元件的狀態沒人設計、seed token 和 alias token 分不清楚。與其一直抱怨，不如把 design token 到底是什麼、為什麼要分層講清楚，下次開會可以直接丟連結。寫給前端，也寫給願意多走一步的設計師。
:::

## 懶人包
- guidelines 是統稱（品牌規範、使用原則），design token 是更細項的東西：把設計決策變成有名字的變數。
- 沒有 design token，就只是一堆色票；有了，色票會變成 `$primary-100`、`$success-default` 這種有意義的名字。
- `blue-500`、`green-500` 是 seed token，是雛型但不直接使用；要經過 map 分配成 alias token，才拿到業務場景裡用。
- 當有兩位以上設計師協作同一個產品、而且有兩種以上主題時，design token 的效果會非常明顯。
- 設計師把 UI 當平面設計在做，是協作上最大的斷層。

## 觀點拆解

### 不是每個設計師都懂 design token
先說清楚，這不是在罵設計師這個職業。但實務上確實常遇到：也不是每個設計師都懂 design token，有些還會牽拖是工程師的問題；seed token、alias token 分不清楚的一大堆。

最讓人頭痛的是把 UI 當平面在做，還一副理直氣壯的。平面設計交付的是「一張完成的畫面」，UI 交付的應該是「一套會動、會有各種狀態的系統」。常見的情況：

- 列表要有載入中的 skeleton 佔位、要有空狀態、錯誤狀態，設計稿上沒有，推給工程師自己搞。
- 元件庫的概念是零，同一個按鈕在五個畫面裡有五種圓角。
- Figma 裡點下去，看不到 design token 標示的細節，只看到一個 `#3B6FD8`。

我遇過最誇張的情況，是要先跟對方主管要了權限、自己把 Figma 整理過一輪，才有辦法開始做事。

### guidelines 不等於 design token
這兩個詞常被混在一起用，但它們不是一回事：

- **guidelines** 是一個統稱：品牌該怎麼用、按鈕什麼時候用主要色、文案語氣如何，偏向「原則與說明」。
- **design token** 是更細項的東西：把每一個設計決策變成一個有名字、可以被程式引用的值。

guidelines 告訴你「重要的操作用主要色」，design token 告訴你「主要色叫 `color-primary`，值是什麼，hover 時換成哪一個」。

### 從色票到 token
沒有 design token 的設計稿，就是一堆色票：`#3B6FD8`、`#2F5BB7`、`#E8EFFC`…工程師只能用吸管一個個吸，再自己猜哪個是 hover、哪個是背景。

有 design token 的話，色票會改成 `$primary-100`、`$success-default` 這種色票變數。然後就開始會有 `blue-500`、`green-500` 這類的名字，這就是 design token 的雛型。

但它們也不是直接拿來用的，因為它們叫做 **seed token**：只描述「這是什麼顏色」，不描述「拿來做什麼」。要經過一層 map 分配，轉換成 **alias token**，才能在業務場景裡使用。

![Alias token 的分層：基礎色票 → 語意化的 alias → 元件](/images/article/design-token/messageImage_1726813383949.jpg)

這張圖就是 design token 的用法：左邊是 seed（`Gray 750`、`Purple 250`、`Space M`），中間是 alias（`Color Text Body`、`Color Accent`、`Padding`），右邊的卡片元件只認中間那一層。

### 什麼時候它會發揮作用
如果整個產品只有一位設計師、一種主題，老實說直接用色票也活得下去。但只要符合這兩個條件：

1. **兩位以上的設計師**協作同一個產品；
2. **兩種以上的主題**（深淺色、多品牌）；

design token 的作用就會非常明顯。沒有它，兩位設計師各自挑「看起來差不多的藍」，主題一多，每個顏色都要逐一對照替換。有了它，大家講的是同一個名字，換主題只換 seed 和 alias 之間的那張對照表。

### Ant Design 分得更細
Ant Design 的 token 體系設計得更複雜：seed token 先經過演算法產生一整組 map token（例如從一個主色自動算出背景色、hover 色），再對應到 alias token，最後才進到元件。

![Ant Design 的 token 分層：Seed → Map Algorithm → Map Token → Alias Token → Components](/images/article/design-token/messageImage_1726813655653.jpg)

中間多了一層「演算法」，意思是設計師只要決定一個主色，其他衍生色都由規則算出來，不用每個都手動挑。

## 例子與對比

### 用 SCSS 寫出分層
```scss
@use 'sass:map';

// seed token：只描述顏色本身
$seed: (
    'blue-100': #e8effc,
    'blue-500': #3b6fd8,
    'blue-700': #2f5bb7,
    'gray-900': #1f1f1f,
    'white': #ffffff
);

// alias token：描述用途，值指向 seed
$alias: (
    'color-primary': map.get($seed, 'blue-500'),
    'color-primary-hover': map.get($seed, 'blue-700'),
    'color-primary-soft': map.get($seed, 'blue-100'),
    'color-text': map.get($seed, 'gray-900'),
    'color-bg': map.get($seed, 'white')
);

// 輸出成 CSS 變數，元件只用 alias
:root {
    @each $name, $value in $alias {
        --#{$name}: #{$value};
    }
}
```

元件再往下一層，也可以有自己的 component token，把一個元件會用到的值收在一起：

![按鈕元件的 component token：submit、cancel、danger 各自的文字、背景、邊框色](/images/article/design-token/1726812813138.jpg)

這張的值還是寫死的色碼，比較好的做法是把 `#111199` 這些換成 alias token，按鈕就會跟著主題變。

### 有 token 與沒有 token

| | 只有色票 | 有 design token |
|---|---|---|
| 設計稿上看到 | `#3B6FD8` | `color-primary` |
| 工程師要做的事 | 吸色、猜用途 | 照名字引用 |
| 新增深色主題 | 每個顏色逐一替換 | 換一張 seed → alias 對照表 |
| 兩位設計師 | 各自挑「差不多的藍」 | 用同一組名字 |

## 結論
design token 的本質是「把設計決策取名字」，seed 負責「是什麼」，alias 負責「做什麼」，元件只認 alias。這件事不該只是工程師的事，最好的情況是設計師在 Figma 裡就用 token 命名，工程師點下去就看得到。

設計和工程之間的斷層，不會因為一方比較努力就消失。但至少，下次可以把這篇丟到群組裡 ~~（然後假裝不是在講某個人）~~。
