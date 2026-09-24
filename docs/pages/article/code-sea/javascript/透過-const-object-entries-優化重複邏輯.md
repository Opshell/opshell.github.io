---
title: 透過 const + Object.entries 優化重複邏輯
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2025-05-19'
categories:
  - 未分類
tags:
  - null
editLink: true
isPublished: false
---
#
```
function getOptionsHandler(changer: 'class' | 'county' | 'area') {
        if (departmentClassId.value === 0) {
            cityList.value = [];
            townshipList.value = [];
            unitList.value = [];
            return;
        }

        if (changer === 'class') {
            getOptions({
                departmentClassId: departmentClassId.value
            }).then((res) => {
                setFieldValue('countyId', 0); // 縣市重置
                setFieldValue('areaId', 0); // 區重置
                setFieldValue('departmentIds', []); // 單位重置

                cityList.value = res.place;
                townshipList.value = [];
                unitList.value = [];
            });
        }

        if (changer === 'county') {
            getOptions({
                departmentClassId: departmentClassId.value,
                countyId: countyId.value
            }).then((res) => {
                setFieldValue('areaId', 0); // 區重置
                setFieldValue('departmentIds', res.department.map((item: giOptionItem) => {
                    return item.id;
                }));

                townshipList.value = res.place;
                unitList.value = res.department;
            });
        }

        if (changer === 'area') {
            getOptions({
                departmentClassId: departmentClassId.value,
                countyId: countyId.value,
                areaId: areaId.value
            }).then((res) => {
                setFieldValue('departmentIds', res.department.map((item: giOptionItem) => {
                    return item.id;
                }));

                unitList.value = res.department;
            });
        }
    };
    getOptionsHandler('class');
```

``` vue-ts
const CENTRAL_KITCHEN_CLASS_ID = 3;

    interface GetOptionsResponse {
        place?: any[]
        department?: any[]
    }
    const config = {
        county: {
            params: { departmentClassId: CENTRAL_KITCHEN_CLASS_ID },
            resetFields: { countyId: 0, areaId: 0, departmentId: 0 },
            updateLists: [
                { target: cityList, source: 'place' },
                { target: townshipList, source: [] },
                { target: unitList, source: [] }
            ]
        },
        area: {
            params: { departmentClassId: CENTRAL_KITCHEN_CLASS_ID, countyId: countyId.value },
            resetFields: { areaId: 0, departmentId: 0 },
            updateLists: [
                { target: townshipList, source: 'place' },
                { target: unitList, source: 'department' }
            ]
        },
        department: {
            params: { departmentClassId: CENTRAL_KITCHEN_CLASS_ID, countyId: countyId.value, areaId: areaId.value },
            resetFields: { departmentId: 0 },
            updateLists: [
                { target: unitList, source: 'department' }
            ]
        }
    };

    type tOptionKey = 'date' | 'countyId' | 'areaId' | 'departmentId';

    function getOptionsHandler(changer: 'county' | 'area' | 'department') {
        const { params, resetFields, updateLists } = config[changer];

        getOptions(params)
            .then((res: GetOptionsResponse) => {
                console.log('getOptions', res);

                // 重置欄位
                Object.entries(resetFields).forEach(([key, value]) => setFieldValue(key as tOptionKey, value));

                // 更新列表
                updateLists.forEach(({ target, source }) => {
                    target.value = typeof source === 'string' ? (res[source] ?? []) : source;
                });
            })
            .catch((error) => {
                console.error(`Failed to fetch options for ${changer}:`, error);
                Object.entries(resetFields).forEach(([key, value]) => setFieldValue(key as tOptionKey, value));
                updateLists.forEach(({ target }) => {
                    target.value = [];
                });
            });
    }
    getOptionsHandler('county');
```
