---
title: 'Enum 使用實例 Part.2'
author: 'Opshell'
createdAt: '2024/08/10'
categories:
  - 使用實例
tags:
  - typescript
  - composable
editLink: true
isPublished: false
---

優雅的 TS 策略模式 處理 number-precision 精度

```ts
import { round, strip } from 'number-precision';

type RoundingStrategy = 'floor' | 'round';

export const useNumberPrecision =  (defaultPrecision: number = 2) => {
    // 數值處理策略
    const precisionStrategics = {
        floor: (value: number, precision: number) => strip(value, precision),
        round: (value: number, precision: number) => round(value, precision)
    } as const;

    /**
     * 通用的數值處理函式
     * @param value 要處理的數值
     * @param strategy 捨入策略
     * @param precision 小數位數
     */
    const numberPrecisionHandler = (
        value: number | undefined | string,
        strategy: RoundingStrategy = 'floor',
        precision = defaultPrecision
    ): number => {
        // 處理各種輸入情況
        const numValue = typeof value === 'string' ? Number(value) : value;
        if (numValue === undefined || isNaN(numValue)) return 0;

        return precisionStrategies[strategy](numValue, precision);
    }

    const floorHandler (value: numbber | undefined | string) => numberPrecisionHandler(value, 'floor');

    const roundHandler (value: numbber | undefined | string) => numberPrecisionHandler(value, 'round');

    return {
        numberPrecisionHandler,
        floorHandler,
        roundHandler
    }
}

```

弄成directive也可以就是了

指定位數
const { handleFloor: parseSomeEventTo4 } = createPrecisionHandler(4);
const { handleFloor: parseSomeEventTo6 } = createPrecisionHandler(6);
