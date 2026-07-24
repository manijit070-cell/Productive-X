import { api } from '../api.js';
import { showToast, customPrompt, customConfirm } from '../components/ui.js';

export async function initTasks() {
  const container = document.getElementById('kanban-container');
  container.innerHTML = `
    <div class="kanban-column card glass" data-status="To Do">
      <h3 style="margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid var(--primary-color)">To Do</h3>
      <div class="kanban-items" id="col-todo"></div>
    </div>
    <div class="kanban-column card glass" data-status="In Progress">
      <h3 style="margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid var(--warning-color)">In Progress</h3>
      <div class="kanban-items" id="col-inprogress"></div>
    </div>
    <div class="kanban-column card glass" data-status="Review">
      <h3 style="margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid var(--accent-color)">Review</h3>
      <div class="kanban-items" id="col-review"></div>
    </div>
    <div class="kanban-column card glass" data-status="Completed">
      <h3 style="margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid var(--success-color)">Completed</h3>
      <div class="kanban-items" id="col-completed"></div>
    </div>
  `;

  await loadTasks();
  initSortable();

  document.getElementById('btn-add-task').onclick = async () => {
    const title = await customPrompt("Enter task title:");
    if(title) {
      api.createTask({ title, status: 'To Do' }).then(() => {
        showToast('Task added');
        loadTasks();
      }).catch(err => showToast(err.message, 'error'));
    }
  };

  // Listen for AI creating tasks
  if (!window._tasksAiListenerAdded) {
    window.addEventListener('ai_refresh_tasks', loadTasks);
    window._tasksAiListenerAdded = true;
  }
}

async function loadTasks() {
  try {
    const res = await api.getTasks();
    if (res.success) {
      document.querySelectorAll('.kanban-items').forEach(el => el.innerHTML = '');

      res.data.forEach(task => {
        const col = document.querySelector(`.kanban-column[data-status="${task.status}"] .kanban-items`);
        if (col) {
          const div = document.createElement('div');
          div.className = 'kanban-card glass';
          div.setAttribute('data-id', task._id);
          div.style.padding = '1rem';
          div.style.marginBottom = '1rem';
          div.style.borderRadius = '8px';
          div.style.cursor = 'grab';
          div.style.position = 'relative';
          
          let dateHtml = '';
          if(task.dueDate) {
            const isLate = new Date(task.dueDate) < new Date() && task.status !== 'Completed';
            const color = isLate ? 'var(--danger-color)' : 'var(--warning-color)';
            dateHtml = `<span style="font-size: 0.75rem; color: ${color};"><i class="fa-regular fa-clock"></i> ${new Date(task.dueDate).toLocaleDateString()}</span>`;
          }

          div.innerHTML = `
            <div style="font-weight: 500; margin-bottom: 0.5rem;" class="task-title">${task.title}</div>
            <div class="flex justify-between items-center">
              ${dateHtml}
              <button class="btn btn-secondary btn-delete" style="padding: 0.2rem 0.5rem; font-size: 0.8rem"><i class="fa-solid fa-trash"></i></button>
            </div>
          `;
          
          // Inline edit on double click
          div.querySelector('.task-title').ondblclick = (e) => {
            const oldTitle = e.target.innerText;
            const input = document.createElement('input');
            input.type = 'text';
            input.value = oldTitle;
            input.className = 'form-control';
            input.style.padding = '0.2rem';
            input.style.marginBottom = '0.5rem';
            
            input.onblur = async () => {
              const newTitle = input.value;
              e.target.innerText = newTitle || oldTitle;
              e.target.style.display = 'block';
              input.remove();
              if(newTitle && newTitle !== oldTitle) {
                await api.updateTask(task._id, { title: newTitle });
              }
            };
            
            input.onkeydown = (ev) => { if(ev.key === 'Enter') input.blur(); };

            e.target.style.display = 'none';
            e.target.parentNode.insertBefore(input, e.target);
            input.focus();
          };

          div.querySelector('.btn-delete').onclick = async () => {
            if(await customConfirm("Are you sure you want to delete this task?")) {
              api.deleteTask(task._id).then(() => {
                showToast('Task deleted');
                div.remove();
              });
            }
          };

          col.appendChild(div);
        }
      });
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function initSortable() {
  const cols = document.querySelectorAll('.kanban-items');
  cols.forEach(col => {
    new Sortable(col, {
      group: 'shared',
      animation: 150,
      ghostClass: 'sortable-ghost',
      onEnd: async function (evt) {
        const itemEl = evt.item;
        const taskId = itemEl.getAttribute('data-id');
        const newStatus = evt.to.closest('.kanban-column').getAttribute('data-status');
        const oldStatus = evt.from.closest('.kanban-column').getAttribute('data-status');
        
        if(newStatus !== oldStatus) {
          try {
            await api.updateTask(taskId, { status: newStatus });
            if(newStatus === 'Completed') confetti({ particleCount: 50, spread: 60 });
          } catch(err) {
            showToast('Failed to update task status', 'error');
            // Revert DOM change if failed
            evt.from.insertBefore(itemEl, evt.from.children[evt.oldIndex]);
          }
        }
      },
    });
  });
}
