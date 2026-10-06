"use client";

import { Download, Link2, Loader2, Save } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, inputClasses } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialActionState } from "@/lib/action-state";
import { importGiftAction, saveGiftAction } from "../actions";

export interface GiftFormValues {
  id?: string;
  title: string;
  description: string;
  price: string;
  category: string;
  stockQuantity: number;
  imageUrl: string;
  sourceUrl: string;
  source: string;
  active: boolean;
}

const EMPTY: GiftFormValues = {
  title: "",
  description: "",
  price: "",
  category: "Brinquedos",
  stockQuantity: 1,
  imageUrl: "",
  sourceUrl: "",
  source: "",
  active: true,
};

const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

/**
 * Formulário único de presente (novo/editar). No cadastro novo, o importador por link apenas
 * PRÉ-PREENCHE os campos: tudo pode ser editado e o cadastro manual sempre funciona.
 */
export function GiftForm({ initial, categories, allowImport }: { initial?: GiftFormValues; categories: string[]; allowImport?: boolean }) {
  const [state, formAction] = useActionState(saveGiftAction, initialActionState);
  const [values, setValues] = useState<GiftFormValues>(initial ?? EMPTY);
  const [importUrl, setImportUrl] = useState("");
  const [importId, setImportId] = useState<string>();
  const [importNotice, setImportNotice] = useState<{ tone: "success" | "warning" | "error"; text: string }>();
  const [importing, startImport] = useTransition();
  const errors = state.fieldErrors ?? {};
  const set = <K extends keyof GiftFormValues>(key: K, value: GiftFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  const runImport = () =>
    startImport(async () => {
      setImportNotice(undefined);
      const { preview, error } = await importGiftAction(importUrl);
      if (error || !preview) {
        setImportNotice({ tone: "error", text: error ?? "Não foi possível obter todas as informações automaticamente." });
        return;
      }
      setImportId(preview.importId);
      setValues((v) => ({
        ...v,
        title: preview.title ?? v.title,
        price: preview.priceInCents ? centsToInput(preview.priceInCents) : v.price,
        imageUrl: preview.imageUrl ?? v.imageUrl,
        sourceUrl: preview.resolvedUrl || preview.originalUrl,
        source: preview.source,
      }));
      setImportNotice(
        preview.status === "SUCCESS"
          ? { tone: "success", text: "Informações importadas! Revise antes de salvar." }
          : { tone: "warning", text: "Não foi possível obter todas as informações automaticamente. Complete os campos abaixo." },
      );
    });

  return (
    <div className="flex flex-col gap-4">
      {allowImport && (
        <section className="paper-card flex flex-col gap-3 p-4" aria-labelledby="import-title">
          <h2 id="import-title" className="flex items-center gap-2 font-display text-lg font-semibold">
            <Link2 className="size-5 text-forest" aria-hidden /> Adicionar presente por link
          </h2>
          <p className="text-sm text-ink-soft">Cole o link do produto (Shopee, Amazon, Mercado Livre...). Os dados são só uma sugestão.</p>
          <label htmlFor="import-url" className="sr-only">Cole o link do produto</label>
          <input
            id="import-url"
            type="url"
            inputMode="url"
            placeholder="Cole o link do produto — ex.: https://br.shp.ee/..."
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            className={inputClasses}
          />
          <Button onClick={runImport} disabled={importing || !importUrl.trim()} block>
            {importing ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Download className="size-5" aria-hidden />}
            {importing ? "Buscando informações..." : "Importar produto"}
          </Button>
          {importNotice && <Notice tone={importNotice.tone}>{importNotice.text}</Notice>}
        </section>
      )}

      <form action={formAction} className="paper-card flex flex-col gap-4 p-4" noValidate>
        <h2 className="font-display text-lg font-semibold">{values.id ? "Editar presente" : allowImport ? "Ou adicione manualmente" : "Dados do presente"}</h2>
        {values.id && <input type="hidden" name="id" value={values.id} />}
        {importId && <input type="hidden" name="importId" value={importId} />}

        <div className="flex gap-3">
          <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white ring-1 ring-line">
            {values.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- prévia de URL externa arbitrária
              <img src={values.imageUrl} alt="Prévia da imagem" className="size-full object-contain" referrerPolicy="no-referrer" />
            ) : (
              <span className="px-2 text-center text-xs text-ink-soft">Sem imagem (usa ilustração padrão)</span>
            )}
          </div>
          <Field label="Nome do presente" htmlFor="title" error={errors.title} className="flex-1">
            <input id="title" name="title" value={values.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex.: Pista de Carrinhos" className={inputClasses} required />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Preço (R$)" htmlFor="price" error={errors.price} hint="Valor do Pix">
            <input id="price" name="price" inputMode="decimal" value={values.price} onChange={(e) => set("price", e.target.value)} placeholder="149,90" className={inputClasses} required />
          </Field>
          <Field label="Quantidade" htmlFor="stockQuantity" error={errors.stockQuantity}>
            <input id="stockQuantity" name="stockQuantity" type="number" inputMode="numeric" min={0} max={100} value={values.stockQuantity} onChange={(e) => set("stockQuantity", Number(e.target.value))} className={inputClasses} />
          </Field>
        </div>

        <Field label="Categoria" htmlFor="category" error={errors.category}>
          <input id="category" name="category" list="gift-categories" value={values.category} onChange={(e) => set("category", e.target.value)} className={inputClasses} />
          <datalist id="gift-categories">
            {[...new Set([...categories, "Brinquedos", "Livros", "Roupas", "Experiências"])].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>

        <Field label="Descrição" htmlFor="description" error={errors.description}>
          <textarea id="description" name="description" rows={3} value={values.description} onChange={(e) => set("description", e.target.value)} className={`${inputClasses} min-h-24 py-3`} />
        </Field>

        <Field label="URL da imagem" htmlFor="imageUrl" error={errors.imageUrl} hint="Link direto para a foto do produto (pode trocar quando quiser).">
          <input id="imageUrl" name="imageUrl" type="url" inputMode="url" value={values.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://..." className={inputClasses} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <Field label="Link original (só para referência)" htmlFor="sourceUrl" error={errors.sourceUrl}>
            <input id="sourceUrl" name="sourceUrl" type="url" inputMode="url" value={values.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Loja" htmlFor="source" error={errors.source}>
            <input id="source" name="source" value={values.source} onChange={(e) => set("source", e.target.value)} placeholder="Shopee" className={inputClasses} />
          </Field>
        </div>

        <label className="flex items-center gap-3 text-sm font-bold">
          <input type="checkbox" name="active" checked={values.active} onChange={(e) => set("active", e.target.checked)} className="size-5 accent-[var(--color-forest)]" />
          Visível na lista de presentes
        </label>

        {state.error && <Notice tone="error">{state.error}</Notice>}
        <SubmitButton size="lg" block pendingLabel="Salvando...">
          <Save className="size-5" aria-hidden /> Salvar presente
        </SubmitButton>
      </form>
    </div>
  );
}
