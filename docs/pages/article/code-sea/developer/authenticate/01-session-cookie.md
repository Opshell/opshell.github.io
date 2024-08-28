---
title:  'Session & Cookie'
author: 'Opshell'
createdAt: '2024/08/27'
categories: 'Web Application'
tags:
  - Web Application
  - CORS
editLink: true
isPublished: true
---

## 摘要
`HTTP cookie(數位存根)`，後續簡稱 `cookie`
專門為網頁瀏覽器所建立，用於追蹤、個人化和保存關於使用者的資訊、行為。

`session(會話)`後續簡稱 `session`，網站瀏覽期間在伺服端留存的身份識別資訊。

`cookie` 記錄使用者資訊並存在 `Client(客戶端)`(瀏覽器)，
`session`記錄使用者資訊並存在 `Server(伺服端)`(網頁主機)。

兩者相結合即 `session-cookie(認證機制)` ，可以用來驗證使用者的身份。

## Session 是什麼?
1. `web(網頁)`剛出現時，只是一篇篇放在網路上的文字檔，指提供紀錄、瀏覽的基本功能，隨着技術的進步，網頁互動的需求，有了登錄、電子商務、網頁遊戲...等需求，於是產生了需要識別目前瀏覽者身分的需求。
2. 因為HTTP是無狀態的，所以想出來的辦法就是給大家每個人發一個`session_id(會話標籤)`給`Client`，發起請求時，瀏覽器會帶這個標籤給`Server`讓`Server`比對，這樣就可以識別使用者身份。

### session的實踐原理：
`session` 是在 `Server`裡的一個儲存空間，每一位瀏覽者都會有自己的一份`session`，每次請求都會透過 `Client` 端帶過來的 `session_id` 來存取對應的 `session`，一般來說`session_id` 存在 `Client` 端的 `cookie` 裡面。只要 `Client` 端不允許使用 `cookie` 一般來說 `session` 就會無法追蹤會話。

### session 底層實踐方式：
1. 當一個`session`開始時，`Servlet容器`會創建一個`HttpSession對象`，那麼在`HttpSession對象`中，可以存放使用者狀態的資訊。
2. `Servlet容器`為`HttpSession對象`分配一個唯一標籤`session_id`，`Servlet容器`把`session_id` 塞進 ` `cookie` ` 保存在`Client`中。
3. 使用者每次發出`Http請求`時，`Servlet容器`會從`HttpServletRequest對象`中取出`session_id`，然後根據這個`session_id`找到相應的`HttpSession對象`，從而獲取使用者狀態的資訊

### session結束生命週期的兩種辦法
1. 一個是`Session.invalidate()`方法，不過這個方法在實際的開發中，並不推薦，可能在強制註銷使用者的時候會使用；
2. 一個是當前使用者和`Server`的交互時間超過生命週期後，`session`會失效。

::: tip
  其實當瀏覽器關閉的時候，瀏覽器並沒有向`Server`發送關閉`session`的請求，那為什麼重新打開時`session`訪問不到了呢？
  因為瀏覽器關閉後，`cookie`銷毀了，重新打開瀏覽器時，之前的`cookie`不在了，所以`Server`會**再發一個新的**，
  而本來的`session`會等到生命週期到了後自然銷燬。

  而使用者瀏覽這個網站的不同頁面時，始終處於一個`session`中。
:::

##  `cookie`  是什麼?
上面一直提到`cookie`，那麼 `cookie` 到底是什麼口味的?
`cookie`是`Server`發送儲存在`Client`的小型文件(最多只有4Kb)，內容是一包規範的Key、value、特殊屬性。
由W3C組織提出的標準，目前所有主流瀏覽器都支援`cookie`。 `cookie`的作用是與`Server`進行通訊，作為http規範的一部分而存在的。

