<script setup lang="ts">
    import { useLandingMotion } from '@shared/hooks/useLandingMotion';
    import { onBeforeUnmount, onMounted, ref } from 'vue';
    import {
        ACCOUNT_PATH,
        autoPoints,
        CONTACT_EMAIL,
        FRONTIER_COINS,
        FRONTIER_PERIOD,
        frontierBadges,
        frontierPlaces,
        frontierStatuses,
        frontierSteps,
        helperPoints,
        LAUNCHED,
        lazyPoints,
        milestoneStages,
        monthCloseSteps,
        photoSources,
        pillars,
        PLAY_STORE_URL,
        PRIVACY_PATH
    } from '../constants';
    import DinDonBell from './DinDonBell.vue';
    import FrontierArt from './FrontierArt.vue';
    import PromoStory from './PromoStory.vue';
    import PromoVideo from './PromoVideo.vue';

    const rootRef = ref<HTMLElement>();
    useLandingMotion(rootRef);

    const delay = (index: number, step = 80) => ({ '--reveal-delay': `${index * step}ms` });

    // 月結短片：看得到才播、捲走就停（一直播的影片跟無限 CSS 動畫一樣會讓整頁持續重繪）。
    // 不寫 autoplay 屬性：SSR 的 HTML 一載入就會播，減少動態的設定來不及擋
    const closeVideoRef = ref<HTMLVideoElement>();
    let videoObserver: IntersectionObserver | undefined;
    onMounted(() => {
        const video = closeVideoRef.value;
        if (!video) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            video.controls = true;
            return;
        }
        videoObserver = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) video.play().catch(() => { video.controls = true; });
            else video.pause();
        }, { threshold: 0.4 });
        videoObserver.observe(video);
    });
    onBeforeUnmount(() => videoObserver?.disconnect());
</script>

