<script setup lang="ts">
    // 第 10 項：日期看發票、時分看 AI
    // 規則照 App 的 ReceiptDraft.resolveOccurredAt：日期以 QR 為準，時分以 AI 為準；
    // AI 讀到的日期跟 QR 對不上就不採用它的時間
</script>

<template>
    <div class="invoice-diagram">
        <!-- 一張電子發票證明聯：上面印著日期時間，下面兩個 QR -->
        <div class="receipt" aria-label="電子發票證明聯的示意圖">
            <p class="receipt-title">電子發票證明聯</p>
            <p class="receipt-period">115年09-10月</p>
            <p class="receipt-no">AB-12345678</p>
            <p class="receipt-time"><span class="is-date">2026-09-24</span> <span class="is-time">12:47:08</span></p>
            <div class="receipt-qrs" aria-hidden="true">
                <span class="qr" />
                <span class="qr" />
            </div>
        </div>

        <div class="lanes">
            <div class="lane is-qr">
                <p class="lane-title">▦ 掃 QR 碼</p>
                <dl>
                    <div class="is-pick">
                        <dt>日期</dt>
                        <dd>2026-09-24 ✓</dd>
                    </div>
                    <div class="is-none">
                        <dt>時間</dt>
                        <dd>QR 裡沒有這一欄</dd>
                    </div>
                </dl>
            </div>
            <div class="lane is-ai">
                <p class="lane-title">✦ AI 讀紙上的字</p>
                <dl>
                    <div>
                        <dt>日期</dt>
                        <dd>2026-09-24（拿來對答案）</dd>
                    </div>
                    <div class="is-pick">
                        <dt>時間</dt>
                        <dd>12:47 ✓</dd>
                    </div>
                </dl>
            </div>
        </div>

        <p class="result">
            <span class="result-label">記下來的時間</span>
            <strong><span class="is-date">2026-09-24</span> <span class="is-time">12:47</span></strong>
        </p>

        <ul class="notes">
            <li>AI 讀到的日期跟 QR 不一樣，代表它讀錯了，它的時間也不採用</li>
            <li>只拿得到日期時：今天開的發票用「現在」，才對得上幾分鐘前的付款通知；以前的用中午 12:00，時區稍微一偏也不會掉到前一天</li>
        </ul>
    </div>
</template>

<style lang="scss" scoped>
    .invoice-diagram {
        .receipt {
            @include setFlex(flex-start, center, 2px, column);
            background: #FEFDFC;
            width: 200px;
            padding: 14px 16px 16px;
            border-radius: 4px;
            margin: 0 auto;
            box-shadow: 0 2px 10px rgb(27, 24, 21, 12%);
            color: #1B1815;
            font-family: var(--vp-font-family-mono);
            font-size: var(--font-size-xs);
        }
        .receipt-title {
            font-family: inherit;
            font-weight: 700;
        }
        .receipt-period {
            font-size: var(--font-size-m);
            font-weight: 800;
        }
        .receipt-time .is-time {
            padding: 0 2px;
            border-radius: 3px;
            animation: invoice-ai 6s ease infinite;
        }
        .receipt-qrs {
            @include setFlex(center, center, 10px);
            padding: 4px;
            border-radius: 4px;
            margin-top: 8px;
            animation: invoice-qr 6s ease infinite;
        }
        .qr {
            // 用重複的格子畫出 QR 的樣子，不是真的碼
            background:
                conic-gradient(#1B1815 25%, transparent 0 50%, #1B1815 0 75%, transparent 0) 0 0 / 12px 12px,
                #FEFDFC;
            @include setSize(64px, 64px);
            border: 4px solid #1B1815;
        }
        .lanes {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 16px;
        }
        .lane {
            background: var(--dd-bg);
            padding: 10px;
            border: 1px solid var(--dd-border);
            border-radius: 12px;
            font-size: var(--font-size-xs);

            &.is-qr .lane-title { color: var(--dd-accent-border); }
            &.is-ai .lane-title { color: var(--dd-primary); }
            dl {
                @include setFlex(flex-start, stretch, 6px, column);
                margin: 6px 0 0;
            }
            dt { color: var(--dd-muted); }
            dd {
                margin: 0;
                font-weight: 600;
            }
            .is-pick dd { font-weight: 800; }
            .is-none dd {
                color: var(--dd-muted);
                font-weight: 400;
            }
        }
        .lane-title { font-weight: 800; }
        .result {
            @include setFlex(space-between, center, 8px);
            background: var(--dd-accent-tint);
            padding: 10px 14px;
            border: 1px solid var(--dd-accent-border);
            border-radius: 12px;
            margin-top: 10px;
            color: #1B1815;

            .result-label { font-size: var(--font-size-xs); }
            strong { font-size: var(--font-size-m); }
            .is-date { color: #A87400; }
            .is-time { color: #1D59BB; }
        }
    }

    // 一輪 6 秒：先亮 QR（日期），再亮印出來的時間（AI）
    @keyframes invoice-qr {
        0%, 8% { background: transparent; }
        15%, 45% { background: color-mix(in srgb, #FEBD19 45%, transparent); }
        55%, 100% { background: transparent; }
    }
    @keyframes invoice-ai {
        0%, 45% { background: transparent; }
        55%, 90% { background: color-mix(in srgb, #1D59BB 22%, transparent); }
        100% { background: transparent; }
    }
    @media (prefers-reduced-motion: reduce) {
        .invoice-diagram .receipt-qrs, .invoice-diagram .receipt-time .is-time { animation: none; }
    }
</style>
