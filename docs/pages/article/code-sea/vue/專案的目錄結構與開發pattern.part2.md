---
title: 專案的目錄結構與開發pattern.part2
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2024-11-06'
categories: 
tags: 
editLink: true
isPublished: false
---
[有意义的前端应用程序文件夹结构](https://www.51cto.com/article/764883.html)

https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md

特別注意：
feature 和 feature 之間避免溝通，最好是在 application 層級溝通

但你一定會說，就是有要溝通的怎麼辦？

那就只有幾個方案：
  event bus
  services registry
  components registry
基本上採用這三種方式進行 context 解耦

services registry 是什麼？
就是透過類似 vuex 的 dispatch 這樣的方法溝通
用 global pinia 作抽象註冊也行

components registry
vue 自帶有，就是 app.component() 方法

不過以 features 來做切分開發
跨 feature 的溝通 應該盡可能的避免
理想情況應該是不太會把pinia搞得很亂

feature 和 feature 互相不能溝通真正目的不是不能耦合
是一但你想依賴，可以迴避依賴循環和減少耦合點

耦合點通常就是一個字串

feature 和 feature 的耦合關係要像是 前端和後端之間的耦合

前端和後端之間的耦合靠一組 URL
那 feature 和 feature 之間很類似

event bus：
emit('EVENT_TYPE')

services registry：
dispatch('METHOD_TYPE')

components registry：
resoveCompoennt('COMPONENT_TYPE')

差不多就是這回事
然後一但外部耦合就要做防錯處理
就像我們不信任後端資料來源
有可能會失敗，有可能 404
一樣意思

很麻煩，但大型架構是不嫌麻煩的
只嫌宣告不清楚導致難以維護

未來每個 feature 完全是可以拆出來變成 npm package or micro frontend
把每個功能都當作一個小型專案
用這種心態在開發大概就不會錯
功能之間不互相連結

但你的 fetcher 實體可能會有 interceptor
可以在 application layer 去注入
對，我就是在講該死的 refresh token

這樣做其實新人也比較好找東西，可以讓新人專注在他的職責區塊
最近開發api 也是用這種方式開發，我們叫垂直切割
