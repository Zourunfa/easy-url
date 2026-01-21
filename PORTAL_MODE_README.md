# Portal模式使用说明

## 功能概述

扩展现在支持两种模式：

### 1. Local模式（原有功能）
- 编辑当前页面的URL参数
- 解析和编辑 `_openx_header` 参数
- 使用JSON编辑器修改header对象
- 刷新当前URL或在新标签页打开

### 2. Portal模式（新增功能）
- 自动检测包含"portal"关键词的页面
- 解析页面中的所有tab标签
- 提取每个tab对应的iframe地址
- 展示tab名称、ID和完整的iframe URL
- 支持一键复制iframe地址

## 使用方法

1. **打开扩展侧边栏**
   - 点击浏览器工具栏中的扩展图标
   - 或使用快捷键打开侧边栏

2. **切换到Portal模式**
   - 在侧边栏顶部点击"Portal模式"标签
   - 确保当前页面URL包含"portal"关键词

3. **加载Portal页面信息**
   - 点击"刷新"按钮
   - 扩展会自动解析页面HTML
   - 提取所有tab的信息

4. **查看结果**
   - 每个tab会显示：
     - Tab名称
     - Tab ID
     - 对应的iframe完整URL
   - 点击"复制"按钮可以复制iframe地址

## 技术实现

### HTML结构要求
Portal模式会查找以下HTML结构：

```html
<div role="tablist" class="el-tabs__nav">
  <div id="tab-{id}" class="el-tabs__item">Tab名称</div>
</div>

<iframe id="{id}iframe" src="iframe地址"></iframe>
```

### 权限说明
扩展需要以下权限：
- `tabs`: 访问标签页信息
- `activeTab`: 访问当前活动标签页
- `scripting`: 执行脚本读取页面HTML
- `sidePanel`: 显示侧边栏

## 示例输出

根据你提供的HTML示例，Portal模式会提取：

1. **Tab: 结算单查询**
   - ID: 753576832464601088
   - iframe: https://chief-te.pharmacyyf.com/front/yfdyf-pay-web/index.html#/localOrder?...

2. **Tab: 目录对照上传**
   - ID: 753576477890723840
   - iframe: https://chief-te.pharmacyyf.com/front/yfdyf-pay-web/index.html#/medMenuUpload?...

3. **Tab: 赠品映射关系**
   - ID: 753576324786044928
   - iframe: http://yf-test-oss.yifengx.com/webtest/test/storeGiftAdmin/product.html?...

## 注意事项

- 页面URL必须包含"portal"关键词才能使用Portal模式
- 页面必须包含符合Element UI tabs结构的HTML
- 需要等待页面完全加载后再点击刷新按钮
- 如果页面结构不匹配，会显示相应的错误提示
