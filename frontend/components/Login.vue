<template>
    <div class="container">
        <form @submit="onLogin" @submit.prevent>
            <h1>Login to Cubby</h1>
            <div class="p-fluid">
                <div class="p-field">
                    <label for="usernameInput">Username</label>
                    <InputText id="usernameInput" type="text" v-model="username" :class="{ 'p-invalid': error }" autofocus/>
                </div>
                <div class="p-field">
                    <label for="passwordInput">Password</label>
                    <Password id="passwordInput" :feedback="false" v-model="password" :class="{ 'p-invalid': error }"/>
                    <small v-show="error" :class="{ 'p-invalid': error }">Wrong username or password.</small>
                </div>
            </div>
            <Button type="submit" label="Login" id="loginButton"/>
        </form>
    </div>
</template>

<script>

import superagent from 'superagent';

export default {
    name: 'Login',
    emits: [ 'success' ],
    data() {
        return {
            username: '',
            password: '',
            error: false,
            busy: false
        };
    },
    methods: {
        onLogin() {
            var that = this;

            that.error = false;
            that.busy = true;

            superagent.post('/api/v1/login', { username: this.username, password: this.password }).end(function (error, result) {
                that.busy = false;

                if (error && error.status === 403) {
                    that.error = 'Invalid username or password';
                    that.password = '';
                    return;
                }
                if (error) return console.error(error);

                that.$emit('success', result.body.accessToken, result.body.user);

                that.username = '';
                that.password = '';
            });
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
