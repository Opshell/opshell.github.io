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

```vue
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
```
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
