// switch-db.js — Toggle between SQLite (dev) and PostgreSQL (prod)
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const schemaPath = path.join(__dirname, "server", "prisma", "schema.prisma");
const envPath = path.join(__dirname, "server", ".env");

console.log("\n🎛️  Database Switcher\n");
console.log("1. Switch to PostgreSQL (Neon) — for pushing schema to Neon");
console.log("2. Switch to SQLite (local) — for local development");
console.log("");

rl.question("Enter choice (1 or 2): ", (choice) => {
  let schema = fs.readFileSync(schemaPath, "utf8");
  let env = fs.readFileSync(envPath, "utf8");

  if (choice === "1") {
    // Switch to PostgreSQL
    const neonUrl = process.env.NEON_URL || rl.question;

    console.log("\n📝 Paste your Neon connection string:");
    rl.question("Neon URL: ", (neonUrl) => {
      schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"');
      env = env.replace(
        /DATABASE_URL=".*"/,
        `DATABASE_URL="${neonUrl}"`
      );

      fs.writeFileSync(schemaPath, schema);
      fs.writeFileSync(envPath, env);

      console.log("\n✅ Switched to PostgreSQL");
      console.log("Next steps:");
      console.log("  1. npx prisma generate");
      console.log("  2. npx prisma db push");
      console.log("");
      rl.close();
    });
  } else if (choice === "2") {
    // Switch to SQLite
    schema = schema.replace('provider = "postgresql"', 'provider = "sqlite"');
    env = env.replace(
      /DATABASE_URL=".*"/,
      'DATABASE_URL="file:./dev.db"'
    );

    fs.writeFileSync(schemaPath, schema);
    fs.writeFileSync(envPath, env);

    console.log("\n✅ Switched to SQLite");
    console.log("Next steps:");
    console.log("  1. npx prisma generate");
    console.log("  2. npx prisma db push");
    console.log("");
    rl.close();
  } else {
    console.log("\n❌ Invalid choice");
    rl.close();
  }
});