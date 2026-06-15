# 前端对接文档

本文档基于当前后端代码整理。所有金额类字段都使用链上最小单位字符串传输，前端不要用 `number` 承接，统一使用 `string` / `bigint`。

## 基础约定

### Base URL

开发环境示例：

```txt
http://localhost:3000
```

### 统一响应

成功响应：

```json
{
  "success": true,
  "code": 200,
  "data": {},
  "message": "Success",
  "timestamp": 1710000000000
}
```

失败响应：

```json
{
  "success": false,
  "code": 400,
  "message": "ACCOUNT_NOT_FOUND",
  "timestamp": 1710000000000,
  "path": "/api/path"
}
```

说明：

- `message` 返回稳定错误码字符串，前端可直接作为 i18n key 使用。
- `code` 是 HTTP 状态码。

### 错误码

认证：

| message | HTTP 状态码 | 说明 |
| --- | --- | --- |
| `UNAUTHORIZED` | 401 | 未登录、Token 缺失或 Token 无效 |
| `INVALID_SIGNATURE` | 401 | 钱包签名校验失败 |
| `NONCE_NOT_FOUND` | 401 / 404 | Nonce 不存在或已失效 |

账户：

| message | HTTP 状态码 | 说明 |
| --- | --- | --- |
| `ACCOUNT_ALREADY_EXISTS` | 409 | 账户已存在 |
| `ACCOUNT_NOT_FOUND` | 404 | 账户不存在 |
| `REF_CODE_NOT_FOUND` | 404 | 推荐码不存在 |
| `NODE_LEVEL_TOO_LOW` | 403 | 节点等级不足 |
| `INVALID_WITHDRAW_AMOUNT` | 400 | 提现金额错误 |
| `INSUFFICIENT_BALANCE` | 409 | 余额不足 |

矿机：

| message | HTTP 状态码 | 说明 |
| --- | --- | --- |
| `MINER_NOT_FOUND` | 404 | 矿机不存在 |
| `MINER_NOT_EXPIRED` | 409 | 当前矿机未到期，不能复投 |
| `PENDING_PURCHASE_SIGNATURE_EXISTS` | 409 | 已有待确认购买签名，不能更换支付方式 |
| `INVALID_PURCHASE_METHOD` | 400 | 购买方式错误 |
| `USDT_PURCHASE_CLOSED` | 409 | USDT 购买已关闭 |
| `FREE_MINER_ALREADY_CLAIMED` | 409 | 已领取免费矿机 |
| `FREE_MINER_HASH_ALREADY_USED` | 409 | 免费矿机交易 hash 已使用 |
| `FREE_MINER_TX_FAILED` | 400 | 免费矿机领取交易失败 |
| `FREE_MINER_EVENT_NOT_FOUND` | 400 | 交易 hash 中未找到免费矿机领取事件 |
| `FREE_MINER_ACCOUNT_MISMATCH` | 400 | 免费矿机领取账户不匹配 |
| `FREE_MINER_NOT_FOUND` | 404 | 免费矿机不存在 |
| `NO_FREE_MINER_REWARD_TO_CLAIM` | 409 | 没有可提取的免费矿机奖励 |
| `FREE_MINER_CLAIM_LIMIT_REACHED` | 409 | 免费矿机奖励提取额度已用完 |
| `RETRY_AFTER_5_MINUTES` | 409 | 请稍后重试 |
| `INVALID_MINER_STATUS` | 500 | 矿机状态异常 |

配置 / 系统：

| message | HTTP 状态码 | 说明 |
| --- | --- | --- |
| `INVALID_WITHDRAW_FEE_CONFIG` | 500 | 提现手续费配置错误 |
| `CONFIG_NOT_FOUND` | 500 | 配置不存在 |
| `CONFIG_NOT_ADMIN_EDITABLE` | 400 | 配置不允许后台修改 |
| `INVALID_CONFIG_FORMAT` | 500 | 配置格式错误 |
| `CONFIG_EXCEEDS_LIMIT` | 500 | 配置超过上限 |
| `UNKNOWN_ERROR` | 500 | 未知服务端错误 |

公告：

| message | HTTP 状态码 | 说明 |
| --- | --- | --- |
| `NOTICE_NOT_FOUND` | 404 | 公告不存在 |

### 鉴权

除标记为公开接口的接口外，都需要带 JWT：

```http
Authorization: Bearer <access_token>
```

Token 有效期：`600000s`。

### 地址和金额

- 地址：后端会统一转换为小写。
- 金额：全部是整数 `string`，单位是 token 最小单位。
- 时间：全部是秒级 Unix 时间戳。

