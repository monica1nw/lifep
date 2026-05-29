// ===== TODO MODULE =====

const TodoModule = {
  selectedPriority: 'ต่ำ',

  // Initialize
  init() {
    this.bindEvents();
    this.render();
  },

  // Bind all events
  bindEvents() {
    // Add todo button
    document.getElementById('btn-add-todo').addEventListener('click', () => this.add());

    // Enter key on input
    document.getElementById('todo-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.add();
    });

    // Priority buttons
    document.querySelectorAll('.priority-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedPriority = btn.dataset.p;
      });
    });
  },

  // Add new todo
  add() {
    const input = document.getElementById('todo-input');
    const text = input.value.trim();

    if (!text) return;

    DB.add('todos', {
      text,
      done: false,
      priority: this.selectedPriority
    });

    input.value = '';
    this.render();
  },

  // Toggle todo status
  toggle(id) {
    const todo = DB.getById('todos', id);
    if (todo) {
      DB.update('todos', id, { done: !todo.done });
      this.render();
    }
  },

  // Delete todo
  delete(id) {
    DB.delete('todos', id);
    this.render();
  },

  // Render all todos
  render() {
    const todos = DB.get('todos');
    const active = todos.filter(t => !t.done);
    const done = todos.filter(t => t.done);

    // Update stats
    document.getElementById('stat-total').textContent = todos.length;
    document.getElementById('stat-done').textContent = done.length;
    document.getElementById('stat-left').textContent = active.length;

    // Sort by priority (สูง > กลาง > ต่ำ)
    const orderMap = { 'สูง': 0, 'กลาง': 1, 'ต่ำ': 2 };
    const sortedActive = [...active].sort((a, b) => orderMap[a.priority] - orderMap[b.priority]);

    // Render active todos
    document.getElementById('todo-active').innerHTML = sortedActive.length
      ? sortedActive.map(t => this.renderItem(t)).join('')
      : `<div class="empty-state"><i class="ti ti-mood-happy"></i><p>ยังไม่มีงาน เพิ่มงานใหม่ได้เลย 🎉</p></div>`;

    // Render done todos
    document.getElementById('todo-done').innerHTML = done.length
      ? done.map(t => this.renderItem(t)).join('')
      : `<p style="color:var(--text3);font-size:14px;padding:0.5rem 0">ยังไม่มีงานที่เสร็จ</p>`;

    // Attach event listeners to new elements
    this.attachItemEvents();
  },

  // Render single todo item
  renderItem(todo) {
    return `
      <div class="todo-item" data-id="${todo.id}">
        <div class="todo-check ${todo.done ? 'done' : ''}" data-action="toggle"></div>
        <span class="todo-text ${todo.done ? 'done' : ''}">${escHtml(todo.text)}</span>
        <span class="priority-badge p-${todo.priority}">${todo.priority}</span>
        <button class="todo-del" data-action="delete" aria-label="ลบ"><i class="ti ti-trash"></i></button>
      </div>
    `;
  },

  // Attach events to todo items
  attachItemEvents() {
    document.querySelectorAll('.todo-item').forEach(item => {
      const id = Number(item.dataset.id);

      item.querySelector('[data-action="toggle"]')?.addEventListener('click', () => this.toggle(id));
      item.querySelector('[data-action="delete"]')?.addEventListener('click', () => this.delete(id));
    });
  }
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  TodoModule.init();
  DB.onReady(() => TodoModule.render());
});
