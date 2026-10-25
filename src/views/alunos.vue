<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import Sidebar from '../components/Sidebar.vue'
import ModalForm from '../components/ModalForm.vue'
import Janela from '../components/Janela.vue'
import { alunos, turmas, recarregar } from '../dados.js'
import { apiPost } from '../api.js'

const router = useRouter()
const busca = ref('')
const filtroStatus = ref('')
const filtroPeriodo = ref('')
const mostrarModal = ref(false)
const erro = ref('')
const salvando = ref(false)

function vazio() { return { rm: '', nome: '', email: '', telefone: '', idTurma: '' } }
const novo = ref(vazio())

const badgeDe = a => (a.status === 'Ativo' ? 'badge-ativo' : 'badge-bloqueado')
const textoEmprestimos = a => (a.emprestimosAtivos === 1 ? '1 ativo' : a.emprestimosAtivos + ' ativos')

const alunosFiltrados = computed(() =>
  alunos.value.filter(a => {
    const t = busca.value.toLowerCase()
    const bateBusca = a.nome.toLowerCase().includes(t) || a.rm.includes(t) || a.curso.toLowerCase().includes(t)
    const bateStatus = !filtroStatus.value || a.status === filtroStatus.value
    const batePeriodo = !filtroPeriodo.value || a.periodo === filtroPeriodo.value
    return bateBusca && bateStatus && batePeriodo
  })
)

function abrirModal() { novo.value = vazio(); erro.value = ''; mostrarModal.value = true }

async function salvar() {
  if (salvando.value) return
  salvando.value = true
  erro.value = ''
  try {
    await apiPost('/api/alunos.php', {
      rm: novo.value.rm, nome: novo.value.nome, email: novo.value.email,
      telefone: novo.value.telefone, idTurma: Number(novo.value.idTurma),
    })
    await recarregar()
    mostrarModal.value = false
  } catch (e) {
    erro.value = e.message
  } finally {
    salvando.value = false
  }
}

// ---------- bloquear / desbloquear ----------
const bloqueando = ref(null)                       // aluno que vai ser bloqueado
const motivo = ref('')
const erroBloqueio = ref('')

function abrirBloqueio(a) { bloqueando.value = a; motivo.value = ''; erroBloqueio.value = '' }
async function confirmarBloqueio() {
  if (!motivo.value.trim()) { erroBloqueio.value = 'Informe o motivo do bloqueio.'; return }
  try {
    await apiPost('/api/alunos.php', { acao: 'bloquear', rm: bloqueando.value.rm, motivo: motivo.value })
    await recarregar()
    bloqueando.value = null
  } catch (e) {
    erroBloqueio.value = e.message
  }
}
async function desbloquear(a) {
  try {
    const r = await apiPost('/api/alunos.php', { acao: 'desbloquear', rm: a.rm })
    await recarregar()
    if (r.aviso) alert(r.aviso)
  } catch (e) {
    alert(e.message)
  }
}
function verPendencias() { router.push({ path: '/emprestimos', query: { aba: 'pendencias' } }) }
</script>

