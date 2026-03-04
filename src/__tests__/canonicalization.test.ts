import { describe, it, expect } from "vitest";
import { canonicalize } from "../marker.js";

describe("Canonicalization — RFC 8785 JCS", () => {
  it("sorts keys lexicographically", () => {
    expect(canonicalize({ z: 1, a: 2 })).toBe('{"a":2,"z":1}');
  });

  it("handles nested objects with sorted keys", () => {
    expect(canonicalize({ b: { d: 1, c: 2 }, a: 3 })).toBe(
      '{"a":3,"b":{"c":2,"d":1}}'
    );
  });

  it("handles arrays (preserves order)", () => {
    expect(canonicalize([3, 1, 2])).toBe("[3,1,2]");
  });

  it("handles null values", () => {
    expect(canonicalize(null)).toBe("null");
    expect(canonicalize({ a: null })).toBe('{"a":null}');
  });

  it("handles empty objects", () => {
    expect(canonicalize({})).toBe("{}");
  });

  it("handles empty arrays", () => {
    expect(canonicalize([])).toBe("[]");
  });

  it("handles unicode strings", () => {
    const result = canonicalize({ emoji: "😀", café: "latte" });
    expect(result).toContain('"emoji"');
    expect(result).toContain('"café"');
    // Should be valid JSON
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it("handles numeric keys (sorted as strings)", () => {
    expect(canonicalize({ "2": "b", "10": "a", "1": "c" })).toBe(
      '{"1":"c","10":"a","2":"b"}'
    );
  });

  it("handles floats per IEEE 754", () => {
    const result = canonicalize({ pi: 3.14159 });
    expect(result).toBe('{"pi":3.14159}');
  });

  it("handles boolean values", () => {
    expect(canonicalize({ t: true, f: false })).toBe('{"f":false,"t":true}');
  });

  it("handles deeply nested structures", () => {
    const deep = { a: { b: { c: { d: "end" } } } };
    expect(canonicalize(deep)).toBe('{"a":{"b":{"c":{"d":"end"}}}}');
  });

  it("handles undefined (returns 'null')", () => {
    expect(canonicalize(undefined)).toBe("null");
  });

  it("is deterministic across calls", () => {
    const obj = { z: [1, { b: 2, a: 1 }], a: "hello" };
    expect(canonicalize(obj)).toBe(canonicalize(obj));
  });

  it("handles strings with special characters", () => {
    const result = canonicalize({ msg: 'hello "world"\nnewline' });
    expect(() => JSON.parse(result)).not.toThrow();
    expect(JSON.parse(result).msg).toBe('hello "world"\nnewline');
  });

  it("handles integer zero and negative numbers", () => {
    expect(canonicalize({ zero: 0, neg: -42 })).toBe('{"neg":-42,"zero":0}');
  });
});
