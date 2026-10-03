<script setup lang="ts">
    import { computed } from 'vue';
    import { DATA_RESET_DAY, skuRates } from '../billingCalibration';
    import { formatMoney } from '../googleData';
    import { useCostCalibration } from '../useCostCalibration';

    // 帳單拆開來看（2026-10-03 照後端的量測改寫，溝通板 #0085、#0086）：近 90 天、只看帳單已經匯出的日子。
    // 後端逐日、逐模型對過：估算本身是準的（10/01 一個 token 都不差），帳單比估算多的都是後端看不到的用量。
    // 帳單 = 使用者 + 測試／開發 + 被取消的加問 + 其他；前三塊是資料庫的估算 × 帳單上的匯率，其他是剩下的。
    const { billing, usage, rate, days, split, error, loading } = useCostCalibration();

    const rates = computed(() => (billing.value && usage.value ? skuRates(billing.value.skus, usage.value.pricesUsed) : []));
    /** 每一項反推的匯率差不到 1%：價目表沒問題 */
    const pricesMatch = computed(() => {
        if (!rates.value.length) return null;
        const values = rates.value.map(r => r.rate);
        return (Math.max(...values) - Math.min(...values)) / Math.min(...values) < 0.01;
    });
    const rateSource = computed(() => (billing.value?.usdRate ? 'Google 帳單上的匯率' : '從帳單反推的匯率（後端還沒給 usd_rate）'));
    const resetLabel = `${Number(DATA_RESET_DAY.slice(5, 7))}/${Number(DATA_RESET_DAY.slice(8)) - 1}`;

    const parts = computed(() => {
        const s = split.value;
        const share = (twd: number) => (s.paidTwd > 0 ? `${Math.round((twd / s.paidTwd) * 100)}%` : '');
        return [
            { key: 'users', label: '使用者', twd: s.usersTwd, share: share(s.usersTwd), hint: '一般裝置的資料庫估算 × 匯率' },
            { key: 'test', label: '測試／開發', twd: s.testTwd, share: share(s.testTwd), hint: '標成測試／開發用的裝置（開發成本）' },
            { key: 'canceled', label: '被取消的加問', twd: s.canceledTwd, share: share(s.canceledTwd), hint: '照片 5 秒沒回來加問備援，輸掉的那個 Google 照收輸入' },
            { key: 'reset', label: `${resetLabel} 以前`, twd: s.resetTwd, share: share(s.resetTwd), hint: '9/28 清過資料庫，這段的紀錄刪了，後端是 0' },
            { key: 'other', label: '其他', twd: s.otherTwd, share: share(s.otherTwd), hint: '本機開發、驗證小工具、AI Studio 網頁（同一個帳單帳戶）' }
        ];
    });
</script>

