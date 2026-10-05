import { PrismaClient, Perfil } from "../src/generated/prisma/client"

const prisma = new PrismaClient()

const SEGUROS_INICIAIS = ["Fatura", "Cartão Protegido", "Dados e Bens"]
const SOCIOS_INICIAIS = ["Sócio Club", "Sócio Plus", "Sócio PJ"]

/**
 * Seed idempotente: pode ser executado múltiplas vezes sem duplicar dados
 * (upsert por chave única em ambos os casos).
 */
async function main() {
  await prisma.operador.upsert({
    where: { login: "admin" },
    update: {},
    create: {
      nome: "Administrador",
      login: "admin",
      perfil: Perfil.ADMIN,
      ativo: true,
    },
  })

  for (const nome of SEGUROS_INICIAIS) {
    await prisma.tipoSeguro.upsert({
      where: { nome },
      update: {},
      create: { nome, ativo: true },
    })
  }

  for (const nome of SOCIOS_INICIAIS) {
    await prisma.tipoSocio.upsert({
      where: { nome },
      update: {},
      create: { nome, ativo: true },
    })
  }

  console.log("Seed concluído: admin + tipos de seguro e sócio iniciais garantidos.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
