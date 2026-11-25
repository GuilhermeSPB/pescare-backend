-- =============================================================================
-- Pescare — DDL do banco (PostgreSQL)
-- Schema: pescare
-- Gerado a partir do banco atual em 2026-11-08.
-- Tabelas em ordem de dependência: pode ser executado de cima para baixo.
-- =============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS pescare;

-- -----------------------------------------------------------------------------
-- Catálogos
-- -----------------------------------------------------------------------------

CREATE TABLE pescare.municipality (
    ibge_code  VARCHAR(7)  PRIMARY KEY,
    name       VARCHAR     NOT NULL,
    uf         CHAR(2)     NOT NULL,

    CONSTRAINT chk_municipality_ibge_code CHECK (ibge_code ~ '^[0-9]{7}$')
);

CREATE TABLE pescare.target_group (
    id         INTEGER  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       VARCHAR  NOT NULL,
    is_active  BOOLEAN  NOT NULL DEFAULT true,

    CONSTRAINT uq_target_group_name UNIQUE (name)
);

CREATE TABLE pescare.fishing_method (
    id         INTEGER  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       VARCHAR  NOT NULL,
    is_active  BOOLEAN  NOT NULL DEFAULT true,

    CONSTRAINT uq_fishing_method_name UNIQUE (name)
);

CREATE TABLE pescare.type_location (
    id           INTEGER  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name         VARCHAR  NOT NULL,
    is_active    BOOLEAN  NOT NULL DEFAULT true,
    environment  VARCHAR,

    CONSTRAINT uq_type_location_name UNIQUE (name),
    CONSTRAINT chk_type_location_environment CHECK (environment IN ('CONTINENTAL', 'MARINHO'))
);

CREATE TABLE pescare.buyer_type (
    id         INTEGER  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       VARCHAR  NOT NULL,
    is_active  BOOLEAN  NOT NULL DEFAULT true,

    CONSTRAINT uq_buyer_type_name UNIQUE (name)
);

CREATE TABLE pescare.species (
    id                  INTEGER  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    scientific_name     VARCHAR  NOT NULL,
    main_name           VARCHAR  NOT NULL,
    description         VARCHAR,
    is_active           BOOLEAN  NOT NULL DEFAULT true,
    fk_target_group_id  INTEGER  NOT NULL,

    CONSTRAINT uq_species_scientific_name UNIQUE (scientific_name),
    CONSTRAINT fk_species_2 FOREIGN KEY (fk_target_group_id)
        REFERENCES pescare.target_group (id) ON DELETE RESTRICT
);

CREATE INDEX idx_species_fk_target_group_id ON pescare.species (fk_target_group_id);

-- -----------------------------------------------------------------------------
-- Usuários
-- -----------------------------------------------------------------------------

CREATE TABLE pescare.users (
    id                         INTEGER  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                       VARCHAR  NOT NULL,
    email                      VARCHAR  NOT NULL,
    password                   VARCHAR  NOT NULL,
    registration_date          DATE     NOT NULL DEFAULT CURRENT_DATE,
    role                       VARCHAR  NOT NULL,
    is_active                  BOOLEAN  NOT NULL DEFAULT true,
    fk_municipality_ibge_code  VARCHAR  NOT NULL,

    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_role_type CHECK (role IN ('FISHER', 'ADMIN')),
    CONSTRAINT fk_user_2 FOREIGN KEY (fk_municipality_ibge_code)
        REFERENCES pescare.municipality (ibge_code) ON DELETE RESTRICT
);

CREATE INDEX idx_users_fk_municipality_ibge_code ON pescare.users (fk_municipality_ibge_code);

-- -----------------------------------------------------------------------------
-- Alertas
-- -----------------------------------------------------------------------------

CREATE TABLE pescare.alert (
    id                INTEGER  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title             VARCHAR  NOT NULL,
    description       VARCHAR  NOT NULL,
    publication_date  DATE     NOT NULL DEFAULT CURRENT_DATE,
    scope             VARCHAR  NOT NULL,
    status            VARCHAR  NOT NULL,

    CONSTRAINT chk_alert_scope  CHECK (scope IN ('GLOBAL', 'MUNICIPAL')),
    CONSTRAINT chk_alert_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
);

