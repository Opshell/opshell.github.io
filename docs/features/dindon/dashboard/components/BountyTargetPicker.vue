<script setup lang="ts">
    import type { AdminTerritory } from '../schemas/admin.schema';
    import { computed } from 'vue';
    import { KIND_LABELS, KINDS, membersOf, STATUS_LABELS, territoryOptionLabel } from '../frontier';

    // 懸賞對象（領地＋成員）的兩個下拉，審核卡與賞金卡共用（api.md 第 8 節、29.5，Flowsker #871）。
    // 列全部領地：2026-11-24 起署名照回報送出時間最早的那位重算（29.3），已經有開拓者的那塊照樣能設懸賞。
    interface Props {
        territories: AdminTerritory[];
        disabled?: boolean;
        /** 「不選領地」那一項的字；空字串＝不給這個選項（已經有懸賞時，取消另外按） */
        noneLabel?: string;
    }
    const props = withDefaults(defineProps<Props>(), { disabled: false, noneLabel: '' });
    const emit = defineEmits<{ edited: [] }>();
    const territoryId = defineModel<string>('territoryId', { required: true });
    const memberId = defineModel<string>('memberId', { required: true });
    const groups = computed(() => KINDS
        .map(kind => ({ kind, list: props.territories.filter(t => t.kind === kind) }))
        .filter(group => group.list.length));
    const members = computed(() => membersOf(props.territories, territoryId.value));

    /** 成員屬於原本那塊：換領地就清掉，不然送出去是 400 */
    function pickTerritory(event: Event) {
        territoryId.value = (event.target as HTMLSelectElement).value;
        memberId.value = '';
        emit('edited');
    }
</script>

<template>
    <div class="dd-target">
        <label class="dd-target__row">
            <span class="dd-target__label">領地</span>
            <select :value="territoryId" :disabled="disabled" @change="pickTerritory">
                <option v-if="noneLabel || !territoryId" value="" :disabled="!noneLabel">{{ noneLabel || '選一塊領地' }}</option>
                <optgroup v-for="group in groups" :key="group.kind" :label="KIND_LABELS[group.kind]">
                    <option v-for="t in group.list" :key="t.id" :value="String(t.id)">{{ territoryOptionLabel(t) }}</option>
                </optgroup>
            </select>
        </label>
        <label v-if="members.length" class="dd-target__row">
            <span class="dd-target__label">成員</span>
            <select v-model="memberId" :disabled="disabled" @change="emit('edited')">
                <option value="">不記哪一種</option>
                <option v-for="m in members" :key="m.id" :value="String(m.id)">{{ m.name }}（{{ STATUS_LABELS[m.status] }}）</option>
            </select>
        </label>
    </div>
</template>

<style lang="scss">
    .dd-target {
        @include setFlex(flex-start, stretch, 8px, column);

        &__row {
            @include setFlex(flex-start, center, 6px 8px);
            flex-wrap: wrap;
            font-size: var(--font-size-s);
        }
        &__label {
            min-width: 3em;
            color: var(--vp-c-text-2);
        }

        select {
            background: var(--vp-c-bg);
            max-width: 100%;
            padding: 4px 10px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 8px;
            color: var(--vp-c-text-1);
            font-size: var(--font-size-s);
        }
    }
</style>
