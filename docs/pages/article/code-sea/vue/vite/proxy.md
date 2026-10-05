---
title: Vite Proxy 串接有 SSL 的 api
author: Opshell
createdAt: '2024-10-24'
categories:
  - vue
tags:
  - vite
  - proxy
  - api
  - SSL
editLink: true
isPublished: false
refer: >-
  https://stackoverflow.com/questions/74033733/vite-self-signed-certificate-error-when-calling-local-api
image: ''
description: '開發時用 Vite proxy 打測試機的 https API，卻噴 self-signed certificate？問題不在你本機有沒有 https，而是 proxy 要不要相信對方的憑證。記錄一次繞遠路的除錯過程和正確設定。'
keywords: ''
---
::: warning 草稿
Claude 於 2026-10-05 補完：補上脈絡、懶人包與結論，把原本的除錯過程收進技術拆解，並修正 `secure: false` 應該放在 proxy 規則裡、mkcert 產生 pem 的指令。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
常見的情況是：後端的測試機掛了 https，但用的是自簽憑證（self-signed certificate），瀏覽器打開會跳「不安全」那種。前端開發時用 `Vite` 的 `server.proxy` 把 `/api` 轉過去，結果每支 API 都失敗。

這篇記錄一次「英文爛所以繞了遠路」的除錯過程，寫給在 `Vite` 開發環境串 https 測試機的人。結論先講：要改的是 proxy，不是你自己的本機。
:::

## 懶人包
- `self-signed certificate`（`DEPTH_ZERO_SELF_SIGNED_CERT`）是 -|Vite 的 proxy（Node.js）不相信目標伺服器的憑證|-，跟你本機有沒有 https 無關。
- 解法是在那條 proxy 規則裡加 `secure: false`，而且要放在 `proxy['/api']` 裡面，不是 `server` 底下。
- 用 `mkcert` 幫本機開 https 是另一件事，只有在你自己需要 https（例如 Cookie 的 `Secure`、某些瀏覽器 API）時才需要。
- 除錯時在 proxy 加 `configure`，把送出、收回、錯誤都印出來，一眼就知道請求被轉去哪。
- `secure: false` 只能用在開發環境，正式環境請讓後端換上正式憑證。

## 技術拆解

### 錯誤長這樣：`Error: self-signed certificate`
今天開發新專案在串接 api 的時候遇到了這個問題：

```sh
Sending Request: GET https://ooo.0.0.xxx/api/ /api/counties
Error Occurred: Error: self-signed certificate
    at TLSSocket.onConnectSecure (node:_tls_wrap:1674:34)
    at TLSSocket.emit (node:events:518:28)
    at TLSSocket._finishInit (node:_tls_wrap:1085:8)
    at ssl.onhandshakedone (node:_tls_wrap:871:12) {
  code: 'DEPTH_ZERO_SELF_SIGNED_CERT'
}
上午9:46:43 [vite] http proxy error: /counties
Error: self-signed certificate
    at TLSSocket.onConnectSecure (node:_tls_wrap:1674:34)
    at TLSSocket.emit (node:events:518:28)
    at TLSSocket._finishInit (node:_tls_wrap:1085:8)
    at ssl.onhandshakedone (node:_tls_wrap:871:12)
```

關鍵字是 `TLSSocket.onConnectSecure`：這是 `Node.js` 在跟目標伺服器做 TLS 握手時失敗的。`Vite` 的 proxy 是在 Node 裡面跑的（底層是 `http-proxy`），它去連 `https://ooo.0.0.xxx` 時，發現對方的憑證不是公開的 CA 簽的，就拒絕連線。瀏覽器那邊根本還沒參與。

### 本來的設定

