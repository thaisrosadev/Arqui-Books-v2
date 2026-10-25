<script setup>
import { ref, computed } from 'vue'                          // ref = caixinha; computed = cálculo automático
import { useRouter } from 'vue-router'                       // para abrir a tela do relatório
import Sidebar from '../components/Sidebar.vue'              // menu lateral + barra superior
import { livros, alunos, emprestimos, historico } from '../dados.js' // dados compartilhados
import { hojeISO, chaveMes, somaMeses, nomeDoMes, formatarData, calcularPainel, variacao } from '../regras.js'

const router = useRouter()                                   // controle de navegação
const hoje = hojeISO()                                       // "2026-10-21"
const mesAtual = chaveMes(hoje)                              // "2026-10"
const mesSel = ref(mesAtual)                                 // mês escolhido: SEMPRE abre no mês atual
const girando = ref(false)                                   // ícone do "Atualizar" girando?
const lembretes = ref([])                                    // atrasos que já tiveram lembrete (simulado)

function horaAgora() {                                       // "14:32"
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
const atualizadoEm = ref(horaAgora())                        // texto "Atualizado às ..."

// ===== DADOS =====
const todos = computed(() => [...emprestimos.value, ...historico.value]) // abertos + devolvidos

const totalExemplares = computed(() =>                       // soma dos exemplares de todos os livros
  livros.value.reduce((soma, l) => soma + l.exemplares, 0)
)

const mesMin = computed(() =>                                // mês mais antigo com dados (limite do botão "voltar")
  todos.value.reduce((menor, e) => (chaveMes(e.emprestimo) < menor ? chaveMes(e.emprestimo) : menor), mesAtual)
)

const painel = computed(() =>                                // TUDO que a tela mostra, recalculado quando o mês muda
  calcularPainel(todos.value, totalExemplares.value, mesSel.value, hoje, alunos.value)
)

const podeVoltar = computed(() => mesSel.value > mesMin.value)   // texto "2026-09" > "2026-05" funciona em ordem alfabética
const podeAvancar = computed(() => mesSel.value < mesAtual)      // nunca avança para o futuro

// ===== TEXTOS =====
const subtituloAcervo = computed(() =>                       // "Posição de hoje, 21/10/2026" ou "Posição em 30/09/2026"
  painel.value.ehAtual
    ? `Posição de hoje, ${formatarData(painel.value.dataRef)}`
    : `Posição em ${formatarData(painel.value.dataRef)}`
)

// ===== CARDS =====
// bom: 'subir' = aumentar é bom (verde); 'descer' = diminuir é bom; null = neutro (cinza)
const cardsAcervo = computed(() => {
  const { atual, anterior } = painel.value
  return [
    { rotulo: 'Total de Livros', valor: atual.total, cor: 'blue', variacao: null, semComparacao: true, bom: null },
    { rotulo: 'Disponíveis', valor: atual.disponiveis, cor: 'green', variacao: variacao(atual.disponiveis, anterior.disponiveis), bom: 'subir' },
    { rotulo: 'Emprestados', valor: atual.emprestados, cor: 'orange', variacao: variacao(atual.emprestados, anterior.emprestados), bom: null },
  ]
})

const cardsMovimento = computed(() => {
  const { atual, anterior } = painel.value
  return [
    { rotulo: 'Retirados no mês', valor: atual.retirados, cor: 'purple', variacao: variacao(atual.retirados, anterior.retirados), bom: null },
    { rotulo: 'Devolvidos no mês', valor: atual.devolvidos, cor: 'green', variacao: variacao(atual.devolvidos, anterior.devolvidos), bom: 'subir' },
    { rotulo: 'Em atraso', valor: atual.atrasados, cor: 'red', variacao: variacao(atual.atrasados, anterior.atrasados), bom: 'descer' },
  ]
})

function tomDe(c) {                                          // cor da variação: bom (verde), ruim (vermelho), neutro (cinza)
  if (c.variacao === null || c.variacao === 0 || c.bom === null) return 'neutro'
  const subiu = c.variacao > 0
  const bom = (c.bom === 'subir' && subiu) || (c.bom === 'descer' && !subiu)
  return bom ? 'bom' : 'ruim'
}

function textoVariacao(c) {                                  // "▲ 3,4%"
  if (c.semComparacao) return ''
  if (c.variacao === null) return '—'                        // mês anterior era 0: não dá para calcular %
  if (c.variacao === 0) return '= sem variação'
  const seta = c.variacao > 0 ? '▲' : '▼'
  const numero = Math.abs(c.variacao).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return `${seta} ${numero}%`
}

// ===== GRÁFICO DE BARRAS =====
const maxSerie = computed(() => Math.max(1, ...painel.value.serie.map(s => s.valor)))

function alturaBarra(valor) {                                // altura em pixels (área útil = 150px)
  return Math.max(3, Math.round((valor / maxSerie.value) * 150)) + 'px'
}

// ===== GRÁFICO DE ROSCA =====
const fatias = computed(() => {
  const p = painel.value.atual
  const itens = [
    { nome: 'Disponíveis', valor: p.disponiveis, cor: '#2f9e44' },
    { nome: 'Emprestados no prazo', valor: p.noPrazo, cor: '#f76707' },
    { nome: 'Em atraso', valor: p.atrasados, cor: '#fa5252' },
  ]
  const total = itens.reduce((soma, i) => soma + i.valor, 0)
  if (total === 0) return { total: 0, itens: itens.map(i => ({ ...i, pct: 0, len: 0, off: 0 })) }

  const MIN = 0.02                                           // fatia não vazia nunca fica menor que 2% (para aparecer)
  const frac = itens.map(i => i.valor / total)
  let falta = 0
  for (let k = 0; k < frac.length; k++) {
    if (frac[k] > 0 && frac[k] < MIN) { falta += MIN - frac[k]; frac[k] = MIN } // aumenta a fatia pequena...
  }
  frac[frac.indexOf(Math.max(...frac))] -= falta             // ...e tira o mesmo tanto da maior

  let inicio = 0                                             // onde cada fatia começa (em %)
  const saida = itens.map((i, k) => {
    const len = frac[k] * 100                                // tamanho do arco
    const item = { ...i, pct: (i.valor / total) * 100, len, off: 25 - inicio } // 25 = começa no topo do círculo
    inicio += len
    return item
  })
  return { total, itens: saida }
})

const fatiasVisiveis = computed(() => fatias.value.itens.filter(f => f.len > 0)) // só desenha arcos que existem

function fmtPct(p) {                                         // 66,9 -> "67" ; 0,4 -> "<1"
  if (p > 0 && p < 1) return '<1'
  return Math.round(p)
}

// ===== AÇÕES DOS BOTÕES =====
function mudarMes(n) {                                       // setas ‹ ›
  mesSel.value = somaMeses(mesSel.value, n)
}

function atualizar() {                                       // botão "Atualizar" (por enquanto só simula; com PHP vai buscar no banco)
  girando.value = true
  setTimeout(() => {
    girando.value = false
    atualizadoEm.value = horaAgora()
  }, 800)
}

function exportarPdf() {                                     // botão "Exportar PDF": abre o relatório do MÊS ESCOLHIDO
  router.push({ path: '/relatorio', query: { mes: mesSel.value } })
}

function enviarLembrete(a) {                                 // botão "Lembrar" (simulado: ainda não envia e-mail de verdade)
  if (!lembretes.value.includes(a.chave)) lembretes.value.push(a.chave)
}
</script>

<template>
  <Sidebar page-title="Dashboard" active="dashboard">
    <!-- BARRA DE FERRAMENTAS -->
    <div class="barra-ferramentas">
      <div class="seletor-mes">
        <button class="seta" :disabled="!podeVoltar" @click="mudarMes(-1)" aria-label="Mês anterior">
          <i class="bi bi-chevron-left"></i>
        </button>
        <span class="mes-nome">{{ nomeDoMes(mesSel) }}</span>
        <button class="seta" :disabled="!podeAvancar" @click="mudarMes(1)" aria-label="Próximo mês">
          <i class="bi bi-chevron-right"></i>
        </button>
      </div>

      <div class="acoes">
        <span class="atualizado">Atualizado às {{ atualizadoEm }}</span>
        <button class="btn-barra secundario" @click="exportarPdf">
          <i class="bi bi-file-earmark-pdf"></i> Exportar PDF
        </button>
        <button class="btn-barra primario" @click="atualizar">
          <i class="bi bi-arrow-clockwise" :class="{ girar: girando }"></i> Atualizar
        </button>
      </div>
    </div>

    <!-- CARDS: grupo 1 -->
    <p class="grupo-titulo">Acervo · {{ subtituloAcervo }}</p>
    <div class="grupo-cards">
      <div v-for="c in cardsAcervo" :key="c.rotulo" class="stat-card" :class="c.cor">
        <span class="stat-label">{{ c.rotulo }}</span>
        <div class="stat-value">{{ c.valor }}</div>
        <div class="stat-var" :class="tomDe(c)">{{ textoVariacao(c) }}</div>
      </div>
    </div>

    <!-- CARDS: grupo 2 -->
    <p class="grupo-titulo">Movimento de {{ nomeDoMes(mesSel) }}</p>
    <div class="grupo-cards">
      <div v-for="c in cardsMovimento" :key="c.rotulo" class="stat-card" :class="c.cor">
        <span class="stat-label">{{ c.rotulo }}</span>
        <div class="stat-value">{{ c.valor }}</div>
        <div class="stat-var" :class="tomDe(c)">{{ textoVariacao(c) }}</div>
      </div>
    </div>
    <p class="nota">
      Variações comparadas com {{ painel.ehAtual ? 'o mesmo período do mês anterior' : 'o mês anterior' }}.
      Verde = bom, vermelho = ruim, cinza = neutro.
    </p>

    <!-- GRÁFICOS -->
    <div class="charts-grid">
      <div class="chart-card">
        <h3><i class="bi bi-bar-chart-line-fill"></i> Empréstimos por Mês</h3>
        <div class="barras">
          <button
            v-for="s in painel.serie" :key="s.chave"
            class="barra-col" :class="{ sel: s.chave === mesSel }"
            :disabled="s.chave < mesMin"
            :title="`${nomeDoMes(s.chave)}: ${s.valor} empréstimos`"
            @click="mesSel = s.chave"
          >
            <span class="barra-valor">{{ s.valor }}</span>
            <div class="barra" :style="{ height: alturaBarra(s.valor) }"></div>
            <span class="barra-rotulo">{{ s.rotulo }}</span>
          </button>
        </div>
      </div>

      <div class="chart-card">
        <h3><i class="bi bi-record-circle-fill"></i> Status do Acervo</h3>
        <p class="sub">{{ subtituloAcervo }} · em exemplares</p>
        <div class="donut-wrap">
          <svg viewBox="0 0 42 42" class="donut-svg">
            <circle cx="21" cy="21" r="15.9155" fill="none" stroke="#eef0f3" stroke-width="6" />
            <circle
              v-for="f in fatiasVisiveis" :key="f.nome"
              cx="21" cy="21" r="15.9155" fill="none" stroke-width="6"
              :stroke="f.cor" :stroke-dasharray="`${f.len} ${100 - f.len}`" :stroke-dashoffset="f.off"
            />
          </svg>
          <div class="donut-centro">
            <strong>{{ fatias.total }}</strong>
            <small>exemplares</small>
          </div>
        </div>
        <ul class="legenda">
          <li v-for="f in fatias.itens" :key="f.nome">
            <span class="quadro" :style="{ background: f.cor }"></span>
            <span class="leg-nome">{{ f.nome }}</span>
            <span class="leg-valor">{{ f.valor }} ({{ fmtPct(f.pct) }}%)</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- RANKINGS -->
    <div class="ranking-grid">
      <div class="chart-card">
        <h3><i class="bi bi-book-half"></i> Livros mais emprestados do mês</h3>
        <p v-if="painel.topLivros.length === 0" class="vazio">Nenhum empréstimo neste mês.</p>
        <ul v-else class="rank-lista">
          <li v-for="l in painel.topLivros" :key="l.titulo">
            <span class="rank-nome">{{ l.titulo }}</span>
            <div class="rank-trilho">
              <div class="rank-barra" :style="{ width: (l.qtd / painel.topLivros[0].qtd) * 100 + '%' }"></div>
            </div>
            <span class="rank-qtd">{{ l.qtd }}</span>
          </li>
        </ul>
      </div>

      <div class="chart-card">
        <h3><i class="bi bi-people-fill"></i> Alunos com atrasos</h3>
        <p class="sub">{{ subtituloAcervo }}</p>
        <p v-if="painel.atrasados.length === 0" class="vazio">Nenhum empréstimo em atraso.</p>
        <ul v-else class="atraso-lista">
          <li v-for="a in painel.atrasados" :key="a.chave">
            <span class="atraso-aluno">
              <strong>{{ a.aluno }}</strong>
              <small>{{ a.turma }} · {{ a.livro }}</small>
            </span>
            <span class="atraso-dias">{{ a.dias }} {{ a.dias === 1 ? 'dia' : 'dias' }}</span>
            <button
              v-if="painel.ehAtual" class="btn-lembrar"
              :class="{ enviado: lembretes.includes(a.chave) }"
              :disabled="lembretes.includes(a.chave)"
              @click="enviarLembrete(a)"
            >
              {{ lembretes.includes(a.chave) ? 'Enviado ✓' : 'Lembrar' }}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </Sidebar>
</template>

<style scoped>
/* ----- barra de ferramentas ----- */
.barra-ferramentas { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.25rem; }
.seletor-mes { display: flex; align-items: center; background: #fff; border: 1px solid #d0d5dd; border-radius: 6px; height: 40px; }
.seletor-mes .mes-nome { min-width: 140px; text-align: center; font-weight: 600; font-size: 0.9rem; }
.seta { width: 38px; height: 100%; border: none; background: none; cursor: pointer; color: #1f2430; }
.seta:disabled { color: #ced4da; cursor: not-allowed; }       /* seta apagada quando não dá para ir */
.acoes { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
.atualizado { font-size: 0.75rem; color: #868e96; }
.btn-barra { height: 40px; padding: 0 1rem; border-radius: 6px; font-size: 0.9rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.45rem; }
.btn-barra.secundario { background: #fff; border: 1px solid #d0d5dd; color: #1f2430; }
.btn-barra.primario { background: #4c6ef5; border: 1px solid #4c6ef5; color: #fff; }
.girar { display: inline-block; animation: girar 0.8s linear infinite; }
@keyframes girar { to { transform: rotate(360deg); } }

/* ----- cards ----- */
.grupo-titulo { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #868e96; margin: 0 0 0.5rem; }
.grupo-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; margin-bottom: 1.25rem; }
.stat-var { font-size: 0.8rem; font-weight: 600; min-height: 1.2em; }
.stat-var.bom { color: #2f9e44; }
.stat-var.ruim { color: #fa5252; }
.stat-var.neutro { color: #868e96; }
.stat-card.red { border-color: #fa5252; }
.stat-card.red .stat-label { background: #fa5252; }
.nota { font-size: 0.72rem; color: #868e96; margin: -0.5rem 0 1.5rem; }
@media (max-width: 700px) { .grupo-cards { grid-template-columns: 1fr; } }

/* ----- gráfico de barras ----- */
.barras { display: flex; align-items: flex-end; gap: 0.6rem; height: 215px; border-top: 1px solid #e5e7eb; padding-top: 0.75rem; }
.barra-col { flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 4px; background: none; border: none; cursor: pointer; padding: 0; }
.barra-col:disabled { opacity: 0.35; cursor: not-allowed; }
.barra { width: 100%; max-width: 56px; background: #c4b5f7; border-radius: 6px 6px 0 0; transition: height 0.3s; }
.barra-col.sel .barra { background: #7048e8; }               /* mês selecionado em roxo forte */
.barra-col:not(:disabled):hover .barra { background: #9b82f0; }
.barra-col.sel:hover .barra { background: #7048e8; }
.barra-valor { font-size: 0.78rem; font-weight: 700; color: #1f2430; }
.barra-rotulo { font-size: 0.78rem; color: #868e96; }
.barra-col.sel .barra-rotulo { color: #7048e8; font-weight: 700; }

/* ----- rosca ----- */
.sub { font-size: 0.75rem; color: #868e96; margin: -0.6rem 0 0.8rem; }
.donut-wrap { position: relative; width: 170px; height: 170px; margin: 0 auto 1rem; }
.donut-svg { width: 100%; height: 100%; }
.donut-centro { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.donut-centro strong { font-size: 1.6rem; line-height: 1; }
.donut-centro small { font-size: 0.7rem; color: #868e96; }
.legenda { list-style: none; margin: 0; padding: 0; }
.legenda li { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; padding: 0.3rem 0; border-bottom: 1px solid #f1f3f5; }
.legenda li:last-child { border-bottom: none; }
.quadro { width: 11px; height: 11px; border-radius: 3px; flex-shrink: 0; }
.leg-nome { flex: 1; }
.leg-valor { font-weight: 700; }

/* ----- rankings ----- */
.ranking-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.5rem; }
@media (max-width: 900px) { .ranking-grid { grid-template-columns: 1fr; } }
.vazio { color: #868e96; font-size: 0.85rem; margin: 0.5rem 0 0; }
.rank-lista, .atraso-lista { list-style: none; margin: 0; padding: 0; }
.rank-lista li { display: flex; align-items: center; gap: 0.7rem; padding: 0.35rem 0; font-size: 0.82rem; }
.rank-nome { width: 130px; flex-shrink: 0; }
.rank-trilho { flex: 1; height: 8px; background: #eef0f3; border-radius: 4px; overflow: hidden; }
.rank-barra { height: 100%; background: #4c6ef5; border-radius: 4px; }
.rank-qtd { width: 22px; text-align: right; font-weight: 700; }
.atraso-lista li { display: flex; align-items: center; gap: 0.7rem; padding: 0.5rem 0; border-bottom: 1px solid #f1f3f5; font-size: 0.82rem; }
.atraso-lista li:last-child { border-bottom: none; }
.atraso-aluno { flex: 1; display: flex; flex-direction: column; }
.atraso-aluno small { color: #868e96; }
.atraso-dias { color: #fa5252; font-weight: 700; white-space: nowrap; }
.btn-lembrar { border: 1px solid #4c6ef5; color: #4c6ef5; background: #fff; border-radius: 6px; padding: 0.2rem 0.6rem; font-size: 0.75rem; font-weight: 600; cursor: pointer; }
.btn-lembrar.enviado { border-color: #2f9e44; color: #2f9e44; cursor: default; }
</style>
