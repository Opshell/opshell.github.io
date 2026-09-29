import type { Ref } from 'vue';
import { onBeforeUnmount, onMounted } from 'vue';

/**
 * 宣傳頁的捲動進場與視差。
 *
 * - `data-reveal`：進入畫面時加上 `is-visible`（值是 `right` 時改成從右側滑入，樣式在元件裡）
 * - `data-parallax="速度"`：正數比捲動慢（遠景），負數比捲動快（近景）
 *   - 預設以「父元素中心離視窗中心多遠」計算，適合頁面中段的元素
 *   - 加上 `data-parallax-scroll` 則直接用捲動距離計算，給開頭區塊用：一開始位移是 0，不會露出縫
 * - `data-loop`：裡面有無限循環的動畫。離開畫面時加上 `is-paused` 暫停（樣式在元件裡），回來再接著播；
 *   整塊一起停，同一塊裡對好時間的動畫（鈴響和通知卡片）不會錯開
 *
 * 全部在 onMounted 之後才動：SSR 輸出的 HTML 內容完整可見，也不用碰 window。
 * 使用者開了「減少動態效果」就什麼都不做，畫面維持靜態。
 */
export function useLandingMotion(root: Ref<HTMLElement | undefined>) {
    let observer: IntersectionObserver | undefined;
    let loopObserver: IntersectionObserver | undefined;
    let frame = 0;
    let parallaxEls: HTMLElement[] = [];
    /** 上一次寫進去的位移，沒變就不寫：寫一次 style 就要重算一次樣式 */
    const lastOffset = new WeakMap<HTMLElement, string>();

    function updateParallax() {
        frame = 0;
        const viewHeight = window.innerHeight;
        const scrollY = window.scrollY;
        const scale = window.innerWidth < 768 ? 0.5 : 1; // 手機螢幕小，位移減半才不會晃得太誇張

        // 先全部量完再一起寫：量一個寫一個的話，每量一次都要等瀏覽器把上一個寫入重新排版
        const updates: [HTMLElement, string][] = [];
        for (const el of parallaxEls) {
            const speed = Number(el.dataset.parallax) * scale;
            let offset: number;

            if (el.dataset.parallaxScroll !== undefined) {
                // 開頭區塊捲出去之後就看不到了，停在最後的位置
                if (scrollY > viewHeight * 1.5) continue;
                offset = scrollY;
            } else {
                // 量父元素而不是自己：自己被位移後再量，會形成回授而抖動
                const rect = (el.parentElement ?? el).getBoundingClientRect();
                if (rect.bottom < -200 || rect.top > viewHeight + 200) continue;
                offset = viewHeight / 2 - (rect.top + rect.height / 2);
            }

            const value = `${(offset * speed).toFixed(1)}px`;
            if (lastOffset.get(el) !== value) updates.push([el, value]);
        }
        for (const [el, value] of updates) {
            el.style.setProperty('--py', value);
            lastOffset.set(el, value);
        }
    }

    function requestUpdate() {
        if (!frame) frame = requestAnimationFrame(updateParallax);
    }

    onMounted(() => {
        const el = root.value;
        if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        // [-] 捲動進場：已經在畫面裡的直接顯示，只有畫面外的才先藏起來，避免內容閃一下
        const revealEls = [...el.querySelectorAll<HTMLElement>('[data-reveal]')];
        const foldLine = window.innerHeight * 0.92;
        revealEls.forEach((item) => {
            if (item.getBoundingClientRect().top < foldLine) item.classList.add('is-visible');
        });
        el.classList.add('is-motion');

        observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                entry.target.classList.add('is-visible');
                observer?.unobserve(entry.target);
            }
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.15 });
        revealEls.filter(item => !item.classList.contains('is-visible')).forEach(item => observer!.observe(item));

        // [-] 循環動畫：在畫面外就暫停，不在看不到的地方一直耗電
        loopObserver = new IntersectionObserver((entries) => {
            for (const entry of entries) entry.target.classList.toggle('is-paused', !entry.isIntersecting);
        }, { rootMargin: '100px 0px' });
        el.querySelectorAll('[data-loop]').forEach(item => loopObserver!.observe(item));

        // [-] 視差
        parallaxEls = [...el.querySelectorAll<HTMLElement>('[data-parallax]')];
        updateParallax();
        window.addEventListener('scroll', requestUpdate, { passive: true });
        window.addEventListener('resize', requestUpdate, { passive: true });
    });

    onBeforeUnmount(() => {
        observer?.disconnect();
        loopObserver?.disconnect();
        if (frame) cancelAnimationFrame(frame);
        window.removeEventListener('scroll', requestUpdate);
        window.removeEventListener('resize', requestUpdate);
    });
}
