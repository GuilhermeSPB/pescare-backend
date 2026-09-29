import { z } from "zod";

export const booleanQueryParam = z
  .enum(["true", "false"])
  .optional()
  .transform((val) => (val === undefined ? undefined : val === "true"));
