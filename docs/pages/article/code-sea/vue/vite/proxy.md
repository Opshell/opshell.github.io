---
title:  'Vite Proxy 串接有 SSL 的 api'
author: 'Opshell'
createdAt: '2024/10/24'
categories: 'vue'
tags:
  - vite
  - proxy
  - api
  - SSL
editLink: true
isPublished: true
refer: https://stackoverflow.com/questions/74033733/vite-self-signed-certificate-error-when-calling-local-api
---

## api 串接錯誤 `Error Occurred: Error: self-signed certificate`
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

## 本來設定
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

## 安裝本地(localhost) SSL
看到錯誤後以為是代理這邊也要帶證書才可以(英文爛的缺點)，所以透過 `mkcert-v1.4.4-windows-amd64.exe` 來安裝SSL：

1. 下載 [Releases](https://github.com/FiloSottile/mkcert/releases) 。
2. 把檔案放在專案根目錄下。(放哪裡其實無所謂，只是 Opshell 習慣在專案環境下用 VSCode 下 `cmd`)
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

5. 在 `mkcert-v1.4.4-windows-amd64.exe` 目錄下繼續 `cmd` 輸入以下命令：
    ```sh
    .\mkcert-v1.4.4-windows-amd64.exe -pkcs12 192.168.1.1
    ```
    來為localhost 安裝證書。
    應該會生成兩個檔案：
    - localhost+2-key.pem
    - localhost+2.pem

    把他們放到 專案目錄下的 `certs` 目錄下(一般不會有，請自己新增)

6. 最後在 `server.proxy` 開啟 `https`
```ts
server: {
    https: { // [!code ++]
        key: fs.readFileSync('./certs/localhost+2-key.pem'), // [!code ++]
        cert: fs.readFileSync('./certs/localhost+2.pem') // [!code ++]
    }, // [!code ++]
    host: true,
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
```

7. 啟動後的確可以使用 https 了，但是錯誤還是在阿~~~

## server.proxy 設定：
原來，如果要對接的目標有 `https` 的話，在 `proxy` 中 要記得添加 `secure: false`，像這樣：
```ts
server: {
    https: {
        key: fs.readFileSync('./certs/localhost+2-key.pem'),
        cert: fs.readFileSync('./certs/localhost+2.pem')
    },
    host: true, // [!]預設是掛載 localhost，設定為 true 可以允許外部連接 (Vite 才能連 Docker Container 的 port)
    port: 8080,
    secure: false, // [!code ++]
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
```
其他選項可在 https://github.com/http-party/node-http-proxy#options 中查看

## proxy DeBug
也可以在 `proxy` 中添加 `configure` ，觀看發送與收回的資料及錯誤：
```ts
proxy: { // 自訂代理規則，配合後端進行Api呼叫等。
    '/api': {
        target: 'https://ooo.0.0.xxx/api/', // 測試機串接
        ws: true, // 代理的WebSockets
        changeOrigin: true, // 是否改變原始請求的 Host 頭，用來允許websockets跨域
        rewrite: path => path.replace(/^\/api/, ''),
        configure: (proxy, options) => { // [!code ++]
            const { target } = options; // [!code ++]

            proxy.on('proxyReq', (proxyReq, req, _res) => { // [!code ++]
                console.log('Sending Request:', req.method, `${target.toString()} ${proxyReq.path}`); // [!code ++]
            }); // [!code ++]

            proxy.on('proxyRes', (_proxyRes, req, _res) => { // [!code ++]
                console.log('Receiving Response:', req.method, `${target.toString()} ${req.url}`); // [!code ++]
            }); // [!code ++]

            proxy.on('error', (err, _req, _res) => { // [!code ++]
                console.log('Error Occurred:', err); // [!code ++]
            }); // [!code ++]
        }
    }
}

```
