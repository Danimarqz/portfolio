import type TranslationMessages from "@/types.d.ts"

// Projects render as cards. `icon` maps to an inline SVG in ProjectCard.astro.
// `stack` is plain mono text — no per-tag brand icons here, the stack graph covers that.
export type ProjectStatus = "production" | "selfhosted"
export type ProjectIcon = "bolt" | "robot" | "wallet" | "server" | "code"

export function getProjects(m: TranslationMessages) {
  return [
    {
      id: "motor_v27",
      icon: "bolt" as ProjectIcon,
      status: "production" as ProjectStatus,
      title: m.proj_motor_title,
      description: m.proj_motor_desc,
      stack: ["Python", "Lambda", "NumPy", "SAM"],
      href: undefined as string | undefined,
    },
    {
      id: "agents_oposita",
      icon: "robot" as ProjectIcon,
      status: "production" as ProjectStatus,
      title: m.proj_agents_title,
      description: m.proj_agents_desc,
      stack: ["Bedrock", "Textract", "Graviton", "SAM"],
      href: "https://opositatcae.com/",
    },
    {
      id: "finance_tracker",
      icon: "wallet" as ProjectIcon,
      status: "production" as ProjectStatus,
      title: m.proj_finance_title,
      description: m.proj_finance_desc,
      stack: ["Go", "DynamoDB", "Cloudflare"],
      href: undefined,
    },
    {
      id: "oposita_simulator",
      icon: "code" as ProjectIcon,
      status: "production" as ProjectStatus,
      title: m.proj_sim_title,
      description: m.proj_sim_desc,
      stack: ["Go", "Astro", "PostgreSQL", "Redis"],
      href: "https://github.com/Danimarqz/inscripcion-moodle",
    },
    {
      id: "daniserver",
      icon: "server" as ProjectIcon,
      status: "selfhosted" as ProjectStatus,
      title: m.proj_server_title,
      description: m.proj_server_desc,
      stack: ["Docker", "Ollama", "Qwen3"],
      href: undefined,
    },
  ]
}
