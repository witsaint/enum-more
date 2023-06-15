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


 ### 准备
 
 ```
 npm install -g vsce

 vsce package
 // 这里如果提示了README有问题可以换名打包，不要README

vsce create-publisher
// 如果没有账户在这一步请先申请微软开发者账户、拿到token 进行绑定账号
 vsce publish 
 // 这里可能401，可换https://marketplace.visualstudio.com/manage上直接上传
 ```
### 开发
```
mac: fn + F5
window: f5
```


