---
layout: home
class: vitepress-thirty-days

hero:
  name: "Day06 - Base Config 2"
  text: "Config 可以調整跟設定的東西<br />好像有點多"
  tagline: More Configs
  image:
    src: /images/Opshell-vitepress-3.png
    alt: Opshell-3D
  actions:
    - theme: brand
      text: Day06 - Base Config Part 2
      link: /article/code-sea/vitepress/2024鐵人賽/day06-base-config-part-2
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