<template>
    <section class="dd-reconcile" aria-labelledby="dd-reconcile-title">
        <h3 id="dd-reconcile-title">帳單拆開來看（近 90 天）</h3>
        <p v-if="loading && !days.length" class="dd-usage__desc t-shimmer" data-text="對帳中…">對帳中…</p>
        <p v-if="error" class="dd-admin__error">對帳失敗：{{ error }}</p>

        <template v-if="days.length && rate">
            <p class="dd-usage__desc">
                帳單實付 <strong>{{ formatMoney(split.paidTwd) }}</strong>（{{ days[days.length - 1].date }}～{{ days[0].date }}）。
                前三塊是資料庫的估算 × {{ rate.toFixed(2) }}（{{ rateSource }}），其他是帳單扣掉它們剩下的。
            </p>
            <ul class="dd-reconcile__parts">
                <li v-for="part in parts" :key="part.key" :class="`is-${part.key}`">
                    <span class="label">{{ part.label }}</span>
                    <span class="value">{{ formatMoney(part.twd) }}</span>
                    <span class="share">{{ part.share }}</span>
                    <span class="hint">{{ part.hint }}</span>
                </li>
            </ul>

            <h4>後端量過的結論（溝通板 #0085）</h4>
            <ul class="dd-reconcile__causes">
                <li class="is-ok">
                    <strong>估算本身是準的</strong>：10/01 沒有清庫、沒有本機測試、沒有取消，帳單跟估算的輸入、輸出 token 一模一樣。
                    所以每個功能、每台裝置的金額直接用「估算 × 匯率」，不再乘「實付 ÷ 估算」的倍數（那會把下面這些錢算到使用者頭上）。
                </li>
                <li v-if="pricesMatch !== null" :class="pricesMatch ? 'is-ok' : 'is-bad'">
                    <strong>價目表的單價{{ pricesMatch ? '沒問題' : '有一項對不上' }}</strong>：每個計價項目用帳單反推的匯率
                    {{ rates.map(r => r.rate.toFixed(2)).join('、') }}{{ pricesMatch ? '，差不到 1%。' : '，差最多的那一項的單價寫錯了。' }}
                </li>
                <li>
                    <strong>{{ resetLabel }} 以前</strong>：beta 前（9/28）清正式資料庫時，被刪的裝置的 AI 紀錄一起刪了。帳單有錢、後端永遠看不到，不是估算的問題。
                </li>
                <li>
                    <strong>其他</strong>：開發時用真的模型驗提示、AI Studio 網頁試 prompt，用的是同一個帳單帳戶。最近一兩天 Google 還在修正帳單，可能是負的，過兩天會對上。
                </li>
            </ul>

            <details class="dd-reconcile__days">
                <summary>逐日拆帳（{{ days.length }} 天）</summary>
                <table class="dd-table dd-table--static">
                    <thead>
                        <tr>
                            <th scope="col">日期（台灣）</th>
                            <th scope="col" class="num">實付</th>
                            <th scope="col" class="num">使用者</th>
                            <th scope="col" class="num">測試／開發</th>
                            <th scope="col" class="num">取消的加問</th>
                            <th scope="col" class="num">其他</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="day in days" :key="day.date" :class="{ 'is-reset': day.beforeReset }">
                            <th scope="row">{{ day.date }}<small v-if="day.beforeReset">清庫前</small></th>
                            <td class="num">{{ formatMoney(day.paidTwd) }}</td>
                            <td class="num">{{ formatMoney(day.usersTwd) }}</td>
                            <td class="num">{{ formatMoney(day.testTwd) }}</td>
                            <td class="num">{{ formatMoney(day.canceledTwd) }}</td>
                            <td class="num">{{ formatMoney(day.otherTwd) }}</td>
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
        &__parts {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 12px;
            padding: 0;
            margin: 0;
            list-style: none;

            li {
                display: grid;
                grid-template-columns: 1fr auto;
                gap: 2px 8px;
                align-content: start;
                padding: 12px 14px;
                border: 1px solid var(--vp-c-divider);
                border-top: 3px solid var(--part);
                border-radius: var(--dd-corner);
            }
            .is-users { --part: var(--vp-c-brand-1); }
            .is-test { --part: var(--vp-c-purple-1); }
            .is-canceled { --part: var(--vp-c-yellow-1); }
            .is-reset { --part: var(--vp-c-text-3); }
            .is-other { --part: var(--vp-c-danger-1); }
            .label {
                grid-column: 1 / -1;
                color: var(--vp-c-text-2);
                font-size: var(--font-size-s);
            }
            .value {
                font-family: var(--dd-mono);
                font-size: var(--font-size-l);
                font-weight: 700;
            }
            .share {
                align-self: end;
                color: var(--vp-c-text-2);
                font-family: var(--dd-mono);
                font-size: var(--font-size-s);
            }
            .hint {
                grid-column: 1 / -1;
                color: var(--vp-c-text-3);
                font-size: 12px;
            }
        }
        &__causes {
            @include setFlex(flex-start, stretch, 6px, column);
            padding-left: 1.2em;
            margin: 0;
            font-size: var(--font-size-s);
            line-height: 1.7;
            list-style: disc;

            .is-ok::marker { color: var(--vp-c-green-1); }
            .is-bad::marker { color: var(--vp-c-danger-1); }
        }
        &__days summary {
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            cursor: pointer;
        }
        &__days {
            .is-reset { color: var(--vp-c-text-3); }
            small {
                margin-left: 6px;
                font-size: 11px;
            }
        }
    }
</style>
