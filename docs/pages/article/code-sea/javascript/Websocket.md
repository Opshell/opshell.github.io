---
title: 'WebSocket：讓伺服器也能先開口'
image: ''
description: '通知、聊天室、即時報價、遊戲狀態，這些「伺服器要主動講話」的需求，靠輪詢撐不久。整理 WebSocket 的全雙工概念、原生 API、斷線重連與心跳，再跟輪詢、SSE 比一比。'
keywords: ''
author: Opshell
createdAt: '2024-09-05'
categories:
  - JavaScript
tags:
  - JavaScript
  - WebSocket
  - Vue
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本兩行筆記（使用情境、全雙工）寫成全文。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
`HTTP` 的規矩是「前端問、後端答」，後端再急也只能等你來問。但通知系統、聊天室、股市交易即時概況、遊戲資料管理，這些需求都是**後端有新東西要主動推給你**。

常見的情況是一開始先用 `setInterval` 每幾秒打一次 API 撐著，使用者一多、頻率一高，伺服器就開始喘。這篇整理 `WebSocket` 是什麼、怎麼用、上線前要補哪些東西，寫給第一次要做即時功能的前端。
:::

## 懶人包
- `WebSocket` 是**全雙工**的長連線：連上之後，前後端都可以隨時主動送資料，不用一問一答。
- 適合通知、聊天室、即時報價、多人遊戲這種「雙向、高頻、要即時」的資料。
- 原生 API 只有 `open`、`message`、`error`、`close` 四個事件跟 `send()`，**斷線重連與心跳要自己做**。
- 只需要後端單向推送的話，`SSE`（Server-Sent Events）更簡單；更新不頻繁的話，輪詢也沒有錯。

## 技術拆解

### 全雙工是什麼
用講電話比喻最快：

- **一般 HTTP**：寄信。你寄一封，對方回一封，對方不能自己先寄。
- **輪詢（polling）**：每五分鐘寄一封「有沒有新消息？」，大部分的回信都是「沒有」。
- **WebSocket**：直接打電話，接通之後兩邊想講就講，可以同時講（全雙工），直到有人掛電話。

技術上，`WebSocket` 一開始還是借 `HTTP` 打招呼：前端送一個帶 `Upgrade: websocket` 的請求，後端回 `101 Switching Protocols`，之後這條 TCP 連線就改說 `WebSocket` 協定，網址從 `http(s)://` 換成 `ws(s)://`。正式環境一律用 `wss://`，跟 `https` 一樣有加密。

### 原生 API
```ts
const socket = new WebSocket('wss://example.com/chat');

socket.addEventListener('open', () => {
    socket.send(JSON.stringify({ type: 'join', room: 'lobby' }));
});

socket.addEventListener('message', (event: MessageEvent<string>) => {
    const data = JSON.parse(event.data);
    console.log('收到', data);
});

socket.addEventListener('close', (event) => {
    console.log('連線關閉', event.code, event.reason);
});

socket.addEventListener('error', () => {
    console.error('連線出錯了');
});
```

幾個要記得的點：

- `send()` 只能在連線是 `WebSocket.OPEN` 的時候呼叫，連線還在 `CONNECTING` 就送會直接丟錯。
- 送的是字串或二進位資料，物件要自己 `JSON.stringify`，收到的也要自己 `JSON.parse`。
- `error` 事件幾乎不給你任何細節，真正的資訊在接下來的 `close` 事件的 `code` 裡。

### 原生 API 沒幫你做的事
-|WebSocket 連上之後不代表永遠連著|-。手機切到背景、換 Wi-Fi、進電梯、後端重新部署，連線都會斷，而原生 API **不會自動重連**。上線前至少要補：

1. **斷線重連**：`close` 之後隔一段時間再連，而且間隔要越拉越長（指數退避），不然後端一掛，所有使用者同時瘋狂重連，等於自己 DDoS 自己。
2. **心跳（heartbeat）**：有些代理伺服器會把太久沒動靜的連線默默掐掉，定時送個 `ping` 讓連線保持活著，也能比較早發現「其實已經斷了」。
3. **補資料**：斷線期間錯過的訊息，重連後要跟後端要回來（例如帶上最後一筆訊息的 id）。
4. **身分驗證**：瀏覽器的 `WebSocket` 不能自訂 header，常見做法是連上後第一則訊息送 token，或用 cookie；token 放網址參數容易進 log，能避就避。

## 例子與對比

### Vue 裡包成 composable
把重連跟清理包起來，元件只管拿資料：

```ts
// composables/useSocket.ts
import { onBeforeUnmount, ref } from 'vue';

export function useSocket(url: string) {
    const messages = ref<string[]>([]);
    const status = ref<'connecting' | 'open' | 'closed'>('connecting');

    let socket: WebSocket | null = null;
    let retry = 0;
    let stopped = false;

    function connect() {
        status.value = 'connecting';
        socket = new WebSocket(url);

        socket.addEventListener('open', () => {
            status.value = 'open';
            retry = 0;
        });

        socket.addEventListener('message', (event) => {
            messages.value.push(String(event.data));
        });

        socket.addEventListener('close', () => {
            status.value = 'closed';
            if (stopped) { return; }

            // 1 秒、2 秒、4 秒…最多 30 秒
            const delay = Math.min(1000 * 2 ** retry, 30000);
            retry++;
            setTimeout(connect, delay);
        });
    }

    function send(data: string) {
        if (socket?.readyState === WebSocket.OPEN) {
            socket.send(data);
        }
    }

    connect();

    onBeforeUnmount(() => {
        stopped = true;
        socket?.close();
    });

    return { messages, status, send };
}
```

```vue
<script setup lang="ts">
import { useSocket } from '@/composables/useSocket';

const { messages, status, send } = useSocket('wss://example.com/chat');
</script>

<template>
    <p>連線狀態：{{ status }}</p>
    <ul>
        <li v-for="(message, index) in messages" :key="index">{{ message }}</li>
    </ul>
    <button @click="send('hello')">打招呼</button>
</template>
```

不想自己刻的話，`VueUse` 的 `useWebSocket` 已經有自動重連與心跳的選項，參數以官方文件為準；聊天室這種需要房間、廣播、自動降級的，也可以看 `Socket.IO`（注意它前後端都要用它的套件，不是純 `WebSocket`）。

### 跟其他做法比一比

| 做法 | 方向 | 優點 | 缺點 | 適合 |
|---|---|---|---|---|
| 輪詢 | 前端問 | 最簡單，一般 API 就能做 | 大部分請求都白問，有延遲 | 幾十秒更新一次的看板 |
| 長輪詢 | 前端問，後端憋著等有資料才回 | 比輪詢即時 | 後端要撐住大量掛著的請求 | 舊系統過渡 |
| `SSE` | 後端 → 前端 | 走一般 HTTP，瀏覽器自動重連 | 只能單向 | 通知、進度條、AI 串流回應 |
| `WebSocket` | 雙向 | 即時、雙向、開銷小 | 重連、心跳、擴展要自己顧 | 聊天室、協作、多人遊戲、即時報價 |

判斷方式很簡單：**前端需不需要高頻地主動送資料？** 不需要，`SSE` 或輪詢就夠；需要，才請出 `WebSocket`。

## 結論
`WebSocket` 解決的是「後端想先開口」這件事，連線本身三行就寫完，真正的功夫在斷線之後：重連、心跳、補資料，一個都不能少。

只需要聽後端講話的時候，就別急著打電話了，`SSE` 的收音機也挺好用的。
