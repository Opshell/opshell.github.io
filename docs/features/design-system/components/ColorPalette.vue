<script setup lang="ts">
    import ColorSeries from './ColorSeries.vue';
</script>

<template>
    <div class="color-palette__container">
        <section class="section">
            <h3 class="title">Brand Colors</h3>
            <ColorSeries category="brand" />
        </section>

        <section class="section">
            <h3 class="title">Spectrum（稜鏡）</h3>
            <p class="note">
                Opshell 的 P 是穿過三稜鏡的那道光。品牌的琥珀→紫漸層攤開成六個色，每個分類拿一個：
                首頁稜鏡的光、時間軸的圓點、文章標題下那一小段都是同一個顏色。
                光譜色只畫線、點、光線，不當小字的顏色（琥珀對白底不到 2 : 1）。
            </p>
            <div class="spectrum-bar" aria-hidden="true" />
            <ColorSeries category="spectrum" />
        </section>

        <section class="section">
            <h3 class="title">Night Sky（深色模式）</h3>
            <p class="note">深色模式的底色帶一點紫，像 O 裡面那片夜空。淺色模式的品牌橘加深一階，當字才有 4.6 : 1。</p>
            <ColorSeries category="night" />
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
    // 以前這些寫在 .color-palette 底下，但頁面上的 class 是 .color-palette__container，所以一直沒套到
    .color-palette__container {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;

        .note {
            max-width: 46rem;
            margin: 0 0 1rem;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            line-height: 1.8;
        }
        .spectrum-bar {
            background: var(--pr-spectrum);
            height: 6px;
            border-radius: 3px;
            margin-bottom: 1.25rem;
        }
        .section {
            + .section {
                padding-top: 2rem;
                border-top: 1px solid var(--vp-c-divider);
            }
        }
    }
</style>
