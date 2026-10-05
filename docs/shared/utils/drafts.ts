// 本機看草稿的開關（2026-10-06，使用者：「本地端 run docs:dev 有辦法看到草稿嗎？」）。
// `pnpm docs:drafts`（＝ SHOW_DRAFTS=1 vitepress dev docs）時，草稿也進側欄、時間軸、標籤、專區列表與站內搜尋，標題前面加「草稿｜」；
// 一般的 docs:dev 與正式 build 都不受影響（config.mts 在開關開著時拒絕 build，草稿不會不小心上線）。
// 都在 Node 端用（config、側欄、站台資料、搜尋索引），不進瀏覽器。

import process from 'node:process';

/** 開關有沒有開 */
export const showDrafts = (env: Record<string, string | undefined> = process.env) => env.SHOW_DRAFTS === '1';

/**
 * 這篇要不要列出來：已發佈的一定要；開關開著時，明確寫了 isPublished: false 的草稿也要。
 * 沒寫 isPublished 的頁面（叮咚、履歷、專區首頁）不是文章，開關開著也不列。
 */
export function isListed(frontmatter: Record<string, unknown> | undefined, drafts = showDrafts()): boolean {
    if (frontmatter?.isPublished === true) return true;
    return drafts && frontmatter?.isPublished === false;
}

/** 草稿的標題前面加「草稿｜」：列表上一眼分得出來 */
export function listedTitle(title: string, frontmatter: Record<string, unknown> | undefined): string {
    return frontmatter?.isPublished === true ? title : `草稿｜${title}`;
}
