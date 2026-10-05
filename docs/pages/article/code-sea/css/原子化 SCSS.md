---
title: 原子化 SCSS：用 map 與迴圈產生有意義的 class，順便解決重複的 media query
image: ''
description: '把原子化 CSS 的概念搬到 SCSS 上：用巢狀迴圈把色彩主題 map 展開成有意義的 class name、用 map 管理元件樣式，以及 RWD mixin 打包後一大堆重複 media query 的整理方式。'
keywords: ''
author: Opshell
createdAt: '2024-09-20'
categories:
  - 未分類
tags:
  - SCSS
  - Sass
  - design token
  - RWD
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：把原本的討論串整理成文章敘述，照順序放回截圖，補了 media query 合併的說明。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
這篇整理自一段跟同好討論 SCSS 的對話：原子化 CSS 的概念放到 SCSS 上能做到什麼程度、巢狀到底該不該用，以及一個困擾我很久的問題，RWD 的 mixin 打包之後會產生一大堆重複的 media query。寫給已經會寫 SCSS 變數和 mixin、想再往上一層的人。
:::

## 懶人包
- 原子化 CSS 的概念應用在 SCSS 上會變得更強大，因為 SCSS 允許動態組合 class name（包括 attribute 選擇器）。
- 用巢狀的 `@each` 把色彩主題 map 展開，能產生 `.nt-primary-900` 這種有意義的 class；巢狀跟產出的 CSS 大不大包沒有絕對關係。
- 巢狀迴圈不好懂的話，可以改成「一張 map 描述一個元件的樣式」，用一個 mixin 把 map 展開。
- RWD 的 mixin 寫在每個選擇器底下，打包後同一個斷點會出現很多次；用斷點 map 加迴圈減少手寫的重複，最後交給 `postcss-sort-media-queries` 合併。

## 技術拆解

### 為什麼 SCSS 適合做原子化
原子化 CSS 的核心是「一個 class 只做一件事」，例如 `.text-primary` 只負責文字顏色。手寫幾百個這種 class 很痛苦，但 SCSS 可以用插值 `#{}` 動態組出 class name，連 attribute 選擇器也行，所以只要把規則寫成 map，一個迴圈就能全部產生。

有一個限制要注意：`:nth-child()` 裡的參數只能是單純的數字或 `2n+1` 這類寫法，不能放 CSS 變數，也不能直接塞一個 Sass 運算式。要在裡面用計算過的 Sass 變數，必須先算好、再用插值包起來：`:nth-child(#{$i * 2})`。

另外，新版的 Dart Sass 已經不支援用 `/` 做除法，要改用 `math.div()`：

```scss
@use 'sass:math';

.box {
    width: math.div(100%, 3);
}
```

### 用巢狀迴圈產生主題 class
先把所有色票收成一張主題 map，每個分類下面有各種色階，甚至可以放漸層：

![原子化SCSS-1](/images/article/原子化SCSS-1.jpg)

外層迴圈跑分類（`primary`、`secondary`…），內層跑色階；遇到值本身還是一張 map 就再往下一層。最後判斷值是不是 `linear-gradient`，是的話寫成 `background`，不是就寫成 `color`。產生出來的 CSS 會長這樣：

![原子化SCSS-2](/images/article/原子化SCSS-2.jpg)

`$theme-prefix` 讓不同版型的專案可以換前綴，同一套規則套到別的專案只要改一個字串。

### 巢狀到底該不該用
有人會覺得為什麼要嵌套，看到嵌套就反感。我的看法是：那是用得不夠多，不知道嵌套這件事跟產出的 CSS 大不大包沒有絕對關係。

這段嵌套的用意，是把色彩主題裡的各個分類取出來，產生有意義的 class name。它是在「產生」規則，不是在把選擇器越疊越深。會讓 CSS 變肥的是選擇器巢狀太深（`.a .b .c .d`），不是迴圈的巢狀。

有跟 UI 設計師協作過 design token 怎麼定的人，一定知道我在講什麼：色票本來就是「分類 → 色階」的兩層結構，程式長成兩層迴圈再自然不過。

### 簡化版：一張 map 描述一個元件
不過這種巢狀迴圈確實不是很好懂，所以在做換皮相關的功能時，可以用一個更簡化的方式：把一個元件的樣式寫成 map，再用一個 mixin 把 map 的 key 和 value 原封不動地展開成 CSS 屬性。

![原子化SCSS-3](/images/article/原子化SCSS-3.jpg)

編譯出來的結果：

![原子化SCSS-4](/images/article/原子化SCSS-4.jpg)

好處是樣式變成「資料」，要換皮就換一張 map，不用去改選擇器。

## 例子與對比

### 打包後一大堆重複的 media query
說到 SCSS 和打包，有一個困擾我很久的問題。常見的 RWD mixin 長這樣：

```scss
// RWD
@mixin setRWD($size) {
    @media(max-width: $size){
        @content;
    }
}
```

這種 mixin 會在每個選擇器底下各自呼叫，打包之後就會有一大堆一樣的 `@media (max-width: 768px)`。有沒有辦法讓它們變成一個？

討論時得到的回答是：一般不會讓每個地方各自傳尺寸進來，而是先定好幾個斷點區間（`md`、`lg`、`xl` 這種），mixin 只接受這幾個名字：

![原子化SCSS-7](/images/article/原子化SCSS-7.jpg)

再進一步，如果要依斷點自動配置不同的樣式，可以自訂一張「斷點 → 樣式」的 map，用 `@each` 餵進去：

![原子化SCSS-6](/images/article/原子化SCSS-6.jpg)

