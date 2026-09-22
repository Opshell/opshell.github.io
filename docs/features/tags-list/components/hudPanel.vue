<script setup lang="ts">
    import { ref, computed } from 'vue';

    const { title, icon="bookmark_stacks", side } = defineProps<{
        title: string;
        icon?: string; //  ElSvgIcon name
        side?: 'left' | 'right'; // 決定縮起來時靠哪邊
    }>();

    const isCollapsed = ref(false);

    const toggleCollapse = () => {
        isCollapsed.value = !isCollapsed.value;
    };

    // 計算縮起時的 class
    const containerClass = computed(() => ({
        'is-collapsed': isCollapsed.value,
        [`side-${ side || 'left' }`]: true
    }));
</script>

<template>
    <section class="hud-panel" :class="containerClass">
        <header class="hud-panel__header" @click="toggleCollapse">
            <div class="hud-panel__header-icon" :class="{ active: isCollapsed }">
                <ElSvgIcon :name="icon" />
            </div>
            <h2 v-show="!isCollapsed" class="hud-panel__header-title">
                {{ title }}
            </h2>
            <div class="hud-panel__header-decor">
                <div class="minimize-btn" :class="{ active: isCollapsed }"></div>
            </div>
        </header>

        <Transition name="cyber-slide">
            <div v-show="!isCollapsed" class="hud-panel__content">
                <div class="scan-line" />
                <slot />
            </div>
        </Transition>
    </section>
</template>

<style lang="scss" scoped>
    $hud-primary: #00f0ff;
    $hud-bg: rgb(0, 10, 20, 85%);
    $hud-border: rgb(0, 240, 255, 50%);

    .hud-panel {
        position: relative;
        background: $hud-bg;
        backdrop-filter: blur(8px);

        // 科幻切角
        clip-path: polygon(
            0 0,
            100% 0,
            100% calc(100% - 10px),
            calc(100% - 10px) 100%,
            0 100%
        );
        border: 1px solid $hud-border;
        margin-bottom: 1rem;
        transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
        overflow: hidden;
        filter: drop-shadow(0 0 2px rgb(0, 240, 255, 50%));

        // 右下切角邊框
        &::before {
            content: '';
            position: absolute;
            right: -1px;
            bottom: -1px;
            background: linear-gradient(
                to top left,
                transparent 28%,
                $hud-border 28%,
                $hud-border 30%,
                transparent 30%
            );
            clip-path: polygon(100% 0, 100% 100%, 0 100%); // 三角形
            width: 20px; height: 20px;
        }



        // 縮起狀態
        &.is-collapsed {
            // clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); // 取消切角以適應小方塊
            @include setSize(48px, 48px);
            cursor: pointer;

            .hud-panel {
                &__header {
                    height: 100%;

                    &::after {
                        content: '';
                        position: absolute;
                        top: 100%;
                        left: 100%;
                        background: $hud-primary;
                        clip-path: polygon(100% 0 , 100% 100%, 0 100%);
                        width: 10px; height: 10px;
                        transition: all 0.3s;
                    }
                }

                &__content {

                }
            }

            // 如果在右側，縮起時要靠右對齊 (這部分需要父層 flex 設定配合，或這裡用 align-self)
            &.side-right {
                margin-left: auto;
            }
        }

        &__header {
            @include setFlex(space-between, center, 8px);
            background: rgb(0, 240, 255, 10%);
            height: auto;
            padding: 5px 8px;
            border-bottom: 1px solid rgb(0, 240, 255, 30%);
            cursor: pointer;
            user-select: none;

            &:hover {
                background: rgb(0, 240, 255, 20%);
                .panel-title { text-shadow: 0 0 8px $hud-primary; }
            }

            &-icon {
                // 做个切角的 clip
                clip-path: polygon(
                    20% 0%,
                    100% 0,
                    100% 20%, 100% 80%, 80% 100%, 0 100%, 0% 80%, 0% 20%);
                color: $hud-primary;
            }

            &-title {
                flex: 1;
                gap: 10px;
                color: $hud-primary;
                font-family: Orbitron, 'Courier New', monospace; // 建議引入 Google Fonts
                font-size: 0.9rem;
                font-weight: 700;
                letter-spacing: 1px;
                white-space: nowrap;
                text-transform: uppercase;
                transition: all 0.3s;
            }

            &-decor {
                .minimize-btn {
                    background: $hud-primary;
                    width: 12px;
                    height: 2px;
                    transition: transform 0.3s;

                    &.active {
                        background: #f05; // 關閉變成警示色
                    }
                }
            }
        }

        &__content {
            position: relative;
            background-image: radial-gradient(rgb(0,240,255,10%) 1px, transparent 0);
            background-size: 12px 12px;
            padding: 15px;
            color: #fff;

            &::before {
                content: '';
                position: absolute;
                top: 4px;
                left: 4px;
                background: $hud-primary;
                clip-path: polygon(0 0, 0% 100%, 100% 0);
                width: 10px; height: 10px;
                transition: all 0.3s;
            }

            .scan-line {
                position: absolute;
                top: 0; left: 0;
                background: rgb(0, 240, 255, 50%); width: 100%; height: 2px;
                pointer-events: none;
                animation: scan 3s linear infinite;
                opacity: 0.3;
            }
        }
    }

    // 動畫
    @keyframes scan {
        0% {
            top: 0;
            opacity: 0;
        }
        50% { opacity: 0.5; }
        100% {
            top: 100%;
            opacity: 0;
        }
    }

    // Vue Transition
    .cyber-slide-enter-active,
    .cyber-slide-leave-active {
        max-height: 500px; // 給個足夠的高度
        transition: all 0.3s ease-out;
        opacity: 1;
    }

    .cyber-slide-enter-from,
    .cyber-slide-leave-to {
        max-height: 0;
        padding-top: 0;
        padding-bottom: 0;
        opacity: 0;
    }
</style>