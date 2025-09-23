---
title: Day28 - Quick keys
author: Opshell
createdAt: '2024-09-29'
categories:
  - vitepress-thirty-days
tags:
  - 鐵人賽
  - VitePress
  - composable
  - vue
editLink: true
isPublished: true
image: ''
description: ''
keywords: ''
---
![banner28](https://ithelp.ithome.com.tw/upload/images/20240929/2010991813w5fDMu63.png)

想的到會用到的套件都差不多裝完了，最後來提升一點閱讀體驗，自從某次加班一段時間過勞產生了肘隧道症候群後，除了換直立滑鼠，調整坐姿，買夠高的椅子以外，也讓自己習慣75%的鍵盤(100%的鍵盤太大，會卡住滑鼠移動，造成正常坐姿下左右不平衡)，也開始越來越習慣盡量用純鍵盤的方式寫程式和爬文，所以今天來添加一點鍵盤操作吧。

## 鍵盤控制 Composable
把鍵盤事件註冊的核心邏輯抽出來做成 `Composable` ，然後根據頁面或元件的需要，獨立為每個頁面或元件做按鍵事件宣告。
```ts
type Key = string;
type KeyCombination = string;

interface KeyBoardControlConfig {
    [key: string]: () => void
}

const keyStrategies: { [key in Key]: () => void } = {};
const combinationStrategies: { [key in KeyCombination]: () => void } = {};

function keyDownHandler(event: KeyboardEvent, showKey: boolean) {
    const key = event.key;
    if (key in keyStrategies) {
        keyStrategies[key]();
    }

    const combination = `${event.ctrlKey ? 'Ctrl+' : ''}${event.shiftKey ? 'Shift+' : ''}${event.altKey ? 'Alt+' : ''}${key}`;
    if (combination in combinationStrategies) {
        combinationStrategies[combination]();
    }

    if (showKey) {
        console.log('key：', key);
        console.log('combination：', combination);
    }
}

export default (config: KeyBoardControlConfig, showKey: boolean) => {
    for (const key in config) {
        if (key.includes('+')) {
            combinationStrategies[key] = config[key];
        } else if (key.length === 1) {
            keyStrategies[key] = config[key];
        }
        // } else {
        //     codeStrategies[key] = config[key];
        // }
    }

    onMounted(() => {
        window.addEventListener('keydown', event => keyDownHandler(event, showKey));
    });

    onBeforeUnmount(() => {
        window.removeEventListener('keydown', event => keyDownHandler(event, showKey));
    });
};

```
`showKey` 這個參數是拿來決定是否在按鍵時 console key name 的，只是為了 Debug 方便，完全是可以不用加沒關係。

## 在擴展 Layout 宣告事件
在 `docs/.vitepress/theme/layout/expandLayout.vue` 中註冊事件。

```vue
<script setup lang="ts">
    import DefaultTheme from 'vitepress/theme';
    import { useData, useRouter } from 'vitepress';

    import useKeyBoardControl from '@hooks/useKeyBoardControl'; // [!code ++]

    function selectorClickHandler(selector: string) { // [!code ++]
        const element = document.querySelector(selector) as HTMLElement; // [!code ++]
        if (element) { // [!code ++]
            element.click(); // [!code ++]
        } // [!code ++]
    } // [!code ++]

    function getOutlines() { // [!code ++]
        const outlines = document.querySelectorAll('.VPDocOutlineItem.root .outline-link'); // [!code ++]
        const activeIndex = Array.from(outlines).findIndex(outline => outline.classList.contains('active')); // [!code ++]

        return { // [!code ++]
            outlines, // [!code ++]
            activeIndex // [!code ++]
        }; // [!code ++]
    } // [!code ++]

    useKeyBoardControl({ // [!code ++]
        'ArrowLeft': () => { // [!code ++]
            selectorClickHandler('.pager-link.prev'); // [!code ++]
        }, // [!code ++]
        'ArrowRight': () => { // [!code ++]
            selectorClickHandler('.pager-link.next'); // [!code ++]
        }, // [!code ++]
        'Ctrl+ArrowUp': () => { // [!code ++]
            const { outlines, activeIndex } = getOutlines(); // [!code ++]

            if (outlines.length <= 0) // [!code ++]
                return; // [!code ++]

            if (activeIndex > 0) { // [!code ++]
                const prevIndex = activeIndex - 1; // [!code ++]
                if (prevIndex >= 0) { // [!code ++]
                    (outlines[prevIndex] as HTMLElement).click(); // [!code ++]
                } // [!code ++]
            } else { // [!code ++]
                window.scrollTo(0, 0); // 頁面卷軸到最上面 // [!code ++]
            } // [!code ++]
        }, // [!code ++]
        'Ctrl+ArrowDown': () => { // [!code ++]
            const { outlines, activeIndex } = getOutlines(); // [!code ++]
            if (outlines.length > 0) { // [!code ++]
                const nextIndex = activeIndex + 1; // [!code ++]
                if (nextIndex < outlines.length) { // [!code ++]
                    (outlines[nextIndex] as HTMLElement).click(); // [!code ++]
                } // [!code ++]
            } // [!code ++]
        } // [!code ++]
    }, true); // [!code ++]
</script>
```
看程式碼可以發現，我們註冊了四個事件
1. 按下方向鍵 → 的時候，會按下一篇文章的按鈕一下
2. 按下方向鍵 ← 的時候，會按上一篇文章的按鈕一下
3. 按下 Ctrl + ↑ 的時候，會往上一個目錄條目移動，如果已在第一個則移到最上面。
4. 按下 Ctrl + ↓ 的時候，會往下一個目錄條目移動

短時間內也想不到還有什麼事件需要增加的了。

## 卷軸體驗優化
不過在移動目錄的時候，會發現他是直接跳過去的，使用體驗有點差，我們在 `docs/.vitepress/theme/scss/basic.scss` 裡面添加：
```scss
html {
    scroll-behavior: smooth;
}
```

這樣他就會滑順的移動過去囉~