::: tip
  Google 在2020年發出消滅`cookie`的宣言，Google 預計在2022年前廢除`cookie`。
  但是，`cookie` 太深入目前的網頁生態，觸動太多人的蛋糕了，與廣告業產生強烈的分歧，計劃推遲到 2024 然後推遲到 2025 ，
  目前 Google 宣布結束四年來將 Chrome 瀏覽器中 `cookie` 淘汰的計畫，
  表示將讓使用者擁有能夠選擇更多隱私的選項，而非汰除 `cookie`。

  如果瀏覽器不支援`cookie`或者禁用了，`cookie`功能就失效了。比如ios Android等 不支援`cookie`因為他們用的是原生的系統，而不是瀏覽器。
:::

一般情況下跨域請求，瀏覽器是不會發送憑證資訊，有這個需求時，需要在 `XMLHttpRequest` 裡設定 `withCredentials=true`，
才會附帶上該ajax請求所在域的`cookie`，使`cookie`可以隨着請求跨域發送。
並且`Server`應該在`response header`中回傳 `Access-Control-Allow-Credentials:true` ，
否則瀏覽器將不會把`response`的結果傳遞給發出請求的程式，以確保資訊安全。
給一個帶有`withCredentials`的請求發送響應的時候，`Server`端必須指定允許請求的域名，不能使用'*'.否則會失敗。
- `axios`和`jQuery`在同域ajax請求時會帶上`cookie`， 跨域請求不會， 跨域請求需要設定 `withCredentials`和`Server`的`response header`
- `Server` 如果設定了 `httpOnly: true`，那麼帶有該屬性的 `cookie` `Client`將無法讀取(可以預防`XSS`攻擊)。

## cookie vs session
|          | cookie                                   | session                      |
| -------- | ---------------------------------------- | ---------------------------- |
| 存放位置 | 資料存在`Client` (硬碟或記憶體)          | 資料存在`Server`             |
| 存放格式 | 字串                                     | 物件                         |
| 安全性   | 不安全，有`XSS` [^1]、`CSRF` [^2]等攻擊  | `XSS`攻擊                    |
| 尺寸限制 | 大小不能超過4k                           | 沒有限制                     |
| 生命週期 | 可以設定生命週期，或永久保存在本地的文件 | 生命週期到了銷毀             |
| 性能需求 | 無                                       | 存在`Server`，`Server`有壓力 |
| 隱私     | 常用於追蹤用戶行為                       | 無                           |
| 路徑     | 可以設定路徑                             | 不區分路徑                   |

## Session-cookie (認證機制)
`cookie` 和 `session` 組合在一起可以作為使用者認證機制之一： `session-cookie(認證機制)`

### 1. Session-cookie 的實踐原理：
`Server` 通過在 `response header` 裡設定 `Set-cookie` 來讓瀏覽器保存 `cookie`，瀏覽器在請求中攜帶 `cookie` 來告訴 `Server` 之前的狀態。
`cookie` 中包含若干個鍵值對，每個鍵值對可以單獨設定過期時間。

[此處應有圖]

### 2. cookie 屬性
- name `as string`： `cookie` 的名稱。 `cookie` 一旦生成，名稱便不可更改。
- value `as object`： 該 `cookie` 的值。如果值為`Unicode`，需要設定編碼格式。如果值為二進制，則使用`base64`編碼
  ::: details
    - 中文：屬於`Unicode`，在記憶體中佔4個字元， `cookie` 中使用`Unicode`時需要對`Unicode`進行編碼，否則會呈現亂碼。<br />
    一般使用`UTF-8`編碼。不推薦使用`Big5`、`GBK`等中文編碼，因為瀏覽器和`JavaScript`不一定支援。
    - 英文：屬於`ASCII`，記憶體中只佔2個字節。
    - 二進制：例如在 `cookie` 中使用數字證書，提供安全度。使用二進制值時需要使用`base64`編碼。
  :::

