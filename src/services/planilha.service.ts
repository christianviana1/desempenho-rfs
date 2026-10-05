import "server-only"

import ExcelJS from "exceljs"

import { prisma } from "@/lib/prisma"
import { NotFoundError, ServiceError } from "@/lib/errors"
import type { ImportacaoLinha, ImportacaoPlanilha } from "@/generated/prisma/client"

/**
 * Layout fixo observado no relatório "Banho de Loja" da Sam's Club: colunas
 * B..L identificam a pessoa/loja, e a partir da coluna N começam os grupos de
 * métricas (linha 4 = nome do grupo, linha 6 = período, linha 7 = campo),
 * cada um mesclado de forma diferente — por isso o parser resolve tudo via
 * célula mestre da mesclagem em vez de assumir larguras fixas por grupo.
 */
const COL_INICIO_METRICAS = 14 // N
const LINHA_GRUPO = 4
const LINHA_PERIODO = 6
const LINHA_CAMPO = 7
const LINHA_INICIO_DADOS = 8

export type DadosLinha = Record<string, Record<string, Record<string, unknown>>>

type IdentificacaoLinha = {
  divisao: string | null
  regional: string | null
  loja: string | null
  codLoja: string | null
  drt: string | null
  nome: string | null
  cargo: string | null
  dtAdmissao: Date | null
  situacao: string | null
  lojaTransversal: string | null
  mesesTrabalho: number | null
}

function toPlainValue(value: ExcelJS.CellValue): string | number | boolean | null {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "object") {
    if ("result" in value) return toPlainValue(value.result ?? null)
    if ("richText" in value) return value.richText.map((rt) => rt.text).join("")
    if ("text" in value) return String(value.text)
    if ("error" in value) return null
    return null
  }
  return value
}

function toText(value: ExcelJS.CellValue): string | null {
  const plain = toPlainValue(value)
  if (plain === null) return null
  return String(plain).trim() || null
}

function toNumber(value: ExcelJS.CellValue): number | null {
  const plain = toPlainValue(value)
  return typeof plain === "number" ? plain : null
}

function toDate(value: ExcelJS.CellValue): Date | null {
  if (value instanceof Date) return value
  return null
}

function periodoLabel(value: ExcelJS.CellValue): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return toText(value) ?? "—"
}

/** Resolve o valor "efetivo" de uma célula: se fizer parte de uma mesclagem, usa a célula mestre. */
function effectiveCell(worksheet: ExcelJS.Worksheet, row: number, col: number): ExcelJS.Cell {
  const cell = worksheet.getRow(row).getCell(col)
  return cell.isMerged ? cell.master : cell
}

function parseIdentificacao(worksheet: ExcelJS.Worksheet, row: number): IdentificacaoLinha {
  return {
    divisao: toText(worksheet.getRow(row).getCell(2).value),
    regional: toText(worksheet.getRow(row).getCell(3).value),
    loja: toText(worksheet.getRow(row).getCell(4).value),
    codLoja: toText(worksheet.getRow(row).getCell(5).value),
    drt: toText(worksheet.getRow(row).getCell(6).value),
    nome: toText(worksheet.getRow(row).getCell(7).value),
    cargo: toText(worksheet.getRow(row).getCell(8).value),
    dtAdmissao: toDate(worksheet.getRow(row).getCell(9).value),
    situacao: toText(worksheet.getRow(row).getCell(10).value),
    lojaTransversal: toText(worksheet.getRow(row).getCell(11).value),
    mesesTrabalho: toNumber(worksheet.getRow(row).getCell(12).value),
  }
}

