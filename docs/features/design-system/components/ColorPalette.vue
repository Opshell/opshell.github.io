<script setup lang="ts">
    import ColorSeries from './ColorSeries.vue';
</script>

<template>
    <div class="color-palette__container">
        <section class="section">
            <h3 class="title">紙</h3>
            <p class="note">部落格與後台的底：方格紙白（偏冷，不是米黃）、夜間是深藍灰。結構靠留白與紙上的線，不用卡片與陰影。</p>
            <ColorSeries category="paper" />
        </section>

        <section class="section">
            <h3 class="title">墨與筆</h3>
            <p class="note">
                文字一律用墨色三階；連結是藍墨水；紅筆只寫警告；螢光筆黃只畫在重點（粗體）與「目前位置」上，不拿來當按鈕底色。
                括號裡是對紙的對比度（淺色／深色），都在 4.5 : 1 以上。
            </p>
            <ColorSeries category="ink" />
        </section>

        <section class="section">
            <h3 class="title">舊色票</h3>
            <p class="note">2026-10 翻新以前的 token。叮咚的宣傳頁、演示頁、隱私權政策、刪除頁沒有翻新，還在用這一組；新的東西請用上面的 --nb-*。</p>
        </section>

        <section class="section">
            <h3 class="title">Brand Colors</h3>
            <ColorSeries category="brand" />
        </section>

        <section class="section">
            <h3 class="title">Gray Colors</h3>
            <ColorSeries category="gray" />
        </section>

        <section class="section">
            <h3 class="title">Status Colors</h3>
            <ColorSeries category="functional" />
        </section>

        <section class="section">
            <h3 class="title">Community Colors</h3>
            <ColorSeries category="community" />
        </section>

        <section class="section">
            <h3 class="title">Article Tag Colors</h3>
            <ColorSeries category="mdtag" />
        </section>
    </div>
</template>

<style lang="scss">
    .color-palette {
        &__container {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }

        .note {
            max-width: 46em;
            margin: .5rem 0 0;
            color: var(--nb-ink-3, var(--vp-c-text-2));
            font-size: var(--nb-step--1, .875rem);
            line-height: 1.7;
        }
        .section {
            + .section {
                padding-top: 2rem;
                border-top: 1px solid var(--color-gray-200);
            }
        }
    }
</style>
