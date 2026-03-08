// Verify an EXIT marker from JSON
// Run: node examples/verify-marker.js

const { quickExit, quickVerify, toJSON } = require("cellar-door-exit");

async function main() {
  // Create a marker to verify
  const { marker } = await quickExit("did:web:example.com", {
    exitType: "voluntary",
    status: "good_standing",
    reason: "Migrating to new platform",
  });

  const json = toJSON(marker);

  // Verify the marker
  const result = quickVerify(json);

  console.log("Verification result:");
  console.log("  Valid:", result.valid);
  console.log("  Errors:", result.errors.length === 0 ? "none" : result.errors);
  console.log("  Marker ID:", marker.id);
}

main().catch(console.error);
