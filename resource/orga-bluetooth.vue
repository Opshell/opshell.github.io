<script setup lang="ts">
    /// <reference types="web-bluetooth" />


    const getNow = () => {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }
    const string2buffer = (str: string = '') => {
        let val = null;
        if (!str) return;

        let length = str.length;
        let index = 0;
        let array = [];
        while (index < length) {
            array.push(str.substring(index, index + 2));
            index = index + 2;
        }

        val = array.join(',');

        const buf = new Uint8Array(val.match(/[\da-f]{2}/gi).map(function (h) {
            return parseInt(h, 16);
        })).buffer;

        return buf;
    }
    const ab2hex = (buffer: ArrayBufferLike) => {
        return Array.prototype.map.call(
            new Uint8Array(buffer),
            biTabletLandscapeFill => ('00' + biTabletLandscapeFill.toString(16)).slice(-2)
        ).join('');
    }
    const pad = (str: string, length: number) => {
        str = str.toString();
        return str.padStart(length, '0');
    }
    const toCRC16Modbus = (data: string) => {
        const dataBytes = Array.from(data.match(/[\da-f]{2}/gi), h => parseInt(h, 16));

        let crc = 0xFFFF;
        const polynomial = 0xA001;

        for (const byte of dataBytes) {
            crc ^= byte;
            for (let i = 0; i < 8; i++) {
                if (crc & 0x0001) {
                    crc = (crc >> 1) ^ polynomial;
                } else {
                    crc = crc >> 1;
                }
            }
        }

        let CRCStr = pad(crc.toString(16).toUpperCase(), 4); // 補0

        return CRCStr.substring(2, 4) + CRCStr.substring(0, 2);
    }

    const infoList = ref<string[]>([]);
    const errorList = ref<string[]>([]);

    const serviceUUID = '0000ff12-0000-1000-8000-00805f9b34fb';
    const readWriteCharacteristicUUID = '0000ff01-0000-1000-8000-00805f9b34fb';
    const notifityCharacteristicUUID = '0000ff02-0000-1000-8000-00805f9b34fb';

    const devicePrefix = 'YX-BE241';

    const device: Ref<BluetoothDevice | null> = ref(null);
    const server = ref<BluetoothRemoteGATTServer | undefined | null>(null);
    const service: Ref<BluetoothRemoteGATTService | null> = ref(null);
    const notifyCharacteristic: Ref<BluetoothRemoteGATTCharacteristic | null> = ref(null);
    const readWriteCharacteristic: Ref<BluetoothRemoteGATTCharacteristic | null> = ref(null);

    // 封包格式 Packet format
    // 起始 長度 (令牌 ID 操作 索引 數據) CRC 結束
    // AF   1     2  2   1   1    N    2   FA
    // CRC(2 byte)：CRC-16/MODBUS(x16+x15+x2+1)校驗，
    // 從令牌碼(包含)到資料結束(CRC 前)。
    const id = '0100'; // ID

    // 預設參數
    const serve1 = ref<string>('04053500'); // 發球參數
    const serve2 = ref<string>('04113500'); // 下一球發球參數(提前轉動球機)

    // 參數代表意義 速度 水平 垂直 高度
    const forehand = '06373C00'; // 正手高遠球
    const backhand = '06133C00'; // 反手高遠球

    const model: Ref< 'one' | 'four' | 'twenty'> = ref('one'); // 發球模式 預設單發
    const waittime = ref(1800); // 發球間隔

    const loopI = ref(0); // 發球迴圈的計數blue-owl


    const waittingNotify = ref(false); // 等候回傳 flag
    const devStop = ref(false); // 開發者停止 (發球機產生機械性錯誤時 判斷停止發球迴圈用的 Flag)

    // 藍牙連線 & 服務取得
    const connectBluetooth = async () => {
        return await navigator.bluetooth.requestDevice({
            // acceptAllDevices: true
            filters: [{
                namePrefix: devicePrefix,
            }],
            optionalServices: [
                serviceUUID,
                notifityCharacteristicUUID,
                readWriteCharacteristicUUID
            ]
        }).then(async result => {
            infoList.value.unshift('device: ' + result.name);
            device.value = result;

            server.value = await device.value.gatt?.connect();
            infoList.value.unshift('server：' + (server.value?.connected? 'connect success !' : 'connect fail!'));

            if (server.value) {
                service.value = await server.value.getPrimaryService(serviceUUID);
                infoList.value.unshift('service：' + (service.value?.isPrimary? 'Service On!' : 'Service Not found!'));
            } else {
                errorList.value.unshift('server is null');
                return;
            }

            if(service.value) {
                // 建立監聽者
                try {
                    notifyCharacteristic.value = await service.value.getCharacteristic(notifityCharacteristicUUID);

                    // 啟動監聽
                    notifyCharacteristic.value.startNotifications();
                    notifyCharacteristic.value.oncharacteristicvaluechanged = e => {
                        notifyHandler(e.target?.value.buffer);
                    }

                    infoList.value.unshift('Set NotifyCharacteristic success!');
                } catch (error) {
                    console.log('error:', error);
                    errorList.value.unshift('Set NotifyCharacteristic fail!');
                }

                // 建立讀寫者
                try {
                    readWriteCharacteristic.value = await service.value.getCharacteristic(readWriteCharacteristicUUID);
                    infoList.value.unshift('Set ReadWriteCharacteristic success!');
                } catch (error) {
                    console.log('error:', error);
                    errorList.value.unshift('Set ReadWriteCharacteristic fail!');
                }
            } else {
                errorList.value.unshift('service is null');
                return;
            }
        }).catch(error => {
            errorList.value.unshift(error);

            return null;
        });
    }

    const notifyList = { // 機械回傳碼及代表意義
        'serve_success': 'af0d00000000051f13207de9fa', // 發球成功
        'serve_cancel': 'af0c335a0000141d005dadfa', // 取消發球
    }


    const writeValue = async (hexCode: string) => {
        if (!readWriteCharacteristic.value) {
            errorList.value.unshift('readWriteCharacteristic is null');
            return;
        }

        try {
            const data = string2buffer(hexCode);

            await readWriteCharacteristic.value.writeValue(data as ArrayBuffer);

            infoList.value.unshift('write ：' + ab2hex(data));
        } catch (error) {
            console.log('error:', error);
            errorList.value.unshift(error);
        }
    }
    const readValue = async () => {
        if (!readWriteCharacteristic.value) {
            errorList.value.unshift('readWriteCharacteristic is null');
            return;
        }

        try {
            const data = await readWriteCharacteristic.value.readValue();

            infoList.value.unshift('read ：' + ab2hex(data.buffer));
        } catch (error) {
            console.log('error:', error);
            errorList.value.unshift(error);
        }
    }


    // 發球指令Handler
    const serveHandler = () => {
        if (!waittingNotify.value) {
            waittingNotify.value = true;
            if(!devStop.value) {
                // const token = '1A11';
                const token = '1320';

                const serveCode = `${token}${id}0403${serve1.value}${serve2.value}`;
                infoList.value.unshift('crc16  ：' + toCRC16Modbus(serveCode));

                const packetCode = `AF13${serveCode}${toCRC16Modbus(serveCode)}FA`
                infoList.value.unshift(`${(loopI.value + 1).toString()} serve：${packetCode}`);

                writeValue(packetCode);
            } else {
                devStop.value = false;
                infoList.value.unshift('devStop!');
            }
        }
    }
    const serveCancelHandler = () => {
        const token = '335A';

        const serveCancelCode = `${token}${id}041D${token}`;
        infoList.value.unshift('crc16  ：' + toCRC16Modbus(serveCancelCode));

        const packetCode = `AF0D${serveCancelCode}${toCRC16Modbus(serveCancelCode)}FA`
        infoList.value.unshift('serveCancel：' + packetCode);

        writeValue(packetCode);
    }
    const resetServe = () => {
        loopI.value = 0;
        model.value = 'one';
        serve1.value = '071E3C00';
        serve2.value = '071E3C00';
    }

    // 調整高度指令
    const heightAdjustHandler = (str: string) => {
        const token = '1A11';

        const heightAdjustCode = `${token}${id}0410${str}`;
        const crc16Code = toCRC16Modbus(heightAdjustCode);
        infoList.value.unshift('crc16  ：' + crc16Code);

        const packetCode = `AF0C${heightAdjustCode}${crc16Code}FA`
        infoList.value.unshift('heightAdjust：' + packetCode);

        writeValue(packetCode);
    }
    const notifyHandler = (notify) => {
        waittingNotify.value = false;

        if (ab2hex(notify) == notifyList['serve_success']) {
            if (model.value === 'four') {
                if( loopI.value < fourParams.value.length - 1){
                    loopI.value ++;
                    setTimeout(() => {
                        fourServeHandler();
                    }, waittime.value);
                } else {
                    infoList.value.unshift('完成 four serve 發球程序！');
                    serveCancelHandler();
                    resetServe();
                }
            } else if (model.value === 'twenty') {
                if( loopI.value < twentyParams.value.length - 1){
                    loopI.value ++;
                    setTimeout(() => {
                        twentyServeHandler();
                    }, waittime.value);
                } else {
                    infoList.value.unshift('完成 twenty serve 發球程序！');
                    serveCancelHandler();
                    resetServe();
                }
            } else {
                serveCancelHandler();
                resetServe();
            }
        } else if (ab2hex(notify) == notifyList['serve_cancel']) {
            if (model.value == 'four' && loopI.value < fourParams.value.length - 1) {
                devStop.value = true;
                infoList.value.unshift('發球取消，暫停 four serve 動作');
            } else if (model.value == 'twenty' && loopI.value < twentyParams.value.length - 1) {
                devStop.value = true;
                infoList.value.unshift('發球取消，暫停 twenty serve 動作');
            } else {
                infoList.value.unshift('發球取消');
            }
        } else {
            infoList.value.unshift('notify：' + ab2hex(notify));
        }
    }


    // 不同發球模式的 發球量 及參數
    const fourParams = ref([
        forehand,
        backhand,
        forehand,
        backhand,
    ]);
    const twentyParams = ref([
        forehand,
        backhand,
        forehand,
        backhand,

        forehand,
        backhand,
        forehand,
        backhand,

        forehand,
        backhand,
        forehand,
        backhand,

        forehand,
        backhand,
        forehand,
        backhand,

        forehand,
        backhand,
        forehand,
        backhand,
    ]);


    // 練習 4顆模式
    const fourServeHandler = () => {
        if (!devStop.value) {
            model.value = 'four';
            const hexCode = fourParams.value[loopI.value];

            serve1.value = hexCode;
            serve2.value = (loopI.value < fourParams.value.length - 1)? fourParams.value[loopI.value + 1] : fourParams.value[0];

            serveHandler();
        } else {
            devStop.value = false;
            infoList.value.unshift('devStop!');
        }
    }
    // 正式測試 20顆模式
    const twentyServeHandler = () => {
        if (!devStop.value) {
            model.value = 'twenty';
            const hexCode = twentyParams.value[loopI.value];

            serve1.value = hexCode;
            serve2.value = (loopI.value > twentyParams.value.length - 1)? twentyParams.value[loopI.value + 1] : twentyParams.value[0];

            serveHandler();
        } else {
            devStop.value = false;
            infoList.value.unshift('devStop!');
        }
    }


    onMounted(() => {
        infoList.value.unshift('Environment Check.');
    });


    const operatesCode = { // 操作碼
        '03': {
            title: '讀索引指令',
            summary: 'R(Read)'
        },
        '04': {
            title: '寫索引指令',
            summary: 'W(Wirte)'
        },
        '05': {
            title: '設備上傳狀態',
            summary: 'T(Transmit)'
        },
        '13': {
            title: '回應讀取',
            summary: 'ACK'
        },
        '14': {
            title: '回應寫入',
            summary: 'ACK'
        },
    }
    const indexsCode = { // 索引碼
        '01': {
            title: '設備狀態',
            lenght: '1',
            data: { // 只讀
                '0': '關機',
                '1': '開機-暫停',
                '2': '開機-運轉',
            },
            rw: 'WR',
            summary: '寫入 0~1 讀取 0~2',
        },
        '03': {
            title: '發球指令',
            lenght: '8',
            data: ['速度', '水平角度', '垂直角度', '高度', '下一球速度', '下一球水平角度', '下一球垂直角度', '下一球高度'],
            rw: 'W',
            summary: '符合條件馬上發球  否則等到道條件滿足',
        },
        '04': {
            title: '設定設定發球預備參數',
            lenght: '4',
            data: ['速度', '水平角度', '垂直角度', '高度'],
            rw: 'W',
            summary: '預備發球參數 只準備 不發球',
        },
        '10': {
            title: '高機頭升降指令',
            lenght: '1',
            data: {
                '0': '停止',
                '1': '降到最低',
                '2': '升到最高',
            },
            rw: 'W',
            summary: '只在暫停時有效',
        },
        '12': {
            title: '機頭校準',
            lenght: '2',
            data: {
                'code': {
                    'f0': '進入',
                    'e1': '調節',
                    'c3': '保存',
                },
                'direction': {
                    '0': '機頭向左',
                    '1': '機頭向右',
                }
            },
            rw: 'W',
            summary: '通電後 30秒內調用才能觸發校準功能 每次觸發都延長2分鐘 調用保存  可保存參數 並退出校準 然後設備自動重啟 超時自動退出校準模式 不保存參數',
        },
        '1c': {
            title: '自檢完成訊息',
            lenght: '1',
            data: {
                '0': '自檢完成',
            },
            rw: 'T',
            summary: '',
        },
        '1d': {
            title: '取消發球',
            lenght: '2',
            data: '原發球指令令牌2B',
            rw: 'W',
            summary: '取消發球',
        },
        '1e': {
            title: '球籠轉動狀態指示',
            lenght: '2',
            data: {
                '保留狀態' : '1B',
                '轉動狀態' : {
                    1: '球籠轉動 暫停發球',
                    0: '球籠停止 恢復發球'
                }
            },
            rw: 'W',
            summary: '取消發球',
        },
        '1f': {
            title: '發球完成訊息',
            lenght: '2',
            data: '原發球指令的令牌2B',
            rw: 'W',
            summary: '每個發球指令完成會自動上報，無需回覆',
        },
        'ae': {
            title: '錯誤訊息',
            lenght: '3',
            data: {
                '錯誤碼' : '1B',
                '參數' : '2B'
            },
            rw: 'T',
            summary: '',
        },
    }
