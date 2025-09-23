---
title: vue query
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2024-11-01'
categories: 
tags: 
editLink: true
isPublished: false
---
vue-query的用途是這樣：

```ts
import { useQuery } from '@tanstack/vue-query';

export function useUserProfile() {
    return useQuery({
        queryKey: ['userProfile'],
        queryFn: () => request({
            url: '/user/profile',
            method: 'GET'
        }),
        // 快取配置
        staleTime: 5 * 60 * 1000, // 5分鐘keep
        cacheTime: 30 * 60 * 1000 // 30分鐘後清除快取
    });
}

// 在組件中使用
const {
    data, // 數據
    isLoading, // 是否載入中
    isError, // 是否出錯
    error, // 錯誤訊息
    isFetching, // 是否正在背景刷新
    refetch // 手動重新撈API
} = useUserProfile();
```
