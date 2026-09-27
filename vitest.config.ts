import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// 只測純邏輯（Zod 解析、演示疊層的時間計算），不跑 VitePress；別名只放測試碰得到的那幾個
const docs = (dir: string) => fileURLToPath(new URL(`./docs/${dir}`, import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
            '@shared': docs('shared'),
            '@utils': docs('shared/utils'),
            '@features': docs('features')
        }
    },
    test: {
        include: ['docs/**/*.test.ts']
    }
});
