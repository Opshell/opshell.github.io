---
layout: home
class: vitepress-thirty-days
hero:
  name: Day30 - 後記
  text: 完賽了~ 但是之後的路還很長。<br />最近發生很多事，接下來要好好的沉澱一下。
  tagline: 完賽感言
  image:
    src: /images/Opshell-vitepress-3.png
    alt: Opshell-3D
  actions:
    - theme: brand
      text: Day30 - 後記
      link: /article/code-sea/vitepress/2024鐵人賽/day30-epilog
title: vitepress thirty days
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2024-10-14'
categories:
tags:
editLink: true
isPublished: false
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
