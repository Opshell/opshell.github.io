// 功能地圖（2026-10-02，使用者：「全面 review APP 的每個功能，做成可互動的類心智圖：功能之間的互動、設計目的、
// 操作小訣竅、怎麼用目前的功能漸進式養成記帳習慣與理財觀念」）。
//
// 內容對 App 0.7.3 的 main 整理：功能巧思清單、App 內的常見問題（assets/faq.md）與更新內容（assets/whats_new.md）。
// App 改版時對著那兩份更新；演示的 id 對 demo/demos.json（測試會檢查對不對得上）。
//
// 2026-10-08 對到 Play 上的 0.7.19 再整理一次；倉庫已經做到 0.8.1，那幾個功能也先放進來，
// 用 since 標版本，頁面看到 since 比 REVIEWED_APP_VERSION 新就寫「即將推出」——商店上還裝不到，不能寫得像已經有。

/** 這份地圖對到哪一版 App（以 Google Play 上架的為準，不是倉庫的最新版） */
export const REVIEWED_APP_VERSION = '0.7.19';

export type BranchId = 'capture' | 'tidy' | 'insight' | 'plan' | 'wallet' | 'habit' | 'trust';

export interface Branch {
    id: BranchId;
    title: string;
    /** 這一支在解決什麼，一句話 */
    purpose: string;
    /** 心智圖上放在中心的哪一邊 */
    side: 'left' | 'right';
}

/** 正式版的方案：beta 期間全部開放，只是先標出來 */
export type PlanNote = 'lite' | 'beta-only';

export interface Feature {
    /** 也是網址錨點 #f-xxx */
    id: string;
    branch: BranchId;
    name: string;
    /** 為什麼要有它 */
    purpose: string;
    /** 入口在哪、怎麼用 */
    how: string;
    tips: string[];
    /** 會互相影響的功能（其他分支的也可以）；地圖上點了會連線。單向寫就好，顯示時兩邊都會連 */
    related: string[];
    /** 功能演示的 id（/dindon/demo/#id） */
    demo?: string;
    /** 藏在手勢或捷徑裡、不說就不知道的操作，一句話寫那個動作 */
    hidden?: string;
    plan?: PlanNote;
    /** 哪一版加進來的。0.7.3 以前就有的不寫；比 REVIEWED_APP_VERSION 新的會標「即將推出」 */
    since?: string;
}

export interface Stage {
    id: string;
    /** 大約什麼時候 */
    when: string;
    title: string;
    /** 這一段要做到什麼 */
    goal: string;
    /** 這一段養成的理財觀念 */
    concept: string;
    conceptText: string;
    /** 每天或每週實際要做的事 */
    actions: string[];
    /** 這一段會用到的功能 id */
    features: string[];
    /** 做到了的訊號 */
    signal: string;
}

export const branches: Branch[] = [
    { id: 'capture', title: '記下來', purpose: '讓每一筆錢都有地方進來，越不用想越好', side: 'right' },
    { id: 'tidy', title: '整理', purpose: '記錯、記重複、記到別天，都能用一個手勢修好', side: 'right' },
    { id: 'insight', title: '看懂', purpose: '把一堆帳變成「錢去哪了」的答案', side: 'right' },
    { id: 'plan', title: '規劃', purpose: '從記錄過去，走到安排接下來', side: 'left' },
    // 0.7.11 加了借貸，標題維持原本的長度（心智圖的節點放不下三個詞），借貸寫進 purpose
    { id: 'wallet', title: '帳戶與代墊', purpose: '選配：知道錢在哪裡、誰還欠你、你還欠誰', side: 'left' },
    { id: 'habit', title: '養成', purpose: '讓「回來看看」變成每天的小事', side: 'left' },
    { id: 'trust', title: '安心', purpose: '帳是你的：存在哪、送出什麼、怎麼帶走', side: 'left' }
];