CREATE TABLE pescare.alert_coverage (
    id                         INTEGER  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fk_alert_id                INTEGER  NOT NULL,
    fk_municipality_ibge_code  VARCHAR  NOT NULL,

    CONSTRAINT uq_alert_coverage UNIQUE (fk_alert_id, fk_municipality_ibge_code),
    CONSTRAINT fk_alert_coverage_2 FOREIGN KEY (fk_alert_id)
        REFERENCES pescare.alert (id) ON DELETE CASCADE,
    CONSTRAINT fk_alert_coverage_3 FOREIGN KEY (fk_municipality_ibge_code)
        REFERENCES pescare.municipality (ibge_code) ON DELETE CASCADE
);

CREATE INDEX idx_alert_coverage_fk_municipality_ibge_code ON pescare.alert_coverage (fk_municipality_ibge_code);

-- -----------------------------------------------------------------------------
-- Registros de pesca
-- -----------------------------------------------------------------------------

CREATE TABLE pescare.fishing_record (
    id                         INTEGER  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fishing_date               DATE     NOT NULL,
    status                     VARCHAR  NOT NULL,
    fk_user_id                 INTEGER  NOT NULL,
    fk_type_location_id        INTEGER  NOT NULL,
    fk_fishing_method_id       INTEGER  NOT NULL,
    fk_municipality_ibge_code  VARCHAR  NOT NULL,
    location_name              VARCHAR,

    CONSTRAINT chk_fishing_record_status CHECK (status IN ('EM_ANDAMENTO', 'FINALIZADO')),
    CONSTRAINT fk_fishing_record_2 FOREIGN KEY (fk_user_id)
        REFERENCES pescare.users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_fishing_record_3 FOREIGN KEY (fk_type_location_id)
        REFERENCES pescare.type_location (id) ON DELETE RESTRICT,
    CONSTRAINT fk_fishing_record_4 FOREIGN KEY (fk_fishing_method_id)
        REFERENCES pescare.fishing_method (id) ON DELETE RESTRICT,
    CONSTRAINT fk_fishing_record_5 FOREIGN KEY (fk_municipality_ibge_code)
        REFERENCES pescare.municipality (ibge_code) ON DELETE RESTRICT
);

CREATE INDEX idx_fishing_record_fk_user_id                ON pescare.fishing_record (fk_user_id);
CREATE INDEX idx_fishing_record_fk_type_location_id       ON pescare.fishing_record (fk_type_location_id);
CREATE INDEX idx_fishing_record_fk_fishing_method_id      ON pescare.fishing_record (fk_fishing_method_id);
CREATE INDEX idx_fishing_record_fk_municipality_ibge_code ON pescare.fishing_record (fk_municipality_ibge_code);

CREATE TABLE pescare.fishing_record_species (
    id                    INTEGER        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unit_value            NUMERIC(10,2),
    quantity              NUMERIC(10,3)  NOT NULL,
    commercialized        BOOLEAN        NOT NULL DEFAULT false,
    unit_measure          VARCHAR(10)    NOT NULL,
    fk_species_id         INTEGER        NOT NULL,
    fk_fishing_record_id  INTEGER        NOT NULL,

    CONSTRAINT uq_fishing_record_species UNIQUE (fk_fishing_record_id, fk_species_id),
    CONSTRAINT chk_unit_measure CHECK (unit_measure IN ('KG', 'UNIDADE')),
    CONSTRAINT fk_fishing_record_species_2 FOREIGN KEY (fk_species_id)
        REFERENCES pescare.species (id) ON DELETE CASCADE,
    CONSTRAINT fk_fishing_record_species_3 FOREIGN KEY (fk_fishing_record_id)
        REFERENCES pescare.fishing_record (id) ON DELETE CASCADE
);

