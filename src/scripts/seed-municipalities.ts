import "dotenv/config";
import { prisma } from "@core/prisma.js";
import {
  readMunicipalitiesFile,
  type MunicipalityRow,
} from "./municipalities-file.js";

// Carrega prisma/data/municipalities.json na tabela municipality. Rodar: npm run seed-municipalities
// O arquivo do IBGE vence: nome e UF editados no painel voltam ao do arquivo (decisão do time).
// Nunca apaga: usuários, defesos, alertas e registros de pesca apontam para o código.

interface MunicipalitiesDiff {
  toCreate: MunicipalityRow[];
  toUpdate: MunicipalityRow[];
  unchangedCount: number;
  // No banco e fora do arquivo: ficam, e a carga avisa.
  missingFromFile: string[];
}

function diffMunicipalities(
  fileRows: MunicipalityRow[],
  databaseRows: MunicipalityRow[],
): MunicipalitiesDiff {
  const databaseByCode = new Map(databaseRows.map((row) => [row.ibge_code, row]));
  const fileCodes = new Set(fileRows.map((row) => row.ibge_code));

  const toCreate = fileRows.filter((row) => !databaseByCode.has(row.ibge_code));
  const toUpdate = fileRows.filter((row) => {
    const current = databaseByCode.get(row.ibge_code);

    return current !== undefined && (current.name !== row.name || current.uf !== row.uf);
  });

  return {
    toCreate,
    toUpdate,
    unchangedCount: fileRows.length - toCreate.length - toUpdate.length,
    missingFromFile: databaseRows
      .filter((row) => !fileCodes.has(row.ibge_code))
      .map((row) => row.ibge_code),
  };
}

async function applyMunicipalitiesDiff({ toCreate, toUpdate }: MunicipalitiesDiff) {
  await prisma.$transaction([
    prisma.municipality.createMany({ data: toCreate }),
    ...toUpdate.map(({ ibge_code, name, uf }) =>
      prisma.municipality.update({ where: { ibge_code }, data: { name, uf } }),
    ),
  ]);
}

async function seedMunicipalities() {
  const { source, municipalities } = await readMunicipalitiesFile();
  const databaseRows = await prisma.municipality.findMany({
    select: { ibge_code: true, name: true, uf: true },
  });
  const diff = diffMunicipalities(municipalities, databaseRows);

  await applyMunicipalitiesDiff(diff);

  console.log(
    `[municipalities] ${source}: ${diff.toCreate.length} novos, ${diff.toUpdate.length} atualizados, ${diff.unchangedCount} sem mudança.`,
  );

  if (diff.missingFromFile.length > 0) {
    console.warn(
      `[municipalities] ${diff.missingFromFile.length} no banco e fora do arquivo, mantidos: ${diff.missingFromFile.join(", ")}`,
    );
  }
}

seedMunicipalities()
  .catch((error: unknown) => {
    console.error("[municipalities] Falha na carga:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
