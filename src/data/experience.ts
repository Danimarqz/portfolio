import type TranslationMessages from "@/types.d.ts"

// Timeline accent per milestone. Order: most recent first.
export type Accent = "cyan" | "green" | "dim"

export function getExperience(m: TranslationMessages) {
  return [
    {
      id: "full_and_fast",
      accent: "cyan" as Accent,
      date: m.exp_ff_date,
      role: m.exp_ff_role,
      company: m.exp_ff_company,
      description: m.exp_ff_desc,
    },
    {
      id: "opositatcae",
      accent: "green" as Accent,
      date: m.exp_op_date,
      role: m.exp_op_role,
      company: m.exp_op_company,
      description: m.exp_op_desc,
    },
    {
      id: "saecdata",
      accent: "dim" as Accent,
      date: m.exp_sd_date,
      role: m.exp_sd_role,
      company: m.exp_sd_company,
      description: m.exp_sd_desc,
    },
    {
      id: "big_formacion",
      accent: "dim" as Accent,
      date: m.exp_big_date,
      role: m.exp_big_role,
      company: m.exp_big_company,
      description: m.exp_big_desc,
    },
  ]
}
