import path from "path";
import fs from "fs";

const root = import.meta.dir;
const entrypoint = path.join(root, "src/main.tsx");
const outdir = path.join(root, "../static/web");

// Clean _next output dir
const nextDir = path.join(outdir, "_next");
if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true, force: true });
}
fs.mkdirSync(nextDir, { recursive: true });

console.log("→ Building JS bundle...");
const result = await Bun.build({
  entrypoints: [entrypoint],
  outdir,
  target: "browser",
  format: "esm",
  splitting: true,
  minify: true,
  sourcemap: "linked",
  naming: "_next/[name]-[hash].[ext]",
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

const jsFiles = result.outputs.filter((o: any) => o.path.endsWith(".js"));
const entryFile = jsFiles.find((o: any) => o.path.includes("main"));
const entryName = entryFile ? path.relative(outdir, entryFile.path).replace(/\\/g, "/") : "_next/main.js";

// Find CSS output
const cssFiles = result.outputs.filter((o: any) => o.path.endsWith(".css"));
const cssEntry = cssFiles.find((o: any) => o.path.includes("main"));
const cssName = cssEntry ? path.relative(outdir, cssEntry.path).replace(/\\/g, "/") : "";

console.log(`  ✓ ${result.outputs.length} files written`);

console.log("→ Building CSS...");
const tailwindBin = path.join(root, "node_modules", ".bin", "tailwindcss");
const cssIn = path.join(root, "src/index.css");
const cssOut = path.join(outdir, "_next/tailwind.css");
const twProc = Bun.spawnSync([tailwindBin, "-i", cssIn, "-o", cssOut, "--minify"], { cwd: root });
if (twProc.exitCode !== 0) {
  console.error("Tailwind CSS build failed:", twProc.stderr.toString());
  process.exit(1);
}
console.log("  ✓ CSS compiled");

// Generate index.html with Go template variables
// The Go backend parses this as a Go template and injects server-side data.
// {{.Nonce}}, {{.Name}}, {{.StatusJSON}}, {{.ServerConfigJSON}} are Go template vars.
const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="icon" type="image/png" sizes="32x32" href="/img/favicon/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/img/favicon/favicon-16x16.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/img/favicon/apple-icon-180x180.png" />
    <title>{{.Name}}</title>
    ${cssName ? `<link rel="stylesheet" href="/${cssName}" />` : ""}
    <link rel="stylesheet" href="/_next/tailwind.css" />
    <base target="_blank" />
  </head>
  <body>
    <script nonce="{{.Nonce}}">
      // Prevent flash of wrong theme — runs before first paint
      (function(){
        var d=localStorage.getItem('theme');
        var dark=d==='dark'||(d===null&&true); // default dark for streaming
        if(dark)document.documentElement.classList.add('dark');
        var t=localStorage.getItem('oni_theme');
        if(t&&t!=='neutral')document.documentElement.classList.add('theme-'+t);
      })();
      window.configHydration = {{.ServerConfigJSON}};
      window.statusHydration = {{.StatusJSON}};
    </script>
    <div id="root"></div>
    <script type="module" src="/${entryName}"></script>
  </body>
</html>`;

await Bun.write(path.join(outdir, "index.html"), html);
console.log("  ✓ index.html generated (with Go template vars)");

// Copy static assets from public/
const publicDir = path.join(root, "public");
if (fs.existsSync(publicDir)) {
  const glob = new Bun.Glob("**/*");
  const files: string[] = [];
  for await (const file of glob.scan(publicDir)) {
    files.push(file);
    const src = path.join(publicDir, file);
    const dest = path.join(outdir, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    await Bun.write(dest, Bun.file(src));
  }
  console.log(`  ✓ ${files.length} static assets copied`);
} else {
  console.log("  ⚠ No public/ directory found, skipping static assets");
}

console.log("✓ Build complete → static/web/");