export const features: Feature[] = [
    // #region [P] 記下來
    {
        id: 'notify',
        branch: 'capture',
        name: '付款通知自動記帳',
        purpose: '記帳最難的是「記得去記」。付款通知本來就會跳，叮咚讀它，帳在付款的那一刻就記好，連 App 都不用開。',
        how: '第一次打開時小精靈會一步一步帶你開；之後在選單 →「通知記帳與權限」：開通知存取權、勾要讀的銀行與支付 App、把電池設成「不受限制」。',
        tips: [
            '只讀你勾選的 App，其餘通知一律略過；第一次設定時，看起來是銀行、支付的會先幫你勾好。',
            '「消費滿 1,000 送…」「85 折起」這類廣告句子會被擋掉，不會記成消費。',
            '退刷的通知會記成「退款」，小精靈接著問你是退哪一筆。'
        ],
        // 演示 01-notify 還是 phone（沒錄好），測試只收能播的，先不掛
        related: ['dedupe', 'memory', 'vendorPower', 'journal', 'redact', 'accounts', 'smartFix', 'refund']
    },
    {
        id: 'dedupe',
        branch: 'capture',
        name: '同一筆只記一次',
        purpose: 'LINE Pay 先推「付款成功」、銀行再推「消費通知」，其實是同一筆。重複的帳會讓統計失真，所以在記之前就認出來。',
        how: '自動判斷，不用設定。',
        tips: [
            '兩則相隔超過一分鐘時可能還是會記兩筆：把其中一筆往左滑「選來合併」，再點另一筆。',
            '房租這種固定收支自動記了一筆，幾天內同金額的銀行扣款通知會併進去。'
        ],
        related: ['swipe', 'recurring'],
        demo: '02-dedupe'
    },
    {
        id: 'photo',
        branch: 'capture',
        name: '拍照記帳',
        purpose: '付現金、夜市、傳統發票沒有通知。拍一張，AI 讀出店家、金額和每個品項，連折扣都算進去。',
        how: '按住記帳鈕滑到「拍照」放開；照片已經在相簿裡的，按拍照頁的「從相簿選」。',
        tips: [
            '讓電子發票的 QR 碼入鏡：金額與發票號碼在手機上直接解碼，最準。',
            '讀到金額就直接記好回首頁，按提示上的「查看」再改；讀不到金額才停下來讓你補。',
            '同一張發票掃兩次會被擋下。'
        ],
        related: ['items', 'duplicate', 'recordFan', 'statement']
    },
    {
        id: 'voice',
        branch: 'capture',
        name: '用說的記帳',
        purpose: '手上拿著東西、剛吃完飯，說一句比打字快。',
        how: '按住記帳鈕滑到「語音」，說「早餐蛋餅 45」。小精靈會在上面陪你講，可以說哪些帳的例子列在文字框下面。',
        tips: [
            '送出前逐字稿可以改，數字和店名最容易聽錯。',
            '「從玉山轉一萬到郵局，手續費十五」直接記成轉帳，不用 AI 額度。',
            '「晚餐我先付，小明 300、小華 250」會記成幫兩個人的代墊。'
        ],
        related: ['transfer', 'lending', 'recordFan', 'voiceMulti']
    },
    {
        id: 'voiceMulti',
        branch: 'capture',
        name: '一句話記好幾筆',
        purpose: '晚上才想起今天的帳，一筆一筆講太累。一口氣講完，叮咚自己拆開。',
        how: '語音記帳時把幾筆連著講：「早餐 60、午餐 120、咖啡 85」。',
        tips: [
            '每一段都有名稱和金額就記成好幾筆；記完首頁跳一句「用講的記了 3 筆」，講錯按「復原」一起拿掉。',
            '想記成一筆、好幾個品項：開頭先講店名（「在全家買了便當 80、飲料 25」），或講「總共多少」。',
            '借貸、分期也聽得懂：「借小明 5000」「小明還我 2000」「iPhone 三萬 分 12 期」。'
        ],
        related: ['voice', 'loan', 'installment', 'items'],
        since: '0.7.13'
    },
    {
        id: 'statement',
        branch: 'capture',
        name: '帳單截圖一次記一整頁',
        purpose: '開始用叮咚之前的帳、沒開通知的那張卡，一張截圖補齊，不用一筆一筆打。',
        // 0.7.17 從記帳扇的第二格搬進拍照頁，扇上那一格現在空著
        how: '先截一張信用卡 App 的消費明細；按住記帳鈕滑到「拍照」，按「從相簿選」→「信用卡帳單截圖」，挑那張圖。',
        tips: [
            '標「不太確定」的列預設不勾，看過再放行。',
            '帳單只印月／日時年份是推的，點日期可以改。',
            '一次最多 60 列；本期應繳、循環利息、紅利不會被記進去。'
        ],
        related: ['duplicate', 'photo', 'memory'],
        demo: '14-statement',
        plan: 'lite'
    },
    {
        id: 'quick',
        branch: 'capture',
        name: '快選記帳',
        purpose: '每天都一樣的早餐、通勤，挑一個、打金額就好。',
        how: '先在選單 →「記帳偏好」→「快選」建好模板；記帳時按住記帳鈕滑到最右邊「快選」。',
        tips: [
            '模板記名稱、分類、標籤，不記金額；有明細的模板會先把金額加好。',
            '輕量方案以上會從你常記的帳自動找出建議，點一下就能釘成模板。'
        ],
        related: ['recordFan', 'widget', 'tags']
    },
    {
        // id 沿用 manual（網址錨點）：0.7.7 起扇上的「手動」換成隨手記，完整的手動記帳是它的「填更多」
        id: 'manual',
        branch: 'capture',
        name: '隨手記與計算機',
        purpose: '其他方式都不適合時的最後一道網：一張小卡打名稱和金額就記好，分類交給叮咚猜。',
        how: '按住記帳鈕滑到「隨手記」放開。要選分類、帳戶或寫備註，按「填更多」，小卡會攤開成完整的帳內頁。',
        tips: [
            '分類先照你的快選模板、以前記過的同名帳猜；猜不到才問 AI（只送名稱，金額不送），格子下面寫猜到哪一類。',
            '帳內頁的金額欄是計算機：打「65+30+3×40」，每一段會各自變成一筆明細。',
            '名稱、分類都不填也存得進去，記成「花了」、分類「其他」，之後再補；帳內頁最上面可以切換支出、收入、轉帳。'
        ],
        related: ['items', 'recordFan', 'transfer', 'quick'],
        hidden: '帳內頁的金額欄是計算機：打「65+30+3×40」，按確定後每一段各自變成一筆明細。'
    },
    {
        id: 'recordFan',
        branch: 'capture',
        name: '按住記帳鈕滑選方式',
        purpose: '最常做的事只留一個入口，位置永遠在拇指正下方；幾種記帳方式收進一條弧裡。',
        // 0.7.17 帳單截圖搬進拍照後，扇維持五格、第二格先空著
        how: '按住底部中間的記帳鈕，往左右滑，放開就進那一種：語音、拍照、隨手記、快選（第二格先空著，留給之後的新方式）。',
        tips: ['點一下（不按住）會把選項攤開，用點的也行。'],
        related: ['photo', 'voice', 'quick', 'manual'],
        demo: '16-record-fan',
        hidden: '按住記帳鈕不放、往左右滑，放開就進那一種記帳方式。'
    },
    {
        id: 'widget',
        branch: 'capture',
        name: '桌面小工具與捷徑',
        purpose: '連 App 首頁都不用經過，在桌面就開始記。',
        how: '長按桌面加小工具：快速記帳（語音、拍照、隨手記、快選）、每日預算、存錢目標。長按 App 圖示也有同樣四種捷徑。',
        tips: [
            '買杯飲料這種小錢，點桌面的「隨手記」打名稱和金額就好，連 App 都不用開。',
            '「每日預算」小工具看得到今天還剩多少，點一下打開預算頁。'
        ],
        related: ['quick', 'budget', 'goal', 'manual'],
        demo: '22-widget-shortcut',
        hidden: '長按桌面加小工具，或長按 App 圖示用捷徑，不經過首頁就開始記。'
    },
    // #endregion

    // #region [P] 整理
    {
        id: 'memory',
        branch: 'tidy',
        name: '記住你改過的分類',
        purpose: '自動記錯沒關係，改一次就好。改過的店家與時段會被記住，下次直接照你的分，不用再問 AI。',
        how: '點進那筆帳改分類、儲存。',
        tips: ['同一家店早上買早餐、晚上買日用品，分得開：記的是「店家＋時段」。'],
        related: ['notify', 'categories', 'smartFix'],
        demo: '03-remember-category'
    },
    {
        id: 'smartFix',
        branch: 'tidy',
        name: '智能導正',
        purpose: '有些通知只寫「消費 400」，像綁卡的 eTag 自動儲值，誰來猜都猜不出是什麼。改一次、教一次，之後同樣的通知就照你教的記。',
        how: '點進那筆通知記的帳，改好名稱、分類，打開最下面的「智能導正」再儲存。',
        tips: [
            '對得上的是同一個 App、同樣金額、同一種寫法的通知；同一張卡別的消費不受影響。',
            '教過的都在選單 →「記帳偏好」→「智能導正」：點一下可以改記成的樣子，往左滑刪掉。',
            '和「記住你改過的分類」不一樣：那個認的是店家，這個是給連店家都沒寫的通知用的。'
        ],
        related: ['notify', 'memory'],
        hidden: '通知記的帳內頁最下面有「智能導正」開關，打開再儲存就教會了。',
        since: '0.7.18'
    },
    {
        id: 'refund',
        branch: 'tidy',
        name: '信用卡退刷自動抵銷',
        purpose: '退貨退刷之後，原本那筆消費還算在花費裡，統計就多算了一次。退款進來時直接抵掉原本那筆。',
        how: '退刷的通知會先記成一筆「退款」，小精靈探頭問「這是退某月某日那一筆的嗎？」，按「抵掉」才動帳。',
        tips: [
            '全額退的兩筆一起拿掉；部分退的從原本那筆扣掉，備註寫「退刷 $多少（日期）」。',
            '只問同一張卡、60 天內、金額一樣或店名對得上的；按「不是」就兩筆都留著，不再問那一筆。',
            '不想被問，在「小夥伴會跟你說的事」把「退刷抵銷」關掉。'
        ],
        related: ['notify', 'companion', 'accounts', 'swipe'],
        demo: '07-refund',
        since: '0.7.9'
    },
    {
        id: 'categories',
        branch: 'tidy',
        name: '分類管理',
        purpose: '分類是統計的骨架，照你自己的生活來分。',
        how: '選單 →「分類管理」：改名稱、圖示、顏色，拖曳排順序。',
        tips: ['分類保持粗（十個上下），細的交給標籤，統計圖才看得清楚。'],
        related: ['tags', 'stats'],
        demo: '30-category-manage'
    },
    {
        id: 'tags',
        branch: 'tidy',
        name: '標籤與排除詞',
        purpose: '標籤取代第二層分類：一筆帳可以有好幾個，「#旅行」「#約會」跨分類也能一起看。',
        how: '帳內頁的標籤欄；選單 →「記帳偏好」設 AI 不要用的標籤（排除詞）。',
        tips: [
            '輸入很寬容：# 有沒有打、前後空白、大小寫重複都會自動整理。',
            '第一個標籤是「主要標籤」，統計下鑽時用它分組。',
            '排除詞上限：免費 5 個、輕量 15 個、進階與深度 35 個。'
        ],
        related: ['drill', 'search', 'categories'],
        demo: '27-tags'
    },
    {
        id: 'items',
        branch: 'tidy',
        name: '購物清單與折扣',
        purpose: '一筆 1,200 的聚餐裡有誰的、買了哪些，拆成品項才看得出錢真正花在什麼。',
        how: '帳內頁的購物清單；拍照會自動列出品項。',
        tips: [
            '負的品項是折扣，整行綠字，清單上那筆會寫「省 $50」。',
            '按住一項不放、上下滑可以多選。'
        ],
        related: ['photo', 'lending', 'budgetBadge'],
        hidden: '購物清單裡按住一項不放、上下滑，一次選好幾項。'
    },
    {
        id: 'swipe',
        branch: 'tidy',
        name: '左滑合併或刪除',
        purpose: '修正的動作要比記錯的代價小，才不會因為怕麻煩而不記。',
        how: '首頁把一筆往左滑，露出「合併」「刪除」。',
        tips: [
            '合併時金額不相加：指定留哪一筆，其他筆只補它缺的欄位。',
            '合併過的帳每一筆原本怎麼記的都留著圖示。'
        ],
        related: ['dedupe', 'duplicate'],
        demo: '18-swipe-actions',
        hidden: '首頁把一筆往左滑，露出「合併」「刪除」。'
    },
    {
        id: 'dragDay',
        branch: 'tidy',
        name: '長按拖到別天',
        purpose: '日期記錯是最常見的錯，直接拿起來放到對的那天。',
        how: '首頁長按一筆帳拿起來，拖到正確的日期放開。',
        tips: ['拖的時候，一筆帳都沒有的日子也會暫時長出空位讓你放。'],
        related: ['feedSummary'],
        demo: '17-drag-to-day',
        hidden: '長按一筆帳拿起來，拖到別天放開。'
    },
    {
        id: 'duplicate',
        branch: 'tidy',
        name: '重複的帳會先問你',
        purpose: '刷 LINE Pay 自動記了一筆、店員又印了發票讓你拍，不要變成兩筆。',
        how: '存檔時自動比對。',
        tips: ['發票號碼一樣就是同一張，直接擋；只是很像（同店、同金額、時間接近）的會問你要合併還是新增。'],
        related: ['photo', 'statement', 'swipe'],
        demo: '15-duplicate'
    },
    {
        id: 'journal',
        branch: 'tidy',
        // 0.7.19 選單上叫「AI 除錯日誌」，除了通知也收語音、拍照；目前 beta 版才看得到
        name: '沒記到自己查（除錯日誌）',
        purpose: '「為什麼沒記到」不用猜：每則通知、每次語音和拍照的原文和判定過程都看得到。',
        how: '選單 →「問題回報」下面的「AI 除錯日誌」（beta 版）；「通知記帳與權限」頁也列出每個 App 最近送了幾則。',
        tips: [
            '最常見的原因是手機的省電把 App 停了，「通知記帳與權限」頁會照你的手機品牌把該關的開關排在最前面。',
            '直接安裝 APK 的話，Android 13 起要先「允許受限制的設定」才開得了通知存取權。'
        ],
        related: ['notify', 'vendorPower', 'report'],
        demo: '05-capture-diagnostics'
    },
    {
        id: 'vendorPower',
        branch: 'tidy',
        name: '依手機品牌教你關省電',
        purpose: '三星、小米、OPPO、vivo、華為各有自己的省電開關，名稱還常改；認出你的手機，把那一家的說明排最前面。',
        how: '選單 →「通知記帳與權限」。',
        tips: [
            '設定頁的選單項目變成警告色，就是缺了權限，上面會寫缺什麼。',
            '省電或重開機之後通知存取權被系統關掉，小精靈會探頭講，按一下就能開回來。'
        ],
        related: ['notify', 'journal'],
        demo: '06-vendor-power'
    },
    // #endregion

    // #region [P] 看懂
    {
        id: 'feedSummary',
        branch: 'insight',
        name: '今日花費與本月累積',
        purpose: '打開就看到今天花了多少、這個月花了多少，不用進任何一頁。',
        how: '首頁上方的黃色區塊。',
        tips: [
            '點「本月累積」選每個月從幾號開始算：對齊發薪日，「本月」才是你真正的一個月。',
            '點「今日花費」進每日預算頁。'
        ],
        related: ['budget', 'range', 'stats'],
        demo: '19-cycle-start',
        hidden: '點首頁的「本月累積」，挑每個月從幾號開始算。'
    },
    {
        id: 'stats',
        branch: 'insight',
        name: '液體圓餅圖與長條圖',
        purpose: '一眼看出錢的形狀：佔比越大的那一塊越活潑。',
        how: '底部的「統計」。上方切換看哪一段時間（設了發薪日就照發薪日算），圓餅與長條可以換。',
        tips: [
            '點一塊看金額、佔比、筆數；點空白處回到區間總額。',
            '最上面切「收入」看錢從哪來，還能切「依帳戶」看進了哪個帳戶；退款不算收入。'
        ],
        related: ['drill', 'hide', 'categories', 'range'],
        demo: '23-liquid-pie'
    },
    {
        id: 'drill',
        branch: 'insight',
        name: '分類 → 標籤 → 品項',
        purpose: '「餐飲花很多」不夠具體；一路下鑽到是哪個標籤、哪幾樣東西。',
        how: '統計頁圓餅點一塊看數字、再點一次進到標籤；下面的分類清單點一下就直接進去。標籤那一層再點一個看品項清單。',
        tips: ['標籤層用的是每筆帳的第一個標籤；回上一層按圓餅左上角的返回或手機的返回手勢。'],
        related: ['tags', 'items', 'stats'],
        demo: '24-pie-drill',
        hidden: '統計圖點一塊看數字，再點一次往下鑽到標籤，再一次到品項。'
    },
    {
        id: 'hide',
        branch: 'insight',
        name: '按眼睛排除大額',
        purpose: '房租、學費一筆就佔掉大半，蓋掉了真正能調整的日常開銷。',
        how: '統計頁分類清單上，按那一列的眼睛。',
        tips: ['排除的會移到「未計入統計」，再按一次恢復；標籤層也能各自藏起來。'],
        related: ['stats', 'recurring'],
        demo: '25-hide-category',
        hidden: '統計頁分類清單按那一列的眼睛，這一類暫時不算進總額。'
    },
    {
        id: 'range',
        branch: 'insight',
        name: '日期範圍與花費熱圖',
        purpose: '一趟旅行、一次搬家總共花多少，挑頭挑尾就知道。',
        how: '首頁上方的日曆按鈕挑一段日期，首頁就只列那一段、上面改成「範圍累積」。',
        tips: [
            '挑日期的日曆上，每天花多少用深淺標出來；特別深的那幾天就是值得回頭看的日子。',
            '有這個月、上個月這種常用的區間可以直接選；想看回全部，按一下範圍的標籤就好。'
        ],
        related: ['stats', 'feedSummary', 'search'],
        demo: '20-date-range-heatmap'
    },
    {
        id: 'search',
        branch: 'insight',
        name: '搜尋與用講的找',
        purpose: '「上個月在超商花了多少」這種問題，直接問。',
        how: '首頁右上角的放大鏡；搜尋框最右邊的麥克風是用講的找。',
        tips: [
            '打字搜尋完全在手機上、離線也能用：`全家`、`#早餐`、`>500`，空白隔開就是都要符合。',
            '用講的找只把那句話與分類、標籤名稱送出去翻成條件，帳本身不會離開手機。'
        ],
        related: ['tags', 'range'],
        demo: '21-search',
        hidden: '搜尋框打 `#早餐`、`>500`，空白隔開就是都要符合。',
        plan: 'lite'
    },
    {
        id: 'monthReview',
        branch: 'insight',
        name: '月結',
        purpose: '統計什麼都看得到，反而不知道該看什麼。每個月初只看兩件事，看完把那個月關起來。',
        how: '記帳里程碑的「這個月」→「開始月結」：比平常多花在哪一類、固定支出有沒有新增或結束，看完按「9 月結好了」。',
        tips: [
            '「平常」是前三個月的平均；第一個完整的月沒得比，先列花最多的三類。',
            '這個月有年繳的固定支出也會提醒你。',
            '月初還沒結，里程碑的小樓梯右上角會有一顆小紅點。'
        ],
        related: ['stats', 'recurring', 'milestone'],
        since: '0.8.0'
    },
    // #endregion

    // #region [P] 規劃
    {
        id: 'budget',
        branch: 'plan',
        name: '每日預算',
        purpose: '月預算太遠，月底才知道超支；把它切成每天，今天就知道。',
        how: '點首頁的「今日花費」，設每天想花多少與提醒門檻（預設 50%、80%、100%）。',
        tips: [
            '先別訂理想數字：拿統計頁過去一個月的日平均，往下調一點點就好；或用「每月可支配」算好的數字一鍵套用。',
            '房租、分期每一期這種固定的錢不算進每日預算，每天看到的只有你能調整的部分。',
            '守住的天數會累積成「預算守門員」徽章（有記帳的日子才算）。'
        ],
        related: ['sprites', 'goal', 'feedSummary', 'budgetBadge', 'widget', 'disposable'],
        demo: '42-budget-nudge'
    },
    {
        id: 'disposable',
        branch: 'plan',
        name: '每月可支配',
        purpose: '每日預算訂多少才合理？用你自己的收入和固定開銷算，不用猜。',
        how: '預算頁、「固定收支」最上面的「每月可支配」：收入 − 固定支出 − 分期 − 每月存錢，平均到每一天；按「每日預算設成…」直接套用。',
        tips: [
            '收入是「固定收支」裡的薪水加起來；一條都沒有，就用你自己填的每月收入。',
            '每週的固定收支照平均每月算，每年的除以 12；分期照這個月真的要繳的那一期。',
            '「這個月」跟著首頁的本月起算日，設了發薪日就照發薪日算。'
        ],
        related: ['budget', 'recurring', 'installment', 'goal', 'feedSummary'],
        since: '0.7.10'
    },
    {
        id: 'monthlyCategory',
        branch: 'plan',
        name: '「算月的」分類',
        purpose: '水電、油錢、ETag 一定會花，只是每個月多少不一定；用每天看，某幾天就會突然爆掉。',
        how: '選單 →「分類管理」→ 點那個分類，打開最下面的「算月的」。',
        tips: [
            '算月的分類不算進每日預算、也不觸發當日超標提醒，照樣算進本月累積和月結。',
            '每月可支配改扣它近三個月的平均；資料不到三個月時寫「還在觀察」。',
            '交通、醫療、生活繳費預設就是算月的。'
        ],
        related: ['budget', 'disposable', 'categories', 'monthReview'],
        since: '0.8.1'
    },
    {
        id: 'sprites',
        branch: 'plan',
        name: '小精靈提醒',
        purpose: '同樣是「花到 80% 了」，由一隻有個性的小精靈說，比系統通知好聽進去。',
        // 0.7.11 從預算頁搬到個人資料的「小夥伴」
        how: '首頁左上角的大頭貼 →「個人資料」→「小夥伴」：左右滑選一隻，按「選牠提醒我」。',
        tips: [
            '三隻：叮咚精靈、勇敢的小白鼠（封測紀念）、精算貓頭鷹（任 4 顆徽章升到金級解鎖）。',
            '每次的提醒由 AI 照牠的口吻現寫一兩句。'
        ],
        related: ['budget', 'companion', 'badges'],
        demo: '43-sprites'
    },
    {
        id: 'goal',
        branch: 'plan',
        name: '存錢目標',
        purpose: '省錢需要一個具體的東西。訂一個想買的，每天沒花完的預算都算進去。',
        how: '點首頁「今日花費」進預算頁，「存錢目標」那一區設想買什麼、多少錢；按「再加一個目標」可以同時存好幾個。',
        tips: [
            '好幾個目標時照順序先存滿上面那個，按住拖曳換順序；存到了按「買到了，收起來」。',
            '填了「每月存多少」，每月可支配會先扣掉，目標卡上也寫大約還要幾個月。',
            '桌面的「存錢目標」小工具看得到存到哪了。'
        ],
        related: ['budget', 'widget', 'disposable'],
        demo: '44-saving-goal'
    },
    {
        id: 'recurring',
        branch: 'plan',
        name: '固定收支',
        purpose: '房租、薪水、訂閱是可以預先知道的錢，設一次就到期自己記，月初就看得到全貌。',
        how: '選單 →「固定收支」，底部正中間的加號新增。',
        tips: [
            '可以設當天、前 1 天或前 3 天提醒。',
            '明細也能記，自動記下的那一筆會一起帶進去。',
            '信用卡分期也列在這裡，看得到繳到第幾期、還剩多少。'
        ],
        related: ['dedupe', 'hide', 'accounts', 'installment'],
        demo: '29-recurring'
    },
    {
        id: 'installment',
        branch: 'plan',
        name: '信用卡分期',
        purpose: '三萬的手機分 12 期，刷下去那天不該一次算掉三萬；每月只算當月那一期，每月累積和統計才對得上帳單。',
        how: '打開刷卡那筆的帳內頁，按帳戶右邊的「分期」，選期數（手續費選填）；新記的一筆也能直接分，存下去就分好。',
        tips: [
            '那一筆變成第 1 期，之後每個月同一天自動記一期，記在「固定收支」。',
            '「分期」只在信用卡帳戶、或 3,000 元以上的帳才出現；按錯了，提示上按「復原」。',
            '已經在繳的分期，到「固定收支」按加號、打開「分期付款」，從下一期開始記。'
        ],
        related: ['recurring', 'disposable', 'accounts', 'voiceMulti'],
        since: '0.7.10'
    },
    // #endregion

    // #region [P] 帳戶與代墊
    {
        id: 'accounts',
        branch: 'wallet',
        name: '帳戶與餘額',
        purpose: '花費告訴你錢去哪了，帳戶告訴你錢還在哪。不設也照常記帳。',
        how: '底部的「帳戶」：列出你的帳裡出現過的銀行與支付 App，按一下就建好。',
        tips: [
            '來源、卡號末碼、起始餘額（照銀行通知附的餘額推回去）全部填好，兩個以上可以一次全建。',
            '同一家銀行兩張卡會分成兩個建議，各自對到自己的通知。',
            '帳戶頁分「帳戶」「代墊」「借貸」三頁，底下的加號跟著換；上面的黃塊左邊是資產、右邊是還沒結清的代墊與借貸。',
            '卡片長按可以拖拉排順序。'
        ],
        related: ['notify', 'reconcile', 'transfer', 'linking', 'accountDetail', 'companion', 'loan']
    },
    {
        id: 'reconcile',
        branch: 'wallet',
        name: '平帳與對帳',
        purpose: '餘額對不上時不用回想是哪一筆忘了記，輸入實際的數字就好。',
        how: '帳戶頁按那個帳戶的「平帳」。',
        tips: [
            '銀行通知附了餘額的話，帳戶頁會告訴你對不對得上；對不上按「照通知平帳」。',
            '差額會記成一筆「平帳」，分類是其他。'
        ],
        related: ['accounts']
    },
    {
        id: 'transfer',
        branch: 'wallet',
        name: '轉帳與自動認出卡費',
        purpose: '繳卡費、提款、跨行轉帳不是花錢，只是錢換個地方；算成支出的話，刷卡那筆就被算了兩次。',
        how: '記帳頁最上面選「轉帳」（要先建兩個帳戶）。',
        tips: [
            '一個帳戶跳「轉出」、另一個跳「入帳」，會自動併成一筆轉帳，清單上標「自動轉帳」。',
            '跨行手續費（差 100 元以內）另外算進當天的花費。',
            '用講的也行：「國泰轉 5000 給玉山」，講到的要是你建過的帳戶名稱。',
            '認錯了在帳內頁改回「一般」就好。'
        ],
        related: ['accounts', 'voice', 'manual', 'companion']
    },
    {
        id: 'linking',
        branch: 'wallet',
        name: '綁定與連在一起',
        purpose: 'LINE Pay 其實刷的是玉山的卡；國泰兩張卡一起繳。帳戶照錢真正的流向排。',
        how: '帳戶的編輯視窗。',
        tips: [
            '綁定：LINE Pay 付的算在玉山的餘額上，清單上還是看得出是用 LINE Pay 付的。',
            '連在一起：兩張卡各算各的，排在同一張卡片、上面一行合計待繳。'
        ],
        related: ['accounts']
    },
    {
        id: 'lending',
        branch: 'wallet',
        name: '代墊與收回',
        purpose: '幫朋友先付的錢真的出去了，先算進花費；對方還了才拿掉。還沒收回的就是一張欠款清單。',
        how: '帳內頁類型選「代墊」，購物清單裡每一項寫「幫誰代墊」。',
        tips: [
            '對方還錢時，把那一項往左滑按「已收款」。',
            '幫好幾個人付的：按住一項上下滑多選，一次收回。',
            '還沒收回的列在帳戶頁「代墊」那一頁的「待收回」。'
        ],
        related: ['items', 'voice', 'borrowed', 'accounts'],
        hidden: '代墊的那一項往左滑按「已收款」，直接記一筆收回。'
    },
    {
        id: 'borrowed',
        branch: 'wallet',
        name: '他人代墊與還款',
        purpose: '別人幫你付的還不是你的花費；還了才算，才不會忘了還。',
        how: '帳內頁類型選「他人代墊」，寫誰付的。',
        tips: [
            '列在帳戶頁「代墊」那一頁的「待還款」，還了往左滑按「還款」。',
            '過三天沒還，小夥伴會探頭提醒（可以關）。'
        ],
        related: ['lending', 'companion']
    },
    {
        id: 'loan',
        branch: 'wallet',
        name: '借貸',
        purpose: '借錢給朋友、跟家人借錢、銀行信貸，都不是花掉也不是賺到，只是錢暫時換手；記下來才知道還有多少沒還清。',
        how: '底部的「帳戶」切到「借貸」，按下面的黃色加號，選「我借給別人」或「我跟別人借」，寫誰、多少。',
        tips: [
            '借貸不算花費也不算收入，統計、每日預算都不看它，只動帳戶的餘額。',
            '還錢可以分好幾次：那一筆按「記收回」或「記還款」，只還一部分就把金額改小；還清的就不列了。',
            '跟銀行借的填年利率和「按月還幾期」，之後每月自動記一期：本金不算花費、利息算花費，每月可支配也會先扣。'
        ],
        related: ['accounts', 'lending', 'voiceMulti', 'disposable'],
        since: '0.7.11'
    },
    {
        id: 'accountDetail',
        branch: 'wallet',
        name: '帳戶明細與走勢',
        purpose: '每個帳戶自己的一本帳：這個月進出多少、餘額怎麼走。',
        how: '帳戶頁點一個帳戶。',
        tips: ['一天一張卡、和首頁長一樣；右上的日曆挑看哪一段，每一筆之後剩多少都寫著。'],
        related: ['accounts', 'range']
    },
    // #endregion

    // #region [P] 養成
    {
        id: 'streak',
        branch: 'habit',
        name: '每天打開就打卡',
        purpose: '習慣的最小單位是「打開看一眼」。每天第一次打開自動打卡，連續天數用月曆看。',
        // 0.7.16 養叮咚從底部搬到首頁左上角的小火
        how: '首頁左上角寫著 EVENT 的小火 → 活動頁的「打卡記錄」。',
        tips: [
            '以台灣時間換日；沒網路的那天 3 天內連上會自動補上。',
            '換手機、還原備份都不會讓連續天數亂掉。'
        ],
        related: ['badges', 'event'],
        demo: '33-streak'
    },
    {
        id: 'badges',
        branch: 'habit',
        name: '徽章牆',
        purpose: '每一顆都對應一個值得養成的習慣：試過每種記帳方式、累積筆數、連續打開、把明細記完整。沒有「花最少」這種會讓人為了徽章不記帳的。',
        how: '底部最右邊的徽章。',
        tips: [
            '十種徽章，每種從銅一路升到七彩；升級後第一次進牆才播升級動畫。',
            '刪掉帳不會掉階。'
        ],
        related: ['titles', 'streak', 'sprites', 'budgetBadge'],
        demo: '31-badge-wall'
    },
    {
        id: 'budgetBadge',
        branch: 'habit',
        name: '預算守門員與精打細算',
        purpose: '0.7.3 新增的兩顆，把「守住預算」和「折扣省下的錢」也變成看得到的進度。',
        how: '徽章牆。',
        tips: ['預算守門員算的是有記帳、而且沒超過每日預算的天數；精打細算算的是購物清單裡折扣累積省下多少。'],
        related: ['budget', 'items', 'badges']
    },
    {
        id: 'titles',
        branch: 'habit',
        name: '稱號',
        purpose: '徽章升級解鎖新的詞，自己組一行稱號，例如「勤快的記帳人」。',
        how: '首頁左上角的大頭貼 →「個人資料」。',
        tips: ['稱號會出現在首頁左上角與排行榜。'],
        related: ['badges', 'event'],
        demo: '32-title'
    },
    {
        id: 'companion',
        branch: 'habit',
        name: '小夥伴探頭說話',
        purpose: '有新版本、自動認出轉帳、退刷可以抵銷、有新的銀行可以建帳戶時，你選的小精靈從畫面上方探頭說一聲。',
        how: '首頁左上角的大頭貼 →「個人資料」→「小夥伴」底下的「小夥伴會跟你說的事」。',
        tips: ['要說哪些事、要不要也發到通知列，都可以自己選；按 ✕ 就收起來。'],
        related: ['sprites', 'transfer', 'borrowed', 'accounts', 'refund', 'guide']
    },
    {
        id: 'guide',
        branch: 'habit',
        name: '小精靈帶你上手',
        purpose: '記帳 App 最常死在第一天：權限沒開好、不知道東西在哪。第一次打開就由小精靈一步一步帶，空白的地方也有人說話。',
        how: '第一次打開自動開始：帶你勾要記帳的 App、開通知存取權，回來確認開好了，再帶你看一下首頁。想再看一次：選單 →「說明」→「使用說明」→「重看導覽」。',
        tips: [
            '第一次走到要按住、滑動的地方，畫面會暗下來、只露出要按的地方，講一次怎麼按；做過兩次就不再講。',
            '帳記到 10 筆、超過兩種分類時，小精靈會問要不要帶你看統計頁。',
            '首頁還沒有帳時，空畫面會告訴你接下來可以做什麼。'
        ],
        related: ['notify', 'vendorPower', 'companion', 'stats'],
        since: '0.7.5'
    },
    {
        id: 'appearance',
        branch: 'habit',
        name: '夜藍深色與文字大小',
        purpose: '每天睡前看一眼的東西，要看得舒服、看得清楚。',
        how: '選單最上面的「外觀樣式」：深淺色、文字大小（小、中、大）。',
        tips: [
            '深色模式的頁首和記帳圓鈕是深藍，晚上不刺眼。',
            'App 有自己的深淺色設定，也可以跟著手機。',
            '文字大小整個 App 一起換，手機設定裡的字型大小也會算進去。'
        ],
        related: ['streak', 'widget'],
        demo: '37-dark-mode',
        since: '0.7.6'
    },
    {
        id: 'milestone',
        branch: 'habit',
        name: '記帳里程碑',
        purpose: '徽章牆獎勵的是「記」，里程碑獎勵的是「懂」。記帳分四階，每一階只學一件事、看一個數字。',
        how: '首頁左上角那座小樓梯（下面寫著 LV.1）：「旅程」看你在第幾階、下一步差什麼，「這個月」看每月可支配與月結，「傳說」看點亮的徽章。',
        tips: [
            '四階是無腦記 → 看懂錢流 → 存得下來 → 錢生錢；不用付費、也不看時間，只看你自己的帳夠不夠。',
            '剛推出時先開放「帳本滿月」（記滿 30 天）與「第一次關帳」（第一次月結）兩枚傳說徽章，其他的陸續開放。',
            '傳說徽章和徽章牆分開算，互不影響。'
        ],
        related: ['badges', 'monthReview', 'disposable', 'streak'],
        since: '0.8.0'
    },
    {
        id: 'event',
        branch: 'habit',
        name: '養叮咚：活動與投票',
        purpose: '封測期間回報問題、給建議、每天打開都算貢獻；下一個做什麼也由大家投票。',
        how: '首頁左上角寫著 EVENT 的小火。投票要先綁定 Google 帳號。',
        tips: ['回報要被採計才會加進件數；連續打開 14 天是「全勤小鐵人」。'],
        related: ['streak', 'titles', 'report'],
        demo: '34-event',
        plan: 'beta-only'
    },
    // #endregion

    // #region [P] 安心
    {
        id: 'localOnly',
        branch: 'trust',
        name: '帳只在你的手機上',
        purpose: '不用註冊、沒有廣告。帳目存在這支手機，跟著 Android 系統備份到你自己的 Google 帳號。',
        how: '不用設定。',
        tips: ['換手機時靠 Android 的系統備份還原；想自己留一份就匯出完整備份。'],
        related: ['backup', 'redact'],
        demo: '39-local-only'
    },
    {
        id: 'redact',
        branch: 'trust',
        name: '送出前先抹掉卡號與餘額',
        purpose: '通知的 AI 分類預設關閉；打開時，卡號、帳號末幾碼、餘額在手機上就先蓋掉才送出。',
        how: '選單 →「通知記帳與權限」裡的「使用 AI 自動分類」開關。',
        tips: ['拍照、語音的內容經過叮咚的伺服器轉給 Google Gemini，伺服器只轉送、不保存。'],
        related: ['notify', 'localOnly'],
        demo: '04-redact'
    },
    {
        id: 'backup',
        branch: 'trust',
        name: '完整備份與匯出',
        purpose: '資料要帶得走才算是你的。JSON 完整備份永遠免費。',
        how: '選單 →「資料與備份」。',
        tips: [
            '完整備份包含帳、自訂分類、固定收支、設定、稱號、連續天數、徽章與帳戶。',
            '匯入時已經有的帳會自動略過。',
            'CSV 試算表是輕量方案以上的功能。'
        ],
        related: ['localOnly', 'clearData'],
        demo: '40-export'
    },
    {
        id: 'clearData',
        branch: 'trust',
        name: '分區清除資料',
        purpose: '想重來不一定要全部刪掉：只清帳、只清自訂內容、只還原設定、只重置成就。',
        how: '選單 →「資料與備份」。',
        tips: ['清之前先匯出一份完整備份。'],
        related: ['backup'],
        demo: '45-clear-data'
    },
    {
        id: 'report',
        branch: 'trust',
        name: '問題回報與閃退紀錄',
        purpose: '遇到問題最快修好的方式是說出來；閃退後下次打開會直接問你要不要送紀錄。',
        how: '選單 →「問題回報」，可以附截圖。',
        tips: ['錯誤紀錄裡沒有你的帳、金額與店家；除錯紀錄送出前會抹掉卡號、餘額、email 與電話。'],
        related: ['journal', 'event'],
        demo: '41-crash-report'
    },
    {
        id: 'profile',
        branch: 'trust',
        name: '個人資料與綁定 Google',
        purpose: '綁定是選填的，只用來在換手機時把方案、額度與活動紀錄搬過去；帳不會因此上傳。',
        how: '首頁左上角的大頭貼 →「個人資料」。',
        tips: [
            '大頭貼可以裁切；暱稱、稱號、大頭貼會出現在排行榜。',
            '最底下「刪除帳戶與相關資料」由輕到重三條路：解除綁定、刪手機上的資料、要求刪除伺服器上的紀錄。'
        ],
        related: ['titles', 'event']
    }
    // #endregion
];

