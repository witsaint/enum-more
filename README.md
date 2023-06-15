# enum-more README

This is the README for your extension "enum-more". After writing up a brief description, we recommend including the following sections.

## Features
- 结合 enumer 使用
- 支持同文件、跨文件声明使用
- 支持ts、tsx文件类型
- 友善提示
- 丰富api

 ```javascript
//  A.ts
export const StatusEnum = enumer([
  ['success', 1, '成功']
  ['failure', 2, '失败']
])
// 触发提示
StatusEnum.
 ```