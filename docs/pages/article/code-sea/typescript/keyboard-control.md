```ts
// 鍵盤事件綁定
enum Key {
    LEFT = 'ArrowLeft',
    RIGHT = 'ArrowRight'
}
enum Code {
    Q = 'KeyQ'
}

function selectorClickHandler(selector: string) {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
        element.click();
    }
}

function leftHandler() {
    selectorClickHandler('.pager-link.prev');
}
function rightHandler() {
    selectorClickHandler('.pager-link.next');
}
function qHandler() {
    selectorClickHandler('.DocSearch.DocSearch-Button');
}

const keyStrategies: { [key in Key]: () => void } = {
    [Key.LEFT]: leftHandler,
    [Key.RIGHT]: rightHandler
};
const codeStrategies: { [key in Code]: () => void } = {
    [Code.Q]: qHandler
};

function keyDownHandler(event: KeyboardEvent) {
    const key = event.key as Key;
    if (key in keyStrategies) {
        keyStrategies[key]();
    }

    const Code = event.code as Code;
    if (Code in codeStrategies) {
        codeStrategies[Code]();
    }
}

onMounted(() => {
    window.addEventListener('keydown', keyDownHandler);
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', keyDownHandler);
});
```
