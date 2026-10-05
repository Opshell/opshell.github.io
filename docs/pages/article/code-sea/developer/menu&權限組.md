---
title: '後台的選單與權限：樹狀還是平面？誰來組？'
image: ''
description: '後端該給樹狀還是平面的選單？權限表要不要存？改了權限怎麼生效？從一段群組討論整理出後台權限的設計：以權限表為唯一來源長出路由與選單，最後接上 refresh token。'
keywords: ''
author: Opshell
createdAt: '2024-09-09'
categories:
  - Developer
tags:
  - 權限
  - 後台
  - Vue Router
  - refresh token
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：把原本的群組對話紀錄改寫成文章（拿掉對話者名字，論點全部保留），補上權限表、組樹、麵包屑、動態路由與 refresh token 的範例程式碼。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
前端會遇到的問題，大概可以分成這幾類：底層問題、資料交換問題、打包問題、框架使用問題、GC 相關問題、效能優化問題，以及人與人協作問題。
後台的「選單＋權限」很有趣，它一口氣踩中了資料交換、效能和人與人協作三類。

這篇來自前端群組裡的一段討論：起因是有位後端大大要下來自己刻後台選單，問「後端吐動態 menu 給前端，要給樹狀還是平面？」結果一路聊到麵包屑、路由、快取、重登和 refresh token。
我把討論整理成文章，寫給要設計後台權限的前端，也寫給要下來寫前端的後端。
:::

## 懶人包
- **權限表是唯一的事實來源**：路由和選單都依它渲染，沒拿到權限表之前，前端只有 login 這一條路由。
- **樹狀還是平面，真正的問題是「誰負責整理層級」**：後端組樹、排序通常比前端容易；大型、要賣給客戶的 SaaS 後台，建議後端直接給樹。
- **平面加 `parent_id` 前端自己組也可以**，自用的小系統前後端講好就好，但顯示邏輯容易散落各處。
- **選單不是隨時會變的資料**：存起來，不用每次重新整理都打一次；權限變了，就讓那個帳號強制重登。
- **想讓客服、營運長時間不用重登**，就要開始設計 refresh token。

## 觀點拆解

### 先分清楚：選單、路由、權限是三件事

討論一開始大家常把它們混在一起，其實要先拆開：

- **權限表**：這個身分能做什麼。後端依登入者的 role 算出來。
- **路由**：前端有哪些頁面可以進。
- **選單**：畫面上那排可以點的東西。

選單的結構**不一定**跟權限表一樣。有時候要做伸縮、特效，需要節點；有的 PM 明知道 B 是 A 的後代，還是會把它設計在選單的同一層給客戶用。所以「選單長什麼樣」是 UI 的事，「能不能進」是權限的事。

權限本身也不只一種，系統越肥，種類越多：

| 種類 | 管什麼 | 例子 |
|---|---|---|
| 進入權限 | 能不能進這一頁 | 能不能看到「代理商列表」 |
| 功能權限 | 頁面上能做哪些操作 | 代理商可以 CRUD 嗎？可以看月、週、日報表嗎？ |
| 閱讀權限 | 能看到哪些資料 | 某些報表只有股東身分才能看 |

### 樹狀 vs 平面：兩邊都有道理

| | 後端給樹狀 | 後端給平面，前端自己組 |
|---|---|---|
| 誰處理層級 | 後端（直接遞迴查詢組好） | 前端（用 `parent_id` 兜回去） |
| 麵包屑 | 樹本身就有節點，往上找就有 | 拿 `parent_id` 去 map，一層層兜出父層 |
| 前端知道多少 | 只拿到「這個人能看的」那一份 | 拿到清單，自己決定怎麼長 |
| 適合 | 大型專案、SaaS | 自用、小型系統 |

