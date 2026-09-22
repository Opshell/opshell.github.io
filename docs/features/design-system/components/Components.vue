<script setup lang="ts">
    import { SvgHudPanel } from '@features/tags-list';
    import { ref } from 'vue';
    import DemoBlock from './DemoBlock.vue';

    // 基本元件展示：shared/components/el 那批（自動註冊成 <ElXxx>），一個一塊，示範區可以直接操作。
    // 這裡的 code 字串是給人看的用法，跟示範區用的是同一組 props。

    const sections = [
        { id: 'button', label: 'Button' },
        { id: 'tag', label: 'Tag' },
        { id: 'input', label: 'Input / Select' },
        { id: 'choice', label: 'Checkbox / Radio / Toggle' },
        { id: 'card', label: 'Card' },
        { id: 'divider', label: 'Divider' },
        { id: 'image', label: 'Image' },
        { id: 'icon', label: 'SvgIcon' },
        { id: 'hud', label: 'HUD Panel' }
    ];

    // 示範用的狀態
    const inputText = ref('');
    const selectValue = ref('');
    const agree = ref(true);
    const toppings = ref<string[]>(['cheese']);
    const size = ref('md');
    const notify = ref(false);
</script>

<template>
    <div class="components-page">
        <nav class="components-page__toc" aria-label="元件">
            <a v-for="section in sections" :key="section.id" :href="`#${section.id}`" class="toc-link">{{ section.label }}</a>
        </nav>

        <DemoBlock
            id="button"
            title="Button"
            description="有 href 就是 <a>，沒有就是 <button>。ghost 是預設，用在次要動作；primary 一頁只放一顆。"
            :props="[
                { name: 'variant', type: `'ghost' | 'primary' | 'text' | 'danger'`, default: `'ghost'`, desc: '樣式' },
                { name: 'size', type: `'sm' | 'md'`, default: `'md'`, desc: '尺寸' },
                { name: 'href', type: 'string', desc: '給了就變 <a>' },
                { name: 'disabled', type: 'boolean', default: 'false', desc: '停用' },
                { name: 'slot icon', type: '—', desc: '左邊的圖示，放 <ElSvgIcon>' },
            ]"
            code="<ElBtn variant=&quot;primary&quot;>儲存</ElBtn>
<ElBtn>取消</ElBtn>
<ElBtn variant=&quot;text&quot;>看更多</ElBtn>
<ElBtn variant=&quot;danger&quot; size=&quot;sm&quot;>刪除</ElBtn>
<ElBtn href=&quot;/timeline&quot;>
    <template #icon><ElSvgIcon name=&quot;calendar_month&quot; /></template>
    時間軸
</ElBtn>"
        >
            <div class="stage-row">
                <ElBtn variant="primary">儲存</ElBtn>
                <ElBtn>取消</ElBtn>
                <ElBtn variant="text">看更多</ElBtn>
                <ElBtn variant="danger">刪除</ElBtn>
                <ElBtn disabled>停用</ElBtn>
            </div>
            <div class="stage-row">
                <ElBtn variant="primary" size="sm">小的</ElBtn>
                <ElBtn size="sm">小的</ElBtn>
                <ElBtn href="/timeline">
                    <template #icon><ElSvgIcon name="calendar_month" /></template>
                    連到時間軸
                </ElBtn>
                <ElBtn href="https://github.com/Opshell" target="_blank">
                    <template #icon><ElSvgIcon name="link" /></template>
                    外部連結
                </ElBtn>
            </div>
        </DemoBlock>

        <DemoBlock
            id="tag"
            title="Tag"
            description="文章標籤，點了到標籤頁。時間軸與標籤頁的卡片都是用它。"
            :props="[{ name: 'tag', type: 'string', desc: '標籤名，也是連結的目標' }]"
            code="<ElTag tag=&quot;TypeScript&quot; />"
        >
            <ElTag tag="TypeScript" />
            <ElTag tag="VitePress" />
            <ElTag tag="鐵人賽" />
        </DemoBlock>

        <DemoBlock
            id="input"
            title="Input / Select"
            description="外殼同一套：bg-soft、divider 邊框、10px 圓角，focus 變品牌色。Input 的其他 attribute（placeholder、type、maxlength）直接落到 <input>。用 ElInputBox 包起來就有標籤與備註。"
            :props="[
                { name: 'v-model', type: 'string | number', desc: '兩個都有' },
                { name: 'disabled', type: 'boolean', default: 'false', desc: '停用' },
                { name: 'slot icon / suffix', type: '—', desc: 'Input 左邊的圖示、右邊的後綴' },
                { name: 'options', type: '{ label, value, disabled? }[]', desc: 'Select 的選項' },
                { name: 'placeholder', type: 'string', desc: 'Select 沒選時的提示' },
            ]"
            code="<ElInputBox field-name=&quot;暱稱&quot; remark=&quot;最多 12 個字&quot;>
    <ElInput v-model=&quot;name&quot; placeholder=&quot;怎麼稱呼你&quot; maxlength=&quot;12&quot;>
        <template #icon><ElSvgIcon name=&quot;person&quot; /></template>
    </ElInput>
