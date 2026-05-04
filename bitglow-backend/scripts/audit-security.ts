import fs from "fs";
import path from "path";

const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "src");
const allowedJwtVerifyFile = path.join(srcDir, "services", "security.ts");
const protectedRouteFiles = [
    path.join(srcDir, "routes", "dms.ts"),
    path.join(srcDir, "routes", "live.ts"),
    path.join(srcDir, "routes", "notifications.ts"),
    path.join(srcDir, "routes", "posts.ts"),
    path.join(srcDir, "routes", "profile.ts"),
    path.join(srcDir, "routes", "user.ts"),
];

function getTsFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...getTsFiles(fullPath));
            continue;
        }
        if (entry.isFile() && fullPath.endsWith(".ts")) {
            files.push(fullPath);
        }
    }
    return files;
}

const errors: string[] = [];
for (const file of getTsFiles(srcDir)) {
    const contents = fs.readFileSync(file, "utf8");
    if (contents.includes("jwt.verify") && file !== allowedJwtVerifyFile) {
        errors.push(`Disallowed jwt.verify in ${path.relative(root, file)}`);
    }
    if (contents.includes("getAuthUserId")) {
        errors.push(`Legacy auth helper found in ${path.relative(root, file)}`);
    }
}

for (const file of protectedRouteFiles) {
    const contents = fs.readFileSync(file, "utf8");
    if (!contents.includes("fastify.requireAuth") && !contents.includes("fastify.requireAdmin")) {
        errors.push(`Protected route file missing shared auth guard reference: ${path.relative(root, file)}`);
    }
}

if (errors.length > 0) {
    for (const error of errors) {
        console.error(error);
    }
    process.exit(1);
}

console.log("Security audit passed.");