偏好平面的理由很實在：一次 API 全部丟給前端，要不要組成樹是前端的事；而且「找不到爸爸的節點後端本來就不會給」。
偏好樹狀的理由也很實在：如果編輯畫面的結構是 `dashboard >> vendor list >> monthly >> edit`，資料全部在同一層，誰是誰的後代？最後還是得做一次轉換。權限管理的資料處理，說穿了就是在做 DFS 查詢。

我的做法是偏向**權限表為基礎、拿樹狀**的那一派。不過我身邊做後端的朋友比較偏向平面，這很正常：從後端的角度看，比較體驗不到前端的思考方向。
但也要老實說，**後端處理樹狀和排序，真的會比前端容易很多**。資料庫一個遞迴查詢就組好了，前端拿到的已經是整理過的結果。

說到底，這跟誰比較資深沒什麼關係，就是**誰要去處理那張表的層級**，前後端要先講好。前端來做的話，就變成 login 後拿到權限總表，得先生好所有層級，才能讓路由 `next()`。

### 權限表為基礎：路由和選單一起長出來

如果前端「已經有全部路由」，只用權限去 `v-if` 擋，會變成每個畫面都要問「這個身分能不能操作現在的 UI」，顯示邏輯散落在不同地方，很難集中管理。而且一旦要把某個畫面跟某個權限的綁定拿掉，就得改前端程式。

比較乾淨的做法是反過來：**前端的路由一開始只有 login**，登入拿到權限表之後，路由和選單都照那張表渲染。沒有的路由就是無法訪問，因為沒有權限。
頁面裡的元件需要知道「能不能編輯、能不能刪」，就由 props 把權限依賴注入進去，而不是元件自己到處去查。

這樣做還有一個 SaaS 才在意的好處：客戶拿不到完整的路由清單，比較難反向工程把你的系統邏輯摸清楚、再找人複刻一個。

### 前端擋的是體驗，後端擋的是安全

討論中有人問了一個好問題：「如果沒驗證身分，直接打這支 API 能取到資料嗎？」

答案是：**後端一定要擋**，依登入身分在 role 表裡是哪一組來判斷。前端路由也要先擋，但那是為了體驗，不是為了安全。
權限表存在瀏覽器裡，使用者打開 DevTools 就改得到；前端照它長畫面沒問題，真正的把關永遠在後端。

### 權限表要存哪？重新整理要不要重打？

放 Pinia 的 store，重新整理就不見了。每次重新整理就重打一次權限表或 menu 的 API，專案不大沒關係；系統大了，每次都打就是浪費資源，還會吃掉 Redis 的存取，資源應該留給真正需要高頻請求的地方。

想清楚一件事：**menu 不是隨時會更新的東西**。你重新整理的頁面可能是報表或有 CRUD 的功能，那些才需要重新 fetch；選單已經生好了，就不用重戳。

所以權限表可以存起來，常見的選擇：

| 存在哪 | 生命週期 | 要注意 |
|---|---|---|
| Pinia（記憶體） | 重新整理就沒了 | 每次重整都要重打 |
| `sessionStorage` | 關掉分頁就沒了 | 「請關閉瀏覽器再試一次」這招有效 |
| `localStorage` | 一直都在 | 權限變了要有機制讓它失效 |

快取有好有壞。最常見的客訴長這樣：這一秒說登入進不去，登出再登入也不行；下一秒幫他開通了，還是不行……然後就被念了，只好說「請關閉瀏覽器」。

解法是把「權限變更」變成明確的事件：**權限管理介面一變更成功，就讓那個帳號強制重新登入**，重登時拿到新身分對應的表。快取就不會跟現實對不上。

### 選單的渲染成本

選單如果有很多 children，一定是靠 `v-for` 長出來的。父層一重新渲染，整串 `v-for` 的 vnode 都會重新產生、比對一次。幾個工具可以用：

- `v-memo`：指定的資料沒變，那一項就直接跳過。
- `<KeepAlive>`：把已經渲染好的元件保持在快取裡，切回來不用重來。
- 非同步元件：頁面用 `() => import()` 載入，沒權限的頁面連程式碼都不會下載。

