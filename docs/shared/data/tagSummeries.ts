// .vitepress/theme/data/tagSummaries.ts
export interface TagSummary {
    title: string
    description: string
}

export const tagSummaries: Record<string, TagSummary> = {
    TypeScript: {
        title: '深入 TypeScript 的世界 📘',
        description: '從 JavaScript 轉戰 TypeScript 的學習筆記，包含基礎語法、進階型別、泛型應用以及各種實戰中踩過的坑。'
    },
    vue: {
        title: 'Vue 生態圈探索 🚀',
        description: '圍繞著 Vue.js 的各種技術實踐，包含 Vue 3 的新特性、Pinia 的狀態管理模式、Vue Router 的應用等，目標是打造更優雅、高效的應用程式。'
    },
    vitepress: {
        title: '用 VitePress 打造個人文件庫 ✨',
        description: 'VitePress 不僅僅是文件產生器，更是知識管理的利器。這裡記錄了各種魔改、功能擴充與效能優化的心得。'
    },
    developer: {
        title: '現代開發模式與工具鏈 🛠️',
        description: '探索現代前端開發的最佳實踐，從 Git 工作流程、CI/CD 自動化，到 Docker 容器化部署，提升開發效率與協作體驗。'
    }
};
