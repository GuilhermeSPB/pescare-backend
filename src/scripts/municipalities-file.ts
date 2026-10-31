import { mkdir, readFile, writeFile } from "node:fs/promises";
import { z } from "zod";

// Arquivo versionado com os municípios do IBGE: gerado por build-municipalities-file.ts e
// lido por seed-municipalities.ts. Caminho relativo a este arquivo, vale em src/ e em dist/.
const MUNICIPALITIES_FILE_URL = new URL(
  "../../prisma/data/municipalities.json",
  import.meta.url,
);

const municipalitiesFileSchema = z.object({
  source: z.string().min(1),
  municipalities: z.array(
    z.object({
      ibge_code: z.string().regex(/^[0-9]{7}$/),
      name: z.string().min(1),
      uf: z.string().length(2),
    }),
  ),
});

export type MunicipalitiesFile = z.infer<typeof municipalitiesFileSchema>;
export type MunicipalityRow = MunicipalitiesFile["municipalities"][number];

/**
 * Lê e valida o arquivo de municípios.
 *
 * @example
 * const { source, municipalities } = await readMunicipalitiesFile();
 */
export async function readMunicipalitiesFile(): Promise<MunicipalitiesFile> {
  const content = await readFile(MUNICIPALITIES_FILE_URL, "utf8");

  return municipalitiesFileSchema.parse(JSON.parse(content));
}

// Um município por linha: o diff de uma DTB nova mostra só os municípios que mudaram.
const formatMunicipalitiesFile = ({ source, municipalities }: MunicipalitiesFile) =>
  [
    "{",
    `  "source": ${JSON.stringify(source)},`,
    '  "municipalities": [',
    municipalities.map((row) => `    ${JSON.stringify(row)}`).join(",\n"),
    "  ]",
    "}",
    "",
  ].join("\n");

/**
 * Grava o arquivo de municípios, criando a pasta se preciso.
 *
 * @example
 * await writeMunicipalitiesFile({ source: "IBGE — DTB 2025", municipalities });
 */
export async function writeMunicipalitiesFile(file: MunicipalitiesFile) {
  await mkdir(new URL(".", MUNICIPALITIES_FILE_URL), { recursive: true });
  await writeFile(MUNICIPALITIES_FILE_URL, formatMunicipalitiesFile(file));
}
