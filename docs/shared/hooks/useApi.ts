
// import router from '@/router';
// import notifyComponent from '@components/popup/notify.vue';
// import { getFrontMatter } from '@shared/hooks/useFrontMatter';
// import useUserStore from '@store/userStore';
import axios, { AxiosProgressEvent, AxiosRequestConfig, AxiosResponse, Method } from 'axios';
// import { Dialog, QDialog } from 'quasar';

// Mock dependencies for VitePress environment
const router = { push: (path: string) => console.log('Mock router push:', path) };
const useUserStore = () => ({
    getToken: () => 'mock-token',
    signOut: () => console.log('Mock signOut')
});
const useDialog = () => ({
    toastNotify: (type: string, message: string) => console.log(`Mock toast: [${type}] ${message}`)
});
const QDialog = { isActive: false };
const Dialog = {
    create: (options: any) => ({
        onDismiss: (cb: () => void) => cb()
    })
};
const notifyComponent = {};


export interface iResult<R = unknown> { // R = 回傳格式
    status: boolean
    data: R
    messages: string[]
    httpCode?: number
}

const { toastNotify } = useDialog();

// [M] axios 回應攔截器
axios.interceptors.response.use(
    (response: AxiosResponse<iResult>) => response, // 直接回傳 response
    async (error) => {
        const userStore = useUserStore();

        if (!error.response) {
            // 處理網路斷線等沒有 response 的情況
            if (!QDialog.isActive) { // 使用 QDialog.isActive 來避免重複開啟 Dialog
                Dialog.create({
                    component: notifyComponent,
                    componentProps: {
                        type: 'error',
                        title: '網路錯誤',
                        message: '連線異常，請通知管理員！'
                    }
                });
            }
            return Promise.reject(error);
        }

        const status = error.response.status;
        switch (status) {
            case 500:
                if (!QDialog.isActive) {
                    Dialog.create({
                        component: notifyComponent,
                        componentProps: {
                            type: 'error',
                            title: '連線異常',
                            message: '伺服器發生錯誤，請通知管理員！'
                        }
                    });
                }
                break;
            case 401:
                if (!QDialog.isActive) {
                    Dialog.create({
                        component: notifyComponent,
                        componentProps: {
                            type: 'error',
                            title: '登入憑證逾時',
                            message: '您的登入已過期，請重新登入！'
                        }
                    }).onDismiss(() => { // onCancel 也可以，onDismiss 更通用
                        userStore.signOut();
                        router.push('/');
                    });
                }
                break;
            // 400, 404 在業務邏輯層處理的錯誤，直接 resolve
            case 400:
            case 404:
                return Promise.resolve(error.response);
        }

        return Promise.reject(error); // 對於其他未處理的錯誤，保持 reject
    }
);

interface iApiOptions {
    auth?: boolean // 是否需要驗證
    headers?: AxiosRequestConfig['headers']
    responseType?: 'json' | 'blob' // Response Type
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
}

