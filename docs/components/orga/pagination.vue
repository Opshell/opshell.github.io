<script setup lang="ts">
    const prop = withDefaults(defineProps<{
        totalPage?: number
        currentPage?: number
        pageSize?: number
    }>(), {
        totalPage: 1,
        currentPage: 1,
        pageSize: 10
    });

    // 做一個  把陣列分割成多個陣列的函數
    function chunk<T>(arr: T[], size: number): T[][] {
        return arr.reduce((acc, _, i) => (i % size ? acc : [...acc, arr.slice(i, i + size)]), [] as T[][]);
    }

    // 做一個 產生頁碼的函數
    function generatePageArray(): number[] {
        const pageArray = Array.from({ length: prop.totalPage }, (_, i) => i + 1);
        const pageArrayChunk = chunk(pageArray, prop.pageSize);
        const currentPageIndex = pageArray.findIndex(page => page === prop.currentPage);
        const currentPageChunkIndex = Math.floor(currentPageIndex / prop.pageSize);

        return pageArrayChunk[currentPageChunkIndex];
    }
</script>

<template>
    <div class="pagination">
        <a
            v-if="currentPage !== 1"
            :href="`?page=${currentPage - 1}`"
            class="page"
        >
            上一頁
        </a>
        <a
            v-for="page in generatePageArray()"
            :key="`page-${page}`"
            :href="`?page=${page}`"
            class="page" :class="[{ current: currentPage === page }]"
        >
            {{ page }}
        </a>
        <a
            v-if="currentPage !== totalPage"
            :href="`?page=${currentPage + 1}`"
            class="page"
        >
            下一頁
        </a>
    </div>
</template>
