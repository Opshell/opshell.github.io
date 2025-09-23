---
title: vue 的套嵌藝術
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2025-06-27'
categories:
  - 未分類
tags:
  - null
editLink: true
isPublished: false
---
# 告別俄羅斯娃娃：用 `工廠模式` 與 `Slot` 打造優雅的 Vue 動態表單

身為一個天天跟表單打交道的 Vue 開發者，你一定遇過這種場景：一個表單，根據使用者的身份、權限、或是某個選項，需要動態顯示或隱藏某些欄位。最直覺的作法，可能就是在 `<template>` 裡塞滿 `v-if`。

```vue
<template>
    <el-form-item label="Name">
        <el-input v-model="postData.name" />
    </el-form-item>
    <el-form-item label="Email">
        <el-input v-model="postData.email" />
    </el-form-item>

    <el-form-item v-if="isVip" label="VIP Code">
        <el-input v-model="postData.vipCode" />
    </el-form-item>
    <el-form-item v-if="isVip" label="Priority">
        <el-select v-model="postData.priority" />
    </el-form-item>
</template>
```

如果只有一兩個欄位，這還算可以接受。但當邏輯變得複雜，`template` 會迅速膨脹成一頭難以維護的巨獸。程式碼的可讀性直線下降，而且當你需要將同樣的邏輯複用到另一個地方時，你只能複製貼上，埋下未來維護的惡夢。

今天，我們來聊聊如何用更優雅、更具擴展性的方式處理這個問題。

## 核心思路：將 UI 結構「配置化」

> 我們應該把決定「長相」的邏輯，從 `<template>` 抽離到 `<script setup>` 中。

`<template>` 的強項在於**宣告式地**描述 UI 結構，而不是處理複雜的**命令式**業務邏輯。當我們發現 `<template>` 裡充滿了 `v-if`, `v-else-if` 時，就是一個警訊。

### 步驟一：定義你的表單工廠

與其在模板中硬刻欄位，不如我們先定義好資料結構與欄位設定。

```ts
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMetaStore } from '@/stores/meta'; // 假設你的 options 放在 Pinia store

// 表單的響應式資料
const postData = ref({
    name: '',
    email: '',
    phone: '',
    // VIP 才會有的欄位
    vipCode: '',
    priority: ''
});

// 表單驗證規則 (假設你已經定義好)
const rules = {
    name: { required: true, message: 'Name is required' },
    email: { required: true, type: 'email', message: 'Invalid email format' },
    phone: { required: true, message: 'Phone is required' },
    vipCode: { required: true, message: 'VIP Code is required' },
    priority: { required: true, message: 'Priority is required' }
};

// 從 Pinia store 取得共用的下拉選單選項
const metaStore = useMetaStore();
const { t } = useI18n();

// 基本欄位設定
const baseFormColumns = [
    { prop: 'name', label: t('Name'), type: 'input', validator: rules.name },
    { prop: 'email', label: t('Email'), type: 'input', validator: rules.email },
    { prop: 'phone', label: t('Phone'), type: 'input', validator: rules.phone }
];

// VIP 專屬的額外欄位設定
const vipExtraColumns = [
    {
        prop: 'vipCode',
        label: t('VIPCode'),
        type: 'input',
        validator: rules.vipCode
    },
    {
        prop: 'priority',
        label: t('Priority'),
        type: 'select',
        validator: rules.priority,
        // 直接從 store 的 getter 或 state 引用，保持響應性
        options: metaStore.vipPriorityOptions
    }
];
```

### 步驟二：建立動態產生器
接著，我們建立一個函式，或更棒的，一個 `computed` 屬性，來根據條件動態產生最終的表單欄位設定陣列。

```ts
const isVip = ref(false);

// 使用 computed，當 isVip 變化時，它會自動重新計算，且結果會被快取
const formItems = computed(() => {
    const items = [...baseFormColumns];

    if (isVip.value) {
        items.push(...vipExtraColumns);
    }

    return items;
});
```

**為什麼用 `computed` 比用 `function` 更好？**

1.  **效能**：`computed` 具有快取機制。只要它的依賴項 (`isVip.value`) 沒有改變，它就不會重新計算，直接回傳上一次的結果。在頻繁 re-render 的場景下可以避免不必要的運算。
2.  **可讀性**：語意上更清晰地表達了 `formItems` 是一個由 `isVip` **衍生**出來的狀態。

### 步驟三：讓 Template 回歸純粹

現在，我們的 `<template>` 變得極度乾淨：

