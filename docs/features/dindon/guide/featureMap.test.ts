import type { DemoIndex } from '../demo/types';
import { describe, expect, it } from 'vitest';
import demos from '../demo/demos.json';
import { branches, features, featuresOf, findFeature, relatedOf, stages, stagesOf } from './featureMap';
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
