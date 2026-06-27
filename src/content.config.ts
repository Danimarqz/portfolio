import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Posts live in src/content/blog as `<slug>.<lang>.md`. Language comes from frontmatter.
const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    lang: z.enum(["es", "en"]),
    heroImage: z.string().optional(),
  }),
});

export const collections = { blog };
