import { Polar } from "@polar-sh/sdk";
import { getPolarEnv } from "./config";

export function createPolarClient() {
  const { accessToken, server } = getPolarEnv();
  return new Polar({
    accessToken,
    server,
  });
}
