<template>
  <div class="login">
    <div class="login-box">
    <h1>Gameplan</h1>
    <div class="control">
        <input type="email" name="email" placeholder="User name">
    </div>
    <div class="control">
        <input type="password" name="password" placeholder="••••••••">
    </div>
    <div class="login-buttons">
        <router-link to="">Sign Up</router-link>
        <router-link to="/discussions">Login</router-link>
    </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Login',
  data() {
    return {
      msg: 'Welcome to Your Vue.js App',
    };
  },
};
</script>

<style scoped>
.login {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  transform: translateY(-10%);
}

h1 {
  font-family: 'Avenir';
  text-transform: uppercase;
  letter-spacing: 1rem;
  color: var(--text-grey);
  margin-bottom: 4rem;
  font-weight: 900;
}

.control {
  text-align: left;
  margin-top: 1rem;
}

input {
  padding: 1rem 0;
}

input[type='password'] {
  letter-spacing: 5px;
}

.login-buttons {
  display: flex;
  justify-content: space-between;
  color: var(--text-blue);
  margin-top: 3rem;
  font-size: 1.5rem;
}

.login-buttons a {
  text-decoration: none;
  color: var(--text-blue);
}

.login-buttons a:visited {
  color: var(--text-blue);
}
</style>
