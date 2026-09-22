// tsconfig 的 paths 把 vitepress/dist/client/theme-default/components/*.vue 指到這裡：
// 那些 .vue 在 node_modules 裡、自己的 import 沒型別，vue-tsc 跑進去會報幾十條錯。給它一個寬鬆的元件型別就好。
import type { DefineComponent } from 'vue';

declare const component: DefineComponent<Record<string, any>, Record<string, any>, any>;
export default component;
