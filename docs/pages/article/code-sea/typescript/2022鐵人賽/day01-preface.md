---
title:  'Day01 - 前言'
author: 'Opshell'
createdAt: '2022/09/01'
categories: 'typescript-thirty-days'
tags:
  - 鐵人賽
  - typescript
editLink: true
isPublished: true
---

# [Day01] - Opshell的碎念 - 前言
![banner-v4](https://ithelp.ithome.com.tw/upload/images/20220901/20109918jm8R7REYAN.jpg)

## 一、碎念
身為一個在網頁世界打滾多年的全端碼農，~~(6~7年算久嗎?~~<br />
輾轉於花園與動物園，外星與冥界的世界中，<br />
渾渾噩噩~~也是合理~~，年過30，一回首...連燈火闌珊處也不存在...<br />
所有語言都會一點，能解決外星人或冥界客戶的需求，<br />
最常用的技術是外星黑科技，功能可以做出來，但是怎麼成功的一知半解；<br />
技能樹中點最高的是通靈術，需求可以了解，但是要靠迷幻囈語和想像力。

於是開始準備做點東西，整理這幾年用到的東西，<br />
加上一些新的技術，自己做個部落格，<br />
讓多年後的自己，回首起碼能看見一些難看的草XD。<br />
然後一踏進Vite，直接踢到TypeScript跌死，<br />
打算努力的爬出來!!

剛好要鐵人賽了，觀望了好多年，<br />
終於在這時候有了一點勇氣可以跨出一步，<br />
不期待自己有能力寫出達標好文，~~連標題都是 如何用TypeScript水30天鐵人賽~~<br />
能成功完賽就好。

## 二、預計30天想做到的部分

30天分成六個部分，<br />
以一個完全沒學過，渾渾噩噩菜鳥的學習角度來撰寫，<br />
會記錄目標、流程、想法及過程中踩到的各種坑，<br />
自己作筆記的同時，也許能讓其他人少走點彎路，<br />
期望就算跌跌撞撞也能達陣。

1. 事前準備：前言、歷史及環境架設等水文章的內容
2. TS-初探：了解TS的基礎語法、啥時候用，寫一些Hello World！
3. TS-深入：開始學習TS的基本使用，能做出一些簡單的功能。
4. TS-巧計：深入了解TS的功能，做一些比較不無聊的東西。
5. TS-淺出：能夠把TS結合其他框架一起使用。
6. TS- 禪：實現一些我覺得複雜麻煩的功能&後記。

## 三、看Opshell筆記的小訣竅
1. 需要有一定的JavaScript 基礎：<br />
筆記中默認各位讀者都有一定的JavaScript基礎，<br />
畢竟Opshell菜菜的，不會用啥高深的技巧 ~~(所以各位大大都可以看懂)~~

2. 預期讀者有一部份的Vue3 基礎：<br />
後面章節會開始是把Vue專案轉成TypeScript<br />
畢竟就是在Vite + TypeScript跌倒的

3. 文中的縮寫或符號意義：<br />
文中專有名詞都以`英文為主(中文為輔)`喔。<br />
範例中如果後面有 console.log。<br />
可以 tsc 編譯後直接貼到網頁的F12控制台做驗證喔。

```JavaScript
const JS = 'JavaScript';
const TS = 'TypeScript';
const ▲ = '踩到坑!';
const ※ = '注意小細節!';
```

## 四、為什麼是TypeScript?

### 1. TypeScript 是什麼?
以我對他的了解，<br />
他是 JavaScript 嘮叨的老媽子，<br />
會不斷提醒 JavaScript 原先一點都不在意的地方`type(型別)`，<br />
幫助他少犯點錯，更容易安排自己的人生。<br />
~~微軟牌開源老媽子上線了~~<br />
是JavaScript的超集：JS有的他都有，但還多了點東西。<br />
![是JavaScript的超集。](https://ithelp.ithome.com.tw/upload/images/20220901/20109918DYspg6k4NO.png)

---

### 2. TypeScript 的優缺點：
#### 優點：
1. 強型別系統搭配良好的變數命名，就能知道函式大概在做甚麼了，<br />
   可以減少很多維護、溝通成本，還有過一個禮拜忘記自己在做甚麼的情況。
2. 在撰寫、編譯階段就能發現大部分錯誤，省去DeBug反覆查找的時間(很多)。
3. 增強了IDE的功能，程式碼自動完成、介面提示、跳轉到定義、重構等。

#### 缺點：
1. 有一定的學習成本，需要了解很多本來不用顧慮的，或是本來不使用的概念。
2. 短期會增加開發成本，畢竟邊寫程式邊寫文件，而且比較不通人情，<br />
   不過對於一個需要長期維護的專案，TypeScript 能減少很多維護成本。
3. 可能和一些函式庫的相性不是很好。

---

### 3. TypeScript 很潮：
- 2016 年來到現在熱度竄升速度最快、最熱門的語言。
- 2021 年最多工程師想學的語言第二名。
- 2021 年最喜歡的語言第三名。
- 2021 年工程師使用最多的語言第五名。
這麼多大佬前仆後繼的上了，還在等什麼?

---

### 4. 例子：
講了這些，來個例子更清楚：<br />
做一個簡單的函式 希望他幫我把丟進來的東西都+30，<br />

```javascript
const plusThirty = (num) => num + 30;

console.log(plusThirty(123));   // 153
console.log(plusThirty('123')); // 12330
console.log(plusThirty(Number('123'))); // 153
```

但在一些奇怪的情況下會出現都進來的參數不是數字的情況，<br />
這時我們就會需要使用方法三，幫她做型別的轉換，<br />
在邏輯複雜起來的情況，找了一堆錯誤後，<br />
使用Number(a) + Number(b)來修正，<br />
程式碼變得又臭又長的情況，很不優雅，<br />
更何況遇到了parseInt('2srth')這種情況...?<br />
簡直一言難盡...。

到了TypeScript，世界都不一樣了!↓↓↓

```typescript
const plusThirty = (num: number): number => num + 30;

console.log(plusThirty(123));   // 153
console.log(plusThirty('123')); // [!code error]
console.log(plusThirty(Number('123'))); // 153
```
TS老媽子開始提醒你不要瞎搞，<br />
再也不需要，兜兜轉轉好幾圈後做型別轉換來修Bug了

![型別提醒](https://ithelp.ithome.com.tw/upload/images/20220901/201099182H6aHEFC9S.png)

## 五、 他到底有多好用的參考資料：
不管是使用者成長速度、討論度都持續創高 ~~(要是我買的股票也這樣就好了)~~
1. [Why TypeScript is the best way to write Front-end in 2019–2020+](https://jackthenomad.com/why-typescript-is-the-best-way-to-write-front-end-in-2019-feb855f9b164)
2. [2021 元宇宙狀態 - From GitHub](https://octoverse.github.com/#top-languages-over-the-years)
3. [2021 Developer Survey - From StackOverFlow](https://insights.stackoverflow.com/survey/2021#key-territories-country)

## 小結：
懷著既期待又怕受傷害的心情，
鐵人賽開賽了
除了開賽的前言、結賽的後記，
大概還有28篇，嚇壞了...
多麼遙遠的距離阿!!
開局暖身也差不多結束了，
~~明天準備卯起來水~~
各位大大加油!
