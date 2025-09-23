---
title: 字串取代的幾種方式
author: Opshell
createdAt: '2024-08-20'
categories:
  - 使用實例
tags:
  - javascript
editLink: true
isPublished: true
image: ''
description: ''
keywords: ''
---
# 字串取代
字串取代是實例上常常遇見的需求，<br />
很多情境都可以使用，<br />
在這邊的話，拿去除副檔名當例子，<br />
紀錄且比較幾種常見的用法。

## 常用的方式

#### 1. split 方法：
```javascript
const path = `${startPathName}/${fileName.split('.md')[0]}`;
```

#### 2. replace 方法：
```javascript
const path = `${startPathName}/${fileName.replace('.md', '')}`;
```

#### 3. substring 方法：
```javascript
const path = `${startPathName}/${fileName.substring(0, fileName.length - 3)}`;
```

#### 4. slice 方法：
```javascript
const path = `${startPathName}/${fileName.slice(0, -3)}`;
```

#### 5. path 模組（Node.js 環境下）：
```javascript
const path = `${startPathName}/${path.basename(fileName, '.md')}`;
```

## 效能比較
在效能方面，這些方法的差異通常是微不足道的，除非在非常高的執行頻率下才會顯現出來。一般來說，replace 方法和 slice 方法會稍微快一些，因為它們不需要額外的字串操作。

## 綜合考量
考慮到可讀性和效能，推薦使用 `replace` 方法，因為它簡潔且易於理解：
```javascript
const path = `${startPathName}/${fileName.replace('.md', '')}`;
```
這樣的寫法既直觀又高效，適合大多數情況下使用。
