import { prisma, Prisma } from "@core/prisma.js";
import { stripUndefined } from "@shared/utils/strip-undefined.js";
import type {
  CreateAlertType,
  UpdateAlertType,
  UpdatePreferencesType,
} from "./alerts.schema.js";

const alertInclude = {
  alert_coverage: {
    select: { municipality: { select: { ibge_code: true, name: true, uf: true } } },
  },
} as const;

const preferencesSelect = {
  fishing_ban_alert: true,
  news_alert: true,
  event_alert: true,
  system_alert: true,
} as const;

function coverageRows(codes: string[]) {
  return codes.map((code) => ({ fk_municipality_ibge_code: code }));
}

export const alertsRepository = {
  getAll: async (where: Prisma.alertWhereInput) => {
    return await prisma.alert.findMany({
      where,
      include: alertInclude,
      orderBy: [{ publication_date: "desc" }, { id: "desc" }],
    });
  },

  getOne: async (where: Prisma.alertWhereInput) => {
    return await prisma.alert.findFirst({ where, include: alertInclude });
  },

  getCoverageCodes: async (alertId: number) => {
    const rows = await prisma.alert_coverage.findMany({
      where: { fk_alert_id: alertId },
      select: { fk_municipality_ibge_code: true },
    });

    return rows.map((row) => row.fk_municipality_ibge_code);
  },

  create: async (data: CreateAlertType) => {
    const { municipalities, ...alert } = data;

    return await prisma.alert.create({
      data: {
        ...stripUndefined(alert),
        alert_coverage: { createMany: { data: coverageRows(municipalities) } },
      },
      include: alertInclude,
    });
  },

  // Quando `municipalities` vem preenchido, a cobertura e substituida
  // inteira, na mesma transacao da atualizacao do alerta.
  update: async (id: number, data: UpdateAlertType) => {
    const { municipalities, ...alert } = data;

    return await prisma.$transaction(async (tx) => {
      if (municipalities !== undefined) {
        await tx.alert_coverage.deleteMany({ where: { fk_alert_id: id } });
        await tx.alert_coverage.createMany({
          data: coverageRows(municipalities).map((row) => ({
            ...row,
            fk_alert_id: id,
          })),
        });
      }

      return await tx.alert.update({
        where: { id },
        data: stripUndefined(alert),
        include: alertInclude,
      });
    });
  },

  getUserMunicipality: async (userId: number) => {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { fk_municipality_ibge_code: true },
    });

    return user?.fk_municipality_ibge_code ?? null;
  },

  getPreferences: async (userId: number) => {
    return await prisma.alert_preference.findUnique({
      where: { fk_user_id: userId },
      select: preferencesSelect,
    });
  },

  upsertPreferences: async (userId: number, data: UpdatePreferencesType) => {
    const values = stripUndefined(data);

    return await prisma.alert_preference.upsert({
      where: { fk_user_id: userId },
      create: { ...values, fk_user_id: userId },
      update: values,
      select: preferencesSelect,
    });
  },
};
