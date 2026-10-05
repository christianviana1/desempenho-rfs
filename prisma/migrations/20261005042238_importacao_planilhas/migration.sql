
-- CreateTable
CREATE TABLE `importacoes_planilha` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome_arquivo` VARCHAR(255) NOT NULL,
    `importado_por_id` INTEGER NOT NULL,
    `importado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `total_linhas` INTEGER NOT NULL,

    INDEX `importacoes_planilha_importado_em_idx`(`importado_em`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `importacoes_linhas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `importacao_id` INTEGER NOT NULL,
    `linha_original` INTEGER NOT NULL,
    `divisao` VARCHAR(120) NULL,
    `regional` VARCHAR(120) NULL,
    `loja` VARCHAR(160) NULL,
    `cod_loja` VARCHAR(40) NULL,
    `drt` VARCHAR(40) NULL,
    `nome` VARCHAR(160) NULL,
    `cargo` VARCHAR(160) NULL,
    `dt_admissao` DATETIME(3) NULL,
    `situacao` VARCHAR(40) NULL,
    `loja_transversal` VARCHAR(10) NULL,
    `meses_trabalho` DOUBLE NULL,
    `dados` JSON NOT NULL,

    INDEX `importacoes_linhas_importacao_id_idx`(`importacao_id`),
    INDEX `importacoes_linhas_nome_idx`(`nome`),
    INDEX `importacoes_linhas_loja_idx`(`loja`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `importacoes_planilha` ADD CONSTRAINT `importacoes_planilha_importado_por_id_fkey` FOREIGN KEY (`importado_por_id`) REFERENCES `operadores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `importacoes_linhas` ADD CONSTRAINT `importacoes_linhas_importacao_id_fkey` FOREIGN KEY (`importacao_id`) REFERENCES `importacoes_planilha`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

