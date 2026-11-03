import { describe, expect, it } from "vitest";

import { mesclar, normalizar } from "@/lib/backup";

describe("Backup import", () => {
  it("reads the file the export button produces", () => {
    const arquivo = {
      app: "farmou-aura",
      versao: 1,
      exportadoEm: "2026-11-03T10:00:00.000Z",
      turmas: { "3ºA": [{ nome: "Ana", aprovado: true }, { nome: "Beto", aprovado: false }] },
    };

    expect(normalizar(arquivo)).toEqual({ "3ºA": [{ nome: "Ana", aprovado: true }, { nome: "Beto", aprovado: false }] });
  });

  it("rejects a file that is not a backup", () => {
    expect(normalizar("oi")).toBeNull();
    expect(normalizar([1, 2, 3])).toBeNull();
    expect(normalizar(null)).toBeNull();
  });

  it("drops entries without a name and keeps the aprovado flag", () => {
    const lido = normalizar({ "3ºA": [{ nome: "  " }, { nome: "Ana", aprovado: 1 }, { nome: "Beto" }] });

    expect(lido).toEqual({ "3ºA": [{ nome: "Ana", aprovado: true }, { nome: "Beto", aprovado: false }] });
  });

  it("does not repeat a student that already exists, whatever the lettering", () => {
    const atual = { "3ºA": [{ nome: "Ana", aprovado: true }] };
    const novo = { "3ºA": [{ nome: "ana", aprovado: true }, { nome: "Beto", aprovado: false }] };

    const { resultado, turmasNovas, alunosNovos, repetidos } = mesclar(atual, novo);

    expect(resultado["3ºA"]?.map((a) => a.nome)).toEqual(["Ana", "Beto"]);
    expect({ turmasNovas, alunosNovos, repetidos }).toEqual({ turmasNovas: 0, alunosNovos: 1, repetidos: 1 });
  });

  it("adds a whole class that the other computer does not have yet", () => {
    const atual = { "3ºA": [{ nome: "Ana", aprovado: true }] };
    const novo = { "3ºB": [{ nome: "Caio", aprovado: false }] };

    const { resultado, turmasNovas, alunosNovos } = mesclar(atual, novo);

    expect(Object.keys(resultado).sort()).toEqual(["3ºA", "3ºB"]);
    expect(resultado["3ºB"]).toEqual([{ nome: "Caio", aprovado: false }]);
    expect({ turmasNovas, alunosNovos }).toEqual({ turmasNovas: 1, alunosNovos: 1 });
  });
});