</ElInputBox>
<ElInputBox field-name=&quot;方案&quot;>
    <ElSelect v-model=&quot;plan&quot; :options=&quot;[{ label: 'Lite', value: 'lite' }]&quot; placeholder=&quot;選一個&quot; />
</ElInputBox>"
        >
            <div class="stage-col">
                <ElInputBox field-name="暱稱" remark="最多 12 個字">
                    <ElInput v-model="inputText" placeholder="怎麼稱呼你" maxlength="12">
                        <template #icon><ElSvgIcon name="person" /></template>
                    </ElInput>
                </ElInputBox>
                <ElInputBox field-name="方案">
                    <ElSelect v-model="selectValue" :options="[{ label: 'Free', value: 'free' }, { label: 'Lite', value: 'lite' }, { label: 'Pro', value: 'pro' }]" placeholder="選一個" />
                </ElInputBox>
                <ElInputBox field-name="停用的" type="row">
                    <ElInput model-value="不能改" disabled />
                </ElInputBox>
                <p class="stage-note">你打的：{{ inputText || '（空）' }} · 選的：{{ selectValue || '（沒選）' }}</p>
            </div>
        </DemoBlock>

        <DemoBlock
            id="choice"
            title="Checkbox / Radio / Toggle"
            description="Checkbox 的 v-model 是布林就是單顆開關，是陣列就用 val 決定在不在裡面。Radio 同一組共用一個 v-model。Toggle 是兩段式開關，v-model 布林。"
            :props="[
                { name: 'v-model', type: 'boolean | any[]（Checkbox）、string | number（Radio）、boolean（Toggle）', desc: '' },
                { name: 'val', type: 'string | number', desc: 'Checkbox 陣列模式與 Radio 的值' },
                { name: 'label', type: 'string', desc: '右邊的字，或用 slot' },
                { name: 'labels', type: '[string, string]', default: `['OFF', 'ON']`, desc: 'Toggle 兩段的字' },
                { name: 'disabled', type: 'boolean', default: 'false', desc: '停用' },
            ]"
            code="<ElCheckbox v-model=&quot;agree&quot; label=&quot;我同意&quot; />
<ElCheckbox v-model=&quot;toppings&quot; val=&quot;cheese&quot; label=&quot;起司&quot; />
<ElRadio v-model=&quot;size&quot; val=&quot;sm&quot; label=&quot;小&quot; />
<ElRadio v-model=&quot;size&quot; val=&quot;md&quot; label=&quot;中&quot; />
<ElBtnToggle v-model=&quot;notify&quot; />"
        >
            <div class="stage-col">
                <div class="stage-row">
                    <ElCheckbox v-model="agree" label="我同意" />
                    <ElCheckbox model-value disabled label="停用（勾著）" />
                </div>
                <div class="stage-row">
                    <ElCheckbox v-model="toppings" val="cheese" label="起司" />
                    <ElCheckbox v-model="toppings" val="bacon" label="培根" />
                    <ElCheckbox v-model="toppings" val="egg" label="蛋" />
                </div>
                <div class="stage-row">
                    <ElRadio v-model="size" val="sm" label="小" />
                    <ElRadio v-model="size" val="md" label="中" />
                    <ElRadio v-model="size" val="lg" label="大" />
                </div>
                <div class="stage-row">
                    <ElBtnToggle v-model="notify" />
                    <ElBtnToggle v-model="notify" :labels="['靜音', '通知']" />
                    <ElBtnToggle model-value disabled />
                </div>
                <p class="stage-note">agree={{ agree }} · toppings={{ toppings.join(',') || '（空）' }} · size={{ size }} · notify={{ notify }}</p>
            </div>
        </DemoBlock>

        <DemoBlock
            id="card"
            title="Card"
            description="所有「一塊」的基礎：bg-soft、divider 邊框、1rem 圓角。可點的卡開 hoverable。header、footer 是選用的 slot。"
            :props="[
                { name: 'hoverable', type: 'boolean', default: 'false', desc: '滑過去邊框變品牌色、浮起' },
                { name: 'padding', type: `'none' | 'sm' | 'md' | 'lg'`, default: `'md'`, desc: '內距' },
                { name: 'slot header / footer', type: '—', desc: '上下兩條，有給才出現' },
            ]"
            code="<ElCard hoverable>
    <template #header>標題</template>
    內容
    <template #footer>備註</template>
