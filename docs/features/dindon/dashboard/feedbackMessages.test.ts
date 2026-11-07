import type { FeedbackMessage } from './schemas/admin.schema';
import { describe, expect, it } from 'vitest';
import {
    applyTemplate,
    awaitingFirst,
    bareAddress,
    boundAddress,
    defaultChannel,
    emailsAsMessages,
    isDraftSent,
    isOtherSender,
    keepDraft,
    markDraftSent,
    readState,
    REPLY_TEMPLATES,
    replyDraftProblem,
    replyErrorMessage,
    sortThread,
    takeDraft
} from './feedbackMessages';

const message = (patch: Partial<FeedbackMessage>): FeedbackMessage => ({
    id: 1,
    channel: 'app',
    direction: 'out',
    body: '內容',
    status: 'sent',
    actor: 'boss@example.com',
    draftId: 'd1',
    readAt: null,
    createdAt: '2026-11-08T09:00:00Z',
    from: null,
    to: null,
    subject: null,
    ...patch
});

describe('applyTemplate', () => {
    it('空草稿直接帶入', () => expect(applyTemplate('  \n', '範本')).toBe('範本'));
    it('已經打字的接在後面，不蓋掉', () => expect(applyTemplate('你好\n', '範本')).toBe('你好\n\n範本'));
});

describe('修好了的範本', () => {
    const fixed = REPLY_TEMPLATES.find(t => t.label === '修好了')!;
    it('有版本寫版本', () => expect(fixed.body({ fixedIn: '0.9.3' }, 'app')).toContain('0.9.3 版'));
    it('沒版本寫下一版', () => expect(fixed.body({ fixedIn: null }, 'app')).toContain('下一版'));
    it('寄信叫他回信，App 裡叫他在回報底下回', () => {
        expect(fixed.body({ fixedIn: null }, 'email')).toContain('回覆這封信');
        expect(fixed.body({ fixedIn: null }, 'app')).not.toContain('這封信');
    });
});

describe('replyDraftProblem', () => {
    it('內容只有空白不能送', () => expect(replyDraftProblem('app', '', ' \n ')).toBe('還沒寫內容'));
    it('字數算字元：5,000 個表情符號不超過', () => expect(replyDraftProblem('app', '', '😀'.repeat(5000))).toBe(''));
    it('超過 5,000 字擋下，兩個管道都一樣', () => {
        expect(replyDraftProblem('app', '', 'a'.repeat(5001))).toContain('內容最多');
        expect(replyDraftProblem('email', '', 'a'.repeat(5001))).toContain('內容最多');
    });
    it('前後空白不算字數，後端會去掉', () => expect(replyDraftProblem('app', '', ` ${'a'.repeat(5000)} `)).toBe(''));
    it('主旨超過 120 字擋下', () => expect(replyDraftProblem('email', '字'.repeat(121), '內容')).toContain('主旨最多'));
    it('主旨中間不能換行', () => expect(replyDraftProblem('email', '第一行\n第二行', '內容')).toBe('主旨不能換行'));
    it('app 裡回不看主旨（切過去之前打的不擋）', () => expect(replyDraftProblem('app', '第一行\n第二行', '內容')).toBe(''));
    it('主旨可以空，後端會帶', () => expect(replyDraftProblem('email', '', '內容')).toBe(''));
});

describe('defaultChannel', () => {
    it('app 能回就用 App', () => expect(defaultChannel(true, true)).toBe('app'));
    it('app 回不了、能寄信就寄信', () => expect(defaultChannel(false, true)).toBe('email'));
    it('兩邊都不行停在 App，畫面寫原因', () => expect(defaultChannel(false, false)).toBe('app'));
});

describe('寄件地址', () => {
    it('綁定的信箱回信，大小寫不同也算同一個', () => expect(isOtherSender(message({ channel: 'email', direction: 'in', from: 'User@Gmail.com' }), 'user@gmail.com')).toBe(false));
    it('帶名字的寫法只比地址', () => expect(isOtherSender(message({ channel: 'email', direction: 'in', from: '小明 <user@gmail.com>' }), 'user@gmail.com')).toBe(false));
    it('別的信箱回信要標出來', () => expect(isOtherSender(message({ channel: 'email', direction: 'in', from: 'boss@corp.tw' }), 'user@gmail.com')).toBe(true));
    it('我們寄出的不算', () => expect(isOtherSender(message({ channel: 'email', direction: 'out', from: '叮咚記帳 <support@dindon.opshell.me>' }), 'user@gmail.com')).toBe(false));
    it('app 裡的沒有地址，不標', () => expect(isOtherSender(message({ channel: 'app', direction: 'in' }), 'user@gmail.com')).toBe(false));
    it('沒有綁定信箱時沒得比，不標', () => expect(isOtherSender(message({ channel: 'email', direction: 'in', from: 'boss@corp.tw' }), null)).toBe(false));
    it('bareAddress 去掉空白', () => expect(bareAddress(' A@b.c ')).toBe('a@b.c'));
    it('寄不了時拿最後一封寄出的收件人來比', () => {
        const thread = [message({ channel: 'email', to: 'old@gmail.com' }), message({ channel: 'email', to: 'user@gmail.com' }), message({ channel: 'email', direction: 'in', to: 'support+r1@x' })];
        expect(boundAddress(null, thread)).toBe('user@gmail.com');
        expect(boundAddress('now@gmail.com', thread)).toBe('now@gmail.com');
        expect(boundAddress(null, [message({ channel: 'app' })])).toBeNull();
    });
});

