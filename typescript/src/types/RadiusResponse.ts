import { containsUnsafeChars } from "./unsafeChars.js";

export enum AuthType {
  Reject = "Reject",
  Accept = "Accept",
}

export interface VlanAttributes {
  tunnelType: number;
  tunnelMediumType: number;
  tunnelPrivateGroupId: number;
}

/**
 * Base class for all RADIUS responses
 */
export abstract class RadiusResponse {
  abstract toString(): string;

  protected formatVlan(vlan?: VlanAttributes): string {
    if (!vlan) return "";

    const lines: string[] = [];

    if (vlan.tunnelType) {
      lines.push(`Ct-Tunnel-Type := ${vlan.tunnelType}`);
    }
    if (vlan.tunnelMediumType) {
      lines.push(`Ct-Tunnel-Medium-Type := ${vlan.tunnelMediumType}`);
    }
    if (vlan.tunnelPrivateGroupId) {
      lines.push(`Ct-Tunnel-Private-Group-Id := ${vlan.tunnelPrivateGroupId}`);
    }

    return lines.join("\n");
  }
}

/**
 * Reject response
 */
export class RejectResponse extends RadiusResponse {
  readonly authType = AuthType.Reject;

  toString(): string {
    return "Auth-Type := Reject";
  }
}

/**
 * Accept response
 */
export class AcceptResponse extends RadiusResponse {
  readonly authType = AuthType.Accept;

  constructor(public vlan?: VlanAttributes) {
    super();
  }

  toString(): string {
    const lines = [`Auth-Type := Accept`];

    const vlanStr = this.formatVlan(this.vlan);
    if (vlanStr) lines.push(vlanStr);

    return lines.join("\n");
  }
}

/**
 * Challenge response (cleartext password)
 */
export class ChallengeResponse extends RadiusResponse {
  constructor(
    public cleartextPassword: string,
    public vlan?: VlanAttributes
  ) {
    super();

    if (containsUnsafeChars(this.cleartextPassword)) {
      throw new Error(
        "Cleartext password contains unsafe characters for RADIUS configuration"
      );
    }
  }

  toString(): string {
    // We escape the sequence to prevent any critical chars in the password to be rejected...
    const lines = [`Cleartext-Password := "${this.cleartextPassword}"`];

    const vlanStr = this.formatVlan(this.vlan);
    if (vlanStr) lines.push(vlanStr);

    return lines.join("\n");
  }
}
