---
layout: home
class: vitepress-thirty-days

hero:
  name: "Day03 - Vitepress Blog"
  text: "2024年的今天，為什麼還要搞個部落格? 又為什麼是 vitepress ?"
  tagline: Why write & Why is vitepress
  image:
    src: /images/Opshell-vitepress-3.png
    alt: Opshell-3D
  actions:
    - theme: brand
      text: Day03 - Vitepress 部落格
      link: /article/code-sea/vitepress/2024鐵人賽/day03-why-is-vitepress.html
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
