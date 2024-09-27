---
layout: home
class: vitepress-thirty-days

hero:
  name: "Day26 - medium-zoom"
  text: "在引用比較大張的圖片時，<br />縮圖對我這種老人家不夠友善，<br />我們添加圖片放大功能。"
  tagline: 'medium-zoom 圖片放大'
  image:
    src: /images/Opshell-vitepress-3.png
    alt: Opshell-3D
  actions:
    - theme: brand
      text: Day26 - medium-zoom - 圖片縮放
      link: /article/code-sea/vitepress/2024鐵人賽/day26-medium-zoom
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
