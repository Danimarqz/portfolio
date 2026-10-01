import type TranslationMessages from "@/types.d.ts"

// Projects render as cards. `icon` maps to an inline SVG in ProjectCard.astro.
// `stack` is plain mono text — no per-tag brand icons here, the stack graph covers that.
export type ProjectStatus = "production" | "selfhosted"
export type ProjectIcon = "bolt" | "robot" | "wallet" | "server" | "code" | "motorcycle"

export interface Project {
  id: string
  icon: ProjectIcon
  status: ProjectStatus
  statusLabel: string
  title: string
  description: string
  metric?: string
  highlights: string[]
  stack: string[]
  primaryUrl?: string
  primaryLabel?: string
  articleUrl?: string
}

const blogUrl = (lang: string, slug: string) => `${lang === "es" ? "/es" : ""}/blog/${slug}/`

export function getProjects(m: TranslationMessages): Project[] {
  return [
    {
      id: "impronta",
      icon: "server",
      status: "production",
      statusLabel: m.status_pilot,
      title: m.proj_impronta_title,
      description: m.proj_impronta_desc,
      metric: "4.6M+ invocations / client / month",
      highlights: [m.proj_impronta_highlight_1, m.proj_impronta_highlight_2, m.proj_impronta_highlight_3],
      stack: ["Go", "AWS Lambda", "DynamoDB", "S3", "CloudFront", "HLS"],
      primaryUrl: "https://impronta.video",
      primaryLabel: m.proj_visit_impronta,
    },
    {
      id: "opositatcae",
      icon: "robot",
      status: "production",
      statusLabel: m.status_production,
      title: m.proj_oposita_title,
      description: m.proj_oposita_desc,
      highlights: [m.proj_oposita_highlight_1, m.proj_oposita_highlight_2, m.proj_oposita_highlight_3],
      stack: ["Go", "AWS", "DynamoDB", "S3 Vectors", "Moodle", "Redsys"],
      primaryUrl: "https://opositatcae.com/",
      primaryLabel: m.proj_visit_product,
      articleUrl: blogUrl(m.lang, "fastapi-to-go-migration"),
    },
    {
      id: "finance_tracker",
      icon: "wallet",
      status: "production",
      statusLabel: m.status_production,
      title: m.proj_finance_title,
      description: m.proj_finance_desc,
      highlights: [m.proj_finance_highlight_1, m.proj_finance_highlight_2, m.proj_finance_highlight_3],
      stack: ["Go", "Lambda", "S3", "DynamoDB", "SAM"],
      articleUrl: blogUrl(m.lang, "finance-tracker-serverless"),
    },
    {
      id: "ride_tracker",
      icon: "motorcycle",
      status: "selfhosted",
      statusLabel: m.status_selfhosted,
      title: m.proj_ride_title,
      description: m.proj_ride_desc,
      highlights: [m.proj_ride_highlight_1, m.proj_ride_highlight_2, m.proj_ride_highlight_3],
      stack: ["Kotlin", "Flutter", "Android sensors", "GPS", "Cloudflare D1"],
    },
    {
      id: "sizing",
      icon: "bolt",
      status: "production",
      statusLabel: m.status_production,
      title: m.proj_sizing_title,
      description: m.proj_sizing_desc,
      highlights: [m.proj_sizing_highlight_1, m.proj_sizing_highlight_2, m.proj_sizing_highlight_3],
      stack: ["Python", "NumPy", "AWS Lambda", "SAM"],
      articleUrl: blogUrl(m.lang, "api-gateway-29s"),
    },
  ]
}