</ElCard>"
        >
            <div class="stage-row">
                <ElCard hoverable style="width: 260px">
                    <template #header>有頭有尾</template>
                    卡片內容，滑過去會浮起來。
                    <template #footer>2026.09.22</template>
                </ElCard>
                <ElCard style="width: 200px">只有內容</ElCard>
                <ElCard padding="none" style="width: 200px">
                    <ElImg src="/opshell-blog.webp" alt="封面" ratio="4 / 3" />
                </ElCard>
            </div>
        </DemoBlock>

        <DemoBlock
            id="divider"
            title="Divider"
            description="分隔線；有 slot 就在中間放字。"
            code="<ElDivider />
<ElDivider>或者</ElDivider>"
        >
            <div class="stage-col">
                <ElDivider />
                <ElDivider>或者</ElDivider>
            </div>
        </DemoBlock>

        <DemoBlock
            id="image"
            title="Image"
            description="載入中轉圈、失敗換成 no_image、可指定比例。"
            :props="[
                { name: 'src', type: 'string', desc: '圖片網址' },
                { name: 'alt', type: 'string', desc: '替代文字' },
                { name: 'ratio', type: 'string', desc: `例如 '16 / 9'，不給就跟著圖片` },
                { name: 'fit', type: `'cover' | 'contain'`, default: `'cover'`, desc: '裁切方式' },
            ]"
            code="<ElImg src=&quot;/opshell-blog.webp&quot; alt=&quot;封面&quot; ratio=&quot;16 / 9&quot; />"
        >
            <div class="stage-row">
                <ElImg src="/opshell-blog.webp" alt="封面" ratio="16 / 9" style="width: 240px" />
                <ElImg src="/這張不存在.webp" alt="壞掉的" ratio="1 / 1" style="width: 135px" />
            </div>
        </DemoBlock>

        <DemoBlock
            id="icon"
            title="SvgIcon"
            description="docs/public/icons 底下的 svg 會打包成 sprite，name 就是檔名。全部的圖示在「Icons」分頁。"
            :props="[
                { name: 'name', type: 'string', default: `'circle'`, desc: '檔名（不含 .svg）' },
                { name: 'href', type: 'string', desc: '給了就變可點的' },
            ]"
            code="<ElSvgIcon name=&quot;calendar_month&quot; />"
        >
            <ElSvgIcon name="calendar_month" />
            <ElSvgIcon name="person" />
            <ElSvgIcon name="link" />
            <ElSvgIcon name="pageview" />
            <ElSvgIcon name="star_fall" />
        </DemoBlock>

        <DemoBlock
            id="hud"
            title="HUD Panel"
            description="星系頁的 SVG 面板：切角外框、格線底、可收合。只在 3D 星系頁用。"
            :props="[
                { name: 'title', type: 'string', desc: '面板標題' },
                { name: 'icon', type: 'string', desc: '標題左邊的圖示' },
                { name: 'side', type: `'left' | 'right'`, desc: '切角在哪一邊' },
            ]"
            code="<SvgHudPanel title=&quot;TARGET&quot; icon=&quot;radar&quot; side=&quot;left&quot;>…</SvgHudPanel>"
        >
            <SvgHudPanel title="HUD PANEL" icon="radar" side="left">
                <p>內容放 slot。</p>
            </SvgHudPanel>
        </DemoBlock>
    </div>
</template>

<style lang="scss">
    .components-page {
        text-align: left;

        &__toc {
            @include setFlex(flex-start, center, 8px);
            flex-wrap: wrap;
            margin-bottom: 2.5rem;

            .toc-link {
                background: var(--vp-c-bg-soft);
                padding: 6px 12px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 999px;
                color: var(--vp-c-text-2);
                font-size: var(--font-size-xs);
                text-decoration: none;
                transition: .2s var(--cubic-FiSo);

                &:hover {
                    border-color: var(--vp-c-brand);
                    color: var(--vp-c-brand);
                }
            }
        }

        .stage-note {
            margin: 0;
            color: var(--vp-c-text-3);
            font-family: var(--vp-font-family-mono);
            font-size: var(--font-size-xs);
        }
    }
</style>
