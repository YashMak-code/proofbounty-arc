import { build } from "esbuild";

await build({
  entryPoints: ["web/app.js"],
  outfile: "web/app.bundle.js",
  bundle: true,
  format: "esm",
  minify: true,
  sourcemap: false,
  target: "es2022",
  legalComments: "none",
});

await build({
  entryPoints: ["tools/wallet-deployer/deploy.js"],
  outfile: "tools/wallet-deployer/deploy.bundle.js",
  bundle: true,
  format: "esm",
  minify: true,
  sourcemap: false,
  target: "es2022",
  legalComments: "none",
});

console.log("Built web/app.bundle.js and tools/wallet-deployer/deploy.bundle.js");