<template>
  <Sidebar page-title="Alunos" active="alunos">
    <div class="page-header">
      <h1></h1>
      <button class="btn-primary-action" @click="abrirModal">Cadastrar Aluno</button>
    </div>

    <div class="filter-bar">
      <input v-model="busca" type="text" placeholder="Pesquisar por nome, RM ou turma..." />
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
            <th>RM</th><th>Nome</th><th>Turma</th><th>Período</th><th>E-mail</th>
            <th>Empréstimos</th><th>Pendências</th><th>Status</th><th>Ação</th>
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
            <td>
              <button v-if="a.pendencias > 0" class="pend" @click="verPendencias">{{ a.pendencias }} {{ a.pendencias === 1 ? 'pendência' : 'pendências' }}</button>
              <span v-else class="sem">—</span>
            </td>
            <td>
              <span class="badge" :class="badgeDe(a)">{{ a.status }}</span>
              <small v-if="a.motivoBloqueio" class="motivo">{{ a.bloqueioTipo }}: {{ a.motivoBloqueio }}</small>
            </td>
            <td>
              <button v-if="a.bloqueioTipo === 'Automático'" class="btn-acao" disabled title="Bloqueio automático: registre a devolução do livro em atraso">Automático</button>
              <button v-else-if="a.status === 'Ativo'" class="btn-acao" @click="abrirBloqueio(a)">Bloquear</button>
              <button v-else class="btn-acao" @click="desbloquear(a)">Desbloquear</button>
            </td>
          </tr>
          <tr v-if="alunosFiltrados.length === 0">
            <td colspan="9" class="text-center">Nenhum aluno encontrado.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- CADASTRO DE ALUNO (sem CPF) -->
    <ModalForm v-if="mostrarModal" titulo="Cadastrar aluno" @fechar="mostrarModal = false" @salvar="salvar">
      <div v-if="erro" class="alert alert-danger py-2">{{ erro }}</div>
      <label class="form-label">RM (5 números)</label>
      <input v-model="novo.rm" class="form-control mb-2" inputmode="numeric" maxlength="5" pattern="[0-9]{5}" required />
      <label class="form-label">Nome completo</label>
      <input v-model="novo.nome" class="form-control mb-2" required />
      <label class="form-label">Turma</label>
      <select v-model="novo.idTurma" class="form-select mb-2" required>
        <option value="" disabled>Selecione a turma...</option>
        <option v-for="t in turmas" :key="t.id" :value="t.id">{{ t.codigo }} — {{ t.curso }} ({{ t.periodo }})</option>
      </select>
      <label class="form-label">E-mail</label>
      <input v-model="novo.email" type="email" class="form-control mb-2" required />
      <label class="form-label">Telefone (opcional)</label>
      <input v-model="novo.telefone" class="form-control" inputmode="tel" placeholder="(19) 90000-0000" />
    </ModalForm>

    <!-- BLOQUEAR ALUNO -->
    <Janela v-if="bloqueando" titulo="Bloquear aluno" largura="460px" @fechar="bloqueando = null">
      <p class="mb-2">{{ bloqueando.nome }} (RM {{ bloqueando.rm }}) não poderá pegar novos livros.</p>
      <label class="form-label">Motivo do bloqueio <span class="obrig">*</span></label>
      <textarea v-model="motivo" class="form-control" rows="3" placeholder="Ex.: não devolveu o material de pesquisa."></textarea>
      <div v-if="erroBloqueio" class="alert alert-danger py-2 mt-2">{{ erroBloqueio }}</div>
      <template #rodape>
        <button class="btn-cancelar" @click="bloqueando = null">Cancelar</button>
        <button class="btn-confirmar" @click="confirmarBloqueio">Bloquear</button>
      </template>
    </Janela>
  </Sidebar>
</template>

<style scoped>
.motivo { display: block; margin-top: 2px; font-size: 0.7rem; color: #868e96; }
.pend { border: 1px solid #ffd8a8; background: #fff4e6; color: #e8590c; border-radius: 12px; padding: 0.1rem 0.6rem; font-size: 0.78rem; font-weight: 600; cursor: pointer; }
.sem { color: #ced4da; }
.btn-acao { height: 32px; padding: 0 0.8rem; border: 1px solid #d0d5dd; background: #fff; border-radius: 8px; font-size: 0.82rem; font-weight: 600; cursor: pointer; }
.btn-acao:disabled { color: #adb5bd; cursor: not-allowed; }
.obrig { color: #e03131; }
.btn-cancelar { height: 40px; padding: 0 1.4rem; border: none; border-radius: 8px; background: #eef0f3; font-weight: 600; cursor: pointer; }
.btn-confirmar { height: 40px; padding: 0 1.4rem; border: none; border-radius: 8px; background: #4c6ef5; color: #fff; font-weight: 600; cursor: pointer; }
</style>
