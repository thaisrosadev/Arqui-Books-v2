// regras.js — funções de data e regras do negócio (usadas pelo Dashboard, Empréstimos e Sidebar)

const pad = (n) => String(n).padStart(2, '0') // 5 vira "05" (para montar datas)

export const NOMES_MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
export const ABREV_MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export const PRAZO_DIAS = 14 // prazo padrão de devolução
export const DIAS_AVISO = 2  // faltando até 2 dias, o empréstimo fica "Vencendo"

// ===== DATAS =====
// Padrão do sistema: datas em texto ISO "aaaa-mm-dd" (igual ao MySQL). Meses: "aaaa-mm".

export function paraISO(d) {                       // Date -> "2026-10-21"
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function hojeISO() {                        // data de hoje em ISO
  return paraISO(new Date())
}

export function dataDeISO(iso) {                   // "2026-10-21" -> Date (no fuso local)
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d)
}

export function somaDias(iso, n) {                 // soma n dias (n pode ser negativo)
  const d = dataDeISO(iso)
  d.setDate(d.getDate() + n)
  return paraISO(d)
}

export function diasEntre(inicio, fim) {           // quantos dias de "inicio" até "fim"
  const [a1, m1, d1] = inicio.split('-').map(Number)
  const [a2, m2, d2] = fim.split('-').map(Number)
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000)
}

