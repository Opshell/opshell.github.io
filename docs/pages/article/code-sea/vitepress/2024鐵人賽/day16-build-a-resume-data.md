---
title:  "Day14 - Build-Time Data Loading"
author: 'Opshell'
createdAt: '2024/09/14'
categories: 'vitepress-thirty-days'
tags:
  - 鐵人賽
  - vitepress
editLink: true
isPublished: false
---

履歷表最重要的還是工作經歷吧，普遍的操作都是後端 API 拉資料，前端迴圈渲染出來，但是我們 `vitepress` 專案沒有後端阿~ 總不可能寫死一大片資料在 vue 裡面吧? 也太醜了。
這個部分， `vitepress` 提供的 `Build-Time Data Loading` 功能剛好可以解決這個問題：

## Build-Time Data Loading
`Build-Time Data Loading` 是 `vitepress` 提供的`資料載入`功能，他允許載入任意資料，並在 `.md` 或 `Vue Component` 引用他，資料的載入只在 `build` 的時候執行，資料將被序列化成 `JSON` 放在 Javascript 包中。

`資料載入`可以被用來接 API 回傳的資料，也可以基於本地文件中生成。

## 基本用法
一個用於`資料載入`的文件必須以 `.data.js` 或 `.data.ts` 結尾。且必須包含一個 `export default 物件`，該物件具有 `load()` 方法：
::: code-group
```ts [example.data.ts]
export default {
    load() {
        return {
            hello: 'world'
        };
    }
};
```
`資料載入`功能只在 `Node.js` 中執行，因此可以按需導入 `Node API` 和 `npm` 依賴。

然後，可以在 `.md` 和 `Vue Component` 中使用 `data` 具名導出從該文件中導入數據：
```vue
<script setup>
    import { data } from './example.data.js';
</script>

<pre>
{{ data }}
</pre>
```
輸出：
```json
{
  "hello": "world"
}
```
不是 `export default` 了嗎? 那這個 `data` 是哪來的?
是 `VitePress` 背後呼叫了 `load()` 並用名為 `data` 的具名`export` 隱式地暴露了結果。

就算是異步進行，也是可以的：
```ts
export default {
    async load() {
        // 透過 API 取的數據
        return (await fetch('...')).json();
    }
};
```

## 實際使用
是的各位，基本用法已經滿足了我們的使用需求，首先我們在 `docs/data/` 中建立檔案 `works.data.ts`，然後輸入內容：
```ts
export default {
    load() {
        return [
            {
                compImg: 'images/resume/ai4dt.png',
                company: '不正常人類研究中心',
                location: 'Tainan, Taiwan',
                jobTitle: 'Front-End Developer',
                period: '2023.09 - Now',
                description: `一、工作內容概述：<br />......`
            }
        ];
    }
};
```

然後在 `resume.vue` 中使用他：
```vue
<script setup lang="ts">
    import { data as workExperienceData } from '@/data/works.data';
</script>
```

 import { data } from '@/data/skills.data';
