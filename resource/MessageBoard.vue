<script setup lang="ts">
    import { AxiosRequestHeaders } from 'axios';
    import { storeToRefs } from 'pinia';
    import { iPaginator, sendRequest } from '@/hooks/useApi';
    import { useGlobalProperties } from '@/hooks/opshellLibary';
    import piniaStore from '@/store';

    const patientStore = piniaStore.usePatientStore;
    const { patientState } = storeToRefs(patientStore);
    const patientId = patientState.value.info.id;

    const proxy = useGlobalProperties();

    export interface iCannedMessage {
        id: number // 編號 a
        content: string
    };
    export interface iMsg {
        id: number
        user_id: number
        content: string | null
        file_id: number | null
        file: string | null
        loaded: boolean // 判斷圖片是否載入完成
        show: boolean // 判斷是否顯示
        created_at: string
        user: {
            id: number
            account: string
            dialysis_room: number
            dialysis_room_name: string
        }
    };

    const msgWrap = ref<HTMLDivElement>();
    const fileInputDom = ref<HTMLInputElement | null>(null);

    const message = ref('');
    const msgList: Ref<iMsg[]> = ref([]);
    const tempListHeight = ref(0); // 暫存訊息高度：在載入新訊息時，計算捲動位置已停留在原本位置

    const cannedMessage: Ref<string> = ref('');
    const cannedMessages: Ref<iCannedMessage[]> = ref([]);
    const paginator = ref<iPaginator>({
        current_page: 0,
        last_page: 1,
        per_page: 10,
        total: 1
    });
    const sendFlag = ref(false); // 是否是發送事件

    // 卷軸觀察者
    const observer = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) { return false; }

        if (paginator.value.current_page < paginator.value.last_page) {
            getMsgList();
        }
    }, {
        root: msgWrap.value,
        rootMargin: '0px',
        threshold: 0.1
    });

    // 監聽訊息列表 主要是拿來判斷是否渲染完成要顯示 並捲動到需求位置
    watch(() => msgList.value, () => {
        if (msgList.value.length === 0) { return; } // 沒資料就跳出
        if (msgList.value.filter(item => !item.loaded).length > 0) { return; } // 還在載入就跳出
        if (msgList.value.filter(item => !item.show).length <= 0) { return; } // 沒有需要顯示的就跳出

        nextTick(() => {
            setTimeout(() => {
                const shouldScrollToBottom = sendFlag.value || (tempListHeight.value === 0);
                if (shouldScrollToBottom) {
                    conlogHeight('shouldScrollToBottom');
                    msgWrap.value?.scrollTo(0, msgWrap.value?.scrollHeight); // 捲動到底部
                    sendFlag.value = false;
                } else {
                    msgWrap.value?.scrollTo(0, msgWrap.value?.scrollHeight - tempListHeight.value); // 捲動到之前位置
                }

                msgList.value.forEach((item) => {
                    if (!item.show) {
                        item.show = true;
                    }
                });
            }, 1);
        });
    }, {
        deep: true
    });

    async function getData() {
        sendRequest(`/api/board/replies`).then((res) => {
            if (res?.status) {
                cannedMessages.value = res?.data;
            }
        });

        await getMsgList();

        nextTick(() => { // 啟動觀察者
            msgWrap.value?.scrollTo(0, msgWrap.value?.scrollHeight);

            const flag = document.querySelector('.loadMoreFlag');
            if (flag) {
                observer.observe(flag);
            }
        });
    }
    async function getMsgList() {
        const page = paginator.value.current_page + 1;
        tempListHeight.value = msgWrap.value?.scrollHeight || 0;

        await sendRequest(`/api/boards/${patientId}?page=${page}`).then((res) => {
            if (res?.status) {
                msgList.value = res?.data.map((item: iMsg) => {
                    return {
                        ...item,
                        loaded: !item.file_id,
                        show: false
                    };
                }).concat(msgList.value);
                paginator.value = res.paginator as iPaginator;
            }
        });
    }

    function addCannedMessages() {
        if (cannedMessage.value !== '') {
            sendRequest(`/api/board/replies/`, 'POST', {
                content: cannedMessage.value
            }).then((res) => {
                if (res?.status) {
                    proxy.$notify('success', '新增成功', res.msg);
                    cannedMessages.value.push(res.data);
                    cannedMessage.value = '';
                }
            }).catch((error) => {
                console.error(error);
                proxy.$notify('error', '新增失敗', '網路錯誤，請稍後再試！');
            });
        } else {
            proxy.$notify('error', '新增失敗', '請輸入要新增的訊息！');
        }
    }
    function deleteCannedMessages(id: number) {
        proxy.$notify('warning', '警告！', '確定要刪除嗎？', 0, true).then(() => {
            sendRequest(`/api/board/replies/${id}`, 'DELETE').then((res) => {
                if (res?.status) {
                    proxy.$notify(
                        'success',
                        '刪除成功',
                        res.msg
                    );
                    cannedMessages.value = cannedMessages.value.filter(item => item.id !== id);
                }
            }).catch((_err) => {
                proxy.$notify(
                    'error',
                    '刪除失敗',
                    '網路錯誤，請稍後再試！'
                );
            });
        });
    }
    function selectCannedMessages(i: number) {
        message.value = cannedMessages.value[i].content;
    }

    async function sendImage(file: FileList | null) {
        const headers = {
            'Content-Type': 'multipart/form-data'
        } as AxiosRequestHeaders;

        if (file) {
            const formData = new FormData();
            formData.append('image', file[0]);

            sendFlag.value = true;
            await sendRequest(`/api/boards/image/${patientId}`, 'POST', formData, headers) // 本機測試環境
                .then(async (res) => {
                    if (res?.status) {
                        proxy.$notify('success', '新增成功', res.msg).then(() => {
                            msgList.value.push({
                                ...res.data,
                                loaded: false,
                                show: false
                            });

                            if (fileInputDom.value) { // 清除 input
                                fileInputDom.value.value = '';
                            }
                            conlogHeight('sendImage');
                        }).then(async () => {
                            await nextTick();
                            conlogHeight('nextTick');
                            msgWrap.value?.scrollTo(0, msgWrap.value?.scrollHeight); // 捲動到底部
                        });
                    }
                })
                .catch((error) => {
                    console.error(error);
                });
        }
    }

    async function sendMessages() {
        sendFlag.value = true;
        await sendRequest(`/api/boards/${patientId}`, 'POST', {
            content: message.value
        }).then((res) => {
            if (res?.status) {
                proxy.$notify('success', '新增成功', res.msg);

                msgList.value.push({ ...res.data, loaded: true, show: false });
                message.value = '';
            }
        }).catch((_err) => {
            proxy.$notify('error', '新增失敗', '網路錯誤，請稍後再試！');
            message.value = '';
        });
    }

    onMounted(() => {
        getData();
    });

    function conlogHeight(target: string = 'now msgWrap') {
        console.log(target, msgWrap.value?.scrollHeight);
    }
