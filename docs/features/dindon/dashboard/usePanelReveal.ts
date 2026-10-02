import { onBeforeUnmount, ref } from 'vue';

// 詳情面板的進出場（transitions-dev 的 07 Panel reveal，2026-10-02）：裝置與回報兩頁共用。
// 面板是 v-if 掛上去的，直接掛成打開的不會有轉場：先畫成關著（data-open=false），下一格再打開。
// 關的時候反過來：先把 data-open 改成 false，等 --panel-close-dur 播完才真的拿掉（v-if 會立刻拆掉，關的轉場來不及播）。
// 只有「從沒有詳情到有」與「關掉」會播；換看另一台時面板一直開著，不重播。

function cssMs(name: string, fallback: number) {
    if (typeof window === 'undefined') return fallback;
    return Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || fallback;
}

export function usePanelReveal() {
    const open = ref(false);
    let timer: ReturnType<typeof setTimeout> | undefined;

    function show() {
        clearTimeout(timer);
        // 兩格：第一格讓 v-if 把關著的面板畫出來，第二格才打開
        requestAnimationFrame(() => requestAnimationFrame(() => (open.value = true)));
    }

    function hide(done: () => void) {
        clearTimeout(timer);
        open.value = false;
        timer = setTimeout(done, cssMs('--panel-close-dur', 350));
    }

    /** 詳情被別的程式關掉（例如重新搜尋）：下次出現才會從關著開始 */
    function reset() {
        clearTimeout(timer);
        open.value = false;
    }

    onBeforeUnmount(() => clearTimeout(timer));
    return { open, show, hide, reset };
}
