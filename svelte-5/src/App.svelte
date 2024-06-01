<script>
  const ENTER_KEY = 13;
  const ESCAPE_KEY = 27;

  let currentFilter = $state("all");
  let items = $state([]);
  let editing = $state(null);

  try {
    items = JSON.parse(localStorage.getItem("todos-svelte")) || [];
  } catch (err) {
    items = [];
  }

  const updateView = () => {
    currentFilter = "all";
    if (window.location.hash === "#/active") {
      currentFilter = "active";
    } else if (window.location.hash === "#/completed") {
      currentFilter = "completed";
    }
  };

  updateView();

  function clearCompleted() {
    items = items.filter((item) => !item.completed);
  }

  function remove(index) {
    items = items.slice(0, index).concat(items.slice(index + 1));
  }

  function toggleAll(event) {
    items.forEach((item) => {
      item.completed = event.target.checked;
    });
  }

  function createNew(event) {
    if (event.which === ENTER_KEY) {
      items.push({
        id: Date.now(),
        description: event.target.value,
        completed: false
      });
      event.target.value = "";
    }
  }

  function handleEdit(event) {
    if (event.which === ENTER_KEY) event.target.blur();
    else if (event.which === ESCAPE_KEY) editing = null;
  }

  function submit(event) {
    items[editing].description = event.target.value;
    editing = null;
  }

  let filtered = $derived(
    currentFilter === "all"
      ? items
      : currentFilter === "completed"
        ? items.filter((item) => item.completed)
        : items.filter((item) => !item.completed)
  );

  let numActive = $derived(items.filter((item) => !item.completed).length);
  let numCompleted = $derived(items.filter((item) => item.completed).length);

  $effect(() => {
    try {
      localStorage.setItem("todos-svelte", JSON.stringify(items));
    } catch (err) {
      // noop
    }
  });
</script>

<svelte:window onhashchange={updateView} />

<header class="header">
  <h1>todos</h1>
  <input
    class="new-todo"
    onkeydown={createNew}
    placeholder="What needs to be done?"
    autofocus
  />
</header>

{#if items.length > 0}
  <section class="main">
    <input
      id="toggle-all"
      class="toggle-all"
      type="checkbox"
      onchange={toggleAll}
      checked={numCompleted === items.length}
    />
    <label for="toggle-all">Mark all as complete</label>

    <ul class="todo-list">
      {#each filtered as item, index (item.id)}
        <li class:completed={item.completed} class:editing={editing === index}>
          <div class="view">
            <input
              class="toggle"
              type="checkbox"
              bind:checked={item.completed}
            />
            <label ondblclick={() => (editing = index)}
              >{item.description}</label
            >
            <button onclick={() => remove(index)} class="destroy"></button>
          </div>

          {#if editing === index}
            <input
              value={item.description}
              id="edit"
              class="edit"
              onkeydown={handleEdit}
              onblur={submit}
              autofocus
            />
          {/if}
        </li>
      {/each}
    </ul>

    <footer class="footer">
      <span class="todo-count">
        <strong>{numActive}</strong>
        {numActive === 1 ? "item" : "items"} left
      </span>

      <ul class="filters">
        <li>
          <a class={currentFilter === "all" ? "selected" : ""} href="#/">All</a>
        </li>
        <li>
          <a
            class={currentFilter === "active" ? "selected" : ""}
            href="#/active">Active</a
          >
        </li>
        <li>
          <a
            class={currentFilter === "completed" ? "selected" : ""}
            href="#/completed">Completed</a
          >
        </li>
      </ul>

      {#if numCompleted}
        <button class="clear-completed" onclick={clearCompleted}>
          Clear completed
        </button>
      {/if}
    </footer>
  </section>
{/if}
