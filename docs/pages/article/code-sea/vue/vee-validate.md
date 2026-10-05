---
title: VeeValidate 還是 Vuelidate：表單驗證怎麼選
image: ''
description: '做驗證永遠是件麻煩事。VeeValidate 能跟各家 UI 框架並存，但要接 API 回來的初始值需要一點手段；Vuelidate 直接對資料下規則，比較好控制。整理群組討論的兩派意見與初始值的正確接法。'
keywords: ''
author: Opshell
createdAt: '2025-07-25'
categories:
  - vue
tags:
  - vue
  - vee-validate
  - vuelidate
  - 表單驗證
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：把群組對話整理成觀點文，補上脈絡、懶人包、兩套寫法對照、初始值的接法與結論。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
感覺只要做驗證，都是一件很麻煩的事。常見的情況是：編輯頁要先打 API 拿到資料，填進表單當初始值，使用者改完再驗證送出。用 `VeeValidate` 做這件事，卡最久的往往不是驗證規則，而是「初始值怎麼塞進去」。

這篇整理群組裡關於 `VeeValidate` 和 `Vuelidate` 的討論，寫給正在選表單驗證套件，或已經被 `VeeValidate` 的初始值搞得很煩的人。
:::

## 懶人包
- `VeeValidate` 的好處是可以跟不同的 UI 框架並存，但它把表單狀態收在自己手上，要接 API 資料需要一些手段。
- `Vuelidate` 直接對你自己的資料下驗證規則，資料怎麼來它不管，所以比較好控制。
- 在 `VeeValidate` 裡，API 回來的資料要當初始值，用 `resetForm({ values })`；要改目前的值，用 `setValues`／`setFieldValue`。
- 更好的做法是-|資料到了才渲染表單|-，初始值一出生就有，不用事後「更新」。
- 有沒有真正好用，很看人；UI 框架有內建驗證的話，也可以直接用內建的。

## 觀點拆解

### 兩套的出發點不一樣
- **`VeeValidate`**：表單的值、錯誤訊息、dirty／touched 狀態都由它的 `useForm`／`useField` 管理，你是「把欄位交給它」。好處是它不綁 UI，`Element Plus`、`Vuetify`、`Naive UI` 或自己刻的元件都能接，很多 UI 框架的範例也拿它來示範。
- **`Vuelidate`**：你自己用 `reactive` 管表單資料，`Vuelidate` 只負責「對這份資料套規則、告訴你哪裡錯」。原本的筆記寫它是「直接針對 DOM 處理驗證規則的東西」，更精確地說，它針對的是-|資料模型|-，不碰 DOM 也不管元件，所以才可以繞過 `VeeValidate` 那部分的麻煩。

### Vee 比較需要一些手段
最常卡的就是初始值。在沒有用 `TanStack Query` 的狀態下，要把 `VeeValidate` 的 `initialValues` 設成 API 回來的資料，之前試過很多方法，基本上只能用 `setValue` 硬塞。這樣感覺 `Vuelidate` 會比較好控制，因為資料本來就是你自己的 `reactive`，API 回來直接賦值就好。

::: tip 補充：VeeValidate 其實有 resetForm
`setValues` 改的是「目前的值」，表單會被標成 dirty，按「重設」也回不到 API 的資料。如果你要的是「把 API 資料當成新的初始值」，該用的是 `resetForm({ values: data })`，它會同時更新初始值和目前值，dirty 狀態也會歸零。
:::

### 有沒有好用，很看人
群組裡兩派都有：

- 「我比較愛好這套（`Vuelidate`），`Vee` 我真的不太會用。」
- 「`Vee` 我用不慣就是了，平常都是 `Quasar` + `Vuelidate`，或者 `Element Plus` 內建的那種。」

我的看法是：`VeeValidate` 有沒有到真正好用，很看人。它的心智模型是「表單是一個狀態機」，接受了就很順，沒接受就處處卡；`Vuelidate` 的心智模型是「資料加規則」，上手比較直覺。

::: warning 選之前看一下維護狀態
`Vuelidate` 這幾年更新頻率明顯放慢，選用前建議到它的 repo 看一下最近的 issue 與發版狀況；UI 框架內建的驗證（例如 `Element Plus` 的 `el-form` rules）則是跟著框架一起維護。
:::

## 例子與對比

### VeeValidate：資料到了才渲染表單
不管用不用 `TanStack Query`，最乾淨的做法都是-|拆成兩個元件|-：外層負責拿資料，資料到之前顯示骨架；內層表單一出生就拿到初始值。這個做法在 [TanStack Query 是非同步狀態管理](./tanstack-query) 有完整的討論。

```vue
<!-- UserForm.vue -->
<script setup lang="ts">
    import { useForm } from 'vee-validate';

    type User = { name: string; email: string };

    const props = defineProps<{ initData: User }>();
    const emit = defineEmits<{ submit: [values: User] }>();

    const { defineField, errors, handleSubmit } = useForm<User>({
        initialValues: props.initData,
        validationSchema: {
            name: (value: string) => !!value || '請輸入名稱',
            email: (value: string) => /.+@.+/.test(value) || 'Email 格式不正確'
        }
    });

    const [name, nameAttrs] = defineField('name');
    const [email, emailAttrs] = defineField('email');

    const onSubmit = handleSubmit(values => emit('submit', values));
</script>

<template>
    <form @submit="onSubmit">
        <input v-model="name" v-bind="nameAttrs">
        <span>{{ errors.name }}</span>
        <input v-model="email" v-bind="emailAttrs">
        <span>{{ errors.email }}</span>
        <button type="submit">送出</button>
    </form>
</template>
```

```vue
<!-- UserEdit.vue -->
<template>
    <UserFormSkeleton v-if="!user" />
    <UserForm v-else :key="user.id" :init-data="user" @submit="save" />
</template>
```

真的沒辦法拆的時候，再用 `resetForm`：

```ts
const { resetForm } = useForm<User>();

fetchUser().then((data) => {
    resetForm({ values: data });
});
```

### Vuelidate：資料是你的，規則掛上去

```vue
<script setup lang="ts">
    import { reactive } from 'vue';
    import { useVuelidate } from '@vuelidate/core';
    import { required, email } from '@vuelidate/validators';

    const form = reactive({ name: '', email: '' });
    const rules = {
        name: { required },
        email: { required, email }
    };
    const v$ = useVuelidate(rules, form);

    // API 回來直接賦值，沒有初始值的問題
    fetchUser().then((data) => {
        Object.assign(form, data);
        v$.value.$reset();
    });

    async function submit() {
        const isValid = await v$.value.$validate();
        if (!isValid) { return; }
        // 送出
    }
</script>
```

| | `VeeValidate` | `Vuelidate` | UI 框架內建 |
|---|---|---|---|
| 表單資料誰管 | `VeeValidate` | 你自己 | 你自己 |
| 接 API 初始值 | `resetForm({ values })`，或資料到了才渲染 | 直接賦值 | 直接賦值 |
| 跨 UI 框架 | 強 | 強（只看資料） | 綁定該框架 |
| 搭配 schema（`Zod` 等） | 官方支援 | 要自己轉 | 看框架 |
| 心智模型 | 表單是狀態機 | 資料 + 規則 | 元件 + 規則 |

## 結論
驗證本身不難，難的是「表單資料到底歸誰管」。歸 `VeeValidate` 管，就照它的規矩用 `resetForm` 或晚點渲染；歸你自己管，`Vuelidate` 或框架內建的會讓你比較自在。

選哪套都好，只要別一個專案裡三套並存。~~（那才是真正的驗證地獄。）~~
