# c-for-cook

> 根据食材列表自动推荐菜谱

- 食材来自 https://monday.com/ （需手工维护列表）
- 菜谱来自 http://www.recipepuppy.com/
- 每次刷新页面自动推荐12道正餐和2道方便菜品
- 无任何广告，无任何JavaScript
- 中英文对照，增加词汇量

## Usage

Note: You may want to leverage the [pre-built docker image](https://hub.docker.com/r/b1f6c1c4/c-for-cook)

1. 创建`secret.json5`:

    ```json5
    {
      monday: {
        apiKey: "...", // 左下角头像->Admin->API
        bId: ..., // 打开对应的board，从URL中可以直接找到
        cIds: { // 见下方说明
          key: '...',
          category: '...',
          location: '...',
          expire: '...',
          quantity: '...',
          genre: '...',
          tier: '...',
        },
      },
      translate: { // Google Translate API
        apiKey: "...",
      },
    }
    ```

    关于`cIds`：在 https://monday.com/developers/v2/try-it-yourself 执行以下查询：
    ```
    {
        boards(ids: ...) { // 填入bId
            columns {
                id
                title
            }
        }
    }
    ```

1. 执行`npm i -g nodemon`
1. 执行`npm i`
1. 执行`npm start`
1. 访问`http://localhost:3000`
