<script setup lang="ts">
    import type { AdminDevice, CheckinState } from '../schemas/admin.schema';
    import { computed } from 'vue';
    import { hasUploaded, inferBadges, inferMemorials, TIER_LABELS, uploadedWall } from '../badges';

    // 裝置詳情的「徽章」（#570）：App 上傳過就用上傳的（api.md 第 28 節），沒上傳過才用後端的原料推算當備援。
    // 上傳的等級是 App 自己算的，伺服器驗證不了，只拿來看、不拿來發獎勵。
    // 最長連續現在裝置物件就有（best_streak）；舊後端沒有才用上面「打開 App」卡讀到的，不重打一次 API
    const { device, checkins } = defineProps<{ device: AdminDevice; checkins: CheckinState | null }>();

    const uploaded = computed(() => hasUploaded(device.badges));
    const wall = computed(() => uploadedWall(device.badges));
    // 沒解鎖的收成一行：12 顆全列成卡片在 420px 的詳情欄裡太長
    const unlocked = computed(() => wall.value.badges.filter(badge => badge.tier));
    const locked = computed(() => wall.value.badges.filter(badge => !badge.tier));

    const sources = computed(() => ({
        bestStreak: device.bestStreak ?? checkins?.bestStreak ?? null,
        iron: checkins?.iron ?? false,
        betaTesterSince: device.betaTesterSince,
        ironAchievedOn: device.ironAchievedOn
    }));
    const inferred = computed(() => inferBadges(sources.value).filter(badge => badge.basis === 'inferred'));
    const phoneOnly = computed(() => inferBadges(sources.value).filter(badge => badge.basis === 'phone-only'));
    const memorials = computed(() => inferMemorials(sources.value));
</script>

<template>
    <section class="dd-detail__card dd-badges" aria-labelledby="dd-badges-title">
        <h3 id="dd-badges-title">
            徽章
            <span class="dd-badges__tag" :class="uploaded ? 'is-real' : 'is-guess'">{{ uploaded ? 'App 上傳' : '推算' }}</span>
        </h3>

        <!-- #region [P] App 上傳的 -->
        <template v-if="uploaded">
            <p class="dd-detail__muted">
                App 上傳的解鎖狀態，解鎖 {{ unlocked.length }} / {{ wall.badges.length }} 顆。等級是手機上算的，伺服器只存拿過的最高階、驗證不了，只拿來看。
                最長連續打開 {{ device.bestStreak ?? '—' }} 天（後端打卡）。
            </p>
            <ul class="dd-badges__list">
                <li v-for="badge in unlocked" :key="badge.key" class="dd-badges__item">
                    <strong>{{ badge.label }}</strong>
                    <span class="dd-badges__tier">{{ badge.tierLabel }}</span>
                    <span v-if="badge.on" class="dd-detail__muted">{{ badge.on }}</span>
                </li>
                <li v-for="memorial in wall.memorials" :key="memorial.key" class="dd-badges__item" :class="{ 'is-locked': !memorial.earned }">
                    <strong>{{ memorial.label }}</strong>
                    <span class="dd-badges__tier">{{ memorial.earned ? '傳說' : '沒有' }}</span>
                    <span v-if="memorial.on" class="dd-detail__muted">{{ memorial.on }}</span>
                </li>
            </ul>
            <p v-if="locked.length" class="dd-detail__muted">還沒解鎖：{{ locked.map(badge => badge.label).join('、') }}</p>
        </template>
        <!-- #endregion -->

        <!-- #region [P] 沒上傳過：推算的備援 -->
        <template v-else>
            <p class="dd-detail__muted">
                這台還沒上傳過徽章（舊版 App，或一顆都還沒解鎖），下面是用後端的資料推算的，可能跟手機上的不一樣。
            </p>
            <ul class="dd-badges__list">
                <li v-for="badge in inferred" :key="badge.key" class="dd-badges__item" :class="{ 'is-locked': !badge.tier }">
                    <strong>{{ badge.label }}</strong>
                    <span class="dd-badges__tier">{{ badge.tier ? `${TIER_LABELS[badge.tier]}級` : '還沒解鎖' }}</span>
                    <span v-if="badge.progress === null" class="dd-detail__muted">打卡還沒讀到</span>
                    <span v-else class="dd-detail__muted">
                        最長連續 {{ badge.progress }} 天{{ badge.next ? `，下一階 ${badge.next} 天` : '，已經是最高階' }}
                    </span>
                </li>
                <li v-for="memorial in memorials" :key="memorial.key" class="dd-badges__item" :class="{ 'is-locked': !memorial.earned }">
                    <strong>{{ memorial.label }}</strong>
                    <span class="dd-badges__tier">{{ memorial.earned ? '傳說' : '沒有' }}</span>
                    <span v-if="memorial.on" class="dd-detail__muted">{{ memorial.on }}</span>
                </li>
            </ul>
            <p class="dd-detail__muted">只在手機上、推算不出來：{{ phoneOnly.map(badge => badge.label).join('、') }}</p>
        </template>
        <!-- #endregion -->

        <dl class="dd-detail__info">
            <div><dt>稱號</dt><dd>{{ device.title || '沒設' }}</dd></div>
        </dl>
    </section>
</template>

<style lang="scss">
    .dd-badges {
        &__tag {
            background: var(--vp-c-default-soft);
            padding: 1px 8px;
            border-radius: 999px;
            color: var(--vp-c-text-2);
            font-size: 12px;
            font-weight: normal;
            vertical-align: middle;

            // 真實資料用品牌色、推算的用中性灰：一眼分得出可不可以信
            &.is-real {
                background: var(--vp-c-brand-soft);
                color: var(--vp-c-brand-1);
            }
        }
        &__list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 8px;
            padding: 0;
            margin: 0;
            list-style: none;
        }
        &__item {
            @include setFlex(flex-start, flex-start, 2px);
            flex-direction: column;
            background: var(--vp-c-bg-soft);
            padding: 8px 12px;
            border-radius: 8px;

            &.is-locked { opacity: .6; }
        }
        &__tier {
            color: var(--vp-c-brand-1);
            font-weight: 600;
        }
    }
</style>
