<script setup lang="ts">
    import type { SidebarItem } from '../hooks/useSidebarData';
    import { useRoute } from 'vitepress';
    import { computed, ref, watch } from 'vue';

    // 定義 Props
    const props = defineProps<{
        item: SidebarItem;
        depth: number; // 傳入深度，用來控制縮排
    }>();

    const route = useRoute();
    const isCollapsed = ref(false); // 控制資料夾展開/收合 (預設展開)

    // 標題解析器 (與之前相同) ---
    const parseTitle = (text: string = '') => {
        const bracketMatch = text.match(/^\[(.*?)\]\s*(.*)$/);
        if (bracketMatch) return { badge: bracketMatch[1], title: bracketMatch[2], type: 'bracket' };

        const dayMatch = text.match(/^(Day\s?\d+)\s?[-:]\s?(.*)$/i);
        if (dayMatch) return { badge: dayMatch[1], title: dayMatch[2], type: 'day' };

        return { badge: null, title: text, type: 'normal' };
    };

    // Active 判斷 ---
    const normalize = (path: string) => decodeURIComponent(path).replace(/\.html$/, '').replace(/\/$/, '');
    const isActive = computed(() => {
        if (!props.item.link) return false;
        return normalize(route.path) === normalize(props.item.link);
    });

    // 判斷是否為資料夾 ---
    const hasChildren = computed(() => {
        return props.item.items && props.item.items.length > 0;
    });

    // 如果子項目中有 active 的，自動展開資料夾
    watch(() => route.path, () => {
        if (hasChildren.value) {
            // 這裡可以寫深一點的遞迴檢查，或是依賴 CSS/VitePress 預設
            // 簡單版：只要路徑變了就不動，或是預設全開
        }
    }, { immediate: true });

    const toggle = () => {
        isCollapsed.value = !isCollapsed.value;
    };
</script>

<template>
    <li class="sidebar-item">
        <div v-if="hasChildren" class="sidebar-item__folder">
            <button class="sidebar-item__folder-title" :class="{ collapsed: isCollapsed }" @click="toggle">
                <span class="icon-arrow">▼</span>
                <span class="text">{{ item.text }}</span>
            </button>

            <ul v-show="!isCollapsed" class="sidebar-item__folder-items">
                <SidebarLink
                    v-for="(child, index) in item.items"
                    :key="index"
                    :item="child"
                    :depth="depth + 1"
                />
            </ul>
        </div>

        <a
            v-else-if="item.link"
            :href="item.link"
            class="sidebar-item__link"
            :class="{ 'is-active': isActive }"
            :title="item.text"
            :style="{ paddingLeft: `${depth * 12 + 12}px` }"
        >
            <template v-if="parseTitle(item.text).badge">
                <span class="badge" :class="parseTitle(item.text).type">
                    {{ parseTitle(item.text).badge }}
                </span>
                <span class="text">{{ parseTitle(item.text).title }}</span>
            </template>

            <span v-else class="text">{{ item.text }}</span>
        </a>
    </li>
</template>

<style lang="scss">
    // 系列清單：跟頁邊的目錄同一套——鉛筆線，現在這篇用螢光筆畫一下（2026-10 翻新）
    .sidebar-item {
        list-style: none;

        &__folder {
            &-title {
                @include setFlex(flex-start, center, var(--nb-space-2));
                background: none;
                width: 100%;
                padding: var(--nb-space-2) var(--nb-space-3);
                border: none;
                color: var(--nb-ink);
                font-size: var(--nb-step--1);
                font-weight: 700;
                text-align: left;
                cursor: pointer;

                &:hover { color: var(--nb-link); }
                &:focus-visible {
                    outline: 2px solid var(--nb-link);
                    outline-offset: -2px;
                }

                .icon-arrow {
                    color: var(--nb-pencil);
                    font-size: 10px;
                    transition: transform .2s;
                }
                &.collapsed .icon-arrow { transform: rotate(-90deg); }
            }
            &-items {
                @include setFlex(flex-start, stretch, 0, column);
                padding: 0;
                margin: 0;
            }
        }

        &__link {
            @include setFlex(flex-start, baseline, var(--nb-space-2));
            padding: 5px var(--nb-space-2) 5px 0;
            border-left: 3px solid transparent;
            color: var(--nb-ink-3);
            font-size: var(--nb-step--1);
            line-height: 1.5;
            text-decoration: none;

            // Day 12、[使用實例] 這種前綴：等寬小字，當作頁碼
            .badge {
                flex-shrink: 0;
                color: var(--nb-ink-3);
                font-family: var(--nb-font-mono);
                font-size: var(--nb-step--2);
                font-variant-numeric: tabular-nums;
            }
            .text {
                flex: 1;
                white-space: nowrap;
                text-overflow: ellipsis;
                overflow: hidden;
            }
            &:hover {
                color: var(--nb-ink);

                .text { white-space: normal; }
            }
            &:focus-visible {
                outline: 2px solid var(--nb-link);
                outline-offset: -2px;
            }
            &.is-active {
                border-left-color: var(--nb-marker);
                color: var(--nb-ink);

                .badge { color: var(--nb-ink-2); }
                .text {
                    font-weight: 700;
                    white-space: normal;
                }
            }
        }
    }
</style>
