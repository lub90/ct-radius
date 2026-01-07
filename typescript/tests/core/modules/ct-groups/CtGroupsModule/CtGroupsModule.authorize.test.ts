import { describe, it, expect, beforeEach, vi } from "vitest";
import { ChallengeResponse, RejectResponse } from "../../../../../src/types/RadiusResponse";
import { CtGroupsModule } from "../../../../../src/core/modules/ct-groups/CtGroupsModule";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

function makeTempCachePath() {
    return join(tmpdir(), `ct-cache-${randomUUID()}.sqlite`);
}

function fakeClient() { return {} as any; }
function fakeLogger() { return { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any; }

describe("CtGroupsModule.authorize - unit tests with mocked services", () => {

    beforeEach(() => {
        // Ensure envs required by constructor are set
        process.env.CT_GROUPS_PRIVATE_DECRYPTION_KEY_PWD = "pwd";
        process.env.CT_API_TOKEN = "token";
    });

    describe("fullyDefined config", () => {
        const cfg = require("../authorize-fixtures/fullyDefined/config.json");
        cfg.pathToCacheFile = makeTempCachePath();

        it("returns null for unknown user (userdataService.get returns undefined)", async () => {
            const req = { username: "alice", requestedVlanId: undefined } as any;

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());

            const userdata = { get: vi.fn().mockResolvedValue(undefined) };
            const spyUD = vi.spyOn(mod as any, "getUserdataService").mockResolvedValue(userdata as any);
            const spyPwd = vi.spyOn(mod as any, "getPasswordService").mockResolvedValue({ getCleartextPwd: vi.fn() } as any);

            const res = await mod.authorize(req);
            expect(res).toBeNull();
            expect(userdata.get).toHaveBeenCalledWith("alice");
            expect(spyUD).toHaveBeenCalled();
            expect(spyPwd).not.toHaveBeenCalled();
        });

        it("rejects when user has no wifi access", async () => {
            const req = { username: "bob" } as any;

            const user = { username: "bob", id: 2, groups: [99], timestamp: Date.now() };

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());
            const userdata = { get: vi.fn().mockResolvedValue(user) };
            const spyUD = vi.spyOn(mod as any, "getUserdataService").mockResolvedValue(userdata as any);
            const spyPwd = vi.spyOn(mod as any, "getPasswordService").mockResolvedValue({ getCleartextPwd: vi.fn() } as any);

            const res = await mod.authorize(req);
            expect(res).toBeInstanceOf(RejectResponse);
            expect(userdata.get).toHaveBeenCalledWith("bob");
            expect(spyUD).toHaveBeenCalled();
            expect(spyPwd).not.toHaveBeenCalled();
        });

        it("rejects when password service returns no password", async () => {
            const req = { username: "charlie" } as any;
            const user = { username: "charlie", id: 3, groups: [1], timestamp: Date.now() };

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());
            const userdata = { get: vi.fn().mockResolvedValue(user) };
            const pwd = { getCleartextPwd: vi.fn().mockResolvedValue(undefined) };

            vi.spyOn(mod as any, "getUserdataService").mockResolvedValue(userdata as any);
            const spyPwd = vi.spyOn(mod as any, "getPasswordService").mockResolvedValue(pwd as any);

            const res = await mod.authorize(req);
            expect(res).toBeInstanceOf(RejectResponse);
            expect(userdata.get).toHaveBeenCalledWith("charlie");
            expect(spyPwd).toHaveBeenCalled();
            expect(pwd.getCleartextPwd).toHaveBeenCalledWith(3);
        });

        it("honors requested VLAN when allowed and denies when not allowed", async () => {
            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());

            const user = { username: "gina", id: 7, groups: [3], timestamp: Date.now() };
            const userdata = { get: vi.fn().mockResolvedValue(user) };
            const pwd = { getCleartextPwd: vi.fn().mockResolvedValue("pwd") };

            vi.spyOn(mod as any, "getUserdataService").mockResolvedValue(userdata as any);
            vi.spyOn(mod as any, "getPasswordService").mockResolvedValue(pwd as any);

            // allowed via assignmentsIfRequested (group 3 -> vlan 30)
            const allowedReq = { username: "gina", requestedVlanId: 30 } as any;
            const resAllowed = await mod.authorize(allowedReq);

            expect(resAllowed).toBeInstanceOf(ChallengeResponse);
            const crAllowed: any = resAllowed;
            expect(crAllowed.vlan?.tunnelPrivateGroupId).toBe(30);
            expect(crAllowed.vlan?.tunnelType).toBe(13);
            expect(crAllowed.vlan?.tunnelMediumType).toBe(6);
            expect(userdata.get).toHaveBeenCalledWith("gina");
            expect(pwd.getCleartextPwd).toHaveBeenCalledWith(7);

            // denied requested VLAN
            const deniedReq = { username: "gina", requestedVlanId: 999 } as any;
            const resDenied = await mod.authorize(deniedReq);

            expect(resDenied).toBeInstanceOf(RejectResponse);
        });

        it("calls underlying services with correct args and propagates errors", async () => {
            const req = { username: "hank" } as any;
            const user = { username: "hank", id: 8, groups: [1], timestamp: Date.now() };

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());

            const userdata = { get: vi.fn().mockResolvedValue(user) };
            const pwd = { getCleartextPwd: vi.fn().mockResolvedValue("pwd") };

            const spyUD = vi.spyOn(mod as any, "getUserdataService").mockResolvedValue(userdata as any);
            const spyPwd = vi.spyOn(mod as any, "getPasswordService").mockResolvedValue(pwd as any);

            const res = await mod.authorize(req);
            expect(userdata.get).toHaveBeenCalledWith("hank");
            expect(pwd.getCleartextPwd).toHaveBeenCalledWith(8);

            // propagate errors from userdata
            spyUD.mockResolvedValue({ get: vi.fn().mockRejectedValue(new Error("boom")) } as any);
            await expect(mod.authorize(req)).rejects.toThrow("boom");

            // propagate errors from password service
            spyUD.mockResolvedValue(userdata as any);
            spyPwd.mockResolvedValue({ getCleartextPwd: vi.fn().mockRejectedValue(new Error("pwfail")) } as any);
            await expect(mod.authorize(req)).rejects.toThrow("pwfail");
        });

        it("validate input for authorize and returns null for unknown users", async () => {
            const invalids: any[] = ["", "   ", undefined, null];
            for (const v of invalids) {
                const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());
                await expect(mod.authorize({ username: v })).rejects.toThrow();
            }

            // unknown user -> null
            const mod2 = new CtGroupsModule(fakeClient(), cfg, fakeLogger());
            vi.spyOn(mod2 as any, "getUserdataService").mockResolvedValue({ get: vi.fn().mockResolvedValue(undefined) });
            const res = await mod2.authorize({ username: "noone" } as any);
            expect(res).toBeNull();
        });
    });

    describe("noVlanMapping config", () => {
        const cfg = require("../authorize-fixtures/noVlanMapping/config.json");
        cfg.pathToCacheFile = makeTempCachePath();

        it("returns ChallengeResponse without VLAN when no VLAN assigned and none requested", async () => {
            const req = { username: "dave" } as any;
            const user = { username: "dave", id: 4, groups: [1], timestamp: Date.now() };

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());

            const userdata = { get: vi.fn().mockResolvedValue(user) };
            const pwd = { getCleartextPwd: vi.fn().mockResolvedValue("secret") };

            vi.spyOn(mod as any, "getUserdataService").mockResolvedValue(userdata as any);
            vi.spyOn(mod as any, "getPasswordService").mockResolvedValue(pwd as any);

            const res = await mod.authorize(req);

            expect(res).toBeInstanceOf(ChallengeResponse);
            const cr: any = res;
            expect(cr.cleartextPassword).toBe("secret");
            expect(cr.vlan).toBeUndefined();
            expect(userdata.get).toHaveBeenCalledWith("dave");
            expect(pwd.getCleartextPwd).toHaveBeenCalledWith(4);
        });

        it("rejects when a VLAN id is requested but no mapping exists", async () => {
            const req = { username: "dave", requestedVlanId: 123 } as any;
            const user = { username: "dave", id: 4, groups: [1], timestamp: Date.now() };

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());

            vi.spyOn(mod as any, "getUserdataService").mockResolvedValue({ get: vi.fn().mockResolvedValue(user) } as any);
            vi.spyOn(mod as any, "getPasswordService").mockResolvedValue({ getCleartextPwd: vi.fn().mockResolvedValue("secret") } as any);

            const res = await mod.authorize(req);
            expect(res).toBeInstanceOf(RejectResponse);
        });
    });

    describe("defaultOnly config", () => {
        const cfg = require("../authorize-fixtures/defaultOnly/config.json");
        cfg.pathToCacheFile = makeTempCachePath();

        it("assigns default VLAN when configured and none requested", async () => {
            const req = { username: "erin" } as any;
            const user = { username: "erin", id: 5, groups: [1], timestamp: Date.now() };

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());

            const userdata = { get: vi.fn().mockResolvedValue(user) };
            const pwd = { getCleartextPwd: vi.fn().mockResolvedValue("pwd") };

            vi.spyOn(mod as any, "getUserdataService").mockResolvedValue(userdata as any);
            vi.spyOn(mod as any, "getPasswordService").mockResolvedValue(pwd as any);

            const res = await mod.authorize(req);

            expect(res).toBeInstanceOf(ChallengeResponse);
            const cr: any = res;
            expect(cr.vlan?.tunnelPrivateGroupId).toBe(10);
            expect(cr.vlan?.tunnelType).toBe(13);
            expect(cr.vlan?.tunnelMediumType).toBe(6);
            expect(userdata.get).toHaveBeenCalledWith("erin");
            expect(pwd.getCleartextPwd).toHaveBeenCalledWith(5);
        });

        it("rejects requested VLAN that does not match the default VLAN", async () => {
            const req = { username: "erin", requestedVlanId: 999 } as any;
            const user = { username: "erin", id: 5, groups: [1], timestamp: Date.now() };

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());

            vi.spyOn(mod as any, "getUserdataService").mockResolvedValue({ get: vi.fn().mockResolvedValue(user) } as any);
            vi.spyOn(mod as any, "getPasswordService").mockResolvedValue({ getCleartextPwd: vi.fn().mockResolvedValue("pwd") } as any);

            const res = await mod.authorize(req);
            expect(res).toBeInstanceOf(RejectResponse);
        });

        it("accepts requested VLAN that matches the default VLAN", async () => {
            const req = { username: "erin", requestedVlanId: 10 } as any;
            const user = { username: "erin", id: 5, groups: [1], timestamp: Date.now() };

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());

            const userdata = { get: vi.fn().mockResolvedValue(user) };
            const pwd = { getCleartextPwd: vi.fn().mockResolvedValue("pwd") };

            vi.spyOn(mod as any, "getUserdataService").mockResolvedValue(userdata as any);
            vi.spyOn(mod as any, "getPasswordService").mockResolvedValue(pwd as any);

            const res = await mod.authorize(req);
            expect(res).toBeInstanceOf(ChallengeResponse);
            const cr: any = res;
            expect(cr.vlan?.tunnelPrivateGroupId).toBe(10);
            expect(cr.vlan?.tunnelType).toBe(13);
            expect(cr.vlan?.tunnelMediumType).toBe(6);
        });
    });

    describe("onlyAssignment config", () => {
        const cfg = require("../authorize-fixtures/onlyAssignment/config.json");
        cfg.pathToCacheFile = makeTempCachePath();

        it("assigns VLAN from assignment when applicable", async () => {
            const req = { username: "frank" } as any;
            const user = { username: "frank", id: 6, groups: [1, 2], timestamp: Date.now() };

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());

            const userdata = { get: vi.fn().mockResolvedValue(user) };
            const pwd = { getCleartextPwd: vi.fn().mockResolvedValue("pwd") };

            vi.spyOn(mod as any, "getUserdataService").mockResolvedValue(userdata as any);
            vi.spyOn(mod as any, "getPasswordService").mockResolvedValue(pwd as any);

            const res = await mod.authorize(req);

            expect(res).toBeInstanceOf(ChallengeResponse);
            const cr: any = res;
            expect(cr.vlan?.tunnelPrivateGroupId).toBe(20);
            expect(cr.vlan?.tunnelType).toBe(13);
            expect(cr.vlan?.tunnelMediumType).toBe(6);
            expect(userdata.get).toHaveBeenCalledWith("frank");
            expect(pwd.getCleartextPwd).toHaveBeenCalledWith(6);
        });

        it("skips first match and uses later matching assignment when requested VLAN matches", async () => {
            const req = { username: "frank", requestedVlanId: 22 } as any;
            const user = { username: "frank", id: 6, groups: [1, 2, 20], timestamp: Date.now() };

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());

            const userdata = { get: vi.fn().mockResolvedValue(user) };
            const pwd = { getCleartextPwd: vi.fn().mockResolvedValue("pwd") };

            vi.spyOn(mod as any, "getUserdataService").mockResolvedValue(userdata as any);
            vi.spyOn(mod as any, "getPasswordService").mockResolvedValue(pwd as any);

            const res = await mod.authorize(req);

            expect(res).toBeInstanceOf(ChallengeResponse);
            const cr: any = res;
            expect(cr.vlan?.tunnelPrivateGroupId).toBe(22);
            expect(cr.vlan?.tunnelType).toBe(13);
            expect(cr.vlan?.tunnelMediumType).toBe(6);
        });

        it("rejects when user requests VLAN that he is not assigned to", async () => {
            const req = { username: "frank", requestedVlanId: 22 } as any;
            const user = { username: "frank", id: 6, groups: [1, 2], timestamp: Date.now() };

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());

            vi.spyOn(mod as any, "getUserdataService").mockResolvedValue({ get: vi.fn().mockResolvedValue(user) } as any);
            vi.spyOn(mod as any, "getPasswordService").mockResolvedValue({ getCleartextPwd: vi.fn().mockResolvedValue("pwd") } as any);

            const res = await mod.authorize(req);
            expect(res).toBeInstanceOf(RejectResponse);
        });

        it("assigns first matching VLAN when user has multiple matching assignments", async () => {
            const req = { username: "frank" } as any;
            const user = { username: "frank", id: 6, groups: [1, 20, 22], timestamp: Date.now() };

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());

            const userdata = { get: vi.fn().mockResolvedValue(user) };
            const pwd = { getCleartextPwd: vi.fn().mockResolvedValue("pwd") };

            vi.spyOn(mod as any, "getUserdataService").mockResolvedValue(userdata as any);
            vi.spyOn(mod as any, "getPasswordService").mockResolvedValue(pwd as any);

            const res = await mod.authorize(req);

            expect(res).toBeInstanceOf(ChallengeResponse);
            const cr: any = res;
            expect(cr.vlan?.tunnelPrivateGroupId).toBe(22);
            expect(cr.vlan?.tunnelType).toBe(13);
            expect(cr.vlan?.tunnelMediumType).toBe(6);
        });
    });


    describe("assignmentIfRequested config", () => {
        const cfg = require("../authorize-fixtures/assignmentIfRequested/config.json");
        cfg.pathToCacheFile = makeTempCachePath();

        it("assigns default VLAN if user has wifi access but no assignment match and no request", async () => {
            const req = { username: "test1" } as any;
            const user = { username: "test1", id: 10, groups: [1], timestamp: Date.now() };

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());

            const userdata = { get: vi.fn().mockResolvedValue(user) };
            const pwd = { getCleartextPwd: vi.fn().mockResolvedValue("pwd") };

            vi.spyOn(mod as any, "getUserdataService").mockResolvedValue(userdata as any);
            vi.spyOn(mod as any, "getPasswordService").mockResolvedValue(pwd as any);

            const res = await mod.authorize(req);

            expect(res).toBeInstanceOf(ChallengeResponse);
            const cr: any = res;
            expect(cr.vlan?.tunnelPrivateGroupId).toBe(10);
            expect(cr.vlan?.tunnelType).toBe(13);
            expect(cr.vlan?.tunnelMediumType).toBe(6);
        });

        it("assigns correct VLAN if user has wifi access, assignment match and no request", async () => {
            const req = { username: "test2" } as any;
            const user = { username: "test2", id: 11, groups: [1, 2], timestamp: Date.now() };

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());

            const userdata = { get: vi.fn().mockResolvedValue(user) };
            const pwd = { getCleartextPwd: vi.fn().mockResolvedValue("pwd") };

            vi.spyOn(mod as any, "getUserdataService").mockResolvedValue(userdata as any);
            vi.spyOn(mod as any, "getPasswordService").mockResolvedValue(pwd as any);

            const res = await mod.authorize(req);

            expect(res).toBeInstanceOf(ChallengeResponse);
            const cr: any = res;
            expect(cr.vlan?.tunnelPrivateGroupId).toBe(20);
            expect(cr.vlan?.tunnelType).toBe(13);
            expect(cr.vlan?.tunnelMediumType).toBe(6);
        });

        it("assigns default VLAN if user has wifi access, assignmentsIfRequested match but no request", async () => {
            const req = { username: "test3" } as any;
            const user = { username: "test3", id: 12, groups: [1, 3], timestamp: Date.now() };

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());

            const userdata = { get: vi.fn().mockResolvedValue(user) };
            const pwd = { getCleartextPwd: vi.fn().mockResolvedValue("pwd") };

            vi.spyOn(mod as any, "getUserdataService").mockResolvedValue(userdata as any);
            vi.spyOn(mod as any, "getPasswordService").mockResolvedValue(pwd as any);

            const res = await mod.authorize(req);

            expect(res).toBeInstanceOf(ChallengeResponse);
            const cr: any = res;
            expect(cr.vlan?.tunnelPrivateGroupId).toBe(10);
            expect(cr.vlan?.tunnelType).toBe(13);
            expect(cr.vlan?.tunnelMediumType).toBe(6);
        });

        it("assigns correct VLAN from assignmentsIfRequested when requested and matched", async () => {
            const req = { username: "test4", requestedVlanId: 30 } as any;
            const user = { username: "test4", id: 13, groups: [1, 3], timestamp: Date.now() };

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());

            const userdata = { get: vi.fn().mockResolvedValue(user) };
            const pwd = { getCleartextPwd: vi.fn().mockResolvedValue("pwd") };

            vi.spyOn(mod as any, "getUserdataService").mockResolvedValue(userdata as any);
            vi.spyOn(mod as any, "getPasswordService").mockResolvedValue(pwd as any);

            const res = await mod.authorize(req);

            expect(res).toBeInstanceOf(ChallengeResponse);
            const cr: any = res;
            expect(cr.vlan?.tunnelPrivateGroupId).toBe(30);
            expect(cr.vlan?.tunnelType).toBe(13);
            expect(cr.vlan?.tunnelMediumType).toBe(6);
        });

        it("rejects if user requests VLAN from assignmentsIfRequested that he is not assigned to", async () => {
            const req = { username: "test5", requestedVlanId: 30 } as any;
            const user = { username: "test5", id: 14, groups: [1, 31], timestamp: Date.now() };

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());

            vi.spyOn(mod as any, "getUserdataService").mockResolvedValue({ get: vi.fn().mockResolvedValue(user) } as any);
            vi.spyOn(mod as any, "getPasswordService").mockResolvedValue({ getCleartextPwd: vi.fn().mockResolvedValue("pwd") } as any);

            const res = await mod.authorize(req);
            expect(res).toBeInstanceOf(RejectResponse);
        });

        it("rejects if user has no wifi access even if matching assignmentsIfRequested group", async () => {
            const req = { username: "test6" } as any;
            const user = { username: "test6", id: 15, groups: [3, 99], timestamp: Date.now() };

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());

            vi.spyOn(mod as any, "getUserdataService").mockResolvedValue({ get: vi.fn().mockResolvedValue(user) } as any);
            vi.spyOn(mod as any, "getPasswordService").mockResolvedValue({ getCleartextPwd: vi.fn().mockResolvedValue("pwd") } as any);

            const res = await mod.authorize(req);
            expect(res).toBeInstanceOf(RejectResponse);
        });
    });

    describe("assignmentAndDefault config", () => {
        const cfg = require("../authorize-fixtures/assignmentAndDefault/config.json");
        cfg.pathToCacheFile = makeTempCachePath();

        it("assigns first matching assignment VLAN when user has assignment match", async () => {
            const req = { username: "test7" } as any;
            const user = { username: "test7", id: 16, groups: [1, 2], timestamp: Date.now() };

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());

            const userdata = { get: vi.fn().mockResolvedValue(user) };
            const pwd = { getCleartextPwd: vi.fn().mockResolvedValue("pwd") };

            vi.spyOn(mod as any, "getUserdataService").mockResolvedValue(userdata as any);
            vi.spyOn(mod as any, "getPasswordService").mockResolvedValue(pwd as any);

            const res = await mod.authorize(req);

            expect(res).toBeInstanceOf(ChallengeResponse);
            const cr: any = res;
            expect(cr.vlan?.tunnelPrivateGroupId).toBe(20);
        });

        it("assigns default VLAN when user has no assignment match", async () => {
            const req = { username: "test8" } as any;
            const user = { username: "test8", id: 17, groups: [1], timestamp: Date.now() };

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());

            const userdata = { get: vi.fn().mockResolvedValue(user) };
            const pwd = { getCleartextPwd: vi.fn().mockResolvedValue("pwd") };

            vi.spyOn(mod as any, "getUserdataService").mockResolvedValue(userdata as any);
            vi.spyOn(mod as any, "getPasswordService").mockResolvedValue(pwd as any);

            const res = await mod.authorize(req);

            expect(res).toBeInstanceOf(ChallengeResponse);
            const cr: any = res;
            expect(cr.vlan?.tunnelPrivateGroupId).toBe(10);
        });

        it("accepts requested VLAN that matches the default VLAN", async () => {
            const req = { username: "test9", requestedVlanId: 10 } as any;
            const user = { username: "test9", id: 18, groups: [1], timestamp: Date.now() };

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());

            const userdata = { get: vi.fn().mockResolvedValue(user) };
            const pwd = { getCleartextPwd: vi.fn().mockResolvedValue("pwd") };

            vi.spyOn(mod as any, "getUserdataService").mockResolvedValue(userdata as any);
            vi.spyOn(mod as any, "getPasswordService").mockResolvedValue(pwd as any);

            const res = await mod.authorize(req);

            expect(res).toBeInstanceOf(ChallengeResponse);
            const cr: any = res;
            expect(cr.vlan?.tunnelPrivateGroupId).toBe(10);
        });

        it("rejects requested VLAN that does not match any assignment or default", async () => {
            const req = { username: "test10", requestedVlanId: 999 } as any;
            const user = { username: "test10", id: 19, groups: [1], timestamp: Date.now() };

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());

            vi.spyOn(mod as any, "getUserdataService").mockResolvedValue({ get: vi.fn().mockResolvedValue(user) } as any);
            vi.spyOn(mod as any, "getPasswordService").mockResolvedValue({ getCleartextPwd: vi.fn().mockResolvedValue("pwd") } as any);

            const res = await mod.authorize(req);
            expect(res).toBeInstanceOf(RejectResponse);
        });
    });

    describe("assignmentIfRequestedOnly config", () => {
        const cfg = require("../authorize-fixtures/assignmentIfRequestedOnly/config.json");
        cfg.pathToCacheFile = makeTempCachePath();

        it("assigns no VLAN and returns ChallengeResponse when no VLAN requested or matched", async () => {
            const req = { username: "test11" } as any;
            const user = { username: "test11", id: 20, groups: [1], timestamp: Date.now() };

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());

            const userdata = { get: vi.fn().mockResolvedValue(user) };
            const pwd = { getCleartextPwd: vi.fn().mockResolvedValue("pwd") };

            vi.spyOn(mod as any, "getUserdataService").mockResolvedValue(userdata as any);
            vi.spyOn(mod as any, "getPasswordService").mockResolvedValue(pwd as any);

            const res = await mod.authorize(req);

            expect(res).toBeInstanceOf(ChallengeResponse);
            const cr: any = res;
            expect(cr.vlan).toBeUndefined();
        });

        it("assigns correct VLAN when user requests and matches assignmentsIfRequested", async () => {
            const req = { username: "test12", requestedVlanId: 20 } as any;
            const user = { username: "test12", id: 21, groups: [1, 2], timestamp: Date.now() };

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());

            const userdata = { get: vi.fn().mockResolvedValue(user) };
            const pwd = { getCleartextPwd: vi.fn().mockResolvedValue("pwd") };

            vi.spyOn(mod as any, "getUserdataService").mockResolvedValue(userdata as any);
            vi.spyOn(mod as any, "getPasswordService").mockResolvedValue(pwd as any);

            const res = await mod.authorize(req);

            expect(res).toBeInstanceOf(ChallengeResponse);
            const cr: any = res;
            expect(cr.vlan?.tunnelPrivateGroupId).toBe(20);
        });

        it("rejects when user requests VLAN but does not have matching assignmentsIfRequested group", async () => {
            const req = { username: "test13", requestedVlanId: 20 } as any;
            const user = { username: "test13", id: 22, groups: [1], timestamp: Date.now() };

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());

            vi.spyOn(mod as any, "getUserdataService").mockResolvedValue({ get: vi.fn().mockResolvedValue(user) } as any);
            vi.spyOn(mod as any, "getPasswordService").mockResolvedValue({ getCleartextPwd: vi.fn().mockResolvedValue("pwd") } as any);

            const res = await mod.authorize(req);
            expect(res).toBeInstanceOf(RejectResponse);
        });

        it("rejects when user requests VLAN that does not match any assignmentsIfRequested VLAN", async () => {
            const req = { username: "test14", requestedVlanId: 999 } as any;
            const user = { username: "test14", id: 23, groups: [1, 2], timestamp: Date.now() };

            const mod = new CtGroupsModule(fakeClient(), cfg, fakeLogger());

            vi.spyOn(mod as any, "getUserdataService").mockResolvedValue({ get: vi.fn().mockResolvedValue(user) } as any);
            vi.spyOn(mod as any, "getPasswordService").mockResolvedValue({ getCleartextPwd: vi.fn().mockResolvedValue("pwd") } as any);

            const res = await mod.authorize(req);
            expect(res).toBeInstanceOf(RejectResponse);
        });
    });

});
