import { defineConfig } from "vite";
import { resolve } from "node:path";

// 多入口：个人主页 + 完整课程表
export default defineConfig({
  // GitHub Pages 用户站点部署在根路径；使用相对路径让资源引用无子路径依赖
  base: "./",
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        courses: resolve(__dirname, "courses.html"),
      },
    },
  },
});
