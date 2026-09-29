<script setup lang="ts">
    import MarkdownIt from 'markdown-it';
    import { computed } from 'vue';

    // 後端給的說明（api.md 的那一節）。html 關掉：markdown 裡的 HTML 標籤會被當成文字，不會執行
    const props = defineProps<{ source: string }>();

    const md = new MarkdownIt({ html: false, linkify: true, typographer: false });
    // 連結一律開新分頁，不要把後台（和登入狀態）換掉
    const defaultLink = md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
    md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
        tokens[idx].attrSet('target', '_blank');
        tokens[idx].attrSet('rel', 'noopener noreferrer');
        return defaultLink(tokens, idx, options, env, self);
    };

    const html = computed(() => md.render(props.source));
</script>

<template>
    <!-- eslint-disable-next-line vue/no-v-html -- markdown-it 關了 html，輸出只有 markdown 產生的標籤 -->
    <div class="dd-api-md" v-html="html" />
</template>

<style lang="scss">
    .dd-api-md {
        color: var(--vp-c-text-1);
        font-size: var(--font-size-s);
        line-height: 1.75;
        overflow-wrap: anywhere;

        > * + * { margin-top: 12px; }
        h1, h2, h3, h4 {
            margin-top: 20px;
            font-size: var(--font-size-m);
            font-weight: 700;
        }
        p { margin: 0; }
        ul, ol { padding-left: 1.4em; }
        li + li { margin-top: 4px; }
        a {
            color: var(--vp-c-brand-1);
            text-decoration: underline;
        }
        code {
            background: var(--vp-c-default-soft);
            padding: 1px 5px;
            border-radius: 4px;
            font-family: var(--vp-font-family-mono);
            font-size: .9em;
        }
        pre {
            background: var(--vp-c-bg-alt);
            padding: 12px 14px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 8px;
            overflow-x: auto;

            code {
                background: none;
                padding: 0;
                font-size: 12.5px;
                line-height: 1.6;
            }
        }
        table {
            display: block;
            width: max-content;
            max-width: 100%;
            border-collapse: collapse;
            overflow-x: auto;
        }
        th, td {
            padding: 6px 10px;
            border: 1px solid var(--vp-c-divider);
            text-align: left;
            vertical-align: top;
        }
        th { background: var(--vp-c-bg-alt); }

        // 表格裡的欄位名稱（plan_source）不要被拆成兩行；表格本身可以橫向捲動
        th, td { overflow-wrap: normal; }
        td code, th code { white-space: nowrap; }
        blockquote {
            padding-left: 12px;
            border-left: 3px solid var(--vp-c-divider);
            margin: 0;
            color: var(--vp-c-text-2);
        }
    }
</style>
