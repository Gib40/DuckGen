const fs = require("fs");
const path = require("path");
const chai = require("chai");
const expect = chai.expect;
const { execSync } = require("child_process");

describe("✅ DuckGen Render Output", () => {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, "../config/collection.json")));
  const traitList = JSON.parse(fs.readFileSync(path.join(__dirname, "../output/traitList.json")));
  const outputDir = path.join(__dirname, "../output/media");

  const rendered = fs.readdirSync(outputDir).filter(f => f.endsWith(".mp4"));

  it("should render at least 1 NFT (for limited test)", () => {
    expect(rendered.length).to.be.greaterThan(0);
  });

  it("should create thumbnails alongside each video", () => {
    rendered.forEach(file => {
      const thumb = file.replace(".mp4", ".png");
      expect(fs.existsSync(path.join(outputDir, thumb))).to.be.true;
    });
  });

  it("should output videos with proper codec and size", () => {
    rendered.forEach(file => {
      const probe = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height,pix_fmt,codec_name -of default=noprint_wrappers=1 "${path.join(outputDir, file)}"`).toString();
      expect(probe).to.include("width=1080");
      expect(probe).to.include("height=1080");
      expect(probe).to.include("pix_fmt=yuv420p");
      expect(probe).to.include("codec_name=h264");
    });
  });

  it("should not exceed expected total NFTs", () => {
    expect(rendered.length).to.be.at.most(config.nftsToGenerate);
  });
});
