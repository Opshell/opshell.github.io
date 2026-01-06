<script setup lang="ts">
    import { computed } from 'vue';
    import { useSiteData } from '@hooks/useSiteData';

    const siteData = useSiteData();

    // 處理 Tags 資料
    const tags = computed(() => {
        if (!siteData.value) return [];

        // siteData.tags 是 Map<string, TagIndex>
        // 我們將其轉為 Array 並排序
        return Array.from(siteData.value.tags.entries())
            .map(([name, index]) => ({
                name,
                count: index.count
            }))
            .sort((a, b) => b.count - a.count) // 數量多的排前面
            .slice(0, 20); // 取前 20 個
    });
</script>

<template>
    <div class="widgets-container">
        <div class="widget-card stats">
            <!-- <h4 class="w-title"><ElSvgIcon name="analytics" class="icon"/> Data</h4> -->
            <div class="stat-grid">
                <div class="stat-item">
                    <span class="val">{{ siteData?.counts.published || 0 }}</span>
                    <span class="label">Posts</span>
                </div>
                <div class="stat-item">
                    <span class="val">{{ siteData?.counts.unpublished || 0 }}</span>
                    <span class="label">Draft</span>
                </div>
                <div class="stat-item">
                    <span class="val" id="busuanzi_value_site_pv">--</span>
                    <span class="label">Page Visitor</span>
                </div>
                <div class="stat-item">
                    <span class="val" id="busuanzi_value_site_uv">--</span>
                    <span class="label">Unique Visitor</span>
                </div>
            </div>
        </div>

        <div class="widget-card tags">
            <h4 class="w-title">
                <ElSvgIcon name="tag" class="icon"/>
                Tags
            </h4>

            <div class="tags-cloud">
                <template v-for="tag in tags" :key="tag.name">
                    <a v-if="tag.count > 1"
                        :href="`/tags-list.html?tag=${tag.name}&page=1`"
                        class="tag-link">
                        <span class="hash">#</span>{{ tag.name }}
                        <span class="t-count">{{ tag.count }}</span>
                    </a>
                </template>
                <a
                    :href="`/tags-list.html?tag=vue&page=1`"
                    class="tag-link">
                    More ...
                </a>
            </div>
        </div>
    </div>
</template>

<style lang="scss">
    .widgets-container {
        display: flex; flex-direction: column; gap: 2rem;
    }

    .widget-card {
        background: var(--vp-c-bg-soft);
        padding: 1.5rem;
        border-radius: 12px;

        // border: 1px solid var(--vp-c-divider); // 可選：加邊框更俐落

        .w-title {
            display: flex; gap: 8px; align-items: center;
            margin-bottom: 1.2rem; color: var(--vp-c-text-2);
            font-size: 0.8rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
            .icon {
                width: 14px;
                height: 14px;
                opacity: 0.7;
            }
        }
    }

    .stat-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
        .stat-item {
            display: flex; flex-direction: column;
            .val {
                color: var(--vp-c-brand);
                font-family: var(--vp-font-family-mono);
                font-size: 1.4rem;
                font-weight: 600;
                line-height: 1.2;
            }
            .label {
                margin-top: 4px;
                color: var(--vp-c-text-3);
                font-size: 0.75rem;
            }
        }
    }

    .tags-cloud {
        display: flex; flex-wrap: wrap; gap: 8px 12px;
        .tag-link {
            display: flex; gap: 2px; align-items: center; color: var(--vp-c-text-2);
            font-size: 0.85rem; text-decoration: none;
            transition: all 0.2s;

            .hash {
                color: var(--vp-c-brand);
                font-weight: 300;
                opacity: 0.5;
            }

            &:hover {
                color: var(--vp-c-brand);
                .t-count {
                    background: var(--vp-c-brand);
                    color: white;
                }
            }

            .t-count { background: var(--vp-c-bg-alt);
                min-width: 1.2em;
                padding: 1px 6px; border-radius: 8px; margin-left: 4px;
                color: var(--vp-c-text-3);
                font-size: 0.7rem; text-align: center;
                transition: all 0.2s;
            }
        }
    }
</style>