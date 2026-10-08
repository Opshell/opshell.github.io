import type { DemoIndex } from '../demo/types';
import { describe, expect, it } from 'vitest';
import demos from '../demo/demos.json';
import {
    branches,
    compareVersions,
    DAY_STORY,
    features,
    featuresOf,
    findFeature,
    isUpcoming,
    relatedOf,
    REVIEWED_APP_VERSION,
    SHOWCASE,
    SHOWCASE_COPY,
    stages,
    stagesOf
} from './featureMap';
import { branchPath, edgeToward, linkPath } from './mindMapGeometry';

describe('功能地圖的資料', () => {
    it('id 不重複，每個分支都有功能', () => {
        const ids = features.map(feature => feature.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const branch of branches) expect(featuresOf(branch.id).length).toBeGreaterThan(0);
    });

    it('關聯與養成路線寫到的功能都存在，也不會連到自己', () => {
        for (const feature of features) {
            for (const id of feature.related) {
                expect(findFeature(id), `${feature.id} → ${id}`).toBeDefined();
                expect(id).not.toBe(feature.id);
            }
        }
        for (const stage of stages) {
            for (const id of stage.features) expect(findFeature(id), `${stage.id} → ${id}`).toBeDefined();
        }
    });

    it('演示的 id 對得到，而且是能播（錄好或有圖解）的', () => {
        const items = (demos as DemoIndex).sections.flatMap(section => section.items);
        for (const feature of features.filter(f => f.demo)) {
            const item = items.find(i => i.id === feature.demo);
            expect(item, `${feature.id} → ${feature.demo}`).toBeDefined();
            expect(['ready', 'diagram']).toContain(item!.status);
        }
    });

    it('關聯是雙向的：A 寫了 B，B 也看得到 A', () => {
        expect(findFeature('dedupe')!.related).not.toContain('notify');
        expect(relatedOf('dedupe').map(f => f.id)).toContain('notify');
        expect(relatedOf('notify').map(f => f.id)).toContain('dedupe');
    });

    it('查得到功能出現在哪一段養成路線', () => {
        expect(stagesOf('budget').map(stage => stage.id)).toEqual(['plan', 'review']);
        expect(stagesOf('profile')).toEqual([]);
    });
});

// 中文、英文、標點都算一個字；用 Array.from 才不會把罕用字拆成兩半
const charCount = (text: string) => Array.from(text).length;

describe('版本與即將推出', () => {
    it('版本號一段一段當數字比', () => {
        expect(compareVersions('0.7.19', '0.7.3')).toBeGreaterThan(0);
        expect(compareVersions('0.8.0', '0.7.19')).toBeGreaterThan(0);
        expect(compareVersions('0.8', '0.8.0')).toBe(0);
        expect(compareVersions('0.7.9', '0.7.10')).toBeLessThan(0);
    });

    it('比商店上的版本新才標即將推出，沒寫 since 的不算', () => {
        expect(REVIEWED_APP_VERSION).toBe('0.7.19');
        expect(isUpcoming(findFeature('milestone')!)).toBe(true);
        expect(isUpcoming(findFeature('monthlyCategory')!)).toBe(true);
        expect(isUpcoming(findFeature('smartFix')!)).toBe(false);
        expect(isUpcoming(findFeature('refund')!)).toBe(false);
        expect(isUpcoming(findFeature('notify')!)).toBe(false);
    });

    it('since 都是合法的版本號', () => {
        for (const feature of features.filter(f => f.since)) {
            expect(feature.since, feature.id).toMatch(/^\d+\.\d+\.\d+$/);
        }
    });
});

describe('宣傳用的挑選', () => {
    it('輪播是六個不重複、存在的功能，每個都有文案', () => {
        expect(SHOWCASE).toHaveLength(6);
        expect(new Set(SHOWCASE).size).toBe(6);
        for (const id of SHOWCASE) {
            expect(findFeature(id), id).toBeDefined();
            expect(SHOWCASE_COPY[id], id).toBeDefined();
        }
        expect(Object.keys(SHOWCASE_COPY).sort()).toEqual([...SHOWCASE].sort());
    });

    it('大標 10 字、一句話 26 字以內', () => {
        for (const [id, copy] of Object.entries(SHOWCASE_COPY)) {
            expect(charCount(copy.hook), `${id} hook`).toBeLessThanOrEqual(10);
            expect(charCount(copy.line), `${id} line`).toBeLessThanOrEqual(26);
        }
    });

    it('一天的帳：5～6 步、照時間排、功能存在、字數在限制內', () => {
        expect(DAY_STORY.length).toBeGreaterThanOrEqual(5);
        expect(DAY_STORY.length).toBeLessThanOrEqual(6);
        const times = DAY_STORY.map(step => step.time);
        expect([...times].sort()).toEqual(times);
        for (const step of DAY_STORY) {
            expect(step.time).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
            expect(findFeature(step.feature), step.feature).toBeDefined();
            expect(charCount(step.scene), step.scene).toBeLessThanOrEqual(12);
            expect(charCount(step.result), step.result).toBeLessThanOrEqual(16);
        }
    });
});

describe('心智圖的連線', () => {
    const box = { left: 100, top: 40, width: 80, height: 20 };

    it('從靠近對方的那一側接出去', () => {
        expect(edgeToward(box, { x: 400, y: 0 })).toEqual({ x: 180, y: 50 });
        expect(edgeToward(box, { x: 0, y: 0 })).toEqual({ x: 100, y: 50 });
    });

    it('樹枝是水平出、水平進的曲線', () => {
        expect(branchPath({ x: 0, y: 0 }, { x: 100, y: 50 })).toBe('M0,0 C50,0 50,50 100,50');
    });

    it('關聯線的控制點往中心拉', () => {
        expect(linkPath({ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 100, y: 100 }, 0.5)).toBe('M0,0 C50,50 150,50 200,0');
    });
});
