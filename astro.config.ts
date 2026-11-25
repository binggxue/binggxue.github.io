import {
  defineConfig,
  envField,
  fontProviders,
  svgoOptimizer,
} from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { rehypeHeadingIds, unified } from "@astrojs/markdown-remark";
import rehypeCallouts from "rehype-callouts";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/utils/transformers/fileName";
import { rehypeTableWrapper } from "./src/utils/rehypeTableWrapper";
import {
  inlineTocDeprecation,
  rehypeInlineToc,
} from "./src/utils/rehypeInlineToc";
import config from "./astro-paper.config";
import remarkMath from "remark-math"; 
import rehypeKatex from "rehype-katex"; 

export default defineConfig({
  site: config.site.url,
  integrations: [
    mdx(),
    sitemap({
      filter: page =>
        config.features?.showArchives !== false || !/\/archives\/?$/.test(page),
    }),
    inlineTocDeprecation(),
  ],
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: false,
    },
  },
  markdown: {
    // Deprecated: the theme no longer uses remark-toc or remark-collapse. They
    // stay in package.json so a customised config importing them still builds,
    // and are removed in v8.
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [
        rehypeHeadingIds,
        rehypeInlineToc,
        rehypeCallouts,
        rehypeTableWrapper,
        rehypeKatex,
      ],
    }),
    shikiConfig: {
      themes: { light: "min-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName({ style: "v2", hideDot: false }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: [
    {
      name: "Pagella",
      cssVariable: "--font-pagella",
      provider: fontProviders.local(),
      fallbacks: ["Noto Serif SC", "Source Han Serif SC", "serif"],
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/pagella/texgyrepagella-regular.woff2"],
            weight: 400,
            style: "normal",
            display: "swap",
          },
          {
            src: ["./src/assets/fonts/pagella/texgyrepagella-bold.woff2"],
            weight: 700,
            style: "normal",
            display: "swap",
          },
          {
            src: ["./src/assets/fonts/pagella/texgyrepagella-italic.woff2"],
            weight: 400,
            style: "italic",
            display: "swap",
          },
          {
            src: ["./src/assets/fonts/pagella/texgyrepagella-bolditalic.woff2"],
            weight: 700,
            style: "italic",
            display: "swap",
          },
        ],
      },
    },
    {
      name: "EB Garamond",
      cssVariable: "--font-garamond",
      provider: fontProviders.local(),
      fallbacks: ["Noto Serif SC", "Source Han Serif SC", "serif"],
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/eb-garamond/ebgaramond-regular.woff2"],
            weight: 400,
            style: "normal",
            display: "swap",
          },
          {
            src: ["./src/assets/fonts/eb-garamond/ebgaramond-bold.woff2"],
            weight: 700,
            style: "normal",
            display: "swap",
          },
          {
            src: ["./src/assets/fonts/eb-garamond/ebgaramond-italic.woff2"],
            weight: 400,
            style: "italic",
            display: "swap",
          },
          {
            src: ["./src/assets/fonts/eb-garamond/ebgaramond-bolditalic.woff2"],
            weight: 700,
            style: "italic",
            display: "swap",
          },
        ],
      },
    },
    {
      name: "JetBrains Mono",
      cssVariable: "--font-jetbrains-mono",
      provider: fontProviders.local(),
      fallbacks: [
        "ui-monospace",
        "SFMono-Regular",
        "Menlo",
        "Consolas",
        "monospace",
      ],
      options: {
        variants: [
          {
            src: [
              "./src/assets/fonts/jetbrains-mono/JetBrainsMono-Regular.woff2",
            ],
            weight: 400,
            style: "normal",
            display: "swap",
          },
          {
            src: ["./src/assets/fonts/jetbrains-mono/JetBrainsMono-Bold.woff2"],
            weight: 700,
            style: "normal",
            display: "swap",
          },
          {
            src: [
              "./src/assets/fonts/jetbrains-mono/JetBrainsMono-Italic.woff2",
            ],
            weight: 400,
            style: "italic",
            display: "swap",
          },
          {
            src: [
              "./src/assets/fonts/jetbrains-mono/JetBrainsMono-BoldItalic.woff2",
            ],
            weight: 700,
            style: "italic",
            display: "swap",
          },
        ],
      },
    },
    {
      //Only for Satori to generate OG images, not output to the page via <Font>
      name: "Google Sans Code",
      cssVariable: "--font-google-sans-code",
      provider: fontProviders.local(),
      fallbacks: ["monospace"],
      options: {
        variants: [
          {
            src: [
              "./src/assets/fonts/google-sans-code/GoogleSansCode-Regular.ttf",
            ],
            weight: 400,
            style: "normal",
          },
          {
            src: [
              "./src/assets/fonts/google-sans-code/GoogleSansCode-Bold.ttf",
            ],
            weight: 700,
            style: "normal",
          },
        ],
      },
    },
  ],
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
  experimental: {
    svgOptimizer: svgoOptimizer(),
  },
});
