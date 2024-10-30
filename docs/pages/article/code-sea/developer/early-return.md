```ts
let shouldDeleteFlag = false;

if (relayData.value[index].surgery_id !== 0) {
    await proxy.$notify('warning', '警告！', '確定要刪除嗎？', 0, true).then(async (flag) => {
        if (!flag) { return; }

        await sendRequest(`/api/surgery/clinic/${surgeryId.value}`, 'DELETE').then((res) => {
            // [-]狀態通知
            const nmotifyType = res?.status ? 'success' : 'error';
            const notifyData = {
                duration: res?.status ? 2000 : 0,
                showClose: !res?.status
            };

            proxy.$notify(nmotifyType, '結果！', res?.msg, notifyData.duration, notifyData.showClose);

            if (!res?.status) { return false; }

            shouldDeleteFlag = true;
        }).catch((err) => {
            console.error('Self Error：', err);

            proxy.$notify('error', '結果！', '未知錯誤!!', 3000);
        });
    });
} else {
    shouldDeleteFlag = true;
}

console.log('shouldDeleteFlag：', shouldDeleteFlag);
if (shouldDeleteFlag) {
    console.log('deleteOrCancelHandel -> index', index);
    relayData.value.splice(index, 1);

    nextTick(() => {
        console.log('update');
        swiperInstance.value?.update();
    });
}

outpatientSurgeryModel.value = 'view';
```

``` ts
if (relayData.value[index].surgery_id !== 0) {
    const confirmed = await proxy.$notify('warning', '警告！', '確定要刪除嗎？', 0, true);
    if (!confirmed) return;

    try {
        const res = await sendRequest(`/api/surgery/clinic/${surgeryId.value}`, 'DELETE');
        const notifyType = res?.status ? 'success' : 'error';
        const notifyData = {
            duration: res?.status ? 2000 : 0,
            showClose: !res?.status
        };

        proxy.$notify(notifyType, '結果！', res?.msg, notifyData.duration, notifyData.showClose);

        if (!res?.status) return;
    } catch (err) {
        console.error('Self Error：', err);
        proxy.$notify('error', '結果！', '未知錯誤!!', 3000);
        return;
    }
}

relayData.value.splice(index, 1);
nextTick(() => swiperInstance.value?.update());
outpatientSurgeryModel.value = 'view';
```
