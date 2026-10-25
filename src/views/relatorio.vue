<script setup>
import { computed } from 'vue'                                // computed = cálculo automático
import { useRoute, useRouter } from 'vue-router'              // route = lê o ?mes= da URL; router = navega
import { livros, alunos, emprestimos, historico } from '../dados.js'
import { hojeISO, chaveMes, formatarData, diasEntre, statusEm, abertoEm, variacao, calcularPainel, NOMES_MESES } from '../regras.js'

const ESCOLA = 'ETEC Doutora Ruth Cardoso'                    // virá da TB_ESCOLA quando o PHP entrar
const USUARIO = 'Bibliotecária'                               // virá do usuário logado
const MAX_ACOES = 6                                           // máximo de linhas na tabela de ações (garante que o relatório caiba em 1 página)

const route = useRoute()
const router = useRouter()
const hoje = hojeISO()
const mesAtual = chaveMes(hoje)

// mês do relatório: vem da URL (?mes=2026-10). Se for inválido ou futuro, usa o mês atual.
const mesSel = computed(() => {
  const m = String(route.query.mes || '')
  return /^\d{4}-\d{2}$/.test(m) && m <= mesAtual ? m : mesAtual
})

const todos = computed(() => [...emprestimos.value, ...historico.value])
const totalExemplares = computed(() => livros.value.reduce((soma, l) => soma + l.exemplares, 0))
const painel = computed(() => calcularPainel(todos.value, totalExemplares.value, mesSel.value, hoje, alunos.value))
const ehAtual = computed(() => painel.value.ehAtual)

// ===== TEXTOS AUXILIARES =====
const nomeMes = (chave) => NOMES_MESES[Number(chave.slice(5, 7)) - 1]            // "2026-10" -> "Outubro"
const mesAno = (chave) => `${nomeMes(chave)}/${chave.slice(0, 4)}`               // "2026-10" -> "Outubro/2026"
const diaMes = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`                 // "2026-10-20" -> "20/10"
const plural = (n, um, varios) => (n === 1 ? um : varios)                        // 1 empréstimo / 2 empréstimos
const fmtNum = (n) => Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function fmtVar(atual, anterior) {                                               // "+8,3%" | "−5,0%" | "—"
  const v = variacao(atual, anterior)
  if (v === null) return '—'
  if (v === 0) return '0,0%'
  return `${v > 0 ? '+' : '−'}${fmtNum(v)}%`
}

// ===== PERÍODOS =====
const periodoTexto = computed(() => {
  const p = painel.value
  const fim = formatarData(p.dataRef)
  return `${formatarData(mesSel.value + '-01')} a ${fim} (${ehAtual.value ? 'mês em andamento' : 'mês fechado'})`
})
const comparadoTexto = computed(() => {
  const p = painel.value
  return `${formatarData(p.mesAnt + '-01')} a ${formatarData(p.dataRefAnt)}`
})
const geradoEm = computed(() => {
  const agora = new Date()
  const data = agora.toLocaleDateString('pt-BR')
  const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${data} às ${hora}`
})
const colAtual = computed(() => `${nomeMes(mesSel.value)} (01 a ${diaMes(painel.value.dataRef)})`)
const colAnterior = computed(() => `${nomeMes(painel.value.mesAnt)} (01 a ${diaMes(painel.value.dataRefAnt)})`)

// ===== AÇÕES NECESSÁRIAS: atrasados + (só no mês atual) vencendo nos próximos 7 dias =====
const acoes = computed(() => {
  const ref = painel.value.dataRef
  const lista = []
  todos.value.forEach(e => {
    const aluno = alunos.value.find(a => a.rm === e.rm) || {}
    const base = { aluno: `${e.aluno} (${aluno.curso || '—'})`, livro: e.livro, previsao: formatarData(e.previsao), email: aluno.email || '—' }
    if (statusEm(e, ref) === 'Atrasado') {                                       // passou do prazo
      const n = diasEntre(e.previsao, ref)
      lista.push({ ...base, atrasado: true, dias: n, peso: 1000 + n, situacao: `Atrasado · ${n} ${plural(n, 'dia', 'dias')}` })
    } else if (ehAtual.value && abertoEm(e, hoje)) {                             // ainda no prazo: vence em até 7 dias?
      const faltam = diasEntre(hoje, e.previsao)
      if (faltam >= 0 && faltam <= 7) {
        const texto = faltam === 0 ? 'Vence hoje' : faltam === 1 ? 'Vence amanhã' : `Vence em ${faltam} dias`
        lista.push({ ...base, atrasado: false, dias: faltam, peso: 100 - faltam, situacao: texto })
      }
    }
  })
  return lista.sort((a, b) => b.peso - a.peso)                                   // mais críticos primeiro
})
const acoesVisiveis = computed(() => acoes.value.slice(0, MAX_ACOES))
const acoesOcultas = computed(() => Math.max(0, acoes.value.length - MAX_ACOES))
const qtdAtrasados = computed(() => acoes.value.filter(a => a.atrasado).length)
const qtdVencendo = computed(() => acoes.value.filter(a => !a.atrasado).length)
const maiorAtraso = computed(() => Math.max(0, ...acoes.value.filter(a => a.atrasado).map(a => a.dias)))

