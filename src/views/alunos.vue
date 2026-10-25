<script setup>
import { ref, computed } from 'vue'                // ref = caixinha de dado; computed = cálculo automático
import Sidebar from '../components/Sidebar.vue'    // menu lateral
import ModalForm from '../components/ModalForm.vue' // moldura do formulário
import { alunos } from '../dados.js'               // lista de alunos compartilhada com as outras telas

const busca = ref('')                              // texto da pesquisa
const filtroStatus = ref('')                       // 'Ativo', 'Bloqueado' ou '' (todos)
const filtroPeriodo = ref('')                      // 'Manhã', 'Tarde', 'Noite' ou '' (todos)
const mostrarModal = ref(false)                    // modal começa fechado
const erro = ref('')                               // mensagem de erro do formulário

function vazio() {                                 // devolve um formulário limpo
  return { rm: '', nome: '', curso: '', periodo: 'Manhã', email: '' }
}
const novo = ref(vazio())                          // dados digitados no formulário

function badgeDe(a) {                              // classe CSS da etiqueta de status
  return a.status === 'Ativo' ? 'badge-ativo' : 'badge-bloqueado'
}
function textoEmprestimos(a) {                     // "1 ativo" / "2 ativos"
  return a.emprestimosAtivos === 1 ? '1 ativo' : a.emprestimosAtivos + ' ativos'
}

const alunosFiltrados = computed(() =>             // lista que aparece na tabela
  alunos.value.filter(a => {                       // decide aluno a aluno se fica ou sai
    const t = busca.value.toLowerCase()            // busca em minúsculas
    const bateBusca = a.nome.toLowerCase().includes(t) || a.rm.includes(t) || a.curso.toLowerCase().includes(t)
    const bateStatus = !filtroStatus.value || a.status === filtroStatus.value
    const batePeriodo = !filtroPeriodo.value || a.periodo === filtroPeriodo.value
    return bateBusca && bateStatus && batePeriodo  // precisa passar nos três testes
  })
)

function abrirModal() {                            // botão "Cadastrar Aluno"
  novo.value = vazio()                             // limpa o formulário
  erro.value = ''                                  // limpa o erro
  mostrarModal.value = true                        // abre o modal
}

function salvar() {                                // chamada quando o formulário é enviado
  const rm = novo.value.rm.trim()                  // RM sem espaços nas pontas
  if (alunos.value.some(a => a.rm === rm)) {       // já existe aluno com esse RM?
    erro.value = 'Já existe um aluno com esse RM.'
    return                                         // para aqui e mantém o modal aberto
  }
  alunos.value.push({                              // coloca o aluno novo na lista
    rm,
    nome: novo.value.nome.trim(),
    curso: novo.value.curso.trim().toUpperCase(),  // "2ds" vira "2DS"
    periodo: novo.value.periodo,
    email: novo.value.email.trim(),
    emprestimosAtivos: 0,                          // aluno novo não tem empréstimos
    status: 'Ativo',                               // e começa ativo
  })
  mostrarModal.value = false                       // fecha o modal
}
</script>

<template>
  <Sidebar page-title="Alunos" active="alunos">
    <div class="page-header">
      <h1></h1>
      <button class="btn-primary-action" @click="abrirModal">Cadastrar Aluno</button>
    </div>

    <div class="filter-bar">
      <input v-model="busca" type="text" placeholder="Pesquisar por nome, RM ou curso..." />
      <select v-model="filtroStatus">
        <option value="">Todos os status</option>
        <option value="Ativo">Ativo</option>
        <option value="Bloqueado">Bloqueado</option>
      </select>
      <select v-model="filtroPeriodo">
        <option value="">Todos os períodos</option>
        <option value="Manhã">Manhã</option>
        <option value="Tarde">Tarde</option>
        <option value="Noite">Noite</option>
      </select>
    </div>

    <div class="table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>RM</th><th>Nome</th><th>Curso</th><th>Período</th>
            <th>E-mail</th><th>Empréstimos</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in alunosFiltrados" :key="a.rm">
            <td>{{ a.rm }}</td>
            <td>{{ a.nome }}</td>
            <td>{{ a.curso }}</td>
            <td>{{ a.periodo }}</td>
            <td>{{ a.email }}</td>
            <td><span class="badge badge-ativos">{{ textoEmprestimos(a) }}</span></td>
            <td><span class="badge" :class="badgeDe(a)">{{ a.status }}</span></td>
          </tr>
          <tr v-if="alunosFiltrados.length === 0">
            <td colspan="7" class="text-center">Nenhum aluno encontrado.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- FORMULÁRIO DE CADASTRO DE ALUNO -->
    <ModalForm v-if="mostrarModal" titulo="Cadastrar aluno" @fechar="mostrarModal = false" @salvar="salvar">
      <div v-if="erro" class="alert alert-danger py-2">{{ erro }}</div>
      <label class="form-label">RM</label>
      <input v-model="novo.rm" class="form-control mb-2" inputmode="numeric" required />
      <label class="form-label">Nome completo</label>
      <input v-model="novo.nome" class="form-control mb-2" required />
      <label class="form-label">Curso / turma</label>
      <input v-model="novo.curso" class="form-control mb-2" placeholder="Ex: 2DS" required />
      <label class="form-label">Período</label>
      <select v-model="novo.periodo" class="form-select mb-2">
        <option>Manhã</option>
        <option>Tarde</option>
        <option>Noite</option>
      </select>
      <label class="form-label">E-mail</label>
      <input v-model="novo.email" type="email" class="form-control" required />
    </ModalForm>
  </Sidebar>
</template>
