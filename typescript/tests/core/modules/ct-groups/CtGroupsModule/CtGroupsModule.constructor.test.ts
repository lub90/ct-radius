import { describe, it, expect, beforeEach, vi } from "vitest";
import { FixtureLoader } from "../../../../helpers/FixtureLoader.ts";
import { CtGroupsModule } from "../../../../../src/core/modules/ct-groups/CtGroupsModule.ts";
import dotenv from "dotenv";
import fs from "fs";

function fakeClient() {
    return {} as any;
}

function fakeLogger() {
    return { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any;
}

describe("CtGroupsModule constructor & config loading", () => {
    const fixtures = new FixtureLoader("./tests/core/modules/ct-groups/fixtures");
    const validConfigs = fixtures.getValidConfigs();
    const invalidConfigs = fixtures.getInvalidConfigs();
    const validEnvs = fixtures.getValidEnvs();
    const invalidEnvs = fixtures.getInvalidEnvs();

    beforeEach(() => {
        // ensure env cleared
        delete process.env.CT_GROUPS_PRIVATE_DECRYPTION_KEY_PWD;
        delete process.env.CT_API_TOKEN;
    });

    it("loads valid configs when env variables present", async () => {
        process.env.CT_GROUPS_PRIVATE_DECRYPTION_KEY_PWD = "pwd";
        process.env.CT_API_TOKEN = "token";

        for (const cfg of validConfigs) {
            const raw = require(cfg);
            expect(() => new CtGroupsModule(fakeClient(), raw, fakeLogger())).not.toThrow();
        }
    });

    it("throws for invalid configs", async () => {
        process.env.CT_GROUPS_PRIVATE_DECRYPTION_KEY_PWD = "pwd";
        process.env.CT_API_TOKEN = "token";

        for (const cfg of invalidConfigs) {
            const raw = require(cfg);
            expect(() => new CtGroupsModule(fakeClient(), raw, fakeLogger())).toThrow();
        }
    });

    it("accepts valid env files", async () => {
        for (const envPath of validEnvs) {
            delete process.env.CT_GROUPS_PRIVATE_DECRYPTION_KEY_PWD;
            delete process.env.CT_API_TOKEN;

            const envContent = fs.readFileSync(envPath, "utf8");
            const parsed = dotenv.parse(envContent);
            Object.assign(process.env, parsed);

            const raw = require(validConfigs[0]);
            expect(() => new CtGroupsModule(fakeClient(), raw, fakeLogger())).not.toThrow();

            Object.keys(parsed).forEach(k => delete process.env[k]);
        }
    });

    it("rejects invalid env files", async () => {
        for (const envPath of invalidEnvs) {
            delete process.env.CT_GROUPS_PRIVATE_DECRYPTION_KEY_PWD;
            delete process.env.CT_API_TOKEN;

            const envContent = fs.readFileSync(envPath, "utf8");
            const parsed = dotenv.parse(envContent);
            Object.assign(process.env, parsed);

            const raw = require(validConfigs[0]);
            expect(() => new CtGroupsModule(fakeClient(), raw, fakeLogger())).toThrow();

            Object.keys(parsed).forEach(k => delete process.env[k]);
        }
    });


    it("constructor throws on invalid arguments and accepts valid ones", async () => {
        process.env.CT_GROUPS_PRIVATE_DECRYPTION_KEY_PWD = "pwd";
        process.env.CT_API_TOKEN = "token";

        const raw = require(validConfigs[0]);

        expect(() => new CtGroupsModule(null as any, raw, fakeLogger())).toThrow();
        expect(() => new CtGroupsModule(undefined as any, raw, fakeLogger())).toThrow();
        expect(() => new CtGroupsModule("<CLIENT>" as any, raw, fakeLogger())).toThrow();
        expect(() => new CtGroupsModule(fakeClient(), "" as any, fakeLogger())).toThrow();
        expect(() => new CtGroupsModule(fakeClient(), " " as any, fakeLogger())).toThrow();
        expect(() => new CtGroupsModule(fakeClient(), null as any, fakeLogger())).toThrow();
        expect(() => new CtGroupsModule(fakeClient(), undefined as any, fakeLogger())).toThrow();
        expect(() => new CtGroupsModule(fakeClient(), raw, null as any)).toThrow();
        expect(() => new CtGroupsModule(fakeClient(), raw, undefined as any)).toThrow();
        expect(() => new CtGroupsModule(fakeClient(), raw, "<LOGGER>" as any)).toThrow();
    });
});
