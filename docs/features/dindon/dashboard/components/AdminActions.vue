<script setup lang="ts">
    // 分頁把「這一頁的操作」（重新整理、新增、快速審核…）送進後台頁首的右邊（2026-10 翻新）。
    // 篩選條件留在內容裡：它們管的是底下那張表，操作才放頁首。
    // defer：頁首跟分頁在同一輪畫出來，等這一輪畫完才去找 #dd-admin-actions，不然第一次會找不到
</script>

<template>
    <Teleport defer to="#dd-admin-actions">
        <slot />
    </Teleport>
</template>
