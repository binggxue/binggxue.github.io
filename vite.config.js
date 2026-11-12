import { defineConfig } from "vite";

// GitHub Pages 用户站点部署在根路径；使用相对路径让资源引用无子路径依赖
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
  },
});
