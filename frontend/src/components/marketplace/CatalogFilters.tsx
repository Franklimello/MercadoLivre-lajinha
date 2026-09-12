"use client";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { conditions, fuels, transmissions } from "@/lib/marketplace";
import { productFilterKeys, vehicleFilterKeys } from "@/lib/catalog";
import { AnimatePresence, motion } from "motion/react";
import { fadeRise } from "@/lib/motion";
export function CatalogFilters({
  vehicles,
  params,
  apply,
}: {
  vehicles: boolean;
  params: URLSearchParams;
  apply: (values: Record<string, string>) => void;
}) {
  const prefix = useId();
  const [error, setError] = useState("");
  const keys = vehicles ? vehicleFilterKeys : productFilterKeys;
  function field(name: string, label: string, type = "number") {
    return (
      <div className="field">
        <label htmlFor={prefix + name}>{label}</label>
        <Input
          id={prefix + name}
          name={name}
          type={type}
          inputMode={type === "number" ? "decimal" : undefined}
          min="0"
          step={name.includes("Price") ? "0.01" : "1"}
          defaultValue={params.get(name) || ""}
          placeholder={type === "number" ? "—" : label}
        />
      </div>
    );
  }
  return (
    <motion.form
      className="filter-form"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.045 } },
      }}
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const values = Object.fromEntries(
          keys.map((key) => [key, String(form.get(key) || "").trim()]),
        );
        if (
          values.minPrice &&
          values.maxPrice &&
          Number(values.minPrice) > Number(values.maxPrice)
        ) {
          setError("O preço mínimo deve ser menor que o máximo.");
          return;
        }
        if (
          values.minYear &&
          values.maxYear &&
          Number(values.minYear) > Number(values.maxYear)
        ) {
          setError("Confira o intervalo de anos.");
          return;
        }
        setError("");
        apply(values);
      }}
    >
      <motion.fieldset className="filter-section" variants={fadeRise}>
        <legend>Faixa de preço</legend>
        <div className="grid grid-cols-2 gap-2">
          {field("minPrice", "De (R$)")}
          {field("maxPrice", "Até (R$)")}
        </div>
      </motion.fieldset>
      {!vehicles ? (
        <motion.fieldset className="filter-section" variants={fadeRise}>
          <legend>Estado do produto</legend>
          {[["", "Todos"], ...Object.entries(conditions)].map(
            ([value, label]) => (
              <label key={value} className="radio-row">
                <input
                  type="radio"
                  name="condition"
                  value={value}
                  defaultChecked={(params.get("condition") || "") === value}
                />
                {label}
              </label>
            ),
          )}
        </motion.fieldset>
      ) : (
        <>
          <motion.fieldset className="filter-section" variants={fadeRise}>
            <legend>Marca e modelo</legend>
            <div className="space-y-3">
              {field("brand", "Marca", "text")}
              {field("model", "Modelo", "text")}
            </div>
          </motion.fieldset>
          <motion.fieldset className="filter-section" variants={fadeRise}>
            <legend>Ano e quilometragem</legend>
            <div className="grid grid-cols-2 gap-2">
              {field("minYear", "De")}
              {field("maxYear", "Até")}
            </div>
            <div className="mt-3">{field("maxMileage", "Até quantos km?")}</div>
          </motion.fieldset>
          {[
            { name: "combustivel", label: "Combustível", options: fuels },
            { name: "cambio", label: "Câmbio", options: transmissions },
          ].map((f) => (
            <motion.div key={f.name} className="field" variants={fadeRise}>
              <label htmlFor={prefix + f.name}>{f.label}</label>
              <select
                id={prefix + f.name}
                name={f.name}
                defaultValue={params.get(f.name) || ""}
                className="form-control"
              >
                <option value="">Todos</option>
                {f.options.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </motion.div>
          ))}
        </>
      )}
      <AnimatePresence>
        {error && (
          <motion.p
            role="alert"
            className="inline-error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      <motion.div className="flex flex-col gap-2" variants={fadeRise}>
        <Button type="submit">Aplicar filtros</Button>
        <Button
          variant="ghost"
          type="button"
          onClick={() =>
            apply(Object.fromEntries(keys.map((key) => [key, ""])))
          }
        >
          Limpar filtros
        </Button>
      </motion.div>
    </motion.form>
  );
}
