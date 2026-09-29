<script setup lang="ts">
    import type { ApiErrorCase } from './catalog.schema';
    import type { SendResult } from './send';
    import { computed, ref } from 'vue';
    import JsonTree from './JsonTree.vue';
    import { checkContract, formatBytes, formatDuration, statusMeaning } from './request';

    // 回應：狀態碼與它的意思、時間、大小、標頭，內容用 JSON 樹／原文／圖片顯示；後台在用的端點再做一次契約檢查。
    const props = defineProps<{
        result: SendResult;
        method: string;
        /** 目錄上的路徑（:id 還在），契約檢查用 */
        path: string;
        errors: ApiErrorCase[];
    }>();

    const view = ref<'tree' | 'raw' | 'headers'>('tree');
    const copied = ref('');
    const openDepth = ref(2);
    const treeKey = ref(0);

    const meaning = computed(() => statusMeaning(props.result.status, props.errors));
    const tone = computed(() => {
        const status = props.result.status;
        if (status === 0) return 'fail';
        return status < 300 ? 'ok' : status < 500 ? 'warn' : 'fail';
    });
    /** 後端的錯誤一律是 { error }：拉出來放最上面 */
    const backendError = computed(() => {
        const data = props.result.json as { error?: unknown } | undefined;
        return props.result.status >= 400 && data && typeof data.error === 'string' ? data.error : '';
    });
    const contract = computed(() => checkContract(props.method, props.path, props.result.status, props.result.json));
    const raw = computed(() => (props.result.json !== undefined ? JSON.stringify(props.result.json, null, 2) : props.result.text ?? ''));

    function expandAll(depth: number) {
        openDepth.value = depth;
        treeKey.value++;
    }

    async function copyRaw() {
        try {
            await navigator.clipboard.writeText(raw.value);
            copied.value = '已複製';
        } catch {
            copied.value = '瀏覽器不讓複製';
        }
        setTimeout(() => (copied.value = ''), 1500);
    }

    function onCopiedPath(text: string) {
        copied.value = `已複製 ${text.length > 40 ? `${text.slice(0, 40)}…` : text}`;
        setTimeout(() => (copied.value = ''), 1500);
    }
</script>

<template>
    <section class="dd-api-res" :class="`is-${tone}`" aria-label="回應" aria-live="polite">
        <header class="dd-api-res__head">
            <span v-if="result.status" class="dd-api-status" :class="`is-${Math.floor(result.status / 100)}xx`">{{ result.status }}</span>
            <span v-else class="dd-api-status is-0xx">沒有回應</span>
            <span class="meaning">{{ result.failure ?? meaning }}</span>
            <span class="stats">{{ formatDuration(result.ms) }}<template v-if="result.status"> · {{ formatBytes(result.size) }}</template></span>
        </header>

        <p v-if="backendError" class="dd-api-res__error">後端說：{{ backendError }}</p>

        <p v-if="contract.checked && contract.ok" class="dd-api-res__contract is-ok">✓ 跟後台畫面的解析規則一致</p>
        <div v-else-if="contract.checked && !contract.ok" class="dd-api-res__contract is-bad">
            <p>✕ 後台畫面解析不了這個回應，後端的格式可能改了（這支在後台會壞掉）：</p>
            <ul>
                <li v-for="issue in contract.issues" :key="issue"><code>{{ issue }}</code></li>
            </ul>
        </div>

        <template v-if="result.status">
            <div class="dd-api-res__tabs" role="tablist">
                <button type="button" role="tab" :aria-selected="view === 'tree'" :class="{ 'is-active': view === 'tree' }" :disabled="result.json === undefined && !result.imageUrl" @click="view = 'tree'">
                    {{ result.imageUrl ? '圖片' : '結構' }}
                </button>
                <button type="button" role="tab" :aria-selected="view === 'raw'" :class="{ 'is-active': view === 'raw' }" :disabled="!!result.imageUrl" @click="view = 'raw'">原文</button>
                <button type="button" role="tab" :aria-selected="view === 'headers'" :class="{ 'is-active': view === 'headers' }" @click="view = 'headers'">標頭 {{ result.headers.length }}</button>
                <span class="spacer" />
                <template v-if="view === 'tree' && result.json !== undefined">
                    <button type="button" @click="expandAll(99)">全部展開</button>
                    <button type="button" @click="expandAll(1)">收合</button>
                </template>
                <button v-if="!result.imageUrl" type="button" @click="copyRaw">複製</button>
                <span v-if="copied" class="copied" role="status">{{ copied }}</span>
            </div>

            <div class="dd-api-res__body">
                <template v-if="view === 'tree'">
                    <img v-if="result.imageUrl" :src="result.imageUrl" alt="回應的圖片" class="dd-api-res__image" />
                    <JsonTree v-else-if="result.json !== undefined" :key="treeKey" :value="result.json" :open-depth="openDepth" @copied="onCopiedPath" />
                    <pre v-else><code>{{ raw || '（沒有內容）' }}</code></pre>
                </template>
                <pre v-else-if="view === 'raw'"><code>{{ raw || '（沒有內容）' }}</code></pre>
                <table v-else class="dd-api-res__headers">
                    <tbody>
                        <tr v-for="[name, value] in result.headers" :key="name">
                            <th>{{ name }}</th>
                            <td>{{ value }}</td>
                        </tr>
                    </tbody>
                </table>
                <p v-if="view === 'headers'" class="dd-api-ws__muted">跨網域請求只看得到後端開放的標頭（CORS 的 expose）。</p>
            </div>
        </template>
    </section>
</template>
