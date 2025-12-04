---
title: Components - Design System
description: UI Component showcase
layout: doc
---

<script setup>

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
    <ElBtn>Default Button</ElBtn>
    <ElBtn theme="primary">Primary Button</ElBtn>
    <ElBtn theme="danger">Danger Button</ElBtn>
</div>

### 尺寸

<div class="demo-block">
    <ElBtn size="small">Small</ElBtn>
    <ElBtn>Normal</ElBtn>
    <ElBtn size="large">Large</ElBtn>
</div>

### 樣式

<div class="demo-block">
    <ElBtn outline>Outline</ElBtn>
    <ElBtn loading>Loading</ElBtn>
    <ElBtn disabled>Disabled</ElBtn>
</div>

## 輸入框 (Input)

<div class="demo-block column">
    <ElInput v-model="inputValue" placeholder="Basic Input" />
    <ElInput v-model="inputValue" label="With Label" placeholder="Input with label" />
    <ElInput v-model="inputValue" disabled placeholder="Disabled Input" />
    <p>Value: {{ inputValue }}</p>
</div>

## 選擇器 (Select)

<div class="demo-block">
    <ElSelect v-model="selectValue" :options="selectOptions" placeholder="Select an option" />
    <p>Selected: {{ selectValue }}</p>
</div>

## 核取方塊 (Checkbox)

<div class="demo-block">
    <ElCheckbox v-model="checkboxValue" label="Check me" />
    <ElCheckbox v-model="checkboxValue" label="Disabled" disabled />
    <p>Checked: {{ checkboxValue }}</p>
</div>

## 單選按鈕 (Radio)

<div class="demo-block">
    <ElRadio v-model="radioValue" label="Option 1" value="option1" name="demo-radio" />
    <ElRadio v-model="radioValue" label="Option 2" value="option2" name="demo-radio" />
    <p>Selected: {{ radioValue }}</p>
</div>

## 分隔線 (Divider)

<div class="demo-block column">
    <p>Text above</p>
    <ElDivider />
    <p>Text below</p>
    <ElDivider position="left">Left Text</ElDivider>
    <ElDivider position="center">Center Text</ElDivider>
    <ElDivider position="right">Right Text</ElDivider>
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
