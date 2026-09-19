<script setup lang="ts">
    const { size = 72 } = defineProps<{ size?: number }>();
</script>

<template>
    <!--
        App 圖示（DinDon_Android/design/icon/icon.svg）的鈴鐺，拿掉長陰影，改成會響的版本。
        鈴鐺與硬幣都繞頂端掛環 (54, 30) 轉；靜止姿勢 -12° / -5° 就是原圖示的角度，擺完會停回這裡。
        長陰影不留：它是固定的，鈴鐺一擺就對不上。
    -->
    <span class="dindon-bell" :style="{ width: `${size}px`, height: `${size}px` }">
        <svg viewBox="18 18 72 72" role="img" aria-label="叮咚記帳圖示">
            <g transform="translate(0 -1.5) translate(54 54) scale(0.7) translate(-54 -54)">
                <g transform="translate(-4 0)">
                    <g class="coin">
                        <path d="M43.5,83 a10.5,10.5 0 1,0 21,0 a10.5,10.5 0 1,0 -21,0 Z" fill="#1D59BB" />
                        <path d="M57.25,80.01 C56.34,78.45 50.49,78.32 50.49,81.31 C50.49,83.78 57.51,82.61 57.51,85.08 C57.51,88.07 51.53,87.94 50.49,86.25 M54,76.5 V78.58 M54,87.68 V89.5" fill="none" stroke="#FEFDFC" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
                    </g>
                    <g class="bell">
                        <path d="M49.8,28.5 a4.2,4.2 0 1,0 8.4,0 a4.2,4.2 0 1,0 -8.4,0 Z" fill="#FEBD19" />
                        <path d="M54,31 C42.5,31 36.5,40 36.5,51 V60.5 C36.5,64.5 34.5,67 31.5,68.8 C30.2,69.6 29.5,70.8 29.5,72 C29.5,74 31,75.5 33,75.5 H75 C77,75.5 78.5,74 78.5,72 C78.5,70.8 77.8,69.6 76.5,68.8 C73.5,67 71.5,64.5 71.5,60.5 V51 C71.5,40 65.5,31 54,31 Z" fill="#FEBD19" />
                        <path d="M44.5,53.5 Q47.5,57 50.5,53.5 M57.5,53.5 Q60.5,57 63.5,53.5" fill="none" stroke="#1B1815" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                        <path d="M40.1,60.5 a2.7,2.7 0 1,0 5.4,0 a2.7,2.7 0 1,0 -5.4,0 Z M62.5,60.5 a2.7,2.7 0 1,0 5.4,0 a2.7,2.7 0 1,0 -5.4,0 Z" fill="#F95C4B" fill-opacity="0.6" />
                        <path d="M51.5,60.5 Q54,63 56.5,60.5" fill="none" stroke="#1B1815" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
                    </g>
                </g>
                <path class="waves" d="M79,41 A13,13 0 0 1 82,53 M85.5,33.5 A21,21 0 0 1 89.5,54 M29,41 A13,13 0 0 0 26,53 M22.5,33.5 A21,21 0 0 0 18.5,54" fill="none" stroke="#1D59BB" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" />
            </g>
        </svg>
    </span>
</template>

<style lang="scss">
    .dindon-bell {
        display: inline-block;
        background: #FEFDFC;
        border-radius: 25%;
        overflow: hidden;

        svg {
            display: block;
            width: 100%;
            height: 100%;
        }

        // 用 view-box 讓 transform-origin 以 SVG 座標計算，(54, 30) 就是掛環
        // 動畫與通知卡片共用同一組時間（--dd-story-*，定義在宣傳頁根元素），鈴一響通知就跳出來
        .bell, .coin, .waves {
            transform-box: view-box;
            animation-duration: var(--dd-story-duration, 8s);
            animation-timing-function: ease-in-out;
            animation-delay: var(--dd-story-delay, .9s);
            animation-iteration-count: infinite;
        }
        .bell {
            transform: rotate(-12deg);
            transform-origin: 54px 30px;
            animation-name: dd-bell-swing;
        }
        .coin {
            transform: rotate(-5deg);
            transform-origin: 54px 30px;
            animation-name: dd-coin-swing; // 鈴錘慢半拍、擺得比較大，才像被鈴身帶著甩
        }
        .waves {
            transform-origin: 54px 54px;
            animation-name: dd-waves;
        }
        @media (prefers-reduced-motion: reduce) {
            .bell, .coin, .waves { animation: none; }
        }
    }

    // 擺幅逐次變小，最後停回原圖示的姿勢
    @keyframes dd-bell-swing {
        0%, 4% { transform: rotate(-12deg); }
        7% { transform: rotate(10deg); }
        10% { transform: rotate(-32deg); }
        13% { transform: rotate(2deg); }
        16% { transform: rotate(-22deg); }
        19% { transform: rotate(-7deg); }
        22%, 100% { transform: rotate(-12deg); }
    }
    @keyframes dd-coin-swing {
        0%, 5.5% { transform: rotate(-5deg); }
        8.5% { transform: rotate(18deg); }
        11.5% { transform: rotate(-28deg); }
        14.5% { transform: rotate(10deg); }
        17.5% { transform: rotate(-16deg); }
        20.5% { transform: rotate(-2deg); }
        24%, 100% { transform: rotate(-5deg); }
    }
    @keyframes dd-waves {
        0%, 5% {
            transform: scale(1);
            opacity: 1;
        }
        7% {
            transform: scale(.88);
            opacity: .25;
        }
        10% {
            transform: scale(1.1);
            opacity: 1;
        }
        13% {
            transform: scale(.92);
            opacity: .35;
        }
        16% {
            transform: scale(1.06);
            opacity: 1;
        }
        22%, 100% {
            transform: scale(1);
            opacity: 1;
        }
    }
</style>
