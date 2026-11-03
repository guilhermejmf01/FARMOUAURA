export type Aluno = { nome: string; aprovado: boolean };
export type Turmas = Record<string, Aluno[]>;

export const CHAVE = "turmas";

export function baixar(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function normalizar(dados: unknown): Turmas | null {
  const bruto =
    dados && typeof dados === "object" && "turmas" in (dados as Record<string, unknown>)
    ? (dados as Record<string, unknown>)["turmas"]
      : dados;
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return null;
  const saida: Turmas = {};
  for (const [nomeTurma, lista] of Object.entries(bruto as Record<string, unknown>)) {
    if (!Array.isArray(lista)) continue;
    const alunos: Aluno[] = [];
    for (const item of lista) {
      if (!item || typeof item !== "object") continue;
      const reg = item as Record<string, unknown>;
      const n = typeof reg["nome"] === "string" ? reg["nome"].trim() : "";
      if (!n) continue;
      alunos.push({ nome: n, aprovado: Boolean(reg["aprovado"]) });
    }
    saida[nomeTurma.trim() || "Sem nome"] = alunos;
  }
  return saida;
}

export function mesclar(atual: Turmas, novo: Turmas) {
  const resultado: Turmas = { ...atual };
  let turmasNovas = 0;
  let alunosNovos = 0;
  let repetidos = 0;
  for (const [nomeTurma, lista] of Object.entries(novo)) {
    const base = resultado[nomeTurma];
    if (!base) {
      resultado[nomeTurma] = lista;
      turmasNovas += 1;
      alunosNovos += lista.length;
      continue;
    }
    const existentes = new Set(base.map((a) => a.nome.toLowerCase()));
    const adicionados = lista.filter((a) => {
      if (existentes.has(a.nome.toLowerCase())) {
        repetidos += 1;
        return false;
      }
      existentes.add(a.nome.toLowerCase());
      return true;
    });
    resultado[nomeTurma] = [...base, ...adicionados];
    alunosNovos += adicionados.length;
  }
  return { resultado, turmasNovas, alunosNovos, repetidos };
}
