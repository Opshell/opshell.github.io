type Key = string;
// type Code = string;
type KeyCombination = string;

interface KeyBoardControlConfig {
    [key: string]: () => void
}

const keyStrategies: { [key in Key]: () => void } = {};
// const codeStrategies: { [key in Code]: () => void } = {};
const combinationStrategies: { [key in KeyCombination]: () => void } = {};

function keyDownHandler(event: KeyboardEvent, showKey: boolean) {
    const key = event.key;
    if (key in keyStrategies) {
        keyStrategies[key]();
    }

    // const code = event.code;
    // if (code in codeStrategies) {
    //     codeStrategies[code]();
    // }

    const combination = `${event.ctrlKey ? 'Ctrl+' : ''}${event.shiftKey ? 'Shift+' : ''}${event.altKey ? 'Alt+' : ''}${key}`;
    if (combination in combinationStrategies) {
        combinationStrategies[combination]();
    }

    if (showKey) {
        console.log('key：', key);
        // console.log('code：', code);
        console.log('combination：', combination);
    }
}

/**
 * 註冊鍵盤控制的自定義鉤子函數。
 * @param config - 鍵盤控制配置物件，其中鍵可以是單一鍵、組合鍵或鍵碼，值是按下該鍵時要執行的函數。
 *
 * @example
 * ```typescript
 * import { useKeyBoardControl } from './hooks/useKeyBoardControl';
 *
 * useKeyBoardControl({
 *   'a': () => console.log('按下 a 鍵'),
 *   'Control+s': () => console.log('按下 Control+s 組合鍵'),
 *   'ArrowUp': () => console.log('按下向上箭頭鍵')
 * });
 * ```
 *
 * @remarks
 * 該鉤子函數會在組件掛載時添加鍵盤事件監聽器，並在組件卸載時移除監聽器。
 */
export default (config: KeyBoardControlConfig, showKey: boolean) => {
    for (const key in config) {
        if (key.includes('+')) {
            combinationStrategies[key] = config[key];
        } else if (key.length === 1) {
            keyStrategies[key] = config[key];
        }
        // } else {
        //     codeStrategies[key] = config[key];
        // }
    }

    onMounted(() => {
        window.addEventListener('keydown', event => keyDownHandler(event, showKey));
    });

    onBeforeUnmount(() => {
        window.removeEventListener('keydown', event => keyDownHandler(event, showKey));
    });
};
