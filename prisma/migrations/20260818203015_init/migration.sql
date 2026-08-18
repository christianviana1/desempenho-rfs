-- CreateTable
CREATE TABLE `operadores` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(120) NOT NULL,
    `login` VARCHAR(60) NOT NULL,
    `perfil` ENUM('ADMIN', 'OPERADOR') NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `operadores_login_key`(`login`),
    INDEX `operadores_ativo_idx`(`ativo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tipos_seguro` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(120) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tipos_seguro_nome_key`(`nome`),
    INDEX `tipos_seguro_ativo_idx`(`ativo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `metas_mensais` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `operador_id` INTEGER NOT NULL,
    `mes` TINYINT NOT NULL,
    `ano` INTEGER NOT NULL,
    `meta_digitadas` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `meta_contas` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `meta_socios` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `metas_mensais_mes_ano_idx`(`mes`, `ano`),
    UNIQUE INDEX `metas_mensais_operador_id_mes_ano_key`(`operador_id`, `mes`, `ano`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `metas_seguros_mensais` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `meta_mensal_id` INTEGER NOT NULL,
    `tipo_seguro_id` INTEGER NOT NULL,
    `quantidade_meta` INTEGER UNSIGNED NOT NULL DEFAULT 0,

    INDEX `metas_seguros_mensais_tipo_seguro_id_idx`(`tipo_seguro_id`),
    UNIQUE INDEX `metas_seguros_mensais_meta_mensal_id_tipo_seguro_id_key`(`meta_mensal_id`, `tipo_seguro_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lancamentos_diarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `operador_id` INTEGER NOT NULL,
    `data` DATE NOT NULL,
    `qtd_digitadas` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `qtd_contas` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `qtd_socios` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `lancamentos_diarios_data_idx`(`data`),
    UNIQUE INDEX `lancamentos_diarios_operador_id_data_key`(`operador_id`, `data`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lancamentos_seguros_diarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lancamento_diario_id` INTEGER NOT NULL,
    `tipo_seguro_id` INTEGER NOT NULL,
    `quantidade` INTEGER UNSIGNED NOT NULL DEFAULT 0,

    INDEX `lancamentos_seguros_diarios_tipo_seguro_id_idx`(`tipo_seguro_id`),
    UNIQUE INDEX `lancamentos_seguros_diarios_lancamento_diario_id_tipo_seguro_key`(`lancamento_diario_id`, `tipo_seguro_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `metas_mensais` ADD CONSTRAINT `metas_mensais_operador_id_fkey` FOREIGN KEY (`operador_id`) REFERENCES `operadores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metas_seguros_mensais` ADD CONSTRAINT `metas_seguros_mensais_meta_mensal_id_fkey` FOREIGN KEY (`meta_mensal_id`) REFERENCES `metas_mensais`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metas_seguros_mensais` ADD CONSTRAINT `metas_seguros_mensais_tipo_seguro_id_fkey` FOREIGN KEY (`tipo_seguro_id`) REFERENCES `tipos_seguro`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lancamentos_diarios` ADD CONSTRAINT `lancamentos_diarios_operador_id_fkey` FOREIGN KEY (`operador_id`) REFERENCES `operadores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lancamentos_seguros_diarios` ADD CONSTRAINT `lancamentos_seguros_diarios_lancamento_diario_id_fkey` FOREIGN KEY (`lancamento_diario_id`) REFERENCES `lancamentos_diarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lancamentos_seguros_diarios` ADD CONSTRAINT `lancamentos_seguros_diarios_tipo_seguro_id_fkey` FOREIGN KEY (`tipo_seguro_id`) REFERENCES `tipos_seguro`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