```ts
export default defineConfig((env) => {
    return {
        // 代理伺服器
        server: {
            host: true, // [!]預設是掛載 localhost，設定為 true 可以允許外部連接 (Vite 才能連 Docker Container 的 port)
            port: 8080,
            strictPort: false, // Port被占用時直接退出， false會嘗試連接下一個可用Port
            open: true, // dev時自動打開網頁，也可以給網址指定。
            proxy: { // 自訂代理規則，配合後端進行Api呼叫等。
                '/api': {
                    target: 'https://ooo.0.0.xxx/api/', // 測試機串接
                    ws: true, // 代理的WebSockets
                    changeOrigin: true, // 是否改變原始請求的 Host 頭，用來允許websockets跨域
                    rewrite: path => path.replace(/^\/api/, '')
                }
            }
        }
    };
});
```

### 繞遠路：安裝本地（localhost）SSL
看到錯誤後以為是代理這邊也要帶證書才可以（英文爛的缺點），所以透過 `mkcert-v1.4.4-windows-amd64.exe` 來安裝 SSL：

1. 下載 [Releases](https://github.com/FiloSottile/mkcert/releases)。
2. 把檔案放在專案根目錄下。（放哪裡其實無所謂，只是 Opshell 習慣在專案環境下用 VSCode 下 `cmd`）
3. 在 `cmd` 輸入以下指令安裝證書：
    ```sh
    .\mkcert-v1.4.4-windows-amd64.exe -install
    ```
4. 安裝完可以在 `C:\User\{用戶名}\AppData\Local\mkcert` 目錄下生成兩個檔案：
    - rootCA.pem
    - rootCA-key.pem
    ::: tip
    `AppData` 目錄預設是隱藏的，請記得設定顯示隱藏檔案或資料夾
    :::

5. 在 `mkcert-v1.4.4-windows-amd64.exe` 目錄下繼續 `cmd` 輸入以下命令，為 localhost 產生證書：
    ```sh
    .\mkcert-v1.4.4-windows-amd64.exe localhost 127.0.0.1 ::1
    ```
    應該會生成兩個檔案：
    - localhost+2-key.pem
    - localhost+2.pem

    把他們放到專案目錄下的 `certs` 目錄下（一般不會有，請自己新增），並記得把 `certs/` 加進 `.gitignore`。
    ::: tip 指令小修正
    原本筆記寫的是 `-pkcs12 192.168.1.1`，但 `-pkcs12` 產生的是一個 `.p12` 檔，不是兩個 `.pem`；`localhost+2` 這個檔名代表「localhost 再加兩個名稱」，對應的就是上面這行指令。如果要讓區網其他裝置連，再把你的區網 IP 加在後面。
    :::

6. 最後在 `server` 開啟 `https`：
    ```ts
    import fs from 'node:fs';

    server: {
        https: { // [!code ++]
            key: fs.readFileSync('./certs/localhost+2-key.pem'), // [!code ++]
            cert: fs.readFileSync('./certs/localhost+2.pem') // [!code ++]
        }, // [!code ++]
        host: true,
        port: 8080,
        strictPort: false,
        open: true,
        proxy: {
            '/api': {
                target: 'https://ooo.0.0.xxx/api/',
                ws: true,
                changeOrigin: true,
                rewrite: path => path.replace(/^\/api/, '')
            }
        }
    }
    ```

7. 啟動後的確可以使用 https 了，但是錯誤還是在阿~~~

當然還在，因為這一步改的是「瀏覽器 → Vite」這一段，出錯的是「Vite → 測試機」那一段。~~（白裝了一個 CA，但至少以後用得到。）~~

### 正解：proxy 的 `secure: false`
原來，如果要對接的目標是 `https` 而且是自簽憑證，在 `proxy` 的規則裡要記得加 `secure: false`，告訴 proxy 不要驗證對方的憑證：

```ts
server: {
    https: {
        key: fs.readFileSync('./certs/localhost+2-key.pem'),
        cert: fs.readFileSync('./certs/localhost+2.pem')
    },
    host: true, // [!]預設是掛載 localhost，設定為 true 可以允許外部連接 (Vite 才能連 Docker Container 的 port)
    port: 8080,
    strictPort: false, // Port被占用時直接退出， false會嘗試連接下一個可用Port
    open: true, // dev時自動打開網頁，也可以給網址指定。
    proxy: { // 自訂代理規則，配合後端進行Api呼叫等。
        '/api': {
            target: 'https://ooo.0.0.xxx/api/', // 測試機串接
            secure: false, // [!code ++] 不驗證目標的 SSL 憑證（自簽憑證用）
            ws: true, // 代理的WebSockets
            changeOrigin: true, // 是否改變原始請求的 Host 頭，用來允許websockets跨域
            rewrite: path => path.replace(/^\/api/, '')
        }
    }
}
```

::: warning 位置很重要
原本筆記裡 `secure: false` 寫在 `server` 底下，但 `server` 沒有這個選項，`Vite` 會直接忽略它。它是 `http-proxy` 的選項，要放在每一條 proxy 規則裡（`proxy['/api']`）才會生效。
:::

其他選項可以在 [node-http-proxy 的 options](https://github.com/http-party/node-http-proxy#options) 查看。

### proxy 除錯：把請求印出來
也可以在 `proxy` 中加上 `configure`，觀看發送與收回的資料及錯誤，上面那段錯誤訊息就是這樣印出來的：

```ts
proxy: { // 自訂代理規則，配合後端進行Api呼叫等。
    '/api': {
        target: 'https://ooo.0.0.xxx/api/', // 測試機串接
        secure: false,
        ws: true, // 代理的WebSockets
        changeOrigin: true, // 是否改變原始請求的 Host 頭，用來允許websockets跨域
        rewrite: path => path.replace(/^\/api/, ''),
        configure: (proxy, options) => { // [!code ++]
            const { target } = options; // [!code ++]

            proxy.on('proxyReq', (proxyReq, req, _res) => { // [!code ++]
                console.log('Sending Request:', req.method, `${target?.toString()} ${proxyReq.path}`); // [!code ++]
            }); // [!code ++]

            proxy.on('proxyRes', (_proxyRes, req, _res) => { // [!code ++]
                console.log('Receiving Response:', req.method, `${target?.toString()} ${req.url}`); // [!code ++]
            }); // [!code ++]

            proxy.on('error', (err, _req, _res) => { // [!code ++]
                console.log('Error Occurred:', err); // [!code ++]
            }); // [!code ++]
        }
    }
}
```

順便一提，印出來的 `GET https://ooo.0.0.xxx/api/ /api/counties` 也透露了一件事：`rewrite` 把 `/api` 拿掉了，但 `target` 本身又帶了 `/api/`，實際打出去的路徑要跟後端確認一下是不是你要的那個，不然解決了憑證問題，下一個等你的就是 404。

## 例子與對比

| 做法 | 改的是哪一段 | 解決這個錯誤？ | 備註 |
|---|---|---|---|
| `mkcert` + `server.https` | 瀏覽器 → Vite | 不會 | 本機需要 https 時才用 |
| `proxy['/api'].secure: false` | Vite → 測試機 | 會 | 只限開發環境 |
| `NODE_TLS_REJECT_UNAUTHORIZED=0` | 整個 Node 行程 | 會 | 影響範圍太大，不推薦 |
| 後端換正式憑證（例如 Let's Encrypt） | 從根本 | 會 | 最乾淨，但不是前端說了算 |

如果只是想讓本機開 https、又懶得裝 `mkcert`，也可以用官方的 `@vitejs/plugin-basic-ssl` 產生一張臨時憑證，瀏覽器會跳警告，按繼續就好。細節以官方文件為準。

## 結論
這次的教訓很簡單：錯誤訊息要看清楚是誰在抱怨。`TLSSocket` 是 Node 在抱怨「對面那台的憑證我不認識」，不是瀏覽器在抱怨你沒有 https。在 proxy 規則裡加一行 `secure: false` 就收工，前面裝憑證那一大段，就當作幫未來的自己先鋪好路了。

英文爛不可怕，可怕的是英文爛還不看 stack trace。
