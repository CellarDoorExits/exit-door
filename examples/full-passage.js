// Complete EXIT + ENTRY passage between platforms
// Run: node examples/full-passage.js

const { quickExit, toJSON } = require("cellar-door-exit");

async function main() {
  // 1. Agent exits Platform A
  const { marker: exitMarker } = await quickExit(
    "did:web:platform-a.example.com",
    {
      reason: "Task complete, migrating to Platform B",
    }
  );

  console.log("1. EXIT from Platform A");
  console.log("   Marker ID:", exitMarker.id);
  console.log("   Subject:", exitMarker.subject);
  console.log("   Size:", toJSON(exitMarker).length, "bytes");

  // Note: For full passage with ENTRY, install cellar-door-entry
  // const { quickEntry } = require("cellar-door-entry");
  // const { arrivalMarker, continuity } = quickEntry(toJSON(exitMarker), "did:web:platform-b.example.com");

  console.log("\n2. For arrival verification, see: @cellar-door/entry");
  console.log("   npm install cellar-door-entry");
}

main().catch(console.error);
