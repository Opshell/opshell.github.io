17:06 Ava 想問問一個菜鳥問題，這樣的寫法是合理的嗎？
 if( xxx = 1 ){...} else if( xxx = 2)

使用數字，但是其他人可能不知道 1, 2 是什麼 (emoji)

17:06 int*** 首先是==
17:06 Alex ===
17:06 Ava 啊... 抱歉
17:07 int*** xxx=1永遠是true
17:07 JP ===
17:07 Ava 感謝 O_Q 放假放得太開心，忘記那邊要 ==, ===

17:08 雞白麵 好唷
17:08 int*** 這個時候就需要用enum，但很遺憾js原生沒有，所以我都設一個json物件，key用名字value用數字
17:08 int*** 或者乾脆用字串名字替代
17:08 哇呀哇呀哇 用ts
17:08 鱈魚 可以直接用物件，配合 JSDoc，還可以有提示
17:09 鱈魚 jsconfig 設定一下
17:09 Astolfo ```
const conditions = {
  1: () => {...},
  2: () => {...}
}

conditions[xxx]()
```

請服用
17:09 Astolfo 記得加上當無法找到xxx時的錯誤處理喔
17:09 Ava 感謝大家 O_Q
17:10 鱈魚 https://zh.wikipedia.org/wiki/%E9%AD%94%E8%A1%93%E6%95%B8%E5%AD%97_(%E7%A8%8B%E5%BC%8F%E8%A8%AD%E8%A8%88)
17:10 int*** 還有就是如果要這麼多層if的話可以考慮用switch
17:10 Astolfo 物件映射是更優雅的方式
17:11 Mesak 阿米 定義 ENUM
17:11 Alex 之前我也是用switch，用物件簡潔滿多
17:11 Mesak 阿米 不然寫 const
17:12 Mesak 阿米 替代方案是 freeze
17:16 Ava 指的是 TypeScript 嗎？
17:16 int*** 是的
17:16 Mesak 阿米 圖片
17:16 Mesak 阿米 我之前寫的

17:17 Ava wow 感謝大家，我來補一下知識
17:17 Mesak 阿米 SystemIsLock.On
17:17 JP 請教 freeze 這方法能定義 true/false 嗎？
17:18 Mesak 阿米 直接寫 true false 呀
17:18 JP 額 有特殊需求
17:18 JP 希望能夠直接 xxxx.Enable / xxxx.Disable 這樣
17:19 JP xxxx.ENABLE / xxxx.DISABLE
17:19 int*** 可以啊0.0
17:19 Mesak 阿米 照這樣寫呀
17:19 JP 嗯嗯
17:19 歐喵喵 object 訂得夠明確 ide 就抓得到