---
title: Design System
description: Opshell's Blog Design System & UI Kit
layout: page
designSystem: true
sidebar: false
aside: false
---

<script setup>
import { DesignSystem } from '@features/design-system';
import { MdGuide, MdSpec, MdUsageSpectrum } from '@features/markdown-guide';
</script>

<DesignSystem>
<template v-slot:markdown>

<!--@include: @/features/markdown-guide/guide.md-->

</template>
</DesignSystem>
