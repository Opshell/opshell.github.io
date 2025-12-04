<template>
    <div class="el-card">
        <slot />
    </div>
</template>

<style lang="scss" scoped>
.el-card {
    background: var(--vp-c-bg);
    border: 1px solid var(--vp-c-divider);
    border-radius: 8px;
    padding: 16px;
    transition: border-color 0.25s;

    &:hover {
        border-color: var(--vp-c-brand);
    }
}
</style>