<template>
    <div ref="rootRef" class="dindon-landing">
        <!-- #region [P] hero：隨身記帳助手（#756，2026-11-21 改定位：不只記流水帳，還幫你理、陪你存） -->
        <section class="dindon-landing__hero" data-loop>
            <!-- 背景的平面圓塊，速度不同做出景深 -->
            <span class="dindon-landing__deco dindon-landing__deco--a" data-parallax=".35" data-parallax-scroll aria-hidden="true" />
            <span class="dindon-landing__deco dindon-landing__deco--b" data-parallax=".2" data-parallax-scroll aria-hidden="true" />
            <span class="dindon-landing__deco dindon-landing__deco--c" data-parallax="-.15" data-parallax-scroll aria-hidden="true" />

            <div class="dindon-landing__container dindon-landing__hero-inner">
                <div class="dindon-landing__hero-copy">
                    <div class="dindon-landing__brand">
                        <DinDonBell :size="72" class="icon" />
                        <div>
                            <p class="name">叮咚記帳</p>
                            <p class="latin">DinDon Ledger</p>
                        </div>
                    </div>

                    <p class="dindon-landing__chip">你的隨身記帳助手</p>
                    <h1 class="dindon-landing__headline">幫你記好每一筆，<br />也陪你把錢管好。</h1>
                    <p class="dindon-landing__lead">
                        付款通知一跳出來，小精靈就幫你記好、分好類；月初幫你結帳，告訴你錢去哪、多花在哪；記帳里程碑一階一階陪你養成習慣、存得下錢。
                    </p>

                    <div class="dindon-landing__actions">
                        <a v-if="LAUNCHED" class="dindon-landing__btn dindon-landing__btn--primary" :href="PLAY_STORE_URL">到 Google Play 下載<span class="arrow" aria-hidden="true">→</span></a>
                        <!-- 還沒上架：商店頁對外是 404，不放連結（constants.ts 的 LAUNCHED） -->
                        <p v-else class="dindon-landing__soon">即將在 Google Play 上架</p>
                        <a class="dindon-landing__btn" href="#why">看它會幫你做什麼<span class="arrow arrow--down" aria-hidden="true">↓</span></a>
                    </div>
                    <p class="dindon-landing__note">Android 7.0 以上 · 免費 · 不用註冊</p>
                    <!-- 上架活動的入口：只寫起訖，不寫「進行中」，靜態頁過了期限也不會說錯 -->
                    <a class="dindon-landing__season" href="#frontier">
                        <FrontierArt art="star" :size="20" />
                        <span>西部拓荒季 {{ FRONTIER_PERIOD }}</span>
                        <span class="arrow" aria-hidden="true">↓</span>
                    </a>
                </div>

                <div class="dindon-landing__hero-shot">
                    <!-- 「一天的帳」：六幕約 14 秒，把重點演一遍再停住（PromoStory.vue） -->
                    <div class="dindon-landing__hero-stage">
                        <PromoStory />
                    </div>
                </div>
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region [P] 三件事：幫你記、幫你理、陪你走 -->
        <section id="why" class="dindon-landing__section">
            <div class="dindon-landing__container">
                <p class="dindon-landing__eyebrow" data-reveal>不只是一本流水帳</p>
                <h2 class="dindon-landing__title" data-reveal :style="delay(1)">記帳最難的不是記，是記了之後</h2>
                <p class="dindon-landing__subtitle" data-reveal :style="delay(2)">
                    記了一整個月，還是不知道錢去哪了、該怎麼存。叮咚記帳把這三件事都接過去：
                </p>

                <ol class="dindon-landing__pillars">
                    <li v-for="(pillar, index) in pillars" :key="pillar.title" class="dindon-landing__card" data-reveal :style="delay(index, 90)">
                        <span class="feature-icon" aria-hidden="true">{{ pillar.icon }}</span>
                        <h3>{{ pillar.title }}</h3>
                        <p>{{ pillar.text }}</p>
                    </li>
                </ol>
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region [P] 幫你記：帳從哪裡來 -->
        <section class="dindon-landing__section dindon-landing__section--sunken">
            <div class="dindon-landing__container dindon-landing__split dindon-landing__split--reverse">
                <div class="dindon-landing__split-copy">
                    <p class="dindon-landing__eyebrow" data-reveal>幫你記</p>
                    <h2 class="dindon-landing__title" data-reveal :style="delay(1)">付完錢，帳就記好了</h2>
                    <p class="dindon-landing__subtitle" data-reveal :style="delay(2)">電子支付越來越普及，付款的那一刻，本來就該等於記完帳。</p>

                    <ul class="dindon-landing__points">
                        <li v-for="(item, index) in autoPoints" :key="item.title" class="dindon-landing__card" data-reveal :style="delay(index + 2, 70)">
                            <span class="feature-icon" aria-hidden="true">{{ item.icon }}</span>
                            <h3>{{ item.title }}</h3>
                            <p>{{ item.text }}</p>
                        </li>
                    </ul>
                </div>

                <figure class="dindon-landing__figure" data-reveal>
                    <div class="dindon-landing__phone" data-parallax="-.06">
                        <img src="/images/dindon/home.webp" alt="帳本首頁：今天兩筆都是付款通知自動記進來的，上面是今日花費與本月累積" loading="lazy" width="720" height="1600" />
                    </div>
                    <figcaption>右下角的小鈴鐺：這筆是通知自動記的</figcaption>
                </figure>
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region [P] 拍照：挑戰隨手記帳的速度極限 -->
        <section class="dindon-landing__section">
            <div class="dindon-landing__container dindon-landing__split">
                <div class="dindon-landing__split-copy">
                    <p class="dindon-landing__eyebrow" data-reveal>沒有通知也不用打字</p>
                    <h2 class="dindon-landing__title" data-reveal :style="delay(1)">拍照記帳只能拍電子發票？</h2>
                    <p class="dindon-landing__no" data-reveal :style="delay(2)">不。</p>

                    <ul class="dindon-landing__sources" aria-label="拍照記帳能拍的東西">
                        <li v-for="(source, index) in photoSources" :key="source" data-reveal :style="delay(index + 3, 70)">{{ source }}</li>
                    </ul>

                    <p class="dindon-landing__shutter" data-reveal>
                        上面有資料，<strong>喀嚓</strong>，5 秒，記完帳了。
                    </p>
                </div>

                <div class="dindon-landing__phones">
                    <div class="dindon-landing__phone dindon-landing__phone--back" data-parallax=".06">
                        <img src="/images/dindon/statement.webp" alt="帳單截圖記帳：信用卡帳單的每一列都讀出來，勾選後一次記好" loading="lazy" width="720" height="1600" />
                    </div>
                    <div class="dindon-landing__phone dindon-landing__phone--front" data-parallax="-.08">
                        <img src="/images/dindon/items.webp" alt="拍照記帳的結果：店家、分類與每個品項的金額" loading="lazy" width="720" height="1600" />
                    </div>
                </div>
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region [P] 幫你理：本來要自己算、自己記得的事 -->
        <section class="dindon-landing__section dindon-landing__section--sunken">
            <div class="dindon-landing__container">
                <p class="dindon-landing__eyebrow" data-reveal>幫你理</p>
                <h2 class="dindon-landing__title" data-reveal :style="delay(1)">記好之後，小精靈還會幫你想</h2>
                <p class="dindon-landing__subtitle" data-reveal :style="delay(2)">那些本來要自己算、自己記得的事。</p>

                <ul class="dindon-landing__features">
                    <li v-for="(item, index) in helperPoints" :key="item.title" class="dindon-landing__card" data-reveal :style="delay(index, 70)">
                        <span class="feature-icon" aria-hidden="true">{{ item.icon }}</span>
                        <h3>{{ item.title }}</h3>
                        <p>{{ item.text }}</p>
                    </li>
                </ul>
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region [P] 月結：每個月初，兩分鐘把帳結掉 -->
        <section class="dindon-landing__section">
            <div class="dindon-landing__container dindon-landing__split">
                <div class="dindon-landing__split-copy">
                    <p class="dindon-landing__eyebrow" data-reveal>幫你總結</p>
                    <h2 class="dindon-landing__title" data-reveal :style="delay(1)">每個月初，花兩分鐘把帳結掉</h2>
                    <p class="dindon-landing__subtitle" data-reveal :style="delay(2)">
                        「新的一個月開始了。我們花兩分鐘，把上個月的帳結掉吧！」小精靈先把數字整理好，你只要看、點一下。
                    </p>

                    <ol class="dindon-landing__close-steps">
                        <li v-for="(step, index) in monthCloseSteps" :key="step.title" data-reveal :style="delay(index + 3, 80)">
                            <span class="num" aria-hidden="true">{{ index + 1 }}</span>
                            <div>
                                <h3>{{ step.title }}</h3>
                                <p>{{ step.text }}</p>
                            </div>
                        </li>
                    </ol>
                </div>

                <div class="dindon-landing__phones">
                    <div class="dindon-landing__phone dindon-landing__phone--back" data-parallax=".06">
                        <img src="/images/dindon/close.webp" alt="10 月月結：可以自由花的金額、收入留下 18%、比平常多花在哪、固定支出有沒有變" loading="lazy" width="720" height="1600" />
                    </div>
                    <div class="dindon-landing__phone dindon-landing__phone--front" data-parallax="-.08">
                        <img src="/images/dindon/review.webp" alt="月結往下：每一類花了多少，以及三題復盤：最值得的一筆、最後悔的一筆、下個月想少一點的" loading="lazy" width="720" height="1600" />
                    </div>
                </div>
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region [P] 陪你走：記帳里程碑（字照 App 的 milestone.xml） -->
        <section id="milestones" class="dindon-landing__section dindon-landing__section--sunken">
            <div class="dindon-landing__container">
                <p class="dindon-landing__eyebrow" data-reveal>陪你走</p>
                <h2 class="dindon-landing__title" data-reveal :style="delay(1)">記帳里程碑：從記下來，到存得下來</h2>
                <p class="dindon-landing__subtitle" data-reveal :style="delay(2)">
                    不用先讀理財書。四階、六個里程碑，每點亮一個，小精靈就告訴你下一步做什麼，要的話一步一步帶你走。
                </p>

                <ol class="dindon-landing__stages">
                    <li v-for="(stage, index) in milestoneStages" :key="stage.name" data-reveal :style="delay(index, 90)">
                        <span class="step">第 {{ index + 1 }} 階</span>
                        <h3>{{ stage.name }}</h3>
                        <p>{{ stage.lesson }}</p>
                        <ul class="milestones" aria-label="這一階的里程碑">
                            <li v-for="milestone in stage.milestones" :key="milestone">{{ milestone }}</li>
                        </ul>
                    </li>
                </ol>

                <div class="dindon-landing__split dindon-landing__journey">
                    <figure class="dindon-landing__figure" data-reveal>
                        <div class="dindon-landing__phone dindon-landing__phone--video">
                            <video
                                ref="closeVideoRef"
                                src="/images/dindon/month-close.mp4"
                                poster="/images/dindon/month-close-poster.webp"
                                width="540"
                                height="1200"
                                muted
                                loop
                                playsinline
                                preload="none"
                                aria-label="錄影：從首頁進記帳里程碑，打開 10 月月結往下看，按下結好了，第一次關帳點亮，小精靈問要不要帶你走下一步"
                            />
                        </div>
                        <figcaption>結完第一個月，「第一次關帳」點亮</figcaption>
                    </figure>

                    <div class="dindon-landing__split-copy">
                        <blockquote class="dindon-landing__quote" data-reveal>
                            <p>會計師每個月都做這件事：關帳。記帳從這裡開始變成理財。</p>
                            <cite>點亮「第一次關帳」時，小精靈說的話</cite>
                        </blockquote>
                        <p class="dindon-landing__subtitle" data-reveal :style="delay(1)">
                            接著是「定錨」：弄清楚每個月不花也得出去多少；再來「先付給自己」：每月可支配是正的，而且每個月有存錢。
                            每一階都交給你一個數字——有帳的天數、儲蓄率、預備金夠幾個月、投資賺賠。
                        </p>
                        <p class="dindon-landing__subtitle" data-reveal :style="delay(2)">
                            另外還有 12 種徽章，每種都能從銅一路升到七彩。徽章牆獎勵「記」，里程碑獎勵「懂」。
                        </p>
                        <div class="dindon-landing__thumbs" data-reveal :style="delay(3)">
                            <div class="dindon-landing__phone">
                                <img src="/images/dindon/journey.webp" alt="記帳里程碑的旅程：第 1 階無腦記、第 2 階看懂錢流，帳本滿月與第一次關帳已點亮" loading="lazy" width="720" height="1600" />
                            </div>
                            <div class="dindon-landing__phone">
                                <img src="/images/dindon/badges.webp" alt="徽章牆：勤勞記帳、自動駕駛等 12 種徽章，從銅級升到七彩" loading="lazy" width="720" height="1600" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region [P] 放心用（每一點都要和隱私權政策對得上） -->
        <section class="dindon-landing__section">
            <div class="dindon-landing__container dindon-landing__split">
                <div class="dindon-landing__split-copy">
                    <h2 class="dindon-landing__title" data-reveal>最懶人，也最放心</h2>
                    <p class="dindon-landing__subtitle" data-reveal :style="delay(1)">最舒適的用法，也是最放心的用法。</p>

                    <ul class="dindon-landing__points">
                        <li v-for="(point, index) in lazyPoints" :key="point.title" class="dindon-landing__card" data-reveal :style="delay(index + 2, 80)">
                            <span class="feature-icon" aria-hidden="true">{{ point.icon }}</span>
                            <h3>{{ point.title }}</h3>
                            <p>{{ point.text }}</p>
                        </li>
                    </ul>

                    <p class="dindon-landing__links">
                        <a class="dindon-landing__link" :href="PRIVACY_PATH" data-reveal>看完整的隱私權政策<span class="arrow" aria-hidden="true">→</span></a>
                        <a class="dindon-landing__link" :href="ACCOUNT_PATH" data-reveal :style="delay(1)">要刪除資料或帳號<span class="arrow" aria-hidden="true">→</span></a>
                    </p>
                </div>

                <figure class="dindon-landing__figure" data-reveal="right">
                    <div class="dindon-landing__phone" data-parallax=".06">
                        <img src="/images/dindon/stats.webp" alt="花費統計：本月各分類的圓餅圖與金額" loading="lazy" width="720" height="1600" />
                    </div>
                    <figcaption>打開統計，直觀知道錢去哪了</figcaption>
                </figure>
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region [P] 18 秒看懂：宣傳短片，留給想分享給朋友的人。片尾 2026-11-22 從「封閉測試招募中」重做成「即將在 Google Play 上架」（#756），11-26 上架後改成「Google Play 上架了」（#897） -->
        <section id="video" class="dindon-landing__section dindon-landing__section--sunken">
            <div class="dindon-landing__container">
                <PromoVideo />
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region [P] 西部拓荒季（#756，上架活動）：不寫已緝拿幾家，宣傳頁拿不到即時資料，靜態數字會過時 -->
        <section id="frontier" class="dindon-landing__section dindon-landing__frontier">
            <div class="dindon-landing__container">
                <div class="dindon-landing__split dindon-landing__split--reverse">
                    <div class="dindon-landing__split-copy">
                        <p class="dindon-landing__eyebrow" data-reveal>上架活動 · {{ FRONTIER_PERIOD }}</p>
                        <h2 class="dindon-landing__title dindon-landing__frontier-title" data-reveal :style="delay(1)">
                            <FrontierArt art="star" :size="40" class="star" />
                            西部拓荒季
                        </h2>
                        <p class="dindon-landing__subtitle" data-reveal :style="delay(2)">
                            每一家銀行與支付，都是一張通緝令。叮咚認得越多家的付款通知，大家就越不用動手。
                            你手上有它的通知，就把它抓回來。
                        </p>

                        <dl class="dindon-landing__frontier-status">
                            <div v-for="(status, index) in frontierStatuses" :key="status.key" :class="`is-${status.key}`" data-reveal :style="delay(index + 3, 80)">
                                <dt>{{ status.label }}</dt>
                                <dd>{{ status.text }}</dd>
                            </div>
                        </dl>

                        <p class="dindon-landing__frontier-heading" data-reveal>鎮上的地方</p>
                        <ul class="dindon-landing__places" data-reveal>
                            <li v-for="place in frontierPlaces" :key="place.name"><strong>{{ place.name }}</strong>{{ place.text }}</li>
                        </ul>
                    </div>

                    <figure class="dindon-landing__figure" data-reveal>
                        <div class="dindon-landing__phone" data-parallax="-.06">
                            <img src="/images/dindon/town.webp" alt="拓荒季的小鎮：消防局、小酒館、佈告欄、戶政廳、雜貨店、警視廳，上面寫著還剩幾天與已緝拿幾家" loading="lazy" width="720" height="1600" />
                        </div>
                        <figcaption>App 裡的拓荒小鎮</figcaption>
                    </figure>
                </div>

                <p class="dindon-landing__frontier-heading" data-reveal>怎麼當賞金獵人</p>
                <ol class="dindon-landing__frontier-steps">
                    <li v-for="(step, index) in frontierSteps" :key="step.title" class="dindon-landing__card" data-reveal :style="delay(index, 90)">
                        <span class="feature-icon" aria-hidden="true"><FrontierArt :art="step.art" /></span>
                        <h3><span class="num">{{ index + 1 }}</span>{{ step.title }}</h3>
                        <p>{{ step.text }}</p>
                    </li>
                </ol>

                <div class="dindon-landing__split dindon-landing__frontier-coins">
                    <div class="dindon-landing__split-copy">
                        <p class="dindon-landing__frontier-heading" data-reveal>金幣與雜貨店</p>
                        <p class="dindon-landing__subtitle" data-reveal :style="delay(1)">{{ FRONTIER_COINS }}</p>
                        <p class="dindon-landing__subtitle" data-reveal :style="delay(2)">賞金榜照這一季賺到的金幣排，花掉了也不會掉名次。</p>
                    </div>
                    <div class="dindon-landing__phones">
                        <div class="dindon-landing__phone dindon-landing__phone--back" data-parallax=".06">
                            <img src="/images/dindon/wanted.webp" alt="警視廳的通緝令牆：每一張寫著那一家還缺什麼樣本與賞金" loading="lazy" width="720" height="1600" />
                        </div>
                        <div class="dindon-landing__phone dindon-landing__phone--front" data-parallax="-.08">
                            <img src="/images/dindon/store.webp" alt="雜貨店：用金幣換進階方案 7 天、30 天" loading="lazy" width="720" height="1600" />
                        </div>
                    </div>
                </div>

                <p class="dindon-landing__frontier-heading" data-reveal>三枚季後絕版的勳章</p>
                <ul class="dindon-landing__frontier-badges">
                    <li v-for="(badge, index) in frontierBadges" :key="badge.title" data-reveal :style="delay(index, 90)">
                        <span class="tag">季後絕版</span>
                        <h3>{{ badge.title }}</h3>
                        <p>{{ badge.condition }}</p>
                    </li>
                </ul>

                <p class="dindon-landing__note dindon-landing__frontier-note" data-reveal>
                    哪幾家已緝拿、哪幾家還在通緝、誰是哪一家的賞金獵人，都在 App 的拓荒季小鎮。拓荒季結束後，通緝令上的署名都會留著。
                </p>
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region [P] 下載（還沒上架時是「就快上架了」）＋謝謝封測的白老鼠 -->
        <section id="download" class="dindon-landing__section dindon-landing__section--sunken">
            <div class="dindon-landing__container dindon-landing__download">
                <template v-if="LAUNCHED">
                    <h2 class="dindon-landing__title" data-reveal>準備好當個懶人了嗎？</h2>
                    <p class="dindon-landing__subtitle" data-reveal :style="delay(1)">免費下載，不用註冊，裝好打開就能記。</p>
                    <div class="dindon-landing__actions" data-reveal :style="delay(2)">
                        <a class="dindon-landing__btn dindon-landing__btn--primary" :href="PLAY_STORE_URL">到 Google Play 下載<span class="arrow" aria-hidden="true">→</span></a>
                    </div>
                </template>
                <template v-else>
                    <h2 class="dindon-landing__title" data-reveal>就快上架了</h2>
                    <p class="dindon-landing__subtitle" data-reveal :style="delay(1)">
                        叮咚記帳正式版即將在 Google Play 上架。免費下載，不用註冊，裝好打開就能記。
                    </p>
                    <p class="dindon-landing__soon" data-reveal :style="delay(2)">即將在 Google Play 上架</p>
                </template>
                <p class="dindon-landing__note" data-reveal :style="delay(3)">
                    僅限 Android 7.0 以上。有問題寫信到 <a :href="`mailto:${CONTACT_EMAIL}`" class="email">{{ CONTACT_EMAIL }}</a>，或在 App 裡回報。
                </p>

                <div class="dindon-landing__thanks" data-reveal :style="delay(4)">
                    <span class="mouse" aria-hidden="true">🐭</span>
                    <div>
                        <h3>謝謝每一隻白老鼠</h3>
                        <p>
                            叮咚記帳能走到正式上架，要謝謝封測期間的每一位測試者。你們回報的問題、提的建議、每天打開的那一下，都讓它更穩一點。封測的名次與獎勵，在 App 的封測活動頁看得到。
                        </p>
                    </div>
                </div>
            </div>
        </section>
        <!-- #endregion -->

        <footer class="dindon-landing__footer">
            <div class="dindon-landing__container">
                <a :href="PRIVACY_PATH">隱私權政策</a>
                <span aria-hidden="true">·</span>
                <a :href="ACCOUNT_PATH">刪除資料與帳號</a>
                <span aria-hidden="true">·</span>
                <a :href="`mailto:${CONTACT_EMAIL}`">{{ CONTACT_EMAIL }}</a>
                <span aria-hidden="true">·</span>
                <span>叮咚記帳 DinDon Ledger</span>
            </div>
        </footer>
    </div>
