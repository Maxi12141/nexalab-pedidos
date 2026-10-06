import { build } from "esbuild";
import { rm } from "node:fs/promises";

const shared = {
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
};

await build({ ...shared, entryPoints: ["api/pedidos.ts"], outfile: "api/pedidos.js" });
await build({ ...shared, entryPoints: ["api/fotos.ts"], outfile: "api/fotos.js" });

if (process.env.VERCEL) {
  await rm("api/pedidos.ts");
  await rm("api/fotos.ts");
}
