import { build } from "esbuild";

const shared = {
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
};

await build({ ...shared, entryPoints: ["server/entries/pedidos.ts"], outfile: "api/pedidos.js" });
await build({ ...shared, entryPoints: ["server/entries/fotos.ts"], outfile: "api/fotos.js" });
