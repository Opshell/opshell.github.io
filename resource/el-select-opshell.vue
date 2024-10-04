<script setup lang="ts">
    interface Option<T> {
        title: string;
        value: T;
    }

    // 設定props type [透過 M 來判斷是否為多選 (決定資料型態是不是array)]
    interface iProps<T, M extends boolean | undefined> {
        modelValue: M extends true ? T[] | null : T | null;
        options: Option<T>[];
        disabled?: boolean;
        multiple?: M;
        unit?: string;
        parentDom?: string; // 下拉選單父層 [判斷距離用]
    }

    // [!] 要寫這一段後面才不會報錯 找時間在研究一下
    const withDefaults = <T, M extends boolean | undefined>(
        props: iProps<T, M>,
        defaults: Partial<iProps<T, M>>
    ): iProps<T, M> => {
        return Object.assign({}, defaults, props);
    };

    const props = withDefaults(defineProps<iProps<string | number, boolean>>(), {
        modelValue: null,
        disabled: false,
        options: [{title: '請選擇', value: '1'}],
        multiple: false,
        unit: '',
        parentDom: 'body'
    });

    const isOpen = ref(false);
    const direction: Ref<'up' | ''> = ref('');
    const horizontalDirection: Ref<'' | 'right'> = ref('');

    const selectDom = ref<HTMLElement | null>(null);
    const triggerSelect = () => {
        if (isOpen.value) {
            closeSelect();
        } else {
            openSelect();
        }
    };

    // [-]點擊外面關閉下拉選單
    const clickOutsideHandler = (event: MouseEvent) => {
        if (selectDom.value && !selectDom.value.contains(event.target as Node)) {
            closeSelect();
        }
    };
    // [-]下拉選單操作(暴露出去做總控)
    const openSelect = () => {
        if (!props.disabled) {
            isOpen.value = true;
            document.addEventListener('click', clickOutsideHandler);

            // 判斷下拉選單的方向
            const parentDom = selectDom.value?.closest(props.parentDom as string);
            if (parentDom) {
                const selectDomRect = selectDom.value?.getBoundingClientRect();
                const parentDomRect = parentDom.getBoundingClientRect();

                if (selectDomRect) { // 垂直邊界判斷
                    const optionsBoundary = selectDomRect.top + selectDomRect.height + 180 + 10;
                    const parentBoundary = parentDomRect.top + parentDomRect.height;

                    direction.value = optionsBoundary >  parentBoundary ? 'up' : '';
                }

                if (selectDomRect) { // 水平邊界判斷
                    const optionsBoundary = selectDomRect.left + selectDomRect.width + 10;
                    const parentBoundary = parentDomRect.left + parentDomRect.width;

                    horizontalDirection.value = optionsBoundary >  parentBoundary ? 'right' : '';
                }
            }
        }
    };
    const closeSelect = () => {
        isOpen.value = false;
        document.removeEventListener('click', clickOutsideHandler);
    };
    defineExpose({ openSelect, closeSelect, isOpen });
    watchEffect(() => { // 禁用的時候關起來
        if (props.disabled) { closeSelect(); }
    });

    // [-]目前選中的選項
    const option = computed(() => {
        let result = '';

        if (props.multiple) {
            const options = props.options.filter((item) => inArray(item.value, props.modelValue as string[]));

            result = options.map((item) => item.title).join('、');
        } else {
            const option = props.options.find((item) => item.value == props.modelValue);

            result = option?.title || '';
        }

        return result;
    });

    const emit = defineEmits<{
        'update:modelValue': [result: string | string[]]
    }>();

    // input值更新的時候，emit出去
    const updateModelValue = (event: Event) => {
        // 不斷言 HTMLInputElement的話 取值會有錯誤
        const target = event.target as HTMLInputElement;

        let result: string | string[] = target.value;

        // 關閉下拉選單
        if (!props.multiple) {
            isOpen.value = false;
        } else if (Array.isArray(props.modelValue)) {
            let oldAry = props.modelValue as string[];

            // 判斷 array 中有沒有這個值
            if (oldAry.includes(target.value)) { // 有的話就刪除
                oldAry = oldAry.filter((item) => item != target.value);
            } else { // 沒有的話就新增
                oldAry.push(target.value);
            }

            result = oldAry;
        }

        emit('update:modelValue', result);
    };

    const inArray = <T>(value: T, array: T[]): boolean => {
        return array.includes(value);
    };







</script>

