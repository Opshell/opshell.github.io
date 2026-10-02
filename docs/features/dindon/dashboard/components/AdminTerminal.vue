<script setup lang="ts">
    import type { TerminalAction, TerminalTab } from '../terminal';
    import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
    import { COMMANDS, commonPrefix, parseCommand, suggest } from '../terminal';

    // 後台頂端的偽終端機（2026-10 翻新）：原本那個黃色方塊游標變成真的能打字。
    // 打完 Enter 交給 DashboardApp 去做；這裡管輸入、補完、歷史與輸出。
    // 操作跟 shell 一樣：Tab 補完（先補到共同開頭、再按一次輪流換）、↑↓ 翻歷史、Esc 清掉或離開。

    interface Props {
        tab: string;
        tabs: readonly TerminalTab[];
    }
    const props = defineProps<Props>();
    const emit = defineEmits<{ command: [action: TerminalAction] }>();

    interface Line {
        id: number;
        kind: 'in' | 'out' | 'err';
        text: string;
    }

    const inputEl = ref<HTMLInputElement>();
    const draft = ref('');
    const focused = ref(false);
    const lines = ref<Line[]>([]);
    const showHelp = ref(false);
    /** Tab 輪到建議清單的第幾個（-1＝還沒開始輪） */
    const cursor = ref(-1);
    let lineId = 0;

    // 歷史只放記憶體：裡面可能有搜尋過的 email，不寫進瀏覽器儲存（部落格頁面讀得到）
    const history: string[] = [];
    let historyIndex = -1;
    const MAX_LINES = 6;

    /** 離開終端機後，列的右邊留著最後一句回應（錯誤不留：錯誤當下就看到了） */
    const echo = computed(() => {
        const last = lines.value.at(-1);
        return last?.kind === 'out' ? last.text : '';
    });
    // #region [P] 下拉的進出場（transitions-dev 05 Menu dropdown）：一直掛著，用 is-open／is-closing 切；
    // 關的時候先播 --dropdown-close-dur 再拿掉 is-closing，下次打開才會從「還沒開」的大小長出來
    const panelState = ref<'' | 'is-open' | 'is-closing'>('');
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    watch(focused, (open) => {
        clearTimeout(closeTimer);
        if (open) {
            panelState.value = 'is-open';
            return;
        }
        panelState.value = 'is-closing';
        const ms = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dropdown-close-dur')) || 150;
        closeTimer = setTimeout(() => (panelState.value = ''), ms);
    });
    onBeforeUnmount(() => clearTimeout(closeTimer));
    // #endregion

    const suggestions = computed(() => (draft.value.trim() ? suggest(draft.value, props.tabs) : []));
    const tabLabel = (key: string) => props.tabs.find(tab => tab.key === key)?.label ?? key;

    /** 做了什麼，用一句話回給使用者 */
    function describe(action: TerminalAction): Line['text'] {
        switch (action.kind) {
            case 'tab': return `→ 切到「${tabLabel(action.tab)}」${action.note ? `，${action.note}` : ''}`;
            case 'refresh': return '→ 更新待辦數字';
            case 'reload': return `→ 重新載入「${tabLabel(props.tab)}」`;
            case 'theme': return action.mode === 'toggle' ? '→ 切換深淺色' : `→ 換成${action.mode === 'dark' ? '深' : '淺'}色`;
            case 'sidebar': return '→ 切換側欄';
            case 'logout': return '→ 登出';
            case 'error': return action.message;
            default: return '';
        }
    }

    function print(kind: Line['kind'], text: string) {
        lines.value = [...lines.value, { id: ++lineId, kind, text }].slice(-MAX_LINES);
    }

    function run() {
        const line = draft.value.trim();
        draft.value = '';
        cursor.value = -1;
        historyIndex = -1;
        if (!line) return;
        if (history[0] !== line) history.unshift(line);

        const action = parseCommand(line, props.tabs);
        showHelp.value = action.kind === 'help';
        if (action.kind === 'clear') {
            lines.value = [];
            return;
        }
        print('in', line);
        const text = describe(action);
        if (text) print(action.kind === 'error' ? 'err' : 'out', text);
        if (action.kind === 'error' || action.kind === 'help') return;
        emit('command', action);
        // 做完就把鍵盤還給頁面（像指令面板）：打 triage 之後馬上能按 1、2、3 判定。
        // 更新數字不換頁，留在這裡繼續打
        if (action.kind !== 'refresh') inputEl.value?.blur();
    }

    function complete() {
        const list = suggestions.value;
        if (list.length === 1) {
            draft.value = `${list[0].value} `;
            cursor.value = -1;
            return;
        }
        // 第一次按：補到大家一樣的地方；補不動了才開始輪流
        const prefix = commonPrefix(list.map(item => item.value));
        if (cursor.value === -1 && prefix.length > draft.value.trim().length) {
            draft.value = prefix;
            return;
        }
        cursor.value = (cursor.value + 1) % list.length;
    }

    function recall(step: 1 | -1) {
        if (!history.length) return;
        historyIndex = Math.min(Math.max(historyIndex + step, -1), history.length - 1);
        draft.value = historyIndex === -1 ? '' : history[historyIndex];
        void nextTick(() => inputEl.value?.setSelectionRange(draft.value.length, draft.value.length));
    }

    function onKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            event.preventDefault();
            // 用 Tab 輪到某一個建議時，Enter 先選它
            const picked = cursor.value >= 0 ? suggestions.value[cursor.value] : undefined;
            if (picked) draft.value = picked.value;
            run();
        } else if (event.key === 'Tab' && suggestions.value.length) {
            // 沒東西可補時放行，Tab 照常移到下一個元素（不把鍵盤關在這裡）
            event.preventDefault();
            complete();
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            recall(event.key === 'ArrowUp' ? 1 : -1);
        } else if (event.key === 'Escape') {
            // 不往外傳：快速審核的 Esc 是「關掉」，離開終端機不該順便把它關了
            event.stopPropagation();
            if (draft.value) {
                draft.value = '';
                cursor.value = -1;
            } else {
                inputEl.value?.blur();
            }
        }
    }

    function pick(value: string) {
        draft.value = value;
        run();
    }

    function focus() {
        inputEl.value?.focus();
    }

    defineExpose({ focus });
