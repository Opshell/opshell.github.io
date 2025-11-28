<script setup lang="ts">
import { ref } from 'vue';

const icons = [
    'add_circle',
    'calendar_month',
    'call',
    'check_circle',
    'css',
    'figma',
    'folder',
    'html',
    'illustrator',
    'info',
    'ios_share',
    'javascript',
    'language',
    'laravel',
    'lightbulb',
    'link',
    'location_on',
    'mail',
    'notifications_active',
    'pageview',
    'photoshop',
    'php',
    'report',
    'scss',
    'settings',
    'sql',
    'star_empty',
    'star_fall',
    'star_half',
    'typescript',
    'vite',
    'vue',
    'warning',
    'zoom_in_map',
    'zoom_out_map'
];

const copiedIcon = ref<string | null>(null);

const copyIconName = (icon: string) => {
    navigator.clipboard.writeText(icon).then(() => {
        copiedIcon.value = icon;
        setTimeout(() => {
            copiedIcon.value = null;
        }, 1500);
    });
};
</script>

<template>
    <div class="icon-gallery">
        <div
            v-for="icon in icons"
            :key="icon"
            class="icon-item"
            @click="copyIconName(icon)"
        >
            <div class="icon-preview">
                <img :src="`/icons/${icon}.svg`" :alt="icon" />
                <div class="copy-overlay" :class="{ 'show': copiedIcon === icon }">
                    <span>Copied!</span>
                </div>
            </div>
            <span class="icon-name">{{ icon }}</span>
        </div>
    </div>
</template>

<style scoped lang="scss">
.icon-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 1.5rem;
    margin: 1.5rem 0;
}

.icon-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid var(--vp-c-bg-soft);
    transition: all 0.2s;

    &:hover {
        background-color: var(--vp-c-bg-soft);
        transform: translateY(-2px);
    }
}

.icon-preview {
    position: relative;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
}

.copy-overlay {
    position: absolute;
    top: -50%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    padding: 4px 8px;
    border-radius: 4px;
    white-space: nowrap;
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
    z-index: 10;

    span {
        color: white;
        font-size: 0.75rem;
        font-weight: 600;
    }

    &.show {
        opacity: 1;
    }
}

.icon-name {
    font-size: 0.875rem;
    color: var(--vp-c-text-2);
    text-align: center;
    word-break: break-word;
}
</style>
