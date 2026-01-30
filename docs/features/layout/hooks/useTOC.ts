import { throttle } from '@utils/throttle';
import { useData } from 'vitepress';

// --- Types ---
export interface Header {
    level: number;
    title: string;
    slug: string;
    link: string;
    children?: Header[];
}

// 序列化標題 (移除 HTML 標籤)
function serializeHeader(h: Element): string {
    let ret = '';
    for (const node of h.childNodes) {
        if (node.nodeType === 1) { // Element

            // 忽略 VitePress 的錨點符號或特定 class
            if (
                (node as Element).classList.contains('VPBadge') ||
                (node as Element).classList.contains('header-anchor') ||
                (node as Element).classList.contains('ignore-header')
            ) {
                continue;
            }
            ret += node.textContent;
        } else if (node.nodeType === 3) { // Text
            ret += node.textContent;
        }
    }
    return ret.trim();
}

// 取得絕對位置
function getAbsoluteTop(element: HTMLElement | null): number {
    let offsetTop = 0;
    while (element !== document.body && element !== null) {
        offsetTop += element.offsetTop;
        element = element.offsetParent as HTMLElement;
    }
    return offsetTop;
}

/** [-] useTOC Composable
 * @param contentRef 文章內容的容器 Ref (通常是 <article> 或 .vp-doc)
 */
export function useTOC(contentRef: Ref<HTMLElement | undefined>) {
    const { page } = useData();
    const headers = shallowRef<Header[]>([]);
    const activeAnchor = ref<string>('');

    // 緩存平扁化的 headers 以供 ScrollSpy 快速查找
    let flatHeaders: { link: string; element: HTMLElement }[] = [];

    // 1. 解析 Headers
    function updateHeaders() {
        if (!contentRef.value) return;

        // 針對傳入的容器尋找 H2-H6 (可根據需求調整選擇器)
        const nodes = Array.from(contentRef.value.querySelectorAll('h2, h3, h4, h5, h6'))
        .filter((el) => el.id && el.hasChildNodes()) as HTMLElement[];

        const newHeaders: Header[] = [];
        flatHeaders = []; // 重置緩存

        // 建構樹狀結構 (如果你的 TOC 支援巢狀) 或是平面結構
        // 這裡示範 VitePress 的解析邏輯 (平面轉樹狀可選，這裡先做平面收集以便 ScrollSpy)

        // 為了簡化，這裡我們先做平面結構轉換成 Header 物件，
        // 如果需要像 VitePress 那樣的巢狀結構 (resolveHeaders)，可以在這裡加入 stack 演算法
        // 但通常側邊欄 TOC 只需要平面列表配合 CSS padding 即可。

        nodes.forEach((el) => {
            const header: Header = {
                level: Number(el.tagName[1]),
                title: serializeHeader(el),
                slug: el.id,
                link: '#' + el.id
            };
            newHeaders.push(header);
            flatHeaders.push({ link: header.link, element: el });
        });

        headers.value = newHeaders;
    }

    function setActiveLink() {
        if (flatHeaders.length === 0) return;

        const scrollY = window.scrollY;
        const innerHeight = window.innerHeight;
        const offsetHeight = document.body.offsetHeight;
        const isBottom = Math.abs(scrollY + innerHeight - offsetHeight) < 20;

        // 到底部直接選最後一個
        if (isBottom) {
            activeAnchor.value = flatHeaders[flatHeaders.length - 1].link;
            return;
        }

        // 計算當前位置
        // 這裡的 offset (100) 需要包含 Header 高度 + 一點緩衝
        const topOffset = 150;
        let active: string | null = null;

        for (const { link, element } of flatHeaders) {
            const top = getAbsoluteTop(element);
            if (top > scrollY + topOffset) { break; }
            active = link;
        }

        // 如果 active 存在就更新，否則如果滾動條在最上面，清空
        if (active) {
            activeAnchor.value = active;
        } else if (scrollY < 100) {
            activeAnchor.value = '';
        }
    }

    // 使用 throttle 包裝 (100ms 更新一次夠了，肉眼看不出延遲)
    const onScroll = throttle(setActiveLink, 100);

    // --- LifeCycle ---
    onMounted(() => {
        updateHeaders();
        // 稍微延遲一下確保圖片加載導致的高度變化 (選用)
        setTimeout(() => {
            updateHeaders();
            setActiveLink();
        }, 200);

        window.addEventListener('scroll', onScroll);
        window.addEventListener('resize', onScroll); // resize 也要監聽，防止高度變化
    });

    watch(() => page.value.relativePath, async () => {
        await nextTick();
        updateHeaders();
        setActiveLink();
    });

    onUnmounted(() => {
        window.removeEventListener('scroll', onScroll);
    });

    return {
        headers,
        activeAnchor
    };
}