const livrosEsgotados = computed(() => livros.value.filter(l => l.exemplares > 0 && l.disponiveis === 0))

// ===== INDICADORES =====
const linhas = computed(() => {
  const { atual, anterior } = painel.value
  const sufixo = ehAtual.value ? 'no período' : 'no mês'
  return [
    { nome: `Retirados ${sufixo}`, a: atual.retirados, b: anterior.retirados },
    { nome: `Devolvidos ${sufixo}`, a: atual.devolvidos, b: anterior.devolvidos },
    { nome: 'Total de exemplares no acervo', a: atual.total, b: anterior.total },
    { nome: 'Disponíveis', a: atual.disponiveis, b: anterior.disponiveis },
    { nome: 'Emprestados no prazo', a: atual.noPrazo, b: anterior.noPrazo },
    { nome: 'Em atraso', a: atual.atrasados, b: anterior.atrasados },
  ]
})
const notaPosicao = computed(() => `Posição do acervo em ${formatarData(painel.value.dataRef)} e em ${formatarData(painel.value.dataRefAnt)}.`)

// ===== RESUMO (texto gerado por regras) =====
function compara(atual, anterior, mesmoPeriodo) {                                // "8,3% a mais que no mesmo período de setembro"
  const v = variacao(atual, anterior)
  const mesAnt = nomeMes(painel.value.mesAnt).toLowerCase()
  const ref = mesmoPeriodo ? `no mesmo período de ${mesAnt}` : `em ${mesAnt}`
  if (v === null) return `sem base de comparação com ${mesAnt}`
  if (v === 0) return `o mesmo número ${ref}`
  return `${fmtNum(v)}% ${v > 0 ? 'a mais' : 'a menos'} que ${ref}`
}

const resumo = computed(() => {
  const { atual, anterior, topLivros } = painel.value
  const mes = nomeMes(mesSel.value).toLowerCase()
  const ate = ehAtual.value ? ` (até ${diaMes(painel.value.dataRef)})` : ''
  const pctDisp = atual.total > 0 ? Math.round((atual.disponiveis / atual.total) * 100) : 0
  let t = `Em ${mes}${ate} foram realizados ${atual.retirados} ${plural(atual.retirados, 'empréstimo', 'empréstimos')}, ${compara(atual.retirados, anterior.retirados, ehAtual.value)}, e ${atual.devolvidos} ${plural(atual.devolvidos, 'devolução', 'devoluções')}. `
  t += `O acervo possui ${atual.total} exemplares, dos quais ${atual.disponiveis} (${pctDisp}%) ${plural(atual.disponiveis, 'está disponível', 'estão disponíveis')}. `
  if (atual.atrasados === 0) t += 'Não há empréstimos em atraso. '
  else {
    const v = variacao(atual.atrasados, anterior.atrasados)
    const cmp = v === null ? '' : v === 0 ? `, igual a ${nomeMes(painel.value.mesAnt).toLowerCase()}` : `, ${fmtNum(v)}% ${v > 0 ? 'a mais' : 'a menos'} que em ${nomeMes(painel.value.mesAnt).toLowerCase()}`
    t += `Há ${atual.atrasados} ${plural(atual.atrasados, 'empréstimo', 'empréstimos')} em atraso${cmp}. `
  }
  if (topLivros.length > 0) t += `O livro mais emprestado do mês é '${topLivros[0].titulo}' (${topLivros[0].qtd} ${plural(topLivros[0].qtd, 'empréstimo', 'empréstimos')}).`
  else t += 'Nenhum empréstimo foi registrado no período.'
  return t
})

