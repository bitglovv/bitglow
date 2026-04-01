const Fastify = require('fastify');
const { authRoutes } = require('./src/routes/auth');
const { profileRoutes } = require('./src/routes/profile');

async function testRoutes() {
  const server = Fastify({ logger: true });

  // Register routes
  await server.register(authRoutes, { prefix: "/api/auth" });
  await server.register(profileRoutes, { prefix: "/api/profile" });

  server.get("/health", async () => {
    return { status: "ok" };
  });

  // Print routes
  await server.ready();
  console.log("Registered routes:");
  server.printRoutes();

  // Test a simple request
  const response = await server.inject({
    method: 'GET',
    url: '/health'
  });

  console.log('Health check response:', response.statusCode, response.body);

  // Test auth signup route
  const signupResponse = await server.inject({
    method: 'POST',
    url: '/api/auth/signup',
    payload: {
      username: 'testuser',
      displayName: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    }
  });

  console.log('Signup route response:', signupResponse.statusCode, signupResponse.body);
}

testRoutes().catch(console.error);