</template>

<style lang="scss">
    // 配色沿用 App 的 Sicily 色票（DinDon_Android/…/ui/theme/Color.kt），讓網頁和 App 看起來是同一個東西
    // 動態維持 App 的平面風格：只有位移、透明度與淡淡的陰影，不做高光、描邊、漣漪圈
    .dindon-landing {
        --dd-bg: #F6F4F1;
        --dd-surface: #FEFDFC;
        --dd-sunken: #E4DED2;
        --dd-border: #D2CCC0;
        --dd-text: #1B1815;
        --dd-muted: #6B6157;
        --dd-primary: #1D59BB;
        --dd-on-primary: #FFFDF8;
        --dd-accent: #FEBD19;
        --dd-accent-tint: #FEF3B3;
        --dd-accent-border: #A87400;
        --dd-frame: #1B1815; // 手機外框兩個模式都是深色
        --dd-radius: 20px;
        --dd-ease-out: cubic-bezier(.22, 1, .36, 1);
        --dd-story-duration: 8s; // 鈴響 → 通知 → 已記帳，一輪的長度（DinDonBell 也讀這兩個）
        --dd-story-delay: .9s; // 等開頭的進場動畫跑完再響
        // 鈴響幾次就停（2026-10-08）：一直循環的 CSS 動畫會讓整頁每秒重新合成 60 次，電腦會燙
        --dd-bell-rings: 2;
        background: var(--dd-bg);
        color: var(--dd-text);
        line-height: 1.7;
        overflow-x: clip; // 從右側滑入的元素進場前會超出版面；clip 不會像 hidden 那樣變成捲動容器

        h1, h2, h3, p { margin: 0; }
        ul, ol {
            padding: 0;
            margin: 0;
        }

        // 視差用獨立的 translate 屬性，不和進場動畫的 transform 互相覆蓋
        [data-parallax] { translate: 0 var(--py, 0); }

        &__container {
            max-width: 1080px;
            padding: 0 24px;
            margin: 0 auto;
            @include setRWD(500px) { padding: 0 16px; }
        }

        // #region [P] 捲動進場（is-motion 由 useLandingMotion 在瀏覽器端加上；SSR 與減少動態時內容照常顯示）
        &.is-motion [data-reveal] {
            transform: translateY(28px);
            transition:
                opacity .7s var(--dd-ease-out) var(--reveal-delay, 0ms),
                transform .7s var(--dd-ease-out) var(--reveal-delay, 0ms);
            opacity: 0;
        }
        &.is-motion [data-reveal=right] { transform: translateX(32px); }
        &.is-motion [data-reveal].is-visible {
            transform: none;
            opacity: 1;
        }

        // 循環動畫捲出畫面時暫停（useLandingMotion 加 is-paused），整塊一起停才不會彼此錯開
        [data-loop].is-paused,
        [data-loop].is-paused *,
        [data-loop].is-paused *::after { animation-play-state: paused !important; }

        // #endregion

        // #region [P] hero
        &__hero {
            position: relative;
            background: var(--dd-accent);
            padding: 64px 0 0;
            color: var(--dd-text); // 深色模式在這裡把 --dd-text 換回深色，要重新套一次才會生效
            overflow: hidden;
            @include setRWD(768px) { padding-top: 40px; }
        }
        &__deco {
            position: absolute;
            border-radius: 50%;
            pointer-events: none;

            &--a {
                top: -160px;
                right: -140px;
                background: rgb(255 255 255 / 16%);
                width: 460px;
                height: 460px;
            }
            &--b {
                bottom: -70px;
                left: 4%;
                background: rgb(168 116 0 / 9%);
                width: 200px;
                height: 200px;
            }
            &--c {
                top: 22%;
                left: 46%;
                background: rgb(255 255 255 / 22%);
                width: 88px;
                height: 88px;
            }
        }
        &__hero-inner {
            position: relative;
            display: grid;
            grid-template-columns: 1.1fr .9fr;
            gap: 48px;
            align-items: end;
            z-index: 1;
            @include setRWD(768px) {
                grid-template-columns: 1fr;
                gap: 40px;
            }
        }
        &__hero-copy {
            @include setFlex(flex-start, flex-start, 24px, column);
            padding-bottom: 72px;
            @include setRWD(768px) { padding-bottom: 0; }

            // 開頭依序浮上來。純 CSS，SSR 的 HTML 一載入就開始播
            > * { animation: dd-rise .8s var(--dd-ease-out) both; }
            > :nth-child(2) { animation-delay: .08s; }
            > :nth-child(3) { animation-delay: .16s; }
            > :nth-child(4) { animation-delay: .24s; }
            > :nth-child(5) { animation-delay: .32s; }
            > :nth-child(6) { animation-delay: .4s; }
        }
        &__brand {
            @include setFlex(flex-start, center, 14px);

            .name {
                font-size: var(--font-size-l);
                font-weight: 700;
            }
            .latin {
                color: color-mix(in srgb, var(--dd-text) 70%, transparent);
                font-size: var(--font-size-s);
                letter-spacing: .12em;
            }
        }

        // 「你的隨身記帳助手」：定位寫在標題上面，黃底上用深色膠囊
        &__chip {
            background: var(--dd-text);
            padding: 4px 14px;
            border-radius: 999px;
            color: var(--dd-accent);
            font-size: var(--font-size-m);
            font-weight: 800;
            letter-spacing: .06em;
        }
        &__headline {
            font-size: clamp(2.25rem, 5vw, 3.5rem);
            font-weight: 800;
            line-height: 1.25;
            letter-spacing: .02em;
        }
        &__lead {
            max-width: 32em;
            font-size: var(--font-size-l);
        }
        &__actions {
            @include setFlex(flex-start, center, 12px);
            flex-wrap: wrap;
        }
        &__btn {
            display: inline-block;
            padding: 12px 26px;
            border: 2px solid var(--dd-text);
            border-radius: 999px;
            color: var(--dd-text);
            font-weight: 700;
            text-decoration: none;
            transition: translate .25s var(--cubic-FiSo);

            .arrow {
                display: inline-block;
                margin-left: 8px;
                transition: transform .25s var(--cubic-FiSo);
            }
            @media (hover: hover) {
                &:hover {
                    translate: 0 -2px;

                    .arrow { transform: translateX(4px); }
                    .arrow--down { transform: translateY(3px); }
                }
            }
            &:focus-visible {
                outline: 3px solid var(--dd-primary);
                outline-offset: 3px;
            }
            &--primary {
                background: var(--dd-primary);
                border-color: var(--dd-primary);
                color: var(--dd-on-primary);
            }
        }

        // 還沒上架時代替下載按鈕：不是連結，長得也不能像按鈕（沒有外框、不浮起），只是一塊說明
        &__soon {
            @include setFlex(flex-start, center, 8px);
            display: inline-flex;
            background: color-mix(in srgb, var(--dd-text) 10%, transparent);
            padding: 12px 22px;
            border-radius: 999px;
            color: var(--dd-text);
            font-weight: 700;

            &::before {
                content: '';
                background: var(--dd-primary);
                width: 8px;
                height: 8px;
                border-radius: 50%;
            }
        }
        &__note {
            color: var(--dd-muted);
            font-size: var(--font-size-s);

            .email { white-space: nowrap; }
            &--fine { margin-top: 12px !important; }
        }
        &__hero &__note { color: color-mix(in srgb, var(--dd-text) 72%, transparent); }

        &__hero-shot {
            @include setFlex(center, flex-end);
        }
        &__hero-stage {
            position: relative;
            width: 100%;
            max-width: 360px;
            animation: dd-rise-stage 1s var(--dd-ease-out) .2s both; // 手機從底邊升上來
        }

        // #endregion

        // #region [P] phone：平面的外框，不做高光與擬真反光
        &__phone {
            background: var(--dd-frame);
            width: 100%;
            max-width: 300px;
            border: 10px solid var(--dd-frame);
            border-radius: 36px;
            overflow: hidden;

            img {
                display: block;
                width: 100%;
                height: auto;
                border-radius: 26px;
            }
            @include setRWD(500px) {
                border-width: 6px;
                border-radius: 24px;

                img { border-radius: 18px; }
            }

            // 首頁截圖只取上半，手機從底邊「長出來」
            &--cropped {
                max-width: 360px;
                border-bottom: 0;
                border-radius: 40px 40px 0 0;

                img { border-radius: 30px 30px 0 0; }
            }
        }

        // #endregion

        // #region [P] section 共用
        &__section {
            padding: 96px 0;
            @include setRWD(768px) { padding: 64px 0; }

            &--sunken { background: var(--dd-sunken); }
        }
        &__eyebrow {
            margin-bottom: 8px !important;
            color: var(--dd-accent-border);
            font-size: var(--font-size-m);
            font-weight: 700;
            letter-spacing: .04em;
        }
        &__title {
            font-size: var(--font-size-xxl);
            font-weight: 800;
            line-height: 1.35;
            @include setRWD(500px) { font-size: var(--font-size-xl); }
        }
        &__subtitle {
            max-width: 40em;
            margin-top: 12px !important;
            color: var(--dd-muted);
            font-size: var(--font-size-l);
            @include setRWD(500px) { font-size: var(--font-size-m); }
        }

        // 左文右圖；--reverse 左圖右文。窄螢幕都變成上文下圖
        &__split {
            display: grid;
            grid-template-columns: 1.1fr .9fr;
            gap: 56px;
            align-items: center;
            @include setRWD(768px) {
                grid-template-columns: 1fr;
                gap: 40px;
            }

            &--reverse {
                grid-template-columns: .9fr 1.1fr;
                @include setRWD(768px) { grid-template-columns: 1fr; }

                .dindon-landing__split-copy {
                    order: 2;
                    @include setRWD(768px) { order: 0; }
                }
            }
        }
        &__figure {
            @include setFlex(flex-start, center, 16px, column);
            margin: 0;

            figcaption {
                color: var(--dd-muted);
                font-weight: 700;
            }
        }
        &__links {
            display: flex;
            flex-wrap: wrap;
            gap: 4px 28px;
            margin-top: 24px;

            .dindon-landing__link { margin-top: 18px; }
            &--center { justify-content: center; }
        }
        &__link {
            display: inline-block;
            margin-top: 24px;
            color: var(--dd-primary);
            font-weight: 700;
            text-decoration: none;

            .arrow {
                display: inline-block;
                margin-left: 6px;
                transition: transform .25s var(--cubic-FiSo);
            }
            @media (hover: hover) {
                &:hover .arrow { transform: translateX(4px); }
            }
        }

        // #endregion

        // #region [P] 三件事：幫你記、幫你理、陪你走
        &__pillars {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 36px !important;
            list-style: none;
            @include setRWD(768px) { grid-template-columns: 1fr; }

            h3 { font-size: var(--font-size-xl); }
        }

        // #endregion

        // #region [P] 功能卡（幫你理）
        // 六張：三欄兩列 → 兩欄三列 → 一欄，三種寬度都排得滿，不會留一張孤兒
        &__features {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 40px !important;
            list-style: none;
            @include setRWD(1024px) { grid-template-columns: repeat(2, 1fr); }
            @include setRWD(640px) { grid-template-columns: 1fr; }
        }

        // 幾個區塊（三件事、幫你記、幫你理、放心用、拓荒季的三步）共用這一張卡：
        // 色塊裡的圖示 → 標題 → 說明。欄位越窄的區塊字級跟著小一號，排法不變
        &__card {
            @include setFlex(flex-start, flex-start, 10px, column);
            background: var(--dd-surface);
            padding: 24px;
            border: 1px solid var(--dd-border);
            border-radius: var(--dd-radius);
            transition: translate .25s var(--cubic-FiSo), box-shadow .25s var(--cubic-FiSo);

            .feature-icon {
                @include setFlex();
                background: var(--dd-accent-tint);
                width: 48px;
                height: 48px;
                border-radius: 14px;
                font-size: 1.5rem;
            }
            h3 {
                margin: .5rem 0 0;
                font-size: var(--font-size-l);
            }
            p { color: var(--dd-muted); }
            @media (hover: hover) {
                &:hover {
                    translate: 0 -4px;
                    box-shadow: 0 10px 24px rgb(27 24 21 / 6%);

                    .feature-icon { animation: dd-wiggle .6s ease-in-out; }
                }
            }
        }

        // 進場的 transition 會蓋掉卡片自己的，這裡把浮起的那兩項補回去
        &.is-motion &__card[data-reveal] {
            transition:
                opacity .7s var(--dd-ease-out) var(--reveal-delay, 0ms),
                transform .7s var(--dd-ease-out) var(--reveal-delay, 0ms),
                translate .25s var(--cubic-FiSo),
                box-shadow .25s var(--cubic-FiSo);
        }

        // #endregion

        // #region [P] 拍照：能拍的東西一個個跳出來
        &__no {
            margin-top: 8px !important;
            color: var(--dd-primary);
            font-size: clamp(2.5rem, 6vw, 4rem);
            font-weight: 900;
            line-height: 1.1;
        }
        &__sources {
            @include setFlex(flex-start, center, 10px);
            flex-wrap: wrap;
            margin-top: 24px !important;
            list-style: none;

            li {
                background: var(--dd-surface);
                padding: 6px 16px;
                border: 1px solid var(--dd-border);
                border-radius: 999px;
                font-weight: 600;
            }
        }

        // 標籤用回彈蹦出來，跟一般的浮上來區分
        &.is-motion &__sources li[data-reveal] {
            transform: scale(.6);
            transition:
                opacity .4s ease var(--reveal-delay, 0ms),
                transform .5s var(--cubic-SiRo) var(--reveal-delay, 0ms);
        }
        &.is-motion &__sources li[data-reveal].is-visible { transform: none; }
        &__shutter {
            margin-top: 28px !important;
            font-size: clamp(1.3rem, 2.6vw, 1.7rem);
            font-weight: 700;

            strong {
                color: var(--dd-primary);
                font-size: 1.2em;
            }
        }

        // 兩支手機前後疊：後面那支拍照中、前面那支是讀出來的結果
        &__phones {
            position: relative;
            display: grid;
            grid-template-columns: 1fr;
            justify-items: center;
            padding: 0 0 40px;

            .dindon-landing__phone {
                grid-area: 1 / 1;
                max-width: 250px;

                &--back {
                    margin-right: 120px;
                    opacity: .9;
                    @include setRWD(500px) { margin-right: 90px; }
                }
                &--front {
                    margin-top: 60px;
                    margin-left: 120px;
                    box-shadow: -8px 10px 30px rgb(27 24 21 / 12%);
                    @include setRWD(500px) { margin-left: 90px; }
                }
                @include setRWD(500px) { max-width: 190px; }
            }
        }

        // #endregion

        // #region [P] 月結的四件事：圓形編號＋標題＋說明，一行一件
        &__close-steps {
            @include setFlex(flex-start, stretch, 18px, column);
            margin-top: 28px !important;
            list-style: none;

            > li { @include setFlex(flex-start, flex-start, 14px); }
            .num {
                @include setFlex();
                flex: none;
                background: var(--dd-accent);
                width: 32px;
                height: 32px;
                border-radius: 50%;
                color: #1B1815;
                font-weight: 800;
            }
            h3 { font-size: var(--font-size-l); }
            p { color: var(--dd-muted); }
        }

        // #endregion

        // #region [P] 記帳里程碑
        // 四階一排，上緣的色條越往後越深，看得出是一條往前走的路；窄螢幕 2×2 → 一欄
        &__stages {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-top: 36px !important;
            list-style: none;
            @include setRWD(900px) { grid-template-columns: repeat(2, 1fr); }
            @include setRWD(500px) { grid-template-columns: 1fr; }

            > li {
                @include setFlex(flex-start, flex-start, 8px, column);
                background: var(--dd-surface);
                padding: 22px 22px 20px;
                border-top: 6px solid color-mix(in srgb, var(--dd-primary) var(--stage-mix, 30%), var(--dd-surface));
                border-radius: var(--dd-radius);
            }
            > li:nth-child(2) { --stage-mix: 55%; }
            > li:nth-child(3) { --stage-mix: 78%; }
            > li:nth-child(4) { --stage-mix: 100%; }
            .step {
                color: var(--dd-primary);
                font-size: var(--font-size-s);
                font-weight: 800;
                letter-spacing: .04em;
            }
            h3 { font-size: var(--font-size-xl); }
            p { color: var(--dd-muted); }
            .milestones {
                @include setFlex(flex-start, center, 6px);
                flex-wrap: wrap;
                padding-top: 8px;
                margin-top: auto;
                list-style: none;

                li {
                    background: var(--dd-accent-tint);
                    padding: 2px 10px;
                    border-radius: 999px;
                    color: #1B1815;
                    font-size: var(--font-size-s);
                    font-weight: 700;
                }
            }
        }
        &__journey {
            grid-template-columns: .8fr 1.2fr;
            margin-top: 56px;
            @include setRWD(768px) { grid-template-columns: 1fr; }
        }

        // 影片外框沿用手機框；video 預設是 inline，底下會多一條基線的空隙
        &__phone--video video {
            display: block;
            background: var(--dd-frame);
            width: 100%;
            height: auto;
            border-radius: 26px;
            aspect-ratio: 540 / 1200;
            @include setRWD(500px) { border-radius: 18px; }
        }
        &__quote {
            padding: 0 0 0 20px;
            border-left: 6px solid var(--dd-accent);
            margin: 0;

            p {
                font-size: clamp(1.3rem, 2.6vw, 1.7rem);
                font-weight: 800;
                line-height: 1.5;
            }
            cite {
                display: block;
                margin-top: 8px;
                color: var(--dd-muted);
                font-size: var(--font-size-s);
                font-style: normal;
            }
        }

        // 里程碑頁與徽章牆兩張並排的小截圖
        &__thumbs {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 200px));
            gap: 20px;
            margin-top: 28px;
            @include setRWD(500px) { gap: 12px; }

            .dindon-landing__phone { max-width: 200px; }
        }

        // #endregion

        // #region [P] 最懶人的記帳體驗
        &__points {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-top: 32px !important;
            list-style: none;
            @include setRWD(500px) { grid-template-columns: 1fr; }
        }

        // #endregion

        // #region [P] 西部拓荒季
        // 段落自己換成 App 的西部配色（DinDon_Android ui/theme/Color.kt 的 Western*），卡片沿用 __card，跟著吃這組變數
        &__frontier {
            --dd-surface: #FFFBF4;
            --dd-border: #D3C1A4;
            --dd-muted: #6B5643;
            --dd-accent-tint: #F6E7C6;
            --dd-accent-border: #8A6414;
            --dd-west-ink: #5C3A15;
            --dd-west-gold: #D9A441;
            --dd-west-tamed: #2E6720;
            --dd-west-wanted: #CF6E37;
            --dd-west-badge: #2A1D12;
            background: #E9DCC6;
        }
        &__frontier-title {
            @include setFlex(flex-start, center, 12px);

            .star { color: var(--dd-west-gold); }
        }

        // 已馴服／通緝中：兩塊並排，左邊一條色塊標狀態，窄螢幕疊起來
        &__frontier-status {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin: 32px 0 0;
            @include setRWD(640px) { grid-template-columns: 1fr; }

            div {
                @include setFlex(flex-start, flex-start, 6px, column);
                background: var(--dd-surface);
                padding: 18px 22px;
                border-radius: var(--dd-radius);
            }
            dt {
                padding: 2px 12px;
                border-radius: 999px;
                color: #FFFBF4;
                font-size: var(--font-size-s);
                font-weight: 700;
            }
            dd {
                margin: 0;
                color: var(--dd-muted);
            }
            .is-tamed dt { background: var(--dd-west-tamed); }
            .is-wanted dt { background: var(--dd-west-wanted); }
        }
        &__places {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px 20px;
            margin-top: 12px !important;
            color: var(--dd-muted);
            list-style: none;
            @include setRWD(500px) { grid-template-columns: 1fr; }

            strong {
                margin-right: 8px;
                color: var(--dd-west-ink);
            }
        }
        &__frontier-coins { margin-top: 24px; }
        &__frontier-heading {
            margin-top: 48px !important;
            color: var(--dd-west-ink);
            font-size: var(--font-size-l);
            font-weight: 800;
        }
        &__frontier-steps {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 16px !important;
            list-style: none;
            @include setRWD(900px) { grid-template-columns: 1fr; }

            .feature-icon { color: var(--dd-west-ink); }
            .num {
                @include setFlex();
                display: inline-flex;
                background: var(--dd-west-ink);
                width: 1.6em;
                height: 1.6em;
                border-radius: 50%;
                margin-right: 8px;
                color: #FFFBF4;
                font-size: var(--font-size-s);
                vertical-align: .1em;
            }
        }

        // 絕版徽章：深色卡，兩個模式一樣（跟 App 徽章牆的紀念徽章卡一樣是深底）
        &__frontier-badges {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-top: 16px !important;
            list-style: none;
            @include setRWD(900px) { grid-template-columns: 1fr; }

            li {
                @include setFlex(flex-start, flex-start, 6px, column);
                background: var(--dd-west-badge);
                padding: 20px 22px;
                border-radius: var(--dd-radius);
                color: #F3E9D8;
            }
            .tag {
                background: var(--dd-west-gold);
                padding: 2px 10px;
                border-radius: 999px;
                color: #2A1D12;
                font-size: var(--font-size-xs);
                font-weight: 700;
            }
            h3 {
                color: #E5CD77;
                font-size: var(--font-size-l);
            }
            p { color: #D9CBB4; }
            .extra {
                color: #F3E9D8;
                font-weight: 700;
            }
        }
        &__frontier-note {
            margin-top: 28px !important;
            font-size: var(--font-size-m);
        }

        // hero 裡拓荒季的入口：深色小膠囊，黃底上一眼分得出來
        &__season {
            @include setFlex(flex-start, center, 8px);
            display: inline-flex;
            background: #2A1D12;
            padding: 6px 16px 6px 12px;
            border-radius: 999px;
            color: #F3E9D8;
            font-size: var(--font-size-s);
            font-weight: 700;
            text-decoration: none;
            transition: translate .25s var(--cubic-FiSo);

            .frontier-art { color: #D9A441; }
            .arrow { transition: transform .25s var(--cubic-FiSo); }
            @media (hover: hover) {
                &:hover {
                    translate: 0 -2px;

                    .arrow { transform: translateY(3px); }
                }
            }
            &:focus-visible {
                outline: 3px solid var(--dd-primary);
                outline-offset: 3px;
            }
        }

        // #endregion

        // #region [P] 下載＋謝謝白老鼠
        &__download {
            @include setFlex(flex-start, center, 16px, column);
            text-align: center;

            .dindon-landing__subtitle { margin-top: 0 !important; }
        }
        &__thanks {
            @include setFlex(flex-start, flex-start, 16px);
            background: var(--dd-surface);
            max-width: 40em;
            padding: 20px 24px;
            border-radius: var(--dd-radius);
            margin-top: 32px;
            text-align: left;

            .mouse {
                flex: none;
                font-size: 2rem;
                line-height: 1.2;
            }
            h3 { font-size: var(--font-size-l); }
            p {
                margin-top: 4px !important;
                color: var(--dd-muted);
            }
        }

        // #endregion

        &__footer {
            padding: 28px 0;
            border-top: 1px solid var(--dd-border);
            color: var(--dd-muted);
            font-size: var(--font-size-s);

            .dindon-landing__container {
                @include setFlex(center, center, 10px);
                flex-wrap: wrap;
            }
            a {
                color: var(--dd-muted);
                text-decoration: underline;
                text-underline-offset: 3px;
            }
        }

        // #region [P] 減少動態效果：全部停下
        @media (prefers-reduced-motion: reduce) {
            &__hero-copy > *,
            &__hero-stage { animation: none; }
            &__btn, &__btn .arrow, &__card, &__link .arrow, &__season, &__season .arrow { transition: none; }
        }

        // #endregion
    }

    // 深色模式：沿用 App 的深色色票
    .dark .dindon-landing {
        --dd-bg: #131109;
        --dd-surface: #322D24;
        --dd-sunken: #1E1B14;
        --dd-border: #4A4335;
        --dd-text: #F4EFE3;
        --dd-muted: #B3A997;
        --dd-primary: #76B9FF;
        --dd-on-primary: #14120E;
        --dd-accent-tint: #FEF3B3; // 回答列的淡黃底兩個模式一樣，裡面固定深字
        --dd-accent-border: #D8A72B;

        // 黃底上的字不跟著反白，否則在濃黃上看不見
        .dindon-landing__hero {
            --dd-text: #1B1815;
            --dd-primary: #1D59BB;
            --dd-on-primary: #FFFDF8;
        }
        .dindon-landing__card .feature-icon { background: #332912; }

        // 拓荒季段落的深色：App 的 WesternDark*
        .dindon-landing__frontier {
            --dd-surface: #35291C;
            --dd-border: #4F3E2A;
            --dd-muted: #BFAA8D;
            --dd-accent-border: #D9A441; // 段落眉標的字色，深底上要亮一點
            --dd-west-ink: #E5CD77;
            --dd-west-badge: #3A2C1C;
            background: #211910;

            .feature-icon { background: #3A3016; }
            .num { color: #1A120B; }
        }
    }
    @keyframes dd-rise {
        from {
            transform: translateY(24px);
            opacity: 0;
        }
        to {
            transform: none;
            opacity: 1;
        }
    }
    @keyframes dd-rise-stage {
        from {
            transform: translateY(80px);
            opacity: 0;
        }
        to {
            transform: none;
            opacity: 1;
        }
    }
    @keyframes dd-wiggle {
        0%, 100% { transform: rotate(0); }
        25% { transform: rotate(-12deg); }
        50% { transform: rotate(10deg); }
        75% { transform: rotate(-5deg); }
    }
</style>