CREATE INDEX idx_fishing_record_species_fk_species_id ON pescare.fishing_record_species (fk_species_id);

-- -----------------------------------------------------------------------------
-- Comercialização
-- -----------------------------------------------------------------------------

CREATE TABLE pescare.commercialization (
    id                         INTEGER        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    commercialization_date     DATE           NOT NULL,
    total_value                NUMERIC(12,2)  NOT NULL,
    fk_fishing_record_id       INTEGER        NOT NULL,
    fk_municipality_ibge_code  VARCHAR        NOT NULL,

    CONSTRAINT fk_commercialization_2 FOREIGN KEY (fk_fishing_record_id)
        REFERENCES pescare.fishing_record (id) ON DELETE CASCADE,
    CONSTRAINT fk_commercialization_3 FOREIGN KEY (fk_municipality_ibge_code)
        REFERENCES pescare.municipality (ibge_code) ON DELETE RESTRICT
);

CREATE INDEX idx_commercialization_fk_fishing_record_id      ON pescare.commercialization (fk_fishing_record_id);
CREATE INDEX idx_commercialization_fk_municipality_ibge_code ON pescare.commercialization (fk_municipality_ibge_code);

CREATE TABLE pescare.commercialization_buyer (
    id                       INTEGER  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fk_buyer_type_id         INTEGER  NOT NULL,
    fk_commercialization_id  INTEGER  NOT NULL,

    CONSTRAINT uq_commercialization_buyer UNIQUE (fk_commercialization_id, fk_buyer_type_id),
    CONSTRAINT fk_commercialization_buyer_2 FOREIGN KEY (fk_buyer_type_id)
        REFERENCES pescare.buyer_type (id) ON DELETE CASCADE,
    CONSTRAINT fk_commercialization_buyer_3 FOREIGN KEY (fk_commercialization_id)
        REFERENCES pescare.commercialization (id) ON DELETE CASCADE
);

CREATE INDEX idx_commercialization_buyer_fk_buyer_type_id ON pescare.commercialization_buyer (fk_buyer_type_id);

-- -----------------------------------------------------------------------------
-- Defesos (períodos de proibição de pesca)
-- -----------------------------------------------------------------------------

-- O defeso ao longo do tempo; o que muda com a norma fica nas versões.
CREATE TABLE pescare.fishing_ban (
    id                INTEGER  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name              VARCHAR  NOT NULL,
    description       VARCHAR,
    fishing_ban_type  VARCHAR  NOT NULL,

    CONSTRAINT uq_fishing_ban_name UNIQUE (name),
    CONSTRAINT chk_fishing_ban_type CHECK (fishing_ban_type IN ('CONTINENTAL', 'MARINHO'))
);

-- Cada período é uma versão de um defeso, com a portaria própria; start_in define a ordem.
CREATE TABLE pescare.fishing_ban_period (
    id                             INTEGER  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    applies_to_all_species         BOOLEAN  NOT NULL DEFAULT false,
    applies_to_all_location_types  BOOLEAN  NOT NULL DEFAULT false,
    observation                    VARCHAR,
    start_in                       DATE     NOT NULL,
    valid_until                    DATE,
    fk_fishing_ban_id              INTEGER  NOT NULL,
    status                         VARCHAR  NOT NULL DEFAULT 'ACTIVE',
    rule                           VARCHAR  NOT NULL,

    CONSTRAINT uq_fishing_ban_period_start UNIQUE (fk_fishing_ban_id, start_in),
    CONSTRAINT chk_fishing_ban_period_status   CHECK (status IN ('DRAFT', 'ACTIVE')),
    CONSTRAINT chk_fishing_ban_period_validity CHECK (valid_until IS NULL OR valid_until >= start_in),
    CONSTRAINT fk_fishing_ban_period_2 FOREIGN KEY (fk_fishing_ban_id)
        REFERENCES pescare.fishing_ban (id) ON DELETE RESTRICT
);