</script>

<template>
    <div class="dd-term" :class="{ 'is-focused': focused }">
        <label class="dd-term__prompt" for="dd-term-input">
            <span aria-hidden="true">~/dindon/admin/{{ tab }} <span class="dollar">$</span></span>
            <span class="sr-only">後台指令</span>
        </label>
        <div class="dd-term__field">
            <!-- 還沒點進來時，放一塊品牌黃的方塊游標，告訴你這裡能打字 -->
            <span v-if="!focused && !draft" class="dd-term__block" aria-hidden="true" />
            <input
                id="dd-term-input"
                ref="inputEl"
                v-model="draft"
                type="text"
                role="combobox"
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
                aria-autocomplete="list"
                aria-controls="dd-term-panel"
                :aria-expanded="focused"
                :aria-activedescendant="cursor >= 0 ? `dd-term-option-${cursor}` : undefined"
                :placeholder="focused ? 'help 看全部指令，Tab 補完' : '按 : 打指令'"
                @focus="focused = true"
                @blur="focused = false"
                @input="cursor = -1"
                @keydown="onKeydown"
            />
        </div>
        <p v-if="!focused && echo" class="dd-term__echo">{{ echo }}</p>

        <!-- #region [P] 下拉：打到一半列建議；空白時列輸出與指令表。按在上面不會讓輸入框失焦 -->
        <div
            id="dd-term-panel"
            class="dd-term__panel t-dropdown"
            :class="panelState"
            data-origin="top-left"
            :aria-hidden="!focused"
            @mousedown.prevent
        >
            <ul v-if="suggestions.length" class="dd-term__suggestions" role="listbox" aria-label="建議">
                <li
                    v-for="(item, index) in suggestions"
                    :id="`dd-term-option-${index}`"
                    :key="item.value"
                    role="option"
                    :aria-selected="index === cursor"
                    :class="{ 'is-cursor': index === cursor }"
                    @click="pick(item.value)"
                >
                    <code>{{ item.value }}</code><span>{{ item.text }}</span>
                </li>
            </ul>
            <template v-else>
                <ol v-if="lines.length" class="dd-term__log" aria-live="polite">
                    <li v-for="line in lines" :key="line.id" :class="`is-${line.kind}`">
                        <span v-if="line.kind === 'in'" class="dollar" aria-hidden="true">$</span>{{ line.text }}
                    </li>
                </ol>
                <dl v-if="showHelp || !lines.length" class="dd-term__help">
                    <div v-for="command in COMMANDS" :key="command.name" @click="pick(command.name)">
                        <dt><code>{{ command.usage }}</code></dt>
                        <dd>{{ command.text }}</dd>
                    </div>
                </dl>
            </template>
        </div>
        <!-- #endregion -->
    </div>
