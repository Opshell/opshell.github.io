<script setup lang="ts">
<<<<<<<< HEAD:docs/features/design-system/components/DesignSystem.vue
    import ColorPalette from './ColorPalette.vue';
    import TypeScale from './TypeScale.vue';
    import IconGallery from './IconGallery.vue';
========
    import ColorPalette from './colorSeries.vue';
    import TypeScale from './typeScale.vue';
    import IconGallery from './iconGallery.vue';
>>>>>>>> 7c7f1e862d716573d4fc87e5f1e4bb2761c34231:docs/features/design-system/components/DesignSystem_back.vue

    const activeTab = ref('colors');

    const tabs = [
        { id: 'colors', label: 'Colors', icon: 'palette' },
        { id: 'typography', label: 'Typography', icon: 'text_fields' },
<<<<<<<< HEAD:docs/features/design-system/components/DesignSystem.vue
========
        { id: 'font', label: 'Font', icon: 'grid_view' },
        { id: 'animations', label: 'Animations', icon: 'grid_view' },
>>>>>>>> 7c7f1e862d716573d4fc87e5f1e4bb2761c34231:docs/features/design-system/components/DesignSystem_back.vue
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
                    歡迎來到 Opshell's Blog 的 Design System。這裡記錄了我使用的設計規範、色彩、排版以及可重用的 UI 組件。用來方便開發、調整。

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
                        <h3>Gray Colors</h3>
                        <ColorPalette category="gray" />
<<<<<<<< HEAD:docs/features/design-system/components/DesignSystem.vue
                    </div>
                    <div class="palette-group">
                        <h3>Functional Colors</h3>
                        <ColorPalette category="color" />
                    </div>
                    <div class="palette-group">
                        <h3>Status Colors</h3>
                        <ColorPalette category="functional" />
========
                    </div>
                    <div class="palette-group">
                        <h3>Status Colors</h3>
                        <ColorPalette category="functional" />
                    </div>
                    <div class="palette-group">
                        <h3>Community Colors</h3>
                        <ColorPalette category="community" />
                    </div>
                    <div class="palette-group">
                        <h3>Article Tag Colors</h3>
                        <ColorPalette category="mdtag" />
>>>>>>>> 7c7f1e862d716573d4fc87e5f1e4bb2761c34231:docs/features/design-system/components/DesignSystem_back.vue
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
    padding-bottom: 4rem;
    margin: 0 auto;
}

/* Hero Section */
.hero {
    position: relative;
    background: linear-gradient(135deg, var(--vp-c-bg-soft) 0%, var(--vp-c-bg) 100%);
    padding: 6rem 2rem 4rem;
    border-radius: 0 0 2rem 2rem;
    margin-bottom: 3rem;
    text-align: center;
    overflow: hidden;
}

.hero-title {
    background: linear-gradient(120deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
    -webkit-background-clip: text;
    background-clip: text;
    margin-bottom: 1rem;
    font-size: 3.5rem;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.02em;
    -webkit-text-fill-color: transparent;
}

.hero-subtitle {
    max-width: 600px;
    margin: 0 auto;
    color: var(--vp-c-text-2);
    font-size: 1.25rem;
    line-height: 1.6;
}

/* Navigation */
.nav-container {
<<<<<<<< HEAD:docs/features/design-system/components/DesignSystem.vue
    display: flex;
    justify-content: center;
    padding: 0 1rem;
    margin-bottom: 4rem;
========
    position: sticky;
    top: 65px;
    @include setFlex();
    background: var(--color-gray-000);
    width: 100%;
    padding: 1.25rem;
    margin-bottom: 2rem;
    z-index: 1;
>>>>>>>> 7c7f1e862d716573d4fc87e5f1e4bb2761c34231:docs/features/design-system/components/DesignSystem_back.vue
}

.tabs {
    position: relative;
    display: flex;
    background: var(--vp-c-bg-soft);
    padding: 0.5rem;
    border-radius: 1rem;
    box-shadow: 0 4px 6px rgb(0,0,0,2%);
}

.tab-button {
    position: relative;
    background: none;
    min-width: 120px;
    padding: 0.75rem 2rem;
    border: none;
    color: var(--vp-c-text-2);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: color 0.3s ease;
    z-index: 1;

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
    background: var(--vp-c-bg);
    width: calc(25% - 0.25rem); /* Assumes 4 tabs */
    height: calc(100% - 1rem);
    border-radius: 0.75rem;
    box-shadow: 0 2px 4px rgb(0,0,0,5%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Content Area */
.content-area {
    padding: 0 2rem;
}

.section-header {
    margin-bottom: 3rem;
    text-align: center;

    h2 {
        border: none;
        margin-bottom: 0.5rem;
        font-size: 2.5rem;
        font-weight: 700;
    }

    p {
        color: var(--vp-c-text-2);
        font-size: 1.125rem;
    }
}

.card {
    background: var(--vp-c-bg-soft);
    padding: 2rem;
    border: 1px solid var(--vp-c-divider);
    border-radius: 1.5rem;
}

.component-card {
    padding: 4rem 2rem;
    text-align: center;
}

.cta-button {
    display: inline-block;
    background: var(--vp-c-brand-1);
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    margin-top: 1.5rem;
    color: white;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.2s;

    &:hover {
        background: var(--vp-c-brand-2);
    }
}

.palette-group {
    margin-bottom: 3rem;

    h3 {
        margin-bottom: 1.5rem;
        color: var(--vp-c-text-1);
        font-size: 1.5rem;
    }
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from {
    transform: translateY(10px);
    opacity: 0;
}

.fade-leave-to {
    transform: translateY(-10px);
    opacity: 0;
}
@media (width <= 768px) {
    .hero-title {
        font-size: 2.5rem;
    }

    .tabs {
        flex-direction: column;
        background: none;
        width: 100%;
        padding: 0;
        box-shadow: none;
    }

    .tab-button {
        width: 100%;
        padding: 1rem;
        border-bottom: 1px solid var(--vp-c-divider);
        border-radius: 0;
        text-align: left;

        &.active {
            background: var(--vp-c-bg-soft);
            color: var(--vp-c-brand-1);
        }
    }

    .tab-indicator {
        display: none;
    }
}
</style>
