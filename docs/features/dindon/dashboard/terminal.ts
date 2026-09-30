import type { DeviceStatus, FeedbackFilter } from './api';
import type { DashboardTab, PanelPreset } from './navigation';

// 後台頂端的偽終端機（2026-10 翻新）：打一行字就切分頁、查裝置、換主題，手不用離開鍵盤。
// 這裡只負責「字 → 要做什麼」與補完，真的去做是 DashboardApp 的事；純函式，方便測。

export interface TerminalTab {
    key: DashboardTab;
    label: string;
}

export type TerminalAction
    = | { kind: 'tab'; tab: DashboardTab; preset?: PanelPreset; note?: string }
        | { kind: 'refresh' }
        | { kind: 'reload' }
        | { kind: 'theme'; mode: 'dark' | 'light' | 'toggle' }
        | { kind: 'sidebar' }
        | { kind: 'help' }
        | { kind: 'clear' }
        | { kind: 'logout' }
        | { kind: 'none' }
        | { kind: 'error'; message: string };

export interface TerminalCommand {
    name: string;
    aliases: readonly string[];
    usage: string;
    text: string;
}

export const COMMANDS: readonly TerminalCommand[] = [
    { name: 'cd', aliases: ['go'], usage: 'cd <分頁>', text: '切分頁；直接打分頁名稱、中文或數字也可以' },
    { name: 'dev', aliases: ['device', 'd'], usage: 'dev <id、email、暱稱> [-f]', text: '找裝置；-f 只看凍結的' },
    { name: 'fb', aliases: ['feedback'], usage: 'fb [pending|bug|idea|no|all]', text: '看回報，預設待審' },
    { name: 'triage', aliases: ['t'], usage: 'triage', text: '開快速審核' },
    { name: 'api', aliases: [], usage: 'api [關鍵字]', text: '開 API 控制台並搜尋' },
    { name: 'r', aliases: ['refresh'], usage: 'r', text: '更新側欄的待辦數字' },
    { name: 'reload', aliases: [], usage: 'reload', text: '重新載入這一頁' },
    { name: 'theme', aliases: [], usage: 'theme [dark|light]', text: '切換深淺色' },
    { name: 'side', aliases: ['sidebar'], usage: 'side', text: '收合／展開側欄' },
    { name: 'clear', aliases: [], usage: 'clear', text: '清掉輸出' },
    { name: 'help', aliases: ['?'], usage: 'help', text: '列出全部指令' },
    { name: 'logout', aliases: [], usage: 'logout', text: '登出' }
];

/** fb 後面可以接的字：短的好打，也收後端的原名 */
const FEEDBACK_FILTERS: Readonly<Record<string, FeedbackFilter>> = {
    pending: 'pending',
    bug: 'accepted_bug',
    accepted_bug: 'accepted_bug',
    idea: 'accepted_suggestion',
    suggestion: 'accepted_suggestion',
    accepted_suggestion: 'accepted_suggestion',
    no: 'rejected',
    rejected: 'rejected',
    all: 'all'
};

const FEEDBACK_ARGS = ['pending', 'bug', 'idea', 'no', 'all'];
const FEEDBACK_ARG_LABELS: Readonly<Record<string, string>> = {
    pending: '待審',
    bug: '採計為 bug',
    idea: '採計為建議',
    no: '不採計',
    all: '全部'
};

const THEME_ARGS = ['dark', 'light'];

function findCommand(word: string) {
    const lower = word.toLowerCase();
    return COMMANDS.find(command => command.name === lower || command.aliases.includes(lower));
}

/** 分頁可以用英文 key、中文名稱或側欄上的數字指定 */
export function findTab(word: string, tabs: readonly TerminalTab[]): TerminalTab | undefined {
    const lower = word.toLowerCase();
    const index = Number(lower);
    if (Number.isInteger(index) && index >= 1 && index <= tabs.length) return tabs[index - 1];
    return tabs.find(tab => tab.key === lower || tab.label.toLowerCase() === lower);
}

