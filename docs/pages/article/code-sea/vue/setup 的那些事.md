https://ithelp.ithome.com.tw/articles/10304992

1. await 遇到問題
sendRequest(`/api/present_pat/simpledata/${patientId}`).then((res) => {
    if (!res?.status) { throw new Error('取得病患資料錯誤!'); }

    patientStore.updatePatient(res.data);
}).catch((error) => {
    console.error('取得病患資料錯誤', error);
    router.push({ name: 'PatientList' });
});