describe('readState', () => {
    it('送達、讀了', () => expect(readState(message({ readAt: '2026-11-08T10:00:00Z' }))).toBe('read'));
    it('送達、還沒讀', () => expect(readState(message({}))).toBe('unread'));
    it('寄失敗、寄送中的對方沒收到，不談讀了沒', () => {
        expect(readState(message({ channel: 'email', status: 'failed' }))).toBeNull();
        expect(readState(message({ channel: 'email', status: 'sending' }))).toBeNull();
    });
    it('回報者寫的不標', () => expect(readState(message({ direction: 'in', status: 'received' }))).toBeNull());
});

describe('串的順序', () => {
    it('舊的在前，同一秒照 id', () => {
        const thread = [
            message({ id: 3, createdAt: '2026-11-08T10:00:00Z' }),
            message({ id: 2, createdAt: '2026-11-08T09:00:00Z' }),
            message({ id: 1, createdAt: '2026-11-08T10:00:00Z' })
        ];
        expect(sortThread(thread).map(m => m.id)).toEqual([2, 1, 3]);
    });
    it('舊後端只有信件時湊成同一個形狀', () => {
        const [converted] = emailsAsMessages([{ id: 9, direction: 'in', from: 'a@b', to: 'c@d', subject: 'Re', body: 'x', status: 'received', actor: null, draftId: null, createdAt: '2026-11-08T09:00:00Z' }]);
        expect(converted).toMatchObject({ id: 9, channel: 'email', readAt: null, from: 'a@b' });
    });
    it('等你回的排前面，其他維持原本的順序', () => {
        const reports = [{ id: 5, awaitingReply: false }, { id: 4, awaitingReply: true }, { id: 3, awaitingReply: false }, { id: 2, awaitingReply: true }];
        expect(awaitingFirst(reports).map(r => r.id)).toEqual([4, 2, 5, 3]);
    });
});

describe('replyErrorMessage', () => {
    it('連不上：告訴他再按一次是安全的', () => expect(replyErrorMessage('app', 0, '連不上後端')).toContain('不會多一則'));
    it('409 帶後端的原因', () => {
        expect(replyErrorMessage('app', 409, '沒有綁定裝置')).toBe('這則沒辦法在 App 裡回：沒有綁定裝置');
        expect(replyErrorMessage('email', 409, '正在寄')).toBe('現在寄不了：正在寄');
    });
    it('429 帶後端的原因、補退路', () => expect(replyErrorMessage('email', 429, '你今天已經寄了 80 封，明天再寄')).toBe('你今天已經寄了 80 封，明天再寄（算的是台灣時間的一天；急的話先改用 App 裡回）'));
    it('502 說再按一次不會變兩封', () => expect(replyErrorMessage('email', 502, '寄信失敗，稍後再試')).toContain('不會變兩封'));
    it('503 不重複後端的話，建議改用 App', () => expect(replyErrorMessage('email', 503, '寄信服務還沒設定好')).toBe('寄信服務還沒設定好。先改用 App 裡回'));
    it('其他照後端的話', () => expect(replyErrorMessage('email', 400, '主旨太長')).toBe('主旨太長'));
});

describe('草稿暫存', () => {
    const draft = (patch: Partial<Parameters<typeof keepDraft>[1]>) => ({ channel: 'app' as const, subject: '', body: '', draftId: '', triedChannel: null, ...patch });
    it('留下的拿一次就清掉', () => {
        keepDraft(1, draft({ body: '打到一半', draftId: 'x' }));
        expect(takeDraft(1)?.body).toBe('打到一半');
        expect(takeDraft(1)).toBeNull();
    });
    it('送出中換到別則、送成功之後回來，不留下已送出的草稿', () => {
        keepDraft(3, draft({ body: '送出中的內容', draftId: 'sending-1' }));
        markDraftSent('sending-1');
        expect(takeDraft(3)).toBeNull();
    });
    it('送失敗的草稿回來還在，draftId 與管道也在，重送才不會變成另一則', () => {
        keepDraft(4, draft({ channel: 'email', body: '失敗的內容', draftId: 'failed-1', triedChannel: 'email' }));
        expect(takeDraft(4)).toMatchObject({ channel: 'email', draftId: 'failed-1', triedChannel: 'email' });
    });
    it('還沒送過的草稿不算送出', () => {
        expect(isDraftSent('')).toBe(false);
        keepDraft(5, draft({ body: '剛打的' }));
        expect(takeDraft(5)?.body).toBe('剛打的');
    });
    it('空草稿不留', () => {
        keepDraft(2, draft({ subject: ' ', body: ' ' }));
        expect(takeDraft(2)).toBeNull();
    });
});
