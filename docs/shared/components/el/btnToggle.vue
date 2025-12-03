<script setup lang="ts">
    const data = defineModel<boolean>({ default: false });
</script>

<template>
    <q-btn-toggle
        v-model="data"
        class="el-btn-toggle"
        no-caps
        unelevated
        toggle-color="toggle-active"
        :options="[
            { label: 'OFF', value: false },
            { label: 'ON', value: true },
        ]"
    />
</template>

<style lang="scss">
    .el-btn-toggle {
        background: var(--color-view-block);
        border-radius: 5px;

        .q-btn {
            @include setSize(40px, 30px);
            min-height: inherit;
            color: var(--color-text-light);
            line-height: 1;

            &.bg-toggle-active {
                background: var(--color-extreme-reverse);
                border: 1px solid var(--color-border-box);
                border-radius: 5px;
                color: var(--color-primary) !important;
            }

            &__content {
                transform: translateY(1px);
            }
        }
    }
</style>
