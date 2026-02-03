<script setup lang="ts">
    import { onMounted, onUnmounted, nextTick, ref } from 'vue';

    const containerRef = ref<HTMLElement | null>(null);
    let resizeObserver: ResizeObserver | null = null;

    // 計算並設定單個項目高度
    const resizeGridItem = (item: HTMLElement) => {
        const grid = containerRef.value;
        if (!grid) return;

        const rowHeight = parseInt(window.getComputedStyle(grid).getPropertyValue('grid-auto-rows'));
        const rowGap = parseInt(window.getComputedStyle(grid).getPropertyValue('grid-row-gap'));

        // 對應 brick 元件的下一層
        const content = item.querySelector('.masonry-brick > div');

        if (!content) return;

        // 取得內容實際高度 (包含 padding)
        const contentHeight = content.getBoundingClientRect().height;

        // 計算需要跨越幾格
        const rowSpan = Math.ceil((contentHeight + rowGap) / (rowHeight + rowGap));

        item.style.gridRowEnd = `span ${rowSpan}`;
    };

    // 重算所有項目
    const resizeAllGridItems = () => {
        if (!containerRef.value) return;
        const allItems = Array.from(containerRef.value.children) as HTMLElement[];

        allItems.forEach((item) => {
            resizeGridItem(item);
        });
    };

    onMounted(() => {
        // 初始計算
        resizeAllGridItems();

        // 監聽視窗縮放
        window.addEventListener('resize', resizeAllGridItems);

        // [修正 2] 加入 ResizeObserver 自動監聽卡片高度變化
        // 這會解決圖片載入後高度改變，導致版面重疊的問題
        resizeObserver = new ResizeObserver(() => {
            resizeAllGridItems();
        });

        // 監聽容器內的變化 (如果有卡片被加入或高度改變)
        if (containerRef.value) {
            // 觀察容器本身大小變化
            resizeObserver.observe(containerRef.value);

            // 觀察每一個子元素 (卡片) 的大小變化
            const allItems = Array.from(containerRef.value.children);
            allItems.forEach(item => resizeObserver!.observe(item));
        }
    });

    onUnmounted(() => {
        window.removeEventListener('resize', resizeAllGridItems);
        if (resizeObserver) resizeObserver.disconnect();
    });
</script>

<template>
    <article class="masonry-layout" ref="containerRef">
        <slot />
    </article>
</template>

<style lang="scss">
    .masonry-layout {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));

        /* 這個數值越小，精確度越高，建議設小一點 */
        grid-auto-rows: 5px;
        gap: 20px;
        padding: 30px 0;
    }
</style>