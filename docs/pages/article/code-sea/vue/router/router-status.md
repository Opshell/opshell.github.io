如果不想用 query string 或 path 傳遞資料，想傳輸完整的物件資料的話，可以考慮使用 history API 提供的 state

不過由於 Vue Router 已經占用了 state 資料，所以不能直接覆蓋，要這樣寫：
https://github.com/vuejs/vue-router/issues/2243#issuecomment-591439883

這個討論還在 RFC 階段，不知道甚麼時候才會正式變成 Vue Router 預設功能

Vue Router 團隊都跑去搞 Data Loader 了，不過我真的看不太懂為甚麼需要這個東西 XD
https://uvr.esm.is/data-loaders/

他們想要簡化路由層級可以處理資料載入的能力
一般我們都是在Created或Mounted，也就是現在的setup、onMounted進行資料載入
但這種方式本來在專案越大的時候就會有一定的複雜度導致分散邏輯
他們想要為了讓這件事情變得更簡單，利用路由變化時就載入這些必要的資料處理(PreFetch的概念)

而且這在SSR也有一定便利性
loader層就可以處理掉，減少水合問題
還可以跟router guard結合

defineBasicLoader()似乎可以在裡面異步請求來達到prefetch  自帶取消
這屌了，跟vueQuery一樣方便，取銷路由訪問的同時就會自動取消LOADER中的異步 AbortSignal
https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal

可能裝個unplugin-vue-router來玩玩看才知道了
還可以透過 lazy 設定是否阻塞導航

https://uvr.esm.is/data-loaders/defining-loaders.html#non-blocking-loaders-with-lazy

```vue
<script>
import { defineBasicLoader } from 'unplugin-vue-router/data-loaders/basic'
import { fetchUserData } from '@/service/api'

export const useUserData = defineBasicLoader('/user/profile', async (route) => {
  // 假設要傳入一組物件資料
  const data = await fetchUserData(route.params.uid)
  return {
    userData: data,
    otherObject: {...}
  }
})
</script>
```

到組件調用

const {
  userData,
  otherObject
} = useUserData()
