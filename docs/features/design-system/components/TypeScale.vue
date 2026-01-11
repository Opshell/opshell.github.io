<script setup lang="ts">
    const typeScales = [
        {
            name: 'H1',
            var: '--font-size-xxl',
            label: 'Heading 1',
            sample: 'The quick brown fox'
        },
        { name: 'H2', var: '--font-size-xl', label: 'Heading 2', sample: 'The quick brown fox' },
        { name: 'H3', var: '--font-size-l', label: 'Heading 3', sample: 'The quick brown fox' },
        { name: 'H4', var: '--font-size-l', label: 'Heading 4', sample: 'The quick brown fox' },
        { name: 'Normal', var: '--font-size-m', label: 'Body Text', sample: 'The quick brown fox jumps over the lazy dog' },
        { name: 'Remark', var: '--font-size-s', label: 'Remark / Small', sample: 'The quick brown fox jumps over the lazy dog' },
    ];

    const fontFamilies = [
        { name: 'Base', var: '--font-sans-serif' },
        { name: 'Mono', var: '--font-monospace' },
    ];
</script>

<template>
    <article class="type-system article-layout__article">
        <section class="section">
            <div class="type-scale-list">
                <!-- <div v-for="scale in typeScales" :key="scale.name" class="type-item">
                    <div class="type-meta">
                        <span class="type-name">{{ scale.name }}</span>
                        <code class="type-var">{{ scale.var }}</code>
                    </div>
                    <div class="type-sample" :style="{ fontSize: `var(${scale.var})` }">
                        {{ scale.sample }}
                    </div>
                </div> -->

                <div class="type-item">
                    <div class="type-meta">
                        <span class="type-name">H1</span>
                        <code class="type-var">--font-size-xxl</code>
                    </div>
                    <!-- <div class="type-sample"> -->

                    <h1>The quick brown fox</h1>
                </div>
                <div class="type-item">
                    <div class="type-meta">
                        <span class="type-name">H2</span>
                        <code class="type-var">--font-size-xxl</code>
                    </div>

                    <h2>The quick brown fox</h2>
                </div>
                <div class="type-item">
                    <div class="type-meta">
                        <span class="type-name">H3、H4</span>
                        <code class="type-var">--font-size-xxl</code>
                    </div>

                    <h3>The quick brown fox</h3>
                </div>
                <div class="type-item">
                    <div class="type-meta">
                        <span class="type-name">H5、H6</span>
                        <code class="type-var">--font-size-xxl</code>
                    </div>

                    <h5>The quick brown fox</h5>
                </div>
                <div class="type-item">
                    <div class="type-meta">
                        <span class="type-name"> p </span>
                        <code class="type-var">--font-size-xxl</code>
                    </div>

                    <p>The quick brown fox</p>
                </div>
            </div>
        </section>

        <section class="section">
            <h3>Font Families</h3>
            <div class="font-family-list">
                <div v-for="font in fontFamilies" :key="font.name" class="font-item">
                    <div class="font-meta">
                        <span class="font-name">{{ font.name }}</span>
                        <code class="font-var">{{ font.var }}</code>
                    </div>
                    <div class="font-sample" :style="{ fontFamily: `var(${font.var})` }">
                        ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>
                        abcdefghijklmnopqrstuvwxyz<br>
                        0123456789===
                    </div>
                </div>
            </div>
        </section>
    </article>
</template>

<style lang="scss">
    .type-system {
        display: flex;
        flex-direction: column;
        gap: 3rem;
        margin: 1.5rem 0;

        &.article-layout__article {
            h1, h2, h3, h4, h5, h6, p {
                padding: 0;
                border-top: none;
                margin: 0;
            }

            .type-item,
            .font-item {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                padding-bottom: 1.5rem;
                border-bottom: 1px solid var(--vp-c-divider);

                &:last-child {
                    border-bottom: none;
                }
            }
        }
    }

    .section {
        h3 {
            margin-bottom: 1.5rem;
            font-size: 1.25rem;
            font-weight: 600;
        }
    }

    .type-scale-list, .font-family-list {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }



    .type-meta, .font-meta {
        display: flex;
        gap: 1rem;
        align-items: center;
    }

    .type-name, .font-name {
        min-width: 60px;
        font-weight: 600;
    }

    .type-var, .font-var {
        color: var(--vp-c-text-2);
        font-size: 0.75rem;
    }

    .type-sample {
        color: var(--vp-c-text-1);
        line-height: 1.5;
    }

    .font-sample {
        color: var(--vp-c-text-1);
        font-size: 1.25rem;
        line-height: 1.6;
        word-break: break-all;
    }
</style>
