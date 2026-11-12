import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
mkdirSync("www", { recursive: true });
await build({ entryPoints: ["src/native-shim.js"], bundle: true, minify: true, format: "iife", outfile: "www/native-shim.js", target: "chrome90" });
let html = readFileSync("web/index.html", "utf8");
if (!html.includes("native-shim.js")) html = html.replace("<script>", '<script src="native-shim.js"></script>\n<script>');
writeFileSync("www/index.html", html);
console.log("web assets built");
