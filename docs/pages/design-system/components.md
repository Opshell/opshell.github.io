---
title: Components - Design System
description: UI Component showcase
layout: doc
---

<script setup>
import ElButton from '@shared/components/btn.vue';
import ElInput from '@shared/components/input.vue';
import ElCard from '@shared/components/card.vue';
import ElTag from '@shared/components/tag.vue';
import ElImg from '@shared/components/img.vue';
import { ref } from 'vue'

const inputValue = ref('')
const checkboxValue = ref(false)
const radioValue = ref('option1')
const selectValue = ref('')
const selectOptions = [
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' },
    { label: 'Option 3', value: 'option3' }
]
</script>

# 組件 (Components)

這裡展示了網站中使用的基礎原子組件。

## 按鈕 (Button)

### 基礎按鈕

<div class="demo-block">
    <Btn>Default Button</Btn>
    <Btn theme="primary">Primary Button</Btn>
    <Btn theme="danger">Danger Button</Btn>
</div>

### 尺寸

<div class="demo-block">
    <Btn size="small">Small</Btn>
    <Btn>Normal</Btn>
    <Btn size="large">Large</Btn>
</div>

### 樣式

<div class="demo-block">
    <Btn outline>Outline</Btn>
    <Btn loading>Loading</Btn>
    <Btn disabled>Disabled</Btn>
</div>

## 輸入框 (Input)

<div class="demo-block column">
    <Input v-model="inputValue" placeholder="Basic Input" />
    <Input v-model="inputValue" label="With Label" placeholder="Input with label" />
    <Input v-model="inputValue" disabled placeholder="Disabled Input" />
    <p>Value: {{ inputValue }}</p>
</div>

## 選擇器 (Select)

<div class="demo-block">
    <Select v-model="selectValue" :options="selectOptions" placeholder="Select an option" />
    <p>Selected: {{ selectValue }}</p>
</div>

## 核取方塊 (Checkbox)

<div class="demo-block">
    <Checkbox v-model="checkboxValue" label="Check me" />
    <Checkbox v-model="checkboxValue" label="Disabled" disabled />
    <p>Checked: {{ checkboxValue }}</p>
</div>

## 單選按鈕 (Radio)

<div class="demo-block">
    <Radio v-model="radioValue" label="Option 1" value="option1" name="demo-radio" />
    <Radio v-model="radioValue" label="Option 2" value="option2" name="demo-radio" />
    <p>Selected: {{ radioValue }}</p>
</div>

## 分隔線 (Divider)

<div class="demo-block column">
    <p>Text above</p>
    <Divider />
    <p>Text below</p>
    <Divider position="left">Left Text</Divider>
    <Divider position="center">Center Text</Divider>
    <Divider position="right">Right Text</Divider>
</div>

<style>
.demo-block {
    display: flex;
    gap: 1rem;
    margin: 1rem 0;
    align-items: center;
    flex-wrap: wrap;
}
.demo-block.column {
    flex-direction: column;
    align-items: flex-start;
}
</style>
