import fs from 'node:fs';
import path from 'node:path';

const source = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const destDir = path.resolve(process.cwd(), 'public');
const dest = path.join(destDir, 'pdf.worker.min.mjs');

if (fs.existsSync(source)) {
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(source, dest);
  console.log('Copied pdf.worker.min.mjs to public/');
}
