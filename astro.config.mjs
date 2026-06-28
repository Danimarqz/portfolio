import { defineConfig } from 'astro/config'
import tailwindcss from "@tailwindcss/vite"
import robotsTxt from "astro-robots-txt"
import sitemap from "@astrojs/sitemap"
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import cloudflare from '@astrojs/cloudflare';

// Generates one OG card (1200x630 PNG) per blog post + a generic "site" card,
// written to dist/og/. Uses satori (SVG) + resvg (PNG) — both pure-Node, so they
// run fine in this build hook (unlike canvaskit, which needs Node fs/path the
// Cloudflare workerd prerender doesn't provide).
const BLOG_DIR = "src/content/blog"
const FONT = (w) => `https://api.fontsource.org/v1/fonts/onest/latin-${w}-normal.ttf`

// ponytail: regex frontmatter, not a YAML parser. Single-line title/description
// only — fine for this controlled content. Swap to a YAML parse if a post ever
// needs multiline or quoted-colon frontmatter.
const field = (src, key) => {
  const m = src.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : ""
}

// satori takes a React-element-like object tree (no JSX needed).
const el = (type, style, children) => ({ type, props: { style, children } })
const cardTree = (title, description) =>
  el("div", {
    width: 1200, height: 630, display: "flex", flexDirection: "column",
    justifyContent: "space-between", backgroundColor: "#0a0e16", color: "#fff",
    padding: "70px", borderLeft: "16px solid #38bdf8", fontFamily: "Onest",
  }, [
    el("div", { fontSize: 30, color: "#aaaab9" }, "Daniel Márquez"),
    el("div", { display: "flex", flexDirection: "column" }, [
      el("div", { fontSize: 64, fontWeight: 700, lineHeight: 1.2 }, title),
      el("div", { fontSize: 30, color: "#aaaab9", marginTop: 24, lineHeight: 1.4 }, description),
    ]),
    el("div", { fontSize: 26, color: "#38bdf8" }, "danimarqz.dev"),
  ])

const ogCards = {
  name: "og-cards",
  hooks: {
    "astro:build:done": async ({ dir }) => {
      const { default: satori } = await import("satori")
      const { Resvg } = await import("@resvg/resvg-js")
      const [r400, r700] = await Promise.all([fetch(FONT(400)), fetch(FONT(700))])
      const fonts = [
        { name: "Onest", weight: 400, style: "normal", data: await r400.arrayBuffer() },
        { name: "Onest", weight: 700, style: "normal", data: await r700.arrayBuffer() },
      ]
      const outRoot = fileURLToPath(dir)
      const emit = async (route, title, description) => {
        const svg = await satori(cardTree(title, description), { width: 1200, height: 630, fonts })
        const png = new Resvg(svg).render().asPng()
        const out = join(outRoot, "og", `${route}.png`)
        mkdirSync(dirname(out), { recursive: true })
        writeFileSync(out, png)
      }
      await emit("site", "Daniel Márquez", "Backend & Cloud Engineer · Go · AWS · Bedrock")
      for (const rel of readdirSync(BLOG_DIR, { recursive: true })) {
        if (!/\.mdx?$/.test(rel)) continue
        const src = readFileSync(join(BLOG_DIR, rel), "utf8")
        await emit(rel.replace(/\.mdx?$/, ""), field(src, "title"), field(src, "description"))
      }
    },
  },
}

// https://astro.build/config
export default defineConfig({
  integrations: [
    robotsTxt(),
    sitemap(),
    ogCards,
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  site: 'https://danimarqz.dev/',
  output: 'static',
  adapter: cloudflare(),
})