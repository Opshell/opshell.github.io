import type { Directive } from 'vue';

// 首頁卡片的「手電筒」（2026-10 翻新第二版）：游標在卡片上時，把位置寫進 --mx／--my，CSS 用它畫一圈光；
// 同時寫 --rx／--ry 讓卡片朝游標微微傾斜。只寫 CSS 變數，畫什麼由各卡片自己的樣式決定。
// 觸控不做（手指沒有「停在上面」）；使用者關閉動態時只亮光、不傾斜。

const TILT = 5; // 最多傾斜幾度

interface Handlers {
    move: (event: PointerEvent) => void;
    leave: () => void;
}
const handlers = new WeakMap<HTMLElement, Handlers>();

export const vSpotlight: Directive<HTMLElement> = {
    mounted(el) {
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const move = (event: PointerEvent) => {
            if (event.pointerType === 'touch') return;
            const rect = el.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width;
            const y = (event.clientY - rect.top) / rect.height;
            el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
            el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
            if (!still) {
                el.style.setProperty('--rx', `${((0.5 - y) * TILT).toFixed(2)}deg`);
                el.style.setProperty('--ry', `${((x - 0.5) * TILT).toFixed(2)}deg`);
            }
        };
        const leave = () => {
            el.style.removeProperty('--rx');
            el.style.removeProperty('--ry');
        };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerleave', leave);
        handlers.set(el, { move, leave });
    },
    unmounted(el) {
        const found = handlers.get(el);
        if (!found) return;
        el.removeEventListener('pointermove', found.move);
        el.removeEventListener('pointerleave', found.leave);
        handlers.delete(el);
    }
};
