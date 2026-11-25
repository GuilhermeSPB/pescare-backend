import type { Prisma } from "@core/prisma.js";
import { AppError } from "@shared/errors/app-error.js";
import { idParam } from "@shared/schemas/id-param.js";
import type { Role } from "@shared/constants/roles.js";
import { alertsRepository } from "./alerts.repository.js";
import {
  createAlertSchema,
  listAlertsSchema,
  updateAlertSchema,
  type AlertScope,
} from "./alerts.schema.js";

interface Requester {
  id: number;
  role: Role;
}

type AlertWithCoverage = NonNullable<
  Awaited<ReturnType<typeof alertsRepository.getOne>>
>;

type AlertListRow = Awaited<ReturnType<typeof alertsRepository.getAll>>[number];

function toResponse({ alert_coverage, ...alert }: AlertWithCoverage) {
  return {
    ...alert,
    municipalities: alert_coverage.map((coverage) => coverage.municipality),
  };
}

function toListItem({ _count, ...alert }: AlertListRow) {
  return { ...alert, municipality_count: _count.alert_coverage };
}

function assertCoverage(scope: AlertScope, municipalities: string[]) {
  if (scope === "MUNICIPAL" && municipalities.length === 0) {
    throw new AppError(
      "Comunicado por município precisa de ao menos um município",
      400,
    );
  }

  if (scope === "GLOBAL" && municipalities.length > 0) {
    throw new AppError(
      "Comunicado para todos os municípios não deve listar municípios",
      400,
    );
  }
}

// Data de hoje no fuso do servidor, como meia-noite UTC (coluna DATE).
function today() {
  return new Date(new Date().toLocaleDateString("en-CA"));
}

// Pescador so enxerga alertas publicados que valem para o seu municipio.
async function visibilityFilter(
  requester: Requester,
): Promise<Prisma.alertWhereInput> {
  if (requester.role === "ADMIN") {
    return {};
  }

  const municipality = await alertsRepository.getUserMunicipality(requester.id);

  return {
    status: "PUBLISHED",
    OR: [
      { scope: "GLOBAL" },
      {
        scope: "MUNICIPAL",
        alert_coverage: {
          some: { fk_municipality_ibge_code: municipality ?? "" },
        },
      },
    ],
  };
}

export const alertsServices = {
  /**
   * Lista comunicados, com a contagem de municípios em vez da lista. Admin vê
   * todos (com filtros); pescador vê só os publicados para o seu município.
   */
  async getAll(requester: Requester, query: unknown) {
    const filters = listAlertsSchema.parse(query);

    const where: Prisma.alertWhereInput = {
      AND: [
        await visibilityFilter(requester),
        {
          ...(filters.scope && { scope: filters.scope }),
          ...(filters.status && { status: filters.status }),
        },
      ],
    };

    const alerts = await alertsRepository.getAll(where);

    return alerts.map(toListItem);
  },

  /**
   * Seleciona um comunicado pelo ID, respeitando a visibilidade do usuário.
   */
  async getById(requester: Requester, payload: unknown) {
    const id = idParam.parse(payload);

    const alert = await alertsRepository.getOne({
      AND: [{ id }, await visibilityFilter(requester)],
    });

    if (!alert) {
      throw new AppError("Comunicado não encontrado", 404);
    }

    return toResponse(alert);
  },

  /**
   * Cria um comunicado e sua cobertura de municípios (somente admin).
   */
  async create(payload: unknown) {
    const data = createAlertSchema.parse(payload);

    assertCoverage(data.scope, data.municipalities);

    return toResponse(await alertsRepository.create(data));
  },

  /**
   * Atualiza um comunicado (somente admin). Se `municipalities` for enviado,
   * substitui toda a cobertura.
   */
  async update(idPayload: unknown, payload: unknown) {
    const id = idParam.parse(idPayload);
    const data = updateAlertSchema.parse(payload);

    const current = await alertsRepository.getOne({ id });

    if (!current) {
      throw new AppError("Comunicado não encontrado", 404);
    }

    const scope = data.scope ?? (current.scope as AlertScope);

    // Mudou para GLOBAL sem mandar a lista: limpa a cobertura antiga.
    if (scope === "GLOBAL" && data.municipalities === undefined) {
      data.municipalities = [];
    }

    assertCoverage(
      scope,
      data.municipalities ?? (await alertsRepository.getCoverageCodes(id)),
    );

    // Ao publicar, a data de publicacao passa a ser hoje.
    const isBeingPublished =
      data.status === "PUBLISHED" && current.status !== "PUBLISHED";

    return toResponse(
      await alertsRepository.update(id, {
        ...data,
        ...(isBeingPublished && { publication_date: today() }),
      }),
    );
  },
};
