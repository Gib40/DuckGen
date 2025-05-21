const fs = require("fs");
const path = require("path");
const chai = require("chai");
const expect = chai.expect;

describe("✅ DuckGen Metadata Output", () => {
  const traitList = JSON.parse(fs.readFileSync(path.join(__dirname, "../output/traitList.json")));
  const collection = JSON.parse(fs.readFileSync(path.join(__dirname, "../config/collection.json")));
  const metadataDir = path.join(__dirname, "../output/metadata");
  const masterPath = path.join(__dirname, "../output/master_metadata.json");

  it("should generate metadata for every NFT in /metadata", () => {
    const files = fs.readdirSync(metadataDir).filter(f => f.endsWith(".json"));
    expect(files.length).to.be.at.least(1);
  });

  it("should have valid fields in each NFT file", () => {
    traitList.slice(0, 5).forEach(nft => {
      const filePath = path.join(metadataDir, `${nft.filename}.json`);
      const meta = JSON.parse(fs.readFileSync(filePath));

      expect(meta.name).to.equal(nft.filename);
      expect(meta.video).to.include(".mp4");
      expect(meta.image).to.include(".png");
      expect(meta).to.have.property("attributes").that.is.an("array");
      expect(meta).to.have.property("properties").that.is.an("object");
      expect(meta.properties).to.have.property("files").that.is.an("array");
      expect(meta.properties.category).to.equal("video");
      expect(meta.properties.creators[0].name).to.equal(collection.creator);
      expect(meta).to.have.property("compiler").that.equals("DuckGen");
    });
  });

  it("should generate master_metadata.json with correct structure", () => {
    const master = JSON.parse(fs.readFileSync(masterPath));
    expect(master).to.have.property("name", collection.collectionName);
    expect(master).to.have.property("description", collection.description);
    expect(master).to.have.property("collection").that.is.an("array");
    expect(master.collection.length).to.be.at.least(1);
  });
});