如果你只負責後端，這段留給前端去想沒關係；但如果你得下來寫前端，就要考慮剛剛說的集中管理問題了。

### 不想一直重登？那就是 refresh token 的事了

權限是後台最麻煩的 top 3 之一。而且只要有客服參與後台使用，營運也會跟他們一樣，希望長期可以不用重登。

這時候「權限變了就強制重登」跟「最好永遠不用重登」就打架了。解法是把 token 拆成兩支：

- **access token**：壽命短（例如十幾分鐘），每支 API 都帶。
- **refresh token**：壽命長，只拿來換新的 access token，最好放在 `httpOnly` cookie，JavaScript 讀不到。

權限變更時，後端讓那個帳號的 refresh token 失效（或在 token 裡帶一個權限版本號）。下一次換 token 失敗，前端才請使用者重登；沒有變更的人，就一路無感續命。

## 例子與對比

### 權限表長什麼樣子

適合大型專案的權限表，裡面要有符合 role 的結構。這是後端依權限管理算好、直接給樹的版本（`title` 是為了組選單和麵包屑加的）：

```json
[
    {
        "id": "200",
        "routeName": "vendor-list",
        "title": "代理商列表",
        "permissions": ["read", "edit", "del"],
        "children": [
            {
                "id": "201",
                "routeName": "vendor-list-monthly",
                "title": "月報表",
                "permissions": ["read"]
            }
        ]
    }
]
```

```ts
type Permission = 'read' | 'edit' | 'del';

interface PermissionNode {
    id: string;
    routeName: string;
    title: string;
    permissions: Permission[];
    children?: PermissionNode[];
}
```

### 平面資料自己組樹

如果後端給的是平面加 `parent_id`，前端組樹其實不難，兩趟迴圈就好：

```ts
interface FlatPermission {
    id: string;
    parentId: string | null;
    routeName: string;
    title: string;
    permissions: Permission[];
}

function buildTree(list: FlatPermission[]): PermissionNode[] {
    const nodes = new Map<string, PermissionNode>();
    for (const item of list) {
        const { id, routeName, title, permissions } = item;
        nodes.set(id, { id, routeName, title, permissions, children: [] });
    }

    const roots: PermissionNode[] = [];
    for (const item of list) {
        const node = nodes.get(item.id);
        if (!node) continue;

        const parent = item.parentId === null ? undefined : nodes.get(item.parentId);
        if (parent) {
            (parent.children ??= []).push(node);
        } else {
            roots.push(node); // 找不到爸爸的，後端理論上不會給；這裡當成根節點，也可以選擇直接丟掉
        }
    }

    return roots;
}
```

難的不是組樹，是**排序和層級的商業規則**（誰排前面、哪些子層要攤平到同一層）。這些規則寫在後端的 SQL 裡，通常比寫在前端好維護。

### 樹狀資料組麵包屑：DFS 找路徑

「樹狀要怎麼組麵包屑？」其實就是一次深度優先搜尋，找到目標節點，沿路經過的節點就是麵包屑：

```ts
function findPath(nodes: PermissionNode[], routeName: string): PermissionNode[] {
    for (const node of nodes) {
        if (node.routeName === routeName) return [node];

        const childPath = findPath(node.children ?? [], routeName);
        if (childPath.length) return [node, ...childPath];
    }
    return [];
}

// findPath(tree, 'vendor-list-monthly').map(node => node.title)
// → ['代理商列表', '月報表']
```

### 路由跟著權限表長出來

前端只保留「`routeName` 對應哪個頁面元件」這張對照表，要不要加進路由，由權限表決定：