- MaxAge `as int`：`cookie` 失效的時間，單位秒。預設為-1。<br />
  通過`getMaxAge()`與`setMaxAge(MaxAge as int)`方法來讀寫`MaxAge`屬性。
  ::: details
    - 正：則表示該 `cookie` 會在 `MaxAge` 秒之後自動失效。<br />
    瀏覽器會將`MaxAge`為正數的 `cookie` 持久化，寫到對應的 `cookie` 文件(存放在硬碟)中。<br />
    無論客户關閉了瀏覽器還是電腦，只要還在 `MaxAge` 秒之前，登錄網站時該 `cookie` 仍然有效。
    - 負：則表示該 `cookie` 僅在瀏覽器以及該網站打開的網頁內有效，關閉網站後 `cookie` 失效。<br />
    `Maxage`為負數的 `cookie` ，為臨時性(存在瀏覽器記憶體中) `cookie`。 關閉瀏覽器 `cookie` 就消失了。
    - 0：則表示刪除該 `cookie` 。 <br />
    `cookie` 機制沒有提供刪除 `cookie` 的方法，通過設定 `cookie` 即時失效來達到刪除 `cookie` 的效果。<br />
    `cookie` 會被瀏覽器從 硬碟或者記憶體中刪除‧
    - 沒設定：這個`cookie`的生命期為瀏覽器會話期間(稱為`session cookie`)，關閉瀏覽器時`cookie`就會消失。 `session cookie`一般不存儲在硬碟而是保存在記憶體‧

    ::: tip
      HTTP1.0 中使用的是`expires`。HTTP1.1 中被`MaxAge`取代了，<br />
      (ie6、ie7 和 ie8) 不支持 `MaxAge`，所有的瀏覽器都支持 `expires` 但是現在沒人在管IE了啦~~~

  :::

- secure `as boolean`： 該 `cookie` 是否僅能在 `https (被TLS(SSL)安全協議加密過的http通訊)` 的情況下使被取得。預設為 `false`
  ::: details
    secure 屬性設定為 true，會限制瀏覽器只會在 `HTTPS` 中傳輸 `cookie` 。
    ::: tip
      如果需要更高安全性，建議在`Server`端程式中對 `cookie` 內容加密、解密，以防泄密。
  :::
- HttpOnly `as boolean`：啟用時瀏覽器會限制 `cookie` 只能經由 HTTP(S) 協定來存取。
  ::: warning
    當網站有 `Cross-Site Scripting(XSS)` 弱點時，若 `cookie` 含有 `HttpOnly` flag，<br />
    攻擊者無法直接經由 JavaScript 存取使用者的 `cookie`，<br />
    因此 HttpOnly 可有效降低 `XSS` 的影響並提升攻擊難度。
  :::
- SameSite `as (Strict | Lax | None)`：瀏覽器會檢查 對這個`cookie`的`request(請求)` 和 `cookie` 本身是否同源，不同源則不給存取該 `cookie` ，預設'Lax'。
  ::: warning
    - Strict：會完全禁止第三方的 `cookie request`，基本上只有在 請求網域 和 URL中的網域相同，才會傳遞 `cookie`。
    - Lax：限制大多數的第三方請求，但 Lax 會允許 Get 的請求
    - None：不限制 `cookie request` 需 啟用 `secure`，否則等同 'Lax'

    當網站有 `Cross-Site Scripting(XSS)` 弱點時，若 `cookie` 含有 `HttpOnly` flag，<br />
    攻擊者無法直接經由 JavaScript 存取使用者的 `cookie`，<br />
    因此 HttpOnly 可有效降低 `XSS` 的影響並提升攻擊難度。

    建議除了設定 SameSite 以外，再加上 `CSRF Token` 會更有效的防範 `CSRF` 的攻擊。
  :::