</script>

<template>
    <article class="messageBoardBlock">
        <section class="cannedMessagesBlock">
            <ElInputBox field-name="新增常見回復">
                <ElInput v-model="cannedMessage" type="text" placeholder="請輸入訊息..." />
                <ElBtn
                    class="addBtn"
                    @click="addCannedMessages()"
                >
                    新　增
                </ElBtn>
            </ElInputBox>

            <div class="quickMsgBlock">
                <ElInputBox field-name="常見回復" />
                <div class="quickMsgBox">
                    <div
                        v-for="(item, i) in cannedMessages" :key="`quickMsg_${item.id}`" class="quickMsg"
                        @click.stop="selectCannedMessages(i)"
                    >
                        {{ item.content }}
                        <ElSvgIcon
                            name="cance"
                            @click.stop="deleteCannedMessages(item.id)"
                        />
                    </div>
                </div>
            </div>
        </section>

        <section class="messageBlock">
            <ol ref="msgWrap" class="msgWrap">
                <li v-if="paginator.current_page < paginator.last_page" class="msgListPaginator loadMoreFlag">
                    載入更多 <ElSvgIcon name="cycle" />
                </li>
                <li v-else class="msgListPaginator end">
                    沒有更多訊息了
                </li>

                <TransitionGroup name="fadeY">
                    <li
                        v-for="(item, i) in msgList" :key="`msg_${item.id}`"
                        class="msgBox"
                        :class="{ show: item.show }"
                        :value="item.id"
                        @click="conlogHeight()"
                    >
                        <div class="avatar">
                            <ElSvgIcon name="person" />
                        </div>

                        <div class="textBox">
                            <span class="userName">{{ `${item.user.dialysis_room_name}_${item.user.account}` }}</span>
                            <div v-if="item.content" class="msg">
                                <div class="text">
                                    {{ item.content }}
                                </div>
                                <div class="time">
                                    {{ item.created_at }}
                                </div>
                            </div>
                            <div v-if="item.file" class="msg">
                                <ElImg :src="item.file" origin="token" @finish-load="() => { msgList[i].loaded = true; }" />
                                <div class="time">
                                    {{ item.created_at }}
                                </div>
                            </div>
                        </div>
                    </li>
                </TransitionGroup>
            </ol>

            <div class="sendMsg">
                <ElInput v-model="message" type="text" class="ipunt" placeholder="請輸入訊息..." />

                <label class="icon send">
                    <input
                        ref="fileInputDom" type="file"
                        class="fileInput"
                        accept="image/*"
                        @change="sendImage(($event.target as HTMLInputElement).files)"
                    />
                    <ElSvgIcon name="attach_file" />
                </label>

                <ElSvgIcon
                    name="send" class="send"
                    @click="sendMessages()"
                />
            </div>
        </section>
    </article>
