<script setup lang="ts">
    import { ref, onMounted, watch, nextTick } from 'vue';
    import { useRoute } from 'vitepress';
    import { useSidebarData } from '../hooks/useSidebarData';
    import SidebarLink from './sidebarLink.vue'; // 引入遞迴組件

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
    <aside class="series-sidebar" ref="sidebarRef" v-if="sidebarGroups.length">
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

    <div v-else class="empty-sidebar"></div>
</template>

<style lang="scss">
    .series-sidebar {
        width: 100%;
        height: 100%;
        padding-right: 8px;
        overflow-y: auto;

        // Scrollbar styling
        scrollbar-width: thin;
        &::-webkit-scrollbar { width: 4px; }
        &::-webkit-scrollbar-thumb {
            background: transparent;
            border-radius: 4px;
        }
        &:hover::-webkit-scrollbar-thumb {
            background: var(--vp-c-divider);
        }

        .sidebar-group {
            margin-bottom: 24px;

            .group-title {
                padding-left: 12px;
                margin-bottom: 8px;
                color: var(--vp-c-text-2);
                font-size: 13px;
                font-weight: 700;
                letter-spacing: 0.05em;
                text-transform: uppercase;
            }

            .group-items {
                padding: 0;
                margin: 0;
            }
        }
    }
</style>