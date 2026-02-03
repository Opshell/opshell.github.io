// directives/zoomImg.ts
import type { Directive, DirectiveBinding } from 'vue';

interface ZoomState {
    scale: number;
    x: number;
    y: number;
    originX: number;
    originY: number;
    isDragging: boolean;
    startX: number;
    startY: number;
    initialTranslateX: number;
    initialTranslateY: number;
}

// 用 WeakMap 來儲存每個元素的狀態，防止污染全域且會自動垃圾回收
const stateMap = new WeakMap<HTMLElement, ZoomState>();

export const vZoomImg: Directive = {
    mounted(el: HTMLElement, binding: DirectiveBinding) {
        // 初始化狀態
        stateMap.set(el, {
            scale: 1,
            x: 0, y: 0,
            originX: 50, originY: 50,
            isDragging: false,
            startX: 0, startY: 0,
            initialTranslateX: 0, initialTranslateY: 0
        });

        // 預設樣式
        el.style.cursor = 'zoom-in';
        el.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
        el.style.transformOrigin = '50% 50%';
        // 禁止使用者選取圖片反白，避免拖曳干擾
        el.style.userSelect = 'none';
        // @ts-ignore
        el.style.webkitUserDrag = 'none';

        // === 事件處理器 ===

        const updateStyle = () => {
            const s = stateMap.get(el);
            if (!s) return;

            el.style.transform = `translate(${s.x}px, ${s.y}px) scale(${s.scale})`;
            el.style.transformOrigin = `${s.originX}% ${s.originY}%`;
            el.style.cursor = s.scale > 1 ? (s.isDragging ? 'grabbing' : 'grab') : 'zoom-in';

            // 拖曳時關閉 transition 以獲得即時跟手感
            el.style.transition = s.isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
        };

        const onMouseDown = (e: MouseEvent) => {
            if (e.button !== 0) return; // 只接受左鍵
            e.preventDefault();

            const s = stateMap.get(el);
            if (!s) return;

            s.isDragging = true;
            s.startX = e.clientX;
            s.startY = e.clientY;
            s.initialTranslateX = s.x;
            s.initialTranslateY = s.y;

            // 標記這是一次潛在的點擊，如果移動距離小於閾值則視為點擊
            el.dataset.isClick = 'true';

            updateStyle();
        };

        const onMouseMove = (e: MouseEvent) => {
            const s = stateMap.get(el);
            if (!s || !s.isDragging) return;

            const deltaX = e.clientX - s.startX;
            const deltaY = e.clientY - s.startY;

            // 簡單防手抖
            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                el.dataset.isClick = 'false';
            }

            // 只有放大時才允許平移
            if (s.scale > 1) {
                s.x = s.initialTranslateX + deltaX;
                s.y = s.initialTranslateY + deltaY;
                updateStyle();
            }
        };

        const onMouseUp = (e: MouseEvent) => {
            const s = stateMap.get(el);
            if (!s || !s.isDragging) return;

            s.isDragging = false;

            // 如果判定為點擊 (沒有大幅移動)
            if (el.dataset.isClick === 'true') {
                toggleZoom(e, el, s, binding.value || 3); // 預設 3 倍
            }

            updateStyle();
        };

        const onMouseLeave = () => {
            const s = stateMap.get(el);
            if (!s) return;
            s.isDragging = false;
            updateStyle();
        };

        // 綁定事件到元素上
        el.addEventListener('mousedown', onMouseDown);
        el.addEventListener('mousemove', onMouseMove);
        el.addEventListener('mouseup', onMouseUp);
        el.addEventListener('mouseleave', onMouseLeave);

        // 將這些 listener 存起來以便 unmounted 時移除 (如果需要更嚴謹的記憶體管理)
        // 這裡利用了閉包特性，直接引用函數即可
        (el as any)._zoomListeners = { onMouseDown, onMouseMove, onMouseUp, onMouseLeave };
    },

    // 可以在這裡處理參數更新，例如動態改變放大倍率
    updated(el, binding) {
        // 如果需要動態調整倍率可寫在這
    },

    unmounted(el: HTMLElement) {
        const listeners = (el as any)._zoomListeners;
        if (listeners) {
            el.removeEventListener('mousedown', listeners.onMouseDown);
            el.removeEventListener('mousemove', listeners.onMouseMove);
            el.removeEventListener('mouseup', listeners.onMouseUp);
            el.removeEventListener('mouseleave', listeners.onMouseLeave);
        }
        stateMap.delete(el);
    }
};

// --- Helper Functions ---
function toggleZoom(e: MouseEvent, el: HTMLElement, s: ZoomState, maxScale: number) {
    if (s.scale === 1) {
        // Zoom In
        const rect = el.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        s.originX = (offsetX / rect.width) * 100;
        s.originY = (offsetY / rect.height) * 100;
        s.scale = maxScale;
        s.x = 0;
        s.y = 0;
    } else {
        // Zoom Out
        s.scale = 1;
        s.x = 0;
        s.y = 0;
    }
}