</template>

<style lang="scss" scoped>
    .messageBoardBlock {
        @include setFlex(flex-start, stretch, 30px);
        background: #fff;
        @include setSize(100%, 100%);

        .cannedMessagesBlock,
        .messageBlock {
            position: relative;
            @include setFlex(space-between, stretch, 20px, column);
            background: $colorBack;
            @include setSize(calc((100% - 30px) / 2), 100%);
            padding: 25px;
            border-radius: 20px;
        }

        .cannedMessagesBlock {
            justify-content: flex-start;
            .quickMsgBlock {
                @include setFlex(flex-start, flex-start, 0, column);

                .quickMsgBox {
                    @include setFlex(flex-start, center, 15px);
                    flex-wrap: wrap;
                    .quickMsg {
                        @include setFlex();
                        gap: 5px;
                        background: $colorMain;
                        padding: 10px 16px 10px 20px;
                        border-radius: 20px;
                        color: #fff;
                        cursor: pointer;
                        transition: .2s $cubic-FiSo;
                        &:hover {
                            background: $colorSubs;

                        }
                    }
                }
                .icon {
                    fill: #fff;
                    @include setSize(24px, 24px);
                    &:hover { fill: #d2454a; }
                }
            }
        }

        .messageBlock {
            .msgWrap {
                @include setFlex(flex-start, flex-start, 15px, column);
                @include setSize(100%, 100%);

                // background-color: rgba(68, 68, 68, 78.4%);
                max-height: 350px;
                border-radius: 5px;
                overflow-y: scroll;

                // scroll-behavior: smooth; // 滾動平滑

                // 卷軸體
                &::-webkit-scrollbar {
                    background: #fff;
                    width: 10px;
                    border-radius: 5px;
                    margin: 0 0 0 30px;
                }

                // 卷軸底
                &::-webkit-scrollbar-thumb {
                    background: $colorMain;
                    border: .5px solid rgba(153, 153, 153, 25%);
                    border-radius: 5px;
                    margin: 0 0 0 30px;
                }
            }

            .msgBox {
                @include setFlex(flex-start, flex-start, 10px);
                transition: opacity .2s $cubic-FiSo;
                opacity: 0;

                &.show { opacity: 1; }
            }

            .avatar {
                flex-shrink: 0;
                background: #cdd9d9;
                @include setSize(60px, 60px);
                padding: 9px;
                border-radius: 50%;
                .icon {
                    fill: $colorMain;
                }
            }

            .textBox {
                @include setFlex(flex-start, flex-start, 10px, column);
                .userName {
                    color: $colorMain;
                    font-size: 18px;
                    line-height: 1.2;
                }
            }

            .msg {
                @include setFlex(center, flex-start, 5px, column);
                position: relative;
                background: #E8D6C4;
                padding: 20px 40px 20px 20px;
                border-radius: 20px;
                margin: 0 15px;
                &::before {
                    content: '';
                    position: absolute;
                    top: 15px;
                    left: -15px;
                    @include setSize();
                    padding: 0;
                    border: 8px solid;
                    border-color: #E8D6C4 #E8D6C4 transparent transparent;
                }
                &.self {
                    align-self: flex-end;
                    align-items: flex-end;
                    background: #c4d7e8;
                    padding: 20px 20px 20px 40px;
                    &::before {
                        right: -15px;
                        left: auto;
                        border-color: #c4d7e8 transparent transparent #c4d7e8;
                    }
                }

                .text {
                    color: #444;
                    font-size: 20px;
                }
                .time { color: #707070; }

            }

            .msgListPaginator {
                flex-shrink: 0;
                align-self: center;
                display: flex;
                align-items: center;
                justify-content: center;
                background: $colorMain;
                height: 50px;
                padding: 8px 20px;
                border-radius: 20px;
                margin-top: 20px;
                color: #fff;

                .icon {
                    @include setSize(30px, 30px);
                    fill: #fff;
                    animation: 0.75s circle linear infinite;
                }

                &.end {
                    background: #ddd;
                    color: $colorMain;
                }
            }

            .sendMsg {
                @include setFlex(space-between, center, 15px);

                .ipunt {
                    flex-grow: 1;
                    max-width: unset;
                    input { padding: 8px 50px 8px 20px; }
                }
                .fileInput {
                    @include setSize();
                    overflow: hidden;
                }
                .icon {
                    flex-shrink: 0;
                    background: #fff;
                    padding: 12px;
                    border-radius: 50%;
                    cursor: pointer;
                    transition: .2s $cubic-FiSo;
                    fill: $colorMain;
                    @include setSize(55px, 55px);

                    &:hover {
                        background: $colorSubs;
                        fill: #fff;
                    }
                }
            }
        }
    }
</style>
