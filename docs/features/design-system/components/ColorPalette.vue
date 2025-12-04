<script setup lang="ts">
    interface Props {
        category: 'brand' | 'functional' | 'neutral';
    }

    const props = defineProps<Props>();

    const colors = computed(() => {
        switch (props.category) {
            case 'brand':
                return [
                    { name: 'Brand 1', var: '--vp-c-brand-1', hex: '#dc8419' },
                    { name: 'Brand 2', var: '--vp-c-brand-2', hex: '#cd8f42' },
                    { name: 'Brand 3', var: '--vp-c-brand-3', hex: '#c7975d' },
                    { name: 'Brand Soft', var: '--vp-c-brand-soft', hex: 'rgba(234, 182, 119, 14%)' },
                    { name: 'Primary', var: '--color-primary', hex: '#FF7B00' },
                    { name: 'Primary Light', var: '--color-primary-light', hex: '#FFA100' },
                    { name: 'Primary Dark', var: '--color-primary-dark', hex: '#853D14' },
                ];
            case 'functional':
                return [
                    { name: 'Success', var: '--color-success', hex: '#03A61C' },
                    { name: 'Warning', var: '--color-warning', hex: '#FAAD14' },
                    { name: 'Error', var: '--color-error', hex: '#F23005' },
                    { name: 'Info', var: '--color-info', hex: '#1890FF' },
                    { name: 'Link', var: '--color-link', hex: '#853D14' },
                ];
            case 'neutral':
                return [
                    { name: 'Title', var: '--color-title', hex: '#1F1F1F' },
                    { name: 'Text', var: '--color-text', hex: '#595959' },
                    { name: 'Text Light', var: '--color-text-light', hex: '#BFBFBF' },
                    { name: 'Border Box', var: '--color-border-box', hex: '#D9D9D9' },
                    { name: 'View Block', var: '--color-view-block', hex: '#F2F2F2' },
                    { name: 'Extreme', var: '--color-extreme', hex: '#000000' },
                    { name: 'Extreme Reverse', var: '--color-extreme-reverse', hex: '#FFFFFF' },
                ];
            default:
                return [];
        }
    });

    const copiedColor = ref<string | null>(null);

    const copyColor = (color: { hex: string, var: string }) => {
        navigator.clipboard.writeText(color.hex).then(() => {
            copiedColor.value = color.hex;
            setTimeout(() => {
                copiedColor.value = null;
            }, 1500);
        });
    };
</script>

<template>
    <div class="color-palette">
        <div
            v-for="color in colors"
            :key="color.name"
            class="color-palette__item"
            @click="copyColor(color)"
        >
            <div class="color-palette__swatch">
                <div class="color-swatch" :style="{ backgroundColor: `var(${color.var})` }"></div>
                <div class="copy-overlay" :class="{ 'show': copiedColor === color.hex }">
                    <span>Copied!</span>
                </div>
            </div>
            <div class="color-palette__info">
                <span class="color-name">{{ color.name }}</span>
                <code class="color-var">{{ color.var }}</code>
                <span class="color-hex">{{ color.hex }}</span>
            </div>
        </div>
    </div>
</template>

<style lang="scss">
    .color-palette {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1.5rem;
        margin: 1.5rem 0;

        &__item {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            cursor: pointer;
            transition: transform 0.2s;

            &:hover {
                transform: translateY(-2px);
            }
        }

        &__swatch {
            position: relative;
            width: 100%;
            height: 80px;

            .color-swatch {
                width: 100%;
                height: 100%;
                border: 1px solid var(--vp-c-divider);
                border-radius: 8px;
                box-shadow: 0 2px 4px rgb(0,0,0,5%);
            }

            .copy-overlay {
                position: absolute;
                top: 0;
                left: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgb(0, 0, 0, 60%);
                width: 100%;
                height: 100%;
                border-radius: 8px;
                pointer-events: none;
                transition: opacity 0.2s;
                opacity: 0;

                span {
                    color: white;
                    font-size: 0.875rem;
                    font-weight: 600;
                }

                &.show {
                    opacity: 1;
                }
            }
        }

        &__info {
            display: flex;
            flex-direction: column;
            font-size: 0.875rem;

            .color-name {
                color: var(--vp-c-text-1);
                font-weight: 600;
            }

            .color-var {
                margin: 2px 0;
                color: var(--vp-c-text-2);
                font-size: 0.75rem;
            }

            .color-hex {
                color: var(--vp-c-text-3);
                font-family: var(--vp-font-family-mono);
                font-size: 0.75rem;
            }
        }
    }
</style>
