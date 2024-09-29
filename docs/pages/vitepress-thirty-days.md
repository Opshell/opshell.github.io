---
layout: home
class: vitepress-thirty-days

hero:
  name: "Day28 - Shortcut Key"
  text: "相信有些大大習慣純鍵盤工作了，這樣對手腕、手肘較為健康，所以我們幫部落格添加一點鍵盤控制"
  tagline: 'Shortcut Key 快捷鍵'
  image:
    src: /images/Opshell-vitepress-3.png
    alt: Opshell-3D
  actions:
    - theme: brand
      text: Day28 - Shortcut Key - 快捷鍵
      link: /article/code-sea/vitepress/2024鐵人賽/day28-quick-keys
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
