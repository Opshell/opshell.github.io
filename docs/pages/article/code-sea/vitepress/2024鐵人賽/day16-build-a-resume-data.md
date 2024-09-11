---
title:  "Day14 - Build-Time Data Loading"
author: 'Opshell'
createdAt: '2024/09/14'
categories: 'vitepress-thirty-days'
tags:
  - 鐵人賽
  - VitePress
editLink: true
isPublished: false
---

履歷表最重要的還是工作經歷吧，普遍的操作都是後端 API 拉資料，前端迴圈渲染出來，但是我們 `VitePress` 專案沒有後端阿~ 總不可能寫死一大片資料在 vue 裡面吧? 也太醜了。
這個部分， `VitePress` 提供的 `Build-Time Data Loading` 功能剛好可以解決這個問題：

## Build-Time Data Loading
`Build-Time Data Loading` 是 `VitePress` 提供的`資料載入`功能，他允許載入任意資料，並在 `.md` 或 `Vue Component` 引用他，資料的載入只在 `build` 的時候執行，資料將被序列化成 `JSON` 放在 Javascript 包中。

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

然後，可以在 `.md` 和 `Vue Component` 中使用 `data` 具名導出從該文件中導入資料：
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
        // 透過 API 取的資料
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

<template>
    <div class="work-experience-block">
        <MoleWorkExperience
            v-for="work in workExperienceData"
            :key="work.company"
            :comp-img="withBase(work.compImg)"
            :company="work.company"
            :location="work.location"
            :job-title="work.jobTitle"
            :period="work.period"
            :description="work.description"
        />
    </div>
</template>
```

會發現 `import { data as workExperienceData } from '@/data/works.data';` 報錯了：

`模組 '"@/data/skills.data"' 沒有匯出的成員 'data'。您是要改用 'import data from "@/data/skills.data"' 嗎?ts-plugin(2614)`

這是因為我們沒有為 `works.data` 設定 `loader` 和 `data` 的 `export` 類型，依照官網範例我們改寫成這樣：
```ts
import { defineLoader } from 'vitepress'

export interface Data {
    compImg: string
    company: string
    location: string
    jobTitle: string
    period: string
    description: string
}

declare const data: Data[]
export { data }

export default defineLoader({
    load() {
        ...
    }
});
```
恩很棒，最基本的資料引用就完成囉~ 一個簡單的 resume 也完成了~

## Data from Local Files(本地文件資料生成)
前面提到的方式，基本上是靜態資料，只有在 `build` 的時候把資料灌進來，而且 `build` 完之後，是不會看到 `.data.ts` 的原始檔案的，這樣的話每次要改資料都要重新 `build` 一次，有沒有其他的方式可以隨著文件的修改來渲染新的資料呢?

有的 就是我們現在要用到 `Data from Local Files` ：

當需要基於本地文件生成資料時，需要在 `data loader` 中使用 `watch` 選項，以便這些文件修改時可以觸發熱更新。

`watch` 選項也很方便，因為可以使用 `glob` 模式 匹配多個文件。模式可以相對於資料加載文件本身，`load()` 函數將接收匹配文件的絕對路徑。

下面的例子展示瞭如何使用 `csv-parse` 加載 `CSV` 文件並將其轉換為 `JSON`。因為此文件僅在 `build` 時執行，因此不會將 `CSV` 解析器發送到客户端。
```js
import fs from 'node:fs'
import { parse } from 'csv-parse/sync'

export default {
  watch: ['./data/*.csv'],
  load(watchedFiles) {
    // watchFiles 是一个所匹配文件的绝对路径的数组。
    // 生成一个博客文章元数据数组
    // 可用于在主题布局中呈现列表。
    return watchedFiles.map((file) => {
      return parse(fs.readFileSync(file, 'utf-8'), {
        columns: true,
        skip_empty_lines: true
      })
    })
  }
}
```