<script setup lang="ts">
    import type { PlayReports, PlayVitals } from '../schemas/admin.schema';
    import { computed, onMounted, ref } from 'vue';
    import { adminApi } from '../api';
    import { formatDateTime } from '../format';
    import { formatBytes, formatRate, latestMetric, PLAY_BAD_ANR, PLAY_BAD_CRASH, reportKind } from '../googleData';
    import { errorMessage, useAdminCall } from '../useAdminCall';

    // 「App 版本」分頁裡的 Play 資料（溝通板 #0084）：當機率與 ANR（Reporting API）、報表空間裡有哪些檔案。
    // 後端快取 3 小時。使用者太少時 Play 不給比率（隱私門檻），那不是錯誤，要講清楚。
    // 報表空間的權限是 Play Console 邀請 dindon-run 時勾的帳戶權限；讀不到時把 Google 的原文與該去哪裡確認寫出來。
    const call = useAdminCall();

    const vitals = ref<PlayVitals | null>(null);
    const reports = ref<PlayReports | null>(null);
    const vitalsError = ref('');
    const reportsError = ref('');
    const loading = ref(false);

    async function load(refresh = false) {
        loading.value = true;
        vitalsError.value = '';
        reportsError.value = '';
        // 兩支各自成敗：報表空間 403 不該讓當機率也看不到
        await Promise.all([
            call(token => adminApi.playVitals(token, 28, refresh)).then(result => (vitals.value = result), (e) => {
                vitalsError.value = errorMessage(e);
            }),
            call(token => adminApi.playReports(token, refresh)).then(result => (reports.value = result), (e) => {
                reportsError.value = errorMessage(e);
            })
        ]);
        loading.value = false;
    }

    const rows = computed(() => {
        if (!vitals.value) return [];
        const { crash, anr } = vitals.value;
        return [
            { label: '使用者感受到的當機率', latest: latestMetric(crash, 'userPerceivedCrashRate'), bad: PLAY_BAD_CRASH, through: crash.through },
            { label: '當機率（全部）', latest: latestMetric(crash, 'crashRate'), bad: null, through: crash.through },
            { label: '使用者感受到的 ANR', latest: latestMetric(anr, 'userPerceivedAnrRate'), bad: PLAY_BAD_ANR, through: anr.through },
            { label: 'ANR（全部）', latest: latestMetric(anr, 'anrRate'), bad: null, through: anr.through }
        ];
    });
    /** 四個都沒數字：使用者太少，Play 不給 */
    const noNumbers = computed(() => !!vitals.value && rows.value.every(row => !row.latest));

    onMounted(() => load());
</script>

<template>
    <section class="dd-app__card dd-play" aria-labelledby="dd-play-title">
        <header class="dd-app__head">
            <h2 id="dd-play-title">Play 的當機率與報表</h2>
            <button type="button" class="dd-admin__btn dd-admin__btn--ghost dd-admin__btn--small" :disabled="loading" title="不用 3 小時的快取，重新問 Google" @click="load(true)">
                重新問 Google
            </button>
        </header>
        <p v-if="loading && !vitals && !reports" class="dd-app__muted t-shimmer" data-text="問 Google 中…">問 Google 中…</p>

        <!-- #region [P] 當機率與 ANR -->
        <p v-if="vitalsError" class="dd-admin__error" role="alert">當機率讀不到：{{ vitalsError }}</p>
        <template v-if="vitals">
            <p v-if="noNumbers" class="dd-play__empty">
                近 28 天每一天 Play 都還沒給數字：<strong>使用者太少</strong>，Play 為了隱私不給比率（不是錯誤）。人多一點就會出現。
                <span v-if="vitals.crash.through">Play 的資料到 {{ vitals.crash.through }}（美國太平洋時間）。</span>
            </p>
            <ul v-else class="dd-play__vitals">
                <li v-for="row in rows" :key="row.label" :class="{ 'is-bad': row.latest && row.bad !== null && row.latest.value > row.bad }">
                    <span class="label">{{ row.label }}</span>
                    <span class="value">{{ row.latest ? formatRate(row.latest.value) : '—' }}</span>
                    <span class="hint">
                        {{ row.latest ? `${row.latest.date}（美國太平洋時間）` : '使用者太少，沒有數字' }}
                        <template v-if="row.bad !== null">・Play 的門檻 {{ formatRate(row.bad) }}</template>
                    </span>
                </li>
            </ul>
        </template>
        <!-- #endregion -->

        <!-- #region [P] 報表空間 -->
        <h3 class="dd-play__subtitle">報表空間</h3>
        <div v-if="reportsError" class="dd-play__denied" role="alert">
            <p>讀不到：{{ reportsError }}</p>
            <p>
                常見原因：Play Console 邀請 <code>dindon-run</code> 時勾的是<strong>應用程式權限</strong>，報表空間只認<strong>帳戶權限</strong>分頁的
                「查看應用程式資訊及下載大量報表（唯讀）」；或剛勾好，最多要 24～36 小時才生效。步驟在工作區 <code>docs/ops/play-reports-access.md</code> 第 2 節。
            </p>
        </div>
        <template v-else-if="reports">
            <p class="dd-app__muted">
                <code>gs://{{ reports.bucket }}/</code> 裡的檔案（只列，不讀內容；安裝數、評論的報表齊了再決定怎麼顯示）。
            </p>
            <p v-if="!reports.objects.length" class="dd-play__empty">還沒有報表。</p>
            <div v-else class="dd-table-scroll">
                <table class="dd-table dd-table--static">
                    <thead>
                        <tr>
                            <th scope="col">種類</th>
                            <th scope="col">檔案</th>
                            <th scope="col" class="num">大小</th>
                            <th scope="col">更新</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in reports.objects" :key="item.name">
                            <td>{{ reportKind(item.name) }}</td>
                            <td class="file">{{ item.name }}</td>
                            <td class="num">{{ formatBytes(item.size) }}</td>
                            <td>{{ formatDateTime(item.updated) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </template>
        <!-- #endregion -->
    </section>
</template>

<style lang="scss">
    .dd-play {
        &__empty {
            background: var(--vp-c-bg-alt);
            padding: 12px 14px;
            border-radius: var(--dd-corner);
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            line-height: 1.7;
        }
        &__vitals {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 12px;
            padding: 0;
            margin: 0;
            list-style: none;

            li {
                @include setFlex(flex-start, flex-start, 2px, column);
                padding: 12px 14px;
                border: 1px solid var(--vp-c-divider);
                border-radius: var(--dd-corner);

                &.is-bad { border-color: var(--vp-c-danger-1); }
            }
            .label {
                color: var(--vp-c-text-2);
                font-size: var(--font-size-s);
            }
            .value {
                font-family: var(--dd-mono);
                font-size: var(--font-size-l);
                font-weight: 700;
            }
            .is-bad .value { color: var(--vp-c-danger-1); }
            .hint {
                color: var(--vp-c-text-3);
                font-size: 12px;
            }
        }
        &__subtitle {
            margin-top: 8px !important;
            font-size: var(--font-size-s);
        }
        &__denied {
            @include setFlex(flex-start, stretch, 6px, column);
            background: var(--vp-c-danger-soft);
            padding: 10px 14px;
            border-radius: var(--dd-corner);
            font-size: var(--font-size-s);
            line-height: 1.7;

            code { font-family: var(--dd-mono); }
        }
        .dd-table .file {
            font-family: var(--dd-mono);
            font-size: 12px;
            white-space: normal;
            word-break: break-all;
        }
    }
</style>