function parseDadosLinha(worksheet: ExcelJS.Worksheet, row: number, maxCol: number): DadosLinha {
  const dados: DadosLinha = {}

  for (let col = COL_INICIO_METRICAS; col <= maxCol; col++) {
    const grupoRow4 = toText(effectiveCell(worksheet, LINHA_GRUPO, col).value)
    const periodoCellValue = effectiveCell(worksheet, LINHA_PERIODO, col).value
    const periodoRow6 = toText(periodoCellValue)

    // Algumas seções (ex.: Ranking de Vendas, Premiados) não têm título mesclado
    // na linha 4 — só um rótulo na linha 6. Nesses casos, o rótulo da linha 6 vira
    // o próprio grupo e a coluna é tratada como um valor único, sem período.
    let grupo: string
    let periodo: string
    if (grupoRow4) {
      grupo = grupoRow4
      periodo = periodoLabel(periodoCellValue)
    } else if (periodoRow6) {
      grupo = periodoRow6
      periodo = "—"
    } else {
      continue
    }

    const campoCellRaw = worksheet.getRow(LINHA_CAMPO).getCell(col)
    let campo: string | null
    if (!campoCellRaw.isMerged) {
      campo = toText(campoCellRaw.value)
    } else {
      const master = campoCellRaw.master
      campo = master.fullAddress.row === LINHA_CAMPO ? toText(master.value) : null
    }
    if (!campo) campo = "Valor"

    const valor = toPlainValue(worksheet.getRow(row).getCell(col).value)
    if (valor === null) continue

    dados[grupo] ??= {}
    dados[grupo][periodo] ??= {}
    dados[grupo][periodo][campo] = valor
  }

  return dados
}

export async function importarPlanilha(params: {
  buffer: Buffer
  nomeArquivo: string
  importadoPorId: number
}): Promise<ImportacaoPlanilha> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(params.buffer as unknown as ExcelJS.Buffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    throw new ServiceError("A planilha não contém nenhuma aba.")
  }

  // actualColumnCount/actualRowCount contam células POPULADAS, não a última
  // posição — com colunas inteiramente vazias no meio (comuns neste layout),
  // isso sub-conta e corta colunas à direita. columnCount/rowCount refletem
  // a última linha/coluna realmente alcançada.
  const maxCol = worksheet.columnCount
  const maxRow = worksheet.rowCount

  const linhas: Array<IdentificacaoLinha & { linhaOriginal: number; dados: DadosLinha }> = []

  for (let row = LINHA_INICIO_DADOS; row <= maxRow; row++) {
    const identificacao = parseIdentificacao(worksheet, row)
    const temConteudo = Object.values(identificacao).some((v) => v !== null)
    if (!temConteudo) continue

    const dados = parseDadosLinha(worksheet, row, maxCol)
    linhas.push({ ...identificacao, linhaOriginal: row, dados })
  }

  if (linhas.length === 0) {
    throw new ServiceError(
      "Nenhuma linha de dados foi encontrada. Confira se a estrutura da planilha corresponde ao padrão esperado (identificação nas colunas B–L, métricas a partir da coluna N)."
    )
  }

  return prisma.importacaoPlanilha.create({
    data: {
      nomeArquivo: params.nomeArquivo,
      importadoPorId: params.importadoPorId,
      totalLinhas: linhas.length,
      linhas: {
        create: linhas.map((linha) => ({
          linhaOriginal: linha.linhaOriginal,
          divisao: linha.divisao,
          regional: linha.regional,
          loja: linha.loja,
          codLoja: linha.codLoja,
          drt: linha.drt,
          nome: linha.nome,
          cargo: linha.cargo,
          dtAdmissao: linha.dtAdmissao,
          situacao: linha.situacao,
          lojaTransversal: linha.lojaTransversal,
          mesesTrabalho: linha.mesesTrabalho,
          dados: linha.dados as object,
        })),
      },
    },
  })
}

export type ImportacaoResumo = ImportacaoPlanilha & { importadoPor: { nome: string } }

export async function listImportacoes(): Promise<ImportacaoResumo[]> {
  return prisma.importacaoPlanilha.findMany({
    include: { importadoPor: { select: { nome: true } } },
    orderBy: { importadoEm: "desc" },
  })
}

export async function getImportacaoComLinhas(
  id: number
): Promise<ImportacaoResumo & { linhas: ImportacaoLinha[] }> {
  const importacao = await prisma.importacaoPlanilha.findUnique({
    where: { id },
    include: {
      importadoPor: { select: { nome: true } },
      linhas: { orderBy: { linhaOriginal: "asc" } },
    },
  })
  if (!importacao) throw new NotFoundError("Importação não encontrada.")
  return importacao
}

export async function deleteImportacao(id: number): Promise<void> {
  const importacao = await prisma.importacaoPlanilha.findUnique({ where: { id } })
  if (!importacao) throw new NotFoundError("Importação não encontrada.")
  await prisma.importacaoPlanilha.delete({ where: { id } })
}