<template>
    <div class="select" :class="{ open: isOpen, disabled }"
        ref="selectDom" role="select"
    >
        <div class="selected" :class="{empty: option === ''}" @click="triggerSelect" :title="option">
            <span class="text ellipsis">{{ option }}</span>
            <span v-if="unit != ''" class="unit">{{ unit }}</span>
            <ElSvgIcon class="arrow" name="arrow_drop_down" />
        </div>

        <div class="optionsBox" :class="[ direction, horizontalDirection ]">
            <div class="blankArea top"></div>

            <ul class="options">
                <li v-for="(item, i) in options" :key="`${item.title}_${i}`"
                    class="option"
                    :class="{current:
                        (!multiple && item.value == modelValue) ||
                        (multiple && inArray(item.value, modelValue as Array<typeof item.value>))
                        }"
                    :value="item.value.toString()"
                    @click="updateModelValue($event)"
                >{{ item.title }}</li>
            </ul>

            <div class="blankArea bottom"></div>
        </div>

    </div>
</template>

<style lang="scss">
    .select {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        position: relative;

        background: rgba(255, 255, 255, 0.95);
        @include setSize(100%, 55px);
        max-width: 400px;

        // min-width: 140px;

        padding: 8px 8px 8px 15px;
        border: 1px solid var(--fontColor);
        border-radius: 20px;
        font-size: 18px;
        backdrop-filter: blur(5px);
        -webkit-autofill: unset;
        transition: .05s $cubic-FiSo;
        &:focus {
            outline: 0;
            border-color: var(--themeColor);
        }
        &.open {
            border-color: var(--themeColor);
            z-index: 10;
            box-shadow: 0 0 5px 1px rgba(0, 0, 0, 0.25);
            .icon { transform:  rotateX(180deg) translate3d(8px, -2px, 0); }
            .optionsBox {
                opacity: 1;
                box-shadow: 0 0 5px 1px rgba(0, 0, 0, 0.25);
                z-index: 10;
                .options {
                    max-height: 150px;
                }
            }
        }
        &.disabled {
            background: #eee;
            padding: 8px 15px;
            border-color: #ddd;
            color: #666;
            cursor: not-allowed;

            .arrow { display: none; }
            .selected,
            .optionsBox { cursor: not-allowed; }
            .unit { transform: unset; }
            .selected {
                .text { margin: 0; }
                .unit {transform: translateX(0); }
            }
        }

        // 顯示被選區塊
        .selected {
            @include setFlex(space-between);
            @include setSize(100%, 100%);
            cursor: pointer;
            &.empty{ min-width: 80px; }
            .text {
                flex: 1;
                color: var(--themeColor);
                margin: 0 -8px 0 0; // 把icon translate掉的空間補回來 修正 ellipsis 判斷距離
            }
            .unit {
                color: var(--themeColor);
                user-select: none;
                transform: translateX(15px);
            }
            .icon {
                flex-shrink: 0;
                fill: var(--themeColor);
                @include setSize(35px, 35px);
                transform: translate3d(8px, 0, 0);
            }
        }

        // 選項列表
        .optionsBox {
            position: absolute;
            inset: 100% auto auto 0;

            background: #f4f4f4;
            // width: 100%;
            // height: 0;
            min-width: 100%;
            max-width: calc(100vw - 20px);
            // max-height: 0;
            padding: 0 2px 0 0;
            border: 1px solid #f4f4f4;
            border-radius: 20px;

            opacity: 0;
            transition: max-height .15s $cubic-FiSo;
            // z-index: 10;
            // transform: translateY(0);
            transform: translateY(10px);

            &.up {
                top: auto;
                bottom: 100%;
                transform: translateY(-10px);
            }
            &.right {
                left: auto;
                right: 0;
            }

            .blankArea {
                position: sticky;
                top: 0;
                height: 15px;
                &.bottom {
                    top: unset;
                    bottom: 0;
                }
            }
        }

        .options {
            // height: calc(100% - 30px);
            min-width: 100px;
            max-height: 0;
            list-style: none;

            overflow: auto;
            transition: max-height .15s $cubic-FiSo;
            // 卷軸底
            &::-webkit-scrollbar {
                background: #fff;
                @include setSize(3px, 3px);
                border-radius: 1.5px;
            }
            // 卷軸體
            &::-webkit-scrollbar-thumb {
                background: var(--themeColor);
                border-radius: 1.5px;
                border: 0.5px solid rgba(153, 153, 153, 0.25);
            }

            .option {
                padding: 8px 20px;

                font-size: 18px;
                white-space:nowrap;
                user-select: none;
                cursor: pointer;
                transition: .1s $cubic-FiSo;
                &:hover {
                    background: $colorSubs;
                    filter: saturate(0.5);
                    color: #fff;
                }
                &.current {
                    background: var(--themeColor);
                    color: #fff;
                }
            }
        }
    }
</style>
