除了型別推論
omit、pick、partial、record、exclude、extract等常用的型別處理方法
interface的繼承
泛型
Mapped Types
tsconfig也要能自己看得懂怎麼配

主要是在vue3裡面實踐過多少ts的專案內容

https://pjchender.dev/ironman-2021/ironman-2021-day02/

如果你們有註明用TS，我會加考這個

1. 當專案越來越大，你會如何管理可能導致重複的 types 和 interface ?
2. 試著解釋這六個常用的TS型別處理用法:

* Omit
* Pick
* Partial
* Record
* Exclude
* Extract

3. 請解釋泛型的用途和具體實作方式

其他的還會有如何手動配置 declare 來避免一些套件可能沒有提供 type 的問題



## 型別繼承
```ts
declare global {
    interface giImageData {
        id: number;
        title: string;
        file_name: string;
        size: number;
        file: string;
        type?: number;
        active?: 0 | 1;
        created_at?: string | Date;
    }
}
```