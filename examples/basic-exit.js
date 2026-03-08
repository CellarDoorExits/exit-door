// Basic EXIT marker creation and verification
// Run: node examples/basic-exit.js

const { quickExit, quickVerify, toJSON } = require("cellar-door-exit");

async function main() {
  // Create a signed departure marker
  const { marker, identity } = await quickExit("did:web:platform-a.example.com");

  const json = toJSON(marker);
  console.log("EXIT Marker created:");
  console.log(JSON.stringify(JSON.parse(json), null, 2));

  // Verify it
  const result = quickVerify(json);
  console.log("\nVerification:", result.valid ? "✅ Valid" : "❌ Invalid");
  console.log("Subject:", marker.subject);
  console.log("Origin:", marker.origin);
  console.log("Size:", json.length, "bytes");
}

main().catch(console.error);
