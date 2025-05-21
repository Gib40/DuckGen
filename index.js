const fs = require("fs");
const chalk = require("chalk");
const readline = require("readline");
const { spawnSync } = require("child_process");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const log = (msg) => console.log(chalk.cyan(`[DuckGen] `) + msg);
const error = (msg) => console.error(chalk.red(`❌ Error: ${msg}`));
const success = (msg) => console.log(chalk.green(`✅ ${msg}`));

const logs = {
  render: "./output/render_log.txt",
  traits: "./output/trait_summary.txt"
};

const menu = chalk.bold(`
DuckGen CLI
────────────────────────────────────
[1] Run Trait Mixer
[2] Render NFTs
[3] Generate Metadata
[4] Run Tests
[5] View Logs
[6] Exit
`);

const logMenu = chalk.bold(`
Select a log to view:
[1] Render Log
[2] Trait Summary
[3] Return to Main Menu
`);

function runCommand(cmd, label) {
  log(`Running ${label}...`);
  const parts = cmd.trim().split(" ");
  const command = parts[0];
  const args = parts.slice(1);

  const result = spawnSync(command, args, { stdio: "inherit" });

  if (result.error) {
    error(`Failed to start ${label}: ${result.error.message}`);
  } else if (result.status !== 0) {
    error(`${label} exited with code ${result.status}`);
  } else {
    success(`${label} completed.`);
  }
}

function viewLog(filePath, fallback) {
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    console.log(chalk.gray(`\n--- ${filePath} ---\n`));
    console.log(data.slice(0, 3000));
    if (data.length > 3000) console.log(chalk.gray("\n...truncated"));
  } catch {
    console.log(chalk.yellow(fallback));
  }
}

function promptLimit(label, baseScript, fallbackScript) {
  rl.question(chalk.yellow(`Limit ${label}? Enter number or press Enter: `), (limit) => {
    const cmd = limit.trim()
      ? `node scripts/${baseScript}.js --limit ${limit}`
      : `npm run ${fallbackScript}`;
    runCommand(cmd, label);
    rl.question(chalk.gray("\nPress Enter to return to menu..."), showMenu);
  });
}

function showLogMenu() {
  console.clear();
  console.log(logMenu);
  rl.question(chalk.yellow("Choose log: "), (ans) => {
    switch (ans.trim()) {
      case "1":
        viewLog(logs.render, "Render log not found.");
        return rl.question(chalk.yellow("\nPress Enter to return..."), showLogMenu);
      case "2":
        viewLog(logs.traits, "Trait summary not found.");
        return rl.question(chalk.yellow("\nPress Enter to return..."), showLogMenu);
      case "3":
        return showMenu();
      default:
        error("Invalid log option.");
        setTimeout(showLogMenu, 800);
    }
  });
}

function showMenu() {
  console.clear();
  console.log(menu);
  rl.question(chalk.yellow("Select an option: "), (answer) => {
    switch (answer.trim()) {
      case "1":
        runCommand("npm run traitmix", "Trait Mixer");
        return rl.question(chalk.gray("\nPress Enter to return to menu..."), showMenu);
      case "2":
        return promptLimit("Render", "render", "render");
      case "3":
        return promptLimit("Metadata", "metadatagen", "metadata");
      case "4":
        runCommand("npm test", "Test Suite");
        return rl.question(chalk.gray("\nPress Enter to return to menu..."), showMenu);
      case "5":
        return showLogMenu();
      case "6":
        log("Goodbye!");
        rl.close();
        break;
      default:
        error("Invalid option.");
        setTimeout(showMenu, 800);
    }
  });
}

showMenu();
