3.2開始就有這個東西能用

v-memo讓你指定哪些值需要被監聽，有變動才去整個重新渲染

v-for="item in list" :key="item.id" v-memo="[item.status === active]"

你如果沒有這麼做，會導致v-for的結構每次都重新創建vnode

同時如果你的v-for本身有包入子組件，他也可以避免不必要更新

就是memo裡面沒有指定的那些值通通pass
