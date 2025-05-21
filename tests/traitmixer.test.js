const fs = require("fs");
const path = require("path");
const chai = require("chai");
const expect = chai.expect;

describe("✅ DuckGen TraitMixer Output", () => {
  const traitList = JSON.parse(fs.readFileSync(path.join(__dirname, "../output/traitList.json")));
  const logPath = path.join(__dirname, "../output/trait_summary.txt");
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, "../config/collection.json")));

  it("should generate the exact number of NFTs requested", () => {
    expect(traitList.length).to.equal(config.nftsToGenerate);
  });

  it("should have unique filenames", () => {
    const filenames = traitList.map(nft => nft.filename);
    const uniqueFilenames = new Set(filenames);
    expect(uniqueFilenames.size).to.equal(filenames.length);
  });

  it("should include valid trait values and layers", () => {
    for (const nft of traitList) {
      nft.traits.forEach(trait => {
        expect(trait).to.have.property("value").that.is.a("string");
        expect(trait).to.have.property("layer");
        expect(
          typeof trait.layer === "string" || trait.layer === undefined
        ).to.be.true;
      });
    }
  });

  it("should honor min/max trait count (excluding Golden Egg)", () => {
    for (const nft of traitList) {
      const regularTraits = nft.traits.filter(t => t.layer !== "Special");
      expect(regularTraits.length).to.be.within(config.minTraits, config.maxTraits);
    }
  });

  it("should inject the correct number of golden eggs", () => {
    const goldenEggs = traitList.filter(nft => nft.goldenEgg);
    expect(goldenEggs.length).to.equal(config.goldenEggsToInject);
  });
});
