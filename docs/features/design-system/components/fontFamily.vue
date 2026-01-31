<script setup lang="ts">
    import { fontFamilies, fontSizes } from '../constants'
</script>

<template>
    <div class="font-family__container">
        <section class="font-family__section section">
            <h3 class="title">Font Sizes</h3>
            <div class="size-list">
                <div v-for="size in fontSizes" :key="size.var" class="size-card">
                <div class="size-info">
                    <span class="name">{{ size.name }}</span>
                    <code class="var">{{ size.var }}</code>
                    <span class="val">{{ size.val }}</span>
                </div>
                <div class="size-preview">
                    <span :style="{ fontSize: `var(${size.var})` }">
                        {{ size.sample }}
                    </span>
                </div>
                </div>
            </div>
        </section>

        <hr class="divider" />

        <section class="font-family__section section">
            <h3 class="title">Font Families</h3>
            <div class="family-list">
                <div v-for="font in fontFamilies" :key="font.name" class="family-card">
                    <div class="meta">
                        <span class="name">{{ font.name }}</span>
                        <code class="var">{{ font.var }}</code>
                    </div>
                    <div class="preview text-preview" :style="{ fontFamily: `var(${font.var})` }">
                        AaBbCcDdEeFfGg 0123456789 <br/>
                        ~!@#$%^&*()_+[]=><\|/<br/>
                        永和九年，歲在癸丑，暮春之初，會于會稽山陰之蘭亭。
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>

<style lang="scss">
    .font-family {
        &__container {
            display: flex;
            flex-direction: column;
            gap: 3rem;

            .divider {
                border: none;
                border-top: 1px dashed var(--vp-c-divider);
                margin: 0;
            }

            // --- Font Size Grid ---
            .size {
                &-list {
                    display: grid;

                    // 響應式 Grid: 最小寬度 240px，自動填滿
                    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                    gap: 1rem;
                }

                &-card {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: var(--vp-c-bg-soft);
                    padding: 1.25rem;
                    border: 1px solid var(--vp-c-divider);
                    border-radius: 12px;
                    transition: transform 0.2s, border-color 0.2s;

                    &:hover {
                        border-color: var(--vp-c-brand);
                        transform: translateY(-2px);
                    }
                }

                &-info {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;

                    .name {
                        color: var(--vp-c-text-1);
                        font-size: 0.9rem;
                        font-weight: 700;
                    }
                    .var {
                        color: var(--vp-c-brand);
                        font-family: var(--font-monospace);
                        font-size: 0.75rem;
                    }
                    .val {
                        color: var(--vp-c-text-3);
                        font-size: 0.75rem;
                    }
                }

                &-preview {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--vp-c-bg);
                    width: 80px;
                    height: 80px;
                    border: 1px dashed var(--vp-c-divider);
                    border-radius: 8px;
                    color: var(--vp-c-text-1);

                    // 確保文字不會換行，保持 Ag 在正中間
                    white-space: nowrap;
                    overflow: hidden;
                }
            }

            // --- Font Family Cards ---
            .family {
                &-list {
                    display: grid;
                    gap: 1.5rem;
                }

                &-card {
                    background: var(--vp-c-bg-soft);
                    padding: 1.5rem;
                    border: 1px solid var(--vp-c-divider);
                    border-radius: 8px;

                    .meta {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 1rem;

                        .name {
                            color: var(--vp-c-text-1);
                            font-weight: 700;
                        }
                        .var {
                            color: var(--vp-c-brand);
                            font-family: var(--font-monospace);
                            font-size: 0.85rem;
                        }
                    }

                    .text-preview {
                        color: var(--vp-c-text-2);
                        font-size: 1.125rem;
                        line-height: 1.6;
                        word-break: break-all;
                    }
                }
            }
        }
    }
</style>