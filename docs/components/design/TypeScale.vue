<script setup lang="ts">
const typeScales = [
    { name: 'H1', var: '--font-size-h1', label: 'Heading 1', sample: 'The quick brown fox' },
    { name: 'H2', var: '--font-size-h2', label: 'Heading 2', sample: 'The quick brown fox' },
    { name: 'Normal', var: '--font-size-normal', label: 'Body Text', sample: 'The quick brown fox jumps over the lazy dog' },
    { name: 'Remark', var: '--font-size-remark', label: 'Remark / Small', sample: 'The quick brown fox jumps over the lazy dog' },
];

const fontFamilies = [
    { name: 'Base', var: '--vp-font-family-base' },
    { name: 'Mono', var: '--vp-font-family-mono' },
];
</script>

<template>
    <div class="type-system">
        <div class="section">
            <h3>Type Scale</h3>
            <div class="type-scale-list">
                <div v-for="scale in typeScales" :key="scale.name" class="type-item">
                    <div class="type-meta">
                        <span class="type-name">{{ scale.name }}</span>
                        <code class="type-var">{{ scale.var }}</code>
                    </div>
                    <div class="type-sample" :style="{ fontSize: `var(${scale.var})` }">
                        {{ scale.sample }}
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <h3>Font Families</h3>
            <div class="font-family-list">
                <div v-for="font in fontFamilies" :key="font.name" class="font-item">
                    <div class="font-meta">
                        <span class="font-name">{{ font.name }}</span>
                        <code class="font-var">{{ font.var }}</code>
                    </div>
                    <div class="font-sample" :style="{ fontFamily: `var(${font.var})` }">
                        ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>
                        abcdefghijklmnopqrstuvwxyz<br>
                        0123456789
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.type-system {
    display: flex;
    flex-direction: column;
    gap: 3rem;
    margin: 1.5rem 0;
}

.section {
    h3 {
        margin-bottom: 1.5rem;
        font-size: 1.25rem;
        font-weight: 600;
    }
}

.type-scale-list, .font-family-list {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.type-item, .font-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--vp-c-divider);

    &:last-child {
        border-bottom: none;
    }
}

.type-meta, .font-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.type-name, .font-name {
    font-weight: 600;
    min-width: 60px;
}

.type-var, .font-var {
    font-size: 0.75rem;
    color: var(--vp-c-text-2);
}

.type-sample {
    line-height: 1.5;
    color: var(--vp-c-text-1);
}

.font-sample {
    font-size: 1.25rem;
    line-height: 1.6;
    word-break: break-all;
    color: var(--vp-c-text-1);
}
</style>
