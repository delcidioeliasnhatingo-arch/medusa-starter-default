const { spawnSync } = require("node:child_process");

const email = process.env.AVEART_ADMIN_EMAIL;
const password = process.env.AVEART_ADMIN_PASSWORD;

if (!email || !password) {
  process.exit(0);
}

console.log("Attempting one-time Medusa admin bootstrap for:", email);
const result = spawnSync("yarn", [
  "medusa",
  "user",
  "--email",
  email,
  "--password",
  password,
], { stdio: "inherit", env: process.env });

if (result.error) {
  console.error("Admin bootstrap command could not start:", result.error.message);
} else if (result.status !== 0) {
  console.error("Admin bootstrap did not complete successfully; continuing server startup so the API stays available.");
} else {
  console.log("Medusa admin bootstrap command completed successfully.");
}
