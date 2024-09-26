---
layout: home
class: vitepress-thirty-days

hero:
  name: "Day25 - busuanzi"
  text: "紀錄頁面的閱讀數量，網站的訪客數，應該已經是部落格標配了<br />看著數字的增加，總是會有一咪咪成就感。"
  tagline: '不蒜子 瀏覽計數器'
  image:
    src: /images/Opshell-vitepress-3.png
    alt: Opshell-3D
  actions:
    - theme: brand
      text: Day25 - busuanzi - 瀏覽計數器
      link: /article/code-sea/vitepress/2024鐵人賽/day24-giscus
---

<style lang="scss">
    .vitepress-thirty-days {
        .VPHero {
            transform: translateY(120px);
            &.has-image {
                .image {
                    transform: translateY(50px);
                    .image-bg {
                        width: 350px;
                        height: 350px;
                    }
                    .image-src {
                        max-width: 400px;
                        max-height: 400px;
                    }
                }
                .name, .text {
                    line-height: 1.5;
                }
            }

            @include setRWD(959px) {
                transform: translateY(0);
                .main {
                    transform: translateY(80px);
                }
            }
            @include setRWD(638px) {
                &.has-image .image .image-src {
                    max-width: 300px;
                    max-height: 300px;
                }
            }
        }
    }
</style>
