import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://binggxue.github.io/",
    title: "Binggxue's Homepage",
    description: "Binggxue's personal homepage built with Astro and Astro Paper theme.",
    author: "Bing Xue",
    profile: "https://github.com/binggxue",
    ogImage: "default-og.jpg",
    lang: "en",
    timezone: "Asia/Shanghai",
    dir: "ltr",
  },
  posts: {
    perPage: 4,
    perIndex: 4,
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
    { name: "mail",     url: "mailto:binggxue@outlook.com" },
  ],
});