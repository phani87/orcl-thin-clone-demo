import { hasOracleConfig } from "../config.js";
import { createMockRepository } from "./mockRepository.js";
import { createOracleRepository } from "./oracleRepository.js";

export async function createRepository(config) {
  if (hasOracleConfig(config)) {
    return createOracleRepository(config);
  }
  return createMockRepository(config);
}
