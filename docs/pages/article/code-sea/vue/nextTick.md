---
title: nextTick
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2024-10-08'
categories: 
tags: 
editLink: true
isPublished: false
---
https://juejin.cn/post/7389044903941292073

```ts
nextTick(() => {
    setTimeout(() => {
        const shouldScrollToBottom = sendFlag.value || (tempListHeight.value === 0);
        if (shouldScrollToBottom) {
            conlogHeight('shouldScrollToBottom');
            msgWrap.value?.scrollTo(0, msgWrap.value?.scrollHeight); // 捲動到底部
            sendFlag.value = false;
        } else {
            msgWrap.value?.scrollTo(0, msgWrap.value?.scrollHeight - tempListHeight.value); // 捲動到之前位置
        }

        msgList.value.forEach((item) => {
            if (!item.show) {
                item.show = true;
            }
        });
    }, 1);
});
```
