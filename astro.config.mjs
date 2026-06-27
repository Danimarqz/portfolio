import { defineConfig } from 'astro/config'
import tailwindcss from "@tailwindcss/vite"
import robotsTxt from "astro-robots-txt"
import sitemap from "@astrojs/sitemap"

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  integrations: [
    robotsTxt(),
    sitemap(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  site: 'https://danimarqz.dev/',
  output: 'static',
  adapter: cloudflare(),
})