```vue
<template>
    <el-switch v-model="isVip" active-text="VIP User" />
    <hr />

    <el-form :model="postData" :rules="rules">
        <el-form-item
            v-for="item in formItems"
            :key="item.prop"
            :prop="item.prop"
            :label="item.label"
        >
            <el-input
                v-if="item.type === 'input'"
                v-model="postData[item.prop]"
            />
            <el-select
                v-if="item.type === 'select'"
                v-model="postData[item.prop]"
            >
                <el-option
                    v-for="option in item.options"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                />
            </el-select>
        </el-form-item>
    </el-form>
</template>
```

看，`<template>` 現在只關心「如何渲染 `formItems` 陣列」，而完全不用鳥「`formItems` 裡面到底該有哪些東西」的業務邏輯。這就是**關注點分離 (Separation of Concerns)** 的最佳實踐。

這種模式不只適用於表單，像是 `el-table` 的 `columns` 設定，也可以用同樣的思路來動態增減欄位，讓程式碼乾淨俐落。

## 架構層次：拆分元件，但請拉扁它！

談完了表單本身的設計模式，我們來看看更大的格局：元件的組織與架構。

> 我從不推薦「俄羅斯娃娃」式的元件嵌套。雖然要優化渲染確實是把 Component 拆小比較好，但拆太小、嵌太深，要追 code 真的很痛苦。
>
> **我的主張是：元件可以拆小，但結構要拉扁。**

一個健康的 Vue 專案結構，我習慣分為三層：

1.  **Page Layer (頁面層)**: 處理路由、頁面級別的邏輯、與全域狀態 (Pinia) 的互動。
2.  **Container Layer (容器層)**: 處理核心業務邏輯，組合多個原子元件來完成一個具體的功能，例如我們剛才做的那個動態表單。
3.  **Atomic Layer (原子層)**: 就是那些可複用的基礎元件，如 `Input`, `Select`, `Button`, `Card`... 基本上就是對 Quasar 或 Element Plus 這類 UI 框架的二次封裝或純粹的展示型元件。

### 災難性的俄羅斯娃娃

最怕的就是這種結構：

```
Page.vue
  └── Section.vue
      └── Card.vue
          └── Button.vue (點了跳出 Modal)
              └── Modal.vue
                  └── Content.vue
                      └── Form.vue
                          └── FormField.vue
                              └── Input.vue
```

當 `Page.vue` 的一個狀態需要傳遞給 `Input.vue` 時，會發生什麼？**Prop Drilling (屬性鑽透)**！資料像接力賽一樣一層一層往下傳，修一個地方要改八個檔案，簡直是場災難。

## 神兵利器：用 `slot` 打破深層嵌套

`slot` (插槽) 是 Vue 中解決這個問題的完美方案。它允許父元件直接將內容\*\*「投放」**到子元件指定的位置，從而**打斷\*\*了原本嚴格的父子層級結構，實現了結構上的「扁平化」。

看看這個例子，一個封裝好的 `FormModal` 元件：

```vue
<script setup>
// ... Modal 自身的開關、資料初始化等邏輯
</script>

<template>
    <el-dialog v-model="showModal">
        <slot :form-data="internalFormData" :is-vip="isVipStatus" />
    </el-dialog>
</template>
```

在頁面中使用它時，我們可以這樣寫：

```vue
<template>
    <FormModal v-model="isModalVisible">
        <template #default="{ formData, isVip }">
            <el-form :model="formData">
                <el-form-item
                    v-for="item in createFormItems(isVip)"
                    :key="item.prop"
                    :label="item.label"
                >
                    <component :is="getComponentByType(item.type)" v-model="formData[item.prop]" />
                </el-form-item>
            </el-form>
        </template>
    </FormModal>
</template>
```

看到了嗎？

`FormModal` 只負責「彈窗」的行為，它完全**不關心**表單的內容是什麼。而 `MyPage.vue` 則**完全控制**了表單的結構與渲染邏輯。我們成功地將「彈窗行為」和「表單業務」解耦了。

這種架構下，我們之前寫的 `createFormItems` 工廠函式變得更有價值，因為它可以在任何需要的地方被 `MyPage.vue` 呼叫，而不會被綁死在某個深層的子元件裡。

## 總結

寫出優雅、好維護的 Vue 程式碼，關鍵在於清晰的思路：

1.  **配置驅動 UI**：將動態的 UI 結構邏輯從 `<template>` 移至 `<script>`，用 JavaScript/TypeScript 的強大能力來處理複雜邏輯。
2.  **拒絕俄羅斯娃娃**：保持元件樹的扁平，避免超過三層的無意義嵌套。遵循 Page -\> Container -\> Atomic 的分層思想。
3.  **擁抱 Slot**：善用插槽來解耦元件，打破深層嵌套帶來的 Prop Drilling 問題，讓元件各司其職，靈活組合。

