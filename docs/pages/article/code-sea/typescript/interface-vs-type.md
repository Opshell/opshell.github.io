---
title: interface vs type
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2025-06-25'
categories:
  - 未分類
tags:
  - TypeScript
  - 面試題
editLink: true
isPublished: false
---
#
interface可以同名合併、type不行，他們兩個不能劃上等號
定義一個interface對外部溝通使用，但這個interface裡面是type alias組成的
TS語言設計上有個特徵就是，interface如果對外還需要另外再寫一次declare的話他就會自動採取合併

這個是Vue的某個你設計的很潮的Button
你為了擴充想要多加個icon欄位上去
``` ts
export interface FancyButtonProps {
  label: string;
}

const props = defineProps<FancyButtonProps>();
```

如果在外層組件或者模組之間，你還有定義這個
``` ts
declare module './FancyButton.vue' {
  interface FancyButtonProps {
    icon?: () => VNode;
  }
}
```
編譯器可以幫你合併

但如果你直接加type:
``` ts
export type FancyButtonProps = {
  label: string;
};
```

這樣會出現
Cannot augment module './FancyButton.vue' with a non-interface type 'FancyButtonProps'
type從底層設計開始就是 alias 別名，編譯器不允許對同名的 alias 去處理合併

介面裡面可以由好幾個型別組成，但能被編譯器merge的只有interface
