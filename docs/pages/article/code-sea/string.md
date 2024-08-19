除了使用 split 方法以外，還有其他幾種方法可以去除 .md 副檔名。以下是幾種常見的方法：
const path = `${startPathName}/${fileName.split('.md')[0]}`;

使用 replace 方法：
const path = `${startPathName}/${fileName.replace('.md', '')}`;

使用 substring 方法：
const path = `${startPathName}/${fileName.substring(0, fileName.length - 3)}`;

使用 slice 方法：
const path = `${startPathName}/${fileName.slice(0, -3)}`;

使用 path 模組（Node.js 環境下）：
const path = `${startPathName}/${path.basename(fileName, '.md')}`;

效能比較
在效能方面，這些方法的差異通常是微不足道的，除非在非常高的執行頻率下才會顯現出來。一般來說，replace 方法和 slice 方法會稍微快一些，因為它們不需要額外的字串操作。

綜合考量
考慮到可讀性和效能，推薦使用 replace 方法，因為它簡潔且易於理解：
const path = `${startPathName}/${fileName.replace('.md', '')}`;

這樣的寫法既直觀又高效，適合大多數情況下使用。