export function formatarData(iso) {                // "2026-10-21" -> "21/10/2026"
  if (!iso) return ''
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

export function chaveMes(iso) {                    // "2026-10-21" -> "2026-10"
  return iso.slice(0, 7)
}

export function somaMeses(chave, n) {              // "2026-10" + (-1) = "2026-09"
  const [a, m] = chave.split('-').map(Number)
  const d = new Date(a, m - 1 + n, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function ultimoDiaDoMes(chave) {            // "2026-09" -> "2026-09-30"
  const [a, m] = chave.split('-').map(Number)
  return paraISO(new Date(a, m, 0))                // dia 0 do mês seguinte = último dia deste
}

export function nomeDoMes(chave) {                 // "2026-10" -> "Outubro 2026"
  return `${NOMES_MESES[Number(chave.slice(5, 7)) - 1]} ${chave.slice(0, 4)}`
}

export function abrevDoMes(chave) {                // "2026-10" -> "Out"
  return ABREV_MESES[Number(chave.slice(5, 7)) - 1]
}

// ===== STATUS DO EMPRÉSTIMO (calculado pelas datas, nunca digitado) =====

export function abertoEm(e, data) {                // o empréstimo estava em aberto nessa data?
  return e.emprestimo <= data && (!e.devolucao || e.devolucao > data)
}

export function statusEm(e, data) {                // 'No prazo' | 'Vencendo' | 'Atrasado' | null (se não estava aberto)
  if (!abertoEm(e, data)) return null
  const faltam = diasEntre(data, e.previsao)       // dias até a data prevista
  if (faltam < 0) return 'Atrasado'                // já passou
  if (faltam <= DIAS_AVISO) return 'Vencendo'      // falta pouco
  return 'No prazo'
}

export function variacao(atual, anterior) {       // variação % entre dois números (null = sem base de comparação)
  if (anterior === 0) return atual === 0 ? 0 : null
  return ((atual - anterior) / anterior) * 100
}

// ===== CÁLCULOS DO DASHBOARD =====
// todos = empréstimos abertos + histórico de devolvidos | alunos = lista de alunos (para achar a turma)
export function calcularPainel(todos, totalExemplares, mesSel, hoje, alunos) {
  const ehAtual = mesSel === chaveMes(hoje)                         // o mês escolhido é o mês de hoje?
  const dataRef = ehAtual ? hoje : ultimoDiaDoMes(mesSel)           // data da "foto" do acervo
  const mesAnt = somaMeses(mesSel, -1)                              // mês anterior ao escolhido
  const ultimoAnt = ultimoDiaDoMes(mesAnt)
  const diaLimite = ehAtual ? Number(hoje.slice(8, 10)) : 31        // mês em andamento: compara só até o dia de hoje
  const dataRefAnt = ehAtual                                        // "foto" equivalente do mês anterior
    ? `${mesAnt}-${pad(Math.min(diaLimite, Number(ultimoAnt.slice(8, 10))))}`
    : ultimoAnt

  // conta quantos registros têm "campo" (emprestimo/devolucao) dentro do mês, até certo dia
  const contarNoMes = (campo, chave, ateDia) =>
    todos.filter(e => e[campo] && chaveMes(e[campo]) === chave && Number(e[campo].slice(8, 10)) <= ateDia).length

  // "foto" do acervo em uma data
  const posicaoEm = (data) => {
    const abertos = todos.filter(e => abertoEm(e, data))
    const atrasados = abertos.filter(e => statusEm(e, data) === 'Atrasado').length
    return {
      total: totalExemplares,
      emprestados: abertos.length,
      disponiveis: Math.max(0, totalExemplares - abertos.length),
      atrasados,
      noPrazo: abertos.length - atrasados,
    }
  }

  const atual = { retirados: contarNoMes('emprestimo', mesSel, diaLimite), devolvidos: contarNoMes('devolucao', mesSel, diaLimite), ...posicaoEm(dataRef) }
  const anterior = { retirados: contarNoMes('emprestimo', mesAnt, diaLimite), devolvidos: contarNoMes('devolucao', mesAnt, diaLimite), ...posicaoEm(dataRefAnt) }

  // gráfico: 6 meses terminando no mês escolhido
  const serie = [-5, -4, -3, -2, -1, 0].map(k => {
    const chave = somaMeses(mesSel, k)
    return { chave, rotulo: abrevDoMes(chave), valor: contarNoMes('emprestimo', chave, 31) }
  })

  // ranking de livros do mês
  const contagem = {}
  todos.filter(e => chaveMes(e.emprestimo) === mesSel).forEach(e => { contagem[e.livro] = (contagem[e.livro] || 0) + 1 })
  const topLivros = Object.entries(contagem)
    .map(([titulo, qtd]) => ({ titulo, qtd }))
    .sort((a, b) => b.qtd - a.qtd || a.titulo.localeCompare(b.titulo))
    .slice(0, 5)

  // alunos com empréstimo em atraso na data da foto
  const turmaDe = (rm) => (alunos.find(a => a.rm === rm) || {}).curso || ''
  const atrasados = todos
    .filter(e => statusEm(e, dataRef) === 'Atrasado')
    .map(e => ({ chave: `${e.rm}-${e.isbn}-${e.emprestimo}`, aluno: e.aluno, turma: turmaDe(e.rm), livro: e.livro, dias: diasEntre(e.previsao, dataRef) }))
    .sort((a, b) => b.dias - a.dias)

  return { ehAtual, dataRef, mesAnt, dataRefAnt, atual, anterior, serie, topLivros, atrasados }
}

// ===== NOTIFICAÇÕES (geradas automaticamente a partir dos dados) =====
export function gerarNotificacoes(emprestimos, livros, alunos, hoje) {
  const lista = []

  emprestimos.forEach(e => {                                        // atrasos e vencimentos
    const status = statusEm(e, hoje)
    if (status === 'Atrasado') {
      const dias = diasEntre(e.previsao, hoje)
      lista.push({ id: `atraso-${e.rm}-${e.isbn}-${e.emprestimo}`, tipo: 'atraso', peso: 1000 + dias, titulo: 'Empréstimo em atraso', texto: `${e.aluno} está há ${dias} ${dias === 1 ? 'dia' : 'dias'} com "${e.livro}".`, link: '/emprestimos' })
    } else if (status === 'Vencendo') {
      const faltam = diasEntre(hoje, e.previsao)
      const quando = faltam === 0 ? 'hoje' : faltam === 1 ? 'amanhã' : `em ${faltam} dias`
      lista.push({ id: `vence-${e.rm}-${e.isbn}-${e.emprestimo}`, tipo: 'vencendo', peso: 500 - faltam, titulo: 'Devolução próxima', texto: `${e.aluno} deve devolver "${e.livro}" ${quando} (${formatarData(e.previsao)}).`, link: '/emprestimos' })
    }
  })

  livros.forEach(l => {                                             // estoque zerado
    if (l.disponiveis === 0) {
      lista.push({ id: `estoque-${l.isbn}`, tipo: 'estoque', peso: 300, titulo: 'Sem exemplares', texto: `"${l.titulo}" está sem exemplares disponíveis.`, link: '/livros' })
    }
  })

  alunos.forEach(a => {                                             // alunos bloqueados
    if (a.status === 'Bloqueado') {
      lista.push({ id: `bloqueado-${a.rm}`, tipo: 'bloqueado', peso: 100, titulo: 'Aluno bloqueado', texto: `${a.nome} (${a.curso}) está bloqueado e não pode retirar livros.`, link: '/alunos' })
    }
  })

  return lista.sort((a, b) => b.peso - a.peso)                      // mais urgentes primeiro
}
