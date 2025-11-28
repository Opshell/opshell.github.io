<script setup lang="ts">
import { ref } from 'vue';
import ColorPalette from './ColorPalette.vue';
import TypeScale from './TypeScale.vue';
import IconGallery from './IconGallery.vue';

const activeTab = ref('colors');

const tabs = [
    { id: 'colors', label: 'Colors', icon: 'palette' },
    { id: 'typography', label: 'Typography', icon: 'text_fields' },
    { id: 'icons', label: 'Icons', icon: 'grid_view' },
    { id: 'components', label: 'Components', icon: 'widgets' }
];
</script>

<template>
    <div class="design-system-container">
        <!-- Hero Section -->
        <div class="hero">
            <div class="hero-content">
                <h1 class="hero-title">Design System</h1>
                <p class="hero-subtitle">
                    The visual language and foundation of Opshell's Blog.
                </p>
            </div>
            <div class="hero-bg"></div>
        </div>

        <!-- Navigation -->
        <div class="nav-container">
            <div class="tabs">
                <button
                    v-for="tab in tabs"
                    :key="tab.id"
                    class="tab-button"
                    :class="{ active: activeTab === tab.id }"
                    @click="activeTab = tab.id"
                >
                    <span class="tab-label">{{ tab.label }}</span>
                </button>
                <div class="tab-indicator" :style="{ transform: `translateX(${tabs.findIndex(t => t.id === activeTab) * 100}%)` }"></div>
            </div>
        </div>

        <!-- Content Area -->
        <div class="content-area">
            <Transition name="fade" mode="out-in">
                <div v-if="activeTab === 'colors'" class="tab-pane" key="colors">
                    <div class="section-header">
                        <h2>Colors</h2>
                        <p>Our color palette defines the brand identity and communicates state.</p>
                    </div>

                    <div class="palette-group">
                        <h3>Brand Colors</h3>
                        <ColorPalette category="brand" />
                    </div>
                    <div class="palette-group">
                        <h3>Functional Colors</h3>
                        <ColorPalette category="functional" />
                    </div>
                    <div class="palette-group">
                        <h3>Neutral Colors</h3>
                        <ColorPalette category="neutral" />
                    </div>
                </div>

                <div v-else-if="activeTab === 'typography'" class="tab-pane" key="typography">
                    <div class="section-header">
                        <h2>Typography</h2>
                        <p>Clear and legible typography for optimal reading experience.</p>
                    </div>
                    <div class="card">
                        <TypeScale />
                    </div>
                </div>

                <div v-else-if="activeTab === 'icons'" class="tab-pane" key="icons">
                    <div class="section-header">
                        <h2>Icons</h2>
                        <p>A collection of symbols to guide users and save space.</p>
                    </div>
                    <div class="card">
                        <IconGallery />
                    </div>
                </div>

                <div v-else-if="activeTab === 'components'" class="tab-pane" key="components">
                    <div class="section-header">
                        <h2>Components</h2>
                        <p>Reusable building blocks for creating consistent interfaces.</p>
                    </div>
                    <div class="card component-card">
                        <p>Explore our library of atomic components.</p>
                        <a href="./components" class="cta-button">View Components Library &rarr;</a>
                    </div>
                </div>
            </Transition>
        </div>
    </div>
</template>

<style scoped lang="scss">
.design-system-container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding-bottom: 4rem;
}

/* Hero Section */
.hero {
    position: relative;
    padding: 6rem 2rem 4rem;
    text-align: center;
    overflow: hidden;
    margin-bottom: 3rem;
    border-radius: 0 0 2rem 2rem;
    background: linear-gradient(135deg, var(--vp-c-bg-soft) 0%, var(--vp-c-bg) 100%);
}

.hero-title {
    font-size: 3.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin-bottom: 1rem;
    background: linear-gradient(120deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    line-height: 1.1;
}

.hero-subtitle {
    font-size: 1.25rem;
    color: var(--vp-c-text-2);
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
}

/* Navigation */
.nav-container {
    display: flex;
    justify-content: center;
    margin-bottom: 4rem;
    padding: 0 1rem;
}

.tabs {
    position: relative;
    display: flex;
    background: var(--vp-c-bg-soft);
    padding: 0.5rem;
    border-radius: 1rem;
    box-shadow: 0 4px 6px rgba(0,0,0,0.02);
}

.tab-button {
    position: relative;
    z-index: 1;
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    color: var(--vp-c-text-2);
    background: none;
    border: none;
    cursor: pointer;
    transition: color 0.3s ease;
    min-width: 120px;

    &:hover {
        color: var(--vp-c-text-1);
    }

    &.active {
        color: var(--vp-c-brand-1);
    }
}

.tab-indicator {
    position: absolute;
    top: 0.5rem;
    left: 0.5rem;
    width: calc(25% - 0.25rem); /* Assumes 4 tabs */
    height: calc(100% - 1rem);
    background: var(--vp-c-bg);
    border-radius: 0.75rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Content Area */
.content-area {
    padding: 0 2rem;
}

.section-header {
    text-align: center;
    margin-bottom: 3rem;

    h2 {
        font-size: 2.5rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
        border: none;
    }

    p {
        font-size: 1.125rem;
        color: var(--vp-c-text-2);
    }
}

.card {
    background: var(--vp-c-bg-soft);
    border-radius: 1.5rem;
    padding: 2rem;
    border: 1px solid var(--vp-c-divider);
}

.component-card {
    text-align: center;
    padding: 4rem 2rem;
}

.cta-button {
    display: inline-block;
    margin-top: 1.5rem;
    padding: 0.75rem 1.5rem;
    background: var(--vp-c-brand-1);
    color: white;
    font-weight: 600;
    border-radius: 0.5rem;
    text-decoration: none;
    transition: background 0.2s;

    &:hover {
        background: var(--vp-c-brand-2);
    }
}

.palette-group {
    margin-bottom: 3rem;

    h3 {
        font-size: 1.5rem;
        margin-bottom: 1.5rem;
        color: var(--vp-c-text-1);
    }
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from {
    opacity: 0;
    transform: translateY(10px);
}

.fade-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

@media (max-width: 768px) {
    .hero-title {
        font-size: 2.5rem;
    }

    .tabs {
        flex-direction: column;
        width: 100%;
        background: none;
        box-shadow: none;
        padding: 0;
    }

    .tab-button {
        width: 100%;
        text-align: left;
        padding: 1rem;
        border-bottom: 1px solid var(--vp-c-divider);
        border-radius: 0;

        &.active {
            color: var(--vp-c-brand-1);
            background: var(--vp-c-bg-soft);
        }
    }

    .tab-indicator {
        display: none;
    }
}
</style>