當你下次再遇到複雜的動態介面時，試著先停下來，不要急著寫 `v-if`。思考一下如何將它「配置化」，如何設計你的元件結構，你會發現，程式碼不僅變得更強大，也更加賞心悅目。

```ts
const postData = ref({
    name: '',
    email: '',
    phone: '',
    // VIP才會有的欄位
    vipCode: '',
    priority: ''
});

const baseFormColumns = [
    { prop: 'name', label: 'Name', type: 'input', validator: rules.name },
    { prop: 'email', label: 'Email', type: 'input', validator: rules.email },
    { prop: 'phone', label: 'Phone', type: 'input', validator: rules.phone }
];

const vipExtraColumns = [
    {
        prop: 'vipCode',
        label: 'VIPCode',
        type: 'input',
        validator: rules.vipCode
    },
    {
        prop: 'priority',
        label: 'Priority',
        type: 'select',
        validator: rules.priority,
        options: metaOptions.vipPriority
    }
];

const isVip = ref(false);

function createFormItems(isVipUser) {
    const formItems = [...baseFormColumns];

    if (isVipUser) {
        formItems.push(...vipExtraColumns);
    }

    return formItems;
}
```

然後拿這個createFormItems去做v-for
實際上這個封裝成composable弄成一個全域共用的方式也可以，但要傳入formRules的實體

```ts
const columnConfigs = {
    dateTime: {
        label: t(Date),
        align: 'center',
        width: '140',
        headerStyle: {
            background: '#EBEEF5'
        }
    },
    agentId: {
        label: t(Agent_ID),
        align: 'center',
        width: '180',
        headerStyle: {
            background: '#EBEEF5'
        }
    }
};
```
你只要把class寫進去給他跑v-bind就好
像這個圖片上的是單純用el-table內建的表頭樣式而已
如果擔心一直切開關讓VIP欄位有無顯示出來會有什麼龐大開銷的話，把他換成computed一樣容易

部分UI框架的內建表單驗證可能無法對v-if沒冒出來的部分做驗證
你要先跑過一次validate事件

對，options不能是純物件，所以metaOptions其實是store getter
共用下拉API提供的options放在store拉回來這樣
element plus最近這段時間的改版已經搞定這問題了
如果你用的是vuelidate那類東西就自己手動跑一次吧
vee-validate我很久沒用了，不知道改進了沒

總之你們要是為了節省template的長度做拆分組件的方式，其實不一定會比工廠邏輯把業務分類好用
算是種寫作思路上的技巧
啊對，如果表單欄位多到跟保險業金融業一樣鬼扯的，注意下BFS

不管是 React 還是 Vue
我都不推薦俄羅斯娃娃

雖然要優化渲染確實是把 Component 拆小比較好
但拆太小要追很痛苦
所以我主張可以拆小，但要拉扁
（意思是 Component 小，但不要深

多利用 slot 可以減少深度
在Vue裡面一個表單組件你能拆到超過三層我也覺得頗神的。
通常會拆很深是因為 FormModal

(竹)我習慣是：
Page Layer => Container Layer => Atomic Layer
Page Layer: 用來處理跟路由、頁面邏輯、全域邏輯
Container Layer: 處理業務邏輯，業務功能組裝
Atomic Layer: 就是那些 Input, Select... 那種元件

遇到 Modal 這類的俄羅斯娃娃，其實就拆成 children route 就好

```
FormModal (彈窗)
  └── FormWrapper (表單容器)
      └── DynamicForm (動態表單)
          └── FormItem (表單各個欄位項目)
              └── InputComponent (具體輸入組件)
```
呼叫的時候用router動態params
一路傳下去的時候其實就知道要叫誰進來了

最怕是...

Page 下面包一個 Section
Section 下面包一個 Card
Card 下面包一個 Button 叫出 Modal
Modal 下面包一個 Content
Content 下面包一個 Form
Form 下面包一個 Field
Field 下面包一個 .......... 真是夠了

有slot會靈活的多：
```vue
<FormModal v-model="showModal">
  <template #default="{ formData, isVip }">
    <el-form :model="formData">
      <el-form-item
        v-for="item in createFormItems(isVip)"
        :key="item.prop"
        :label="item.label"
      >
        <component :is="getInputComponent(item)" />
      </el-form-item>
    </el-form>
  </template>
</FormModal>
```

剛才我講的工廠createFormItems，在這種架構下更有用
不必被綁死在特定一層

slot的扁平化作用也可以減少props一直傳的問題
優雅的程式碼就是這麼好維護
