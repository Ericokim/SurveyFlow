/**
 * Guards the OpenAPI document against drift.
 *
 * Every endpoint in `server/routes/*.routes.js` carries a `// @route METHOD path`
 * annotation. This suite treats those annotations as the source of truth and
 * fails if the hand-authored spec gains, loses, or misspells an operation.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { openapiSpec } from "../../docs/openapi.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const routesDir = path.join(here, "..", "..", "routes");

/** Operations that legitimately exist in the spec without a `@route` annotation. */
const SPEC_ONLY = new Set(["GET /api/health"]);

/** `/api/surveys/:id` -> `/api/surveys/{id}` */
const toOpenApiPath = (p) => p.replace(/:([A-Za-z0-9_]+)/g, "{$1}");

function annotatedRoutes() {
  const found = new Set();
  for (const file of readdirSync(routesDir).filter((f) =>
    f.endsWith(".routes.js")
  )) {
    const src = readFileSync(path.join(routesDir, file), "utf8");
    const re = /@route\s+(GET|POST|PUT|PATCH|DELETE)\s+(\S+)/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      found.add(`${m[1]} ${toOpenApiPath(m[2])}`);
    }
  }
  return found;
}

function specOperations() {
  const found = new Set();
  for (const [route, item] of Object.entries(openapiSpec.paths)) {
    for (const method of Object.keys(item)) {
      found.add(`${method.toUpperCase()} ${route}`);
    }
  }
  return found;
}

describe("openapi coverage", () => {
  const annotated = annotatedRoutes();
  const documented = specOperations();

  test("the router exposes the endpoints we think it does", () => {
    assert.equal(
      annotated.size,
      52,
      `expected 52 annotated routes, found ${annotated.size}`
    );
  });

  test("every annotated route is documented", () => {
    const missing = [...annotated].filter((r) => !documented.has(r)).sort();
    assert.deepEqual(missing, [], `undocumented endpoints:\n  ${missing.join("\n  ")}`);
  });

  test("every documented operation maps to a real route", () => {
    const extra = [...documented]
      .filter((r) => !annotated.has(r) && !SPEC_ONLY.has(r))
      .sort();
    assert.deepEqual(extra, [], `documented but not routed:\n  ${extra.join("\n  ")}`);
  });

  test("every internal $ref resolves", () => {
    const refs = [];
    (function walk(node) {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== "object") return;
      for (const [k, v] of Object.entries(node)) {
        if (k === "$ref" && typeof v === "string") refs.push(v);
        else walk(v);
      }
    })(openapiSpec);

    const broken = refs.filter((ref) => {
      const segments = ref.replace(/^#\//, "").split("/");
      let cursor = openapiSpec;
      for (const s of segments) {
        if (cursor == null || !(s in cursor)) return true;
        cursor = cursor[s];
      }
      return false;
    });

    assert.deepEqual([...new Set(broken)], [], "unresolved $ref values");
  });

  test("authenticated operations declare the bearer scheme", () => {
    const publicTags = new Set(["Health", "Auth", "Respondent", "Company"]);
    const missingSecurity = [];

    for (const [route, item] of Object.entries(openapiSpec.paths)) {
      for (const [method, op] of Object.entries(item)) {
        const isPublicArea = (op.tags || []).some((t) => publicTags.has(t));
        if (isPublicArea) continue;
        if (!Array.isArray(op.security) || op.security.length === 0) {
          missingSecurity.push(`${method.toUpperCase()} ${route}`);
        }
      }
    }

    assert.deepEqual(missingSecurity.sort(), [], "operations missing security");
  });

  test("spec carries the pieces Scalar renders", () => {
    assert.equal(openapiSpec.openapi, "3.1.0");
    assert.ok(openapiSpec.info.title);
    assert.ok(openapiSpec.servers.length >= 1);
    assert.ok(openapiSpec.components.securitySchemes.bearerAuth);
    // Every tag referenced by an operation must be declared up front, or the
    // sidebar renders an "untagged" bucket.
    const declared = new Set(openapiSpec.tags.map((t) => t.name));
    const used = new Set();
    for (const item of Object.values(openapiSpec.paths)) {
      for (const op of Object.values(item)) (op.tags || []).forEach((t) => used.add(t));
    }
    const undeclared = [...used].filter((t) => !declared.has(t));
    assert.deepEqual(undeclared, [], "operations use undeclared tags");
  });
});
