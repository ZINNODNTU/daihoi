import type {CongressKind} from "@/components/brand-mark";

/** Shared, static Tailwind tokens for the two official congress identities.
 * Keep every class literal so Tailwind can compile both palettes.
 */
export const delegateBrandTheme={
 doan:{
  accent:"text-[#ae2635]",
  accentStrong:"text-[#9e2332]",
  eyebrow:"text-[#ad3441]",
  cta:"bg-[#bb2939] text-white hover:bg-[#a72232] focus-visible:ring-[#efb1ba]",
  soft:"bg-[#fff0ef]",
  tint:"bg-[#fff6f4]",
  border:"border-[#efd6d3]",
  header:"bg-[linear-gradient(130deg,#fffcf7_0%,#fff0ec_55%,#f1f8ff_100%)]",
  panel:"bg-[linear-gradient(145deg,#fff9f4_0%,#ffffff_58%,#f0f7ff_100%)]",
  stripe:"bg-[linear-gradient(90deg,#c32639_0%,#edbe64_54%,#2a91b6_100%)]",
  chip:"border-[#f1d3d0] bg-white/90 text-[#a42a39]",
  icon:"bg-[#fff1e9] text-[#b02b3e]",
  secondary:"border-[#eccdca] bg-[#fff7f5] text-[#97313c] hover:bg-[#ffecea]",
  seat:"border-[#f1dbd6] bg-[#fff8f5]",
  accentBorder:"border-[#c63a48]"
 },
 hoi_sinh_vien:{
  accent:"text-[#166d9b]",
  accentStrong:"text-[#0e608d]",
  eyebrow:"text-[#277da6]",
  cta:"bg-[#1279ae] text-white hover:bg-[#0b6797] focus-visible:ring-[#a8d9ef]",
  soft:"bg-[#e9f6ff]",
  tint:"bg-[#f1f9ff]",
  border:"border-[#cfe4ef]",
  header:"bg-[linear-gradient(130deg,#ffffff_0%,#e8f5ff_56%,#fff8e7_100%)]",
  panel:"bg-[linear-gradient(145deg,#f2faff_0%,#ffffff_58%,#fff9ed_100%)]",
  stripe:"bg-[linear-gradient(90deg,#1075a9_0%,#66bae2_55%,#ebc068_100%)]",
  chip:"border-[#c9e1ef] bg-white/90 text-[#156b99]",
  icon:"bg-[#e8f5fe] text-[#1577a7]",
  secondary:"border-[#cbdfea] bg-[#f1f9ff] text-[#206f96] hover:bg-[#e4f4ff]",
  seat:"border-[#d2e4ee] bg-[#f2faff]",
  accentBorder:"border-[#257fae]"
 }
} as const;

export function delegateTheme(kind:CongressKind){
 return delegateBrandTheme[kind];
}
