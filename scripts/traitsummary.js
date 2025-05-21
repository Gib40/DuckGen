const fs = require("fs");
const path = require("path");

const traitList = JSON.parse(fs.readFileSync(path.join(__dirname, "../output/traitList.json")));
const layers = JSON.parse(fs.readFileSync(path.join(__dirname, "../config/layers.json")));
const logPath = path.join(__dirname, "../output/trait_summary.txt");

const total = traitList.length;
const golden = traitList.filter(nft => nft.goldenEgg).length;

const layerCounts = {};
const traitCountsByLayer = {};

// Normalize layer names
const configLayerMap = Object.fromEntries(layers.map(l => [l.name, l]));
const orderedLayerNames = [...layers.sort((a, b) => a.order - b.order).map(l => l.name), "Special"];

// Count appearances by layer and trait
for (const nft of traitList) {
  for (const trait of nft.traits) {
    let layer = trait.trait_type || trait.layer || "Unknown";
    const value = trait.value;

    if (value === "Golden Egg") layer = "Special";

    if (!layerCounts[layer]) layerCounts[layer] = 0;
    if (!traitCountsByLayer[layer]) traitCountsByLayer[layer] = {};

    layerCounts[layer]++;
    traitCountsByLayer[layer][value] = (traitCountsByLayer[layer][value] || 0) + 1;
  }
}

// === CONSOLE SUMMARY ===
console.log(`\n🔍 TRAIT MIXER SUMMARY`);
console.log(`Total NFTs: ${total}`);
console.log(`Golden Eggs: ${golden}\n`);

console.log(`🧱 Layer Usage:`);
orderedLayerNames.forEach(layer => {
  const count = layerCounts[layer] || 0;
  const pct = ((count / total) * 100).toFixed(2);
  console.log(`  ${layer}: ${count} (${pct}%)`);
});

console.log(`\n🎨 Trait Frequencies by Layer:`);
orderedLayerNames.forEach(layer => {
  const traits = traitCountsByLayer[layer] || {};
  const totalInLayer = Object.values(traits).reduce((a, b) => a + b, 0);
  const configTraits = configLayerMap[layer]?.traits || [];

  console.log(`  [${layer}]`);
  configTraits.forEach(t => {
    const count = traits[t.name] || 0;
    const pct = ((count / totalInLayer) * 100).toFixed(2);
    const marker = count === 0 ? "⚠️ unused" : "";
    console.log(`    ${t.name}: ${count} (${pct}%) ${marker}`);
  });

  // Detect unrecognized traits
  Object.keys(traits).forEach(t => {
    if (!configTraits.find(ct => ct.name === t)) {
      console.log(`    ❌ Unknown Trait: ${t} — in data but not in config`);
    }
  });
});

console.log(`\n📝 Full summary saved to /output/trait_summary.txt\n`);

// === WRITE TO FILE ===
const log = fs.createWriteStream(logPath);
log.write(`DuckGen Trait Summary — ${new Date().toISOString()}\n\n`);
log.write(`🧾 Total NFTs: ${total}\n`);
log.write(`🥚 Golden Eggs: ${golden}\n\n`);

log.write(`🧱 Layer Usage:\n`);
orderedLayerNames.forEach(layer => {
  const count = layerCounts[layer] || 0;
  const pct = ((count / total) * 100).toFixed(2);
  log.write(`  ${layer}: ${count} (${pct}%)\n`);
});

log.write(`\n🎨 Trait Frequencies by Layer:\n`);
orderedLayerNames.forEach(layer => {
  const traits = traitCountsByLayer[layer] || {};
  const totalInLayer = Object.values(traits).reduce((a, b) => a + b, 0);
  const configTraits = configLayerMap[layer]?.traits || [];

  log.write(`\n  [${layer}]\n`);
  configTraits.forEach(t => {
    const count = traits[t.name] || 0;
    const pct = ((count / totalInLayer) * 100).toFixed(2);
    const marker = count === 0 ? "⚠️ unused" : "";
    log.write(`    ${t.name}: ${count} (${pct}%) ${marker}\n`);
  });

  Object.keys(traits).forEach(t => {
    if (!configTraits.find(ct => ct.name === t)) {
      log.write(`    ❌ Unknown Trait: ${t} — in data but not in config\n`);
    }
  });
});

log.end();
