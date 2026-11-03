-- CreateTable
CREATE TABLE `InvoiceLogo` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `mimeType` VARCHAR(191) NOT NULL,
    `data` LONGBLOB NOT NULL,
    `size` INTEGER NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
