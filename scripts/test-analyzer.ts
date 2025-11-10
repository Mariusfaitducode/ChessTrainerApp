import { analyzePosition } from "../services/chess/analyzer";

async function main() {
  const fen =
    "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 4";
  const depth = 12;

  console.log("Testing analyzePosition with depth", depth);
  const result = await analyzePosition(fen, depth);
  console.log("Result:", result);
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
