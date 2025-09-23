---
title: Day19 - plus markdown
author: Opshell
createdAt: '2024-09-20'
categories:
  - vitepress-thirty-days
tags:
  - 鐵人賽
  - VitePress
  - markdown-it
editLink: true
isPublished: true
refer:
  - 'https://gzcloudhome.cn/posts/write-markdown-it-plugin-to-customize-syntax/'
  - 'https://juejin.cn/post/7055597191150174238'
  - 'https://www.widcard.win/blog/posts/write-plugins/write-mdit-plugin/'
image: ''
description: ''
keywords: ''
---
![banner19](https://ithelp.ithome.com.tw/upload/images/20240920/20109918DGF72pEmBN.png)

昨天設定了 `VitePress` 集成的 `markdown-it` 套件功能，今天不出意外的就是要安裝其他的套件來水一天，但是不出意外的出意外了，除了 todo-list 的 checkbox 以外，好像也沒什麼其他想裝的了。

那就來選型吧!!

- [markdown-it-checkbox](https://www.npmjs.com/package/markdown-it-checkbox)
- [markdown-it-task-lists](https://www.npmjs.com/package/@hackmd/markdown-it-task-lists)
- [markdown-it-task-checkbox](https://github.com/linsir/markdown-it-task-checkbox)

這些都是利用基本的 checkbox 來做的，大家都知道原生 HTML 的外觀，不能說難看，只是就... 膩了? 看來看去完全沒有一個套件是 Opshell 滿意的，乾脆來自己擴充 `markdowm-it` 好了。

## 需求確認
開始動工之前，確認好需求是最重要的，免得無限的做白工 ~~(隕石開發除外)~~ ：
[x] 用常見的 [ ] [x] 來表示
[x] 可以用 checkbox 勾選 ~~(廢話)~~
[x] 可以客製喜歡的外觀
[x] 可以把相鄰的 checkbox 用 div 包起來

## markdown-it 原理
既然要擴展 `markdown-it` 的功能，我們就得了解他的運作原理([markdown-it design principles](https://github.com/markdown-it/markdown-it/blob/master/docs/architecture.md))，主要分成兩個部分：

### 核心組成
- #### Parsing
> `parser` 將 `markdown` 所有的內容解析成一個個 Token Object 然後包成一個 Array。

- #### Rendering
> 遍歷 Token Array 把每個 Token 轉化為對應的 HTML String，最後組裝起來成爲最後的輸出。

### Token
`markdown-it` 的一切都是基於 Token 展開的，而這邊的 Token 指的其實不是一般"票劵"或"憑證"的意思，而是 `markdown` 解析後格式的稱呼。

`Markdown` 文件中，主要會解析出兩個類型的 Token：
- #### block Token (塊狀元素)
> 以行為最小單位，段落、列表、程式碼空間等多行文字組成的內容。

- #### inline Token (行內元素)
> 以字原為最小單位，標題、粗體、code 標示等。

一般的 Token 解析完會像這樣這樣

```ts
Token {
  type: 'task_list_item_open', // token 名稱
  tags: 'label', // HTML 標簽名
  attrs: [ [ 'class', 'task-list--item' ] ], // [key, value][]
  map: null, // 源映射，如：[ line_begin, line_end ]
  nesting: 1, // (1, 0, -1) 1 => 標籤起始, 0 => 自閉標籤， -1 => 標籤結束
  level: 0, // 套牽層數
  children: null, // 子節點陣列，內聯和圖片Token 也會放在這裡
  content: '', // 內容，如果是自閉標籤，內容也會放在這裡。
  markup: '', // 標記字元，如：範圍塊字元
  info: '', // 範圍塊裡面的字元，如：程式碼區塊內的程式碼
  meta: null, // 存任意資料的地方，主要是給套件的擴充用
  block: true, // true: 塊狀元素, false: 行內元素
  hidden: false // 渲染時是否忽視這個 Token
}
```

### Parsing
在 `markdown-it` 中，有各種 `parsing` 規則，每個規則都會把相符條件的 `Markdown` 轉換成 Token，轉換會先從 `block(塊狀元素)` 轉換完再轉換一次 `inline(行內元素)`。

- #### Block Token
前面提到，block 是以行為最小單位，也就是說起始行符合條件後會一路包含到符合條件的結束行來生成 `Block Token` ，規則由 `md.block.ruler` 控制。

::: tip
生成的 Token 不一定是單個 Token，例如一個段落的 block 會生成三個 Token：

如：
```md
這是一個*段落*!!
```
會解析成三個 Token

```md
paragraph_open
inline
paragraph_close
```
:::

- #### Inline Token
等整個 `Markdown` 解析完之後，會把剛剛解出來的 Array 中 `token type` 為 inline 的 Token 在用 inline 規則解析一遍，規則由 `md.inline.ruler` 控制。

所以剛剛解出來的 Token 再解一次就會變成：
```md
paragraph_open
inline
    text
    em_open
    text
    em_close
    text
paragraph_close
```

### Rendering
`markdown-it` 有預先定義好的 `render` 規則(在 md.renderer.rules)，每個規則都是一個函數，輸入是 Token，輸出是 HTML string。

在遍歷各個 Token 的過程中，對每個 Token，都會查看一下是否有和 `Token.type` 同名的 `render` 規則。

如果有，則把 Token 丟進去轉換，得到該 Token 的 HTML string。

接續上面的例子：

```md
paragraph_open         =>  <p>
inline
    text               =>  這是一個
    em_open            =>  <em>
    text               =>  段落
    em_close           =>  </em>
    text               =>  !!
paragraph_close        =>  </p>
```

最後的輸出會是：
```HTML
<p>這是一個<em>段落</em>!!</p>
```

## 功能擴充
了解原理之後，就來正式的寫擴充吧， `VitePress` 集成以外的 `Markdown` 套件或擴充都會在 `markdown.config` 裡面做處理：

### Parsing
```ts
export default defineConfig({
    markdown: {
        config: (md) => {
            // 在 blockquote 規則前面添加 taskList 規則，透過 function 來解析
            // alt 是這個規則可以打斷的 其他規則，一般不做特別的處理，這裡是直接把 blockquote 的 alt 拿來用。
            md.block.ruler.before('blockquote', 'taskList', function (state, startLine, endLine, silent) {
                const start: number = state.bMarks[startLine] + state.tShift[startLine]; // 行的開始位置
                const max: number = state.eMarks[startLine]; // 行的結束位置

                // 不符合基本規則的直接跳出
                if (state.src.charCodeAt(start) !== 0x5B) /* [ */
                    return false;
                if (state.src.charCodeAt(start + 2) !== 0x5D) /* ] */
                    return false;

                const content = state.src.substring(start, max); // 取出整段文字
                const reg = /\[(\s|x)\]/;
                const match = content.match(reg);

                if (match && match.length) {
                    let token;
                    const checked = match[1] === 'x';

                    if (silent) { // 解析異常時不做反應
                        return true;
                    }

                    token = state.push('task_list_item_open', 'label', 1);
                    token.attrs = [['class', 'task-list-item']];
                    token.map = [ startLine, state.line ];

                    token = state.push('inline', '', 0);
                    token.content = `
                        <input class="task-list-input" type="checkbox" ${checked ? 'checked' : ''} />
                        <span class="task-list-text">${content.replace(reg, '')}</span>
                    `;
                    token.map = [ startLine, state.line ];
                    token.children = [];

                    token = state.push('task_list_item_close', 'label', -1);
                }

                state.line = startLine + 1;
                return true;
            }, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });
        }
    }
});
```

這樣就為把 `[ ]` 或者是 `[x]` 解析成 class 是 task-list-item 的 `label` 包起來的 `input:checkbox` 組。
但是這樣並不會把相鄰的 checkbox 用 div 包起來阿?!

別急，解析規則做完之後，我們可以用渲染規則把剩下的需求補完。
```ts
export default defineConfig({
    markdown: {
        config: (md) => {
            md.block.ruler.before(......);

            md.renderer.rules.task_list_item_open = (tokens, idx, options, env, slf) => { // [!code ++]
                return tokens[idx - 1].type !== 'task_list_item_close'  // [!code ++]
                    ? `<div class="task-list"><label class="task-list-item">`  // [!code ++]
                    : `<label class="task-list-item">`;  // [!code ++]
            };  // [!code ++]
            md.renderer.rules.task_list_item_close = (tokens, idx, options, env, slf) => {  // [!code ++]
                return tokens[idx + 1].type !== 'task_list_item_open' ? '</label></div>' : '</label>';  // [!code ++]
            };  // [!code ++]
        }
    }
});
```
把 `Token.type` 的規則做一個補充，把第一個 `task_list_item_open` 前面加 `<div>` 最後一個 `task_list_item_close` 後面加 `</div>`，這樣就完美的達成我們的需求囉：

<div class="in-out-demo-block">

#### Input：{.brand}
````md
[ ] 我還沒被選取
[x] 我被選了
````

#### Output：{.brand}
[ ] 我還沒被選取
[x] 我被選了
</div>

## 小結
咦奇怪，你說為什麼你寫出來樣式長的跟我不一樣?
當然是因為 Opshell 沒有把 style 丟出來囉，

我的 `style` 嗎？想要的話就給你吧，去找吧！我把世界上的一切都放在那裡！

## 拉夫德爾
```scss
.vp-doc {
    .task-list {
        @include setFlex(flex-start, flex-start, 10px, column);
        margin: 10px 0;
        &--item {
            position: relative;
            @include setFlex(flex-start, center, 20px);
            cursor: pointer;

            &:hover {
                .task-list {
                    &--input::before { border-color: var(--vp-c-brand-3); }
                    &--text { color: var(--vp-c-brand-3); }
                }
            }
        }

        &--input {
            position: relative;
            box-sizing: border-box;
            margin-left: 10px;
            @include setSize(0, 0);
            cursor: pointer;

            &::before,
            &::after {
                content: '';
                position: absolute;
                background: transparent;
                box-sizing: border-box;
                @include setSize(0, 0);
            }

            &::before {
                @include setSize(20px, 20px);
                border: 2px solid var(--vp-c-text-2);
                border-radius: 3px;
                transform: translate3d(-50%, -50%, 0);
                transition: border-color 0.15s $cubic-FiSo, background-color 0.15s $cubic-FiSo 0.05s;
            }
            &::after {
                border-top: none;
                border-right: none;
                border-width: 0;
                border-radius: 1px;
                transform: rotateZ(-45deg) translate3d(0, -120%, 0);
            }

            &:checked {
                &::before {
                    background-color: var(--vp-c-brand-1);
                    border-color: var(--vp-c-brand-2);
                }
                &::after {
                    @include setSize(20px, 10px);
                    border: 3px solid #eee;
                    border-top: none;
                    border-right: none;
                    transition: border-color 0.15s $cubic-FiSo,
                                height 0.05s $cubic-FiSo,
                                width 0.1s $cubic-FiSo 0.04s;
                    filter: drop-shadow(0 0 3px rgba(0, 0, 0, 100%));
                }
            }
        }

        &--text {
            transform: translate(0, 2px);
            transition: .2s $cubic-FiSo;
        }
    }
}
```
