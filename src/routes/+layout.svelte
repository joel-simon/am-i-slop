<script lang="ts">
  import "../app.css";
</script>

<slot />

<style>
  :global(body) {
    background-color: #181c1f;
    color: #c7f774;
    font-family: "Terminal Grotesque", "Fira Mono", "Consolas", monospace;
    margin: 0;
    padding: 0;
    min-height: 100vh;
    letter-spacing: 0.01em;
    font-size: 1.08em;
  }
  :global(html) {
    font-family: "Terminal Grotesque Open", "Fira Mono", "Consolas", monospace;
    background: #181c1f;
    color: #c7f774;
    height: 100%;
  }
  :global(*) {
    box-sizing: border-box;
  }
</style>
