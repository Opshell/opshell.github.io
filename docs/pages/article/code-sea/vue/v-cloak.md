---
title: v cloak
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2024-09-02'
categories:
tags:
editLink: true
isPublished: false
---
如果你用src載入vue，常常會看到{{}}

代表還沒載完，這時候你要考慮的是 v-cloak

<div v-cloak>
  {{ message }}
</div>

編譯完成以前，v-cloak是不會被看見的
