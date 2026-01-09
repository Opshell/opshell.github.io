<script setup lang="ts">
    withDefaults(
        defineProps<{
            label?: string
            val?: string | number
        }>(),
        {
            label: '',
            val: ''
        }
    );

    const data = defineModel<string | number>({ default: '' });
</script>

<template>
    <q-radio
        v-model="data"
        class="el-radio"

        :label
        :val
    >
        <slot />
    </q-radio>
</template>

<style lang="scss">
    .el-radio {
        .q-radio__inner--truthy {
            color: var(--color-primary-1);
            .q-radio__bg {
                border-color: var(--color-primary-1);
            }
        }
        .q-radio__bg {
            background: var(--color-gray-000);
            border: 1px solid var(--color-gray-200);
            border-radius: 100%;
            font-size: 18px;
            path:not(.q-radio__check) { // 捨棄原先的svg circle
                display: none;
            }
        }
        .q-radio {
            &__label {
                color: var(--color-gray-900);
                font-weight: 400;
                transform: translateX(-5px) translateY(1px);
            }
        }
    }

    body.desktop .el-radio:not(.disabled) .q-radio__inner::before {
        background: var(--color-primary-light);
    }
</style>