</script>

<template>
    <div class="bluetoothBlock">
        <div class="featureBox">

            <div class="BtnBox">
                <div class="search">
                    <a class="Btn" @click="connectBluetooth('SS-BC801H')">
                        高機頭
                    </a>
                    <a class="Btn" @click="connectBluetooth('SS-BC801L')">
                        低機頭
                    </a>
                    <a class="Btn" @click="connectBluetooth('YX-BE241')">
                        單機頭
                    </a>
                </div>

                <div>
                    <a class="Btn" @click="serveHandler()">
                        serve
                    </a>

                    <a class="Btn" @click="serveCancelHandler()">
                        cancel serve
                    </a>

                    <a class="Btn" @click="fourServeHandler()">
                        5 serve
                    </a>

                    <a class="Btn" @click="twentyServeHandler()">
                        20 serve
                    </a>
                </div>

                <div>
                    <a class="Btn" @click="heightAdjustHandler('02')">
                        up
                    </a>

                    <a class="Btn" @click="heightAdjustHandler('01')">
                        down
                    </a>

                    <a class="Btn" @click="heightAdjustHandler('00')">
                        stop
                    </a>
                </div>


                <a class="Btn" @click="readValue()">
                    read Value
                </a>
            </div>

            <div class="deviceBox">
                <span>{{ device?.id }}</span>
                <span>{{ device?.name }}</span>
            </div>
        </div>


        <div class="devBlock">
            <div class="infoBlock">
                <li class="info" v-for="info in infoList">
                    <span class="text">{{ info }}</span>
                    <span class="time">{{ getNow() }}</span>
                </li>
            </div>
            <div class="errorBlock">
                <li class="error" v-for="error in errorList">
                    <span class="text">{{ error }}</span>
                    <span class="time">{{ getNow() }}</span>
                </li>
            </div>
        </div>

    </div>

