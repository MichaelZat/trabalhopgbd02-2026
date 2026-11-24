-- BANCO COMPLETO ATUAL, SOMENTE PARA BANCO VAZIO DE ESTUDO.
-- No aplicativo use npm run db:migrate para registrar as três migrações.
-- Este DDL não preenche _prisma_migrations. Não misture as duas rotas.
BEGIN;
SET LOCAL search_path TO public;
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "perfil_usuario" AS ENUM ('CLIENTE', 'OPERADOR');

-- CreateEnum
CREATE TYPE "tipo_evento" AS ENUM ('FILME', 'EVENTO');

-- CreateEnum
CREATE TYPE "situacao_reserva" AS ENUM ('PENDENTE', 'PAGA', 'EXPIRADA');

-- CreateEnum
CREATE TYPE "canal_venda" AS ENUM ('INTERNET', 'BALCAO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hash_senha" TEXT NOT NULL,
    "perfil" "perfil_usuario" NOT NULL DEFAULT 'CLIENTE',
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_usuarios" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "tipo" "tipo_evento" NOT NULL,

    CONSTRAINT "pk_eventos" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salas" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "pk_salas" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assentos" (
    "id" UUID NOT NULL,
    "sala_id" UUID NOT NULL,
    "fila" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,

    CONSTRAINT "pk_assentos" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes" (
    "id" UUID NOT NULL,
    "evento_id" UUID NOT NULL,
    "sala_id" UUID NOT NULL,
    "inicio_em" TIMESTAMPTZ(3) NOT NULL,
    "preco" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "pk_sessoes" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assentos_sessao" (
    "id" UUID NOT NULL,
    "sessao_id" UUID NOT NULL,
    "assento_id" UUID NOT NULL,
    "sala_id" UUID NOT NULL,
    "reserva_atual_id" UUID,

    CONSTRAINT "pk_assentos_sessao" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservas" (
    "id" UUID NOT NULL,
    "sessao_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "situacao" "situacao_reserva" NOT NULL DEFAULT 'PENDENTE',
    "canal_venda" "canal_venda" NOT NULL DEFAULT 'INTERNET',
    "expira_em" TIMESTAMPTZ(3) NOT NULL,
    "valor_total" DECIMAL(12,2) NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_reservas" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_reserva" (
    "id" UUID NOT NULL,
    "reserva_id" UUID NOT NULL,
    "assento_sessao_id" UUID NOT NULL,
    "sessao_id" UUID NOT NULL,
    "preco_unitario" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "pk_itens_reserva" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" UUID NOT NULL,
    "reserva_id" UUID NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "pago_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "simulado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pk_pagamentos" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingressos" (
    "id" UUID NOT NULL,
    "item_reserva_id" UUID NOT NULL,
    "assento_sessao_id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "emitido_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utilizado_em" TIMESTAMPTZ(3),
    "validado_por_id" UUID,

    CONSTRAINT "pk_ingressos" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditorias_ingressos" (
    "id" BIGSERIAL NOT NULL,
    "ingresso_id" UUID NOT NULL,
    "acao" TEXT NOT NULL,
    "registrado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uso_anterior_em" TIMESTAMPTZ(3),
    "uso_atual_em" TIMESTAMPTZ(3),
    "responsavel_id" UUID,

    CONSTRAINT "pk_auditorias_ingressos" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_usuarios_email" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "uq_assentos_sala_id_fila_numero" ON "assentos"("sala_id", "fila", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "uq_assentos_id_sala_id" ON "assentos"("id", "sala_id");

-- CreateIndex
CREATE INDEX "idx_sessoes_inicio_em" ON "sessoes"("inicio_em");

-- CreateIndex
CREATE INDEX "idx_sessoes_evento_id" ON "sessoes"("evento_id");

-- CreateIndex
CREATE INDEX "idx_sessoes_sala_id" ON "sessoes"("sala_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sessoes_id_sala_id" ON "sessoes"("id", "sala_id");

-- CreateIndex
CREATE INDEX "idx_assentos_sessao_assento_id" ON "assentos_sessao"("assento_id");

-- CreateIndex
CREATE INDEX "idx_assentos_sessao_reserva_atual_id" ON "assentos_sessao"("reserva_atual_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_assentos_sessao_sessao_id_assento_id" ON "assentos_sessao"("sessao_id", "assento_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_assentos_sessao_id_sessao_id" ON "assentos_sessao"("id", "sessao_id");

-- CreateIndex
CREATE INDEX "idx_reservas_situacao_expira_em" ON "reservas"("situacao", "expira_em");

-- CreateIndex
CREATE INDEX "idx_reservas_usuario_id" ON "reservas"("usuario_id");

-- CreateIndex
CREATE INDEX "idx_reservas_sessao_id" ON "reservas"("sessao_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_reservas_id_sessao_id" ON "reservas"("id", "sessao_id");

-- CreateIndex
CREATE INDEX "idx_itens_reserva_assento_sessao_id" ON "itens_reserva"("assento_sessao_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_itens_reserva_reserva_id_assento_sessao_id" ON "itens_reserva"("reserva_id", "assento_sessao_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_itens_reserva_id_assento_sessao_id" ON "itens_reserva"("id", "assento_sessao_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_pagamentos_reserva_id" ON "pagamentos"("reserva_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ingressos_item_reserva_id" ON "ingressos"("item_reserva_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ingressos_assento_sessao_id" ON "ingressos"("assento_sessao_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ingressos_codigo" ON "ingressos"("codigo");

-- CreateIndex
CREATE INDEX "idx_ingressos_validado_por_id" ON "ingressos"("validado_por_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ingressos_item_reserva_id_assento_sessao_id" ON "ingressos"("item_reserva_id", "assento_sessao_id");

-- CreateIndex
CREATE INDEX "idx_auditorias_ingressos_ingresso_id" ON "auditorias_ingressos"("ingresso_id");

-- AddForeignKey
ALTER TABLE "assentos" ADD CONSTRAINT "fk_assentos_sala_id" FOREIGN KEY ("sala_id") REFERENCES "salas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "fk_sessoes_evento_id" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "fk_sessoes_sala_id" FOREIGN KEY ("sala_id") REFERENCES "salas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assentos_sessao" ADD CONSTRAINT "fk_assentos_sessao_sessao_id_sala_id" FOREIGN KEY ("sessao_id", "sala_id") REFERENCES "sessoes"("id", "sala_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assentos_sessao" ADD CONSTRAINT "fk_assentos_sessao_assento_id_sala_id" FOREIGN KEY ("assento_id", "sala_id") REFERENCES "assentos"("id", "sala_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assentos_sessao" ADD CONSTRAINT "fk_assentos_sessao_reserva_atual_id_sessao_id" FOREIGN KEY ("reserva_atual_id", "sessao_id") REFERENCES "reservas"("id", "sessao_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "fk_reservas_sessao_id" FOREIGN KEY ("sessao_id") REFERENCES "sessoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "fk_reservas_usuario_id" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_reserva" ADD CONSTRAINT "fk_itens_reserva_reserva_id_sessao_id" FOREIGN KEY ("reserva_id", "sessao_id") REFERENCES "reservas"("id", "sessao_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_reserva" ADD CONSTRAINT "fk_itens_reserva_assento_sessao_id_sessao_id" FOREIGN KEY ("assento_sessao_id", "sessao_id") REFERENCES "assentos_sessao"("id", "sessao_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "fk_pagamentos_reserva_id" FOREIGN KEY ("reserva_id") REFERENCES "reservas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingressos" ADD CONSTRAINT "fk_ingressos_item_reserva_id_assento_sessao_id" FOREIGN KEY ("item_reserva_id", "assento_sessao_id") REFERENCES "itens_reserva"("id", "assento_sessao_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingressos" ADD CONSTRAINT "fk_ingressos_assento_sessao_id" FOREIGN KEY ("assento_sessao_id") REFERENCES "assentos_sessao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingressos" ADD CONSTRAINT "fk_ingressos_validado_por_id" FOREIGN KEY ("validado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditorias_ingressos" ADD CONSTRAINT "fk_auditorias_ingressos_ingresso_id" FOREIGN KEY ("ingresso_id") REFERENCES "ingressos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE assentos ADD CONSTRAINT ck_assentos_numero_positivo CHECK(numero>0);
ALTER TABLE sessoes ADD CONSTRAINT ck_sessoes_preco_nao_negativo CHECK(preco>=0);
ALTER TABLE reservas ADD CONSTRAINT ck_reservas_valor_total_nao_negativo CHECK(valor_total>=0);
ALTER TABLE itens_reserva ADD CONSTRAINT ck_itens_reserva_preco_unitario_nao_negativo CHECK(preco_unitario>=0);
ALTER TABLE pagamentos ADD CONSTRAINT ck_pagamentos_valor_nao_negativo CHECK(valor>=0);
CREATE OR REPLACE FUNCTION public.fn_auditar_ingresso() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.auditorias_ingressos (ingresso_id, acao, uso_atual_em, responsavel_id)
    VALUES (NEW.id, 'INSERCAO', NEW.utilizado_em, NEW.validado_por_id);
  ELSIF OLD.utilizado_em IS DISTINCT FROM NEW.utilizado_em THEN
    INSERT INTO public.auditorias_ingressos (ingresso_id, acao, uso_anterior_em, uso_atual_em, responsavel_id)
    VALUES (NEW.id, 'ATUALIZACAO', OLD.utilizado_em, NEW.utilizado_em, NEW.validado_por_id);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_auditar_ingresso AFTER INSERT OR UPDATE ON ingressos
FOR EACH ROW EXECUTE FUNCTION fn_auditar_ingresso();

CREATE PROCEDURE public.sp_relatorio_sessoes(
  IN p_inicio timestamptz, IN p_fim timestamptz, IN p_sessao uuid, INOUT resultado jsonb
) LANGUAGE plpgsql AS $$
BEGIN
  WITH capacidade AS (
    SELECT sessao_id, count(*)::integer AS capacidade FROM public.assentos_sessao GROUP BY sessao_id
  ), vendas AS (
    SELECT item.sessao_id, count(ingresso.id)::integer AS vendidos,
      count(ingresso.utilizado_em)::integer AS utilizados, sum(item.preco_unitario) AS receita
    FROM public.ingressos ingresso
    JOIN public.itens_reserva item ON item.id=ingresso.item_reserva_id
    JOIN public.reservas reserva ON reserva.id=item.reserva_id
    JOIN public.pagamentos pagamento ON pagamento.reserva_id=reserva.id
    GROUP BY item.sessao_id
  ), linhas AS (
    SELECT sessao.id AS "sessaoId", evento.titulo, sala.nome AS sala, sessao.inicio_em AS "inicioEm",
      coalesce(capacidade.capacidade,0) AS capacidade, coalesce(vendas.vendidos,0) AS vendidos,
      coalesce(vendas.utilizados,0) AS utilizados, coalesce(vendas.receita,0)::numeric(12,2)::text AS receita,
      CASE WHEN coalesce(capacidade.capacidade,0)=0 THEN 0
        ELSE round(coalesce(vendas.vendidos,0)::numeric/capacidade.capacidade*100,2) END AS "taxaOcupacao"
    FROM public.sessoes sessao
    JOIN public.eventos evento ON evento.id=sessao.evento_id
    JOIN public.salas sala ON sala.id=sessao.sala_id
    LEFT JOIN capacidade ON capacidade.sessao_id=sessao.id
    LEFT JOIN vendas ON vendas.sessao_id=sessao.id
    WHERE (p_inicio IS NULL OR sessao.inicio_em>=p_inicio)
      AND (p_fim IS NULL OR sessao.inicio_em<=p_fim)
      AND (p_sessao IS NULL OR sessao.id=p_sessao)
  ) SELECT coalesce(jsonb_agg(to_jsonb(linhas) ORDER BY "inicioEm"),'[]'::jsonb) INTO resultado FROM linhas;
END;
$$;
COMMIT;
