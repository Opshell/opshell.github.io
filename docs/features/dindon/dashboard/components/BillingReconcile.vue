<script setup lang="ts">
    import { computed } from 'vue';
    import { skuRates } from '../billingCalibration';
    import { formatInt } from '../format';
    import { formatMoney } from '../googleData';
    import { useCostCalibration } from '../useCostCalibration';

    // 估算跟帳單差多少、為什麼（2026-10-02，使用者：「檢查估算的部分到底哪裡出問題」）。近 90 天、只看帳單已經匯出的日子。
    // 已經查過的：價目表的單價跟 Google 一模一樣（每個計價項目反推的匯率都是 31.7），所以落差是 token 數對不上，不是價錢錯。
    // 已知會讓帳單比估算多的：被取消的加問（後端記 0 token，Google 照收輸入）、測試裝置不進估算、同一把金鑰的其他用量。
    const { billing, usage, rate, days, factor, multiple, error, loading } = useCostCalibration();

    const rates = computed(() => (billing.value && usage.value ? skuRates(billing.value.skus, usage.value.pricesUsed) : []));
    /** 每一項反推的匯率差不到 1%：價目表沒問題 */
    const pricesMatch = computed(() => {
        if (!rates.value.length) return null;
        const values = rates.value.map(r => r.rate);
        return (Math.max(...values) - Math.min(...values)) / Math.min(...values) < 0.01;
    });
    const canceled = computed(() => usage.value?.models.reduce((sum, m) => sum + m.canceled, 0) ?? 0);
    const totals = computed(() => ({
        estimateTwd: days.value.reduce((sum, d) => sum + (d.estimateTwd ?? 0), 0),
        actualTwd: days.value.reduce((sum, d) => sum + d.actualTwd, 0)
    }));
</script>

<template>
    <section class="dd-reconcile" aria-labelledby="dd-reconcile-title">
        <h3 id="dd-reconcile-title">估算跟帳單差多少（近 90 天）</h3>
        <p v-if="loading && !days.length" class="dd-usage__desc t-shimmer" data-text="對帳中…">對帳中…</p>
        <p v-if="error" class="dd-admin__error">對帳失敗：{{ error }}</p>

        <template v-if="days.length">
            <ul class="dd-reconcile__facts">
                <li>
                    <span class="label">實際是估算的</span>
                    <span class="value">{{ multiple ? `${multiple.toFixed(2)} 倍` : '—' }}</span>
                    <span class="hint">估算 {{ formatMoney(totals.estimateTwd) }}（換成台幣）、實付 {{ formatMoney(totals.actualTwd) }}</span>
                </li>
                <li>
                    <span class="label">換算係數</span>
                    <span class="value">{{ factor ? formatMoney(factor) : '—' }}</span>
                    <span class="hint">每 US$1 的估算，實際付多少台幣（全後台的金額都乘這個）</span>
                </li>
                <li>
                    <span class="label">匯率（從帳單反推）</span>
                    <span class="value">{{ rate ? rate.toFixed(2) : '—' }}</span>
                    <span class="hint">台幣／美元</span>
                </li>
            </ul>

            <h4>查到的原因</h4>
            <ul class="dd-reconcile__causes">
                <li v-if="pricesMatch !== null" :class="pricesMatch ? 'is-ok' : 'is-bad'">
                    <strong>價目表的單價{{ pricesMatch ? '沒問題' : '有一項對不上' }}</strong>：每個計價項目用帳單反推的匯率
                    {{ rates.map(r => r.rate.toFixed(2)).join('、') }}{{ pricesMatch ? '，差不到 1%——落差是 token 數對不上，不是價錢錯。' : '，差最多的那一項的單價寫錯了。' }}
                </li>
                <li class="is-bad">
                    <strong>被取消的加問：{{ formatInt(canceled) }} 次</strong>。照片辨識 5 秒沒回來會加問備援模型，輸掉的那個被中途取消，
                    Gemini 不回 token 數、後端記 0；但 Google 已經讀完輸入（照片），照樣收錢。照片多的日子差最多。
                </li>
                <li class="is-bad">
                    <strong>測試裝置不在估算裡</strong>：用量報表刻意排除測試裝置（#0074），但 API 控制台用測試裝置試打 AI 是真的呼叫 Gemini、真的收錢。
                </li>
                <li>
                    <strong>同一把金鑰的其他用量</strong>：本機開發、AI Studio 網頁試 prompt 也記在同一個帳上，後台看不到。
                </li>
            </ul>
            <p class="dd-usage__desc">要知道各占多少，得把後端每天、每個模型的 token（含測試裝置與被取消的次數）跟帳單逐日對；已經請後端算（溝通板）。</p>

            <details class="dd-reconcile__days">
                <summary>逐日對帳（{{ days.length }} 天）</summary>
                <table class="dd-table dd-table--static">
                    <thead>
                        <tr>
                            <th scope="col">日期（台灣）</th>
                            <th scope="col" class="num">估算（換成台幣）</th>
                            <th scope="col" class="num">實付</th>
                            <th scope="col" class="num">差額</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="day in days" :key="day.date">
                            <th scope="row">{{ day.date }}</th>
                            <td class="num">{{ day.estimateTwd === null ? '—' : formatMoney(day.estimateTwd) }}</td>
                            <td class="num">{{ formatMoney(day.actualTwd) }}</td>
                            <td class="num" :class="{ 'is-gap': (day.gapTwd ?? 0) > 0.05 }">{{ day.gapTwd === null ? '—' : formatMoney(day.gapTwd) }}</td>
                        </tr>
                    </tbody>
                </table>
            </details>
        </template>
    </section>
</template>

<style lang="scss">
    .dd-reconcile {
        @include setFlex(flex-start, stretch, 10px, column);
        padding-top: 14px;
        border-top: 1px dashed var(--vp-c-divider);

        h3,
        h4 { font-size: var(--font-size-m); }
        h4 {
            margin-top: 4px !important;
            font-size: var(--font-size-s);
        }
        &__facts {
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
            .hint {
                color: var(--vp-c-text-3);
                font-size: 12px;
            }
        }
        &__causes {
            @include setFlex(flex-start, stretch, 6px, column);
            padding-left: 1.2em;
            margin: 0;
            font-size: var(--font-size-s);
            list-style: disc;
            line-height: 1.7;

            .is-ok::marker { color: var(--vp-c-green-1); }
            .is-bad::marker { color: var(--vp-c-danger-1); }
        }
        &__days summary {
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            cursor: pointer;
        }
        .is-gap { color: var(--vp-c-danger-1); }
    }
</style>
