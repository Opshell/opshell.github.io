---
name: web-code-style
description: 這個網站的 Vue／TypeScript／SCSS 寫法——4 空格與 .vue 內多縮一層、單引號分號無尾逗號、iProps 前綴、區塊__元素 加 is-狀態 的 class、不用 scoped 而用頂層 class 包、CSS 屬性順序、setFlex／setRWD mixin、註解寫為什麼。寫或改任何 .vue、.ts、.scss 時用。
---

# 這個網站的程式風格

規則來源：`eslint.config.js`（antfu 9.x，ESLint 10）、`.stylelintrc.mjs`（standard-scss 17 + order）、既有程式。
改完跑 `pnpm check`（lint → stylelint → typecheck → build），三個工具都要乾淨。跟 antfu 預設刻意相反、已在設定裡關掉的：單行 `if`、頂層 `const` 箭頭函式、`<td>{{ x }}</td>` 這種單行元素、事件名 kebab-case。

## TypeScript

- 4 空格、單引號、**每句結尾分號**、**沒有尾逗號**（陣列、物件、參數的最後一項後面不加逗號）。
- `if` 單行不加大括號，多行才加：`if (!token) throw new AdminApiError(401, '請先登入');`。
  大括號 `1tbs`，`} else {` 同一行。單行最多兩個語句。
- interface 用 `i` 前綴：`iProps`、`iPoint`、`iReward`、`iSiteData`。API 回應的型別（`AdminDevice`、`Perk`）沒有前綴，那是照 `api.md` 的物件名稱。
- import 順序：`import type` 最前面，再套件（`vue`、`vitepress`），再自己的（`../api`、`../constants`）。同一組內按字母。
- `console.log` 是 warning；正式程式不留。
- 不用 `any` 逃避型別；真的要接第三方鬆散型別時（markdown-it、three）用 `as any` 並註明原因。
- 常數全大寫：`MAX_MONTHS`、`PRODUCTION_API`、`CONTACT_EMAIL`。資料陣列 camelCase：`invoicePains`、`betaRewards`。
- hook 檔名 `useXxx.ts`，放 feature 的 `hooks/` 或 feature 根目錄；回傳函式或物件，不回傳元件。
- 模組層級的 `ref` 當單例狀態是可以的（`useGoogleAuth.ts`：同一個分頁共用一份 token），要在檔頭註解說明。

## Vue 元件

```vue
<script setup lang="ts">
    import type { PromoCode } from '../api';
    import { computed, onMounted, ref } from 'vue';
    import { adminApi } from '../api';

    // 這個元件在做什麼、為什麼這樣設計（一兩句，中文）
    interface iProps {
        title?: string
        size?: number
    }
    withDefaults(defineProps<iProps>(), { title: '', size: 24 });

    const loading = ref(false);
    const error = ref('');
    const rootRef = ref<HTMLElement>();

    async function load() {
        loading.value = true;
        error.value = '';
        try {
            items.value = await call(token => adminApi.list(token));
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            loading.value = false;
        }
    }
</script>

<template>
    <section ref="rootRef" class="dd-promo">
        <div class="dd-promo__bar">
            <span :class="['dd-promo__state', state.kind]">{{ state.label }}</span>
        </div>
    </section>
</template>

<style lang="scss">
    .dd-promo {
        @include setFlex(flex-start, stretch, 16px, column);

        &__bar {
            @include setFlex(space-between, center, 12px);
            flex-wrap: wrap;
        }
        &__state.is-active { color: var(--vp-c-green-1); }
    }
</style>
```

- `<script setup lang="ts">`，內容**再縮一層**（`vue/script-indent` baseIndent 1）；`<style>` 內容同樣多縮一層。`<template>` 也是。
- props 用 `withDefaults(defineProps<iProps>(), {...})`；Vue 3.5 可以直接給 `[]`，不用 `() => []`。
- 標籤：void 與元件一律自閉合 `<img />`、`<DinDonBell />`；多行標籤的 `>` 換到下一行；運算子斷行放行首（`&&` 在下一行開頭）。
- 讀取狀態的模式固定是 `loading`／`error`／`notice` 三個 `ref` 加 `try / catch / finally`。錯誤訊息是給人看的中文。
- 送出前先在前端驗一遍（`formError` computed），訊息比後端那句好懂，但後端才是真正的把關。
- template ref：`const rootRef = ref<HTMLElement>()` 配 `ref="rootRef"`。
- 大段落用 `<!-- #region [P] 標題 -->` … `<!-- #endregion -->` 包，script 與 scss 裡是 `// #region [P] 標題`。
- 只在瀏覽器能跑的（`window`、`IntersectionObserver`、Google 登入、three.js）放 `onMounted` 之後；元件本身不能保證的話，外面包 `<ClientOnly>`。

