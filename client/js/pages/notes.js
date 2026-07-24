import { api } from '../api.js';
import { showToast, customConfirm } from '../components/ui.js';

let masonryInstance = null;
const colors = ['#1E293B', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export async function initNotes() {
  const container = document.getElementById('module-notes');
  container.innerHTML = `
    <div class="flex justify-between items-center" style="margin-bottom: 2rem;">
      <h2>Notes</h2>
      <button class="btn btn-primary" id="btn-add-note"><i class="fa-solid fa-plus"></i> New Note</button>
    </div>
    <div id="notes-grid" style="width: 100%;"></div>
  `;

  await loadNotes();

  document.getElementById('btn-add-note').onclick = () => {
    // Quick Add Note UI
    api.createNote({ title: 'New Note', content: 'Start typing...', colorLabel: '#1E293B' }).then(() => {
      loadNotes();
    });
  };
}

async function loadNotes() {
  try {
    const res = await api.getNotes();
    if(res.success) {
      const grid = document.getElementById('notes-grid');
      grid.innerHTML = '';
      
      res.data.forEach(note => {
        const div = document.createElement('div');
        div.className = 'note-item';
        div.style.width = '300px';
        div.style.margin = '10px';
        div.style.backgroundColor = note.colorLabel || '#1E293B';
        div.style.borderRadius = '12px';
        div.style.padding = '1.5rem';
        div.style.border = '1px solid var(--card-border)';
        div.style.position = 'relative';
        div.style.transition = 'transform 0.2s';
        
        let colorOptionsHtml = colors.map(c => `<div class="color-dot" data-color="${c}" style="width:15px;height:15px;border-radius:50%;background:${c};cursor:pointer;border:1px solid #fff"></div>`).join('');

        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; margin-bottom: 1rem;">
            <input type="text" class="note-title" value="${note.title}" style="background:transparent; border:none; color:white; font-size:1.1rem; font-weight:600; width:80%; outline:none;">
            <i class="fa-solid fa-thumbtack btn-pin" style="color: ${note.isPinned ? 'var(--warning-color)' : 'var(--text-muted)'}; cursor:pointer;"></i>
          </div>
          <textarea class="note-content" style="background:transparent; border:none; color:var(--text-main); width:100%; min-height:100px; resize:none; outline:none; font-family:inherit;">${note.content}</textarea>
          <div style="display:flex; justify-content:space-between; margin-top:1rem; align-items:center;">
            <div class="color-picker flex gap-1" style="opacity:0; transition:0.2s;">
              ${colorOptionsHtml}
            </div>
            <i class="fa-solid fa-trash btn-delete" style="cursor:pointer; color:rgba(239, 68, 68, 0.7)"></i>
          </div>
        `;

        // Hover effect to show color picker
        div.onmouseenter = () => div.querySelector('.color-picker').style.opacity = '1';
        div.onmouseleave = () => div.querySelector('.color-picker').style.opacity = '0';

        // Event listeners
        let typingTimer;
        const saveNote = () => {
          clearTimeout(typingTimer);
          typingTimer = setTimeout(async () => {
            const newTitle = div.querySelector('.note-title').value;
            const newContent = div.querySelector('.note-content').value;
            await api.updateNote(note._id, { title: newTitle, content: newContent });
          }, 1000); // Debounce 1 second
        };

        div.querySelector('.note-title').oninput = saveNote;
        div.querySelector('.note-content').oninput = () => {
          // Auto resize textarea
          const txt = div.querySelector('.note-content');
          txt.style.height = 'auto';
          txt.style.height = txt.scrollHeight + 'px';
          saveNote();
          if(masonryInstance) masonryInstance.layout(); // Relayout masonry
        };

        div.querySelector('.btn-pin').onclick = async () => {
          await api.updateNote(note._id, { isPinned: !note.isPinned });
          loadNotes();
        };

        div.querySelector('.btn-delete').onclick = async () => {
          if(await customConfirm("Are you sure you want to delete this note?")) {
            api.deleteNote(note._id).then(() => loadNotes());
          }
        };

        div.querySelectorAll('.color-dot').forEach(dot => {
          dot.onclick = async () => {
            const c = dot.getAttribute('data-color');
            await api.updateNote(note._id, { colorLabel: c });
            div.style.backgroundColor = c;
          };
        });

        grid.appendChild(div);
      });

      // Initialize Masonry
      setTimeout(() => {
        masonryInstance = new Masonry(grid, {
          itemSelector: '.note-item',
          columnWidth: 320,
          fitWidth: true
        });
        
        // Setup initial textareas heights
        document.querySelectorAll('.note-content').forEach(txt => {
          txt.style.height = txt.scrollHeight + 'px';
        });
        masonryInstance.layout();
      }, 100);
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}
