import type { Config } from "tailwindcss";
export default { darkMode:"media", content:["./src/**/*.{ts,tsx}"], theme:{extend:{colors:{zenith:{50:"#fffbea",400:"#efd567",500:"#d9b93f",600:"#b69122",950:"#211a06"}},boxShadow:{glow:"0 0 40px rgba(229,197,83,.18)"}}},plugins:[] } satisfies Config;
