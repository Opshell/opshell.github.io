import { beforeEach, describe, expect, it, vi } from 'vitest';

import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

import { getImage, sendRequest } from '../useApi.ts';

const mock = new MockAdapter(axios);

// vi.mock('axios');
// vi.mock('@/store', () => ({
//     useUserStore: {
//         getToken: vi.fn(),
//         setToken: vi.fn(),
//         signOut: vi.fn()
//     }
// }));

describe('useApi', () => {
    beforeEach(() => {
        // vi.clearAllMocks();
    });

    describe('sendRequest', () => {
        it('登入請求', async () => {
            mock.onPost('/api/login').reply(200, {
                status: 200,
                data: {
                    status: 0,
                    message: 'Success',
                    data: 'this_is_a_access_token_format_is_jwt_code_type_is_Bearer'
                }
            });

            sendRequest('/api/login', 'POST', {
                account: 'admin',
                password: 'admin'
            }).then((auth) => { // Token 處理
                if (!auth) { throw new Error('登入異常！, 網路錯誤！！'); }
                if (!auth.status) { throw new Error(`登入失敗！, ${auth.msg}`); }
                if (!auth.data) { throw new Error('登入失敗！, Token 缺失！！'); }

                console.log(auth);

                expect(auth.data).toBe('this_is_a_access_token_format_is_jwt_code_type_is_Bearer');
            });
        });
    });
});
