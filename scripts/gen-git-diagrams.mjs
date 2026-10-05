/**
 * 產生 Git 系列文章用的樹狀圖（SVG）。
 *
 *   node scripts/gen-git-diagrams.mjs
 *
 * 圖的規格寫在 DIAGRAMS 裡，輸出到 docs/public/images/article/git/。
 * 為什麼不用 mermaid：站台沒裝，而且 mermaid 的 gitGraph 畫不出 worktree、reset 這類圖。
 * 為什麼底色固定深色：跟程式碼區塊（one-dark-pro）一致，深淺色模式都不用另外處理。
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs/public/images/article/git');

// one-dark-pro 的色票，跟程式碼區塊同一組
const C = {
    bg: '#282c34',
    text: '#d7dae0',
    muted: '#7f848e',
    line: '#4b5263',
    main: '#f4b936', // 站台主色，給 main 用
    blue: '#61afef',
    green: '#98c379',
    purple: '#c678dd',
    red: '#e06c75',
    cyan: '#56b6c2',
    orange: '#d19a66'
};

const COL_W = 72; // 每一格 commit 的橫向間距
const LANE_H = 60; // 每一條線的縱向間距
const PAD_L = 56;
const PAD_T = 116; // 上面要留大標題、分組小標題、兩層 ref 標籤的位置
const R = 8; // commit 圓點半徑

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// 估字寬：中日韓字算一個全形、其他算半形
const isWide = ch => /\p{Script=Han}/u.test(ch) || (ch.charCodeAt(0) >= 0xFF00 && ch.charCodeAt(0) <= 0xFFEF);
const textWidth = (s, size) => [...s].reduce((w, ch) => w + (isWide(ch) ? size : size * 0.6), 0);

const gx = i => PAD_L + i * COL_W;
const gy = l => PAD_T + l * LANE_H;

function pill({ x, y, text, color, filled = false, dashed = false, mono = true }) {
    const size = 12;
    const w = textWidth(text, size) + 16;
    const h = 20;
    const left = x - w / 2;
    const stroke = dashed ? `stroke="${color}" stroke-width="1.5" stroke-dasharray="4 3"` : `stroke="${color}" stroke-width="1.5"`;
    const rect = filled
        ? `<rect x="${left}" y="${y - h / 2}" width="${w}" height="${h}" rx="5" fill="${color}"/>`
        : `<rect x="${left}" y="${y - h / 2}" width="${w}" height="${h}" rx="5" fill="${C.bg}" ${stroke}/>`;
    const fill = filled ? C.bg : color;
    const font = mono ? FONT_MONO : FONT_SANS;
    return `${rect}<text x="${x}" y="${y + 4}" text-anchor="middle" font-family='${font}' font-size="${size}" font-weight="600" fill="${fill}">${esc(text)}</text>`;
}

function text({ x, y, text: t, color = C.text, size = 13, anchor = 'start', mono = false, weight = 400, italic = false }) {
    const font = mono ? FONT_MONO : FONT_SANS;
    const style = italic ? ' font-style="italic"' : '';
    return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family='${font}' font-size="${size}" font-weight="${weight}"${style} fill="${color}">${esc(t)}</text>`;
}

function box({ x, y, w, h, label, color = C.line, dashed = false, fill = 'none', labelColor, size = 13, mono = false, align = 'middle' }) {
    const dash = dashed ? ' stroke-dasharray="6 4"' : '';
    const lines = Array.isArray(label) ? label : (label ? [label] : []);
    const font = mono ? FONT_MONO : FONT_SANS;
    const lh = size + 6;
    const startY = y + h / 2 - ((lines.length - 1) * lh) / 2 + size / 3;
    const tx = align === 'start' ? x + 12 : x + w / 2;
    const texts = lines.map((l, i) => `<text x="${tx}" y="${startY + i * lh}" text-anchor="${align}" font-family='${font}' font-size="${size}" fill="${labelColor || color}">${esc(l)}</text>`).join('');
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${color}" stroke-width="2"${dash}/>${texts}`;
}

function arrow({ from, to, color = C.muted, dashed = false, label, labelColor, curve = 0 }) {
    const [x1, y1] = from;
    const [x2, y2] = to;
    const dash = dashed ? ' stroke-dasharray="5 4"' : '';
    const id = `a${Math.abs(Math.round((x1 + y1 * 7 + x2 * 13 + y2 * 17) * 1000))}`;
    const marker = `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${color}"/></marker>`;
    let d;
    if (curve) {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        // 垂直於線段的方向偏移控制點
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const cx = mx - (dy / len) * curve;
        const cy = my + (dx / len) * curve;
        d = `M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`;
    } else {
        d = `M${x1} ${y1} L${x2} ${y2}`;
    }
    const path = `<defs>${marker}</defs><path d="${d}" fill="none" stroke="${color}" stroke-width="2"${dash} marker-end="url(#${id})"/>`;
    const lbl = label
        ? text({ x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 8 - (curve ? curve / 2 : 0), text: label, color: labelColor || color, size: 12, anchor: 'middle' })
        : '';
    return path + lbl;
}

/**
 * 一組 commit 圖：commits、edges、refs 都用格子座標（x 是第幾格、lane 是第幾條線）。
 * ox/oy 是整組的位移，用來在一張圖裡畫「之前／之後」。
 */
