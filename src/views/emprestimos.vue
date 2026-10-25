<script setup>
import { ref, computed } from 'vue'                // ref = caixinha de dado; computed = cálculo automático
import Sidebar from '../components/Sidebar.vue'    // menu lateral
import ModalForm from '../components/ModalForm.vue' // moldura do formulário
import { livros, alunos, emprestimos } from '../dados.js' // as 3 listas compartilhadas
import { hojeISO, somaDias, formatarData, statusEm, diasEntre, PRAZO_DIAS } from '../regras.js' // datas e regra de status

const hoje = hojeISO()                              // data de hoje em ISO (aaaa-mm-dd)

const busca = ref('')                              // texto da pesquisa
const filtroStatus = ref('')                       // 'Emprestado', 'Vencendo', 'Atrasado' ou '' (todos)
const mostrarModal = ref(false)                    // modal começa fechado
const erro = ref('')                               // mensagem de erro do formulário
const novo = ref({ rm: '', isbn: '' })             // aluno e livro escolhidos no formulário

const BADGES = {                                   // "dicionário": status -> classe CSS da etiqueta
  'No prazo': 'badge-no-prazo',
  Vencendo: 'badge-vencendo',
  Atrasado: 'badge-atrasado',
}

const alunosAtivos = computed(() =>                // só alunos ATIVOS podem pegar livro (bloqueado não)
  alunos.value.filter(a => a.status === 'Ativo')
)
const livrosDisponiveis = computed(() =>           // só livros com exemplar livre aparecem no select
  livros.value.filter(l => l.disponiveis > 0)
)

const previsaoISO = computed(() => somaDias(hoje, PRAZO_DIAS))        // hoje + 14 dias
const previsaoTexto = computed(() => formatarData(previsaoISO.value)) // formato dd/mm/aaaa

function statusDe(e) {                             // status CALCULADO pelas datas: No prazo, Vencendo ou Atrasado
  return statusEm(e, hoje)
}
function textoStatus(e) {                          // "Atrasado · 3 dias"
  const s = statusDe(e)
  if (s !== 'Atrasado') return s
  const n = diasEntre(e.previsao, hoje)
  return `Atrasado · ${n} ${n === 1 ? 'dia' : 'dias'}`
}

const emprestimosFiltrados = computed(() =>        // lista que aparece na tabela
  emprestimos.value.filter(e => {
    const t = busca.value.toLowerCase()            // busca em minúsculas
    const bateBusca = e.aluno.toLowerCase().includes(t) || e.livro.toLowerCase().includes(t) || e.rm.includes(t)
    const bateStatus = !filtroStatus.value || statusDe(e) === filtroStatus.value
    return bateBusca && bateStatus                 // precisa passar nos dois testes
  })
)

function abrirModal() {                            // botão "Novo Empréstimo"
  novo.value = { rm: '', isbn: '' }                // limpa a escolha
  erro.value = ''                                  // limpa o erro
  mostrarModal.value = true                        // abre o modal
}

function salvar() {                                // chamada quando o formulário é enviado
  const aluno = alunos.value.find(a => a.rm === novo.value.rm)    // acha o aluno escolhido
  const livro = livros.value.find(l => l.isbn === novo.value.isbn) // acha o livro escolhido
  if (!aluno || !livro) {                          // segurança: algo não foi escolhido
    erro.value = 'Escolha o aluno e o livro.'
    return
  }
  emprestimos.value.unshift({                      // coloca o empréstimo no TOPO da lista
    rm: aluno.rm,
    aluno: aluno.nome,
    isbn: livro.isbn,
    livro: livro.titulo,
    emprestimo: hoje,                              // data de hoje (ISO)
    previsao: previsaoISO.value,                   // hoje + 14 dias (ISO)
    devolucao: null,                               // ainda não devolveu
  })
  livro.disponiveis--                              // um exemplar a menos na prateleira
  aluno.emprestimosAtivos++                        // um empréstimo a mais para o aluno
  mostrarModal.value = false                       // fecha o modal
}
</script>

<template>
  <Sidebar page-title="Empréstimos" active="emprestimos">
    <div class="page-header">
      <h1></h1>
      <button class="btn-primary-action" @click="abrirModal">Novo Empréstimo</button>
    </div>

    <div class="filter-bar">
      <input v-model="busca" type="text" placeholder="Pesquisar por aluno, livro ou RM..." />
      <select v-model="filtroStatus">
        <option value="">Todos os status</option>
        <option value="No prazo">No prazo</option>
        <option value="Vencendo">Vencendo</option>
        <option value="Atrasado">Atrasado</option>
      </select>
    </div>

    <div class="table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>RM</th><th>Aluno</th><th>Livro</th><th>Empréstimo</th>
            <th>Previsão de Devolução</th><th>Status</th><th>Ação</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(e, i) in emprestimosFiltrados" :key="e.rm + e.isbn + i">
            <td>{{ e.rm }}</td>
            <td>{{ e.aluno }}</td>
            <td>{{ e.livro }}</td>
            <td>{{ formatarData(e.emprestimo) }}</td>
            <td>{{ formatarData(e.previsao) }}</td>
            <td><span class="badge" :class="BADGES[statusDe(e)]">{{ textoStatus(e) }}</span></td>
            <td>
              <button class="action-btn check">✓</button>
              <button class="action-btn renew">⟳</button>
            </td>
          </tr>
          <tr v-if="emprestimosFiltrados.length === 0">
            <td colspan="7" class="text-center">Nenhum empréstimo encontrado.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- FORMULÁRIO DE NOVO EMPRÉSTIMO -->
    <ModalForm v-if="mostrarModal" titulo="Novo empréstimo" @fechar="mostrarModal = false" @salvar="salvar">
      <div v-if="erro" class="alert alert-danger py-2">{{ erro }}</div>
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
      <p class="mb-0 text-muted">Devolução prevista: <strong>{{ previsaoTexto }}</strong> (14 dias)</p>
    </ModalForm>
  </Sidebar>
</template>
