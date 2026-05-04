"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const root = path_1.default.resolve(__dirname, "..");
const srcDir = path_1.default.join(root, "src");
const allowedJwtVerifyFile = path_1.default.join(srcDir, "services", "security.ts");
const protectedRouteFiles = [
    path_1.default.join(srcDir, "routes", "dms.ts"),
    path_1.default.join(srcDir, "routes", "live.ts"),
    path_1.default.join(srcDir, "routes", "notifications.ts"),
    path_1.default.join(srcDir, "routes", "posts.ts"),
    path_1.default.join(srcDir, "routes", "profile.ts"),
    path_1.default.join(srcDir, "routes", "user.ts"),
];
function getTsFiles(dir) {
    const entries = fs_1.default.readdirSync(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = path_1.default.join(dir, entry.name);
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
const errors = [];
for (const file of getTsFiles(srcDir)) {
    const contents = fs_1.default.readFileSync(file, "utf8");
    if (contents.includes("jwt.verify") && file !== allowedJwtVerifyFile) {
        errors.push(`Disallowed jwt.verify in ${path_1.default.relative(root, file)}`);
    }
    if (contents.includes("getAuthUserId")) {
        errors.push(`Legacy auth helper found in ${path_1.default.relative(root, file)}`);
    }
}
for (const file of protectedRouteFiles) {
    const contents = fs_1.default.readFileSync(file, "utf8");
    if (!contents.includes("fastify.requireAuth") && !contents.includes("fastify.requireAdmin")) {
        errors.push(`Protected route file missing shared auth guard reference: ${path_1.default.relative(root, file)}`);
    }
}
if (errors.length > 0) {
    for (const error of errors) {
        console.error(error);
    }
    process.exit(1);
}
console.log("Security audit passed.");
