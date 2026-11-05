<script setup lang="ts">
    import type { AdminDevice, CheckinState } from '../schemas/admin.schema';
    import { computed } from 'vue';
    import { inferBadges, inferMemorials, TIER_LABELS } from '../badges';

    // 裝置詳情的「徽章」（#570）：解鎖狀態只記在手機上，這裡先用後端的原料推算看得出來的那幾顆。
    // 打卡由上面的「打開 App」卡讀，讀到再傳進來，不重打一次 API。
    const { device, checkins } = defineProps<{ device: AdminDevice; checkins: CheckinState | null }>();

    const sources = computed(() => ({
        bestStreak: checkins?.bestStreak ?? null,
        iron: checkins?.iron ?? false,
        betaTesterSince: device.betaTesterSince,
        ironAchievedOn: device.ironAchievedOn
    }));
    const badges = computed(() => inferBadges(sources.value));
    const inferred = computed(() => badges.value.filter(badge => badge.basis === 'inferred'));
    const phoneOnly = computed(() => badges.value.filter(badge => badge.basis === 'phone-only'));
    const memorials = computed(() => inferMemorials(sources.value));
</script>

<template>
    <section class="dd-detail__card dd-badges" aria-labelledby="dd-badges-title">
        <h3 id="dd-badges-title">徽章 <span class="dd-badges__tag">推算</span></h3>
        <p class="dd-detail__muted">
            解鎖狀態只記在手機上，這裡是用後端的資料推算的，可能跟手機上的不一樣。App 上傳之後會換成手機上的實際狀態。
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

        <dl class="dd-detail__info">
            <div><dt>稱號</dt><dd>{{ device.title || '沒設' }}</dd></div>
        </dl>
        <p class="dd-detail__muted">只在手機上、後台看不到：{{ phoneOnly.map(badge => badge.label).join('、') }}</p>
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
        }
        &__list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
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
