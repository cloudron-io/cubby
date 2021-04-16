<template>
    <div class="container">
        <form @submit="onLogin" @submit.prevent>
            <h1>Login to Cubby</h1>
            <div class="p-fluid">
                <div class="p-field">
                    <label for="usernameInput">Username</label>
                    <InputText id="usernameInput" type="text" v-model="username" autofocus/>
                </div>
                <div class="p-field">
                    <label for="passwordInput">Password</label>
                    <Password id="passwordInput" :feedback="false" v-model="password" :class="{ 'p-invalid': error }"/>
                    <small v-show="error" :class="{ 'p-invalid': error }">Wrong username or password.</small>
                </div>
            </div>
            <Button type="submit" label="Login" id="loginButton" @click="onLogin"/>
        </form>
    </div>
</template>

<script>

export default {
    name: 'Login',
    emits: [ 'success' ],
    data() {
        return {
            username: '',
            password: '',
            error: ''
        };
    },
    methods: {
        onLogin() {
            // TODO do login
            var token = 'sometoken';
            var profile = {
                username: 'username',
                displayName: 'Display Name'
            };

            this.$emit('success', token, profile);
        }
    },
    mounted() {
    }
};

</script>

<style scoped>

.container {
    max-width: 480px;
    margin: auto;
    padding: 20px;
}

</style>
