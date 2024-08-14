<script setup lang="ts">

</script>

<template>
    <ul class="skill-box">
        <slot />
    </ul>
</template>

<style lang="scss">
    .skill-box {
        @include setFlex(flex-start);
        flex-wrap: wrap;
        gap: 10px;
        @include setSize(100%, auto);
    }
</style>
