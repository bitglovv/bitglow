import "fastify";
import type { RequestActor } from "../services/security";

declare module "fastify" {
    interface FastifyRequest {
        auth?: RequestActor;
    }

    interface FastifyInstance {
        requireAuth: any;
        requireAdmin: any;
    }
}

