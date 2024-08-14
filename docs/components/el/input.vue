<script setup lang="ts">
    const data = defineModel<string | number>({ default: ''});
</script>

<template>
    <q-input
        class="el-input"
        v-model="data"
        v-bind="$attrs"
    >
        <template v-if="$slots.icon" #append>
            <slot name="icon"></slot>
        </template>
    </q-input>
</template>

<style lang="scss">
    .el-input,
    .q-textarea {
        @include setSize(100%, 45px);

        .q-field {
            &__inner,
            &__control {
                height: 100%;
            }

            &__control { // 主外殼
                background: var(--color-extreme-reverse);
                padding: 0 5px 0 15px;

                border: 1px solid var(--color-border-box);
                border-radius: 5px;
                transition: .2s $cubic-FiSo;
                &::before,
                &::after {
                    display: none;
                }
            }

            &__native { // input 本體
                background: transparent;
                accent-color: transparent;
                padding: 12px 0;
            }

            &__marginal { // icon
                @include setFlex();
                height: 100%;
                padding: 5px 0 5px 8px;
                .icon {
                    background: transparent;
                    border-radius: 5px;
                    transition: .2s $cubic-FiSo;
                }
            }
        }

        &:hover:not(.q-field--disabled) {
            .q-field__native,
            .q-field__prefix,
            .q-field__suffix {
                color: var(--color-primary);
            }

            .icon {
                fill: var(--color-hover-light);
            }

            .q-field__control{
                border-color: var(--color-hover-light);
            }
        }

        // [M] 狀態
        &.q-field {
            &--focused {
                .q-field {
                    &__control {
                        border-color: var(--color-primary);
                        box-shadow: 0 0 0 2px var(--color-hover-light);
                    }

                    &__marginal {
                        color: var(--color-primary);
                        fill: var(--color-primary);
                        .icon {
                            background: var(--color-hover-light);
                            color: var(--color-primary);
                            fill: var(--color-primary);
                        }
                    }
                }
            }

            &--disabled {
                .q-field {
                    &__control {
                        background: var(--color-view-block);
                    }
                }
            }
        }

        &.close:not(.q-field--focused):not(.q-field--float){
            max-width: 45px;
            .q-field {
                &__control,
                &__native,
                &__marginal {
                    padding: 0;
                }
                &__control {
                    border-width: 0;
                }
            }

            .icon {
                background: var(--color-view-block);
                @include setSize(45px, 45px);
                padding: 5px;
                // border-color: transparent;
            }
        }
    }
    .q-textarea {
        height: auto;
    }
</style>
