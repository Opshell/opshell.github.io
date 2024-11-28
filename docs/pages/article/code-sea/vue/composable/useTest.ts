import { useGlobalProperties } from '@/hooks/opshellLibary';
import piniaStore from '@/store';

import { useRouter } from 'vue-router';

const elStatusStore = piniaStore.useElStatusStore;

export function useTest() {
    const app = inject('app');
    const proxy = useGlobalProperties();

    const router = useRouter();

    const { elStatusState } = storeToRefs(elStatusStore);

    function doTest() {
        console.log(elStatusState.value.isLoading);

        if (!elStatusState.value.isLoading) {
            elStatusStore.startLoading();
            console.log('startLoading =>', elStatusState.value.isLoading);
            proxy.$notify('error', '登入憑證錯誤', '您可能閒置太久了，<br/>請試試看重新登入！', 3500);
        } else {
            elStatusStore.endLoading();
        }

        // router.push({ path: '/develop/clear-test-page' });
    }

    return {
        doTest
    };
}
