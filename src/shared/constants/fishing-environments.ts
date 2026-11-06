// Ambiente de pesca. Valores aceitos pelas constraints chk_fishing_ban_type (fishing_ban) e
// chk_type_location_environment (type_location): o defeso e o tipo de local usam o mesmo vocabulário,
// que é também o "Ambiente de pesca" do REAP.
export const FISHING_ENVIRONMENTS = ["CONTINENTAL", "MARINHO"] as const;

export type FishingEnvironment = (typeof FISHING_ENVIRONMENTS)[number];
