import { defineClientComponent } from 'vitepress'

// ❌原本的寫法 (靜態引入，SSR 會執行它導致報錯)
// import GalaxyBack from './components/galaxyBack.vue';
// import TagsList from './components/TagsList.vue';

// ✅ Vuer 推薦寫法 (動態引入)
// 這樣只有在客戶端 (瀏覽器) 才會去載入這些 heavy 的 3D 套件
const GalaxyBack = defineClientComponent(() => {
  return import('./components/galaxyBack.vue')
});

const TagsList = defineClientComponent(() => {
  return import('./components/TagsList.vue')
});

const SvgHudPanel = defineClientComponent(() => {
  return import('./components/svgHudPanel.vue')
});

export {
    TagsList,
    GalaxyBack,
    SvgHudPanel
};