export const stages: Stage[] = [
    {
        id: 'auto',
        when: '第 1 週',
        title: '先讓帳自己進來',
        goal: '不改變任何花錢的習慣，只讓帳自動出現。',
        concept: '先觀察，不評價',
        conceptText: '記帳的第一個月不是為了省錢，是為了知道錢去哪。一開始就設限，最容易因為「看了難過」而放棄。',
        actions: [
            '開好通知記帳，勾常用的銀行與支付 App，電池設「不受限制」',
            '每天打開一次，看一眼今日花費就好',
            '自動分錯的，點進去改一次；通知寫得太少的，順手打開「智能導正」'
        ],
        features: ['guide', 'notify', 'vendorPower', 'journal', 'memory', 'smartFix', 'feedSummary', 'streak'],
        signal: '「天天打開」升到銀級（連續 7 天）'
    },
    {
        id: 'complete',
        when: '第 2～3 週',
        title: '補齊沒有通知的帳',
        goal: '現金、夜市、早餐店也記進來，帳開始完整。',
        concept: '完整比精準重要',
        conceptText: '漏記一筆的傷害比記錯一個分類大得多：漏掉的都是小錢，而小錢正是最容易失控的地方。',
        actions: [
            '付現金當下說一句，或拍張收據；晚上才想起來的，一句話把今天的幾筆一起講完',
            '每天都一樣的早餐建成快選模板，臨時的小錢用隨手記',
            '開始用 App 之前的帳，用拍照的「從相簿選」把帳單截圖補回來'
        ],
        features: ['voice', 'voiceMulti', 'photo', 'manual', 'quick', 'recordFan', 'widget', 'statement', 'duplicate'],
        signal: '「勤勞記帳」升到銀級（50 筆），而且拍照、開口記帳都點亮了'
    },
    {
        id: 'understand',
        when: '第 1 個月',
        title: '看懂錢的形狀',
        goal: '回答三個問題：錢最多花在哪、哪些是固定的、哪幾天特別多。',
        concept: '分開固定支出與變動支出',
        conceptText: '房租、保險改不了，能調整的是日常開銷。把固定的先排除，剩下的才是你每天在做的選擇。',
        actions: [
            '把「本月」改成從發薪日開始算',
            '統計頁按眼睛排除房租，看剩下的分布',
            '用標籤標出想追蹤的事（#外食、#訂閱），下鑽看細節'
        ],
        features: ['feedSummary', 'stats', 'hide', 'drill', 'tags', 'categories', 'range', 'search'],
        signal: '說得出「扣掉房租，我一天大概花多少」'
    },
    {
        id: 'plan',
        when: '第 2 個月',
        title: '訂一條提醒線',
        goal: '用上個月的實際數字訂每日預算，讓小精靈在花到一半時提醒你。',
        concept: '預算是提醒線，不是罰則',
        conceptText: '用實際的日平均往下調一點，比訂一個理想數字有用：做得到才會繼續。再訂一個想存的東西，省下來的才有地方去。',
        actions: [
            '房租、訂閱、薪水設成固定收支，信用卡分期也記進去',
            '看「每月可支配」算出一天能花多少，一鍵設成每日預算（或用上個月日平均的九成左右）',
            '挑一隻小精靈，留著 50%、80%、100% 三道提醒',
            '訂一個存錢目標，填每月想存多少'
        ],
        features: ['budget', 'disposable', 'sprites', 'goal', 'recurring', 'installment', 'monthlyCategory', 'widget', 'companion'],
        signal: '「預算守門員」點亮（守住每日預算 3 天）'
    },
    {
        id: 'wallet',
        when: '第 3 個月',
        title: '分清楚花掉與搬走',
        goal: '知道每個帳戶還剩多少，卡費、轉帳、退刷不再被算錯，借出去的錢記得收、借來的記得還。',
        concept: '刷卡的那一刻就是花了',
        conceptText: '信用卡帳單只是把錢從一個帳戶搬到另一個，真正花錢是刷卡那天。代墊的錢也是真的出去了，收回才算回來。',
        actions: [
            '帳戶頁一鍵建好出現過的銀行與支付 App',
            '每月一次照銀行通知平帳',
            '幫人付的標代墊，收到錢就左滑「已收款」',
            '借錢、還錢記在帳戶頁的「借貸」，還一部分也記得進去'
        ],
        features: ['accounts', 'reconcile', 'transfer', 'refund', 'linking', 'lending', 'borrowed', 'loan', 'accountDetail'],
        signal: '帳戶頁每一個帳戶都對得上銀行的數字'
    },
    {
        id: 'review',
        when: '之後每個月',
        title: '回顧，然後調整',
        goal: '每個月看一次統計，調整預算，讓記帳變成不用想的事。',
        concept: '習慣靠回饋維持',
        conceptText: '看得到進步才會繼續。徽章、稱號、連續天數不是遊戲，是讓「我有在做」變得看得見。',
        actions: [
            '月初看上個月的統計，跟前一個月比；月結推出後，花兩分鐘把上個月結掉',
            '依結果把每日預算調高或調低一點',
            '購物清單記下折扣，看「精打細算」累積了多少'
        ],
        features: ['stats', 'range', 'monthReview', 'budget', 'badges', 'budgetBadge', 'milestone', 'titles', 'items', 'backup'],
        signal: '徽章牆有一顆升到金級'
    }
];

