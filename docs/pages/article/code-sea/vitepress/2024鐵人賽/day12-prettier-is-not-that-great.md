---
title: Day12 - 我和 Prettier 分手了
author: Opshell
createdAt: '2024-09-13'
categories:
  - vitepress-thirty-days
tags:
  - 鐵人賽
  - VitePress
  - murmur
  - env
  - Prettier
editLink: true
isPublished: true
image: ''
description: ''
keywords: ''
---
![banner12](https://ithelp.ithome.com.tw/upload/images/20240913/20109918O0AgoxestX.png)

## 緣起
第一次見到 `Prettier` 是在兩年前，那時候我在準備推廣統一的團隊程式碼風格，為了更好的維護，大家都懂。

最後採用了 `ESLint` + `Prettier` 的方案，這個配置的做法在前年的鐵人賽還寫成了[文章](https://ithelp.ithome.com.tw/articles/10302190)。

剛開始會自動幫我程式碼整理好的確是覺得很棒，直到不知道第幾個專案開始時，我發現原來我的配置已經壞掉了好一陣子，於是我把他修好又用了一陣子。

回過頭想想這將近兩年的 coding 體驗，開始時的新鮮，相處時的不斷磨合，短暫分開的自由自在，復合時痛苦與煎熬。我發現，其實 `Prettier` 可能不是我想走一輩子的那個人。

他有一些令人在意的點，對於崇尚自由射手座的我，是不可接受的。

## Opinionated (固執己見)
認識他一陣子的朋友基本上都會用這個形容詞來形容他，由於 `Prettier` 要做到最少的設定來達成最大化的風格整合，對於他的初衷，這的確是很棒的做法，讓人快速、容易的了解他，但是對於我們華人來說就會有些形容詞，"不近人情的"、"不懂變通"和"固執己見"等等。沒錯!!從長遠的角度來看 `Prettier` 很多設定是非常僵硬的，所有的感受都是相對的，讓我們來比較一下：

在 Vue 元件中，可能會有下列兩種情況出現，`ElSkill` 的情況是，有時候我們會回來看看、調整 `:style` 的東西，所以我希望他可以斷行下來，讓我可以快一秒看見他，而 `li` 的情況中，就是基本的 `v-for` 再次找他的可能性微乎其微，我們會希望他不要那麼顯眼，所以縮成一行就好。
```html
<ElSkill
  v-for="skill in skills.items"
  :key="skill.name"
  :style="{ '--color-skill': skill.color }"
>

<li v-for="item in currentPageData" :key="`list-${currentTag}-${currentPage}-${item.title}`">
```

在這樣的需求中，`Prettier` 提供了怎麼樣的解決方案呢?
```json
{
  "printWidth": 80,
}
```
是的只有這樣，但是解決了需求嗎? 其實沒有，他給你二選一，容許你很長而不自動幫你斷行下來，或者很短只要稍微長就都幫你斷行。
我們來看看其他人`ESLint-vue`是怎麼做的
```js
{
  'vue/html-closing-bracket-newline': ['error', {
      singleline: 'never',
      multiline: 'always',
      selfClosingTag: {
          singleline: 'never',
          multiline: 'always'
      }
  }],
}
```
`ESLint-vue` 的做法是 每個可能的情況都詢問你要怎麼做，好處是你可以很彈性，想斷就斷，壞處是在設定的時候，要多花點心思。

## printWidth 的問題
而 `printWidth` 又引申了另一個問題，人類的閱讀體驗其實是個很複雜的機制，甚至可以成為很多專門的職業，而 `Prettier` 只用了一個參數來規範他，會造成許多的問題。
`Anthony Fu` 大大舉了一個我覺得很形象的例子(點圖片開啟程式範例)：
[![Anthony-exmple](https://ithelp.ithome.com.tw/upload/images/20240913/20109918Xcjw7Lkt7M.png)](https://prettier.io/playground/#N4Igxg9gdgLgprEAuc0DOMAEBXNcBOamAvJgNoA6UmmwOe+AkgCZKYCMANPQVAIYBbOGwogAggBsAZgEs4mAMJ98QiTJh9RmAL6cqNOrgIs2AJm5H8-ISJABxGf0wAlCGgAWfKFt37aPJlZMAGYLBmthTFEAZXdsAHNMADk+ACNsHz1qf0sTTAAWMN5BSNFnPncBL0wAMXw+Bky-QwY8gFYiqxLbABU3d3kAGQBPbFSEJuyW4yCANk6I22iCeJkIZJkJCCllSYBdAG4qEE4QCAAHGDWoNGRQZXwIAHcABWUEW5Q+CSe+YdvTql6mAANZwGDREqDRxwZA7CR4QHAsEQ858MCOeLIGD4bBwU5wATjZjMODMQZeeLYPjxOA1CAqPgwK5QLFfbAwCAnEDuGACCQAdXc6jgaDRYDgyxu6hkADd1MNkOA0ACQI4GDAXvV4lU4d9ESAAFZoAAe0UxEjgAEVsBB4HqEfiQGjCAQlak0nAJNzzvhHDABTJmDB3Mh8uZnY88AL6uclb7RQRZbDTgBHW3wLUXT4gBoAWigcDJZO5+Dg6ZkZa1NN1SHhBrwAhk2NxTrQFutGdhdf1To0qUDwdDSAjOL4m0xCggAlrIFFbW5Rh6aU+9adsrxjCgpNg0TAfsuYm30Rgw0tDrw2m0QA)

是的，這種嚴重破壞體驗的事情，幾乎每天都在發生，更慘的是，你沒辦法阻止他，沒錯這個選項關不掉。所以在中後期，這個選項我給他 `10000` 直接放推。
但是，這樣子的做法，和什麼都沒做沒有區別，那我還需要 `Prettier` 嗎? 是的狀況遭到一個缺點打翻了 `Prettier` 全部的優點。

所以上面提到了，有段時間 `Prettier` 和我分開了一段時間，單身的美好自由，讓我的 coding 體驗飆升，再也不會有斷行後又強制塞成一行，不想斷行卻強迫被分成8行的痛苦。<br />

沒有體驗過得大大推薦體驗 ~~(這種痛苦不能只有我知道)~~。

## 常和 ESLint 吵架
上面舉出了 `ESLint` 的斷行設定方式，沒錯 `ESLint` 也可以設定程式碼風格，也會自動格式化，那要 `Prettier` 做什麼呢? 因為 `ESLint` 不管 style 的，但是由於他們有重疊的負責區域，為了不讓他們打架，我們需要約法好幾章，做一大堆設定，有多少可以參考我之前的[文章](https://ithelp.ithome.com.tw/articles/10302407)，相信我，看起來沒多少，研究得過程絕對是痛苦的，更何況他前陣子壞了一次，我又重新研究了一遍 ~~(加深了不想走一輩子的決心)~~。

## 結語
分手的理由總是特別的薄弱，薄弱到[漢堡不加美乃滋](https://www.youtube.com/shorts/n_rwXr6PNWA)這種都可以，但其實生活中的柴、米、油、鹽、醬、醋、茶才是對心靈真正的折磨，一刀斬首和千刀凌遲造成的痛苦感相信各位可以有個想像。

套一句渣男的語錄：不是 `Prettier` 不夠好，是我們不適合。<br />
祝天下有情人終成眷屬。
