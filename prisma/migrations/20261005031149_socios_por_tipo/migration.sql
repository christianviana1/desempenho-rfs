-- CreateTable
CREATE TABLE `tipos_socio` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(120) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tipos_socio_nome_key`(`nome`),
    INDEX `tipos_socio_ativo_idx`(`ativo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Tipos iniciais de sócio
INSERT INTO `tipos_socio` (`nome`, `ativo`, `created_at`, `updated_at`)
VALUES
  ('Sócio Club', true, NOW(3), NOW(3)),
  ('Sócio Plus', true, NOW(3), NOW(3)),
  ('Sócio PJ', true, NOW(3), NOW(3));

-- CreateTable
CREATE TABLE `metas_socios_mensais` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `meta_mensal_id` INTEGER NOT NULL,
    `tipo_socio_id` INTEGER NOT NULL,
    `quantidade_meta` INTEGER UNSIGNED NOT NULL DEFAULT 0,

    INDEX `metas_socios_mensais_tipo_socio_id_idx`(`tipo_socio_id`),
    UNIQUE INDEX `metas_socios_mensais_meta_mensal_id_tipo_socio_id_key`(`meta_mensal_id`, `tipo_socio_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lancamentos_socios_diarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lancamento_diario_id` INTEGER NOT NULL,
    `tipo_socio_id` INTEGER NOT NULL,
    `quantidade` INTEGER UNSIGNED NOT NULL DEFAULT 0,

    INDEX `lancamentos_socios_diarios_tipo_socio_id_idx`(`tipo_socio_id`),
    UNIQUE INDEX `lancamentos_socios_diarios_lancamento_diario_id_tipo_socio_i_key`(`lancamento_diario_id`, `tipo_socio_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `metas_socios_mensais` ADD CONSTRAINT `metas_socios_mensais_meta_mensal_id_fkey` FOREIGN KEY (`meta_mensal_id`) REFERENCES `metas_mensais`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metas_socios_mensais` ADD CONSTRAINT `metas_socios_mensais_tipo_socio_id_fkey` FOREIGN KEY (`tipo_socio_id`) REFERENCES `tipos_socio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lancamentos_socios_diarios` ADD CONSTRAINT `lancamentos_socios_diarios_lancamento_diario_id_fkey` FOREIGN KEY (`lancamento_diario_id`) REFERENCES `lancamentos_diarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lancamentos_socios_diarios` ADD CONSTRAINT `lancamentos_socios_diarios_tipo_socio_id_fkey` FOREIGN KEY (`tipo_socio_id`) REFERENCES `tipos_socio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserva o histórico: a contagem única de sócios existente vira lançamentos/metas do tipo "Sócio Club"
INSERT INTO `metas_socios_mensais` (`meta_mensal_id`, `tipo_socio_id`, `quantidade_meta`)
SELECT `id`, (SELECT `id` FROM `tipos_socio` WHERE `nome` = 'Sócio Club'), `meta_socios`
FROM `metas_mensais`
WHERE `meta_socios` > 0;

INSERT INTO `lancamentos_socios_diarios` (`lancamento_diario_id`, `tipo_socio_id`, `quantidade`)
SELECT `id`, (SELECT `id` FROM `tipos_socio` WHERE `nome` = 'Sócio Club'), `qtd_socios`
FROM `lancamentos_diarios`
WHERE `qtd_socios` > 0;

-- AlterTable
ALTER TABLE `lancamentos_diarios` DROP COLUMN `qtd_socios`;

-- AlterTable
ALTER TABLE `metas_mensais` DROP COLUMN `meta_socios`;
