---
title: symbol
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2024-09-13'
categories:
tags:
editLink: true
isPublished: false
---
知道symbol 這東西，但還沒實際用過在專案上過QQ

我通常用在兩個情境：
1. 代替 uuid
2. 建立「私有屬性」

創建獨特value用的，即便你把兩個變數都弄成一樣的symbol，他們之間不會相等

const mySymbol1 = Symbol('xxx')
const mySymbol2 = Symbol('xxx')

console.log(mySymbol1 === mySymbol2);  // false

for...in
Object.keys()
Object.getOwnPropertyNames()

Vue 的話可以用在 inject、provide，防止 key 意外重複
https://vuejs.org/guide/components/provide-inject#working-with-symbol-keys

不過symbol是個不能被序列化的東西，要跨傳資料上json會出問題，只能在當前的執行環境

這個部分是指，如果你有兩個 key，分別為：

const key1 = 'cod';
const key2 = 'cod';

因為 key1 和 key2 值相同，會導致 provide 的內容被蓋掉，所以你可以這樣寫：
const key1 = Symbol();
const key2 = Symbol();

這樣就不會有問題了

如果你的陣列物件本身有symbol，需要讓FOR OF抓得出來，那個symbol就必須在物件裡面先有一個Symbol.iterator

const iterableObj = [
items: ['a', 'b', 'c'],
[Symbol. iterator]() [
let index = 0;
const items = this items;
return (
next() (
if (index < items.length) [
return [ value: items[index++], done: false );
felse f
return & done: true );
Astolfo
2024.9.13 上午 10:31 >
reary
for (const item of iterableObj) (
console.log(item); /輸出"a”,"b","c"

這只是為了讓有SYMBOL的物件可以被迭代作的功夫，基本很少用到
