import { pino } from "pino";
import type { AppConfiguration } from "../configuration.js";

export function logger(configuration: Pick<AppConfiguration, "PRODUCTION_ENV">) {
  return pino(
    configuration.PRODUCTION_ENV
      ? {}
      : {
          transport: {
            target: "pino-pretty",
            options: {
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
            },
          },
        },
  );
}
