import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://binggxue.github.io/",
    title: "Bing Xue's Homepage",
    description: "Bing Xue's personal homepage built with Astro and Astro Paper theme.",
    author: "Bing Xue",
    profile: "https://github.com/binggxue",
    ogImage: "default-og.jpg",
    lang: "en",
    timezone: "Asia/Shanghai",
    dir: "ltr",
  },
  posts: {
    perPage: 10,
    perIndex: 10,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    editPost: {
      enabled: false,
    },
    search: "pagefind",
    toc: true,
  },
  socials: [
    { name: "github",   url: "https://github.com/binggxue" },
    { name: "bilibili", url: "https://space.bilibili.com/396264807" },
    { name: "zhihu", url: "https://www.zhihu.com/people/binggxue" },
    { name: "mail",     url: "mailto:binggxue@outlook.com" },
  ],
  shareLinks: [
    { name: "whatsapp", url: "https://wa.me/?text=" },
    { name: "facebook", url: "https://www.facebook.com/sharer.php?u=" },
    { name: "x", url: "https://x.com/intent/post?url=" },
    { name: "telegram", url: "https://t.me/share/url?url=" },
    { name: "mail", url: "mailto:?subject=See%20this%20post&body=" },
  ],
});