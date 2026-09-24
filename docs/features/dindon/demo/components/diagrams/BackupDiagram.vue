<script setup lang="ts">
    // 第 39 項：帳只在手機上，跟著系統備份走
    // 備份範圍照 App 的 data_extraction_rules.xml（資料庫與偏好設定，雲端備份與換機傳輸一樣）；
    // 伺服器記什麼照隱私權政策
</script>

<template>
    <div class="backup-diagram">
        <div class="device">
            <p class="device-title">📱 你的手機</p>
            <p class="device-text">帳目、分類、標籤、設定<br />全部存在 App 自己的空間</p>
        </div>

        <div class="flow" aria-hidden="true">
            <span class="dot" />
            <span class="dot" />
            <span class="dot" />
        </div>

        <div class="cloud">
            <p class="device-title">☁️ Android 系統備份</p>
            <p class="device-text">跟著你的 Google 帳號，由手機系統備份<br />換機時也可以兩支手機直接傳</p>
        </div>

        <div class="flow" aria-hidden="true">
            <span class="dot" />
            <span class="dot" />
            <span class="dot" />
        </div>

        <div class="device">
            <p class="device-title">📱 新手機</p>
            <p class="device-text">登入同一個 Google 帳號，裝回叮咚記帳<br />帳就回來了</p>
        </div>

        <div class="server">
            <p class="device-title">🖥️ 叮咚的伺服器</p>
            <p class="device-text"><strong>沒有你的帳。</strong>只記得這台裝置的 AI 額度與使用次數，不知道你是誰</p>
        </div>

        <ul class="notes">
            <li>不用註冊、不用登入就能用</li>
            <li>綁定 Google 帳號是選填的，拿回的是方案、AI 額度與紀念徽章，不是帳目</li>
            <li>想自己留一份：<a href="#40-export">JSON 完整備份</a>，隨時匯出、匯入還原</li>
        </ul>
    </div>
</template>

<style lang="scss" scoped>
    .backup-diagram {
        @include setFlex(flex-start, stretch, 0, column);

        .device, .cloud, .server {
            background: var(--dd-bg);
            padding: 12px 14px;
            border: 1px solid var(--dd-border);
            border-radius: 14px;
            text-align: center;
        }
        .cloud {
            background: color-mix(in srgb, var(--dd-primary) 10%, var(--dd-bg));
            border-color: color-mix(in srgb, var(--dd-primary) 40%, transparent);
        }
        .server {
            border-style: dashed;
            margin-top: 18px;
            opacity: .9;
        }
        .device-title { font-weight: 800; }
        .device-text {
            color: var(--dd-muted);
            font-size: var(--font-size-xs);
            line-height: 1.7;

            strong { color: var(--dd-text); }
        }

        // 資料一顆一顆往下流
        .flow {
            position: relative;
            height: 44px;
            border-left: 2px dashed var(--dd-border);
            margin: 0 auto;
        }
        .dot {
            position: absolute;
            top: 0;
            left: -6px;
            background: var(--dd-accent);
            @include setSize(10px, 10px);
            border-radius: 50%;
            animation: backup-flow 1.8s linear infinite;

            &:nth-child(2) { animation-delay: .6s; }
            &:nth-child(3) { animation-delay: 1.2s; }
        }
        .notes a {
            color: var(--dd-primary);
            text-decoration: underline;
        }
    }
    @keyframes backup-flow {
        0% {
            transform: translateY(0);
            opacity: 0;
        }
        15%, 85% { opacity: 1; }
        100% {
            transform: translateY(34px);
            opacity: 0;
        }
    }
    @media (prefers-reduced-motion: reduce) {
        .backup-diagram .dot { display: none; }
    }
</style>
