---
title: axios封裝 錯誤
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2024-09-26'
categories:
tags:
editLink: true
isPublished: false
---
```ts
// 從Axios 拉型別出來用
import { AxiosProgressEvent, AxiosRequestConfig, AxiosRequestHeaders, Method } from 'axios';
import { storeToRefs } from 'pinia';
import piniaStore from '@/store';
// import router from '@/router';

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

const router = useRouter();

// axios 攔截器處理
axios.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        if (error.response && error.response.status === 401) {
            console.log('無操作權限');

            if (getToken()) {
                refleshToken();
            }

            return Promise.reject(error);
        }

        // Handle other errors here
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
    // [-] header 處理
    if (!headers) { headers = {} as AxiosRequestHeaders; }
    headers.Authorization = `Bearer ${getToken()}`;

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
            console.log('axiosResponse.data：', axiosResponse.data);

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
                    paginator: response.paginator ? response.paginator : undefined,
                    access_token: response.access_token ? response.access_token : undefined
                };
            }

            return result;
        })
        .catch((error) => {
            console.log(error);

            console.error('Axios Error');
            console.error('--Summary：', error.response.data.message);
            console.error('--Detail：', error);

            return null;
        });
};

export const getImage = async function (url: string): Promise<iResult | null> {
    const headers = {
        Authorization: `Bearer ${getToken()}`
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

function refleshToken() {
    const userStore = piniaStore.useUserStore;
    const { userState } = storeToRefs(userStore);

    if (userState.value.access_token) {
        const token = userState.value.access_token;
        userState.value.access_token = '';

        sendRequest('/api/refreshToken', 'POST', {}, {
            Authorization: `Bearer ${token}`
        } as AxiosRequestHeaders)
            .then((response: iResult<string> | null) => {
                if (!response) { throw new Error('Get refleshToken Error'); }

                if (response.status) {
                    userStore.setToken(response.data);
                } else {
                    console.error('refleshToken Error：', response.msg);

                    userStore.signOut();
                    router.push({ name: 'Login' });
                }
            }).catch((error) => {
                console.error('refleshToken Error：', error);

                userStore.signOut();
                router.push({ name: 'Login' });
            });
    }
}

function getToken() { // [+]再找時間優化邏輯
    const userStore = piniaStore.useUserStore;
    const { userState } = storeToRefs(userStore);

    const token = userState.value.access_token || localStorage.getItem('access_token');
    if (token && !userState.value.access_token) {
        userState.value.access_token = token;
    }

    return token;
}

export default {
    setup() {
        return {
            sendRequest,
            getImage
        };
    }
};

```

```ts
import { ref, reactive } from 'vue';
import { AxiosProgressEvent, AxiosRequestConfig, AxiosRequestHeaders, Method } from 'axios';
import { storeToRefs } from 'pinia';
import piniaStore from '@/store';
import axios from 'axios';
import { useRouter } from 'vue-router';

interface iErrorMessage {
    [key: string]: string[]
}

export interface iPaginator {
    current_page: number
    total: number
    per_page: number
    last_page: number
}

export interface iResult<T = any> {
    status: boolean
    msg: string
    data: T
    paginator?: iPaginator
}

export interface iAxiosProgressEvent extends AxiosProgressEvent {
    lengthComputable: boolean
    total: number
}

export function useApi() {
    const router = useRouter();

    axios.interceptors.response.use(
        (response) => {
            return response;
        },
        async (error) => {
            if (error.response && error.response.status === 401) {
                console.log('無操作權限');

                if (getToken()) {
                    refleshToken();
                }

                return Promise.reject(error);
            }

            return Promise.reject(error);
        }
    );

    const sendRequest = async function (
        url: string,
        method: Method = 'GET',
        data: any = {},
        headers?: AxiosRequestHeaders,
        onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
    ): Promise<iResult | null> {
        if (!headers) { headers = {} as AxiosRequestHeaders; }
        headers.Authorization = `Bearer ${getToken()}`;

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
                console.log('axiosResponse.data：', axiosResponse.data);

                let result: iResult = {
                    status: false,
                    msg: '網路問題！',
                    data: null
                };

                if (axiosResponse.status === 200) {
                    const response = axiosResponse.data;

                    let resMsg: string | iErrorMessage = response.message;

                    if (typeof resMsg === 'object') {
                        const messageArray = Object.values(resMsg).map((item) => {
                            if (Array.isArray(item)) {
                                return item.join('<br>');
                            }
                            return item;
                        });

                        resMsg = messageArray.join('<br>');
                    }

                    result = {
                        status: response.status === 0,
                        msg: resMsg,
                        data: response.data,
                        paginator: response.paginator ? response.paginator : undefined,
                        access_token: response.access_token ? response.access_token : undefined
                    };
                }

                return result;
            })
            .catch((error) => {
                console.log(error);

                console.error('Axios Error');
                console.error('--Summary：', error.response.data.message);
                console.error('--Detail：', error);

                return null;
            });
    };

    const getImage = async function (url: string): Promise<iResult | null> {
        const headers = {
            Authorization: `Bearer ${getToken()}`
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

    function refleshToken() {
        const userStore = piniaStore.useUserStore;
        const { userState } = storeToRefs(userStore);

        if (userState.value.access_token) {
            const token = userState.value.access_token;
            userState.value.access_token = '';

            sendRequest('/api/refreshToken', 'POST', {}, {
                Authorization: `Bearer ${token}`
            } as AxiosRequestHeaders)
                .then((response: iResult<string> | null) => {
                    if (!response) { throw new Error('Get refleshToken Error'); }

                    if (response.status) {
                        userStore.setToken(response.data);
                    } else {
                        console.error('refleshToken Error：', response.msg);

                        userStore.signOut();
                        router.push({ name: 'Login' });
                    }
                }).catch((error) => {
                    console.error('refleshToken Error：', error);

                    userStore.signOut();
                    router.push({ name: 'Login' });
                });
        }
    }

    function getToken() {
        const userStore = piniaStore.useUserStore;
        const { userState } = storeToRefs(userStore);

        const token = userState.value.access_token || localStorage.getItem('access_token');
        if (token && !userState.value.access_token) {
            userState.value.access_token = token;
        }

        return token;
    }

    return {
        sendRequest,
        getImage
    };
}

```