const atencao = computed(() => {
  const lista = []
  if (qtdAtrasados.value > 0) lista.push(`${qtdAtrasados.value} ${plural(qtdAtrasados.value, 'empréstimo', 'empréstimos')} em atraso; o mais antigo há ${maiorAtraso.value} ${plural(maiorAtraso.value, 'dia', 'dias')}.`)
  if (ehAtual.value && qtdVencendo.value > 0) lista.push(`${qtdVencendo.value} ${plural(qtdVencendo.value, 'empréstimo vence', 'empréstimos vencem')} nos próximos 7 dias.`)
  if (ehAtual.value && livrosEsgotados.value.length === 1) lista.push(`'${livrosEsgotados.value[0].titulo}' está sem exemplares disponíveis.`)
  if (ehAtual.value && livrosEsgotados.value.length > 1) lista.push(`${livrosEsgotados.value.length} livros estão sem exemplares disponíveis: ${livrosEsgotados.value.map(l => `'${l.titulo}'`).join(', ')}.`)
  const vDev = variacao(painel.value.atual.devolvidos, painel.value.anterior.devolvidos)
  if (vDev !== null && vDev < 0) lista.push(`As devoluções estão ${fmtNum(vDev)}% abaixo ${ehAtual.value ? 'do mesmo período de' : 'de'} ${nomeMes(painel.value.mesAnt).toLowerCase()}.`)
  return lista.slice(0, 4)                                                       // no máximo 4 pontos
})

const destaquesLivros = computed(() => painel.value.topLivros.slice(0, 3).map(l => `${l.titulo} (${l.qtd})`).join(' · '))
const destaquesEsgotados = computed(() => livrosEsgotados.value.map(l => `${l.titulo} (0 de ${l.exemplares})`).join(' · '))

// ===== AÇÕES DA TELA =====
const voltar = () => router.push('/dashboard')                                   // volta ao dashboard
const imprimir = () => window.print()                                            // abre a janela de impressão / Salvar como PDF
</script>

<template>
  <div class="tela">
    <!-- barra que NÃO sai no PDF -->
    <div class="barra-tela">
      <button class="bt" @click="voltar">← Voltar ao Dashboard</button>
      <span class="dica">Na janela que abrir, escolha <b>Salvar como PDF</b> como destino.</span>
      <button class="bt primario" @click="imprimir">Salvar como PDF</button>
    </div>

    <!-- A FOLHA A4 -->
    <div class="folha">
      <header>
        <h1>Relatório Mensal da Biblioteca</h1>
        <p class="escola">{{ ESCOLA }}</p>
        <p class="info">Período: {{ periodoTexto }} · Comparado com: {{ comparadoTexto }}</p>
        <p class="info">Gerado em {{ geradoEm }} · Gerado por: {{ USUARIO }}</p>
        <hr />
      </header>

      <h2>1. Resumo do mês</h2>
      <p class="texto">{{ resumo }}</p>
      <p class="sub">Pontos de atenção</p>
      <ul class="pontos">
        <li v-for="(a, i) in atencao" :key="i">{{ a }}</li>
        <li v-if="atencao.length === 0">Nenhum ponto de atenção no período.</li>
      </ul>

      <h2>2. Indicadores</h2>
      <table>
        <thead>
          <tr>
            <th class="esq">Indicador</th>
            <th class="dir">{{ colAtual }}</th>
            <th class="dir">{{ colAnterior }}</th>
            <th class="dir">Variação</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in linhas" :key="l.nome">
            <td class="esq">{{ l.nome }}</td>
            <td class="dir">{{ l.a }}</td>
            <td class="dir">{{ l.b }}</td>
            <td class="dir">{{ fmtVar(l.a, l.b) }}</td>
          </tr>
        </tbody>
      </table>
      <p class="nota">{{ notaPosicao }}</p>

      <h2>3. Empréstimos nos últimos 6 meses</h2>
      <table class="serie">
        <thead>
          <tr><th v-for="s in painel.serie" :key="s.chave" class="dir">{{ s.rotulo }}</th></tr>
        </thead>
        <tbody>
          <tr>
            <td v-for="(s, i) in painel.serie" :key="s.chave" class="dir">
              {{ s.valor }}<span v-if="ehAtual && i === painel.serie.length - 1" class="parcial"> (parcial)</span>
            </td>
          </tr>
        </tbody>
      </table>

      <h2>{{ ehAtual ? '4. Ações necessárias' : '4. Empréstimos em atraso no fim do mês' }}</h2>
      <table class="acoes">
        <colgroup>                                                   <!-- largura de cada coluna (soma 100%) -->
          <col style="width: 16%" /><col style="width: 27%" /><col style="width: 21%" /><col style="width: 12%" /><col style="width: 24%" />
        </colgroup>
        <thead>
          <tr>
            <th class="esq">Situação</th>
            <th class="esq">Aluno (turma)</th>
            <th class="esq">Livro</th>
            <th class="esq">Devolução prevista</th>
            <th class="esq">E-mail do aluno</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(a, i) in acoesVisiveis" :key="i">
            <td class="esq" :class="{ forte: a.atrasado }" :title="a.situacao">{{ a.situacao }}</td>
            <td class="esq" :title="a.aluno">{{ a.aluno }}</td>
            <td class="esq" :title="a.livro">{{ a.livro }}</td>
            <td class="esq">{{ a.previsao }}</td>
            <td class="esq" :title="a.email">{{ a.email }}</td>
          </tr>
          <tr v-if="acoesOcultas > 0"><td colspan="5" class="esq nota-linha">+ {{ acoesOcultas }} {{ plural(acoesOcultas, 'outro', 'outros') }} (veja a tela de Empréstimos)</td></tr>
          <tr v-if="acoes.length === 0"><td colspan="5" class="esq nota-linha">{{ ehAtual ? 'Nenhuma ação necessária no período.' : 'Nenhum empréstimo em atraso no fim do mês.' }}</td></tr>
        </tbody>
      </table>

      <h2>5. Destaques do mês</h2>
      <p class="texto">Mais emprestados: {{ destaquesLivros || 'nenhum empréstimo no período' }}</p>
      <p v-if="ehAtual" class="texto">Sem exemplares disponíveis: {{ destaquesEsgotados || 'nenhum livro esgotado' }}</p>

      <h2>6. Fechamento</h2>
      <p class="texto">Bibliotecária responsável: ______________________________ &nbsp; Data: ___/___/______</p>

      <footer class="rodape">
        <span>ArquiBooks · Relatório Mensal · {{ mesAno(mesSel) }}</span>
        <span>Página 1 de 1</span>
      </footer>
    </div>
  </div>
