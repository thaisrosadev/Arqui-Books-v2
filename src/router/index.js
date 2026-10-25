import { createRouter, createWebHistory } from 'vue-router'

import Login from '../views/login.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: Login,
    },
    {
      path: '/alunos',
      name: 'alunos',
      component: () => import('../views/alunos.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/dashboard.vue'),
    },
    {
      path: '/livros',
      name: 'livros',
      component: () => import('../views/livros.vue'),
    },
    {
      path: '/devolucoes',
      name: 'devolucoes',
      component: () => import('../views/devolucoes.vue'),
    },
     {
      path: '/emprestimos',
      name: 'emprestimos',
      component: () => import('../views/emprestimos.vue'),
    },
    {
      path: '/relatorio',
      name: 'relatorio',
      component: () => import('../views/relatorio.vue'),
    },
    {
      path: '/email',
      name: 'email',
      component: () => import('../views/email.vue'),
    },
  ],
})

export default router

