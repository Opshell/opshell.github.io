---
title: menu&權限組
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2024-09-09'
categories:
tags:
editLink: true
isPublished: false
---
底層問題
資料交換問題
打包問題
框架使用問題
GC相關問題
效能優化問題
人與人協作問題

14:49 Mesak 阿米 好累 沒一個標準的前端 後端選單都亂刻QQ
14:50 Mesak 阿米已收回訊息
14:50 Mesak 阿米 只能自己下來幹 Q_Q
14:51 Mesak 阿米 後端正常吐 給前端 動態 MENU  要樹狀還是平面
14:52 Astolfo 後台的話我是依照登入後給我的權限表去生
14:52 Astolfo 這樣比較不用擔心要一直把v-if拿去綁
14:52 Mesak 阿米 前端控權限 給你全部清單嗎
14:52 Astolfo 就，menu內容要顯示什麼完全依照權限表ˇ
14:52 Mesak 阿米 那就是已經驗過一次的MENU吧
14:53 Mesak 阿米 這通常回來都是平面吧?
14:53 Astolfo 後台的話權限表的存放我也會放Local
14:53 Astolfo 不一定，看後端怎麼給，我通常會拿到樹狀結構的資料
14:53 Mesak 阿米 children 應該是前端自己組起來
14:53 Mesak 阿米已收回訊息
14:53 Mesak 阿米 樹狀那麵包屑這個 功能
14:54 Mesak 阿米 是怎麼組
14:54 Astolfo ```
[
  {
    route: "vendorList",
    edit: "1",
    children: [{...}]
  }
]
```
14:54 Astolfo 一樣
14:54 Mesak 阿米 也是後端在給一個API?
14:55 Astolfo 你如果回傳的全都是同一層平面，最後還是得做一個轉換
14:55 Astolfo 不用，一開始就是有層級的話比較好做
14:55 Astolfo 只要判別還有沒有CHILD
14:55 Mesak 阿米 我覺得打一次API  就全部拋給前端作就好了
14:55 Astolfo 對阿
14:56 Mesak 阿米 至於是不是樹狀好像都是前端的事情
14:56 Astolfo 如果改了權限，那就是強制重登
14:56 Astolfo 沒錯
14:56 Mesak 阿米 所以我是覺得我後端給你 平面的
14:56 Mesak 阿米 前端自己組樹
14:56 Astolfo 事實上權限管理的資料處理就是在做DFS查詢
14:56 Mesak 阿米 給平面的 也比較好組麵包屑吧
14:57 Astolfo 平面其實不會比較好組
14:57 Astolfo已收回訊息
14:57 Astolfo 萬一你的編輯畫面結構是