</template>

<!-- regras de impressão (globais): sem margem de página = o navegador esconde data/URL do cabeçalho -->
<style>
@page { size: A4 portrait; margin: 0; }
@media print {
  html, body { background: #fff !important; }
}
</style>

<style scoped>
.tela { background: #e9ecef; min-height: 100vh; padding: 1rem 0 2rem; font-family: Inter, 'Segoe UI', Helvetica, Arial, sans-serif; }
.barra-tela { width: 210mm; max-width: 96vw; margin: 0 auto 0.8rem; display: flex; align-items: center; justify-content: space-between; gap: 0.8rem; flex-wrap: wrap; font-size: 0.8rem; color: #495057; }
.bt { height: 38px; padding: 0 1rem; border-radius: 6px; border: 1px solid #d0d5dd; background: #fff; font-weight: 600; cursor: pointer; }
.bt.primario { background: #4c6ef5; border-color: #4c6ef5; color: #fff; }

/* a folha A4 */
.folha { position: relative; width: 210mm; min-height: 297mm; margin: 0 auto; padding: 15mm; box-sizing: border-box; background: #fff; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15); color: #111; font-size: 9pt; line-height: 1.35; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
h1 { font-size: 18pt; margin: 0 0 1mm; }
.escola { font-size: 10pt; margin: 0 0 1.5mm; }
.info { font-size: 7.5pt; color: #6c757d; margin: 0; }
hr { border: 0; border-top: 0.5pt solid #adb5bd; margin: 3mm 0 0; }
h2 { font-size: 10pt; color: #1f3a6e; text-transform: uppercase; margin: 4.5mm 0 1.5mm; }
.texto { margin: 0 0 1mm; }
.sub { font-weight: 700; margin: 2mm 0 0.5mm; }
.pontos { margin: 0; padding-left: 4mm; }
.nota { font-size: 7pt; color: #6c757d; margin: 0.8mm 0 0; }
table { width: 100%; border-collapse: collapse; font-size: 8pt; page-break-inside: avoid; }
.serie { table-layout: fixed; }                                   /* as 6 colunas dos meses ficam do mesmo tamanho */
.acoes { table-layout: fixed; }                                   /* colunas com largura fixa... */
.acoes td { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } /* ...e texto longo é cortado com "…": cada linha ocupa 1 linha só */
th { background: #e9ecef; font-weight: 700; padding: 1.5mm 2mm; border: 0.5pt solid #ced4da; vertical-align: bottom; }
td { padding: 1.2mm 2mm; border: 0.5pt solid #ced4da; }
.esq { text-align: left; }
.dir { text-align: right; }
.forte { font-weight: 700; }
.parcial { font-size: 7pt; color: #6c757d; }
.nota-linha { color: #6c757d; font-style: italic; }
.rodape { position: absolute; left: 15mm; right: 15mm; bottom: 10mm; display: flex; justify-content: space-between; font-size: 7.5pt; color: #6c757d; border-top: 0.5pt solid #ced4da; padding-top: 2mm; }

@media print {
  .tela { background: #fff; padding: 0; min-height: 0; }
  .barra-tela { display: none; }                                  /* o botão não sai no PDF */
  .folha { box-shadow: none; margin: 0; height: 296mm; min-height: 0; }
}
</style>
