<template>
    <div id="app">
        <section class="app-scaffold">
            <nav>
                <!-- TODO add a nav bar :V -->
            </nav>

            <main>
                <div class="content-container">
                    <div class="page-title">
                        <div class="logo"></div>
                        <div class="title">Minecraft Map Art Tool</div>
                        <div class="description">gamign.</div>
                    </div>

                    <div class="active-page">
                        <router-view></router-view>
                    </div>
                </div>
            </main>
        </section>
    </div>
</template>

<script>
export default {
    name: "MCMap-App"
}
</script>

<style scoped>
    #app {
        width: 100vw;
        height: 100vh;
        max-width: 100vw;
        max-height: 100vh;
        position: relative;
        overflow: hidden;
    }
    .app-scaffold {
        position: relative;
        width: 100%;
        height: 100%;

        background: black;
    }
    .app-scaffold:after {
        content: "";

        background-image: url("../img/background.png");
        background-size: cover;
        background-position: center;

        min-width: 100vw;
        min-height: 100vh;
        position: absolute;

        filter: blur(10px) brightness(69%);
    }
    .app-scaffold nav {
        position: relative;
        z-index: 2;
    }
    .app-scaffold main {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        z-index: 1;
        display: flex;
        flex-direction: column;

        justify-content: center;
        align-items: center;
    }

    /* Box Thing */
    .content-container {
        display: flex;
        position: relative;
        flex-direction: column;
        font-family: Arial, Helvetica, sans-serif;
        justify-content: center;
        align-items: center;

        justify-self: center;
        align-self: center;

        color: white;
        background: linear-gradient(to top left, rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.5) 50%);
        padding: 20px;
        border-radius: 5px;

        box-shadow: 0 14px 28px rgb(0 0 0 / 25%), 0 10px 10px rgb(0 0 0 / 22%);
    }

    /* Title */
    .page-title {
        text-align: center;
        align-items: center;
        display: flex;
        justify-content: center;
        flex-direction: column;
        padding-bottom: 25px
    }
    .page-title > .title {
        font-weight: bold;
        font-size: 28px;
    }
    .page-title > .logo {
        width: 96px;
        height: 96px;
        background-image: url('../img/logo.png');
        background-size: contain;
        background-repeat: no-repeat;

        padding-bottom: 10px;
    }

    .page-title > .description {
        font-style: italic;
    }

    /* Page View */
    .active-page {
        border: 1px rgba(255, 255, 255, 0.1) solid;
        border-radius: 3px;
        width: 100%;
    }
</style>