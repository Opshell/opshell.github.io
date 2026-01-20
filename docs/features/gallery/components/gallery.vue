<script setup>
import { computed, ref, watch, onMounted } from 'vue';
import galleryData from '@/photos/data.json';

const R2_URL = 'https://images.opshell.com/thumbs'; // 指向你的 R2 子網域

// 路由狀態
const currentAlbumId = ref(null);

// 根據 hash 切換相簿
const handleHashChange = () => {
    const hash = window.location.hash.replace('#', '');
    currentAlbumId.value = hash || null; // 如果沒 hash 就是 null (列表模式)
};

onMounted(() => {
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
});

// 計算當前要顯示的相簿資料
const currentAlbum = computed(() => {
    return galleryData.find(a => a.id === currentAlbumId.value);
});

// 切換相簿 (寫入 history)
const openAlbum = (id) => {
    history.pushState(null, '', `#${id}`);
    currentAlbumId.value = id;
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

const backToList = () => {
    history.pushState(null, '', ' '); // 清空 hash
    currentAlbumId.value = null;
};
</script>

<template>
  <div class="gallery-page">

    <div v-if="!currentAlbum" class="album-list">
       <div
         v-for="album in galleryData"
         :key="album.id"
         class="album-card"
         @click="openAlbum(album.id)"
       >
          <img :src="`${R2_URL}/${album.cover}`" loading="lazy" />
          <div class="info">
             <h3>{{ album.title }}</h3>
             <span>{{ album.count }} Photos</span>
          </div>
       </div>
    </div>

    <div v-else class="photo-grid-container">
       <button @click="backToList">← Back to Albums</button>
       <h2>{{ currentAlbum.title }}</h2>

       <div class="masonry-grid">
          <div v-for="photo in currentAlbum.photos" :key="photo.filename" class="photo-item">
             <img :src="`${R2_URL}/${photo.thumb}`" />
             </div>
       </div>
    </div>

  </div>
</template>