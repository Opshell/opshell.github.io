---
title:  'Day09 - Deploy to Github pages'
author: 'Opshell'
createdAt: '2024/09/10'
categories: 'vitepress-thirty-days'
tags:
  - 鐵人賽
  - vitepress
  - Deploy Github pages
editLink: true
isPublished: false
---

經過前幾天的水之後，我們部落格的基本設定應該都處理的差不多了，積極的看官可能都新增了一堆頁面在玩了，
那我們今天就來正式部署出來，快速拉高成就感吧。

## 建立 Github 專案
1. 首先要有個 `Github` 帳號~~廢話~~，登入他。
2. 建立專屬的 `repository` ，`Repository name` 建議為 `<帳號名稱>.github.io`，當然不是也沒關係，只是需要多設定點東西。
3. 設定 Repository 的開放程度為 `Public`，勾選 Add a README file 後，就可以 `Create repository` 了
![建立參數](/images/article/vitepress-thirty-days/day09-github-page-1.png)
建立後就可以看到下面這個畫面啦：
![建立畫面](/images/article/vitepress-thirty-days/day09-github-page-2.png)

4. `clone` 下來之後，把目前的進度 `commit(提交)`、`push(推送)` 吧~

## 啟動 Gitehub Page
1. 到 `Github` 專案下 > Settings > Pages 裡：
![Github setting](/images/article/vitepress-thirty-days/day09-github-page-3.png)
![Github page](/images/article/vitepress-thirty-days/day09-github-page-4.png)
2. 把 Build and deployment > Source 調整成 GitHub Actions
![Github setting page](/images/article/vitepress-thirty-days/day09-github-page-5.png)

## 設定 Vitepress 自動部署
1. 根據 `vitepress` 的 [官方手冊](https://vitepress.dev/zh/guide/deploy#github-pages)，我們需要在專案目錄下建立目錄 `.github/workflows/` 並在裡面新增檔案 `deploy.yml`：
::: code-group
  ```sh [目錄結構]
  .
  ├─ .github
  │  └─ workflows
  │     └─ deploy.yml
  ├─ docs
  │  ├─ .vitepress
  │  └─ pages
  │     └─ index.md
  ├─ node_modules
  └─ package.json
  ```

  ```yaml [deploy.yml]
  # 构建 VitePress 站点并将其部署到 GitHub Pages 的示例工作流程
  #
  name: Deploy VitePress site to Pages

  on:
    # 在针对 `main` 分支的推送上运行。如果你
    # 使用 `master` 分支作为默认分支，请将其更改为 `master`
    push:
      branches: [main]

    # 允许你从 Actions 选项卡手动运行此工作流程
    workflow_dispatch:

  # 设置 GITHUB_TOKEN 的权限，以允许部署到 GitHub Pages
  permissions:
    contents: read
    pages: write
    id-token: write

  # 只允许同时进行一次部署，跳过正在运行和最新队列之间的运行队列
  # 但是，不要取消正在进行的运行，因为我们希望允许这些生产部署完成
  concurrency:
    group: pages
    cancel-in-progress: false

  jobs:
    # 构建工作
    build:
      runs-on: ubuntu-latest
      steps:
        - name: Checkout
          uses: actions/checkout@v4
          with:
            fetch-depth: 0 # 如果未启用 lastUpdated，则不需要
        # - uses: pnpm/action-setup@v3 # 如果使用 pnpm，请取消注释
        # - uses: oven-sh/setup-bun@v1 # 如果使用 Bun，请取消注释
        - name: Setup Node
          uses: actions/setup-node@v4
          with:
            node-version: 20
            cache: yarn # npm 或 pnpm / yarn
        - name: Setup Pages
          uses: actions/configure-pages@v4
        - name: Install dependencies
          run: yarn install # npm 或 pnpm install / yarn install / bun install
        - name: Build with VitePress
          run: yarn docs:build # npm 或 pnpm docs:build / yarn docs:build / bun run docs:build
        - name: Upload artifact
          uses: actions/upload-pages-artifact@v3
          with:
            path: docs/.vitepress/dist

    # 部署工作
    deploy:
      environment:
        name: github-pages
        url: ${{ steps.deployment.outputs.page_url }}
      needs: build
      runs-on: ubuntu-latest
      name: Deploy
      steps:
        - name: Deploy to GitHub Pages
          id: deployment
          uses: actions/deploy-pages@v4
  ```
:::
2. 把新增的檔案和目錄 `push(推送)` 上 Github，他就會自動部署囉~ 每次的推送都會自動部署。

## 如果Git專案名稱不是 `<帳號名稱>.github.io`
前面提到：就算是專案名稱不想設定成 `<帳號名稱>.github.io`，只要通過一些設定就可以了，只要在 `config` 裡設定 `base: '/<github 專案名稱>/'`,
```ts
export default defineConfig({
    base: '/vitepress-blog/'
});
```
其他的設定都和上面一模一樣喔!只是部落格的網址就沒那麼漂亮了，<br />會變成`<帳號名稱>.github.io/<github 專案名稱>/` 。

## 小結
好的我們第一階段的任務 "建立基本的 `vitepress` 部落格並部署他" 完成了~<br />
從明天開始要進入第二階段了，越來越難水了...