-- No máximo um rascunho por defeso. O status entra no índice porque, só com a chave estrangeira,
-- o prisma db pull entende a relação como 1:1.
CREATE UNIQUE INDEX uq_fishing_ban_period_draft
    ON pescare.fishing_ban_period (fk_fishing_ban_id, status) WHERE status = 'DRAFT';

-- Janelas anuais recorrentes; o ano é fixado em 2000 (só dia/mês importam).
CREATE TABLE pescare.fishing_ban_period_window (
    id                        INTEGER  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    start_date                DATE     NOT NULL,
    end_date                  DATE     NOT NULL,
    fk_fishing_ban_period_id  INTEGER  NOT NULL,

    CONSTRAINT uq_fishing_ban_period_window UNIQUE (fk_fishing_ban_period_id, start_date),
    CONSTRAINT chk_fishing_ban_period_window_year CHECK (
        EXTRACT(YEAR FROM start_date) = 2000 AND EXTRACT(YEAR FROM end_date) = 2000
    ),
    CONSTRAINT fk_fishing_ban_period_window_2 FOREIGN KEY (fk_fishing_ban_period_id)
        REFERENCES pescare.fishing_ban_period (id) ON DELETE CASCADE
);

CREATE TABLE pescare.fishing_ban_species (
    id                        INTEGER  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fk_species_id             INTEGER  NOT NULL,
    fk_fishing_ban_period_id  INTEGER  NOT NULL,

    CONSTRAINT uq_fishing_ban_species UNIQUE (fk_species_id, fk_fishing_ban_period_id),
    CONSTRAINT fk_fishing_ban_species_2 FOREIGN KEY (fk_species_id)
        REFERENCES pescare.species (id) ON DELETE RESTRICT,
    CONSTRAINT fk_fishing_ban_species_3 FOREIGN KEY (fk_fishing_ban_period_id)
        REFERENCES pescare.fishing_ban_period (id) ON DELETE CASCADE
);

CREATE INDEX idx_fishing_ban_species_fk_fishing_ban_period_id ON pescare.fishing_ban_species (fk_fishing_ban_period_id);

CREATE TABLE pescare.fishing_ban_type_location (
    id                        INTEGER  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fk_type_location_id       INTEGER  NOT NULL,
    fk_fishing_ban_period_id  INTEGER  NOT NULL,

    CONSTRAINT uq_fishing_ban_type_location UNIQUE (fk_type_location_id, fk_fishing_ban_period_id),
    CONSTRAINT fk_fishing_ban_type_location_2 FOREIGN KEY (fk_type_location_id)
        REFERENCES pescare.type_location (id) ON DELETE RESTRICT,
    CONSTRAINT fk_fishing_ban_type_location_3 FOREIGN KEY (fk_fishing_ban_period_id)
        REFERENCES pescare.fishing_ban_period (id) ON DELETE CASCADE
);

CREATE INDEX idx_fishing_ban_type_location_fk_fishing_ban_period_id ON pescare.fishing_ban_type_location (fk_fishing_ban_period_id);

CREATE TABLE pescare.fishing_ban_coverage (
    id                         INTEGER  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fk_municipality_ibge_code  VARCHAR  NOT NULL,
    fk_fishing_ban_period_id   INTEGER  NOT NULL,

    CONSTRAINT uq_fishing_ban_coverage UNIQUE (fk_municipality_ibge_code, fk_fishing_ban_period_id),
    CONSTRAINT fk_fishing_ban_coverage_2 FOREIGN KEY (fk_municipality_ibge_code)
        REFERENCES pescare.municipality (ibge_code) ON DELETE RESTRICT,
    CONSTRAINT fk_fishing_ban_coverage_3 FOREIGN KEY (fk_fishing_ban_period_id)
        REFERENCES pescare.fishing_ban_period (id) ON DELETE CASCADE
);

CREATE INDEX idx_fishing_ban_coverage_fk_fishing_ban_period_id ON pescare.fishing_ban_coverage (fk_fishing_ban_period_id);

COMMIT;
