---
title: 'mouseenter 跟 mouseover 的 $event.target 為什麼不一樣'
image: ''
description: '同樣綁在外層 div，mouseenter 拿到的是 div 本身，mouseover 可能拿到裡面的子元素：差在會不會冒泡。一定要用 mouseover 的話，改讀 currentTarget。'
keywords: ''
author: Opshell
createdAt: '2025-05-14'
categories:
  - JavaScript
tags:
  - JavaScript
  - DOM
  - Vue
editLink: true
isPublished: false
---
## 前言
在串接 Google Map 時要動態渲染標記，標記一多，想做「hover 的那個浮到最上層」，但怎麼樣都抓不到正確的元素。

後來發現是事件用錯了。AI 會推薦你用 `mouseover` 和 `mouseout`，但這裡要用的其實是 `mouseenter` 和 `mouseleave`，差異如下。

::: tip 同樣的寫法，拿到的 DOM 不一樣
```vue
@mouseenter="mouseEnterHandler($event.target)"
@mouseover="mouseEnterHandler($event.target)"
```
這兩行的 `$event.target` 居然不是同一個元素，為什麼？
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
