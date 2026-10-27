#!/usr/bin/env node
/**
 * Verifies that every built workspace library can actually be resolved by Node
 * before the test suites consume it.
 *
 * Why this exists
 * ---------------
 * The workspace packages are consumed through their built `dist/` output, not
 * their TypeScript sources. When a build is skipped, cached or partially
 * failed, nothing complains until a test or the release packaging blows up
 * with a confusing error, e.g.:
 *
 *   TypeError: Cannot destructure property 'toBool' of 'r.utils' as it is undefined.
 *     at packages/bruno-filestore/src/formats/yml/items/parseHttpRequest.ts:16
 *
 *   TS2307: Cannot find module '@usebruno/schema-types/collection/item'
 *
 * Running this right after the "Build libraries" step turns those into a
 * single, actionable failure that names the package with missing output.
 *
 * The check uses Node's own resolver (`require.resolve`) against the real
 * entry points declared in each `package.json`, so it stays correct when a
 * package changes its `main` / `exports` layout.
 *
 * Usage: node .github/scripts/verify-library-builds.js
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const listWorkspacePackages = () => {
  return fs
    .readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(PACKAGES_DIR, entry.name))
    .filter((dir) => fs.existsSync(path.join(dir, 'package.json')))
    .map((dir) => ({ dir, pkg: readJson(path.join(dir, 'package.json')) }))
    .filter(({ pkg }) => Boolean(pkg.name));
};

/** Concrete (non-wildcard) subpath specifiers declared in `exports`. */
const collectSpecifiers = (pkg) => {
  const specifiers = new Set([pkg.name]);

  if (pkg.exports && typeof pkg.exports === 'object' && !Array.isArray(pkg.exports)) {
    for (const key of Object.keys(pkg.exports)) {
      if (!key.startsWith('./')) continue;
      // Wildcards cannot be resolved without a concrete request; the root
      // entry point is checked instead, which is where a broken build shows up.
      if (key.includes('*')) continue;
      specifiers.add(key === '.' ? pkg.name : `${pkg.name}${key.slice(1)}`);
    }
  }

  return [...specifiers];
};

const main = () => {
  const packages = listWorkspacePackages();
  const failures = [];
  const skipped = [];

  for (const { dir, pkg } of packages) {
    const mainEntry = typeof pkg.main === 'string' ? pkg.main : '';
    const shipsBuiltOutput = mainEntry.includes('dist');

    if (!shipsBuiltOutput) {
      skipped.push(pkg.name);
      continue;
    }

    const unresolved = [];
    for (const specifier of collectSpecifiers(pkg)) {
      try {
        require.resolve(specifier, { paths: [REPO_ROOT, dir] });
      } catch (error) {
        unresolved.push(`${specifier} (${error.code || error.message})`);
      }
    }

    if (unresolved.length > 0) {
      failures.push({ pkg, unresolved });
    } else {
      console.log(`✓ ${pkg.name}: resolvable`);
    }
  }

  if (skipped.length > 0) {
    console.log(`- source-only packages (not built): ${skipped.join(', ')}`);
  }

  if (failures.length > 0) {
    console.error('\nWorkspace library build verification failed:\n');
    for (const { pkg, unresolved } of failures) {
      console.error(`  ✗ ${pkg.name}`);
      unresolved.forEach((entry) => console.error(`      cannot resolve ${entry}`));
    }
    console.error(
      '\nWorkspace packages are consumed through their built dist/ output.' +
        '\nRe-run the "Build libraries" step (npm run build:<package>) so dist/' +
        '\nis regenerated for the packages listed above, then re-run the tests.\n'
    );
    process.exit(1);
  }

  console.log('\nAll workspace library build outputs are present and resolvable.');
};

main();
