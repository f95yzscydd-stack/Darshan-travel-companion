import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { basename, join, relative } from 'node:path';

const distDirectory = 'dist';
const generatedAssetsDirectory = join(distDirectory, 'assets', 'node_modules');
const publishableAssetsDirectory = join(distDirectory, 'assets', 'expo');
const webBundleDirectory = join(distDirectory, '_expo');

function filesIn(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesIn(path) : [path];
  });
}

mkdirSync(publishableAssetsDirectory, { recursive: true });

const replacements = [];
for (const source of filesIn(generatedAssetsDirectory)) {
  const sourcePath = relative(distDirectory, source).replaceAll('\\', '/');
  const destination = join(publishableAssetsDirectory, basename(source));
  const destinationPath = relative(distDirectory, destination).replaceAll('\\', '/');
  copyFileSync(source, destination);
  replacements.push([sourcePath, destinationPath]);
}

for (const bundlePath of filesIn(webBundleDirectory).filter((path) => path.endsWith('.js'))) {
  let bundle = readFileSync(bundlePath, 'utf8');
  for (const [sourcePath, destinationPath] of replacements) {
    bundle = bundle.replaceAll(sourcePath, destinationPath);
  }
  if (bundle.includes('assets/node_modules/')) {
    throw new Error(`Unpublishable Expo asset path remains in ${bundlePath}`);
  }
  writeFileSync(bundlePath, bundle);
}

copyFileSync(join(distDirectory, 'index.html'), join(distDirectory, '404.html'));
console.log(`Prepared ${replacements.length} Expo assets for GitHub Pages`);
