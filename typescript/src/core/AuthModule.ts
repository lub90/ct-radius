import type { UserRequest } from "../types/UserRequest.js";
import { RadiusResponse } from "../types/RadiusResponse.js";

export interface AuthModule {
  name: string;

  authorize(username: UserRequest): Promise<RadiusResponse | null>;
}
