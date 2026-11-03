import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { baixar, CHAVE, mesclar, normalizar, type Turmas } from "@/lib/backup";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Farmou Aura — Resultado da Turma" },
      { name: "description", content: "Cadastre alunos por turma, revele quem farmou aura ou ficou de recuperação e exporte os resultados." },
      { property: "og:title", content: "Farmou Aura — Resultado da Turma" },
      { property: "og:description", content: "Revele aluno por aluno: aprovado ou Aura Negativa 💀. Exporte e importe suas turmas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [turmas, setTurmas] = useState<Turmas>({});
  const [turma, setTurma] = useState("");
  const [novaTurma, setNovaTurma] = useState("");
  const [nome, setNome] = useState("");
  const [aprovado, setAprovado] = useState(true);
  const [show, setShow] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const arquivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const s = localStorage.getItem(CHAVE);
    if (s) {
      const t = normalizar(JSON.parse(s));
      if (t) {
        setTurmas(t);
        setTurma(Object.keys(t)[0] ?? "");
      }
    }
  }, []);

  const save = (t: Turmas) => {
    setTurmas(t);
    localStorage.setItem(CHAVE, JSON.stringify(t));
  };

  const exportar = () => {
    const total = Object.values(turmas).reduce((n, l) => n + l.length, 0);
    if (!total) {
      setMsg("Nada para exportar ainda: cadastre uma turma primeiro.");
      return;
    }
    const pacote = { app: "farmou-aura", versao: 1, exportadoEm: new Date().toISOString(), turmas };
    baixar(
      new Blob([JSON.stringify(pacote, null, 2)], { type: "application/json" }),
      `farmou-aura-${new Date().toISOString().slice(0, 10)}.json`,
    );
    setMsg(`Arquivo baixado com ${Object.keys(turmas).length} turma(s) e ${total} aluno(s). No outro computador, clique em Importar e escolha esse arquivo.`);
  };

  const importar = async (arquivo: File) => {
    try {
      const lido = normalizar(JSON.parse(await arquivo.text()));
      if (!lido || !Object.keys(lido).length) {
        setMsg("Esse arquivo não parece um backup do Farmou Aura.");
        return;
      }
      const { resultado, turmasNovas, alunosNovos, repetidos } = mesclar(turmas, lido);
      save(resultado);
      setTurma(Object.keys(resultado)[0] ?? "");
      setMsg(
        `Importado: ${turmasNovas} turma(s) nova(s) e ${alunosNovos} aluno(s) adicionado(s)` +
          (repetidos ? ` · ${repetidos} aluno(s) já existiam e não foram repetidos.` : "."),
      );
    } catch {
      setMsg("Não consegui ler esse arquivo. Use o .json que o botão Exportar gera.");
    }
  };

  const alunos = turmas[turma] ?? [];

  if (show !== null && alunos.length) {
    const fim = show >= alunos.length;
    const a = alunos[show];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stage text-foreground p-6 text-center overflow-hidden">
        <p className="text-muted-foreground mb-4 uppercase tracking-widest">{turma} · {Math.min(show + 1, alunos.length)}/{alunos.length}</p>
        {fim || !a ? (
          <h1 className="text-5xl font-display">Fim da turma! 🎓</h1>
        ) : (
          <div key={show} className="reveal">
            <h1 className="text-5xl md:text-7xl font-display mb-8">{a.nome}</h1>
            {a.aprovado ? (
              <div className="aura-pos text-5xl md:text-7xl font-display">✨ FARMOU AURA ✨</div>
            ) : (
              <div className="aura-neg text-5xl md:text-7xl font-display">AURA NEGATIVA 💀</div>
            )}
          </div>
        )}
        <div className="mt-12 flex gap-3">
          <button className="btn-ghost" onClick={() => setShow(null)}>Voltar</button>
          {!fim && <button className="btn-main" onClick={() => setShow(show + 1)}>Próximo →</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stage text-foreground p-6">
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-4xl font-display text-center pt-6">Farmou Aura ✨</h1>
        <div className="card-box space-y-3">
          <h2 className="font-semibold">Turma</h2>
          <div className="flex gap-2">
            <input className="inp" placeholder="Nova turma (ex: 3ºA)" value={novaTurma} onChange={(e) => setNovaTurma(e.target.value)} />
            <button className="btn-main" onClick={() => {
              const n = novaTurma.trim(); if (!n) return;
              save({ ...turmas, [n]: turmas[n] ?? [] }); setTurma(n); setNovaTurma("");
            }}>Criar</button>
          </div>
          {Object.keys(turmas).length > 0 && (
            <select className="inp" value={turma} onChange={(e) => setTurma(e.target.value)}>
              {Object.keys(turmas).map((t) => <option key={t}>{t}</option>)}
            </select>
          )}
        </div>
        {turma && (
          <div className="card-box space-y-3">
            <h2 className="font-semibold">Adicionar aluno em {turma}</h2>
            <form className="space-y-3" onSubmit={(e) => {
              e.preventDefault(); const n = nome.trim(); if (!n) return;
              save({ ...turmas, [turma]: [...alunos, { nome: n, aprovado }] }); setNome("");
            }}>
              <input className="inp" placeholder="Nome do aluno" value={nome} onChange={(e) => setNome(e.target.value)} />
              <div className="flex gap-2">
                <button type="button" className={aprovado ? "btn-main flex-1" : "btn-ghost flex-1"} onClick={() => setAprovado(true)}>Aprovado</button>
                <button type="button" className={!aprovado ? "btn-danger flex-1" : "btn-ghost flex-1"} onClick={() => setAprovado(false)}>Recuperação</button>
              </div>
              <button className="btn-main w-full">Adicionar</button>
            </form>
            <ul className="divide-y divide-border">
              {alunos.map((a, i) => (
                <li key={i} className="flex justify-between py-2">
                  <span>{a.nome} — {a.aprovado ? "✨ Aprovado" : "💀 Recuperação"}</span>
                  <button className="text-muted-foreground" onClick={() => save({ ...turmas, [turma]: alunos.filter((_, j) => j !== i) })}>✕</button>
                </li>
              ))}
            </ul>
            {alunos.length > 0 && <button className="btn-main w-full text-lg" onClick={() => setShow(0)}>Exibir resultados 🎬</button>}
            <button className="text-sm text-muted-foreground w-full" onClick={() => {
              const t = { ...turmas }; delete t[turma]; save(t); setTurma(Object.keys(t)[0] ?? "");
            }}>Excluir turma</button>
          </div>
        )}

        <div className="card-box space-y-3">
          <h2 className="font-semibold">Salvar e levar para outro computador</h2>
          <p className="text-sm text-muted-foreground">
            Exporta um arquivo com todas as turmas e resultados. No outro computador, use Importar com esse mesmo arquivo.
          </p>
          <div className="flex gap-2">
            <button className="btn-main flex-1" onClick={exportar}>⬇️ Exportar</button>
            <button className="btn-ghost flex-1" onClick={() => arquivoRef.current?.click()}>⬆️ Importar</button>
          </div>
          <input
            ref={arquivoRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void importar(f);
            }}
          />
          {msg && <p className="text-sm text-primary">{msg}</p>}
        </div>
      </div>
    </div>
  );
}
