---
title:  'Day19 - markdown-it-footnote'
author: 'Opshell'
createdAt: '2024/09/19'
categories: 'vitepress-thirty-days'
tags:
  - 鐵人賽
  - VitePress
editLink: true
isPublished: false
---

昨天設定了 `VitePress` 集成的 `markdown-it` 套件功能，今天不出意外的就是要安裝其他的套件來水一天，但是不出意外的出意外了，除了 todo-list 的 checkbox 以外，好像也沒什麼其他想裝的了。

那就來選型吧!!

- [markdown-it-checkbox](https://www.npmjs.com/package/markdown-it-checkbox)
- [markdown-it-task-lists](https://www.npmjs.com/package/@hackmd/markdown-it-task-lists)
- [markdown-it-task-checkbox](https://github.com/linsir/markdown-it-task-checkbox)

這些都是利用基本的 checkbox 來做的，大家都知道原生 HTML 的外觀，不能說難看，只是就... 膩了? 看來看去完全沒有一個套件是 Opshell 滿意的，乾脆來自己擴充 `markdowm-it` 好了。

## 需求確認
開始動工之前，確認好需求是最重要的，免得無限得做白工 ~~(隕石開發除外)~~ ：
#### 1. 用常見的 [ ] [x] 來表示
#### 2. 可以用 checkbox 勾選 ~~(廢話)~~
#### 3. 可以客製喜歡的外觀
#### 4. 可以把相鄰的 checkbox 用 div 包起來

## markdown 原理
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

### Parsing
在 `markdown-it` 中，有各種 `parsing` 規則，每個規則都會把相符條件的 `Markdown` 轉換成 Token，轉換會先從 `block(塊狀元素)` 轉換完再轉換一次 `inline(行內元素)`。

- #### Block Token
前面提到，block 是以行為最小單位，也就是說起始行符合條件後會一路包含到符合條件的結束行來生成 `Block Token` ，規則由 `md.block.ruler` 控制。

::: tip
生成的 Token 不一定是單個 Token，例如一個段落的 block 會生成三個 Token：

如：
```md
這是一個*段落*
```
會解析成

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

按照上面的敘述，block Token 可能會在解析出 inline Token。

https://gzcloudhome.cn/posts/write-markdown-it-plugin-to-customize-syntax/
https://gzcloudhome.cn/posts/write-markdown-it-plugin-to-customize-syntax/

<!-- https://mdit-plugins.github.io/zh/ -->

[添加 markdown 任务插件](https://bddxg.top/article/note/vitepress%E4%BC%98%E5%8C%96/%E6%B7%BB%E5%8A%A0markdown%E4%BB%BB%E5%8A%A1%E6%8F%92%E4%BB%B6.html)
[markdown-it-task-lists](https://www.npmjs.com/package/@hackmd/markdown-it-task-lists)
yarn add markdown-it-task-checkbox -D

  [ ] test
  [x] check

[vitepress添加脚注插件](https://blog.csdn.net/ashtyukjhf/article/details/129657613)
@types/markdown-it-footnote

https://github.com/markdown-it/markdown-it-abbr

https://github.com/takumisoft68/vscode-markdown-table

https://wenku.csdn.net/answer/1eexc2yy58?ydreferer=aHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS8%3D
https://blog.csdn.net/qq_41656373/article/details/121672231
https://blog.csdn.net/qq_45138936/article/details/105453817

[ ] group2
[x] test
[ ] good
https://gzcloudhome.cn/posts/write-markdown-it-plugin-to-customize-syntax/
https://juejin.cn/post/7055597191150174238

https://juejin.cn/post/7055597191150174238

```ts
                // regex for task list item = "/\[(\s|x)\]/"
                // 匹配正則 []

                if (!content.match(/^\s*-\s*\[\s\]/)) {
                    return false;
                }

                // line should be at least 3 chars - "[x]"
                if (start + 2 > max)
                    return false;

                // 開頭不是 [

                // 不是 [x] 或 [ ]
                if (state.src.charCodeAt(start + 1) !== 0x20 && state.src.charCodeAt(start + 1) !== 0x78)
                    return false;
                // 結尾不是 ]
                if (state.src.charCodeAt(start + 2) !== 0x5D/* ] */)
                    return false;

                let pos;

                for (pos = start + 2; pos < max; pos++) {
                    if (state.src.charCodeAt(pos) === 0x20)
                        return false;
                    if (state.src.charCodeAt(pos) === 0x5D /* ] */) {
                        break;
                    }
                }

                if (pos === start + 2)
                    return false; // no empty footnote labels
                if (pos + 1 >= max || state.src.charCodeAt(++pos) !== 0x3A /* : */)
                    return false;
                if (silent)
                    return true;
                pos++;

                if (!state.env.footnotes)
                    state.env.footnotes = {};
                if (!state.env.footnotes.refs)
                    state.env.footnotes.refs = {};
                const label = state.src.slice(start + 2, pos - 2);
                state.env.footnotes.refs[`:${label}`] = -1;

                const token_fref_o = new state.Token('footnote_reference_open', '', 1);
                token_fref_o.meta = { label };
                token_fref_o.level = state.level++;
                state.tokens.push(token_fref_o);

                const oldBMark = state.bMarks[startLine];
                const oldTShift = state.tShift[startLine];
                const oldSCount = state.sCount[startLine];
                const oldParentType = state.parentType;

                const posAfterColon = pos;
                const initial = state.sCount[startLine] + pos - (state.bMarks[startLine] + state.tShift[startLine]);
                let offset = initial;

                while (pos < max) {
                    const ch = state.src.charCodeAt(pos);

                    if (isSpace(ch)) {
                        if (ch === 0x09) {
                            offset += 4 - offset % 4;
                        } else {
                            offset++;
                        }
                    } else {
                        break;
                    }

                    pos++;
                }

                state.tShift[startLine] = pos - posAfterColon;
                state.sCount[startLine] = offset - initial;

                state.bMarks[startLine] = posAfterColon;
                state.blkIndent += 4;
                state.parentType = 'footnote';

                if (state.sCount[startLine] < state.blkIndent) {
                    state.sCount[startLine] += state.blkIndent;
                }

                state.md.block.tokenize(state, startLine, endLine, true);

                state.parentType = oldParentType;
                state.blkIndent -= 4;
                state.tShift[startLine] = oldTShift;
                state.sCount[startLine] = oldSCount;
                state.bMarks[startLine] = oldBMark;

                const token_fref_c = new state.Token('footnote_reference_close', '', -1);
                token_fref_c.level = --state.level;
                state.tokens.push(token_fref_c);

                return true;
```
