<script setup lang="ts">
    import { useRoute } from 'vitepress';
    import { useSidebarData } from '../hooks/useSidebarData';
    import SidebarLink from './SidebarLink.vue'; // 引入遞迴組件

    const route = useRoute();
    const { sidebarGroups } = useSidebarData();
    const sidebarRef = ref<HTMLElement>();

    // --- 自動捲動 (Scroll to Active) ---
    const scrollToActive = async () => {
        await nextTick();
        if (!sidebarRef.value) return;
        const activeEl = sidebarRef.value.querySelector('.menu-link.active');
        if (activeEl) {
            activeEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
    };

    watch(() => route.path, scrollToActive);
    onMounted(scrollToActive);
</script>

<template>
    <aside v-if="sidebarGroups.length" ref="sidebarRef" class="series-sidebar">
        <div v-for="(group, gIndex) in sidebarGroups" :key="gIndex" class="sidebar-group">
            <div v-if="group.text" class="group-title">
                {{ group.text }}
            </div>

            <ul class="group-items">
                <SidebarLink
                    v-for="(item, iIndex) in group.items"
                    :key="iIndex"
                    :item="item"
                    :depth="0"
                />
            </ul>
        </div>
    </aside>

    <div v-else class="empty-sidebar" />
</template>

<style lang="scss">
    .series-sidebar {
        width: 100%;
        height: 100%;
        padding-right: 8px;
        overflow-y: auto;

        // Scrollbar styling
        // scrollbar-width: thin;
        @include setScroll();

        &::-webkit-scrollbar {
            background: transparent;
            width: 4px;
        }
        &::-webkit-scrollbar-thumb {
            background: transparent;
            border-radius: 4px;
            transition: .2s var(--cubic-FiFo);
        }
        &:hover::-webkit-scrollbar-thumb {
            background: var(--nb-pencil);
        }

        .sidebar-group {
            margin-bottom: 24px;

            // 系列名：一般的粗體小字，不再全大寫
            .group-title {
                padding-left: var(--nb-space-3);
                margin-bottom: var(--nb-space-2);
                color: var(--nb-ink-2);
                font-size: var(--nb-step--1);
                font-weight: 700;
            }

            .group-items {
                padding: 0;
                margin: 0;
            }
        }
    }
</style>
