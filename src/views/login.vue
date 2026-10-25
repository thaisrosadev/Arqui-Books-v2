<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const modo = ref('login') // 'login' ou 'cadastro'

// campos do login
const email = ref('')
const senha = ref('')

// campos do cadastro
const nome = ref('')
const emailCadastro = ref('')
const senhaCadastro = ref('')
const confirmarSenha = ref('')

function entrar() {
  console.log('Login:', email.value, senha.value)
  // aqui depois entra a validação real (checar no banco de dados, por exemplo)
  // por enquanto, qualquer e-mail/senha preenchidos já entram:
  router.push('/dashboard')
}

function cadastrar() {
  if (senhaCadastro.value !== confirmarSenha.value) {
    alert('As senhas não coincidem!')
    return
  }
  console.log('Cadastro:', nome.value, emailCadastro.value, senhaCadastro.value)
  // aqui depois entra a lógica real de cadastro
  modo.value = 'login'
}
</script>

<template>
  <div class="login-container">
    <div class="login-form">
      <!-- FORMULÁRIO DE LOGIN -->
      <form v-if="modo === 'login'" @submit.prevent="entrar">
        <h2 class="mb-4 text-center">Login</h2>

        <div class="mb-3">
          <label class="form-label">E-mail</label>
          <input v-model="email" type="email" class="form-control" required />
        </div>

        <div class="mb-3">
          <label class="form-label">Senha</label>
          <input v-model="senha" type="password" class="form-control" required />
        </div>

        <button type="submit" class="btn btn-primary w-100">Entrar</button>

        <p class="text-center mt-3 mb-0">
          Não tem conta?
          <a href="#" @click.prevent="modo = 'cadastro'">Cadastre-se</a>
        </p>
      </form>

      <!-- FORMULÁRIO DE CADASTRO -->
      <form v-else @submit.prevent="cadastrar">
        <h2 class="mb-4 text-center">Cadastro</h2>

        <div class="mb-3">
          <label class="form-label">Nome</label>
          <input v-model="nome" type="text" class="form-control" required />
        </div>

        <div class="mb-3">
          <label class="form-label">E-mail</label>
          <input v-model="emailCadastro" type="email" class="form-control" required />
        </div>

        <div class="mb-3">
          <label class="form-label">Senha</label>
          <input v-model="senhaCadastro" type="password" class="form-control" required />
        </div>

        <div class="mb-3">
          <label class="form-label">Confirmar senha</label>
          <input v-model="confirmarSenha" type="password" class="form-control" required />
        </div>

        <button type="submit" class="btn btn-success w-100">Cadastrar</button>

        <p class="text-center mt-3 mb-0">
          Já tem conta?
          <a href="#" @click.prevent="modo = 'login'">Fazer login</a>
        </p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

.login-form {
  width: 100%;
  max-width: 380px;
  padding: 2rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}
</style>
