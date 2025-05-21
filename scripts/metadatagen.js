console.log("📦 Starting metadata generation...");

try {
  const fs = require("fs");
  const path = require("path");

  const TRAITLIST_PATH = path.join(__dirname, "../output/traitList.json");
  const COLLECTION_PATH = path.join(__dirname, "../config/collection.json");
  const METADATA_DIR = path.join(__dirname, "../output/metadata");
  const MASTER_METADATA_PATH = path.join(__dirname, "../output/master_metadata.json");

  if (!fs.existsSync(METADATA_DIR)) fs.mkdirSync(METADATA_DIR, { recursive: true });

  const traitList = JSON.parse(fs.readFileSync(TRAITLIST_PATH));
  const collection = JSON.parse(fs.readFileSync(COLLECTION_PATH));

  const LIMIT = process.argv.includes("--limit")
    ? parseInt(process.argv[process.argv.indexOf("--limit") + 1])
    : traitList.length;

  const slicedList = traitList.slice(0, LIMIT);
  const combined = [];

  slicedList.forEach(nft => {
    const filename = nft.filename;

    const metadata = {
      name: `${filename}`,
      description: collection.description,
      video: `${filename}.mp4`,
      image: `${filename}.png`,
      collection: {
        name: collection.collectionName
      },
      attributes: nft.traits.map(t => ({
        trait_type: t.trait_type || t.layer || "Unknown",
        value: t.value
      })),
      properties: {
        files: [
          { uri: `${filename}.mp4`, type: "video/mp4" },
          { uri: `${filename}.png`, type: "image/png" }
        ],
        category: "video",
        creators: [{ name: collection.creator || "Unknown" }]
      },
      compiler: "DuckGen"
    };

    fs.writeFileSync(path.join(METADATA_DIR, `${filename}.json`), JSON.stringify(metadata, null, 2));
    combined.push(metadata);
  });

  const master = {
    name: collection.collectionName,
    description: collection.description,
    collection: combined
  };

  fs.writeFileSync(MASTER_METADATA_PATH, JSON.stringify(master, null, 2));

  console.log(`✅ Metadata written for ${slicedList.length} NFTs.`);
  console.log(`📁 Per-NFT: /output/metadata`);
  console.log(`📦 Master:  /output/master_metadata.json`);
} catch (err) {
  console.error("❌ Metadata generation failed:");
  console.error(err.message);
  process.exit(1);
}
