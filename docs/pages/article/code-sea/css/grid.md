[動畫 CSS 網格](https://css-tricks.com/animating-css-grid-how-to-examples/)
Animating CSS Grid (How To + Examples)

grid fr 造成的 子元素使用 width: 100%

在 CSS Grid 佈局中，使用 fr 分配的列寬，會導致子元素設置 width: 100% 時的行為與預期不同，產生 子元素無法限制區塊大小 bug。

```vue
``

並提供幾種解決方法。

原因：

fr 單位的含義：  fr 是一個比例單位，表示網格容器中可用空間的比例。例如，grid-template-columns: 1fr 2fr; 表示將容器的寬度分為 3 份，第一列佔 1 份，第二列佔 2 份。

可用空間：  "可用空間" 是指在網格容器扣除了固定寬度 (例如 px、em 值) 和間距 (gap) 之後剩餘的空間。

width: 100% 的參照：  當子元素設置 width: 100% 時，它的寬度是相對於其 包含塊 (containing block) 的寬度計算的。在 grid 佈局中，子元素的包含塊是 grid 單元格 (grid cell)。

問題所在：

如果 grid 列的寬度是使用 fr 單位定義的，那麼 grid 單元格的寬度是根據 可用空間 的比例來計算的，而不是整個 grid 容器的寬度。
當子元素設置 width: 100% 時，它會嘗試佔據 grid 單元格的全部寬度，而這個寬度可能已經被 fr 單位限制了。
如果子元素的內容超出了 grid 單元格的寬度，width: 100% 並不會阻止內容溢出，因為子元素的寬度已經被限制在 grid 單元格的範圍內。

.info-box {
    display: grid;
    grid-template-areas: "datepicker schoolpicker meal-provider grade-setting status";
    grid-template-columns: var(--col1, 0) var(--col2, 0) var(--col3, 0) var(--col4, 0) minmax(0, 1fr);
    grid-auto-rows: 1fr;
    @include setSize(100%, calc(100% - 63px));
    transition: .25s $cubic-FiSo;

    &.datepicker {
        --col1: 440px;
        --col2: 0;
        .meal-date-setting-block {
            transform: translate3d(0, 0, 0);
        }
    }
    &.schoolpicker {
        --col1: 0;
        --col2: 440px;
        .school-picker-block {
            transform: translate3d(0, 0, 0);
        }
    }
    &.meal-provider {
        --col3: 50%;
        .meal-provider-setting-block {
            transform: translate3d(0, 0, 0);
        }
    }
    &.grade-setting {
        --col3: 50%;
        --col4: 50%;
        .meal-provider-setting-block,
        .grade-setting-block {
            transform: translate3d(0, 0, 0);
        }
    }
}
