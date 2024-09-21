原子化CSS的概念應用在SCSS上會變得更強大

因為SCSS是允許動態給定class name的結構組合的，包括attribute

但nth-child()裡面的參數就不行了，只能是單純數字，不能是計算過的變數

我是寫在這裡比較多，但是除法現在要改用 math.div 來表示
https://hackmd.io/@FortesHuang/HJPE3sCXU

然後我有開源一個及時可用的參考
https://hackmd.io/@FortesHuang/SJ9DhgTGn

![原子化SCSS-1](/images/article/原子化SCSS-1.jpg)
![原子化SCSS-2](/images/article/原子化SCSS-2.jpg)

有人會覺得為什麼要嵌套，看到嵌套他就反感

那就是用的不夠多，不知道這樣其實跟產出的CSS大不大包沒有絕對關係

這段嵌套用意是取色彩主題的各個CLASS出來產生有意義的class name

有跟ui設計師協作design token怎麼定的人一定知道我在講甚麼

而因為這種嵌套不是很好懂，所以後面第二篇的vue3怎麼換皮，我又多了一個簡化的方式

![原子化SCSS-3](/images/article/原子化SCSS-2.jpg)




不過  說到scss 和 打包
我有個困擾很久但是一直還沒解的問題

// RWD
@mixin setRWD($size) {
    @media(max-width: $size){
        @content;
    }
}

像是這樣子的SCSS 都會在 每個宣告下面用
這樣打包後 就會有一大堆一樣的尺寸
有辦法讓他變成一個?


F:不會這樣寫
一般是按照size的range看是xl還是xxl
我改一下，有些語法不能適用現在版本的dart-sass...XDDD

https://sass-lang.com/playground/#eJyFkUFLAkEUx+/7KR4VqJClEVbrRboH9RFGZ7Sh2VF21tyIhagghaIgTxblpahDZdDBouzLuLvHvkIzu2usSXQZ+DPv9/7v/142Oz8P7mPHH9zDqknQVq1KuQV+59DtnXhHLffg1H/punvv2kzx51vokNQAErZI6LC4nKnZs0oKQ8ql3HIkDSzlyspCJFlFyuxCZlRtM6VzSmupvKbJOdaoTTl43VfvvBOfxj078e+e/fa11zzzL/pyLDkfrBFMEWzUibmjFYwArQsSYOsKS8YmTsGu9FRRB1cQTwLD/oN3feO1BmFe1Tju3Htzn/oSjTHpbcTqRAcD1dIVMmYjZuOFKlVoervvXV0qj2YvWmvQ9+v9OAw1lgWgQMuThkEC+WcEpaJkEsIBcQxJA9npBsXWpj5JpSJMgqUqtwi38oF25OtAgTDx07iBTA5TsfCJ6d1YPycBVACvWoBJmXKCQS58bJVyIXNTqr2jOcE9hx+ffvsuPKs2p/yRBM3AsEB5idUx+XUzW4wmxlTUGNrRociqpa2w7d+cgSe4MiP2fxirTGAVk+IoxDdyQCW+

如果你想把剛才那個問題自動配置一些STYLE給不同breakpoint
可以自訂一個專門針對不同斷點需要的屬性map，然後用each餵進去:
https://tinyurl.com/4cmkay8t

![]()

這樣就不用擔心會寫太多重複的code

![]()