</template>

<style lang="scss">
    // 顏色是 _variable.scss 的 --term-*：淺色模式也是深底，黃色游標在上面才亮得起來
    .dd-term {
        position: relative;
        display: flex;
        flex: 1;
        gap: 8px;
        align-items: center;
        min-width: 0;
        font-family: var(--dd-mono);
        font-size: 13px;

        &__prompt {
            flex-shrink: 0;
            color: var(--term-dim);
            white-space: nowrap;

            .dollar { color: var(--term-ink); }
            @include setRWD(640px) {
                // 手機上路徑太長，只留 $
                > span:first-child { font-size: 0; }
                .dollar { font-size: 13px; }
            }
        }
        &__field {
            position: relative;
            display: flex;
            flex: 1;
            align-items: center;
            min-width: 0;

            input {
                background: transparent;
                width: 100%;
                padding: 6px 0;
                border: 0;
                color: var(--term-ink);
                font: inherit;
                caret-color: var(--term-hot);

                &::placeholder { color: var(--term-dim); }
                &:focus { outline: none; }
            }
        }

        &__echo {
            flex-shrink: 1;
            min-width: 0;
            color: var(--term-dim);
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
            @include setRWD(900px) { display: none; }
        }

        // 方塊游標疊在 placeholder 前面，placeholder 往右讓一格
        &__block {
            position: absolute;
            top: 50%;
            left: 0;
            background: var(--term-hot);
            width: .62em;
            height: 1.2em;
            transform: translateY(-50%);
            animation: dd-term-blink 1.1s steps(1) infinite;

            + input { padding-left: 1.1em; }
        }
        &.is-focused {
            // 聚焦時整條加一道黃線，告訴你鍵盤現在在這裡
            box-shadow: inset 0 -2px 0 var(--term-hot);
        }

        // #region [P] 下拉
        &__panel {
            position: absolute;
            top: calc(100% + 1px);
            right: 0;
            left: 0;
            background: var(--term-bg);
            max-height: min(60vh, 420px);
            padding: 8px 0;
            border: 1px solid var(--term-line);
            border-top: 0;
            color: var(--term-ink);
            overflow-y: auto;
            z-index: 30;
        }
        &__suggestions,
        &__log {
            padding: 0;
            margin: 0;
            list-style: none;
        }
        &__suggestions li {
            display: grid;
            grid-template-columns: minmax(8rem, max-content) 1fr;
            gap: 16px;
            padding: 4px 14px;
            cursor: pointer;

            code { color: var(--term-ink); }
            span { color: var(--term-dim); }
            &:hover,
            &.is-cursor {
                background: rgb(244 185 54 / 14%);

                code { color: var(--term-hot); }
            }
        }
        &__log {
            padding: 0 14px 8px;
            border-bottom: 1px dashed var(--term-line);
            margin-bottom: 8px;

            li { padding: 2px 0; }
            .dollar {
                margin-right: 8px;
                color: var(--term-dim);
            }
            .is-in { color: var(--term-ink); }
            .is-out { color: var(--term-dim); }
            .is-err { color: var(--term-err); }
        }
        &__help {
            display: grid;
            margin: 0;

            div {
                display: grid;
                grid-template-columns: minmax(12rem, max-content) 1fr;
                gap: 16px;
                padding: 3px 14px;
                cursor: pointer;

                &:hover { background: rgb(244 185 54 / 14%); }
                @include setRWD(640px) {
                    grid-template-columns: 1fr;
                    gap: 0;
                }
            }
            code { color: var(--term-hot); }
            dd {
                margin: 0;
                color: var(--term-dim);
                font-family: var(--vp-font-family-base);
            }
        }

        // #endregion
        @media (prefers-reduced-motion: reduce) {
            &__block { animation: none; }
        }
    }
    @keyframes dd-term-blink {
        50% { opacity: 0; }
    }
</style>