這樣就不用擔心會寫太多重複的程式碼，產出的 CSS：

![原子化SCSS-5](/images/article/原子化SCSS-5.jpg)

完整的寫法如下（有些舊語法在現在的 Dart Sass 不適用，這版是可以直接跑的）：

```scss
// 定義 Breakpoint 的對應像素值
$breakpoints: (
    'xs': 480px,
    'sm': 768px,
    'md': 992px,
    'lg': 1200px,
    'xl': 1600px
);

// Mixin 根據 Breakpoint 名稱生成相應的 Media Query
@mixin useBreakPoint($breakpoint) {
    // 從 $breakpoints 中查找對應的 Breakpoint 尺寸
    $breakpoint-value: map-get($breakpoints, $breakpoint);

    // 如果找到對應尺寸，生成 Media Query
    @if $breakpoint-value {
        @media screen and (max-width: $breakpoint-value) {
            @content;
        }
    } @else {
        @warn "Breakpoint '#{$breakpoint}' is not defined in $breakpoints map.";
    }
}

// 使用 Mixin
// .container {

//     @each $size in 'xs', 'sm', 'md' {
//         @include useBreakPoint($size) {
//             display: block;
//         }

//         @include useBreakPoint($size) {
//             display: flex;
//         }

//         @include useBreakPoint($size) {
//             display: grid;
//         }
//     }

// }

$breakpoint-styles: (
    'xs': (display: block),
    'md': (display: flex),
    'lg': (display: grid)
);

.container {
    @each $breakpoint, $styles in $breakpoint-styles {
        @include useBreakPoint($breakpoint) {
            @each $property, $value in $styles {
                #{$property}: #{$value}; // 將樣式插入到對應的 Media Query 中
            }
        }
    }
}
```

::: tip
`map-get()` 是舊的全域函式，新版 Dart Sass 會提示棄用。新寫法是在檔案開頭 `@use 'sass:map';`，然後改用 `map.get($breakpoints, $breakpoint)`。
:::

### 真正把它們合併成一個
上面的寫法解決的是「手寫的重複」，但每個選擇器還是會產生自己的 `@media` 區塊。要在輸出的 CSS 裡把同一個斷點真的合併成一個，是打包階段的事，用 PostCSS 外掛 `postcss-sort-media-queries`：它會把相同條件的 media query 合併、並依斷點大小排序。

```js
// postcss.config.js
export default {
    plugins: {
        'postcss-sort-media-queries': {
            sort: 'desktop-first'
        }
    }
};
```

`sort` 要跟自己的寫法一致：用 `max-width` 由大往小寫的是 `desktop-first`，用 `min-width` 的是 `mobile-first`。

| 做法 | 解決什麼 | 代價 |
|---|---|---|
| 斷點名稱 mixin | 尺寸數字不再到處亂寫 | 沒有合併 |
| 斷點 → 樣式 map | 少寫重複的 `@include` | 輸出還是每個選擇器一份 |
| `postcss-sort-media-queries` | 輸出真的合併、排序 | 改變了規則的順序，權重相同的規則可能互相覆蓋的結果會變 |

最後一欄的代價要特別注意：合併等於把 media query 搬到檔案後面，如果原本依賴「寫在後面的贏」，合併後結果可能不同。另外，重複的 media query 經過 gzip 壓縮後其實佔不了多少體積，在意的是可讀性的話，可以先不急著合併。

## 參考
- [SCSS 筆記（含 math.div 寫法）](https://hackmd.io/@FortesHuang/HJPE3sCXU)
- [開源的原子化 SCSS 參考](https://hackmd.io/@FortesHuang/SJ9DhgTGn)
- [斷點區間 mixin 的 Sass Playground](https://sass-lang.com/playground/#eJyFkUFLAkEUx+/7KR4VqJClEVbrRboH9RFGZ7Sh2VF21tyIhagghaIgTxblpahDZdDBouzLuLvHvkIzu2usSXQZ+DPv9/7v/142Oz8P7mPHH9zDqknQVq1KuQV+59DtnXhHLffg1H/punvv2kzx51vokNQAErZI6LC4nKnZs0oKQ8ql3HIkDSzlyspCJFlFyuxCZlRtM6VzSmupvKbJOdaoTTl43VfvvBOfxj078e+e/fa11zzzL/pyLDkfrBFMEWzUibmjFYwArQsSYOsKS8YmTsGu9FRRB1cQTwLD/oN3feO1BmFe1Tju3Htzn/oSjTHpbcTqRAcD1dIVMmYjZuOFKlVoervvXV0qj2YvWmvQ9+v9OAw1lgWgQMuThkEC+WcEpaJkEsIBcQxJA9npBsXWpj5JpSJMgqUqtwi38oF25OtAgTDx07iBTA5TsfCJ6d1YPycBVACvWoBJmXKCQS58bJVyIXNTqr2jOcE9hx+ffvsuPKs2p/yRBM3AsEB5idUx+XUzW4wmxlTUGNrRociqpa2w7d+cgSe4MiP2fxirTGAVk+IoxDdyQCW+)
- [斷點 → 樣式 map 的範例](https://tinyurl.com/4cmkay8t)

## 結論
SCSS 的強大不在巢狀和變數，而在「把規則寫成資料」。色彩主題、元件樣式、斷點，全部收進 map，迴圈負責產生，要改的時候只動資料。

至於重複的 media query，手寫的重複交給 map，輸出的重複交給 PostCSS，各司其職。被嵌套嚇到的朋友，先寫一個迴圈試試，你會回來感謝它的 ~~（或是回來罵我，都歡迎）~~。
