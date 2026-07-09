import dotenv from "dotenv";

dotenv.config();

export function getConfig(env = process.env) {
  return {
    port: Number(env.PORT || 3000),
    appEnv: env.APP_ENV || "local",
    scenarioLabel: env.SCENARIO_LABEL || "local-mock",
    db: {
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      connectString: env.DB_CONNECT_STRING,
      poolMin: Number(env.DB_POOL_MIN || 1),
      poolMax: Number(env.DB_POOL_MAX || 8),
      poolIncrement: Number(env.DB_POOL_INCREMENT || 1)
    }
  };
}

export function hasOracleConfig(config) {
  return Boolean(config.db.user && config.db.password && config.db.connectString);
}