```ts
import type { PermissionNode } from './permission';
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

// 前端只知道「有哪些頁面」，不知道「誰能進」
const pageLoaders = new Map([
    ['vendor-list', () => import('@/pages/VendorListPage.vue')],
    ['vendor-list-monthly', () => import('@/pages/VendorMonthlyPage.vue')]
]);

export const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/login', name: 'login', component: () => import('@/pages/LoginPage.vue') },
        { path: '/', name: 'layout', component: () => import('@/layouts/AdminLayout.vue') }
    ]
});

export function addPermissionRoutes(nodes: PermissionNode[]) {
    for (const node of nodes) {
        const loader = pageLoaders.get(node.routeName);
        if (loader) {
            router.addRoute('layout', {
                path: node.routeName,
                name: node.routeName,
                component: loader,
                props: { permissions: node.permissions }, // 權限依賴由 props 注入頁面
                meta: { title: node.title }
            });
        }
        addPermissionRoutes(node.children ?? []);
    }
}

router.beforeEach(async (to) => {
    if (to.name === 'login') return true;

    const auth = useAuthStore();
    if (!auth.token) return { name: 'login', query: { redirect: to.fullPath } };

    if (!auth.isRoutesReady) {
        await auth.loadPermissions(); // 先讀 sessionStorage，沒有才打 API；拿到後呼叫 addPermissionRoutes
        return to.fullPath; // 路由剛加進來，讓 router 重新解析一次
    }

    return true;
});
```

頁面元件只看自己拿到的權限，不用去問 store：

```vue
<script setup lang="ts">
    import type { Permission } from '@/features/auth';
    import { computed } from 'vue';

    const props = defineProps<{ permissions: Permission[] }>();

    const canEdit = computed(() => props.permissions.includes('edit'));
    const canDelete = computed(() => props.permissions.includes('del'));
</script>

<template>
    <div class="vendor-list">
        <button v-if="canEdit" class="vendor-list__btn">編輯</button>
        <button v-if="canDelete" class="vendor-list__btn">刪除</button>
    </div>
</template>
```

### refresh token：同時好幾支 401，只換一次

access token 過期時，常常是好幾支 API 一起回 401。重點是**只送一次 refresh**，其他請求排隊等新的 token：

```ts
import axios, { isAxiosError } from 'axios';
import { useAuthStore } from '@/stores/auth';

declare module 'axios' {
    interface InternalAxiosRequestConfig {
        _retried?: boolean;
    }
}

export const http = axios.create({ baseURL: '/api' });

let refreshing: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
    // refresh token 放在 httpOnly cookie，用另一個 axios 實例送，避免繞回自己的攔截器
    const { data } = await axios.post<{ accessToken: string }>('/api/auth/refresh', null, { withCredentials: true });
    useAuthStore().setToken(data.accessToken);
    return data.accessToken;
}

http.interceptors.response.use(undefined, async (error: unknown) => {
    if (!isAxiosError(error) || error.response?.status !== 401 || !error.config || error.config._retried) {
        throw error;
    }

    const original = error.config;
    original._retried = true; // 換過一次還是 401，就不要無限重試

    refreshing ??= refreshAccessToken().finally(() => {
        refreshing = null;
    });

    // refresh 也失敗（例如權限變更被撤銷），錯誤會往外丟，這時才請使用者重登
    const token = await refreshing;
    original.headers.Authorization = `Bearer ${token}`;
    return http(original);
});
```

## 結論

選單與權限沒有標準答案，樹狀、平面兩派都有人用得很開心。真正要先想的是：**這個系統是自己用，還是要賣給客戶做成 SaaS？**

自用的系統，用平面資料想怎麼組都沒問題，靈活性比較高，前後端講好就好；但要注意這種程式碼很容易重複，組件的狀態管理容易耦合，要集中管理還得再拉一支 middleware。
大型、要賣的後台，我會選權限表為基礎、後端給樹、路由跟選單一起長、權限變了就重登，再用 refresh token 把「重登」的痛降到最低。

這些心得，都是有人被雷過才換來的。下次後端大大問你「menu 要給樹狀還是平面」，先別急著回答，反問他：「那層級誰要整理？」~~通常這時候會議就會再多開半小時。~~
