---
title: '規則設計'
author: 'Opshell'
createdAt: '2025/01/08'
categories:
  - 環境設定
tags:
  - Card Game
  - Pixi Js
editLink: true
isPublished: false
---

## 基礎規則
1. 從起點經歷 5 ~ 10 個選擇後 打贏 BOSS 通關
2. 期間會有商店、事件 1 ~ 2 次
3. 通過的挑戰越難獎勵越好

## 遊戲機制
1. 角色強化為主 裝備、技能(卡牌)
2. 起始裝備 + 後續裝備
3. 牌池共通
4. 基礎生命 100
5. 基礎行動點 6
6. 基礎傷害 5

---

## 主場景
1. 類似殺戮尖塔的模式 提供 2 ~ 4 種選擇路線

## 戰鬥場景
1. 進入後 會是 8 * 8  45度視角  X*Y*Z 帶有高度機制的 戰鬥場景
2. 可互動的場地機制  高地、沙漠、水、一般草地
3. 陷阱機制
4. 入場位置隨機

---

## 裝備系統
1. 長劍    => 肉體成神
2. 十字弓  => 機械成神
3. 魔晶石  => 精神成神

## 天賦系統
1. 力量、敏捷、智慧
2. 三條支線彼此相連

## 連動範例
裝備 + 卡牌 + 天賦 產生聯動效果

1.
長劍：(每回合`行動點` + 2，基礎傷害提高 2 點 )
天賦：力量 - 動能衝擊 (遭受攻擊敵人依損失血量比例位移 5:1)
卡牌：捨身 (扣除所有行動點對目標造成 每點`行動點` 2 點的傷害)[1格]

結果：對貼身敵人造成 5 + 2 + (2 + 6) * 2 = 23 點傷害
     目標向後位移 4格， 撞到障礙物時，依照剩餘位移格數，每格 5 點傷害‧
     如果障礙物是生物，該生物受到同等傷害‧

2.
魔晶石：(提高玄學系卡牌1.2倍效果)
天賦：精神 - 寒冷 (遭受攻擊的敵人依 5 點傷害損失1點`行動點`)
卡牌：能量衝擊 (對單體敵人造成 10 點傷害， )[直線3格內]
     捨身 (扣除所有行動點對目標造成 每點`行動點` 2 點的傷害)[1格]

結果：對直線3格內敵人造成 12 + 6 * 2 = 24 點傷害，
     目標損失 4 點`行動點`‧