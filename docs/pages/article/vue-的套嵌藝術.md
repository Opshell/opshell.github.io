---
title: vue 的套嵌藝術
image:
description:
keywords:
author: 'Opshell'
createdAt: 2025-06-27
categories:
  - '未分類'
tags:
  -
editLink: true
isPublished: false
---

#

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
