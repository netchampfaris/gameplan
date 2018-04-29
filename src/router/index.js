import Vue from 'vue';
import Router from 'vue-router';
import Login from '@/pages/Login';
import Discussions from '@/pages/Discussions';
import StartDiscussion from '@/pages/StartDiscussion';

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: Login,
    },
    {
      path: '/discussions',
      name: 'Discussions',
      component: Discussions,
    },
    {
      path: '/start-a-discussion',
      name: 'StartDiscussion',
      component: StartDiscussion,
    },
  ],
});
