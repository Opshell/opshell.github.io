<template>
    <span class="el-tag">
        <slot />
    </span>
</template>

<style lang="scss" scoped>
.el-tag {
    display: inline-flex;
    align-items: center;
    padding: 0 8px;
    height: 24px;
    border-radius: 4px;
    background: var(--vp-c-bg-alt);
    color: var(--vp-c-text-1);
    font-size: 0.875rem;
    line-height: 1;
    white-space: nowrap;
    border: 1px solid var(--vp-c-divider);
}
</style>