// [M] useBackendApi
export default function useBackendApi() {
    const userStore = useUserStore();

    // [-] 重載簽名 1: GET, DELETE 等沒有 request body 的請求
    function sendRequest<R = unknown, P = Record<string, any>>( // R = 回傳的資料格式 P = 輸入的請求參數格式(Param)
        url: string,
        method: 'GET' | 'DELETE',
        data?: P, // 如果有帶 會是 params
        options?: iApiOptions
    ): Promise<iResult<R>>;

    // [-] 重載簽名 2: POST, PUT, PATCH 等需要 request body 的請求
    function sendRequest<R = unknown, I = unknown>(
        url: string,
        method: 'POST' | 'PUT' | 'PATCH',
        data: I,
        options?: iApiOptions
    ): Promise<iResult<R>>;

    // [M] 發送請求 (函式實作)
    // 實作的簽名需要與所有重載簽名相容
    async function sendRequest<R = unknown, I = unknown>( // R = 回傳的資料格式 I = 輸入的請求參數格式
        url: string,
        method: Method = 'GET',
        data?: I,
        options: iApiOptions = {}
    ): Promise<iResult<R>> {
        // 解構 options 並設定預設值
        const {
            auth = true,
            responseType = 'json',
            headers: customHeaders,
            onUploadProgress
        } = options;

        const headers: AxiosRequestConfig['headers'] = {};
        if (auth) {
            headers.Authorization = `Bearer ${userStore.getToken()}`;
        }

        const upMethod = method.toUpperCase();

        const config: AxiosRequestConfig = {
            url,
            method,
            headers: {
                ...headers,
                ...customHeaders
            },
            responseType,
            ...(upMethod === 'GET' || upMethod === 'DELETE'
                ? { params: data }
                : { data })
        };

        if (upMethod === 'POST' && onUploadProgress) {
            config.onUploadProgress = onUploadProgress;
        }

        try {
            // 回傳型別由底下邏輯判斷
            const axiosResponse = await axios(config);

            // [-] 針對 Blob 的成功回傳
            if (responseType === 'blob') {
                return {
                    httpCode: axiosResponse.status,
                    status: axiosResponse.status === 200,
                    // 此時 axiosResponse.data 是 Blob，我們斷言 R 是 Blob
                    data: axiosResponse.data as R,
                    messages: ['Blob data retrieved successfully!']
                };
            }

            // [-] 下面都是處理 responseType === 'json' 的情況
            const responseData = axiosResponse.data as iResult<R>; // 安全斷言

            // 針對 400 驗證錯誤的特殊處理
            if (axiosResponse.status === 400 && responseData.messages) {
                return {
                    httpCode: 400,
                    status: false,
                    data: responseData.data ?? null as R,
                    messages: Object.values(responseData.messages).flat()
                };
            }

            // 統一的成功回傳格式
            return {
                httpCode: axiosResponse.status,
                status: axiosResponse.status >= 200 && axiosResponse.status < 300,
                data: (responseData.data ?? []) as R,
                messages: responseData.messages ?? []
            };
        } catch (error: any) {
            if (import.meta.env.DEV) {
                console.error('Axios Request Failed:', error);
            }
            // 統一的失敗回傳格式
            return {
                httpCode: error.response?.status || 500,
                status: false,
                data: null as R,
                messages: [error.response?.data?.message || '發生未知錯誤，請聯繫管理員！']
            };
        }
    }

    // [M] 取得圖片 (sendRequest 的語法糖)
    async function getImage(url: string): Promise<iResult<Blob>> {
        // 透過泛型明確告知回傳的 data 是 Blob
        return sendRequest<Blob>(url, 'GET', undefined, { responseType: 'blob' });
    }

    // [M] 處理匯出檔案下載
    async function downloadFile(url: string, params: Record<string, any> = {}, defaultFileName = 'download.xlsx') {
        try {
            const response = await axios.get(url, {
                params,
                responseType: 'blob',
                headers: {
                    Authorization: `Bearer ${userStore.getToken()}`
                }
            });

            if (response.status !== 200) {
                toastNotify('error', '下載失敗。');
                return;
            }

            // 從 Content-Disposition 抓取檔案名稱
            const contentDisposition = response.headers['content-disposition'];
            const fileNameMatch = contentDisposition?.match(/filename\*=utf-8''([^;]+)/);

            let fileName = defaultFileName;
            if (fileNameMatch && fileNameMatch[1]) {
                fileName = decodeURIComponent(fileNameMatch[1]);
            }

            // 創建 Blob 並觸發下載
            const blob = response.data as Blob;
            const link = document.createElement('a');
            const urlBlob = window.URL.createObjectURL(blob);

            link.href = urlBlob;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();

            // 清理 DOM 和記憶體
            document.body.removeChild(link);
            window.URL.revokeObjectURL(urlBlob);
        } catch (err) {
            toastNotify('error', '下載失敗，請檢查網路連線或聯繫管理員。');
        }
    }

    return {
        sendRequest,
        getImage,
        downloadFile
    };
}
