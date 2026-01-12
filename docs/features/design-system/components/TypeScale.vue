<script setup lang="ts">
    import { typeScales, fontFamilies } from "../constants";

    // --- 狀態控制 ---
    // 預設顯示詳細規格，點擊可切換為精簡預覽模式
    const showSpecs = ref(true);
</script>

<template>
    <article class="type-system article-layout__article">
        <section class="section">
            <header class="section-header">
                <h3 class="title">Type Scale</h3>

                <button
                    class="toggle-specs-btn"
                    :class="{ active: showSpecs }"
                    @click="showSpecs = !showSpecs"
                    title="Toggle CSS Specs"
                >
                    <span class="icon">
                        <svg v-if="showSpecs" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    </span>
                    <span class="label">{{ showSpecs ? 'Hide Specs' : 'Preview Mode' }}</span>
                </button>
            </header>

            <div class="scale-list">
                <div
                    v-for="(scale, index) in typeScales"
                    :key="index"
                    class="scale-item"
                    :class="{ 'compact-mode': !showSpecs }"
                >

                    <div class="area-title">
                        <span class="tag-badge">{{ scale.tag }}</span>
                        <span class="scale-name">{{ scale.name }}</span>
                    </div>

                    <div class="area-summary">
                        <p v-if="scale.description">{{ scale.description }}</p>
                        <span v-else class="no-desc">No description</span>
                    </div>

                    <div class="area-var">
                        <ul class="specs">
                            <li v-for="(val, key) in scale.specs" :key="key">
                                <span class="prop">{{ key }}</span>
                                <span class="val">{{ val }}</span>
                            </li>
                        </ul>
                    </div>

                    <div class="area-preview">
                        <component :is="scale.tag" v-if="scale.tag !== 'a'">
                        {{ scale.sample }}
                        </component>
                        <p v-else><a href="javascript:;">{{ scale.sample }}</a></p>
                    </div>
                </div>
            </div>
        </section>
    </article>
</template>

<style lang="scss">
    .type-system { margin: 2rem 0; }

    .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 2rem;
    }

    // --- Toggle Button ---
    .toggle-specs-btn {
        display: flex;
        gap: 8px;
        align-items: center;
        background: var(--vp-c-bg);
        padding: 6px 12px;
        border: 1px solid var(--vp-c-divider);
        border-radius: 20px;
        color: var(--vp-c-text-2);
        font-size: 0.8rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
            background: var(--vp-c-bg-soft);
            border-color: var(--vp-c-brand);
            color: var(--vp-c-brand);
        }

        &.active {
            background: var(--vp-c-brand-dimm, rgb(244, 185, 54, 10%));
            border-color: var(--vp-c-brand);
            color: var(--vp-c-brand);
        }
    }

    // --- Scale List (Grid Layout) ---
    .scale-list {
        display: flex;
        flex-direction: column;
        gap: var(--gap);
    }

    .scale-item {
        display: grid;
        grid-template:
            "title   preview" auto
            "summary preview" auto
            "var     preview" minmax(0, 1fr) /
            20rem   1fr;
        gap: 1rem;
        padding-bottom: 3rem;
        border-bottom: 1px dashed var(--vp-c-divider);
        transition: .25s var(--cubic-FiSo);
        overflow: hidden;

        .area {
            &-title {
                grid-area: title;
                display: flex;
                gap: 0.75rem;
                align-items: center;

                .tag-badge {
                    background: var(--vp-c-brand);
                    padding: 2px 8px;
                    border-radius: 4px;
                    color: white;
                    font-family: var(--font-monospace);
                    font-size: 0.75rem;
                    font-weight: bold;
                    transform: translateX(-1px);
                }
                .scale-name {
                    color: var(--vp-c-text-1);
                    font-size: 1.1rem;
                    font-weight: 700;
                }
            }
            &-summary {
                grid-area: summary;
                display: flex;
                align-items: flex-start;

                p {
                    margin: 0 !important;
                    color: var(--vp-c-text-2);
                    font-size: 0.9rem;
                    line-height: 1.5;
                }
                .no-desc {
                    color: var(--vp-c-text-3);
                    font-size: 0.8rem;
                    font-style: italic;
                }
            }
            &-var {
                grid-area: var;
                padding-top: 0.5rem; // 稍微與上方拉開一點距離

                .specs {
                    padding: 0;
                    margin: 0;
                    font-family: var(--font-monospace);
                    font-size: 0.8rem;
                    list-style: none;

                    li {
                        display: grid;
                        grid-template-columns: 100px 1fr;
                        gap: 0 4px;
                        padding: 0 !important;
                        margin-bottom: 6px;

                        .prop { color: var(--vp-c-text-3); }
                        .val { color: var(--color-gray-900); }
                    }
                }
            }
            &-preview {
                grid-area: preview;
                align-self: stretch;
                background: var(--vp-c-bg); // 模擬紙張背景
                min-width: 0; // 防止 grid 撐爆
                padding: 1.5rem;
                border: 1px solid var(--vp-c-divider);
                border-radius: 8px;
                overflow-x: auto;

                // 讓裡面的元素不帶 margin，純粹展示樣式
                > * { margin: 0 !important; }
            }
        }

        &:last-child { border-bottom: none; }

        // --- Compact Mode (隱藏參數時) ---
        &.compact-mode {
            grid-template:
                "title   preview" auto
                "summary preview" auto
                "var     preview" 0 /
                20rem   1fr;
            gap: .5rem 1rem;
            padding: .5rem 0;

            .area {
                &-preview {
                    padding: 0;
                    border: 0;
                    > * {
                        padding: 0 !important;
                        border: 0 !important;
                        margin: 0 !important;
                    }
                }
            }
        }
    }

    // --- RWD ---
    @media (width <= 768px) {
        .scale-item {
            // 手機版全部變成單欄
            grid-template-areas:
                "title"
                "summary"
                "preview"
                "var";
            grid-template-columns: 1fr;
            gap: 1rem;
        }

        .section-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
        }
    }
</style>