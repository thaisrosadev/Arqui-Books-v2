<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue' // ref = caixinha; computed = cálculo automático
import { useRouter } from 'vue-router'                       // para levar a pessoa à tela da notificação
import { livros, alunos, emprestimos, notificacoesLidas, erroApi } from '../dados.js' // dados compartilhados e aviso de erro do servidor
import { gerarNotificacoes, hojeISO } from '../regras.js'    // regra que cria as notificações
import { apiPost, limparSessao, usuarioLogado } from '../api.js' // sessão do usuário (login)

defineProps({
  pageTitle: { type: String, required: true },
  active: { type: String, required: true },
})

const router = useRouter()                                   // controle de navegação
const sidebarOpen = ref(false)                               // menu lateral aberto (celular)
const mostrarNotif = ref(false)                              // painel do sino aberto?
const mostrarUsuario = ref(false)                            // menu "Bibliotecário ▾" aberto?
const nomeUsuario = (usuarioLogado() && usuarioLogado().nome) || 'Bibliotecário'

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function closeSidebar() {
  sidebarOpen.value = false
}

// ===== NOTIFICAÇÕES =====
const notifs = computed(() =>                                // lista gerada a partir dos dados (atrasos, estoque...)
  gerarNotificacoes(emprestimos.value, livros.value, alunos.value, hojeISO())
)

const naoLidas = computed(() =>                              // quantas ainda não foram lidas
  notifs.value.filter(n => !notificacoesLidas.value.includes(n.id)).length
)

function foiLida(n) {                                        // essa notificação já foi lida?
  return notificacoesLidas.value.includes(n.id)
}

function abrirNotif(n) {                                     // clicou em uma notificação
  if (!foiLida(n)) notificacoesLidas.value.push(n.id)        // marca como lida
  mostrarNotif.value = false                                 // fecha o painel
  router.push(n.link)                                        // vai para a tela relacionada
}

function marcarTodas() {                                     // botão "Marcar todas como lidas"
  notificacoesLidas.value = notifs.value.map(n => n.id)
}

function alternarNotif() {                                   // clicou no sino
  mostrarNotif.value = !mostrarNotif.value
}

function fecharNotif() {                                     // clicou fora do painel
  mostrarNotif.value = false
  mostrarUsuario.value = false
}

async function sair() {                                      // botão Sair: apaga a sessão e volta ao login
  try { await apiPost('/api/auth.php', { acao: 'sair' }) } catch (e) { /* mesmo se falhar, sai */ }
  limparSessao()
  router.push('/login')
}

onMounted(() => document.addEventListener('click', fecharNotif))     // escuta cliques na página
onUnmounted(() => document.removeEventListener('click', fecharNotif)) // para de escutar ao sair da tela

const ICONES = {                                             // ícone e cor de cada tipo de notificação
  atraso: { icone: 'bi-exclamation-triangle-fill', cor: '#fa5252' },
  vencendo: { icone: 'bi-clock-fill', cor: '#f59f00' },
  estoque: { icone: 'bi-box-seam-fill', cor: '#f76707' },
  bloqueado: { icone: 'bi-slash-circle-fill', cor: '#868e96' },
}
</script>

