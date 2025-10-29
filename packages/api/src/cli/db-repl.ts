#!/usr/bin/env node

import repl from "repl";
import prisma from "../database";
import * as util from "util";

console.log("🗄️  Drink-UX Database REPL");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("💡 Available in context:");
console.log("   • prisma      - Prisma Client instance");
console.log("   • db          - Alias for prisma");
console.log("   • models      - Quick access to all models");
console.log("");
console.log("📝 Examples:");
console.log("   > await prisma.clientCompany.findMany()");
console.log("   > await db.posIntegration.count()");
console.log("   > await models.clientCompany.create({ data: {...} })");
console.log("");
console.log("💾 Use .help for REPL commands");
console.log("🚪 Use .exit or Ctrl+D to quit");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("");

// Create the REPL instance
const replServer = repl.start({
  prompt: "db> ",
  useColors: true,
  preview: true,
  ignoreUndefined: true,
  writer: (output: any) => {
    // Pretty print objects and arrays
    if (typeof output === "object" && output !== null) {
      return util.inspect(output, {
        colors: true,
        depth: 4,
        maxArrayLength: 100,
        breakLength: 80,
        compact: false,
      });
    }
    return output;
  },
});

// Add prisma to the REPL context
replServer.context.prisma = prisma;
replServer.context.db = prisma;

// Add convenient shortcuts for all models
replServer.context.models = {
  partner: prisma.partner,
  partnerTheme: prisma.partnerTheme,
  posIntegration: prisma.pOSIntegration,
  // Add more models as they're defined in your schema
};

// Handle cleanup on exit
replServer.on("exit", async () => {
  console.log("\n👋 Disconnecting from database...");
  await prisma.$disconnect();
  console.log("✅ Goodbye!");
  process.exit(0);
});

// Handle errors gracefully
process.on("SIGINT", async () => {
  console.log("\n\n👋 Caught interrupt signal, cleaning up...");
  await prisma.$disconnect();
  process.exit(0);
});

// Add some helpful custom commands
replServer.defineCommand("schema", {
  help: "Show all available models",
  action() {
    console.log("\n📋 Available Models:");
    console.log("   • ClientCompany    (prisma.clientCompany)");
    console.log("   • ClientTheme      (prisma.clientTheme)");
    console.log("   • POSIntegration   (prisma.pOSIntegration)");
    console.log("\n💡 Use shortcuts: models.clientCompany, models.clientTheme, models.posIntegration\n");
    this.displayPrompt();
  },
});

replServer.defineCommand("count", {
  help: "Show record counts for all tables",
  async action() {
    try {
      console.log("\n📊 Record Counts:");
      const counts = await Promise.all([prisma.partner.count(), prisma.partnerTheme.count(), prisma.pOSIntegration.count()]);
      console.log(`   • Partner:        ${counts[0]}`);
      console.log(`   • PartnerTheme:   ${counts[1]}`);
      console.log(`   • POSIntegration: ${counts[2]}`);
      console.log("");
    } catch (error) {
      console.error("❌ Error:", error);
    }
    this.displayPrompt();
  },
});

replServer.defineCommand("clear", {
  help: "Clear the console",
  action() {
    console.clear();
    this.displayPrompt();
  },
});
