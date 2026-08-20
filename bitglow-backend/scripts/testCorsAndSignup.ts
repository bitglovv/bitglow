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
    console.log("=== STARTING CORS, RATE LIMIT & SIGNUP REGRESSION TESTS ===");

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

    // 1. OPTIONS /api/auth/signup preflight
    console.log("Test 1: OPTIONS /api/auth/signup from Origin: https://bitglow.site");
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
    await assert(optSignup.headers["access-control-allow-credentials"] === "true", "OPTIONS signup must include allow-credentials");

    // 2. OPTIONS /api/auth/login preflight
    console.log("Test 2: OPTIONS /api/auth/login from Origin: https://bitglow.site");
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

    // 3. Repeated OPTIONS do NOT consume rate limit quota
    console.log("Test 3: Repeated OPTIONS requests do NOT trigger 429");
    for (let i = 0; i < 10; i++) {
        const opt = await app.inject({
            method: "OPTIONS",
            url: "/api/auth/signup",
            headers: {
                origin: "https://bitglow.site",
                "access-control-request-method": "POST",
            },
        });
        await assert(opt.statusCode === 204 || opt.statusCode === 200, `OPTIONS #${i} was rate limited: ${opt.statusCode}`);
    }

    // 4. OPTIONS /api/username/check preflight
    console.log("Test 4: OPTIONS /api/username/check preflight");
    const optUserCheck = await app.inject({
        method: "OPTIONS",
        url: "/api/username/check?u=tester",
        headers: {
            origin: "https://bitglow.site",
            "access-control-request-method": "GET",
        },
    });
    await assert(optUserCheck.statusCode === 204 || optUserCheck.statusCode === 200, "OPTIONS username/check must succeed");
    await assert(optUserCheck.headers["access-control-allow-origin"] === "https://bitglow.site", "Must include allow-origin header");

    // 5. Rate limit 429 responses contain CORS headers
    console.log("Test 5: 429 responses include CORS headers");
    // Trigger rate limit by exhausting the 5 req limit
    for (let i = 0; i < 6; i++) {
        const res = await app.inject({
            method: "GET",
            url: "/api/auth/login",
            headers: { origin: "https://bitglow.site" },
        });
        if (res.statusCode === 429) {
            await assert(res.headers["access-control-allow-origin"] === "https://bitglow.site", "429 must have CORS allow-origin header");
            await assert(res.headers["access-control-allow-credentials"] === "true", "429 must have CORS credentials header");
            console.log("Verified 429 response includes proper CORS headers");
            break;
        }
    }

    // 6. 400 validation error includes CORS headers
    console.log("Test 6: 400 validation errors include CORS headers");
    const res400 = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        headers: { origin: "https://bitglow.site", "content-type": "application/json" },
        body: JSON.stringify({ invalid: true }),
    });
    await assert(res400.statusCode === 400, `Expected 400, got ${res400.statusCode}`);
    await assert(res400.headers["access-control-allow-origin"] === "https://bitglow.site", "400 must have CORS allow-origin header");

    console.log("=== ALL CORS & AUTH REGRESSION TESTS PASSED SUCCESSFULLY ===");
    await app.close();
}

runTests()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Test failed:", err);
        process.exit(1);
    });
