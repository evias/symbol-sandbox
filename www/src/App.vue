<template>
  <div id="app">
    <header>
      <div class="logo"><img src="./assets/logo.png" width="150"></div>
      <div class="nav">
        <ul>
          <li><router-link to="/qrcodes">QR Codes</router-link></li>
          <li><router-link to="/wallet">Wallet</router-link></li>
          <li><router-link to="/validator">Validator</router-link></li>
        </ul>
      </div>
    </header>
    <router-view/>
  </div>
</template>

<script>
export default {
  name: 'App',
};
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

header .nav ul {
  list-style-type: none;
  padding: 0;
}
header .nav li {
  display: inline-block;
  margin: 0 10px;
}
header .nav a {
  color: #42b983;
}
</style>
