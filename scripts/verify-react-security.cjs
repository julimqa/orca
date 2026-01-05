/* eslint-disable no-console */
/**
 * CI guardrail:
 * - Fail if React major is 19 (CVE-2025-55182 / React2Shell is RSC + React 19 focused)
 * - Fail if any react-server-dom-* package is present in the lockfile
 *
 * This project is a Vite SPA (no RSC). We keep React pinned to 18.x.
 */

const fs = require("node:fs");
const path = require("node:path");

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function major(version) {
  const m = String(version).match(/^(\d+)\./);
  return m ? Number(m[1]) : null;
}

function main() {
  const lockPath = path.resolve(process.cwd(), "package-lock.json");
  if (!fs.existsSync(lockPath)) {
    console.error(`[verify-react-security] Missing lockfile: ${lockPath}`);
    process.exit(1);
  }

  const lock = readJson(lockPath);
  const packages = lock && lock.packages ? lock.packages : {};

  // Detect any react-server-dom-* usage (RSC related)
  const rscKeys = Object.keys(packages).filter((k) =>
    /(^|\/)node_modules\/react-server-dom-/.test(k)
  );
  if (rscKeys.length > 0) {
    console.error("[verify-react-security] Found react-server-dom-* packages in lockfile:");
    for (const k of rscKeys) console.error(`- ${k} (${packages[k]?.version ?? "unknown"})`);
    process.exit(1);
  }

  // Ensure React stays on 18.x for this repo
  const reactPkg = packages["node_modules/react"];
  const reactDomPkg = packages["node_modules/react-dom"];
  const reactV = reactPkg?.version;
  const reactDomV = reactDomPkg?.version;

  if (!reactV || !reactDomV) {
    console.error(
      `[verify-react-security] Could not find react/react-dom versions in lockfile (react=${reactV}, react-dom=${reactDomV}).`
    );
    process.exit(1);
  }

  const reactMajor = major(reactV);
  const reactDomMajor = major(reactDomV);

  if (reactMajor === 19 || reactDomMajor === 19) {
    console.error(
      `[verify-react-security] React major version must not be 19 in this repo. Detected react=${reactV}, react-dom=${reactDomV}`
    );
    process.exit(1);
  }

  console.log(
    `[verify-react-security] OK (react=${reactV}, react-dom=${reactDomV}; no react-server-dom-* detected)`
  );
}

main();


