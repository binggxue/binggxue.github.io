/** @type {import('stylelint').Config} */
module.exports = {
  extends: "stylelint-config-standard",
  rules: {
    // 允许非标准字重值（项目中使用了 650/740/750 等）
    "font-weight-notation": null,
    // 允许 kebab-case 自定义属性
    "custom-property-pattern": null,
    // 允许 BEM-like 与 kebab-case 混用
    "selector-class-pattern": null,
    // 允许驼峰 id（项目 HTML 中大量使用，如 todayDate、weekSelect、dialogContent）
    "selector-id-pattern": null,
    // 暂不强制要求去重选择器（media query 中重复合理）
    "no-duplicate-selectors": null,
    // 允许 _ 前缀私有变量
    "custom-property-no-missing-var-function": null,
    // 允许选择器出现顺序（现有代码组织合理但非严格优先级排序）
    "no-descending-specificity": null,
    // 项目未使用 Autoprefixer，允许手动写浏览器前缀
    "property-no-vendor-prefix": null,
    "value-no-vendor-prefix": null,
    // 允许带浏览器前缀的属性与标准属性共存（如 -webkit-mask-image 与 mask-image）
    "declaration-block-no-duplicate-properties": [
      true,
      { ignore: ["consecutive-duplicates-with-different-values"] },
    ],
  },
};
