<script setup lang="ts">
    import { computed, ref } from 'vue';

    // 回應的 JSON 樹：物件與陣列可以收合，點 key 複製路徑（data.devices[0].id），長字串先截斷。
    // 自己遞迴自己（SFC 可以用檔名引用自己）。
    const props = withDefaults(defineProps<{
        value: unknown;
        /** 這一層的 key；根是 null */
        name?: string | number | null;
        /** 從根到這一層的路徑，複製用 */
        path?: string;
        depth?: number;
        /** 幾層以內預設展開 */
        openDepth?: number;
    }>(), { name: null, path: '', depth: 0, openDepth: 2 });

    const emit = defineEmits<{ copied: [text: string] }>();

    const ARRAY_PREVIEW = 100;
    const STRING_PREVIEW = 240;

    const isArray = computed(() => Array.isArray(props.value));
    const isBranch = computed(() => props.value !== null && typeof props.value === 'object');
    const entries = computed<[string | number, unknown][]>(() => {
        if (Array.isArray(props.value)) return props.value.map((item, index) => [index, item]);
        if (isBranch.value) return Object.entries(props.value as Record<string, unknown>);
        return [];
    });
    /** 物件 {3}、陣列 [3]（寫在模板裡的話，大括號會跟 {{ }} 打架） */
    const meta = computed(() => (isArray.value ? `[${entries.value.length}]` : `{${entries.value.length}}`));
    const open = ref(props.depth < props.openDepth);
    const showAll = ref(false);
    const shown = computed(() => (showAll.value ? entries.value : entries.value.slice(0, ARRAY_PREVIEW)));

    const fullString = ref(false);
    const kind = computed(() => (props.value === null ? 'null' : typeof props.value));
    const display = computed(() => {
        if (typeof props.value === 'string') {
            const text = !fullString.value && props.value.length > STRING_PREVIEW ? `${props.value.slice(0, STRING_PREVIEW)}…` : props.value;
            return JSON.stringify(text);
        }
        return String(props.value);
    });

    const childPath = (key: string | number) => (typeof key === 'number' ? `${props.path}[${key}]` : props.path ? `${props.path}.${key}` : key);

    async function copy(text: string) {
        try {
            await navigator.clipboard.writeText(text);
            emit('copied', text);
        } catch {
            // 沒有剪貼簿權限就算了
        }
    }
</script>

<template>
    <div class="dd-json" :class="{ 'dd-json--root': depth === 0 }">
        <template v-if="isBranch">
            <button type="button" class="dd-json__toggle" :aria-expanded="open" @click="open = !open">
                <span class="caret" :class="{ 'is-open': open }" aria-hidden="true">▸</span>
                <span v-if="name !== null" class="dd-json__key" :title="`複製路徑 ${path}`" @click.stop="copy(path)">{{ name }}</span>
                <span class="dd-json__meta">{{ meta }}</span>
            </button>
            <div v-if="open" class="dd-json__children">
                <JsonTree
                    v-for="[key, child] in shown"
                    :key="key"
                    :value="child"
                    :name="key"
                    :path="childPath(key)"
                    :depth="depth + 1"
                    :open-depth="openDepth"
                    @copied="text => emit('copied', text)"
                />
                <button v-if="entries.length > shown.length" type="button" class="dd-json__more" @click="showAll = true">
                    還有 {{ entries.length - shown.length }} 項，全部顯示
                </button>
            </div>
        </template>
        <div v-else class="dd-json__leaf">
            <span v-if="name !== null" class="dd-json__key" :title="`複製路徑 ${path}`" @click="copy(path)">{{ name }}</span>
            <span class="dd-json__value" :class="`is-${kind}`" :title="kind === 'string' ? '點兩下複製值' : undefined" @dblclick="copy(String(value))">{{ display }}</span>
            <button v-if="typeof value === 'string' && value.length > STRING_PREVIEW" type="button" class="dd-json__more" @click="fullString = !fullString">
                {{ fullString ? '收起' : `全部（${value.length.toLocaleString()} 字）` }}
            </button>
        </div>
    </div>
</template>

<style lang="scss">
    .dd-json {
        font-family: var(--vp-font-family-mono);
        font-size: 12.5px;
        line-height: 1.7;

        &__toggle {
            @include setFlex(flex-start, baseline, 6px);
            background: none;
            padding: 0;
            border: 0;
            color: inherit;
            font: inherit;
            text-align: left;
            cursor: pointer;

            .caret {
                display: inline-block;
                width: 10px;
                color: var(--vp-c-text-3);
                transition: transform .12s;

                &.is-open { transform: rotate(90deg); }
            }
        }
        &__children {
            padding-left: 12px;
            border-left: 1px solid var(--vp-c-divider);
            margin-left: 4px;
        }
        &__leaf {
            display: flex;
            flex-wrap: wrap;
            gap: 0 8px;
            padding-left: 16px;
        }
        &--root > &__leaf { padding-left: 0; }
        &__key {
            color: var(--vp-c-text-2);
            cursor: copy;

            &::after { content: ':'; }
            &:hover { color: var(--vp-c-brand-1); }
        }
        &__meta { color: var(--vp-c-text-3); }
        &__value {
            white-space: pre-wrap;
            word-break: break-all;

            &.is-string { color: #0b7f4f; }
            &.is-number { color: #1d59bb; }
            &.is-boolean { color: #a8411e; }
            &.is-null { color: var(--vp-c-text-3); }
        }
        &__more {
            background: none;
            padding: 0;
            border: 0;
            color: var(--vp-c-brand-1);
            font: inherit;
            cursor: pointer;
        }
    }

    .dark .dd-json__value {
        &.is-string { color: #6fd4a3; }
        &.is-number { color: #76b9ff; }
        &.is-boolean { color: #f0a17a; }
    }
</style>
