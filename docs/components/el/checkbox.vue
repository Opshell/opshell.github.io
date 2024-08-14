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
                background: var(--color-extreme-reverse);
                border: 1px solid var(--color-border-box);
                border-radius: 5px;
                .q-checkbox__svg {
                    padding: 2px;
                }
            }
            &__label {
                color: var(--color-extreme);
                font-weight: 400;
                transform: translateX(-5px);
            }

            &__inner {
                &--truthy,
                &--indet {
                    .q-checkbox__bg {
                        background: var(--color-primary);
                        border-color: var(--color-primary);
                    }
                }
            }
        }
    }

    body.desktop .el-checkbox:not(.disabled) .q-checkbox__inner::before {
        background: var(--color-primary-light);
    }
</style>
