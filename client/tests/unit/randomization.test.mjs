import { test } from "node:test";
import { deepEqual, equal } from "node:assert";
import { stableShuffle } from "../../src/lib/utils/randomization.js";

const sampleItems = [
  { id: "q1" },
  { id: "q2" },
  { id: "q3" },
  { id: "q4" },
];

test("stableShuffle returns deterministic order for same seed", () => {
  const runA = stableShuffle(sampleItems, "section-a");
  const runB = stableShuffle(sampleItems, "section-a");
  deepEqual(
    runA.map((item) => item.id),
    runB.map((item) => item.id)
  );
});

test("stableShuffle preserves membership and can vary across seed set", () => {
  const baseOrder = stableShuffle(sampleItems, "section-a").map((item) => item.id);
  const candidateSeeds = ["section-b", "section-c", "section-d", "section-e"];
  const producedOrders = candidateSeeds.map((seed) =>
    stableShuffle(sampleItems, seed).map((item) => item.id)
  );

  for (const order of producedOrders) {
    deepEqual([...order].sort(), ["q1", "q2", "q3", "q4"]);
  }

  const hasDifferentOrder = producedOrders.some(
    (order) => JSON.stringify(order) !== JSON.stringify(baseOrder)
  );
  equal(hasDifferentOrder, true);
});
