---
layout: home
class: vitepress-thirty-days

hero:
  name: "Day04 - Init VitePress"
  text: "一切的一切，<br />都是從 vitepress init 開始的"
  tagline: VitePress~ 啟動~
  image:
    src: /images/Opshell-vitepress-3.png
    alt: Opshell-3D
  actions:
    - theme: brand
      text: Day04 - Init VitePress
      link: /article/code-sea/vitepress/2024鐵人賽/day04-init-a-home
---

<style lang="scss">
    :root {
        --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #f4b936 30%, #bd34fe 80%);
        --vp-home-hero-image-background-image: linear-gradient(-45deg, #bd34fe 50%, #f4b936 50%);
    }

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
        }
    }
</style>