function group(g) {
    const ox = g.ox || 0;
    const oy = g.oy || 0;
    const byId = Object.fromEntries(g.commits.map(c => [c.id, c]));
    const px = c => gx(c.x) + ox;
    const py = c => gy(c.lane) + oy;
    const colorOf = c => C[c.color] || c.color || C.main;
    const out = [];

    // 線先畫，圓點蓋在上面
    for (const e of g.edges || []) {
        const [childId, parentId, colorKey] = e;
        const child = byId[childId];
        const parent = byId[parentId];
        const color = C[colorKey] || colorKey || colorOf(child);
        const dim = child.dim || parent.dim;
        const x1 = px(parent);
        const y1 = py(parent);
        const x2 = px(child);
        const y2 = py(child);
        let d;
        if (y1 === y2) {
            d = `M${x2} ${y2} L${x1} ${y1}`;
        } else {
            const k = Math.min(COL_W / 2, Math.abs(x2 - x1) / 2);
            d = `M${x2} ${y2} C${x2 - k} ${y2} ${x1 + k} ${y1} ${x1} ${y1}`;
        }
        const op = dim ? ' opacity="0.35"' : '';
        const marker = g.arrows ? ` marker-end="url(#parent-${colorKey || child.color || 'main'})"` : '';
        out.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="3"${op}${marker}/>`);
    }

    for (const c of g.commits) {
        const x = px(c);
        const y = py(c);
        const color = colorOf(c);
        const op = c.dim ? ' opacity="0.35"' : '';
        const shape = c.ghost
            ? `<circle cx="${x}" cy="${y}" r="${R}" fill="${C.bg}" stroke="${color}" stroke-width="2" stroke-dasharray="3 2"/>`
            : `<circle cx="${x}" cy="${y}" r="${R}" fill="${color}"/>`;
        out.push(`<g${op}>${shape}`);
        if (c.label !== false) {
            out.push(text({ x, y: y + R + 16, text: c.label ?? c.id, color: C.muted, size: 12, anchor: 'middle', mono: true }));
        }
        if (c.sub) {
            out.push(text({ x, y: y + R + 31, text: c.sub, color: C.text, size: 12, anchor: 'middle' }));
        }
        out.push('</g>');
    }

    // ref 標籤疊在圓點上方；同一個 commit 有多個就往上疊
    const stack = {};
    for (const r of g.refs || []) {
        const c = byId[r.at];
        const n = stack[r.at] || 0;
        stack[r.at] = n + 1;
        const x = px(c);
        // below：放在節點與它的標籤下面，給線從上面進來的節點用
        const y = r.below ? py(c) + R + 30 + n * 24 : py(c) - R - 16 - n * 24;
        out.push(pill({ x, y, text: r.name, color: C[r.color] || r.color || colorOf(c), filled: !!r.head, dashed: !!r.remote }));
    }

    for (const t of g.texts || []) {
        out.push(text({ ...t, x: t.x + ox, y: t.y + oy }));
    }

    return out.join('\n');
}

function render(d) {
    const parts = [];
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${d.w} ${d.h}" width="${d.w}" height="${d.h}" role="img" aria-label="${esc(d.alt || d.name)}">`);
    parts.push(`<title>${esc(d.alt || d.name)}</title>`);
    // 指向爸爸的箭頭用的 marker，每個顏色一個
    const markers = Object.entries(C).map(([k, v]) => `<marker id="parent-${k}" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="${v}"/></marker>`).join('');
    parts.push(`<defs>${markers}</defs>`);
    parts.push(`<rect width="${d.w}" height="${d.h}" rx="10" fill="${C.bg}"/>`);
    if (d.caption) {
        parts.push(text({ x: 20, y: 26, text: d.caption, color: C.text, size: 14, weight: 600 }));
    }
    for (const b of d.boxes || []) parts.push(box(b));
    for (const g of d.groups || []) parts.push(group(g));
    for (const a of d.arrows || []) parts.push(arrow(a));
    for (const p of d.pills || []) parts.push(pill(p));
    // y 給負數＝從底部算
    for (const t of d.texts || []) parts.push(text({ ...t, y: t.y < 0 ? d.h + t.y : t.y }));
    parts.push('</svg>');
    return parts.join('\n');
}

// 常用的小圖例
const legend = (x, y) => [
    { x, y, text: '實心標籤＝HEAD 在這裡', color: C.muted, size: 12 },
    { x: x + 170, y, text: '虛線標籤＝遠端分支（origin/…）', color: C.muted, size: 12 }
];

