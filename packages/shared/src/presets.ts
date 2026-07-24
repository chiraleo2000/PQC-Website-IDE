import { createNode, type AstNode } from "./ast.js";

export type SectionPresetId = "hero" | "nav" | "footer" | "form";

export const SECTION_PRESETS: Array<{
  id: SectionPresetId;
  label: string;
  description: string;
}> = [
  { id: "hero", label: "Hero", description: "Heading, text, and CTA button" },
  { id: "nav", label: "Nav", description: "Simple top navigation links" },
  { id: "footer", label: "Footer", description: "Copyright and links strip" },
  { id: "form", label: "Form", description: "Label, input, and submit" },
];

export function createSectionPreset(id: SectionPresetId): AstNode {
  switch (id) {
    case "hero":
      return createNode("section", {
        className: "px-8 py-16 text-center bg-white",
      }, [
        createNode("h1", { children: "Welcome to your site", className: "text-4xl font-bold text-zinc-900 mb-4" }),
        createNode("p", {
          children: "Build visually. Save encrypts with ML-KEM + ML-DSA.",
          className: "text-lg text-zinc-600 mb-6 max-w-xl mx-auto",
        }),
        createNode("button", { children: "Get started", className: "px-5 py-2.5 rounded-xl bg-cyan-600 text-white font-semibold" }),
      ]);
    case "nav":
      return createNode("nav", {
        className: "flex items-center justify-between gap-4 px-6 py-4 border-b border-zinc-200 bg-white",
      }, [
        createNode("a", { children: "Brand", href: "#", className: "font-semibold text-zinc-900" }),
        createNode("div", { className: "flex gap-4" }, [
          createNode("a", { children: "Home", href: "#", className: "text-zinc-600 hover:text-zinc-900" }),
          createNode("a", { children: "About", href: "#", className: "text-zinc-600 hover:text-zinc-900" }),
          createNode("a", { children: "Contact", href: "#", className: "text-zinc-600 hover:text-zinc-900" }),
        ]),
      ]);
    case "footer":
      return createNode("footer", {
        className: "px-6 py-8 border-t border-zinc-200 bg-zinc-50 text-zinc-500 text-sm flex justify-between gap-4",
      }, [
        createNode("p", { children: "© Your Site. All rights reserved." }),
        createNode("div", { className: "flex gap-4" }, [
          createNode("a", { children: "Privacy", href: "#", className: "hover:text-zinc-800" }),
          createNode("a", { children: "Terms", href: "#", className: "hover:text-zinc-800" }),
        ]),
      ]);
    case "form":
      return createNode("form", {
        className: "p-6 max-w-md mx-auto space-y-4 bg-white border border-zinc-200 rounded-2xl",
      }, [
        createNode("h2", { children: "Contact us", className: "text-xl font-semibold text-zinc-900" }),
        createNode("label", { children: "Email", for: "email", className: "block text-sm text-zinc-600" }),
        createNode("input", {
          type: "email",
          name: "email",
          placeholder: "you@example.com",
          className: "w-full rounded-xl border border-zinc-300 px-3 py-2",
        }),
        createNode("button", {
          children: "Send",
          type: "submit",
          className: "w-full rounded-xl bg-cyan-600 text-white font-semibold py-2.5",
        }),
      ]);
  }
}
