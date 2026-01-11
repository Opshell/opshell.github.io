<script setup lang="ts">
    import { useData } from 'vitepress';

    const { frontmatter, page, isDark } = useData();

    interface Props {
        category: 'brand' | 'gray' | 'functional' | 'mdtag';
    }

    const props = defineProps<Props>();

    const colors = computed(() => {
        switch (props.category) {
            case 'brand':
                return [
                    { name: 'Primary 1', var: '--color-primary-1', hex: '#f4b936' },
                    { name: 'Primary 2', var: '--color-primary-2', hex: '#d8a72b' },
                    { name: 'Primary 3', var: '--color-primary-3', hex: '#b99436' },
                    { name: 'Primary soft', var: '--color-primary-soft', hex: 'rgb(185, 148, 54, 16%)', darkHex: '#c4882c' },

                    { name: 'Adorn', var: '--color-adorn', hex: '#bd34fe' },
                ];
            case 'gray':
                return [
                    { name: 'gray-000', var: '--color-gray-000', hex: '#FFF', darkHex: '#000' },
                    { name: 'gray-050', var: '--color-gray-050', hex: '#F7F7F7', darkHex: '#262626' },
                    { name: 'gray-100', var: '--color-gray-100', hex: '#ECECEC', darkHex: '#404040' },
                    { name: 'gray-200', var: '--color-gray-200', hex: '#D8D8D8', darkHex: '#6A6A6A' },
                    { name: 'gray-300', var: '--color-gray-300', hex: '#C4C4C4', darkHex: '#8C8C8C' },
                    { name: 'gray-400', var: '--color-gray-400', hex: '#A8A8A8', darkHex: '#A8A8A8' },
                    { name: 'gray-500', var: '--color-gray-500', hex: '#8C8C8C', darkHex: '#C4C4C4' },
                    { name: 'gray-600', var: '--color-gray-600', hex: '#6A6A6A', darkHex: '#D8D8D8' },
                    { name: 'gray-700', var: '--color-gray-700', hex: '#404040', darkHex: '#ECECEC' },
                    { name: 'gray-800', var: '--color-gray-800', hex: '#262626', darkHex: '#F7F7F7' },
                    { name: 'gray-900', var: '--color-gray-900', hex: '#000', darkHex: '#FFF' }
                ];
            case 'functional':
                return [
                    { name: 'Success', var: '--color-success', hex: '#03A61C' },
                    { name: 'Warning', var: '--color-warning', hex: '#FAAD14' },
                    { name: 'Error', var: '--color-error', hex: '#F23005' },
                    { name: 'Info', var: '--color-info', hex: '#1890FF' },
                ];
            case 'mdtag':
                return [
                    { name: 'typescript', var: '--color-mdtag-typescript', hex: '#3574d1', darkHex: '#509aff' },
                    { name: 'vue', var: '--color-mdtag-vue', hex: '#4AA985' },
                ];
            default:
                return [];
        }
    });

    const copiedColor = ref<string | null>(null);

    const copyColor = (color: { hex: string, darkHex?: string }) => {
        const targetHex = isDark.value
            ? (color.darkHex || color.hex)
            : color.hex;

        navigator.clipboard.writeText(targetHex).then(() => {
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
                <span class="color-hex">{{ isDark ? color.darkHex || color.hex : color.hex }}</span>
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
