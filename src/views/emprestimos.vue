<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from '../components/Sidebar.vue'
import ModalForm from '../components/ModalForm.vue'
import Janela from '../components/Janela.vue'
import { livros, alunos, emprestimos, historico, pendencias, recarregar } from '../dados.js'
import { apiPost } from '../api.js'
import { hojeISO, somaDias, formatarData, PRAZO_DIAS } from '../regras.js'

const route = useRoute()
const hoje = hojeISO()

// aba e filtro podem vir da URL (ex.: /emprestimos?aba=pendencias ou ?filtro=Atrasado) — os cards do dashboard vão usar isso
const aba = ref(['abertos', 'encerrados', 'pendencias'].includes(route.query.aba) ? route.query.aba : 'abertos')
const filtro = ref(['Atrasado', 'Vencendo', 'No prazo'].includes(route.query.filtro) ? route.query.filtro : '')
const busca = ref('')
const menuAberto = ref(null)                       // id do empréstimo cujo menu ⋯ está aberto

// ---------- contagens ----------
const qtd = computed(() => ({
  todos: emprestimos.value.length,
  Atrasado: emprestimos.value.filter(e => e.situacao === 'Atrasado').length,
  Vencendo: emprestimos.value.filter(e => e.situacao === 'Vencendo').length,
  'No prazo': emprestimos.value.filter(e => e.situacao === 'No prazo').length,
}))

// ---------- listas ----------
function bate(e) {
  const t = busca.value.toLowerCase()
  return !t || e.aluno.toLowerCase().includes(t) || e.livro.toLowerCase().includes(t) || e.rm.includes(t)
}
const ORDEM = { Atrasado: 0, Vencendo: 1, 'No prazo': 2 }
const listaAbertos = computed(() =>                // atrasados primeiro (o mais atrasado no topo)
  emprestimos.value
    .filter(e => bate(e) && (!filtro.value || e.situacao === filtro.value))
    .sort((a, b) => ORDEM[a.situacao] - ORDEM[b.situacao] || b.diasAtraso - a.diasAtraso || a.diasRestantes - b.diasRestantes)
)
const listaEncerrados = computed(() => historico.value.filter(bate))
const listaPendencias = computed(() => pendencias.value.filter(bate))

// ---------- textos ----------
const BADGES = { 'No prazo': 'badge-no-prazo', Vencendo: 'badge-vencendo', Atrasado: 'badge-atrasado' }
function textoStatus(e) {
  if (e.situacao === 'Atrasado') return `Atrasado · ${e.diasAtraso} ${e.diasAtraso === 1 ? 'dia' : 'dias'}`
  if (e.diasRestantes === 0) return 'Vence hoje'
  if (e.diasRestantes === 1) return 'Vence amanhã'
  return `Faltam ${e.diasRestantes} dias`
}
const destaque = e => e.situacao === 'Atrasado' || e.situacao === 'Vencendo'   // botão cheio só nesses

function mudarFiltro(f) { filtro.value = filtro.value === f ? '' : f }

// ---------- menu ⋯ ----------
function alternarMenu(id) { menuAberto.value = menuAberto.value === id ? null : id }
const fecharMenu = () => { menuAberto.value = null }
onMounted(() => document.addEventListener('click', fecharMenu))
onUnmounted(() => document.removeEventListener('click', fecharMenu))

async function renovar(e) {
  menuAberto.value = null
  try {
    await apiPost('/api/emprestimos.php', { acao: 'renovar', id: e.id })
    await recarregar()
  } catch (err) {
    alert(err.message)
  }
}

// ---------- novo empréstimo ----------
const mostrarNovo = ref(false)
const novo = ref({ rm: '', isbn: '' })
const erroNovo = ref('')
const salvando = ref(false)
const alunosAtivos = computed(() => alunos.value.filter(a => a.status === 'Ativo'))
const livrosDisponiveis = computed(() => livros.value.filter(l => l.disponiveis > 0))
const previsaoTexto = computed(() => formatarData(somaDias(hoje, PRAZO_DIAS)))

