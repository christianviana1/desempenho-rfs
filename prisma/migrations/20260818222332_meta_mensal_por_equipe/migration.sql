-- DropForeignKey
ALTER TABLE `metas_mensais` DROP FOREIGN KEY `metas_mensais_operador_id_fkey`;

-- DropIndex
DROP INDEX `metas_mensais_mes_ano_idx` ON `metas_mensais`;

-- DropIndex
DROP INDEX `metas_mensais_operador_id_mes_ano_key` ON `metas_mensais`;

-- AlterTable
ALTER TABLE `metas_mensais` DROP COLUMN `operador_id`;

-- CreateIndex
CREATE UNIQUE INDEX `metas_mensais_mes_ano_key` ON `metas_mensais`(`mes`, `ano`);

