---
layout: home
class: vitepress-thirty-days

hero:
  name: "Day21 - 自動化側邊欄"
  text: "每次新增文章、調整目錄結構，<br/>都要手動調整文章側邊欄的話，<br/>體驗好差阿，不如我們來自動化產生側邊欄吧。"
  tagline: 'Automated Sidebar'
  image:
    src: /images/Opshell-vitepress-3.png
    alt: Opshell-3D
  actions:
    - theme: brand
      text: Day21 - 自動化文章側邊欄
      link: /article/code-sea/vitepress/2024鐵人賽/day21-dynamic-article-list
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
