<template>
    <ul class="skill-box">
        <slot />
    </ul>
</template>

<style lang="scss">
    .skill-box {
        @include setFlex(flex-start, center, 6px);
        flex-wrap: wrap;
        padding: 0;
        margin: 0;
        list-style: none;
    }
</style>
