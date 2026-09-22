<script setup lang="ts">
    import { ref } from 'vue';

    // 元件展示框：標題、說明、可互動的示範區、props 表、用法程式碼（可收合）
    interface iProp {
        name: string;
        type: string;
        default?: string;
        desc: string;
    }
    const { id, title, description = '', code = '', props = [] } = defineProps<{
        id: string;
        title: string;
        description?: string;
        code?: string;
        props?: iProp[];
    }>();
    const showCode = ref(false);
</script>

<template>
    <section :id class="demo-block">
        <header class="demo-block__header">
            <h3 class="demo-block__title"><a :href="`#${id}`">{{ title }}</a></h3>
            <p v-if="description" class="demo-block__desc">{{ description }}</p>
        </header>

        <div class="demo-block__stage"><slot /></div>

        <table v-if="props.length" class="demo-block__props">
            <thead>
                <tr><th>prop</th><th>型別</th><th>預設</th><th>說明</th></tr>
            </thead>
            <tbody>
                <tr v-for="prop in props" :key="prop.name">
                    <td><code>{{ prop.name }}</code></td>
                    <td><code>{{ prop.type }}</code></td>
                    <td><code v-if="prop.default">{{ prop.default }}</code><span v-else>—</span></td>
                    <td>{{ prop.desc }}</td>
                </tr>
            </tbody>
        </table>

        <div v-if="code" class="demo-block__code">
            <button type="button" class="demo-block__toggle" :aria-expanded="showCode" @click="showCode = !showCode">
                {{ showCode ? '收起程式碼' : '看程式碼' }}
            </button>
            <pre v-show="showCode"><code>{{ code }}</code></pre>
        </div>
    </section>
</template>

<style lang="scss">
    .demo-block {
        @include setFlex(flex-start, stretch, 1rem, column);
        padding-bottom: 3rem;
        border-bottom: 1px solid var(--vp-c-divider);
        margin-bottom: 3rem;
        scroll-margin-top: calc(var(--vp-nav-height) + 5rem);

        &:last-child {
            padding-bottom: 0;
            border-bottom: 0;
            margin-bottom: 0;
        }

        &__title {
            padding: 0;
            border: 0;
            margin: 0;
            font-size: var(--font-size-l);
            font-weight: 700;

            a {
                color: var(--vp-c-text-1);
                text-decoration: none;

                &:hover { color: var(--vp-c-brand); }
            }
        }
        &__desc {
            margin: .25rem 0 0;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            line-height: 1.7;
        }

        // 示範區：用格線底，元件在上面看得出邊界
        &__stage {
            @include setFlex(flex-start, center, 12px);
            flex-wrap: wrap;
            background:
                linear-gradient(var(--vp-c-divider) 1px, transparent 1px) 0 0 / 20px 20px,
                linear-gradient(90deg, var(--vp-c-divider) 1px, transparent 1px) 0 0 / 20px 20px,
                var(--vp-c-bg);
            padding: 1.5rem;
            border: 1px solid var(--vp-c-divider);
            border-radius: 1rem;

            > .stage-row {
                @include setFlex(flex-start, center, 12px);
                flex-wrap: wrap;
                width: 100%;
            }
            > .stage-col {
                @include setFlex(flex-start, stretch, 12px, column);
                width: 100%;
                max-width: 360px;
            }
        }

        &__props {
            display: table;
            width: 100%;
            margin: 0;
            border-collapse: collapse;
            font-size: var(--font-size-s);

            th, td {
                padding: 8px 12px;
                border: 0;
                border-bottom: 1px solid var(--vp-c-divider);
                text-align: left;
                vertical-align: top;
            }
            th {
                background: transparent;
                color: var(--vp-c-text-3);
                font-size: var(--font-size-xs);
                font-weight: 600;
            }
            tr { background: transparent !important; }
            code {
                background: var(--vp-c-bg-soft);
                padding: 2px 6px;
                border-radius: 4px;
                color: var(--vp-c-brand-dark);
                font-size: var(--font-size-xs);
            }
        }

        &__code {
            @include setFlex(flex-start, flex-start, 8px, column);

            pre {
                background: var(--vp-c-bg-soft);
                width: 100%;
                padding: 1rem 1.25rem;
                border: 1px solid var(--vp-c-divider);
                border-radius: 10px;
                margin: 0;
                font-size: var(--font-size-xs);
                line-height: 1.7;
                overflow-x: auto;

                code {
                    background: none;
                    padding: 0;
                    color: var(--vp-c-text-1);
                }
            }
        }
        &__toggle {
            background: transparent;
            padding: 0;
            border: 0;
            color: var(--vp-c-brand);
            font-size: var(--font-size-s);
            cursor: pointer;

            &:hover { text-decoration: underline; }
        }
    }
</style>