- domain `as string`： 可以訪問該 `cookie` 的域名。
  ::: details
    如果設定為".google.com"，則所有以"google.com"結尾的域名都可以訪問該 `cookie` 。注意第一個字元必須為"."

    - `cookie` 是有域的，根據 `cookie` 的規範(隱私安全機制)，瀏覽器只會操作當前域名的`cookie`，也就是説 google 不能操作 github 的 `cookie`。
    - 需要注意的是，雖然網站 `images.google.com` 與網站 `www.google.com` 同屬於 Google，但是子網域不一樣，二者同樣不能互相操作彼此的 `cookie` 。<br />
    如果需要所有頂級域下的二級域名都使用同一個`cookie`，需要設定`cookie`的`domain`為頂級域，但會提高安全風險。
  :::
  ::: tip
    因為 `cookie` 存在不能跨域問題，所以如果需要跨域認證的話，使用 `Token` 類的認證機制 [^1] 是比較好的做法。
  :::
- path `as string`： 可以訪問該 `cookie` 的路徑。
  ::: details
    頁面只能獲取它屬於的 Path 的 `cookie` 。<br />
    例如 `/article/a.html` 不能獲取到路徑為 `/product/abc/` 的 `cookie` 。

    - `path(路徑)` 與 `domain(域)`一起構成 `cookie` 的使用範圍。
    - 設定為 `/` 時允許所有路徑使用 `cookie` 。
    - `path`屬性需要使用符號 `/` 結尾。
  :::

- comment `as string`： 該 `cookie` 的用處説明。瀏覽器顯示 `cookie` 資訊的時候顯示該説明。
- version `as int`：該 `cookie` 使用的版本號。<br />
  0：表示遵循 Netscape 的 `cookie` 規範<br />
  1：表示遵循 W3C 的 RFC 2109 規範

::: warning
  - 修改、刪除 `cookie` 時，新的 `cookie` 除 value、MaxAge 之外的所有屬性(ex:name、path、domain)，都要與原來的 `cookie` 完全一樣，<br />
  否則瀏覽器會視為兩個不同的 `cookie` 不予覆蓋。導致修改、刪除失敗。

  - domian、path、expires、secure 都是`Server`給瀏覽器的指示，<br />
  指定何時應該發送 `cookie` 。這些參數不會夾帶進給 `Server` 的請求中，只有 name=value 會被夾帶‧

  - 從 `Client` 讀取 `cookie` 時，包括 `Max-Age` 在內的其他屬性都是不可讀的，也不會被提交。<br />
  瀏覽器提交 `cookie` 時只會提交 `name` 與 `value` 屬性。`Max-Age` 屬性只被瀏覽器用來判斷 `cookie` 是否過期。

  - 登入人員資料靈活性問題。
:::

### 3. server 端設定 cookie 方式(php 為例)
``` php
  <?php
  $cookie_name = "time";
  $cookie_value = "20240828";
  $cookie_expire =  time() + (10 * 365 * 24 * 60 * 60);
  $cookie_domain = ".opshell.com";
  $cookie_path = "/";
  $cookie_secure = true;
  $cookie_httponly = true;


  setcookie($cookie_name, $cookie_value, [
    'expires' => $cookie_expire,
    'paht' => $cookie_path,
    'domain' => $cookie_domain,
    'secure' => $cookie_secure,
    'httponly' => $cookie_httponly,
    'samesite' => 'Strict'
  ]);
  ?>
```

## 小結：
`session`和`cookie`是常用的會話跟蹤技術。<br />
`session`和`cookie`結合就可以成為`session-cookie(認證機制)`，用來認證使用者資訊。<br />
`cookie` 不能跨域，容易被盜取，有 `XSS(惡意程式碼注入)`、`CSRF(跨站請求偽造)` 攻擊的風險。

[^1]: [XSS](https://zh.wikipedia.org/zh-tw/%E8%B7%A8%E7%B6%B2%E7%AB%99%E6%8C%87%E4%BB%A4%E7%A2%BC)
[^2]: [CSRF](https://zh.wikipedia.org/zh-tw/%E8%B7%A8%E7%AB%99%E8%AF%B7%E6%B1%82%E4%BC%AA%E9%80%A0)
