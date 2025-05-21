const fs = require("fs");
const path = require("path");
const shell = require("shelljs");
const { execSync } = require("child_process");

const TRAITLIST_PATH = path.join(__dirname, "../output/traitList.json");
const LAYERS_PATH = path.join(__dirname, "../config/layers.json");
const TRAITS_DIR = path.join(__dirname, "../traits");
const OUTPUT_DIR = path.join(__dirname, "../output/media");
const LOG_PATH = path.join(__dirname, "../output/render_log.txt");
const FAIL_PATH = path.join(__dirname, "../output/render_failures.txt");

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const traitList = JSON.parse(fs.readFileSync(TRAITLIST_PATH));
const layers = JSON.parse(fs.readFileSync(LAYERS_PATH)).sort((a, b) => a.order - b.order);

const LIMIT = process.argv.includes("--limit")
  ? parseInt(process.argv[process.argv.indexOf("--limit") + 1])
  : null;

const toRender = LIMIT ? traitList.slice(0, LIMIT) : traitList;

const logStream = fs.createWriteStream(LOG_PATH);
const failStream = fs.createWriteStream(FAIL_PATH);

function getTraitPath(layer, value) {
  const ext = layer.assetType || (layer.animated ? "mov" : "png");
  return path.join(TRAITS_DIR, layer.name, `${value}.${ext}`);
}

function renderNFT(nft, attempt = 1) {
  const filename = `${nft.filename}.mp4`;
  const thumbnailFilename = `${nft.filename}.png`;
  const outputPath = path.join(OUTPUT_DIR, filename);
  const thumbnailPath = path.join(OUTPUT_DIR, thumbnailFilename);

  if (fs.existsSync(outputPath)) {
    logStream.write(`⏩ Skipped ${filename} (already exists)\n`);
    return;
  }

  const inputs = [];
  const filters = [];
  let inputIdx = 0;
  let lastLabel = null;

  const orderedLayers = [...layers.map(l => l.name), "Special"];

  let usedTraits = nft.traits.map(trait => {
    const layer = layers.find(l => l.name === trait.layer) || { name: "Special", animated: false, assetType: "png" };
    const traitPath = getTraitPath(layer, trait.value);

    if (!fs.existsSync(traitPath)) {
      logStream.write(`⚠️ Missing trait asset: ${traitPath}\n`);
      return null;
    }

    return { ...trait, path: traitPath, layer };
  }).filter(Boolean);

  usedTraits.sort((a, b) => {
    const indexA = orderedLayers.indexOf(a.layer.name || a.layer);
    const indexB = orderedLayers.indexOf(b.layer.name || b.layer);
    return indexA - indexB;
  });

  if (usedTraits.length === 0) {
    failStream.write(`❌ ${nft.filename}: No usable traits.\n`);
    return;
  }

  usedTraits.forEach(({ path: filePath, layer }, index) => {
    const label = `t${inputIdx}`;
    const isAnimated = layer.animated;

    if (isAnimated) {
      inputs.push(`-i "${filePath}"`);
      filters.push(`[${inputIdx}:v] setpts=PTS-STARTPTS, scale=1080:1080, fps=24 [${label}]`);
    } else {
      inputs.push(`-loop 1 -i "${filePath}"`);
      filters.push(`[${inputIdx}:v] setpts=PTS-STARTPTS, scale=1080:1080 [${label}]`);
    }

    if (index === 0) {
      lastLabel = `[${label}]`;
    } else {
      filters.push(`${lastLabel}[${label}] overlay=format=auto${isAnimated ? ":alpha=straight" : ""} [tmp${inputIdx}]`);
      lastLabel = `[tmp${inputIdx}]`;
    }

    inputIdx++;
  });

  if (lastLabel !== "[outv]") {
    filters.push(`${lastLabel} copy [outv]`);
    lastLabel = "[outv]";
  }

  const filterGraph = filters.join("; ");
  logStream.write(`🎛 ${nft.filename} Filter Graph:\n${filterGraph}\n`);

  // === High Quality Video Encoding ===
  const command = `
    ffmpeg -y ${inputs.join(" ")} \
    -filter_complex "${filterGraph}" \
    -map [outv] \
    -vsync 0 -r 24 -frames:v 120 \
    -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -movflags +faststart -an "${outputPath}"
  `;

  const result = shell.exec(command, { silent: true });

  if (result.code !== 0) {
    if (attempt < 3) {
      logStream.write(`🔁 Retry ${filename} (Attempt ${attempt})\n`);
      return renderNFT(nft, attempt + 1);
    } else {
      failStream.write(`❌ ${filename}: FFmpeg failed after 3 attempts\n`);
      return;
    }
  }

  // === High Quality Thumbnail at 2s into video ===
  const thumbCmd = `ffmpeg -y -ss 1 -i "${outputPath}" -vf "scale=1080:1080" -frames:v 1 -q:v 2 "${thumbnailPath}"`;
  const thumbResult = shell.exec(thumbCmd, { silent: true });

  if (thumbResult.code === 0) {
    logStream.write(`✅ Thumbnail generated: ${thumbnailFilename}\n`);
  } else {
    logStream.write(`⚠️ Thumbnail failed: ${thumbnailFilename}\n`);
  }

  logStream.write(`✅ ${filename} rendered successfully\n`);
}

// === Render Loop
toRender.forEach((nft, idx) => {
  console.log(`🎬 Rendering ${nft.filename} (${idx + 1}/${toRender.length})...`);
  renderNFT(nft);
});

logStream.end(() => console.log("📝 Render log saved to output/render_log.txt"));
failStream.end(() => console.log("📄 Failure log saved to output/render_failures.txt"));
console.log("✅ DuckGen rendering complete.");
