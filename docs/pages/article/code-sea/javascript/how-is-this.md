---
title: This 到底是誰?
author: Opshell
createdAt: '2024-08-23'
categories:
  - 使用實例
tags:
  - javascript
  - vue
editLink: true
isPublished: true
image: ''
description: ''
keywords: ''
---
# this

## 這是一個 QR CODE 讀取的例子

```javascript
const res = await userApi(form);
const reader = new FileReader();

reader.readAsDataURL(res.data);
reader.onload = function () {
  qrCodeSrc.value = this.result;
}
```

`reader` 是一個被 `FileReader` 工廠`new(做)`出來的工具，<br />
`reader.` 後面的其實都使在使用工具本身的功能，<br />
所以存取它內部`api functions` 的 `this` 就是存取工具本身。<br />

用程式化的說法就是：<br />
你在它的`hook`內調用`this`就會指向它的`instance(實體)`。<br />


## 另一個例子是 `computed` 的 `setter`

```javascript
// tab切換後VALUE的改變
const tab = computed({
  get: function () {
    return currentTab.value
  },
  set: function (val) {
    tabOnChange.to = val
    tabOnChange.from = this.value
    const tab = onBeforeSwitchTab(val, this.value)
    currentTab.value = tab
    return tab
  },
});
```

`computed`中，`getter`是不會用到`this`的<br />
`setter`的話則是`this`會指向當前這個`tab`的實體<br />
所以vue裡面本身也就有`this`的概念存在。