dashboard >> vendor list >> monthly >> edit
14:58 Astolfo 都在同一層的資料要怎麼組?
14:58 Astolfo 誰是誰的後代?
14:58 Mesak 阿米 到該頁面的時候路由應該已經組出 dashboard >> vendor list >> monthly 這層了吧?
14:58 Mesak 阿米 因為到該目錄的時候已經只有該 元件的 路由 跟ID
14:58 Astolfo 路由其實也是跟著權限綁出來的
14:58 Astolfo 這裡要講好前後端怎麼配合
14:59 Mesak 阿米 如果把平面的MENU拿去 MAP 應該可以拿 ID去把父曾兜出來
14:59 Astolfo 沒有的路由就無法訪問，因為沒有權限
14:59 Astolfo 你講的是前端自己已經有路由的前題
14:59 Astolfo 但我這邊說的是，權限表為基礎，路由和menu都由那張表為準去渲染
14:59 Mesak 阿米 我比較疑惑的是樹狀怎麼組麵包屑
15:00 Astolfo 可以組，撈路由
15:00 Astolfo 樹狀一定會有節點
15:00 Mesak 阿米 撈路由不撈 MENU嗎
15:00 Astolfo menu的結構不一定和你原本給我的權限表一樣
15:01 Astolfo 有時候你要做一些特效
15:01 Astolfo 或者是伸縮的基礎，都需要節點
15:01 Astolfo 有的PM會把選單的某蠍子層設計在同一層
15:01 Mesak 阿米 蠍子層 是什麼
15:01 Astolfo 即便我們知道B是A的後代，他還是會設計成同一層給客戶使用
15:02 Opshell 是  我的做法和福大是一樣的
不過 我有朋友是資深後端他會偏向米大的做法
15:02 Mesak 阿米 後端來作前端就會這樣想
15:02 Astolfo 那跟是不是資深後端沒什麼關係
15:02 Opshell 不過  後端處理 樹狀和排序真的會比前端容易很多
15:02 Mesak 阿米 前端來規劃選單就是會說 前端的路由前端控，後端給權限
15:02 Astolfo 就是誰要去處理那張表的層級
15:03 Astolfo已收回訊息
15:03 Mesak 阿米 我主要是想 根據撈取出來的結果 來長畫面
15:03 Mesak 阿米 系統越肥權限表就越大
15:03 Astolfo 前端要做的話就變成login後拿到權限總表，就得生好所有層級才開始route next()
15:03 Opshell 是  所以 後端會先把資料整理好對吧
15:04 Mesak 阿米 我會覺得 前端越少知道權限表的範圍 只要把畫面呈現出來  資料的流動也會變小
15:04 Mesak 阿米 YES
15:04 Mesak 阿米 我覺得兩者其實都可以真的就是 每個人作法不同 XD
15:04 Astolfo 這樣會變成我們每次要針對特定身分是不是可以操作現在的ui，把顯示邏輯散落在不同地方，比較不好集中管理
15:05 Opshell 這樣的話   要顯示的東西  跟資料階層不是都會一起整理出來嗎？ 所以看起來應該會是樹狀
15:05 Opshell 的確
15:05 Astolfo 不，實際上是專案大小決定的
15:05 Mesak 阿米 我比較喜歡 組平面 給前端組樹狀
15:06 Opshell 平面的話   資料階層之間的邏輯關係不會很難管理嗎?
15:06 Mesak 阿米 都有 parent_id
15:06 Mesak 阿米 找不到爸爸後端應該不會給
15:06 前端小萌新 我也喜歡拿到攤平的資料XD
15:07 Mesak 阿米 早期我看 element ui 他的 admin 是根據 role給 menu的
15:07 Astolfo 那個就是權限表
15:07 Astolfo 他只是分類出ROLE當中可以做什麼
15:07 Mesak 阿米 這樣的問題是
15:08 Mesak 阿米 當一個人被拔掉權限
15:08 Mesak 阿米 或是一個選單沒有了某個權限
15:08 Mesak 阿米 前端要重新打包
15:08 Opshell 恩?權限不都是API 從後端拉  為什麼要重新打包?
15:09 Astolfo 權限變更以後應該是要強制讓他登出回來再登一次
15:09 Astolfo 所以這段不是重新打包，是ES MODULE重新組成
15:09 Astolfo 早期WEBPACK才有這問題
15:09 Mesak 阿米 應該是說 我某個畫面要跟某個權限 綁在一起
15:09 Mesak 阿米 後面 如果取消這個權限跟元件的邏輯
15:09 Mesak 阿米 需要改前端
15:12 Astolfo 適合大型專案的權限表裡面應該要有符合ROLE的結構:

```
{
  id: "200",
  routeName: "vendor-list",
  permissions: ["edit", "del", "read"],
  children: [{
    id: "201",
    routeName: "vendor-list-monthly",
    permissions: ["edit", "del", "read"],
  }]
}
```
15:12 Astolfo 這方式是由後端去依照權限管理控制
15:12 Astolfo 這樣頁面上的組件可以由PROPS注入他的權限依賴
15:13 Astolfo 一旦權限管理介面有變更成功，這時候就會讓該帳號重新登入
15:13 Astolfo 取得新的身分相應的表
15:13 ipph 這是能修改文章的API嗎?
15:14 Astolfo vendor是代理商
15:14 Astolfo 可以crud代理商、看月週日報表等行為，或者一些閱讀權限，有的是股東身分才能看
15:15 ipph 那要注意 如果沒驗證身分打這支能娶到資料嗎?
15:16 轉職成功 Ａ大讚讚
15:16 Mesak 阿米 這個是功能權限
15:16 Astolfo 這就看你服務要怎麼設計
15:16 Mesak 阿米 基本後端會檔掉
15:16 Astolfo 是，但由登入身分在你的role表中他是哪個類組
15:16 Mesak 阿米 但是前端路由應該也要先檔掉
15:16 Astolfo 前端的路由其實一開始只有login
15:16 Astolfo 沒有拿到權限表以前不會去渲染路由
15:16 Astolfo 這是最安全的方式
15:18 Amber 會搭配router guard對嗎
15:18 Mesak 阿米 我現在要設計 進入權限 功能權限 之後還有閱讀權限 (Capoo crying)
15:18 Astolfo 所以我說阿
15:18 Astolfo 你第一個考慮的點
15:18 Mesak 阿米 前面的專案前端根本沒這些邏輯
15:18 Astolfo 這系統是自己用，還是要賣客戶做成saas
15:18 Astolfo saas就是我的方法
15:20 Astolfo 也可以避免客戶反向工程找到你太多route邏輯
15:20 Astolfo 然後找人去複刻一個
15:21 Astolfo 如果是自己用的，那你在使用扁平化資料時，想怎麼組當然沒問題
15:21 Astolfo 靈活性是比較高沒錯，也容易造成組件狀態管理code上的耦合
15:21 Astolfo 因為這種code很容易重複
15:21 Astolfo 集中管理也要拉一隻middleware處理
15:21 Mesak 阿米 平面當然是取回來的時候
15:21 Mesak 阿米 store就組好了
15:22 Astolfo store? 刷新頁面就不見啦，可能要存local
15:22 Astolfo 不然你權限刷新一次就要打一次
15:22 Astolfo 我覺得那太大包
15:22 Mesak 阿米 刷新頁面重新打一次 menu
15:22 Astolfo 這樣有點浪費資源
15:22 Mesak 阿米 所以 MENU要存喔?
15:22 Astolfo 專案不大沒關係
15:22 Mesak 阿米 我倒是沒考慮過這個
15:22 Astolfo 少一點redis存取吧
15:23 Astolfo 把資源挪給需要高頻繁請求的地方
15:23 Astolfo log清理很麻煩的
15:23 Mesak 阿米 因為權限是跟著menu走的 所以我想說每次 REQUEST都會打一次驗證權限
15:24 Astolfo 你每次渲染menu會把ui在onMounted的時候掛進來，這時候其實已經吃掉一些ram了
15:24 Astolfo 一直重複打就會為了把資料取回
15:24 Astolfo 可能要改成設計異步組件
15:26 Astolfo 綁上keep alive也可以cache住
15:26 Astolfo 如果你只處理後端，那這個留給前端去思考沒關係
15:26 Astolfo 但要是你得下來寫前端，我覺得你可能要考慮一下我剛講的集中管理問題
15:27 Astolfo @Opshell 看得懂問題在哪嗎
15:28 Mesak 阿米 這個不懂 xd
15:28 Mesak 阿米 不RELOAD的情況下 可以CACHE
15:28 Mesak 阿米 這個沒問題
15:28 Astolfo VUE的KEEP ALIVE可以把你已經渲染好的組件保持CACHE
15:28 Mesak 阿米 但是 RELOAD的時候應該也是會 重新打一次API吧
15:28 Astolfo 而你的選單如果有很多CHILD
15:28 Astolfo 那應該會依賴v-for
15:28 Astolfo 除了keep alive，也有v-memo
15:29 Astolfo 特定的資料沒變他就不會重新渲染
15:29 Astolfo 因為v-for預設會整批更新喔
15:29 Opshell 等等  突然被 cub  我錯過了什麼?
15:29 Mesak 阿米 我的問題是這個 XD
15:29 Astolfo 你剛不是說之前你是這種做法，但你的資深後端覺得不妥嗎
15:30 Astolfo reload打api，會看你當前在哪
15:30 Astolfo 如果是已經生好的menu，不用重戳
15:31 Astolfo 剛才你一直在說的是每次刷新都請求menu的api或者權限表，這樣其實很浪費資源
15:31 Opshell 是沒有不妥  他只是從後端的角度看  比較體驗不到前端的思考方向
15:31 Astolfo menu不是個會隨時更新的東西
15:31 Astolfo 但你重新整理的頁面可能是報表或者其他有CRUD的功能
15:31 Astolfo 那些才會需要重新FETCH
15:32 Astolfo 重點在於你要想想這些東西
15:32 Mesak 阿米 下次我放 sessionStoreage
15:32 Astolfo 是不是一直都得拿最新狀態
15:32 Astolfo 也是個方法
15:32 Mesak 阿米 但我覺得會被其他單位念
15:32 Astolfo 但你有任何需要V-FOR渲染的操作，記得剛才我說的v-memo和v-for重新渲染的問題
15:33 Astolfo 人家不懂嘛
15:33 Astolfo 當然你還是可以選用你認為最不會被靠北的方法
15:33 Mesak 阿米 通常都是 這一秒你說登入進不去登出登入也不行
15:33 Mesak 阿米 下一秒開通 還是不行
15:33 Mesak 阿米 就被念
15:33 Mesak 阿米 請關閉瀏覽器
15:33 Mesak 阿米 貼圖
15:34 Mesak 阿米 快取有好有壞...
15:34 Astolfo 看怎麼用
15:34 Astolfo 總之大型專案的後台，我是不太接受扁平資料自己組
15:34 Astolfo 畢竟saas很講求安全性，要賣給客戶的
15:34 Astolfo 自用的就算了，前後端講好就好
15:35 Astolfo 被雷過才有這些體驗心得
15:35 Mesak 阿米 說到這個讓我想到後端的組樹方法
15:36 Mesak 阿米 直接QUERY 遞迴
15:36 Mesak 阿米 害我又要花時間改 (Capoo rolling eyes)
15:36 Astolfo 翻回去看整串對話，這個可以當精華了
15:36 Astolfo 權限事後台最麻煩的top3之一
15:37 Astolfo 而且如果有客服參與後台使用，運營也會跟他們一樣，希望長期可以不用重登
15:37 Astolfo 那就是要考慮refresh
