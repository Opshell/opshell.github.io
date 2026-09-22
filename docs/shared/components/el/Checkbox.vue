<script setup lang="ts">
    const data = defineModel();
</script>

<template>
    <q-checkbox
        v-model="data"
        class="el-checkbox"

        v-bind="$attrs"
    />
</template>

<style lang="scss">
    .el-checkbox {
        .q-checkbox {
            &__bg {
                background: var(--color-gray-000);
                border: 1px solid var(--color-gray-200);
                border-radius: 5px;
                .q-checkbox__svg {
                    padding: 2px;
                }
            }
            &__label {
                color: var(--color-gray-900);
                font-weight: 400;
                transform: translateX(-5px);
            }

            &__inner {
                &--truthy,
                &--indet {
                    .q-checkbox__bg {
                        background: var(--color-primary-1);
                        border-color: var(--color-primary-1);
                    }
                }
            }
        }
    }

    body.desktop .el-checkbox:not(.disabled) .q-checkbox__inner::before {
        background: var(--color-primary-light);
    }
</style>
