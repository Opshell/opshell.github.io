<script setup lang="ts">
    // 第 4 項：通知送出前先抹掉卡號與餘額
    // 範例的前後對照是拿 App 的 NotificationParser.deIdentify 實際跑出來的結果，改規則的話這裡要跟著對
    interface iPiece {
        text: string;
        /** 有值就是會被抹掉的部分，值是抹掉之後剩下的字 */
        redact?: string;
    }

    const examples: { source: string; pieces: iPiece[] }[] = [
        {
            source: '信用卡的刷卡通知',
            pieces: [
                { text: '您的' },
                { text: '卡號末四碼 4106', redact: '卡片' },
                { text: ' 於 09/24 12:30 在全家便利商店 刷卡消費 NT$120' }
            ]
        },
        {
            source: '銀行的轉帳通知',
            pieces: [
                { text: '存簿' },
                { text: '帳號末五碼16425', redact: '帳號' },
                { text: ' 轉出 1,200 元，' },
                { text: '可用餘額 25,380 元', redact: '餘額' }
            ]
        }
    ];
</script>

<template>
    <div class="redact-diagram">
        <div v-for="example in examples" :key="example.source" class="example">
            <p class="label">📱 手機收到的{{ example.source }}</p>
            <p class="bubble is-source">
                <template v-for="(piece, index) in example.pieces" :key="index">
                    <mark v-if="piece.redact">{{ piece.text }}</mark>
                    <template v-else>{{ piece.text }}</template>
                </template>
            </p>

            <p class="arrow" aria-hidden="true">↓ 在手機上先抹掉</p>

            <p class="label">☁️ 送去 AI 分類的</p>
            <p class="bubble is-sent">
                <template v-for="(piece, index) in example.pieces" :key="index">
                    <span v-if="piece.redact" class="chip">{{ piece.redact }}</span>
                    <template v-else>{{ piece.text }}</template>
                </template>
            </p>
        </div>

        <ul class="notes">
            <li><strong>抹掉</strong>：卡號末四碼（含 ****1234 這種寫法）、帳號與帳號末幾碼、餘額</li>
            <li><strong>留著</strong>：金額、店家、時間——判斷分類只需要這些</li>
            <li>AI 分類預設是關的；沒開的話，通知只在手機上解析，一個字都不會送出去</li>
        </ul>
    </div>
</template>

<style lang="scss" scoped>
    .redact-diagram {
        .example {
            @include setFlex(flex-start, stretch, 6px, column);
            & + .example {
                padding-top: 18px;
                border-top: 1px dashed var(--dd-border);
            }
        }
        .label {
            color: var(--dd-muted);
            font-size: var(--font-size-xs);
            font-weight: 700;
        }
        .bubble {
            background: var(--dd-bg);
            padding: 10px 12px;
            border: 1px solid var(--dd-border);
            border-radius: 12px;
            font-size: var(--font-size-s);
            line-height: 1.8;
        }

        // 一輪 6 秒：先把敏感的部分標出來，接著下面的結果換成替代字
        mark {
            background: transparent;
            padding: 1px 2px;
            border-radius: 4px;
            color: inherit;
            animation: redact-mark 6s ease infinite;
        }
        .chip {
            display: inline-block;
            background: var(--dd-sunken);
            padding: 0 8px;
            border-radius: 6px;
            color: var(--dd-muted);
            font-weight: 700;
            animation: redact-chip 6s ease infinite;
        }
        .arrow {
            color: var(--dd-accent-border);
            font-size: var(--font-size-xs);
            font-weight: 700;
            text-align: center;
        }
    }
    @keyframes redact-mark {
        0%, 12% { background: transparent; }
        20%, 100% {
            background: color-mix(in srgb, #E5484D 22%, transparent);
            text-decoration: line-through;
        }
    }
    @keyframes redact-chip {
        0%, 30% {
            transform: scale(.8);
            opacity: 0;
        }
        40%, 100% {
            transform: none;
            opacity: 1;
        }
    }
    @media (prefers-reduced-motion: reduce) {
        .redact-diagram mark, .redact-diagram .chip { animation: none; }
        .redact-diagram mark {
            background: color-mix(in srgb, #E5484D 22%, transparent);
            text-decoration: line-through;
        }
    }
</style>
