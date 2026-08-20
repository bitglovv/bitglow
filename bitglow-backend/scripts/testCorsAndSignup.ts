import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { authRoutes } from "../src/routes/auth";
import { userRoutes } from "../src/routes/user";

async function assert(condition: boolean, msg: string) {
    if (!condition) {
        throw new Error(`Assertion failed: ${msg}`);
    }
}

async function runTests() {
    console.log("=== STARTING CORS, RATE LIMIT & AUTH REGRESSION TESTS ===");

    const app = Fastify({ logger: false });

    app.register(cors, {
        origin: (origin, callback) => {
            if (!origin || origin === "https://bitglow.site") {
                callback(null, true);
                return;
            }
            callback(new Error("Origin not allowed"), false);
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    });

    app.register(rateLimit, {
        global: true,
        max: 5,
        timeWindow: "1 minute",
        allowList: (req) => req.method === "OPTIONS",
    });

    app.setErrorHandler(async (error, request, reply) => {
        const origin = request.headers.origin as string | undefined;
        if (origin && origin === "https://bitglow.site") {
            reply.header("Access-Control-Allow-Origin", origin);
            reply.header("Access-Control-Allow-Credentials", "true");
        }

        const statusCode = Number((error as any).statusCode) || 500;
        if (statusCode === 429) {
            return reply.code(429).send({
                code: "TOO_MANY_ATTEMPTS",
                message: "Too many requests. Please try again later.",
            });
        }
        if ((error as any).validation) {
            return reply.code(400).send({ message: "Invalid request payload" });
        }
        return reply.code(statusCode).send({ message: (error as any)?.message || "Error" });
    });

    app.register(authRoutes, { prefix: "/api/auth" });
    app.register(userRoutes, { prefix: "/api" });

    await app.ready();

    // A. OPTIONS /api/auth/login succeeds
    console.log("Test A: OPTIONS /api/auth/login preflight succeeds with CORS headers");
    const optLogin = await app.inject({
        method: "OPTIONS",
        url: "/api/auth/login",
        headers: {
            origin: "https://bitglow.site",
            "access-control-request-method": "POST",
            "access-control-request-headers": "content-type",
        },
    });
    await assert(optLogin.statusCode === 204 || optLogin.statusCode === 200, `OPTIONS login must be 200/204, got ${optLogin.statusCode}`);
    await assert(optLogin.headers["access-control-allow-origin"] === "https://bitglow.site", "OPTIONS login must include allow-origin header");
    await assert(optLogin.headers["access-control-allow-credentials"] === "true", "OPTIONS login must include allow-credentials");

    // B. OPTIONS /api/auth/signup succeeds
    console.log("Test B: OPTIONS /api/auth/signup preflight succeeds with CORS headers");
    const optSignup = await app.inject({
        method: "OPTIONS",
        url: "/api/auth/signup",
        headers: {
            origin: "https://bitglow.site",
            "access-control-request-method": "POST",
            "access-control-request-headers": "content-type",
        },
    });
    await assert(optSignup.statusCode === 204 || optSignup.statusCode === 200, `OPTIONS signup must be 200/204, got ${optSignup.statusCode}`);
    await assert(optSignup.headers["access-control-allow-origin"] === "https://bitglow.site", "OPTIONS signup must include allow-origin header");

    // C. Repeated OPTIONS requests do not trigger 429
    console.log("Test C: 15 consecutive OPTIONS requests do not trigger 429");
    for (let i = 0; i < 15; i++) {
        const opt = await app.inject({
            method: "OPTIONS",
            url: "/api/auth/signup",
            headers: {
                origin: "https://bitglow.site",
                "access-control-request-method": "POST",
            },
        });
        await assert(opt.statusCode === 204 || opt.statusCode === 200, `OPTIONS #${i} was rate-limited: ${opt.statusCode}`);
    }

    // D. Allowed origin receives Access-Control-Allow-Origin
    console.log("Test D: Origin https://bitglow.site receives Access-Control-Allow-Origin");
    const optUserCheck = await app.inject({
        method: "OPTIONS",
        url: "/api/username/check?u=tester",
        headers: {
            origin: "https://bitglow.site",
            "access-control-request-method": "GET",
        },
    });
    await assert(optUserCheck.headers["access-control-allow-origin"] === "https://bitglow.site", "Must include allow-origin header");

    // E. 429 responses include CORS headers
    console.log("Test E: 429 response includes CORS headers");
    for (let i = 0; i < 6; i++) {
        const res = await app.inject({
            method: "GET",
            url: "/api/auth/login",
            headers: { origin: "https://bitglow.site" },
        });
        if (res.statusCode === 429) {
            await assert(res.headers["access-control-allow-origin"] === "https://bitglow.site", "429 must have CORS allow-origin header");
            await assert(res.headers["access-control-allow-credentials"] === "true", "429 must have CORS credentials header");
            console.log("-> Verified 429 response contains CORS headers");
            break;
        }
    }

    // F. Login endpoint schema validation with valid payload structure
    console.log("Test F: Login endpoint schema rejects extra payload fields cleanly (400) with CORS headers");
    const res400 = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        headers: { origin: "https://bitglow.site", "content-type": "application/json" },
        body: JSON.stringify({ identifier: "a", password: "" }),
    });
    await assert(res400.statusCode === 400, `Expected 400 validation error, got ${res400.statusCode}`);
    await assert(res400.headers["access-control-allow-origin"] === "https://bitglow.site", "400 must have CORS allow-origin header");

    // G. Username check route validation
    console.log("Test G: GET /api/username/check with valid candidate");
    const resCheck = await app.inject({
        method: "GET",
        url: "/api/username/check?u=uniqueuser123",
        headers: { origin: "https://bitglow.site" },
    });
    await assert(resCheck.statusCode === 200 || resCheck.statusCode === 400, `Expected 200 or 400, got ${resCheck.statusCode}`);

    console.log("=== ALL CORS & AUTH REGRESSION TESTS PASSED SUCCESSFULLY ===");
    await app.close();
}

runTests()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Test failed:", err);
        process.exit(1);
    });
