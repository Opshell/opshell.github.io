// 從Axios 拉型別出來用
import { AxiosProgressEvent, AxiosRequestConfig, AxiosRequestHeaders, Method } from 'axios';
import { storeToRefs } from 'pinia';
import piniaStore from '@/store';

interface iErrorMessage {
    [key: string]: string[]
}
// [-]固定的回傳格式(axios 的 data 內層)

export interface iPaginator {
    current_page: number // 目前頁面
    total: number // 資料筆數
    per_page: number // 每頁幾筆
    last_page: number // 最後頁
}
export interface iResult<T = any> {
    status: boolean
    msg: string
    data: T
    paginator?: iPaginator
}

export interface iAxiosProgressEvent extends AxiosProgressEvent {
    lengthComputable: boolean // [#] 是否開始上傳 沒有這個屬性@"@?
    total: number // 上傳總量
}

enum eResponseStatus {
    Requst_Success = 0, // 請求成功
    Requst_Fail = -1, // 請求失敗
    Image_Is_Not_Exist = -2,
    File_Is_Not_Exist = -3,
    Token_Expired = -99 // token 過期
}

// axios 攔截器處理
axios.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const userStore = piniaStore.useUserStore;

        if (error.response && error.response.status === 401) {
            if (error.response.data.status === eResponseStatus.Token_Expired) { // token 過期
                if (userStore.getToken() !== '') {
                    // 刷新 token
                    return refreshToken().then(async (status) => {
                        if (status) {
                            // 替換 error.config 裡面的 token
                            error.config.headers.Authorization = `Bearer ${userStore.getToken()}`;

                            // 重新發送請求
                            return axios.request(error.config);
                        }
                    });
                }
            }

            return Promise.reject(error);
        }
        return Promise.reject(error);
    }
);

export const sendRequest = async function (
    url: string,
    method: Method = 'GET',
    data: any = {},
    headers?: AxiosRequestHeaders,
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
): Promise<iResult | null> {
    const userStore = piniaStore.useUserStore;

    // [-] header 處理
    if (!headers) { headers = {} as AxiosRequestHeaders; }
    headers.Authorization = `Bearer ${userStore.getToken()}`;

    const config: AxiosRequestConfig = {
        url,
        method,
        data,
        headers
    };

    if (method === 'POST' && onUploadProgress) {
        config.onUploadProgress = onUploadProgress;
    }

    return axios(config)
        .then((axiosResponse) => {
            let result: iResult = {
                status: false,
                msg: '網路問題！',
                data: null
            };

            // [-] 結果無誤的話
            if (axiosResponse.status === 200) {
                const response = axiosResponse.data; // 回傳的資料

                let resMsg: string | iErrorMessage = response.message;

                // 如果 response.message 是物件
                if (typeof resMsg === 'object') { // 錯誤回傳的格式
                // 把物件遍歷 然後把value 的 array 轉成 string 分隔時斷行
                    const messageArray = Object.values(resMsg).map((item) => {
                        if (Array.isArray(item)) {
                            return item.join('<br>');
                        }
                        return item;
                    });

                    // array 轉成 string 分隔時斷行
                    resMsg = messageArray.join('<br>');
                }

                result = {
                    status: response.status === 0,
                    msg: resMsg,
                    data: response.data,
                    paginator: response.paginator ? response.paginator : undefined
                };
            }

            return result;
        })
        .catch((error) => {
            console.error('Axios Error');
            console.error('--Summary：', error.response.data.message);
            console.error('--Detail：', error);

            return null;
        });
};

export const getImage = async function (url: string): Promise<iResult | null> {
    const userStore = piniaStore.useUserStore;

    const headers = {
        Authorization: `Bearer ${userStore.getToken()}`
    };

    const config: AxiosRequestConfig = {
        responseType: 'blob',
        headers
    };

    return axios.get(url, config)
        .then((axiosResponse) => {
            let result: iResult = {
                status: false,
                msg: '圖片取得失敗！',
                data: null
            };

            // [-] 結果無誤的話
            if (axiosResponse.status === 200) {
                result = {
                    status: true,
                    msg: '圖片取得成功！',
                    data: axiosResponse.data
                };
            }

            return result;
        })
        .catch((error) => {
            console.error('Axios Image Error：', error);

            return null;
        });
};

async function refreshToken() {
    const userStore = piniaStore.useUserStore;

    return sendRequest('/api/refreshToken', 'POST', {}, {
        Authorization: `Bearer ${userStore.getToken()}`
    } as AxiosRequestHeaders)
        .then((response: iResult<string> | null) => {
            if (!response) { throw new Error('Get refreshToken Error'); }
            if (!response.status) { throw new Error(response.msg); }

            userStore.setToken(response.data);

            return response.data;
        }).catch(async (error) => {
            console.error('refreshToken Error：', error);

            userStore.signOut();

            return false;
        });
}

export default {
    setup() {
        return {
            sendRequest,
            getImage
        };
    }
};
