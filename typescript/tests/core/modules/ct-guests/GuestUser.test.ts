import { describe, it, expect } from "vitest";
import { GuestUserSchema, type GuestUser } from "../../../../src/core/modules/ct-guests/GuestUser";

describe("GuestUser", () => {
    describe("Valid guest users", () => {
        it("accepts a minimal valid guest user", () => {
            const guestUser = {
                username: "testuser",
                password: "password123",
                valid: {
                    from: new Date("2025-01-01"),
                    to: new Date("2025-01-10"),
                },
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.username).toBe("testuser");
                expect(result.data.password).toBe("password123");
                expect(result.data.assignedVlan).toBeUndefined();
            }
        });

        it("accepts a guest user with assigned VLAN", () => {
            const guestUser = {
                username: "testuser",
                password: "password123",
                valid: {
                    from: new Date("2025-01-01"),
                    to: new Date("2025-01-10"),
                },
                assignedVlan: 20,
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.assignedVlan).toBe(20);
            }
        });

        it("accepts VLAN ID 0", () => {
            const guestUser = {
                username: "testuser",
                password: "password123",
                valid: {
                    from: new Date("2025-01-01"),
                    to: new Date("2025-01-10"),
                },
                assignedVlan: 0,
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.assignedVlan).toBe(0);
            }
        });

        it("accepts maximum VLAN ID (4094)", () => {
            const guestUser = {
                username: "testuser",
                password: "password123",
                valid: {
                    from: new Date("2025-01-01"),
                    to: new Date("2025-01-10"),
                },
                assignedVlan: 4094,
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.assignedVlan).toBe(4094);
            }
        });

        it("accepts different VLAN IDs", () => {
            const vlanIds = [1, 10, 100, 500, 1000, 2000, 4094];

            for (const vlanId of vlanIds) {
                const guestUser = {
                    username: "testuser",
                    password: "password123",
                    valid: {
                        from: new Date("2025-01-01"),
                        to: new Date("2025-01-10"),
                    },
                    assignedVlan: vlanId,
                };

                const result = GuestUserSchema.safeParse(guestUser);
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.assignedVlan).toBe(vlanId);
                }
            }
        });

        it("accepts different date formats", () => {
            const testCases = [
                { from: "2025-01-01", to: "2025-01-10" },
                { from: "2025-01-01T00:00:00Z", to: "2025-01-10T23:59:59Z" },
                { from: new Date("2025-01-01"), to: new Date("2025-01-10") },
            ];

            for (const dates of testCases) {
                const guestUser = {
                    username: "testuser",
                    password: "password123",
                    valid: dates,
                };

                const result = GuestUserSchema.safeParse(guestUser);
                expect(result.success).toBe(true);
            }
        });

        it("accepts usernames with special characters", () => {
            const usernames = [
                "testuser",
                "test.user",
                "test-user",
                "test_user",
                "test@domain",
                "test123",
                "user.name@domain.com",
            ];

            for (const username of usernames) {
                const guestUser = {
                    username,
                    password: "password123",
                    valid: {
                        from: new Date("2025-01-01"),
                        to: new Date("2025-01-10"),
                    },
                };

                const result = GuestUserSchema.safeParse(guestUser);
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.username).toBe(username);
                }
            }
        });

        it("accepts passwords with special characters", () => {
            const passwords = [
                "password123",
                "P@ssw0rd!",
                "café123",
                "パスワード",
                "very-long-password-with-many-special-chars-!@#$%^&*()",
            ];

            for (const password of passwords) {
                const guestUser = {
                    username: "testuser",
                    password,
                    valid: {
                        from: new Date("2025-01-01"),
                        to: new Date("2025-01-10"),
                    },
                };

                const result = GuestUserSchema.safeParse(guestUser);
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.password).toBe(password);
                }
            }
        });

        it("coerces date strings to Date objects", () => {
            const guestUser = {
                username: "testuser",
                password: "password123",
                valid: {
                    from: "2025-01-01T00:00:00Z",
                    to: "2025-01-10T23:59:59Z",
                },
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.valid.from).toBeInstanceOf(Date);
                expect(result.data.valid.to).toBeInstanceOf(Date);
            }
        });

        it("rejects non-string comment values", () => {
            const invalidComments = [
                123,
                null,
                {},
                [],
                true,
            ];

            for (const comment of invalidComments) {
                const guestUser = {
                    username: "testuser",
                    password: "password123",
                    valid: {
                        from: new Date("2025-01-01"),
                        to: new Date("2025-01-10"),
                    },
                    comment,
                };

                const result = GuestUserSchema.safeParse(guestUser);
                expect(result.success).toBe(false);
            }
        });




    });



    describe("Invalid guest users", () => {
        it("rejects missing username", () => {
            const guestUser = {
                password: "password123",
                valid: {
                    from: new Date("2025-01-01"),
                    to: new Date("2025-01-10"),
                },
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(false);
        });

        // TODO: Add empty like usernames here, too like " " and other only whitespace usernames
        it("rejects empty username", () => {
            const guestUser = {
                username: "",
                password: "password123",
                valid: {
                    from: new Date("2025-01-01"),
                    to: new Date("2025-01-10"),
                },
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(false);
        });

        it("rejects non-string username", () => {
            const testCases = [
                { username: 123, password: "pwd", valid: { from: new Date(), to: new Date() } },
                { username: null, password: "pwd", valid: { from: new Date(), to: new Date() } },
                { username: undefined, password: "pwd", valid: { from: new Date(), to: new Date() } },
                { username: [], password: "pwd", valid: { from: new Date(), to: new Date() } },
            ];

            for (const guestUser of testCases) {
                const result = GuestUserSchema.safeParse(guestUser);
                expect(result.success).toBe(false);
            }
        });

        // TODO: Add empty like passwords here, too like " " and other only whitespace passwords
        it("rejects missing password", () => {
            const guestUser = {
                username: "testuser",
                valid: {
                    from: new Date("2025-01-01"),
                    to: new Date("2025-01-10"),
                },
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(false);
        });

        it("rejects empty password", () => {
            const guestUser = {
                username: "testuser",
                password: "",
                valid: {
                    from: new Date("2025-01-01"),
                    to: new Date("2025-01-10"),
                },
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(false);
        });

        it("rejects whitespace-only username", () => {
            const guestUser = {
                username: "   ",
                password: "password123",
                valid: { from: new Date(), to: new Date() },
            };
            expect(GuestUserSchema.safeParse(guestUser).success).toBe(false);
        });

        it("rejects whitespace-only password", () => {
            const guestUser = {
                username: "Karl",
                password: "  ",
                valid: { from: new Date(), to: new Date() },
            };
            expect(GuestUserSchema.safeParse(guestUser).success).toBe(false);
        });

        it("rejects non-string password", () => {
            const testCases = [
                { username: "user", password: 123, valid: { from: new Date(), to: new Date() } },
                { username: "user", password: null, valid: { from: new Date(), to: new Date() } },
                { username: "user", password: undefined, valid: { from: new Date(), to: new Date() } },
                { username: "user", password: [], valid: { from: new Date(), to: new Date() } },
            ];

            for (const guestUser of testCases) {
                const result = GuestUserSchema.safeParse(guestUser);
                expect(result.success).toBe(false);
            }
        });

        it("rejects missing validity period", () => {
            const guestUser = {
                username: "testuser",
                password: "password123",
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(false);
        });

        it("rejects missing from date", () => {
            const guestUser = {
                username: "testuser",
                password: "password123",
                valid: {
                    to: new Date("2025-01-10"),
                },
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(false);
        });

        it("rejects missing to date", () => {
            const guestUser = {
                username: "testuser",
                password: "password123",
                valid: {
                    from: new Date("2025-01-01"),
                },
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(false);
        });

        it("rejects invalid from date", () => {
            const guestUser = {
                username: "testuser",
                password: "password123",
                valid: {
                    from: "not-a-date",
                    to: new Date("2025-01-10"),
                },
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(false);
        });

        it("rejects invalid to date", () => {
            const guestUser = {
                username: "testuser",
                password: "password123",
                valid: {
                    from: new Date("2025-01-01"),
                    to: "not-a-date",
                },
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(false);
        });

        it("rejects negative VLAN ID", () => {
            const guestUser = {
                username: "testuser",
                password: "password123",
                valid: {
                    from: new Date("2025-01-01"),
                    to: new Date("2025-01-10"),
                },
                assignedVlan: -1,
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(false);
        });

        it("rejects NaN VLAN ID", () => {
            const guestUser = {
                username: "testuser",
                password: "password123",
                valid: { from: new Date(), to: new Date() },
                assignedVlan: NaN,
            };
            expect(GuestUserSchema.safeParse(guestUser).success).toBe(false);
        });

        it("rejects null VLAN ID", () => {
            const guestUser = {
                username: "testuser",
                password: "password123",
                valid: { from: new Date(), to: new Date() },
                assignedVlan: null,
            };
            expect(GuestUserSchema.safeParse(guestUser).success).toBe(false);
        });


        it("rejects float VLAN ID", () => {
            const guestUser = {
                username: "testuser",
                password: "password123",
                valid: {
                    from: new Date("2025-01-01"),
                    to: new Date("2025-01-10"),
                },
                assignedVlan: 20.5,
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(false);
        });

        // TODO: Add test for reject NaN VLAN Id
        // TODO: Add test for reject null and undefined VLAN Id

        it("rejects non-numeric VLAN ID", () => {
            const testCases = [
                { assignedVlan: "20" },
                { assignedVlan: null },
                { assignedVlan: [] },
            ];

            for (const vlanData of testCases) {
                const guestUser = {
                    username: "testuser",
                    password: "password123",
                    valid: {
                        from: new Date("2025-01-01"),
                        to: new Date("2025-01-10"),
                    },
                    ...vlanData,
                };

                const result = GuestUserSchema.safeParse(guestUser);
                expect(result.success).toBe(false);
            }
        });


    });

    describe("Type validation", () => {
        it("correctly identifies valid guest user type", () => {
            const guestUser: GuestUser = {
                username: "testuser",
                password: "password123",
                valid: {
                    from: new Date("2025-01-01"),
                    to: new Date("2025-01-10"),
                },
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(true);
        });

        it("correctly identifies guest user type with VLAN", () => {
            const guestUser: GuestUser = {
                username: "testuser",
                password: "password123",
                valid: {
                    from: new Date("2025-01-01"),
                    to: new Date("2025-01-10"),
                },
                assignedVlan: 20,
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(true);
        });
    });

    describe("Edge cases", () => {
        it("handles very long username", () => {
            const guestUser = {
                username: "a".repeat(1000),
                password: "password123",
                valid: {
                    from: new Date("2025-01-01"),
                    to: new Date("2025-01-10"),
                },
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.username.length).toBe(1000);
            }
        });

        it("handles very long password", () => {
            const guestUser = {
                username: "testuser",
                password: "p".repeat(10000),
                valid: {
                    from: new Date("2025-01-01"),
                    to: new Date("2025-01-10"),
                },
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.password.length).toBe(10000);
            }
        });

        it("handles same from and to date", () => {
            const date = new Date("2025-01-01");
            const guestUser = {
                username: "testuser",
                password: "password123",
                valid: {
                    from: date,
                    to: date,
                },
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(true);
        });

        it("handles from date after to date (validation allows this)", () => {
            const guestUser = {
                username: "testuser",
                password: "password123",
                valid: {
                    from: new Date("2025-01-10"),
                    to: new Date("2025-01-01"),
                },
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(true);
            // Note: The schema allows this; business logic should validate the date order
        });

        it("handles extra fields (ignores them)", () => {
            const guestUser = {
                username: "testuser",
                password: "password123",
                valid: {
                    from: new Date("2025-01-01"),
                    to: new Date("2025-01-10"),
                },
                extraField: "should be ignored",
                anotherExtra: 123,
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(true);
        });

        it("handles VLAN as undefined explicitly", () => {
            const guestUser = {
                username: "testuser",
                password: "password123",
                valid: {
                    from: new Date("2025-01-01"),
                    to: new Date("2025-01-10"),
                },
                assignedVlan: undefined,
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.assignedVlan).toBeUndefined();
            }
        });


        it("handles very long comments", () => {
            const longComment = "a".repeat(5000);

            const guestUser = {
                username: "testuser",
                password: "password123",
                valid: {
                    from: new Date("2025-01-01"),
                    to: new Date("2025-01-10"),
                },
                comment: longComment,
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.comment.length).toBe(5000);
            }
        });

        it("ignores comment field when omitted", () => {
            const guestUser = {
                username: "testuser",
                password: "password123",
                valid: {
                    from: new Date("2025-01-01"),
                    to: new Date("2025-01-10"),
                },
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.comment).toBeUndefined();
            }
        });

    });

    describe("Date handling", () => {
        it("accepts ISO 8601 date strings", () => {
            const guestUser = {
                username: "testuser",
                password: "password123",
                valid: {
                    from: "2025-01-01T00:00:00Z",
                    to: "2025-01-10T23:59:59Z",
                },
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.valid.from).toBeInstanceOf(Date);
                expect(result.data.valid.to).toBeInstanceOf(Date);
            }
        });

        it("accepts epoch timestamps", () => {
            const fromTime = new Date("2025-01-01").getTime();
            const toTime = new Date("2025-01-10").getTime();

            const guestUser = {
                username: "testuser",
                password: "password123",
                valid: {
                    from: fromTime,
                    to: toTime,
                },
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.valid.from).toBeInstanceOf(Date);
                expect(result.data.valid.to).toBeInstanceOf(Date);
            }
        });

        it("accepts Date objects directly", () => {
            const guestUser = {
                username: "testuser",
                password: "password123",
                valid: {
                    from: new Date("2025-01-01"),
                    to: new Date("2025-01-10"),
                },
            };

            const result = GuestUserSchema.safeParse(guestUser);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.valid.from).toBeInstanceOf(Date);
                expect(result.data.valid.to).toBeInstanceOf(Date);
            }
        });
    });
});
