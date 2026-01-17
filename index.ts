import { app } from "./app.ts";
import { env } from "./config/env.ts";
import connectToDatabase from "./database/connectToDatabase.ts";

await connectToDatabase();

app.listen(env.PORT, () => {
  console.log(`🚀 Server running on ${env.PORT} (${env.NODE_ENV})`);
});