<template>
  <div class="app-layout">
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-logo">
        <img src="/src/assets/logo_icon.png" alt="ArquiBooks" class="logo-icon-img" />
        <div>
          <h1>ArquiBooks</h1>
          <small>SISTEMA DE GESTÃO DE BIBLIOTECA</small>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-group">
          <p class="nav-group-title">Principal</p>
          <RouterLink to="/dashboard" class="nav-link" :class="{ active: active === 'dashboard' }" @click="closeSidebar">
            <i class="bi bi-speedometer2 nav-icon"></i> Dashboard
          </RouterLink>
        </div>

        <div class="nav-group">
          <p class="nav-group-title">Acervo</p>
          <RouterLink to="/livros" class="nav-link" :class="{ active: active === 'livros' }" @click="closeSidebar">
            <i class="bi bi-book-fill nav-icon"></i> Livros
          </RouterLink>
          <RouterLink to="/alunos" class="nav-link" :class="{ active: active === 'alunos' }" @click="closeSidebar">
            <i class="bi bi-people-fill nav-icon"></i> Alunos
          </RouterLink>
        </div>

        <div class="nav-group">
          <p class="nav-group-title">Circulação</p>
          <RouterLink to="/emprestimos" class="nav-link" :class="{ active: active === 'emprestimos' }" @click="closeSidebar">
            <i class="bi bi-box-arrow-in-down nav-icon"></i> Empréstimos
          </RouterLink>
        </div>

        <div class="nav-group">
          <p class="nav-group-title">Comunicação</p>
          <RouterLink to="/email" class="nav-link" :class="{ active: active === 'email' }" @click="closeSidebar">
            <i class="bi bi-envelope-fill nav-icon"></i> E-mails Automáticos
          </RouterLink>
        </div>
      </nav>

    </aside>

    <div class="sidebar-overlay" v-if="sidebarOpen" @click="closeSidebar"></div>

    <div class="main-area">
      <header class="topbar">
        <div class="topbar-left">
          <button class="menu-toggle-btn" @click="toggleSidebar" aria-label="Abrir menu">☰</button>
          <h2>{{ pageTitle }}</h2>
        </div>
        <div class="topbar-actions">
          <!-- SINO DE NOTIFICAÇÕES -->
          <div class="notif-wrap">
            <!-- @click.stop: o clique no sino não deve fechar o painel logo em seguida -->
            <button class="icon-round-btn notif-btn" @click.stop="alternarNotif" aria-label="Notificações">
              <i class="bi bi-bell"></i>
              <span v-if="naoLidas > 0" class="notif-badge">{{ naoLidas > 9 ? '9+' : naoLidas }}</span>
            </button>

            <div v-if="mostrarNotif" class="notif-painel" @click.stop>
              <div class="notif-topo">
                <strong>Notificações</strong>
                <button v-if="naoLidas > 0" class="notif-link" @click="marcarTodas">Marcar todas como lidas</button>
              </div>

              <p v-if="notifs.length === 0" class="notif-vazio">Nenhuma notificação no momento.</p>

              <ul v-else class="notif-lista">
                <li v-for="n in notifs" :key="n.id" class="notif-item" :class="{ lida: foiLida(n) }" @click="abrirNotif(n)">
                  <span class="notif-icone" :style="{ background: ICONES[n.tipo].cor }">
                    <i class="bi" :class="ICONES[n.tipo].icone"></i>
                  </span>
                  <span class="notif-texto">
                    <strong>{{ n.titulo }}</strong>
                    <span>{{ n.texto }}</span>
                  </span>
                  <span v-if="!foiLida(n)" class="notif-ponto"></span>
                </li>
              </ul>
            </div>
          </div>

          <!-- MENU DO USUÁRIO -->
          <div class="usuario-wrap">
            <button class="usuario-btn" @click.stop="mostrarUsuario = !mostrarUsuario; mostrarNotif = false">
              <span class="user-avatar"></span>
              <span>{{ nomeUsuario }}</span>
              <i class="bi bi-chevron-down"></i>
            </button>
            <div v-if="mostrarUsuario" class="usuario-menu" @click.stop>
              <button @click="sair"><i class="bi bi-box-arrow-right"></i> Sair</button>
            </div>
          </div>
        </div>
      </header>

      <main class="page-content">
        <!-- barra vermelha: aparece quando o PHP/banco não responde -->
        <div v-if="erroApi" class="alert alert-danger">
          <strong>Sem conexão com o servidor.</strong> {{ erroApi }}
        </div>
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.usuario-wrap { position: relative; margin-left: 0.5rem; }
.usuario-btn { display: flex; align-items: center; gap: 0.5rem; background: none; border: none; cursor: pointer; font-size: 0.9rem; font-weight: 600; color: #1f2430; }
.usuario-btn .user-avatar { width: 32px; height: 32px; }
.usuario-menu { position: absolute; right: 0; top: 44px; z-index: 3000; min-width: 140px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12); padding: 0.3rem; }
.usuario-menu button { width: 100%; text-align: left; background: none; border: none; padding: 0.55rem 0.7rem; border-radius: 6px; font-size: 0.85rem; cursor: pointer; }
.usuario-menu button:hover { background: #f1f3f5; }
.notif-wrap { position: relative; }                       /* o painel se posiciona em relação ao sino */
.notif-btn { position: relative; display: inline-flex; align-items: center; justify-content: center; font-size: 1.1rem; color: #1f2430; }
.notif-badge {                                            /* bolinha vermelha com o contador */
  position: absolute; top: -6px; right: -6px;
  min-width: 18px; height: 18px; padding: 0 4px;
  background: #fa5252; color: #fff; border-radius: 9px;
  font-size: 0.65rem; font-weight: 700; line-height: 18px; text-align: center;
}
.notif-painel {                                           /* caixa que abre embaixo do sino */
  position: absolute; right: 0; top: 46px; z-index: 3000;
  width: 340px; max-width: 92vw;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}
.notif-topo { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; border-bottom: 1px solid #e5e7eb; font-size: 0.9rem; }
.notif-link { background: none; border: none; color: #4c6ef5; font-size: 0.75rem; font-weight: 600; cursor: pointer; }
.notif-lista { list-style: none; margin: 0; padding: 0; max-height: 380px; overflow-y: auto; }
.notif-item { display: flex; gap: 0.7rem; align-items: flex-start; padding: 0.75rem 1rem; border-bottom: 1px solid #f1f3f5; cursor: pointer; }
.notif-item:hover { background: #f8f9fb; }
.notif-item.lida { opacity: 0.55; }                       /* lidas ficam mais apagadas */
.notif-icone { flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; }
.notif-texto { flex: 1; display: flex; flex-direction: column; font-size: 0.8rem; line-height: 1.3; }
.notif-texto strong { font-size: 0.82rem; }
.notif-ponto { flex-shrink: 0; width: 8px; height: 8px; margin-top: 6px; border-radius: 50%; background: #4c6ef5; }
.notif-vazio { padding: 1.2rem; text-align: center; color: #868e96; font-size: 0.85rem; margin: 0; }
</style>
