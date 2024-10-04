/**
 * @file useSelectBox.ts
 * @author opshell
 * @date 2023-11-30
 * @description
 * 1. 用於點擊外部關閉下拉選單
 *
 * // [-] selectBox 外點關閉
 * import { useSelectBox } from '@/composables/useSelectBox';
 * const { refsDom } = useSelectBox();
 */

import { nextTick, onMounted, ref } from 'vue';
import { onClickOutside } from '@vueuse/core';

interface SelectBox extends Ref {
    openSelect: () => void
    closeSelect: () => void
    open: boolean
}

export function useSelectBox(): {
    selectBox: Ref<SelectBox[]>
    refsDom: (el: SelectBox) => undefined
} {
    const selectBox: Ref<SelectBox[]> = ref([]);

    onMounted(() => {
        selectBox.value.forEach((ele) => {
            onClickOutside(ele, async () => {
                // [-]放在更改物件後面[可以當作更精準的settimeout]
                await nextTick(() => {
                    if (ele.open) {
                        ele.closeSelect();
                    }
                });
            });
        });
    });

    // dom ref 註冊
    const refsDom = (el: SelectBox) => {
        selectBox.value.push(el);

        // [#]避免typescript ref 型別錯誤 不知道有沒有別的方式可以處理
        return undefined;
    };

    return {
        selectBox,
        refsDom
    };
}
