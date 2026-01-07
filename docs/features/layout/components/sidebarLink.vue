<script setup lang="ts">
    import { computed, ref, watch } from 'vue';
    import { useRoute } from 'vitepress';
    import type { SidebarItem } from '../hooks/useSidebarData';

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
    }
</script>

<template>
    <li class="sidebar-item">
        <div v-if="hasChildren" class="sidebar-item__folder">
            <button class="sidebar-item__folder-title" @click="toggle" :class="{ collapsed: isCollapsed }">
                <span class="icon-arrow">▼</span>
                <span class="text">{{ item.text }}</span>
            </button>

            <ul class="sidebar-item__folder-items" v-show="!isCollapsed">
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
    .sidebar-item {
        list-style: none;

        // 資料夾樣式
        &__folder {
            &-title {
                display: flex;
                align-items: center;
                background: none;
                width: 100%;
                padding: 8px 12px;
                border: none;
                color: var(--vp-c-text-1);
                font-size: 14px;
                font-weight: 700;
                text-align: left;
                cursor: pointer;
                transition: color 0.2s;

                &:hover { color: var(--vp-c-brand); }

                .icon-arrow {
                    margin-right: 8px;
                    color: var(--vp-c-text-3);
                    font-size: 10px;
                    transition: transform 0.2s;
                }

                &.collapsed .icon-arrow {
                    transform: rotate(-90deg);
                }
            }

            &-items {
                @include setFlex(flex-start, stretch, 0, column);
                padding: 0;
                margin: 0;

                // 左側邊框線，增加層次感 (Optional)
                // border-left: 1px solid var(--vp-c-divider);
                // margin-left: 18px;
            }
        }

        // 連結樣式 (與之前相同，但移除了 padding-left 固定值，改用 inline style)
        &__link {
            @include setFlex(flex-start, flex-start, .5rem);
            padding: 6px 12px 6px 0;
            border-left: 3px solid transparent;
            border-radius: 0 8px 8px 0; // 只圓右邊
            color: var(--vp-c-text-2);
            font-size: 14px;
            line-height: 1.4;
            text-decoration: none;
            transition: .2s;

            .badge {
                flex-shrink: 0;
                padding: 2px 5px;
                border-radius: 4px;
                font-family: var(--vp-font-family-mono);
                font-size: 11px; // 稍微縮小一點適應遞迴
                font-weight: 600;

                &.day {
                    background-color: var(--vp-c-bg-alt);
                    color: var(--vp-c-text-2);
                }
                &.bracket {
                    background-color: var(--vp-c-brand-dimm);
                    color: var(--vp-c-brand);
                }
            }

            .text {
                flex: 1;
                white-space: nowrap;
                text-overflow: ellipsis;
                overflow: hidden;
            }

            &.is-active {
                background-color: var(--vp-c-brand-dimm);
                border-left-color: var(--vp-c-brand);
                color: var(--vp-c-brand);
                line-height: 1.8;

                .badge.day {
                    background-color: var(--vp-c-brand);
                    color: white;
                }
                .text {
                    font-weight: 600;
                    white-space: normal;
                }
            }

            &:hover:not(.is-active) {
                background-color: var(--vp-c-brand-dimm);
                border-left-color: var(--vp-c-brand);
                color: var(--vp-c-brand-3);
                .text {
                    white-space: normal;
                }
            }
        }
    }
</style>