import { strFromU8, unzipSync } from "fflate";
import {
  writeMunicipalitiesFile,
  type MunicipalityRow,
} from "./municipalities-file.js";

// Gera prisma/data/municipalities.json a partir da DTB (Divisão Territorial Brasileira) do IBGE.
// Rodar: npm run build-municipalities-file -- 2025
// Não usa a API de localidades (servicodados.ibge.gov.br): ela recusa algumas redes com uma
// página "Request Rejected". O FTP da DTB é a mesma fonte oficial e responde.
const DTB_BASE_URL =
  "https://geoftp.ibge.gov.br/organizacao_do_territorio/estrutura_territorial/divisao_territorial";
const CODE_HEADER = "Código Município Completo";
const NAME_HEADER = "Nome_Município";
const MIN_MUNICIPALITIES = 5500;

// As células vazias do fim da linha vêm como uma só, repetida até o fim da planilha
// (16 mil colunas). Só as primeiras colunas interessam.
const MAX_REPEATED_CELLS = 64;

// Sigla pelo código da UF, que são os 2 primeiros dígitos do código do município.
// A DTB traz o nome da UF, não a sigla.
const UF_BY_CODE: Readonly<Record<string, string>> = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO",
  "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL",
  "28": "SE", "29": "BA", "31": "MG", "32": "ES", "33": "RJ", "35": "SP", "41": "PR",
  "42": "SC", "43": "RS", "50": "MS", "51": "MT", "52": "GO", "53": "DF",
};

const ROW_PATTERN = /<table:table-row\b[^>]*>([\s\S]*?)<\/table:table-row>/g;
const CELL_PATTERN =
  /<table:(?:covered-)?table-cell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/table:(?:covered-)?table-cell>)/g;
const REPEAT_PATTERN = /table:number-columns-repeated="(\d+)"/;

interface SheetColumns {
  code: number;
  name: number;
}

function readYearArgument(): string {
  const year = process.argv[2];

  if (!year || !/^[0-9]{4}$/.test(year)) {
    throw new Error(
      `Ano da DTB inválido: "${year ?? ""}". Esperado 4 dígitos, ex.: npm run build-municipalities-file -- 2025`,
    );
  }

  return year;
}

async function downloadDtbZip(dtbUrl: string): Promise<Uint8Array> {
  const response = await fetch(dtbUrl);
  const contentType = response.headers.get("content-type") ?? "";

  // Um bloqueio do IBGE responde 200 com uma página HTML: só um zip serve.
  if (!response.ok || !contentType.includes("zip")) {
    throw new Error(
      `Download da DTB falhou: ${dtbUrl} respondeu ${response.status} (${contentType}). Esperado application/zip.`,
    );
  }

  return new Uint8Array(await response.arrayBuffer());
}

function unzipEntry(zip: Uint8Array, isWantedEntry: (name: string) => boolean): Uint8Array {
  const entries = unzipSync(zip);
  const entryName = Object.keys(entries).find(isWantedEntry);
  const entry = entryName ? entries[entryName] : undefined;

  if (!entry) {
    throw new Error(`Arquivo esperado não está no zip. Encontrados: ${Object.keys(entries).join(", ")}`);
  }

  return entry;
}

// A planilha .ods também é um zip: as células ficam no content.xml.
function extractMunicipalitiesSheetXml(dtbZip: Uint8Array): string {
  const sheet = unzipEntry(dtbZip, (name) => name.endsWith("_MUNICIPIOS.ods"));

  return strFromU8(unzipEntry(sheet, (name) => name === "content.xml"));
}

const decodeCellText = (cellXml: string): string =>
  cellXml
    .replace(/<[^>]+>/g, "")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();

function readRowCells(rowXml: string): string[] {
  const cells: string[] = [];

  for (const [, attributes = "", content = ""] of rowXml.matchAll(CELL_PATTERN)) {
    const repeat = Number(attributes.match(REPEAT_PATTERN)?.[1] ?? 1);
    const text = decodeCellText(content);
    cells.push(...Array<string>(Math.min(repeat, MAX_REPEATED_CELLS)).fill(text));
  }

  return cells;
}

function findSheetColumns(header: string[]): SheetColumns | undefined {
  const code = header.indexOf(CODE_HEADER);
  const name = header.indexOf(NAME_HEADER);

  return code >= 0 && name >= 0 ? { code, name } : undefined;
}

function toMunicipalityRow(cells: string[], columns: SheetColumns): MunicipalityRow | undefined {
  const ibgeCode = cells[columns.code] ?? "";
  const name = cells[columns.name] ?? "";

  // Linha em branco, depois da tabela.
  if (ibgeCode === "" && name === "") return undefined;

  if (!/^[0-9]{7}$/.test(ibgeCode) || name === "") {
    throw new Error(
      `Linha de município inválida na DTB: código "${ibgeCode}", nome "${name}". Esperado código de 7 dígitos e nome preenchido.`,
    );
  }

  const uf = UF_BY_CODE[ibgeCode.slice(0, 2)];

  if (!uf) {
    throw new Error(
      `Código "${ibgeCode}" com prefixo de UF "${ibgeCode.slice(0, 2)}" desconhecido. Esperado um dos 27 códigos de UF do IBGE.`,
    );
  }

  return { ibge_code: ibgeCode, name, uf };
}

// As linhas antes do cabeçalho são o título do relatório; as de depois, os municípios.
function parseMunicipalitiesSheet(sheetXml: string): MunicipalityRow[] {
  const municipalities: MunicipalityRow[] = [];
  let columns: SheetColumns | undefined;

  for (const [, rowXml = ""] of sheetXml.matchAll(ROW_PATTERN)) {
    const cells = readRowCells(rowXml);
    const row = columns ? toMunicipalityRow(cells, columns) : undefined;
    columns ??= findSheetColumns(cells);
    if (row) municipalities.push(row);
  }

  if (!columns) {
    throw new Error(`Cabeçalho não encontrado na DTB. Esperado as colunas "${CODE_HEADER}" e "${NAME_HEADER}".`);
  }

  return municipalities;
}

function assertCompleteList(municipalities: MunicipalityRow[]) {
  const seenCodes = new Set<string>();

  for (const { ibge_code } of municipalities) {
    if (seenCodes.has(ibge_code)) {
      throw new Error(`Código "${ibge_code}" repetido na DTB. Esperado um código por município.`);
    }
    seenCodes.add(ibge_code);
  }

  if (municipalities.length < MIN_MUNICIPALITIES) {
    throw new Error(
      `A DTB trouxe ${municipalities.length} municípios. Esperado pelo menos ${MIN_MUNICIPALITIES}: o formato da planilha mudou?`,
    );
  }
}

async function buildMunicipalitiesFile() {
  const year = readYearArgument();
  const dtbUrl = `${DTB_BASE_URL}/${year}/DTB_${year}.zip`;
  const sheetXml = extractMunicipalitiesSheetXml(await downloadDtbZip(dtbUrl));
  const municipalities = parseMunicipalitiesSheet(sheetXml).sort((first, second) =>
    first.ibge_code.localeCompare(second.ibge_code),
  );

  assertCompleteList(municipalities);
  await writeMunicipalitiesFile({ source: `IBGE — DTB ${year} (${dtbUrl})`, municipalities });

  console.log(`[municipalities] ${municipalities.length} municípios gravados em prisma/data/municipalities.json`);
}

buildMunicipalitiesFile().catch((error: unknown) => {
  console.error("[municipalities] Falha ao gerar o arquivo:", error);
  process.exitCode = 1;
});
