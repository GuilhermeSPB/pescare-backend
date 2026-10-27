// Valores aceitos pela constraint chk_role_type da tabela users.
export const ROLES = ["FISHER", "ADMIN"] as const;

export type Role = (typeof ROLES)[number];