function abrirNovo() { novo.value = { rm: '', isbn: '' }; erroNovo.value = ''; mostrarNovo.value = true }
async function salvarNovo() {
  if (salvando.value) return
  if (!novo.value.rm || !novo.value.isbn) { erroNovo.value = 'Escolha o aluno e o livro.'; return }
  salvando.value = true
  erroNovo.value = ''
  try {
    await apiPost('/api/emprestimos.php', { rm: novo.value.rm, isbn: novo.value.isbn })
    await recarregar()
    mostrarNovo.value = false
  } catch (err) {
    erroNovo.value = err.message
  } finally {
    salvando.value = false
  }
}

// ---------- janela de devolução ----------
const devolvendo = ref(null)                       // o empréstimo que está sendo devolvido
const desfecho = ref('Devolvido')                  // Devolvido | Avariado | Extraviado
const descricao = ref('')
const emprestavel = ref(false)
const erroDev = ref('')

function abrirDevolucao(e) {
  devolvendo.value = e
  desfecho.value = 'Devolvido'
  descricao.value = ''
  emprestavel.value = false
  erroDev.value = ''
}
async function confirmarDevolucao() {
  if (salvando.value) return
  if (desfecho.value === 'Avariado' && !descricao.value.trim()) { erroDev.value = 'Descreva o dano do livro.'; return }
  salvando.value = true
  erroDev.value = ''
  try {
    await apiPost('/api/devolucoes.php', {
      id: devolvendo.value.id, desfecho: desfecho.value,
      descricao: descricao.value, emprestavel: emprestavel.value,
    })
    await recarregar()
    devolvendo.value = null
  } catch (err) {
    erroDev.value = err.message
  } finally {
    salvando.value = false
  }
}

// ---------- pendências ----------
async function resolver(e) {
  if (!confirm(`Marcar a pendência de "${e.livro}" (${e.aluno}) como resolvida?`)) return
  try {
    await apiPost('/api/emprestimos.php', { acao: 'resolver_pendencia', id: e.id })
    await recarregar()
  } catch (err) {
    alert(err.message)
  }
}
</script>