export function parseCommand(input: string, tabs: readonly TerminalTab[]): TerminalAction {
    const line = input.trim();
    if (!line) return { kind: 'none' };
    const [head, ...rest] = line.split(/\s+/);
    const arg = rest.join(' ');
    const command = findCommand(head);

    // 沒有這個指令、但剛好是分頁的名字：當成 cd
    if (!command) {
        const tab = findTab(line, tabs);
        if (tab) return { kind: 'tab', tab: tab.key };
        return { kind: 'error', message: `沒有「${head}」這個指令，打 help 看全部` };
    }

    switch (command.name) {
        case 'cd': {
            if (!arg) return { kind: 'tab', tab: 'overview' };
            const tab = findTab(arg, tabs);
            return tab ? { kind: 'tab', tab: tab.key } : { kind: 'error', message: `沒有「${arg}」這個分頁` };
        }
        case 'dev': {
            const frozen = rest.includes('-f');
            const query = rest.filter(word => word !== '-f').join(' ');
            const deviceStatus: DeviceStatus | undefined = frozen ? 'frozen' : undefined;
            const note = [query && `搜尋「${query}」`, frozen && '只看凍結的'].filter(Boolean).join('，');
            return { kind: 'tab', tab: 'devices', preset: { deviceQuery: query, deviceStatus }, note };
        }
        case 'fb': {
            const status = arg ? FEEDBACK_FILTERS[arg.toLowerCase()] : 'pending';
            if (!status) return { kind: 'error', message: `fb 後面只能接 ${FEEDBACK_ARGS.join('、')}` };
            return { kind: 'tab', tab: 'feedback', preset: { feedbackStatus: status } };
        }
        case 'triage':
            return { kind: 'tab', tab: 'feedback', preset: { feedbackStatus: 'pending', feedbackTriage: true }, note: '開快速審核' };
        case 'api':
            return { kind: 'tab', tab: 'api', preset: { apiQuery: arg }, note: arg ? `搜尋「${arg}」` : undefined };
        case 'r':
            return { kind: 'refresh' };
        case 'reload':
            return { kind: 'reload' };
        case 'theme': {
            if (!arg) return { kind: 'theme', mode: 'toggle' };
            const mode = arg.toLowerCase();
            if (mode === 'dark' || mode === 'light') return { kind: 'theme', mode };
            return { kind: 'error', message: 'theme 後面只能接 dark 或 light' };
        }
        case 'side':
            return { kind: 'sidebar' };
        case 'clear':
            return { kind: 'clear' };
        case 'help':
            return { kind: 'help' };
        default:
            return { kind: 'logout' };
    }
}

export interface Suggestion {
    /** 選了之後輸入框變成這樣 */
    value: string;
    /** 清單上的說明 */
    text: string;
}

/** 輸入到一半時的建議：還在打指令就列指令與分頁，打了空白就列那個指令能接的字 */
export function suggest(input: string, tabs: readonly TerminalTab[]): Suggestion[] {
    const line = input.replace(/^\s+/, '');
    const space = line.indexOf(' ');

    if (space === -1) {
        const lower = line.toLowerCase();
        const commands = COMMANDS
            .filter(command => [command.name, ...command.aliases].some(name => name.startsWith(lower)))
            .map(command => ({ value: command.name, text: `${command.text}（${command.usage}）` }));
        const tabMatches = tabs
            .filter(tab => lower && (tab.key.startsWith(lower) || tab.label.startsWith(line)))
            .map(tab => ({ value: tab.key, text: `切到「${tab.label}」` }));
        return [...commands, ...tabMatches];
    }

    const command = findCommand(line.slice(0, space));
    const argPrefix = line.slice(space + 1).toLowerCase();
    const withArgs = (args: readonly { word: string; text: string }[]) => args
        .filter(({ word }) => word.startsWith(argPrefix))
        .map(({ word, text }) => ({ value: `${command!.name} ${word}`, text }));

    if (command?.name === 'cd') return withArgs(tabs.map(tab => ({ word: tab.key, text: tab.label })));
    if (command?.name === 'fb') return withArgs(FEEDBACK_ARGS.map(word => ({ word, text: FEEDBACK_ARG_LABELS[word] })));
    if (command?.name === 'theme') return withArgs(THEME_ARGS.map(word => ({ word, text: word === 'dark' ? '深色' : '淺色' })));
    return [];
}

/** 共同的開頭：Tab 補完時先補到大家一樣的地方，跟 shell 一樣 */
export function commonPrefix(values: readonly string[]): string {
    if (!values.length) return '';
    let prefix = values[0];
    for (const value of values.slice(1)) {
        while (!value.startsWith(prefix)) prefix = prefix.slice(0, -1);
    }
    return prefix;
}
