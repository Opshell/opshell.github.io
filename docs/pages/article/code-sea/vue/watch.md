總之待會我會考Vue3的底層

其實上禮拜開始我們都有探討過
大致上如果你是資深開發者，必須要知道Watch、WatchEffect、computed、以及響應式底層

Watch、WatchEffect
底層響應邏輯?

```json
"data" : {
    "diseases": {
        "2": {
            "id": 2767,
            "disease": 15
        },
        "3": {
            "id": 2768,
            "disease": 16
        }
    },
}
```

```ts
// 轉成純 Array 給 el-select 用
const diseases: Ref<number[]> = ref([]);

// 把 diseases 分割成多個 單select

const diseases = computed(() => {
    return tempData.value.diseases.map(disease => disease.disease);
});

watch(tempData, (val) => {
    diseases.value = val.diseases.map(disease => disease.disease);
});

watchEffect(() => {
    diseases.value = tempData.value.diseases.map(disease => disease.disease);
});
```

computed 會響應  但是在後續的操作會有問題所以只能考慮 watch 和 watchEffect

這個情境下 為什麼  watch 不會響應

watchEffect 卻可以正常操作呢?

`後來用watch deep / watchEffect 來處理...`

watchEffect：
不用指定目標，可以自行收集依賴的 watch，只是因為很容易發生來源不明的問題，所以實務上真的滿少用
沒有 return 而且可能會有副作用的 computed
```ts
const count = ref(0); // 響應式狀態
const anotherCount = ref(5); // 另一個響應式狀態

watchEffect(() => {
    console.log(`count 的值是 ${count.value}`);
});
```

像這例子就只會抓count.value的變化而不會把anotherCount當作監聽對象

還有2更新到3以後最重大的改變，以及你用了這麼久，有沒有一些自己的感受
對於效能調校、打包優化、長時間使用網頁造成的記憶體消耗如何釋放

再來是前端共通的知識領域，通訊方式與協定、不同部門協作的溝通、短時間內有高壓力剛性需求心態如何調整

## 記憶體消耗
watch如果一直把整包資料丟進去監聽會發生很可怕的記憶體消耗

參考資料：https://codlin.me/blog-vue/hang-tight-for-a-sec-before-you-start-watch

## watch 新舊值為什麼會一樣
在使用 Vue 3 的 Composition API 搭配 VeeValidate 進行表單處理，並結合 Zod 進行結構驗證時，開發者常會利用 watch 來監聽表單值的變化以觸發特定操作。然而，一個常見的困擾是，在 watch 的回呼函式中，接收到的新值（newValue）和舊值（oldValue）卻是相同的。這個現象並非 VeeValidate 或 Zod 的 bug，而是源於 Vue 的響應式系統處理物件時的特性。

問題根源：物件的響應式與 watch 的淺層監聽
在 Vue 中，當我們使用 reactive 或 VeeValidate 的 useForm 回傳的 values 物件時，我們得到的是一個響應式的 Proxy 物件。當您修改表單中的任何一個欄位時，您是在變動 (mutate) 這個 Proxy 物件的屬性，而不是替換掉整個物件。

Vue 的 watch 函式在預設情況下是淺層監聽的。這意味著它只會追蹤被監聽的來源（例如 values 物件）的參考是否發生變化。由於您只是修改物件的內部屬性，values 物件本身的記憶體參考位址並未改變。因此，在 watch 的回呼函式中，newValue 和 oldValue 都指向同一個物件參考，導致它們的值看起來總是一樣的。

簡單來說，watch 預設只看「整個箱子有沒有被換掉」，而不關心「箱子裡面的東西有沒有變化」。

解決方案：深度監聽與值複製
要解決這個問題，您需要明確告知 Vue 您想要監聽的是物件內部的屬性變化。這可以透過以下幾種方式實現：

1. 使用 deep: true 進行深度監聽
這是最直接且常用的解決方案。透過在 watch 的選項中設定 deep: true，您可以強制 watch 遞迴地檢查被監聽物件中的所有巢狀屬性。

```ts
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import * as z from 'zod';
import { watch } from 'vue';

// 您的 Zod schema
const validationSchema = toTypedSchema(
    z.object({
        name: z.string().min(2, '姓名至少需要兩個字'),
        email: z.string().email('請輸入有效的電子郵件')
    })
);

const { values } = useForm({
    validationSchema
});

// 使用 watch 監聽 values 的變化
watch(
    values,
    (newValue, oldValue) => {
    // 在這裡，newValue 和 oldValue 仍然會是同一個物件參考
    // 但是這個 watch 會在任何屬性變動時被觸發
        console.log('表單值已變更:', newValue);

        // 注意：即使有 deep: true，oldValue 仍然會與 newValue 相同
        // 因為它們指向同一個被修改的物件
        console.log('新舊值是否相同:', newValue === oldValue); // true
    },
    {
        deep: true // 關鍵設定：啟用深度監聽
    }
);
```
請注意： 即使使用了 deep: true，在回呼函式中 newValue 和 oldValue 仍然會是同一個物件的參考。deep: true 的作用是確保在物件內部屬性變化時能夠觸發監聽，而不是提供一個變更前的物件複本。如果您需要一個真正的「舊值」複本進行比較，您需要在 watch 觸發時手動處理。

2. 監聽回傳新物件的 Getter 函式
如果您只想在特定欄位變更時觸發 watch，而不是整個表單，一個更高效的方式是監聽一個回傳該欄位值的 getter 函式。對於基本型別（如 string, number）的欄位，這會自然地提供正確的新舊值。

```ts
watch(
    () => values.name,
    (newName, oldName) => {
        console.log(`姓名從 "${oldName}" 變更為 "${newName}"`);
    }
);
```
3. 手動複製舊值
如果您確實需要一個完整的、變更前的表單物件複本來進行比較，您可以在 watch 的來源中使用一個 getter 函式，並在其中對 values 物件進行深層複製。

```ts
import { cloneDeep } from 'lodash-es'; // 建議使用如 lodash 的工具庫來進行深層複製

watch(
    () => cloneDeep(values), // 在監聽來源中就進行深層複製
    (newValue, oldValue) => {
    // 這樣 oldValue 就會是變更前的物件複本
        console.log('舊值:', oldValue);
        console.log('新值:', newValue);
        console.log('新舊值是否相同:', newValue === oldValue); // false
    },
    {
    // 由於我們監聽的是一個 getter 函式的回傳值（一個新的複製物件），
    // 每次變動都會產生新的物件參考，因此理論上不再需要 deep: true。
    // 但若 values 內部有非常複雜的巢狀結構，保留它可能更為保險。
        deep: true
    }
);
```
然而，這種方法在每次表單值變動時都會進行一次深層複製，對於大型且複雜的表單可能會有效能上的考量，建議謹慎使用。

總結
當您在使用 VeeValidate 和 Zod 時，遇到 watch 監聽 values 物件新舊值相同的情況，請記住這通常是 Vue 響應式機制的預期行為。最佳的解決方案是根據您的具體需求來選擇：

若只想在表單有任何變動時觸發操作： 使用 watch(values, callback, { deep: true })。

若只想監聽特定欄位的變化： 使用 watch(() => values.fieldName, callback)。

若需要完整的舊值物件進行比較： 考慮在監聽來源中手動進行深層複製，但需注意效能影響。

理解 Vue 的響應式原理，將能幫助您更有效地解決這類問題，並更精準地控制您的表單邏輯。
