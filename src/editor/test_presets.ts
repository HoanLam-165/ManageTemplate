import { PRESETS, generateElementsFromPreset } from "./presets.js";

function runTests() {
  console.log("Running Preset Tests...");

  const preset = PRESETS[0];
  const elements = generateElementsFromPreset(preset, 10, 10);

  // A. Preset generation
  if (elements.length !== preset.elements.length) {
    throw new Error("Generation failed: incorrect number of elements");
  }
  console.log("✓ Preset generation count correct");

  // B. Unique IDs
  if (elements[0].id === elements[1].id) {
     throw new Error("ID collision detected");
  }
  console.log("✓ Unique IDs generated");

  // C. Deep independence (modifying output shouldn't affect preset)
  elements[0].properties.content = "Changed";
  if (PRESETS[0].elements[0].properties.content === "Changed") {
     throw new Error("Deep independence failed: preset modified");
  }
  console.log("✓ Deep independence verified");

  console.log("All tests passed!");
}

try {
    runTests();
} catch (e) {
    console.error(e);
    process.exit(1);
}
