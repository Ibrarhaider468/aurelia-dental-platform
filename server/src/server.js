import { createApp } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";

async function bootstrap() {
  try {
    await connectDatabase();
    const app = createApp();

    app.listen(env.port, () => {
      console.log(`\n🦷 Aurelia Dental API running on http://localhost:${env.port}`);
      console.log(`   Environment: ${env.nodeEnv}`);
      console.log(`   Health:      http://localhost:${env.port}/api/health\n`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

bootstrap();