const DIAGRAMS = [
    // ───────── stage-1 ─────────
    {
        name: 'commit-chain',
        alt: '三個 commit 串成一條線，每個 commit 指向它的上一個',
        w: 640,
        h: 240,
        caption: '每個 commit 都記著「我接在誰後面」，箭頭指向上一個',
        groups: [{
            arrows: true,
            commits: [
                { id: 'a1f3c', x: 1, lane: 0, sub: '建專案' },
                { id: '7b2e9', x: 3, lane: 0, sub: '加首頁' },
                { id: 'c04d1', x: 5, lane: 0, sub: '修 RWD' }
            ],
            edges: [['7b2e9', 'a1f3c'], ['c04d1', '7b2e9']],
            refs: [{ name: 'main', at: 'c04d1', head: true }]
        }],
        texts: [{ x: gx(5) + 60, y: gy(0) + 4, text: '← 最新的在這邊', color: C.muted, size: 12 }]
    },
    {
        name: 'refs-and-head',
        alt: '分支只是貼在 commit 上的標籤，HEAD 指向你現在站的分支',
        w: 640,
        h: 320,
        caption: '分支＝貼在某個 commit 上的便利貼；HEAD＝你現在站在哪張便利貼上',
        groups: [{
            commits: [
                { id: 'A', x: 0, lane: 1 },
                { id: 'B', x: 1, lane: 1 },
                { id: 'C', x: 2, lane: 1 },
                { id: 'D', x: 3, lane: 0, color: 'blue' },
                { id: 'E', x: 4, lane: 0, color: 'blue' },
                { id: 'F', x: 3, lane: 2, color: 'green' }
            ],
            edges: [['B', 'A'], ['C', 'B'], ['D', 'C', 'blue'], ['E', 'D', 'blue'], ['F', 'C', 'green']],
            refs: [
                { name: 'main', at: 'C' },
                { name: 'feat/login', at: 'E', color: 'blue', head: true },
                { name: 'fix/typo', at: 'F', color: 'green', below: true }
            ]
        }],
        texts: legend(20, -15)
    },
    {
        name: 'remote-refs',
        alt: '本機 main 比 origin/main 多兩個 commit',
        w: 640,
        h: 250,
        caption: 'origin/main 是「上次跟遠端對過時，遠端的 main 在哪」，不是遠端現在的樣子',
        groups: [{
            commits: [
                { id: 'A', x: 0, lane: 0 },
                { id: 'B', x: 1, lane: 0 },
                { id: 'C', x: 2, lane: 0 },
                { id: 'D', x: 3, lane: 0 },
                { id: 'E', x: 4, lane: 0 }
            ],
            edges: [['B', 'A'], ['C', 'B'], ['D', 'C'], ['E', 'D']],
            refs: [
                { name: 'origin/main', at: 'C', remote: true },
                { name: 'main', at: 'E', head: true }
            ]
        }],
        texts: [{ x: gx(3.5), y: gy(0) + 48, text: '這兩個還沒 push', color: C.muted, size: 12, anchor: 'middle' }]
    },
    // ───────── stage-2 ─────────
    {
        name: 'branch-create',
        alt: '開分支的當下，兩張便利貼貼在同一個 commit；在新分支提交後只有新分支往前走',
        w: 700,
        h: 350,
        caption: '開分支只是多貼一張便利貼；在上面 commit，才會長出自己的線',
        groups: [
            {
                commits: [{ id: 'A', x: 0, lane: 0 }, { id: 'B', x: 1, lane: 0 }, { id: 'C', x: 2, lane: 0 }],
                edges: [['B', 'A'], ['C', 'B']],
                refs: [{ name: 'main', at: 'C' }, { name: 'feat/login', at: 'C', color: 'blue', head: true }],
                texts: [{ x: gx(0) - 20, y: gy(0) - 62, text: '① git switch -c feat/login', color: C.text, size: 13, weight: 600 }]
            },
            {
                oy: 130,
                commits: [
                    { id: 'A', x: 0, lane: 1 },
                    { id: 'B', x: 1, lane: 1 },
                    { id: 'C', x: 2, lane: 1 },
                    { id: 'D', x: 3, lane: 0, color: 'blue' },
                    { id: 'E', x: 4, lane: 0, color: 'blue' }
                ],
                edges: [['B', 'A'], ['C', 'B'], ['D', 'C', 'blue'], ['E', 'D', 'blue']],
                refs: [{ name: 'main', at: 'C' }, { name: 'feat/login', at: 'E', color: 'blue', head: true }],
                texts: [{ x: gx(0) - 20, y: gy(0) - 62, text: '② 提交兩次之後', color: C.text, size: 13, weight: 600 }]
            }
        ]
    },
    {
        name: 'wrong-branch-fix',
        alt: '在 main 上誤提交之後，先在這個 commit 開分支，再把 main 退回一格',
        w: 700,
        h: 380,
        caption: '不小心 commit 在 main 上：先貼新便利貼，再把 main 撕回去，commit 本身沒動',
        groups: [
            {
                commits: [{ id: 'A', x: 0, lane: 0 }, { id: 'B', x: 1, lane: 0 }, { id: 'C', x: 2, lane: 0 }, { id: 'D', x: 3, lane: 0, sub: '誤提交' }],
                edges: [['B', 'A'], ['C', 'B'], ['D', 'C']],
                refs: [{ name: 'main', at: 'D', head: true }],
                texts: [{ x: gx(0) - 20, y: gy(0) - 62, text: '① 糟糕，commit 到 main 了', color: C.text, size: 13, weight: 600 }]
            },
            {
                oy: 140,
                commits: [{ id: 'A', x: 0, lane: 0 }, { id: 'B', x: 1, lane: 0 }, { id: 'C', x: 2, lane: 0 }, { id: 'D', x: 3, lane: 0, color: 'blue' }],
                edges: [['B', 'A'], ['C', 'B'], ['D', 'C', 'blue']],
                refs: [{ name: 'main', at: 'C' }, { name: 'feat/oops', at: 'D', color: 'blue', head: true }],
                texts: [{ x: gx(0) - 20, y: gy(0) - 62, text: '② git branch feat/oops  →  git switch feat/oops  →  git branch -f main HEAD~1', color: C.text, size: 13, weight: 600 }]
            }
        ]
    },
    // ───────── stage-3 ─────────
    {
        name: 'ahead-behind',
        alt: '本機 main 與 origin/main 各自往前走，分岔了',
        w: 640,
        h: 330,
        caption: '兩邊都動過：你 ahead 2、behind 1。這時候 push 會被拒絕',
        groups: [{
            commits: [
                { id: 'A', x: 0, lane: 1 },
                { id: 'B', x: 1, lane: 1 },
                { id: 'C', x: 2, lane: 1 },
                { id: 'D', x: 3, lane: 0 },
                { id: 'E', x: 4, lane: 0 },
                { id: 'X', x: 3, lane: 2, color: 'purple' }
            ],
            edges: [['B', 'A'], ['C', 'B'], ['D', 'C'], ['E', 'D'], ['X', 'C', 'purple']],
            refs: [{ name: 'main', at: 'E', head: true }, { name: 'origin/main', at: 'X', color: 'purple', remote: true, below: true }],
            texts: [{ x: gx(3) + 20, y: gy(2) + 4, text: '← 別台電腦推上去的', color: C.muted, size: 12 }]
        }],
        texts: legend(20, -15)
    },
    {
        name: 'pull-merge-vs-rebase',
        alt: 'pull 用 merge 會多一個合併 commit；用 rebase 會把本機的 commit 接到遠端後面',
        w: 760,
        h: 380,
        caption: '同一個分岔，pull 的兩種收法',
        groups: [
            {
                commits: [
                    { id: 'C', x: 0, lane: 1 },
                    { id: 'D', x: 1, lane: 0 },
                    { id: 'E', x: 2, lane: 0 },
                    { id: 'X', x: 1, lane: 2, color: 'purple' },
                    { id: 'M', x: 3, lane: 1, sub: 'merge commit' }
                ],
                edges: [['D', 'C'], ['E', 'D'], ['X', 'C', 'purple'], ['M', 'E'], ['M', 'X', 'purple']],
                refs: [{ name: 'main', at: 'M', head: true }],
                texts: [{ x: gx(0) - 20, y: gy(0) - 62, text: 'git pull（預設 merge）：歷史留下分岔與一個合併點', color: C.text, size: 13, weight: 600 }]
            },
            {
                ox: 340,
                oy: 0,
                commits: [
                    { id: 'C', x: 0, lane: 1 },
                    { id: 'X', x: 1, lane: 1, color: 'purple' },
                    { id: 'D\'', x: 2, lane: 1 },
                    { id: 'E\'', x: 3, lane: 1 }
                ],
                edges: [['X', 'C', 'purple'], ['D\'', 'X'], ['E\'', 'D\'']],
                refs: [{ name: 'main', at: 'E\'', head: true }],
                texts: [
                    { x: gx(0) - 20, y: gy(0) - 62, text: 'git pull --rebase：你的 commit 重做一次，接在遠端後面', color: C.text, size: 13, weight: 600 },
                    { x: gx(2.5), y: gy(1) + 46, text: 'D\'、E\' 是新的 commit，hash 變了', color: C.muted, size: 12, anchor: 'middle' }
                ]
            }
        ],
        texts: [{ x: 20, y: -18, text: '一條直線比較好讀，代價是本機那幾個 commit 被重寫；還沒 push 過的 commit 才能這樣做', color: C.muted, size: 12 }]
    },
    // ───────── stage-4 ─────────
    {
        name: 'fast-forward',
        alt: 'main 沒有新 commit 時，合併只是把 main 的標籤往前搬',
        w: 700,
        h: 350,
        caption: 'fast-forward：main 沒動過，合併只是把便利貼搬過去，不產生新 commit',
        groups: [
            {
                commits: [{ id: 'A', x: 0, lane: 0 }, { id: 'B', x: 1, lane: 0 }, { id: 'C', x: 2, lane: 0, color: 'blue' }, { id: 'D', x: 3, lane: 0, color: 'blue' }],
                edges: [['B', 'A'], ['C', 'B', 'blue'], ['D', 'C', 'blue']],
                refs: [{ name: 'main', at: 'B', head: true }, { name: 'feat/login', at: 'D', color: 'blue' }],
                texts: [{ x: gx(0) - 20, y: gy(0) - 62, text: '① 合併前：main 在 B，feat 從 B 長出去', color: C.text, size: 13, weight: 600 }]
            },
            {
                oy: 130,
                commits: [{ id: 'A', x: 0, lane: 0 }, { id: 'B', x: 1, lane: 0 }, { id: 'C', x: 2, lane: 0 }, { id: 'D', x: 3, lane: 0 }],
                edges: [['B', 'A'], ['C', 'B'], ['D', 'C']],
                refs: [{ name: 'main', at: 'D', head: true }, { name: 'feat/login', at: 'D', color: 'blue' }],
                texts: [{ x: gx(0) - 20, y: gy(0) - 62, text: '② git merge feat/login 之後：歷史是一條直線，看不出曾經有分支', color: C.text, size: 13, weight: 600 }]
            }
        ]
    },
    {
        name: 'merge-commit',
        alt: '兩邊都有新 commit 時，合併會產生一個有兩個爸爸的 merge commit',
        w: 740,
        h: 350,
        caption: '三方合併：兩邊都動過，就得生一個有兩個爸爸的 commit 把它們接起來',
        groups: [
            {
                commits: [
                    { id: 'A', x: 0, lane: 1 },
                    { id: 'B', x: 1, lane: 1 },
                    { id: 'E', x: 2, lane: 1 },
                    { id: 'F', x: 3, lane: 1 },
                    { id: 'C', x: 2, lane: 0, color: 'blue' },
                    { id: 'D', x: 3, lane: 0, color: 'blue' }
                ],
                edges: [['B', 'A'], ['E', 'B'], ['F', 'E'], ['C', 'B', 'blue'], ['D', 'C', 'blue']],
                refs: [{ name: 'main', at: 'F', head: true }, { name: 'feat/login', at: 'D', color: 'blue' }],
                texts: [{ x: gx(0) - 20, y: gy(0) - 62, text: '① 合併前：B 之後兩邊各走各的', color: C.text, size: 13, weight: 600 }]
            },
            {
                ox: 360,
                commits: [
                    { id: 'B', x: 0, lane: 1 },
                    { id: 'E', x: 1, lane: 1 },
                    { id: 'F', x: 2, lane: 1 },
                    { id: 'M', x: 3, lane: 1 },
                    { id: 'C', x: 1, lane: 0, color: 'blue' },
                    { id: 'D', x: 2, lane: 0, color: 'blue' }
                ],
                edges: [['E', 'B'], ['F', 'E'], ['C', 'B', 'blue'], ['D', 'C', 'blue'], ['M', 'F'], ['M', 'D', 'blue']],
                refs: [{ name: 'main', at: 'M', head: true }, { name: 'feat/login', at: 'D', color: 'blue' }],
                texts: [
                    { x: gx(0) - 20, y: gy(0) - 62, text: '② git merge feat/login：M 的爸爸是 F 跟 D', color: C.text, size: 13, weight: 600 },
                    { x: gx(3), y: gy(1) + 46, text: '衝突就是在生 M 的時候發生的', color: C.muted, size: 12, anchor: 'middle' }
                ]
            }
        ]
    },
    // ───────── stage-5 ─────────
    {
        name: 'rebase',
        alt: 'rebase 把分支上的 commit 重做一次，接到 main 最新的 commit 後面',
        w: 760,
        h: 370,
        caption: 'rebase：把分支「剪下來、貼到 main 最新的後面」。貼過去的是複製品，hash 全變',
        groups: [
            {
                commits: [
                    { id: 'A', x: 0, lane: 1 },
                    { id: 'B', x: 1, lane: 1 },
                    { id: 'E', x: 2, lane: 1 },
                    { id: 'F', x: 3, lane: 1 },
                    { id: 'C', x: 2, lane: 0, color: 'blue' },
                    { id: 'D', x: 3, lane: 0, color: 'blue' }
                ],
                edges: [['B', 'A'], ['E', 'B'], ['F', 'E'], ['C', 'B', 'blue'], ['D', 'C', 'blue']],
                refs: [{ name: 'main', at: 'F' }, { name: 'feat/login', at: 'D', color: 'blue', head: true }],
                texts: [{ x: gx(0) - 20, y: gy(0) - 62, text: '① rebase 前', color: C.text, size: 13, weight: 600 }]
            },
            {
                ox: 340,
                commits: [
                    { id: 'B', x: 0, lane: 1 },
                    { id: 'E', x: 1, lane: 1 },
                    { id: 'F', x: 2, lane: 1 },
                    { id: 'C\'', x: 3, lane: 1, color: 'blue' },
                    { id: 'D\'', x: 4, lane: 1, color: 'blue' },
                    { id: 'C', x: 1, lane: 0, color: 'blue', dim: true },
                    { id: 'D', x: 2, lane: 0, color: 'blue', dim: true }
                ],
                edges: [['E', 'B'], ['F', 'E'], ['C\'', 'F', 'blue'], ['D\'', 'C\'', 'blue'], ['C', 'B', 'blue'], ['D', 'C', 'blue']],
                refs: [{ name: 'main', at: 'F' }, { name: 'feat/login', at: 'D\'', color: 'blue', head: true }],
                texts: [
                    { x: gx(0) - 20, y: gy(0) - 62, text: '② git rebase main（站在 feat/login 上）', color: C.text, size: 13, weight: 600 },
                    { x: gx(1.5), y: gy(0) - 16, text: '舊的 C、D 還在，只是沒標籤指著', color: C.muted, size: 12, anchor: 'middle' }
                ]
            }
        ],
        texts: [{ x: 20, y: -18, text: '黃金法則：推出去、別人可能已經拿到的 commit，不要 rebase。你重做一份，對方手上還是舊的那份', color: C.muted, size: 12 }]
    },
    {
        name: 'interactive-rebase',
        alt: '互動式 rebase 把三個小 commit 壓成一個',
        w: 700,
        h: 280,
        caption: 'git rebase -i：把「修錯字、再修錯字、真的修好了」三個 commit 壓成一個',
        groups: [
            {
                commits: [
                    { id: 'F', x: 0, lane: 0 },
                    { id: 'C', x: 1, lane: 0, color: 'blue', sub: '登入頁' },
                    { id: 'D', x: 2, lane: 0, color: 'blue', sub: '修錯字' },
                    { id: 'E', x: 3, lane: 0, color: 'blue', sub: '又修' }
                ],
                edges: [['C', 'F', 'blue'], ['D', 'C', 'blue'], ['E', 'D', 'blue']],
                refs: [{ name: 'feat/login', at: 'E', color: 'blue', head: true }]
            },
            {
                ox: 380,
                commits: [{ id: 'F', x: 0, lane: 0 }, { id: 'C\'', x: 1, lane: 0, color: 'blue', sub: '登入頁' }],
                edges: [['C\'', 'F', 'blue']],
                refs: [{ name: 'feat/login', at: 'C\'', color: 'blue', head: true }]
            }
        ],
        arrows: [{ from: [gx(3) + 60, gy(0)], to: [gx(0) + 380 - 30, gy(0)], color: C.muted }],
        texts: [{ x: (gx(3) + 60 + gx(0) + 350) / 2, y: gy(0) - 12, text: 'squash', color: C.muted, size: 12, anchor: 'middle', mono: true }, { x: 20, y: -18, text: '送 PR 前整理成「一個 commit 一件事」，看的人輕鬆很多；但一樣只能整理還沒推出去的', color: C.muted, size: 12 }]
    },
    {
        name: 'reset-modes',
        alt: 'reset 的三種模式分別影響 HEAD、暫存區、工作目錄中的哪幾個',
        w: 700,
        h: 280,
        caption: 'git reset 的三種力道：往回退的時候，哪幾層跟著退',
        boxes: [
            { x: 40, y: 60, w: 180, h: 70, label: ['HEAD（分支指標）', '歷史退回去'], color: C.main },
            { x: 260, y: 60, w: 180, h: 70, label: ['暫存區（index）', 'git add 過的東西'], color: C.cyan },
            { x: 480, y: 60, w: 180, h: 70, label: ['工作目錄', '你眼前的檔案'], color: C.green },
            { x: 40, y: 160, w: 180, h: 32, label: '--soft', color: C.main, fill: 'rgba(244,185,54,0.18)', mono: true },
            { x: 40, y: 200, w: 400, h: 32, label: '--mixed（預設）', color: C.cyan, fill: 'rgba(86,182,194,0.18)', mono: true },
            { x: 40, y: 240, w: 620, h: 32, label: '--hard', color: C.red, fill: 'rgba(224,108,117,0.18)', mono: true }
        ],
        texts: [
            { x: 240, y: 181, text: '← 只有指標退；改動全留在暫存區，等著重新 commit', color: C.muted, size: 12 },
            { x: 460, y: 221, text: '← 指標退、暫存清空；改動還在檔案裡', color: C.muted, size: 12 }
        ]
    },
    {
        name: 'reflog',
        alt: 'reset 之後舊的 commit 沒有消失，reflog 還記得它',
        w: 640,
        h: 280,
        caption: '--hard 退回去之後，D 看起來不見了。其實它還在，reflog 記著 HEAD 曾經指過它',
        groups: [{
            commits: [
                { id: 'A', x: 0, lane: 0 },
                { id: 'B', x: 1, lane: 0 },
                { id: 'C', x: 2, lane: 0 },
                { id: 'D', x: 3, lane: 0, dim: true, sub: '沒標籤的孤兒' }
            ],
            edges: [['B', 'A'], ['C', 'B'], ['D', 'C']],
            refs: [{ name: 'main', at: 'C', head: true }]
        }],
        texts: [
            { x: gx(3) + 60, y: gy(0) - 20, text: 'HEAD@{1}: commit: 誤提交', color: C.muted, size: 12, mono: true },
            { x: gx(3) + 60, y: gy(0), text: 'HEAD@{0}: reset: moving to HEAD~1', color: C.muted, size: 12, mono: true },
            { x: 20, y: -18, text: 'git reflog 找到 D 的 hash，git branch rescue <hash> 貼張便利貼上去，它就回來了。大約保留 90 天', color: C.muted, size: 12 }
        ]
    },
    // ───────── stage-6 ─────────
    {
        name: 'merge-noise',
        alt: '一條長壽分支每天把 main 合併進來，歷史會被合併 commit 淹沒',
        w: 720,
        h: 400,
        caption: '真實案例：一條活了五天的翻新分支，十六個「Merge origin/main」。圖上每個 M 都沒有內容',
        groups: [
            {
                commits: [
                    { id: 'm1', x: 0, lane: 1, label: false },
                    { id: 'm2', x: 1, lane: 1, label: false },
                    { id: 'm3', x: 2, lane: 1, label: false },
                    { id: 'm4', x: 3, lane: 1, label: false },
                    { id: 'm5', x: 4, lane: 1, label: false },
                    { id: 'm6', x: 5, lane: 1, label: false },
                    { id: 'r1', x: 0.5, lane: 0, color: 'purple', label: 'feat' },
                    { id: 'M1', x: 1.5, lane: 0, color: 'purple', label: 'M' },
                    { id: 'M2', x: 2.5, lane: 0, color: 'purple', label: 'M' },
                    { id: 'r2', x: 3, lane: 0, color: 'purple', label: 'fix' },
                    { id: 'M3', x: 3.5, lane: 0, color: 'purple', label: 'M' },
                    { id: 'M4', x: 4.5, lane: 0, color: 'purple', label: 'M' },
                    { id: 'M5', x: 5.5, lane: 0, color: 'purple', label: 'M' }
                ],
                edges: [
                    ['m2', 'm1'],
                    ['m3', 'm2'],
                    ['m4', 'm3'],
                    ['m5', 'm4'],
                    ['m6', 'm5'],
                    ['r1', 'm1', 'purple'],
                    ['M1', 'r1', 'purple'],
                    ['M1', 'm2'],
                    ['M2', 'M1', 'purple'],
                    ['M2', 'm3'],
                    ['r2', 'M2', 'purple'],
                    ['M3', 'r2', 'purple'],
                    ['M3', 'm4'],
                    ['M4', 'M3', 'purple'],
                    ['M4', 'm5'],
                    ['M5', 'M4', 'purple'],
                    ['M5', 'm6']
                ],
                refs: [{ name: 'main', at: 'm6' }, { name: 'redesign', at: 'M5', color: 'purple', head: true }],
                texts: [{ x: gx(0) - 20, y: gy(0) - 62, text: '① 每次看到 main 有新東西就 merge 進來', color: C.text, size: 13, weight: 600 }]
            },
            {
                oy: 170,
                commits: [
                    { id: 'm1', x: 0, lane: 1, label: false },
                    { id: 'm2', x: 1, lane: 1, label: false },
                    { id: 'm3', x: 2, lane: 1, label: false },
                    { id: 'm4', x: 3, lane: 1, label: false },
                    { id: 'm5', x: 4, lane: 1, label: false },
                    { id: 'm6', x: 5, lane: 1, label: false },
                    { id: 'r1', x: 1, lane: 0, color: 'purple', label: 'feat' },
                    { id: 'r2', x: 2, lane: 0, color: 'purple', label: 'fix' },
                    { id: 'M', x: 5, lane: 0, color: 'purple', label: 'M' }
                ],
                edges: [
                    ['m2', 'm1'],
                    ['m3', 'm2'],
                    ['m4', 'm3'],
                    ['m5', 'm4'],
                    ['m6', 'm5'],
                    ['r1', 'm1', 'purple'],
                    ['r2', 'r1', 'purple'],
                    ['M', 'r2', 'purple'],
                    ['M', 'm5']
                ],
                refs: [{ name: 'main', at: 'm6' }, { name: 'redesign', at: 'M', color: 'purple', head: true }],
                texts: [
                    { x: gx(0) - 20, y: gy(0) - 62, text: '② 分支還沒推出去就 rebase；推出去了就只在「需要 main 的東西」時合一次', color: C.text, size: 13, weight: 600 },
                    { x: gx(5) + 24, y: gy(0) + 4, text: '← 要上線前合一次', color: C.muted, size: 12 }
                ]
            }
        ]
    },
    {
        name: 'branch-models',
        alt: 'Git Flow、GitHub Flow、Trunk-based 三種分支模型的形狀',
        w: 840,
        h: 340,
        caption: '三種分支模型的形狀：分支越多越安全，也越難看懂',
        groups: [
            {
                commits: [
                    { id: 'a', x: 0, lane: 0, label: false },
                    { id: 'b', x: 4, lane: 0, label: false },
                    { id: 'c', x: 0, lane: 1, label: false, color: 'cyan' },
                    { id: 'd', x: 2, lane: 1, label: false, color: 'cyan' },
                    { id: 'e', x: 3.3, lane: 1, label: false, color: 'cyan' },
                    { id: 'f', x: 1, lane: 2, label: false, color: 'blue' },
                    { id: 'g', x: 1.6, lane: 2, label: false, color: 'blue' }
                ],
                edges: [['b', 'a'], ['d', 'c', 'cyan'], ['e', 'd', 'cyan'], ['f', 'c', 'blue'], ['g', 'f', 'blue'], ['d', 'g', 'blue'], ['b', 'e', 'cyan'], ['c', 'a', 'cyan']],
                refs: [{ name: 'main', at: 'b' }, { name: 'develop', at: 'e', color: 'cyan' }, { name: 'feature', at: 'g', color: 'blue' }],
                texts: [
                    { x: gx(0) - 20, y: gy(0) - 62, text: 'Git Flow', color: C.text, size: 13, weight: 600 },
                    { x: gx(0) - 20, y: gy(2) + 46, text: '還有 release、hotfix', color: C.muted, size: 12 }
                ]
            },
            {
                ox: 300,
                oy: 30,
                commits: [
                    { id: 'a', x: 0, lane: 0, label: false },
                    { id: 'b', x: 2, lane: 0, label: false },
                    { id: 'c', x: 3, lane: 0, label: false },
                    { id: 'f', x: 0.7, lane: 1, label: false, color: 'blue' },
                    { id: 'g', x: 1.3, lane: 1, label: false, color: 'blue' },
                    { id: 'h', x: 2.5, lane: 1, label: false, color: 'green' }
                ],
                edges: [['b', 'a'], ['c', 'b'], ['f', 'a', 'blue'], ['g', 'f', 'blue'], ['b', 'g', 'blue'], ['h', 'b', 'green'], ['c', 'h', 'green']],
                refs: [{ name: 'main', at: 'c' }],
                texts: [
                    { x: gx(0) - 20, y: gy(0) - 62 - 30, text: 'GitHub Flow', color: C.text, size: 13, weight: 600 },
                    { x: gx(0) - 20, y: gy(1) + 46, text: '短命分支，PR 回 main 就上線', color: C.muted, size: 12 }
                ]
            },
            {
                ox: 560,
                oy: 30,
                commits: [
                    { id: 'a', x: 0, lane: 0, label: false },
                    { id: 'b', x: 0.45, lane: 0, label: false },
                    { id: 'c', x: 0.9, lane: 0, label: false },
                    { id: 'd', x: 1.35, lane: 0, label: false },
                    { id: 'e', x: 1.8, lane: 0, label: false }
                ],
                edges: [['b', 'a'], ['c', 'b'], ['d', 'c'], ['e', 'd']],
                refs: [{ name: 'main', at: 'e' }],
                texts: [
                    { x: gx(0) - 20, y: gy(0) - 62 - 30, text: 'Trunk-based', color: C.text, size: 13, weight: 600 },
                    { x: gx(0) - 20, y: gy(1) + 46, text: '直接進 main，靠 flag 與 CI 兜底', color: C.muted, size: 12 }
                ]
            }
        ]
    },
    // ───────── AI 專區 ─────────
    {
        name: 'one-checkout-many-chats',
        alt: '三個對話共用同一個工作目錄，一個切分支，另外兩個看到的檔案就變了',
        w: 700,
        h: 260,
        caption: '一個工作目錄，三個對話：誰切了分支，其他人眼前的檔案就全換了',
        boxes: [
            { x: 40, y: 50, w: 150, h: 46, label: '對話 A：翻新主題', color: C.purple },
            { x: 40, y: 110, w: 150, h: 46, label: '對話 B：寫草稿', color: C.green },
            { x: 40, y: 170, w: 150, h: 46, label: '對話 C：升套件', color: C.cyan },
            { x: 300, y: 70, w: 180, h: 120, label: ['opshell.github.io/', '', 'HEAD → redesign', '（只能站在一條分支）'], color: C.main, mono: true, size: 12 },
            { x: 540, y: 95, w: 130, h: 70, label: ['未提交的改動', '三個人的混在一起'], color: C.red, dashed: true, size: 12 }
        ],
        arrows: [
            { from: [190, 73], to: [300, 100], color: C.purple },
            { from: [190, 133], to: [300, 130], color: C.green },
            { from: [190, 193], to: [300, 160], color: C.cyan },
            { from: [480, 130], to: [540, 130], color: C.red, dashed: true }
        ],
        texts: [{ x: 20, y: -18, text: '2026-10-05 真的發生：寫語法圖鑑的對話直接在翻新分支上改，跟另一個對話沒提交的東西混在同一份 git status 裡', color: C.muted, size: 12 }]
    },
    {
        name: 'worktrees',
        alt: '一個 .git 掛好幾個工作目錄，每個目錄站在自己的分支上',
        w: 720,
        h: 330,
        caption: 'git worktree：一個 .git，好幾個資料夾，每個資料夾站在自己的分支上',
        boxes: [
            { x: 270, y: 40, w: 180, h: 54, label: ['opshell.github.io/.git', '所有 commit、所有分支'], color: C.main, mono: true, size: 12 },
            { x: 30, y: 170, w: 150, h: 70, label: ['../opshell-main', 'main', '（上線用）'], color: C.main, mono: true, size: 12, align: 'start' },
            { x: 200, y: 170, w: 150, h: 70, label: ['../opshell-home', 'redesign-home', '對話 A'], color: C.purple, mono: true, size: 12, align: 'start' },
            { x: 370, y: 170, w: 150, h: 70, label: ['../opshell-drafts', 'drafts-2026-10', '對話 B'], color: C.green, mono: true, size: 12, align: 'start' },
            { x: 540, y: 170, w: 150, h: 70, label: ['../opshell-deps', 'deps-2026-10', '對話 C'], color: C.cyan, mono: true, size: 12, align: 'start' }
        ],
        arrows: [
            { from: [330, 94], to: [105, 170], color: C.muted },
            { from: [345, 94], to: [275, 170], color: C.muted },
            { from: [375, 94], to: [445, 170], color: C.muted },
            { from: [390, 94], to: [615, 170], color: C.muted }
        ],
        texts: [
            { x: 20, y: 270, text: '同一條分支不能同時被兩個 worktree 站著，git 會擋。這個限制反而是好事：一條分支一個主人', color: C.muted, size: 12 },
            { x: 20, y: 292, text: 'node_modules、.env.local、dist 這些沒進版控的東西不會跟過去，每個資料夾要自己裝一次', color: C.muted, size: 12 },
            { x: 20, y: 314, text: '2026-10-05 實況：六個 worktree、六條分支、四個對話同時在跑', color: C.muted, size: 12 }
        ]
    },
    {
        name: 'human-ai-loop',
        alt: 'AI 在自己的分支上提交，人看過才合併進 main，main 一推就上線',
        w: 720,
        h: 330,
        caption: '分工：AI 負責 commit，人負責「要不要合進 main」。main 等於上線',
        groups: [{
            commits: [
                { id: 'm1', x: 0, lane: 1, label: false },
                { id: 'm2', x: 2, lane: 1, label: false, sub: '人：看過才合' },
                { id: 'm3', x: 5.2, lane: 1, label: false, sub: '人：看過才合' },
                { id: 'a1', x: 0.7, lane: 0, color: 'purple', label: false },
                { id: 'a2', x: 1.4, lane: 0, color: 'purple', label: false },
                { id: 'b1', x: 3, lane: 0, color: 'green', label: false },
                { id: 'b2', x: 3.7, lane: 0, color: 'green', label: false },
                { id: 'b3', x: 4.4, lane: 0, color: 'green', label: false }
            ],
            edges: [
                ['m2', 'm1'],
                ['m3', 'm2'],
                ['a1', 'm1', 'purple'],
                ['a2', 'a1', 'purple'],
                ['m2', 'a2', 'purple'],
                ['b1', 'm2', 'green'],
                ['b2', 'b1', 'green'],
                ['b3', 'b2', 'green'],
                ['m3', 'b3', 'green']
            ],
            refs: [
                { name: 'feat/home', at: 'a2', color: 'purple' },
                { name: 'docs/git-series', at: 'b3', color: 'green' }
            ]
        }],
        pills: [{ x: gx(5.2) + 110, y: gy(1), text: 'main → GitHub Pages', color: C.main }],
        texts: [
            { x: 20, y: -40, text: '紫、綠：AI 在自己的分支上改、跑檢查、commit，想 commit 幾次都可以', color: C.muted, size: 12 },
            { x: 20, y: -18, text: 'AI 不碰 main、不 push、不改歷史；這三件事要人開口。其他的放手', color: C.muted, size: 12 }
        ]
    }
];

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const d of DIAGRAMS) {
    const file = path.join(OUT_DIR, `${d.name}.svg`);
    fs.writeFileSync(file, render(d));
    console.log('寫入', path.relative(process.cwd(), file));
}