## class 命名

- 一個元件一個頂層 class，叮咚的元件用 `dd-` 或 `dindon-` 前綴：`dindon-landing`、`dd-promo`、`dindon-privacy`。
- 子元素 `頂層__元素`：`dindon-landing__hero`、`dd-promo__form`。再往下的小東西可以用單字 class（`.icon`、`.name`）但要包在父層的 SCSS 裡。
- 狀態 `is-xxx`：`is-primary`、`is-active`、`is-frozen`、`is-visible`、`is-motion`。變體 `is-a`／`is-b`。
- 資料屬性驅動的行為用 `data-xxx`：`data-reveal`、`data-parallax=".35"`。

## SCSS

- `<style lang="scss">` **不加 `scoped`**，靠頂層 class 包住整段。要蓋 VitePress 的樣式時也在頂層 class 底下寫 `.vp-doc strong {…}`。
- `mixin.scss` 已經全域 `@use … as *`，元件裡直接 `@include setFlex(...)`、`@include setRWD(500px) {…}`、`@include setSize(w, h)`，不用再 `@use`。
  `useBreakPoint('sm')` 也能用（檔頭已經有 `@use 'sass:map'`）。
- 顏色與字級用 CSS 變數，不寫死：
  - 跟著深淺色走的用 VitePress 的 `--vp-c-bg`、`--vp-c-text-2`、`--vp-c-divider`、`--vp-c-green-soft`、`--vp-font-family-mono`。
  - 站台自己的 token 在 `theme/scss/_variable.scss`：`--color-primary-1`、`--color-gray-700`、`--font-size-s`、`--cubic-FiSo`。
  - 元件自己的一組放在頂層 class 上：`.dindon-landing { --dd-bg: …; --dd-radius: 20px; }`，
    深色模式在檔案最後用 `.dark .dindon-landing { --dd-bg: …; }` 覆蓋同一組變數（既有寫法；巢狀的 `.dark & {}` 編譯結果一樣）。
- 屬性順序照 `.stylelintrc.mjs` 的 `order/properties-order`：`content` → 定位（`position`、`inset`、`z-index`）→ `display`／flex／grid／`gap`／對齊 →
  `background` → `width`／`height` → `padding` → `border`／`border-radius` → `margin` → 文字（`color`、`font-*`、`line-height`、`text-*`）→ `transition`／`transform`／`opacity`。
  自訂屬性（`--xxx`）永遠在該區塊的最前面。
- 顏色函式用現代寫法 `rgb(0 0 0 / 15%)`，不用 `rgba()`。
- 巢狀不超過三層；`&__元素` 與 `&.is-狀態` 用 `&` 接。
- 動畫：只有位移、透明度、淡淡的陰影。曲線用變數（`var(--dd-ease-out)`、`$cubic-SiRo`）。
  要尊重 `prefers-reduced-motion`：動畫只在 `.is-motion` 這種由 JS 加上的 class 底下生效，沒有 JS 或使用者關閉動態時內容照常顯示。
- 不要用 `overflow: hidden` 擋進場動畫的溢出，用 `overflow-x: clip`（hidden 會變成捲動容器）。

## 註解

- 中文，寫「為什麼」不寫「做什麼」：`// 量父元素而不是自己：自己被位移後再量，會形成回授而抖動`。
- 對應外部規格時註明出處：`// api.md 第 8 節`、`// 溝通板 #38`。
- 既有程式的標記慣例：`[-]` 說明一段在做什麼、`[+]` 之後要處理、`[#]` 未來可以改進、`[!]` 注意事項、`[P]` region 標題。
- JSDoc 的第一行可以直接接在 `/**` 後面（`jsdoc/multiline-blocks` 關了）。

## 檔名

- **`.vue` 一律 PascalCase**（2026-09-22 統一）：`DinDonLanding.vue`、`PostCard.vue`、`SvgHudPanel.vue`、`shared/components/el/Btn.vue`。
  `el/` 底下自動註冊成 `<ElBtn>`，跟檔名的大小寫無關，改檔名不用改模板。
- hook `useXxx.ts`、資料 `xxx.data.ts`、常數 `constants.ts`、API `api.ts`、格式化 `format.ts`。