<template>
  <Sidebar page-title="Empréstimos" active="emprestimos">
    <!-- ABAS -->
    <nav class="abas">
      <button :class="{ ativa: aba === 'abertos' }" @click="aba = 'abertos'">Em aberto ({{ qtd.todos }})</button>
      <button :class="{ ativa: aba === 'encerrados' }" @click="aba = 'encerrados'">Encerrados</button>
      <button :class="{ ativa: aba === 'pendencias' }" @click="aba = 'pendencias'">Pendências ({{ pendencias.length }})</button>
    </nav>

    <!-- BARRA ÚNICA: busca + chips + botão -->
    <div class="barra">
      <input v-model="busca" type="text" class="busca" placeholder="Pesquisar por aluno, livro ou RM..." />
      <div v-if="aba === 'abertos'" class="chips">
        <button class="chip todos" :class="{ sel: !filtro }" @click="filtro = ''">Todos {{ qtd.todos }}</button>
        <button class="chip atrasado" :class="{ sel: filtro === 'Atrasado' }" @click="mudarFiltro('Atrasado')">Atrasados {{ qtd.Atrasado }}</button>
        <button class="chip vencendo" :class="{ sel: filtro === 'Vencendo' }" @click="mudarFiltro('Vencendo')">Vencendo {{ qtd.Vencendo }}</button>
        <button class="chip prazo" :class="{ sel: filtro === 'No prazo' }" @click="mudarFiltro('No prazo')">No prazo {{ qtd['No prazo'] }}</button>
      </div>
      <button class="btn-novo" @click="abrirNovo">+ Novo Empréstimo</button>
    </div>

    <!-- EM ABERTO -->
    <div v-if="aba === 'abertos'" class="table-card">
      <table class="data-table">
        <thead>
          <tr><th>RM</th><th>Aluno</th><th>Livro</th><th>Retirada</th><th>Previsão</th><th>Status</th><th>Ação</th></tr>
        </thead>
        <tbody>
          <tr v-for="e in listaAbertos" :key="e.id">
            <td>{{ e.rm }}</td>
            <td class="nome" :class="{ forte: e.situacao === 'Atrasado' }">{{ e.aluno }}</td>
            <td>{{ e.livro }}</td>
            <td>{{ formatarData(e.emprestimo) }}</td>
            <td>{{ formatarData(e.previsao) }}</td>
            <td><span class="badge" :class="BADGES[e.situacao]">{{ textoStatus(e) }}</span></td>
            <td class="acoes">
              <button class="btn-dev" :class="destaque(e) ? 'cheio' : 'contorno'" @click="abrirDevolucao(e)">↩ Devolver</button>
              <div class="menu-wrap">
                <button class="btn-mais" aria-label="Mais ações" @click.stop="alternarMenu(e.id)">⋯</button>
                <div v-if="menuAberto === e.id" class="menu" @click.stop>
                  <button :disabled="e.situacao === 'Atrasado'" @click="renovar(e)">
                    Renovar{{ e.situacao === 'Atrasado' ? ' (em atraso)' : '' }}
                  </button>
                </div>
              </div>
            </td>
          </tr>
          <tr v-if="listaAbertos.length === 0"><td colspan="7" class="text-center">Nenhum empréstimo encontrado.</td></tr>
        </tbody>
      </table>
    </div>

    <!-- ENCERRADOS -->
    <div v-else-if="aba === 'encerrados'" class="table-card">
      <table class="data-table">
        <thead>
          <tr><th>RM</th><th>Aluno</th><th>Livro</th><th>Retirada</th><th>Devolução</th><th>Desfecho</th></tr>
        </thead>
        <tbody>
          <tr v-for="e in listaEncerrados" :key="e.id">
            <td>{{ e.rm }}</td><td>{{ e.aluno }}</td><td>{{ e.livro }}</td>
            <td>{{ formatarData(e.emprestimo) }}</td><td>{{ formatarData(e.devolucao) }}</td>
            <td><span class="pill" :class="'d-' + (e.desfecho || 'Devolvido')">{{ e.desfecho || 'Devolvido' }}</span></td>
          </tr>
          <tr v-if="listaEncerrados.length === 0"><td colspan="6" class="text-center">Nenhum empréstimo encerrado.</td></tr>
        </tbody>
      </table>
    </div>

    <!-- PENDÊNCIAS -->
    <div v-else class="table-card">
      <table class="data-table">
        <thead>
          <tr><th>RM</th><th>Aluno</th><th>Livro</th><th>Ocorrência</th><th>Descrição</th><th>Data</th><th>Ação</th></tr>
        </thead>
        <tbody>
          <tr v-for="e in listaPendencias" :key="e.id">
            <td>{{ e.rm }}</td><td>{{ e.aluno }}</td><td>{{ e.livro }}</td>
            <td><span class="pill" :class="'d-' + e.desfecho">{{ e.desfecho }}</span></td>
            <td>{{ e.ocorrencia || '—' }}</td>
            <td>{{ formatarData(e.devolucao) }}</td>
            <td><button class="btn-dev contorno" @click="resolver(e)">Resolver</button></td>
          </tr>
          <tr v-if="listaPendencias.length === 0"><td colspan="7" class="text-center">Nenhuma pendência aberta.</td></tr>
        </tbody>
      </table>
    </div>

    <!-- NOVO EMPRÉSTIMO -->
    <ModalForm v-if="mostrarNovo" titulo="Novo empréstimo" @fechar="mostrarNovo = false" @salvar="salvarNovo">
      <div v-if="erroNovo" class="alert alert-danger py-2">{{ erroNovo }}</div>
      <label class="form-label">Aluno</label>
      <select v-model="novo.rm" class="form-select mb-2" required>
        <option value="" disabled>Selecione o aluno...</option>
        <option v-for="a in alunosAtivos" :key="a.rm" :value="a.rm">{{ a.rm }} — {{ a.nome }}</option>
      </select>
      <label class="form-label">Livro (somente disponíveis)</label>
      <select v-model="novo.isbn" class="form-select mb-2" required>
        <option value="" disabled>Selecione o livro...</option>
        <option v-for="l in livrosDisponiveis" :key="l.isbn" :value="l.isbn">{{ l.titulo }} ({{ l.disponiveis }} disp.)</option>
      </select>
      <p class="mb-0 text-muted">Devolução prevista: <strong>{{ previsaoTexto }}</strong></p>
    </ModalForm>

    <!-- REGISTRAR DEVOLUÇÃO -->
    <Janela v-if="devolvendo" titulo="Registrar devolução" largura="560px" @fechar="devolvendo = null">
      <p class="sub">{{ devolvendo.livro }} · {{ devolvendo.aluno }} (RM {{ devolvendo.rm }})</p>
      <span v-if="devolvendo.situacao === 'Atrasado'" class="badge badge-atrasado">Atrasado · {{ devolvendo.diasAtraso }} {{ devolvendo.diasAtraso === 1 ? 'dia' : 'dias' }}</span>

      <p class="pergunta">Como o livro voltou?</p>
      <div class="opcoes">
        <button class="opcao" :class="{ sel: desfecho === 'Devolvido' }" @click="desfecho = 'Devolvido'">
          <span class="ic ok">✓</span><strong>Em bom estado</strong><small>O livro foi devolvido sem danos e pode voltar ao acervo.</small>
        </button>
        <button class="opcao" :class="{ sel: desfecho === 'Avariado' }" @click="desfecho = 'Avariado'">
          <span class="ic aviso">!</span><strong>Avariado</strong><small>O livro apresentou danos e será avaliado pela biblioteca.</small>
        </button>
        <button class="opcao" :class="{ sel: desfecho === 'Extraviado' }" @click="desfecho = 'Extraviado'">
          <span class="ic perda">?</span><strong>Extraviado</strong><small>O livro não foi devolvido e será marcado como extraviado.</small>
        </button>
      </div>

      <!-- só aparece o formulário da opção escolhida -->
      <div v-if="desfecho === 'Avariado'" class="detalhe">
        <label class="form-label">Descreva o dano <span class="obrig">*</span></label>
        <textarea v-model="descricao" class="form-control" rows="3" placeholder="Ex.: capa rasgada, páginas amassadas..."></textarea>
        <label class="troca"><input v-model="emprestavel" type="checkbox" /> O livro ainda pode ser emprestado?</label>
      </div>
      <div v-else-if="desfecho === 'Extraviado'" class="detalhe">
        <label class="form-label">Observação (opcional)</label>
        <textarea v-model="descricao" class="form-control" rows="2" placeholder="Ex.: aluno informou que perdeu o livro."></textarea>
        <p class="aviso-txt">O exemplar sai do acervo e o aluno fica com uma pendência.</p>
      </div>

      <div v-if="erroDev" class="alert alert-danger py-2 mt-2">{{ erroDev }}</div>

      <template #rodape>
        <button class="btn-cancelar" @click="devolvendo = null">Cancelar</button>
        <button class="btn-confirmar" :disabled="salvando" @click="confirmarDevolucao">✓ Confirmar devolução</button>
      </template>
    </Janela>
  </Sidebar>
