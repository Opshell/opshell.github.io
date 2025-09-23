---
title: mouse事件的目標
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2025-05-14'
categories:
  - 未分類
tags:
  - null
editLink: true
isPublished: false
---
## 前言
在串接 Google Map 時  要動態渲染標記，多標記時 想實現hover 浮到最上層的功能，但是怎麼樣都抓不到正確的 el

後來發現是因為事件用錯了，Ai 會推薦你用 mouseover 和 mouseout 但是其實要用的是 mouseenter 和 mouseleave 事件，差異如下

::: tip
  @mouseenter="mouseEnterHandler($event.target)"
  和
  @mouseover="mouseEnterHandler($event.target)"
  的$event.target的Dom 居然不一樣為什麼呢?
:::

## 兩個進入事件比較

mouseenter 和 mouseover 的事件特性
### mouseenter:
當滑鼠指標從元素外部進入該元素時觸發。
不冒泡（non-bubbling）：僅在綁定事件的元素上觸發，不會在子元素上觸發。
不會因為滑鼠在子元素間移動而重複觸發。
簡單來說，mouseenter 只關心滑鼠進入「綁定事件的元素」的邊界。
### mouseover:
當滑鼠指標進入元素或其子元素時觸發。
冒泡（bubbling）：當滑鼠進入子元素時，事件會先在子元素觸發，然後冒泡到父元素。
如果滑鼠在子元素之間移動（例如從一個子元素移到另一個子元素），會重複觸發 mouseover。
這意味著 mouseover 會對子元素的進入行為更敏感。

## 使用情境差異
### mouseenter：
$event.target 通常是綁定事件的元素本身（例如上面的 div），因為它不關心子元素的進入。
適合用於只需要檢測滑鼠進入父元素邊界的情況。
例如：實現 hover 效果，僅在進入父元素時改變樣式。

### mouseover：
$event.target 可能是綁定事件的元素（div）或其子元素（span），具體取決於滑鼠實際進入的元素。
因為冒泡和對子元素的敏感性，$event.target 更容易指向子元素。
適合需要精確追蹤滑鼠進入每個子元素的情況。

## 如果一定要使用某個event的解決方式
如果你希望 $event.target 始終指向綁定事件的元素，例如 （div），可以改用 $event.currentTarget，因為它永遠指向綁定事件的元素，可以避免因事件冒泡或子元素觸發導致的差異。
