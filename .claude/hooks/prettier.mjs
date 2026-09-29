// Hook de Claude Code (PostToolUse en Edit/Write): formatea con Prettier el archivo recién editado.
// Respeta .prettierrc.json y .prettierignore; saltea los tipos de archivo que Prettier no conoce.
import { execFileSync } from "node:child_process";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..", "..");
let entrada = "";
for await (const parte of process.stdin) entrada += parte;

const archivo = JSON.parse(entrada).tool_input?.file_path;
if (
  archivo &&
  path
    .resolve(archivo)
    .toLowerCase()
    .startsWith(raiz.toLowerCase() + path.sep)
) {
  execFileSync(
    process.execPath,
    [path.join(raiz, "node_modules", "prettier", "bin", "prettier.cjs"), "--write", "--ignore-unknown", archivo],
    { cwd: raiz, stdio: "ignore" }
  );
}
