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
            <a href>Sign Up</a>
            <a href>Login</a>
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
        position: relative;
    }

    .login-box {
        top: 40%;
    }

    h1 {
        font-family: 'Avenir';
        font-weight: 900;
        letter-spacing: 20px;
        text-transform: uppercase;
        color: var(--text-grey);
        margin: 0;
        margin-bottom: 4rem;
    }

    .control {
        text-align: left;
        margin-top: 1rem;
    }

    input {
        background-color: transparent;
        border: none;
        outline: none;
        font-size: 1.5rem;
        font-family: inherit;
        padding: 1rem 0;
        border-bottom: 1px solid var(--border-color);
        color: var(--text-black);
        width: 100%;
    }

    input[type=password] {
        letter-spacing: 5px;
    }

    input::placeholder {
        color: var(--text-grey);
    }

    .login-buttons {
        display: flex;
        justify-content: space-between;
        color: var(--text-blue);
        margin-top: 3rem;
    }

    .login-buttons a {
        text-decoration: none;
    }

    .login-buttons a:visited {
        text-decoration: none;
        color: var(--text-blue);
    }
</style>