## 公告

### 查询最新公告

授权：需要登录。

```http
GET /notice/latest
```

返回：

```json
{
  "data": {
    "id": 1,
    "title": "公告标题",
    "content": "公告内容",
    "englishTitle": "Notice title",
    "englishContent": "Notice content",
    "thaiTitle": "Notice title",
    "thaiContent": "Notice content",
    "koreanTitle": "Notice title",
    "koreanContent": "Notice content",
    "createTime": 1710000000
  }
}
```

如果没有公告：

```json
{
  "data": null
}
```

### 查询公告列表

授权：需要登录。

```http
GET /notice?page=1&pageSize=20
```

Query：

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `page` | 否 | 默认 `1` |
| `pageSize` | 否 | 默认 `20`，最大 `100` |

返回：

```json
{
  "data": {
    "list": [
      {
        "id": 1,
        "title": "公告标题",
        "content": "公告内容",
        "englishTitle": "Notice title",
        "englishContent": "Notice content",
        "thaiTitle": "Notice title",
        "thaiContent": "Notice content",
        "koreanTitle": "Notice title",
        "koreanContent": "Notice content",
        "createTime": 1710000000
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

## 登录注册

### 获取 Nonce

授权：公开。

```http
GET /nonce/:address
```

参数：

| 参数 | 位置 | 说明 |
| --- | --- | --- |
| `address` | path | 钱包地址 |

返回：

```json
{
  "data": "nonce字符串"
}
```

### 登录

授权：公开。

```http
POST /auth/login
```

请求体：

```json
{
  "address": "0x...",
  "signature": "0x..."
}
```

签名消息：

```txt
Sign this message to login your account.

Address: <address>
Nonce: <nonce>
```

返回：

```json
{
  "data": {
    "access_token": "jwt"
  }
}
```

### 注册

授权：公开。

```http
POST /auth/register
```

请求体：

```json
{
  "address": "0x...",
  "refCode": "WOCCY0RJ",
  "signature": "0x..."
}
```

签名消息：

```txt
Sign this message to register your account.

