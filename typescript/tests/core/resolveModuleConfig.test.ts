import { describe, test, expect } from "vitest";
import { resolveModuleConfig } from "../../src/core/resolveModuleConfig";

describe("resolveModuleConfig – full test suite", () => {

    // 1. module does not exist
    test("throws if module does not exist", () => {
        const cfg = {};
        expect(() => resolveModuleConfig(cfg, "missing")).toThrow();
    });

    // module has type → returned directly
    test("returns module directly if it has type", () => {
        const cfg = {
            a: { type: "ct-groups", testAttribute: 1 }
        };
        expect(resolveModuleConfig(cfg, "a")).toEqual({
            type: "ct-groups",
            testAttribute: 1
        });
    });

    // module inherits from parent
    test("3. inherits from parent and merges correctly", () => {
        const cfg = {
            parent: { type: "ct-groups", testAttribute: 1 },
            child: { inherits: "parent", testAttribute: 2 }
        };
        expect(resolveModuleConfig(cfg, "child")).toEqual({
            type: "ct-groups",
            testAttribute: 2
        });
    });

    // module has neither type nor inherits
    test("4. throws if module has neither type nor inherits", () => {
        const cfg = {
            broken: { testAttribute: 1 }
        };
        expect(() => resolveModuleConfig(cfg, "broken")).toThrow();
    });

    // inheritance loop A → B → A
    test("5. detects inheritance loop", () => {
        const cfg = {
            a: { inherits: "b", testAttribute: 1 },
            b: { inherits: "a", testAttribute: 2 }
        };
        expect(() => resolveModuleConfig(cfg, "a")).toThrow();
    });

    // self inheritance
    test("detects self inheritance", () => {
        const cfg = {
            a: { inherits: "a", testAttribute: 1 }
        };
        expect(() => resolveModuleConfig(cfg, "a")).toThrow();
    });

    // inherits → missing parent
    test("throws if inherited module does not exist", () => {
        const cfg = {
            child: { inherits: "missing", testAttribute: 1 }
        };
        expect(() => resolveModuleConfig(cfg, "child")).toThrow();
    });

    // child overrides parent
    test("child overrides parent attributes", () => {
        const cfg = {
            parent: { type: "ct-groups", testAttribute: 1 },
            child: { inherits: "parent", testAttribute: 2 }
        };
        expect(resolveModuleConfig(cfg, "child")).toEqual({
            type: "ct-groups",
            testAttribute: 2
        });
    });

    // deep inheritance chain
    test("deep inheritance chain merges correctly", () => {
        const cfg = {
            grand: { type: "ct-groups", testAttribute: 1 },
            parent: { inherits: "grand", testAttribute: 2 },
            child: { inherits: "parent", testAttribute: 3 }
        };
        expect(resolveModuleConfig(cfg, "child")).toEqual({
            type: "ct-groups",
            testAttribute: 3
        });
    });

    // parent inherits further up chain
    test("parent inherits further up chain", () => {
        const cfg = {
            grand: { type: "ct-groups", testAttribute: 1 },
            parent: { inherits: "grand", testAttribute: 2 },
            child: { inherits: "parent", testAttribute: 3 }
        };
        expect(resolveModuleConfig(cfg, "child")).toEqual({
            type: "ct-groups",
            testAttribute: 3
        });
    });

    // parent missing in chain
    test("missing parent in chain throws", () => {
        const cfg = {
            child: { inherits: "parent", testAttribute: 1 }
        };
        expect(() => resolveModuleConfig(cfg, "child")).toThrow();
    });

    // child overrides parent arrays
    test("child overrides parent arrays", () => {
        const cfg = {
            parent: { type: "ct-groups", testAttribute: [1, 2] },
            child: { inherits: "parent", testAttribute: [3] }
        };
        expect(resolveModuleConfig(cfg, "child")).toEqual({
            type: "ct-groups",
            testAttribute: [3]
        });
    });

    // child overrides parent objects
    test("child overrides parent objects", () => {
        const cfg = {
            parent: { type: "ct-groups", testAttribute: { a: 1, b: 2 } },
            child: { inherits: "parent", testAttribute: { b: 3 } }
        };
        expect(resolveModuleConfig(cfg, "child")).toEqual({
            type: "ct-groups",
            testAttribute: { b: 3 }
        });
    });

    // child adds new keys
    test("child adds new keys", () => {
        const cfg = {
            parent: { type: "ct-groups", testAttribute: 1 },
            child: { inherits: "parent", newKey: 2 }
        };
        expect(resolveModuleConfig(cfg, "child")).toEqual({
            type: "ct-groups",
            testAttribute: 1,
            newKey: 2
        });
    });

    // pure inheritance without overrides
    test("pure inheritance without overrides", () => {
        const cfg = {
            parent: { type: "ct-groups", testAttribute: 1 },
            child: { inherits: "parent" }
        };
        expect(resolveModuleConfig(cfg, "child")).toEqual({
            type: "ct-groups",
            testAttribute: 1
        });
    });

    // parent inherits missing grandparent
    test("parent inherits missing grandparent", () => {
        const cfg = {
            parent: { inherits: "missing", testAttribute: 1 },
            child: { inherits: "parent", testAttribute: 2 }
        };
        expect(() => resolveModuleConfig(cfg, "child")).toThrow();
    });

    test("throws if no module in the inheritance chain defines a type", () => {
        const cfg = {
            grand: { inherits: "nobody", testAttribute: 1 },
            parent: { inherits: "grand", testAttribute: 2 },
            child: { inherits: "parent", testAttribute: 3 }
        };
        expect(() => resolveModuleConfig(cfg, "child")).toThrow();
    });


});
