/* eslint-disable react/prop-types */
import { useState, useEffect, useMemo } from "react";
import clsx from "clsx";

const ESCAPE_KEY = 27;
const ENTER_KEY = 13;

const setFocus = (el) => el?.focus();

const LOCAL_STORAGE_KEY = "todos-solid";
function useLocalStore(value) {
  // load stored todos on init
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY),
    [store, setStore] = useState(stored ? JSON.parse(stored) : value);

  // JSON.stringify creates deps on every iterable field
  useEffect(
    () => localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store)),
    [store]
  );
  return [store, setStore];
}

const TodoItem = ({
  todo,
  store,
  toggle,
  setEditing,
  removeTodo,
  save,
  doneEditing
}) => {
  return (
    <li
      className={clsx("todo", {
        editing: store.editingTodoId === todo.id,
        completed: todo.completed
      })}
    >
      <div className="view">
        <input
          className="toggle"
          type="checkbox"
          checked={todo.completed}
          onChange={(e) => toggle(todo.id, e)}
        />
        <label onDoubleClick={() => setEditing(todo.id)}>{todo.title}</label>
        <button className="destroy" onClick={() => removeTodo(todo.id)} />
      </div>
      {store.editingTodoId === todo.id && (
        <input
          className="edit"
          defaultValue={todo.title}
          onBlur={(e) => save(todo.id, e)}
          onKeyUp={(e) => doneEditing(todo.id, e)}
          ref={setFocus}
        />
      )}
    </li>
  );
};

const TodoApp = () => {
  const [store, setStore] = useLocalStore({
      counter: 1,
      todos: [],
      showMode: "all",
      editingTodoId: null
    }),
    remainingCount = useMemo(
      () =>
        store.todos.length -
        store.todos.filter((todo) => todo.completed).length,
      [store.todos]
    ),
    filterList = (todos) => {
      if (store.showMode === "active")
        return todos.filter((todo) => !todo.completed);
      else if (store.showMode === "completed")
        return todos.filter((todo) => todo.completed);
      else return todos;
    },
    removeTodo = (todoId) =>
      setStore((s) => ({
        ...s,
        todos: s.todos.filter((item) => item.id !== todoId)
      })),
    editTodo = (todo) =>
      setStore((s) => ({
        ...s,
        todos: s.todos.map((item) => {
          if (item.id !== todo.id) return item;
          return { ...item, ...todo };
        })
      })),
    clearCompleted = () =>
      setStore((s) => ({
        ...s,
        todos: s.todos.filter((todo) => !todo.completed)
      })),
    toggleAll = (completed) =>
      setStore((s) => ({
        ...s,
        todos: s.todos.map((todo) => {
          if (todo.completed === completed) return todo;
          return { ...todo, completed };
        })
      })),
    setEditing = (todoId) => setStore((s) => ({ ...s, editingTodoId: todoId })),
    addTodo = ({ target, keyCode }) => {
      const title = target.value.trim();
      if (keyCode === ENTER_KEY && title) {
        setStore((s) => ({
          ...s,
          todos: [
            { title, id: store.counter, completed: false },
            ...store.todos
          ],
          counter: store.counter + 1
        }));
        target.value = "";
      }
    },
    save = (todoId, { target: { value } }) => {
      const title = value.trim();
      if (store.editingTodoId === todoId && title) {
        editTodo({ id: todoId, title });
        setEditing();
      }
    },
    toggle = (todoId, { target: { checked } }) =>
      editTodo({ id: todoId, completed: checked }),
    doneEditing = (todoId, e) => {
      if (e.keyCode === ENTER_KEY) save(todoId, e);
      else if (e.keyCode === ESCAPE_KEY) setEditing();
    };

  const locationHandler = () =>
    setStore((s) => ({ ...s, showMode: location.hash.slice(2) || "all" }));

  useEffect(() => {
    window.addEventListener("hashchange", locationHandler);
    return () => window.removeEventListener("hashchange", locationHandler);
  });

  return (
    <section className="todoapp">
      <header className="header">
        <h1>todos</h1>
        <input
          className="new-todo"
          placeholder="What needs to be done?"
          onKeyDown={addTodo}
        />
      </header>

      {store.todos.length > 0 && (
        <>
          <section className="main">
            <input
              id="toggle-all"
              className="toggle-all"
              type="checkbox"
              checked={!remainingCount}
              onChange={({ target: { checked } }) => toggleAll(checked)}
            />
            <label htmlFor="toggle-all" />
            <ul className="todo-list">
              {filterList(store.todos).map((todo) => (
                <TodoItem
                  key={todo.id}
                  {...{
                    todo,
                    store,
                    toggle,
                    setEditing,
                    removeTodo,
                    save,
                    doneEditing
                  }}
                />
              ))}
            </ul>
          </section>

          <footer className="footer">
            <span className="todo-count">
              <strong>{remainingCount}</strong>{" "}
              {remainingCount === 1 ? " item " : " items "} left
            </span>
            <ul className="filters">
              <li>
                <a
                  href="#/"
                  className={clsx({ selected: store.showMode === "all" })}
                >
                  All
                </a>
              </li>
              <li>
                <a
                  href="#/active"
                  className={clsx({ selected: store.showMode === "active" })}
                >
                  Active
                </a>
              </li>
              <li>
                <a
                  href="#/completed"
                  className={clsx({ selected: store.showMode === "completed" })}
                >
                  Completed
                </a>
              </li>
            </ul>
            {remainingCount !== store.todos.length && (
              <button className="clear-completed" onClick={clearCompleted}>
                Clear completed
              </button>
            )}
          </footer>
        </>
      )}
    </section>
  );
};

export default TodoApp;
