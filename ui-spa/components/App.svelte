<script>
  import { appController } from '../controllers/index.js'
  let appName = 'Hyperdrive Gateway'
  const openHyperdriveTab = appController.openHyperdriveTab.bind(appController)
  let form
  const submitForm = () => form.submit()
</script>

<style>
  header {
      text-align: center;
      padding: 2rem 1rem;
    }
    h1 {
      margin-bottom: 0.5rem;
    }
    section {
      width: 100%;
      padding: 1rem 0;
    }
    .hyperdrive-uri-section {
      display: flex;
      justify-content: center;
    }
    .hyperdrive-uri-card {
      width: 100%;
      max-width: 800px;
    }
    .hyperdrive-uri-card [slot="header"] {
      display: flex; 
      align-items: center; 
      justify-content: space-between;
    }

    .hyperdrive-uri-card h3 {
      margin: 0;
    }
</style>


<header>
  <h1>{appName}</h1>
  <p>A <a href="https://hypercore-protocol.org/">hyperdrive</a> gateway</p>
</header>
<main>
  <section class="hyperdrive-uri-section">
    <sl-card class="hyperdrive-uri-card">
      <div slot="header">
        Hyperdrive URL
        <sl-button on:sl-click={submitForm} class="open-btn" size="small" pill submit>Open</sl-button>
      </div>
      <sl-form class="hyperdrive-uri-form" on:sl-submit={openHyperdriveTab} bind:this={form}>
        <sl-input
          name="uri"
          placeholder="hyper://d3b1ab6b6e703f02ecc2ad1909b5ee8e7a0da6498e56a2d9f09bf75f081d8c65"
        ></sl-input>
      </sl-form>
    </sl-card>
  </section>
</main>
