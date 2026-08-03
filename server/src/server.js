import { createApp } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { startReminderScheduler } from "./services/reminder.service.js";

async function bootstrap() {
  try {
    await connectDatabase();
    const app = createApp();

    app.listen(env.port, () => {
      console.log(`\n🦷 Aurelia Dental API running on http://localhost:${env.port}`);
      console.log(`   Environment: ${env.nodeEnv}`);
      console.log(`   Health:      http://localhost:${env.port}/api/health`);
      startReminderScheduler({
        intervalMs: env.isDev ? 60 * 1000 : 15 * 60 * 1000,
      });
      console.log("");
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

bootstrap();