Address: <address>
Nonce: <nonce>
Referral Code: <refCode>
```

返回：

```json
{
  "data": {
    "access_token": "jwt"
  }
}
```

### 用户信息

授权：需要登录。

```http
GET /auth/profile
```

返回：

```json
{
  "data": {
    "id": 1,
    "address": "0x...",
    "refCode": "ABCDEFGH",
    "vipLevel": 0,
    "nodeLevel": 0,
    "balance": "0",
    "usdtBalance": "0",
    "createdAt": 1710000000
  }
}
```

### 查询账户是否存在

授权：公开。

```http
GET /auth/account/:address/exists
```

参数：

| 参数 | 位置 | 说明 |
| --- | --- | --- |
| `address` | path | 钱包地址 |

返回：

```json
{
  "data": {
    "exists": true
  }
}
```

## 账户

### 查询佣金等级

授权：需要登录。

```http
GET /account/commission-level
```

返回：

```json
{
  "data": {
    "commissionLevel": 0
  }
}
```

### 查询提现手续费 BP

授权：需要登录。

```http
GET /account/withdraw-fee-bps
```

返回：

```json
{
  "data": {
    "vipFeeBp": "1200",
    "nodeFeeBp": "300",
    "totalFeeBp": "1500"
  }
}
```

说明：

- BP 为万分比，`10000` 表示 100%。
- `totalFeeBp = vipFeeBp + nodeFeeBp`。

### 查询资金记录

授权：需要登录。

```http
GET /account/balance-logs?page=1&pageSize=20&type=miner_reward&type=team_reward
```

Query：

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `page` | 否 | 默认 `1` |
| `pageSize` | 否 | 默认 `20`，最大 `100` |
| `type` | 否 | 资金记录类型，可传多个：`type=a&type=b` 或 `type=a,b` |
| `token` | 否 | 代币类型：`SPACE` / `USDT` |

`type` 可选值：

```txt
miner_reward
team_reward
miner_purchase
miner_purchase_refund
withdraw
withdraw_refund
vip_dividend
node_dividend
free_miner_claim
```

返回：

```json
{
  "data": {
    "list": [
      {
        "id": 1,
        "accountId": 1,
        "type": "miner_reward",
        "token": "SPACE",
        "amount": "1000000000000000000",
        "balanceBefore": "0",
        "balanceAfter": "1000000000000000000",
        "createdAt": 1710000000
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

### 查询团队数据

授权：需要登录。

```http
GET /account/team
```

返回团队总人数、直推列表，以及每个直推分支业绩。团队总人数包括所有层级下级，不包含自己；分支业绩包括直推本人和直推下面团队成员的购买矿机 `price` 总和。

```json
{
  "data": {
    "directList": [
      {
        "id": 2,
        "address": "0x...",
        "refCode": "ABCDEFGH",
        "vipLevel": 1,
        "performance": "3000000000000000000000",
        "createdAt": 1710000000
      }
    ],
    "directCount": 1,
    "teamCount": 10,
    "totalPerformance": "3000000000000000000000"
  }
}
```

### 同步节点等级

授权：需要登录。

```http
POST /account/sync-node-level
```

后端会读取链上节点等级，并只在链上等级更高时更新数据库。

返回：

```json
{
  "data": 4
}
```

### 生成提现签名

授权：需要登录。

```http
POST /account/withdraw
```

请求体：

```json
{
  "amount": "1000000000000000000"
}
```

说明：

- `amount` 是提现总额。
- 链上用户到账金额由合约扣除 `vipFee` 和 `nodeFee` 后决定。
- 后端会预扣账户余额 `amount`。
- 签名过期且链上未使用时，定时任务会自动退款。

返回：

```json
{
  "data": {
    "amount": "1000000000000000000",
    "vipFee": "0",
    "nodeFee": "0",
    "nonce": "uuid",
    "deadline": 1710000300,
    "signature": "0x..."
  }
}
```

前端拿到后调用矿机合约：

```ts
claim(amount, vipFee, nodeFee, nonce, deadline, signature)
```

### 生成 USDT 提现签名

授权：需要登录。

```http
POST /account/withdraw-usdt
```

请求体：

```json
{
  "amount": "1000000000000000000"
}
```

说明：

- `amount` 是 USDT 提现金额。
- 后端会预扣账户 `usdtBalance`。
- 签名过期且链上未使用时，定时任务会自动退回 `usdtBalance`。
- USDT 提现不计算 `vipFee` / `nodeFee`。

返回：

```json
{
  "data": {
    "amount": "1000000000000000000",
    "nonce": "uuid",
    "deadline": 1710000300,
    "signature": "0x..."
  }
}
```

前端拿到后调用矿机合约：

```ts
withdrawUsdt(account, amount, nonce, deadline, signature)
```

## 矿机

### 查询所有矿机

授权：需要登录。

```http
GET /miner
```

返回：

```json
{
  "data": [
    {
      "id": "1",
      "name": "矿机名称",
      "price": "100000000000000000000",
      "desc": "miner.desc.SPACE_100",
      "expectedReward": "500000000000000000000",
      "isPurchasable": true,
      "isOwned": true
    }
  ]
}
```

`isOwned` 表示当前用户是否曾经拥有该矿机。即使矿机已经出局，只要存在对应的用户矿机记录，仍返回 `true`。

矿机描述 i18n key：

| key | 中文文案 | 英文文案 |
| --- | --- | --- |
| `miner.desc.SPACE_100` | 入门启航，开启您的链上征程 | Start your on-chain journey |
| `miner.desc.SPACE_300` | 稳定运行，持续释放网络价值 | Steady output, lasting value |
| `miner.desc.SPACE_500` | 高效节点，驱动生态持续增长 | Efficient nodes, stronger growth |
| `miner.desc.SPACE_1000` | 链接未来，共建去中心化网络 | Connect and build the network |
| `miner.desc.SPACE_3000` | 智能算力，打造长期稳定收益 | Smart power for steady yield |
| `miner.desc.SPACE_5000` | 强劲性能，释放更多节点潜能 | Strong performance, more potential |
| `miner.desc.SPACE_10000` | 精英配置，助您迈向更高等级 | Elite setup for higher tiers |
| `miner.desc.SPACE_30000` | 旗舰动力，共享未来数字生态 | Flagship power for the ecosystem |
| `miner.desc.SPACE_50000` | 极速连接，让每一次参与更有价值 | Faster access, greater participation |

### 查询当前用户拥有的矿机

授权：需要登录。

```http
GET /miner/my
```

返回：

```json
{
  "data": {
    "list": [
      {
        "id": 1,
        "minerId": "1",
        "accountId": 1,
        "expectedReward": "500000000000000000000",
        "producedReward": "0",
        "cycle": 3024000,
        "cycleEndAt": 1713024000,
        "lastRewardAt": 1710000000,
        "rewardPerSecond": "1000000000000",
        "createdAt": 1710000000,
        "miner": {
          "id": "1",
          "name": "矿机名称",
          "price": "100000000000000000000",
          "desc": "miner.desc.SPACE_100",
          "expectedReward": "500000000000000000000",
          "isPurchasable": true
        }
      }
    ],
    "minerReward": "1000000000000000000",
    "teamReward": "30000000000000000"
  }
}
```

### 查询初始购买周期

授权：需要登录。

```http
GET /miner/initial-cycle
```

返回：

```json
{
  "data": 35
}
```

说明：

- 返回单位是天。
- 计算方式：读取配置 `INIT_CYCLE_SECONDS` 后换算为天。

### 查询 SPACE/USDT 价格

授权：公开。

```http
GET /miner/space-usdt-price
```

返回：

```json
{
  "data": {
    "spaceUsdtPriceWei": "1000000000000000000"
  }
}
```

说明：

- `spaceUsdtPriceWei` 单位是 USDT wei。
- `1000000000000000000` 表示 `1 SPACE = 1 USDT`。
- 前端可用 `miner.price * spaceUsdtPriceWei / 1e18` 估算 `wallet_usdt_balance` 的 USDT 支付数量。
- 最终支付数量以 `POST /miner/purchase` 返回的 `payValue` 为准。

### 查询矿机奖励开始时间

授权：公开。

```http
GET /miner/reward-start-at
```

返回：

```json
{
  "data": {
    "minerRewardStartAt": 1710000000
  }
}
```

说明：

- `minerRewardStartAt` 是秒级 Unix 时间戳。
- 当前时间小于该时间时，购买矿机后暂不计算奖励。
- 当前时间大于等于该时间时，`wallet_usdt_balance` 购买方式关闭。

### 生成购买矿机签名

授权：需要登录。

```http
POST /miner/purchase
```

请求体：

```json
{
  "minerId": "1",
  "method": "wallet_balance"
}
```

`method` 可选值：

```txt
internal_balance
wallet_balance
internal_and_wallet_balance
wallet_usdt_balance
```

说明：

- `internal_balance`：使用平台内 SPACE 余额支付，链上 `payValue = 0`，`paymentToken = 0`。
- `wallet_balance`：使用钱包 SPACE 支付，链上 `payValue = price`，`paymentToken = 0`。
- `internal_and_wallet_balance`：优先使用平台内 SPACE 余额，不足部分用钱包 SPACE 支付，`paymentToken = 0`。
- `wallet_usdt_balance`：节点等级大于 `0`，且当前时间小于 `MINER_REWARD_START_AT` 时才能使用；使用钱包 USDT 支付，`payValue = price * SPACE_USDT_PRICE_WEI / 1e18`，`paymentToken = 1`。

返回：

```json
{
  "data": {
    "id": 1,
    "accountId": 1,
    "buyer": "0x...",
    "minerId": "1",
    "price": "100000000000000000000",
    "payValue": "100000000000000000000",
    "expectedReward": "500000000000000000000",
    "method": "wallet_balance",
    "paymentToken": 0,
    "nonce": "uuid",
    "deadline": 1710000300,
    "signature": "0x...",
    "status": "pending",
    "createdAt": 1710000000
  }
}
```

前端拿到后调用矿机合约：

```ts
purchaseMiner(minerId, price, payValue, expectedReward, paymentToken, nonce, deadline, signature)
```

调用成功后，前端需要把 `nonce` 提交给后端确认。

### 提交购买矿机 nonce

授权：公开。

```http
POST /miner/nonce
```

请求体：

```json
{
  "nonce": "uuid"
}
```

说明：

- 后端会异步查询链上 `usedPurchaseNonces`。
- 如果链上已使用，会落库购买矿机数据。
- 如果链上未使用，该接口不会退款，会保持 `pending`。
- 过期且链上未使用的签名，由后端定时任务退款。

### 查询购买矿机 nonce 处理状态

授权：需要登录。

```http
GET /miner/nonce/:nonce
```

参数：

| 参数 | 位置 | 说明 |
| --- | --- | --- |
| `nonce` | path | 购买矿机签名返回的 UUID nonce |

返回：

```json
{
  "data": {
    "id": 1,
    "accountId": 1,
    "buyer": "0x...",
    "minerId": "1",
    "price": "100000000000000000000",
    "payValue": "100000000000000000000",
    "expectedReward": "500000000000000000000",
    "method": "wallet_balance",
    "nonce": "uuid",
    "deadline": 1710000300,
    "signature": "0x...",
    "status": "pending",
    "createdAt": 1710000000
  }
}
```

如果没有查到：

```json
{
  "data": null
}
```

`status` 含义：

```txt
pending  后端尚未确认链上使用情况
used     链上 nonce 已使用，后端已处理购买成功
unused   签名过期且链上未使用，后端已退款
```

### 提交免费矿机领取 hash

授权：需要登录。

```http
POST /miner/free/hash
```

请求体：

```json
{
  "hash": "0x..."
}
```

说明：

- 前端先调用链上 `claimFreeMiner()`。
- 链上交易成功后，将交易 hash 提交给后端。
- 后端异步读取 receipt 并解析 `FreeMinerClaimed` 事件。
- 事件里的 `account` 必须等于当前登录用户地址。
- 免费矿机的最大累计产出 `expectedReward` 以事件里的 `spaceAmount` 为准。
- 校验通过后，后端创建免费矿机记录。

### 查询免费矿机 hash 处理状态

授权：需要登录。

```http
GET /miner/free/hash/:hash
```

返回：

```json
{
  "data": {
    "id": 1,
    "accountId": 1,
    "price": "40000000000000000000",
    "expectedReward": "200000000000000000000",
    "producedReward": "0",
    "claimedReward": "0",
    "cycle": 3024000,
    "cycleEndAt": 1713024000,
    "lastRewardAt": 1710000000,
    "rewardPerSecond": "9259259259259",
    "createdAt": 1710000000,
    "hash": "0x..."
  }
}
```

如果还没有处理完成或处理失败：

```json
{
  "data": null
}
```

### 查询我的免费矿机

授权：需要登录。

```http
GET /miner/free/my
```

返回：

```json
{
  "data": {
    "id": 1,
    "accountId": 1,
    "price": "40000000000000000000",
    "expectedReward": "200000000000000000000",
    "producedReward": "10000000000000000000",
    "claimedReward": "0",
    "availableReward": "10000000000000000000",
    "claimLimit": "20000000000000000000",
    "claimableReward": "10000000000000000000",
    "cycle": 3024000,
    "cycleEndAt": 1713024000,
    "lastRewardAt": 1710000000,
    "rewardPerSecond": "9259259259259",
    "createdAt": 1710000000,
    "hash": "0x..."
  }
}
```

如果没有免费矿机：

```json
{
  "data": null
}
```

说明：

- `availableReward = producedReward - claimedReward`。
- `claimLimit = 已购买付费矿机金额 * 20%`。
- `claimableReward = min(availableReward, claimLimit - claimedReward)`。

### 提取免费矿机奖励

授权：需要登录。

```http
POST /miner/free/claim-reward
```

说明：

- 免费矿机产出先暂存在矿机里，不会直接进入用户余额。
- 用户最多可累计提取已购买付费矿机金额的 `20%`。
- 本次提取数量为当前 `claimableReward`。
- 提取成功后，增加用户 `balance`，并写入 `free_miner_claim` 资金记录。

返回：

```json
{
  "data": {
    "freeMiner": {
      "id": 1,
      "producedReward": "10000000000000000000",
      "claimedReward": "10000000000000000000",
      "availableReward": "0",
      "claimLimit": "20000000000000000000",
      "claimableReward": "0"
    },
    "claimedAmount": "10000000000000000000",
    "balance": "10000000000000000000"
  }
}
```

## 前端推荐流程

### 登录流程

1. `GET /auth/account/:address/exists` 判断账户是否存在。
2. 如果存在，`GET /nonce/:address`。
3. 使用钱包签名登录消息。
4. `POST /auth/login`。
5. 保存 `access_token`。
6. 后续请求带 `Authorization: Bearer <token>`。

### 注册流程

1. `GET /nonce/:address`
2. 使用钱包签名注册消息。
3. `POST /auth/register`
4. 保存 `access_token`。

### 购买矿机流程

1. `GET /miner` 展示所有矿机，`GET /miner/my` 展示我的矿机。
2. `POST /miner/purchase` 获取签名。
3. 前端调用链上 `purchaseMiner(...)`。
4. 交易成功后 `POST /miner/nonce` 提交 nonce。
5. 轮询 `GET /miner/nonce/:nonce`。
6. `status = used` 后刷新 `GET /miner/my` 和 `GET /auth/profile`。

### 提现流程

1. `POST /account/withdraw` 获取签名。
2. 前端调用链上 `claim(...)`。
3. 后端定时任务自动确认 nonce 是否已使用。
4. 刷新 `GET /auth/profile` 和 `GET /account/balance-logs`。
