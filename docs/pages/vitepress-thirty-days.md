---
layout: home
class: vitepress-thirty-days

hero:
  name: "Day18 - Markdown"
  text: "VitePress集成了很多Markdown<br />我們可以進行一些設定，<br />讓我們用的更順手。"
  tagline: '基本 Markdown 設定'
  image:
    src: /images/Opshell-vitepress-3.png
    alt: Opshell-3D
  actions:
    - theme: brand
      text: Day18 - Basic Markdown
      link: /article/code-sea/vitepress/2024鐵人賽/day18-base-markdown
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
