<script setup>
    import Giscus from '@giscus/vue';
    import { useRoute, useData } from 'vitepress';

    const route = useRoute();
    const { isDark } = useData();
</script>

<template>
    <div style="margin-top: 24px">
        <Giscus
            id="comments"
            repo="Opshell/opshell.github.io"
            repoid="R_kgDOMjQqsg"
            category="Announcements"
            categoryid="DIC_kwDOMjQqss4Ch3dc"
            mapping="pathname"
            term="Welcome to giscus!"
            reactionsenabled="1"
            emitmetadata="0"
            inputposition="top"
            loading="lazy"
            lang="zh-TW"
            crossorigin="anonymous"
            :theme="isDark ? 'dark' : 'light'"
            :key="route.path"
        ></Giscus>
    </div>
</template>