</template>

<style scoped>
.abas { display: flex; gap: 2rem; border-bottom: 1px solid #e5e7eb; margin-bottom: 1rem; }
.abas button { background: none; border: none; padding: 0.6rem 0.1rem; font-size: 1rem; font-weight: 600; color: #868e96; cursor: pointer; border-bottom: 3px solid transparent; margin-bottom: -1px; }
.abas button.ativa { color: #4c6ef5; border-bottom-color: #4c6ef5; }

.barra { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; background: #fff; border-radius: 12px; padding: 0.8rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); }
.busca { flex: 1; min-width: 220px; height: 40px; padding: 0 0.9rem; border: 1px solid #d0d5dd; border-radius: 8px; font-size: 0.9rem; }
.chips { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.chip { height: 36px; padding: 0 0.9rem; border-radius: 18px; font-size: 0.82rem; font-weight: 600; cursor: pointer; border: 1px solid; background: #fff; }
.chip.todos { border-color: #d0d5dd; color: #1f2430; }
.chip.todos.sel { background: #4c6ef5; border-color: #4c6ef5; color: #fff; }
.chip.atrasado { border-color: #ffc9c9; color: #e03131; background: #fff5f5; }
.chip.vencendo { border-color: #ffd8a8; color: #e8590c; background: #fff4e6; }
.chip.prazo { border-color: #b2f2bb; color: #2f9e44; background: #ebfbee; }
.chip.sel:not(.todos) { box-shadow: 0 0 0 2px currentColor inset; }
.btn-novo { margin-left: auto; height: 40px; padding: 0 1.1rem; border: none; border-radius: 8px; background: #4c6ef5; color: #fff; font-weight: 600; cursor: pointer; }

.nome { white-space: nowrap; }
.nome.forte { font-weight: 700; }
.acoes { white-space: nowrap; }
.btn-dev { height: 34px; padding: 0 0.9rem; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; border: 1px solid #4c6ef5; }
.btn-dev.cheio { background: #4c6ef5; color: #fff; }
.btn-dev.contorno { background: #fff; color: #4c6ef5; }
.menu-wrap { position: relative; display: inline-block; margin-left: 0.4rem; }
.btn-mais { width: 34px; height: 34px; border: 1px solid #d0d5dd; background: #fff; border-radius: 8px; cursor: pointer; font-weight: 700; }
.menu { position: absolute; right: 0; top: 38px; z-index: 50; min-width: 150px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12); padding: 0.25rem; }
.menu button { width: 100%; text-align: left; background: none; border: none; padding: 0.5rem 0.7rem; border-radius: 6px; font-size: 0.85rem; cursor: pointer; }
.menu button:hover:not(:disabled) { background: #f1f3f5; }
.menu button:disabled { color: #adb5bd; cursor: not-allowed; }

.pill { display: inline-block; padding: 0.15rem 0.65rem; border-radius: 12px; font-size: 0.78rem; font-weight: 600; }
.d-Devolvido { background: #ebfbee; color: #2f9e44; }
.d-Avariado { background: #fff4e6; color: #e8590c; }
.d-Extraviado { background: #fff5f5; color: #e03131; }

/* janela de devolução */
.sub { margin: 0 0 0.5rem; color: #5c6b8a; font-weight: 600; }
.pergunta { margin: 1rem 0 0.5rem; font-weight: 700; color: #0b1f4b; }
.opcoes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; }
.opcao { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; padding: 0.8rem 0.5rem; border: 1px solid #d0d5dd; border-radius: 10px; background: #fff; cursor: pointer; text-align: center; }
.opcao.sel { border: 2px solid #4c6ef5; background: #f3f6ff; }
.opcao small { font-size: 0.7rem; color: #868e96; line-height: 1.25; }
.ic { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; }
.ic.ok { background: #2f9e44; } .ic.aviso { background: #f59f00; } .ic.perda { background: #e03131; }
.detalhe { margin-top: 0.9rem; padding: 0.8rem; background: #f8f9fb; border: 1px solid #e5e7eb; border-radius: 10px; }
.obrig { color: #e03131; }
.troca { display: flex; align-items: center; gap: 0.5rem; margin: 0.6rem 0 0; font-size: 0.85rem; }
.aviso-txt { margin: 0.5rem 0 0; font-size: 0.8rem; color: #868e96; }
.btn-cancelar { height: 40px; padding: 0 1.4rem; border: none; border-radius: 8px; background: #eef0f3; color: #1f2430; font-weight: 600; cursor: pointer; }
.btn-confirmar { height: 40px; padding: 0 1.4rem; border: none; border-radius: 8px; background: #4c6ef5; color: #fff; font-weight: 600; cursor: pointer; }
.btn-confirmar:disabled { opacity: 0.6; cursor: wait; }
@media (max-width: 600px) { .opcoes { grid-template-columns: 1fr; } }
</style>
