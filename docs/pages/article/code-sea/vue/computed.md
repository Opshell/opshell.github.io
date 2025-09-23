---
title: computed
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2025-05-15'
categories:
  - 未分類
tags:
  - null
editLink: true
isPublished: false
---
#


## computed 的 插隊能力
```ts
    const departmentDatas = computed(() => {
        return data.value.map((item) => {
            if (!item.child) {
                item.child = [];
            } else {
                item.child = item.child.filter((pos) => {
                    return pos.lat && pos.lng;
                });
            }

            ....
        });
    });


```