// #region [P] 查詢
const featureById = new Map(features.map(feature => [feature.id, feature]));

export const findFeature = (id: string) => featureById.get(id);

export const featuresOf = (branch: BranchId) => features.filter(feature => feature.branch === branch);

/** 兩邊都算：A 寫了 B，B 也連到 A。照地圖上的順序排 */
export function relatedOf(id: string): Feature[] {
    const ids = new Set(findFeature(id)?.related ?? []);
    for (const feature of features) {
        if (feature.related.includes(id)) ids.add(feature.id);
    }
    ids.delete(id);
    return features.filter(feature => ids.has(feature.id));
}

/** 這個功能在養成路線的哪幾段出現 */
export const stagesOf = (id: string) => stages.filter(stage => stage.features.includes(id));

export const PLAN_LABEL: Record<PlanNote, string> = {
    'lite': '正式版：輕量方案以上',
    'beta-only': '封測期間限定'
};

/**
 * 比兩個版本號，a 比較新回正數。一段一段當數字比：字串比的話 '0.7.19' 會小於 '0.7.3'。
 * 少的段當 0（'0.8' 等於 '0.8.0'）。
 */
export function compareVersions(a: string, b: string): number {
    const left = a.split('.').map(Number);
    const right = b.split('.').map(Number);
    for (let i = 0; i < Math.max(left.length, right.length); i++) {
        const diff = (left[i] ?? 0) - (right[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

/** 商店上的版本還沒有這個功能：頁面標「即將推出」 */
export const isUpcoming = (feature: Feature) =>
    feature.since !== undefined && compareVersions(feature.since, REVIEWED_APP_VERSION) > 0;
// #endregion

// #region [P] 宣傳用的挑選
/**
 * 給第一次看到叮咚的人輪播的六個功能，照播放順序。
 * 挑的是「別的記帳 App 沒有、一句話講得完」的：先講帳自己進來，再講小精靈幫你修，最後講它幫你想怎麼花。
 */
export const SHOWCASE: string[] = ['notify', 'smartFix', 'refund', 'voiceMulti', 'disposable', 'milestone'];

/** hook 是大標（10 字以內），line 是一句好處（26 字以內）；測試會量長度 */
export const SHOWCASE_COPY: Record<string, { hook: string; line: string }> = {
    notify: { hook: '付完款，帳就記好', line: '付款通知一跳，叮咚就幫你記下，連 App 都不用開' },
    smartFix: { hook: '教一次就記得', line: '通知只寫「消費 400」？改一次，下次照你教的記' },
    refund: { hook: '退刷自動抵掉', line: '退款進來，小精靈問是哪一筆，按一下就扣回去' },
    voiceMulti: { hook: '一句話記三筆', line: '「早餐 60、午餐 120、咖啡 85」說完就三筆' },
    disposable: { hook: '今天能花多少', line: '收入扣掉房租、分期和存錢，平均到每天一鍵設好' },
    milestone: { hook: '從無腦記到錢生錢', line: '四階里程碑，一次學一件事，走過就點亮傳說徽章' }
};

export interface DayStoryStep {
    /** 24 小時制 HH:MM */
    time: string;
    /** 發生什麼事（12 字以內） */
    scene: string;
    feature: string;
    /** 叮咚做了什麼（16 字以內） */
    result: string;
}

/**
 * 「一天的帳」時間軸：一天裡各種付錢的場合，各自由哪個功能接住。
 * 每一步都要是 App 真的會這樣做的（例如退刷是小精靈先問、按了才抵，不能寫成自動扣掉）。
 */
export const DAY_STORY: DayStoryStep[] = [
    { time: '07:40', scene: '早餐店付現', feature: 'voiceMulti', result: '說「蛋餅45、豆漿25」記兩筆' },
    { time: '12:30', scene: '午餐刷行動支付', feature: 'notify', result: '通知一跳，帳已經記好' },
    { time: '15:20', scene: '下午買手搖飲', feature: 'widget', result: '點桌面隨手記，打名稱和金額' },
    { time: '18:10', scene: 'eTag 自動儲值', feature: 'smartFix', result: '照你教過的，記成交通' },
    { time: '20:30', scene: '網購退貨退刷', feature: 'refund', result: '小精靈問退哪筆，一按抵掉' },
    { time: '22:30', scene: '睡前看一眼', feature: 'budget', result: '今天還剩多少，一眼就知道' }
];
// #endregion
