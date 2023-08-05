<template>
  <div class="container">
    <div class="left">
      <img src="/public/logo-plain.svg" style="width: 50%"/>
      <div class="footer">
        by <a href="https://cloudron.io" target="_blank">Cloudron</a>
      </div>
    </div>
    <div class="right">
      <h1>Login to Cubby</h1>
      <a :href="apiOrigin + '/api/v1/oidc/login'"><Button label="Login" id="loginButton"/></a>
    </div>
  </div>
</template>

<script>

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ? import.meta.env.VITE_API_ORIGIN : '';

export default {
    name: 'LoginView',
    data() {
      return {
        apiOrigin: API_ORIGIN,
      };
    }
};

</script>

<style scoped>

.container {
  display: flex;
  flex-direction: row;
  align-items: stretch;
}

.left {
  background: linear-gradient(90deg, rgb(168, 85, 247) 0%,rgb(33, 150, 243) 100%);
  flex-grow: 1;
  display: none;
  max-width: 40%;
  align-items: center;
  align-content: center;
  flex-direction: column;
  justify-content: space-between;
}

@media (min-width:320px) {
  .left {
    display: flex;
  }
}

.right {
  background-color: white;
  align-self: stretch;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  padding: 40px;
  margin: auto;
  white-space: nowrap;
}

.footer {
  color: white;
  width: 100%;
  font-size: 12px;
  padding: 5px;
}

.footer a {
  color: white;
}

.footer a:hover,
.footer a:active {
  color: white;
  text-decoration: underline;
}

</style>