</template>

<style lang="scss">
    .bluetoothBlock {
        padding: 40px;
        border: 1px solid #ccc;
        border-radius: 10px;
        margin: 20px 0;

        .BtnBox {
            @include setFlex(center, center, 20px);

            .Btn {
                width: auto;
                margin: 20px 0;
            }
        }

        .devBlock {
            @include setFlex(flex-start, stretch, 20px);
            @include setSize(100%, 450px);
            .infoBlock,
            .errorBlock {
                width: calc(50% - 10px);
                padding: 20px 25px;
                border: 1px solid #ccc;
                border-radius: 10px;

                // 卷軸體
                &::-webkit-scrollbar {
                    background: $colorMain;
                    width: 6px;
                    border-radius: 3px;
                }
                // 卷軸底
                &::-webkit-scrollbar-thumb {
                    background: #ccc;
                    border-radius: 7.5px;
                    border: 0.5px solid rgba(153, 153, 153, 0.25);
                    // box-shadow: 0 0 10px 2px #20476e;
                }

                overflow-y: scroll;
            }

            .infoBlock { }
            .errorBlock { }

            .info,
            .error {
                @include setFlex(flex-start, flex-start, 10px);
                padding: 3px 10px;
                color: #197efd;
                transition: .2s $cubic-FiSo;
                border-radius: 5px;
                .text {
                    flex-grow: 1;
                }
                &::before {
                    content: '○';
                }
                &:hover {
                    color: $colorWarning;
                    background: #333;
                }
            }
            .error { color: $colorError; }
        }
    }
</style>