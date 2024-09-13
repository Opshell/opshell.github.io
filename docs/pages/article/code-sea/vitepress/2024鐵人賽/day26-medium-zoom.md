---
title:  'Day26 - medium-zoom'
author: 'Opshell'
createdAt: '2024/09/26'
categories: 'vitepress-thirty-days'
tags:
  - 鐵人賽
  - VitePress
editLink: true
isPublished: false
---

由於文章頁面的版面設計，左右邊都有欄目，在引用比較大張的圖片時，縮圖對我這種老人家不夠友善，所以我們添加圖片放大功能，順便優化一點圖片的樣式吧。

## 安裝 medium-zoom
```sh
yarn add medium-zoom -D
```

## 設定 medium-zoom
在 `docs/.vitepress/theme/index.ts` ，新增相關設定：

```ts
import mediumZoom from 'medium-zoom'; // [!code ++]

function initZoom() { // [!code ++]
    mediumZoom('.main img', { background: 'var(--vp-c-bg)' }); // [!code ++]
} // [!code ++]

export default {
    setup() {
        const route = useRoute();

        onMounted(async () => {
            initZoom();
            reloadBusuanzi(); // 初始化
        });
        watch(() => route.path, () => {
            nextTick(() => {
                initZoom();
                reloadBusuanzi(); // 監聽
            });
        });
    }
};
```

## 優化樣式
由於我們的部落格有 `白日` 和 `黑夜` 模式，為了不讓圖片底色造成的識別不清問題降低閱讀體驗，我們調整一下圖片樣式，加入 `1px` 輕輕柔柔的邊框，把邊界感拉出來又不太過火，
然後加入 hover 會稍稍為放大的效果提醒瀏覽者這個東西可以按喔~
在 `docs/.vitepress/theme/scss/_vitepress.scss` 中加入：
```scss
// markdown 圖片樣式
.medium-zoom-image {
    border: 1px solid var(--vp-c-brand-soft);
    border-radius: 5px;
    &:hover {
        border-color: var(--vp-c-brand-1);
        transform: scale(1.01, 1.01);
    }
}
```

再來我們發現這個套件做出來的 zoom 區塊會被 VitePress 高層級的元件擋住，我們設定一下他的 `z-index`。
```scss
.medium-zoom-overlay {
    background-color: var(--vp-c-bg) !important;
    z-index: 100;
    ~ img { z-index: 101; }
}
.medium-zoom--opened { // class 加在 body 上
    .medium-zoom-image { border-width: 0; }
    .medium-zoom-overlay { opacity: 0.85 !important; }
}
```

恩 這樣看起來就沒有什麼問題了。

[圖片縮放功能](http://www.freeendless.com/misc/vitepress/image-zoom.html)

[Day22] - View Transition API
