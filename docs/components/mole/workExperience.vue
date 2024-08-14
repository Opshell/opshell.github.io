<script setup lang="ts">
    import { withBase } from 'vitepress';

    defineProps<{
        compImg: string
        company: string
        location: string
        jobTitle: string
        period: string
        description: string
    }>();

    // 做一個可以開關的description 區塊
    const descriptionDom = ref<HTMLElement | null>(null);
    const descriptionHeight = ref(0);

    const isOpen = ref(false);
    function triggerHandler() {
        if (descriptionDom.value) {
            if (isOpen.value) {
                descriptionDom.value.style.height = '0';
            }
            else {
                descriptionDom.value.style.height = `${descriptionHeight.value}px`;
            }
        }

        isOpen.value = !isOpen.value;
    }

    onMounted(async () => {
        if (descriptionDom.value) {
            descriptionHeight.value = descriptionDom.value.clientHeight;

            descriptionDom.value.style.height = '0';
        }
    });
</script>

<template>
    <section
        class="work-experience-box"
        :class="{ '--is-open': isOpen }"
        @click="triggerHandler"
    >
        <header class="work-experience">
            <div class="img-box">
                <img :src="withBase(compImg)" alt="" />
            </div>

            <h3 class="company">
                {{ company }}
            </h3>
            <div class="location">
                <ElSvgIcon name="location_on" />
                <span>{{ location }}</span>
            </div>
            <span class="job-title">{{ jobTitle }}</span>
            <span class="period">{{ period }}</span>
        </header>

        <p
            ref="descriptionDom"
            class="description"
            v-html="description"
        />
    </section>
</template>

<style lang="scss">
    .work-experience-box {
        position: relative;
        width: 100%;
        cursor: pointer;
        transition: .2s $cubic-FiSo;
        .work-experience {
            display: grid;
            grid-template-areas: "img-box compnay   location"
                                 "img-box job-title period";
            grid-template-columns: 110px repeat(2, 1fr);
            gap: 10px;

            // grid area
            .img-box {
                grid-area: img-box;
                background: #FFF;
                @include setSize(100px, 100px);
                padding: 2px;
                border: 2px solid #666;
                border-radius: 10px;
            }
            .company {
                grid-area: compnay;
                @include setFlex(flex-start);

                /* 主色-黃 */
                color: #4AA985;
                font-family: Poppins;
                font-size: 28px;
                font-weight: 700;
                font-style: normal;
                line-height: 42px;
                letter-spacing: 0.03em;
                transition: .25s $cubic-FiSo;
            }
            .location {
                grid-area: location;
                @include setFlex(flex-end);

                // text style
                color: #4AA985;
                font-family: Inter;
                font-size: 20px;
                font-weight: 500;
                font-style: normal;
                line-height: 32px;

                .icon {
                    fill: #4AA985;
                }
            }
            .job-title {
                grid-area: job-title;
                @include setFlex(flex-start);
            }
            .period {
                grid-area: period;
                @include setFlex(flex-end);
            }

            .job-title ,
            .period {
                color: #666;

                /* Front-End Developer */
                font-family: Poppins;
                font-size: 1.375rem;
                font-weight: 700;
                font-style: normal;
                line-height: 2rem;
            }
        }

        .description {
            width: 100%;
            padding: 0 0 0 120px;
            box-sizing: border-box;

            /* 6666 */
            color: #666;
            font-family: Roboto;
            font-size: 1.125rem;
            font-weight: 400;
            font-style: normal;
            line-height: 1.625rem;
            letter-spacing: 0.03em;
            transition: .2s $cubic-FiSo;
            overflow: hidden;
        }

        &::before {
            content: '';
            position: absolute;
            inset: -20px;
            display: block;
            background: #f7f7f7;
            @include setSize(calc(100% + 2.5rem), calc(100% + 2.5rem));
            border-radius: 10px;
            transition: .3s $cubic-FiSo;
            opacity: 0;
            z-index: -1;
        }

        // 狀態
        &:hover {
            &::before {
                opacity: 1;
            }
            .work-experience {
                .company {
                    color: #FFC000;
                }
            }
        }

        &.--is-open {
            .img-box {
                border-color: #FFC000;
            }
            .company {
                color: #FFC000;
            }
            .description {
                margin: 1.875rem 0;
            }
        }

        ~ .work-experience-box {
            padding-top: 40px;
            border-top: 1px solid #ccc;
            margin-top: 20px;

            &::before {
                inset: 20px -20px -20px;
                height: 100%;
            }
        }
    }
</style>
