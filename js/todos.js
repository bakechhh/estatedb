// todos.js - TODO管理機能
const Todos = {
    notificationTimers: new Map(),

    init() {
        this.setupEventListeners();
        this.loadTodos();
        this.scheduleNotifications();
    },

    setupEventListeners() {
        // TODO関連のイベントリスナー設定
    },

    saveTodo(title, description, dueDate, priority = 'normal', category = 'general', repeat = 'none') {
        const todo = {
            id: Date.now().toString(),
            title,
            description,
            dueDate,
            priority, // 'high', 'normal', 'low'
            category,
            repeat, // 'none', 'daily', 'weekly', 'monthly'
            completed: false,
            completedAt: null,
            createdAt: new Date().toISOString()
        };
        
        Storage.saveTodo(todo);
        this.scheduleNotification(todo);
        EstateApp.showToast('TODOを追加しました');
        
        if (EstateApp.currentTab === 'dashboard') {
            this.renderTodoWidget();
        }
        
        return todo;
    },

    updateTodo(todoId, updates) {
        const todo = Storage.getTodo(todoId);
        if (todo) {
            Object.assign(todo, updates);
            Storage.updateTodo(todo);
            
            // 通知の再スケジュール
            this.cancelNotification(todoId);
            if (!todo.completed && todo.dueDate) {
                this.scheduleNotification(todo);
            }
            
            EstateApp.showToast('TODOを更新しました');
        }
    },

    completeTodo(todoId) {
        const todo = Storage.getTodo(todoId);
        if (todo) {
            todo.completed = true;
            todo.completedAt = new Date().toISOString();
            Storage.updateTodo(todo);
            
            // 通知をキャンセル
            this.cancelNotification(todoId);
            
            // 繰り返しタスクの場合は次のタスクを作成
            if (todo.repeat !== 'none') {
                this.createNextRepeatTodo(todo);
            }
            
            // 完了アニメーション
            this.showTodoCompleteAnimation();
            
            if (EstateApp.currentTab === 'dashboard') {
                this.renderTodoWidget();
            }
        }
    },

    createNextRepeatTodo(originalTodo) {
        const nextDueDate = new Date(originalTodo.dueDate);
        
        switch (originalTodo.repeat) {
            case 'daily':
                nextDueDate.setDate(nextDueDate.getDate() + 1);
                break;
            case 'weekly':
                nextDueDate.setDate(nextDueDate.getDate() + 7);
                break;
            case 'monthly':
                nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                break;
        }
        
        this.saveTodo(
            originalTodo.title,
            originalTodo.description,
            nextDueDate.toISOString(),
            originalTodo.priority,
            originalTodo.category,
            originalTodo.repeat
        );
    },

    deleteTodo(todoId) {
        if (confirm('このTODOを削除しますか？')) {
            Storage.deleteTodo(todoId);
            this.cancelNotification(todoId);
            EstateApp.showToast('TODOを削除しました');
            
            if (EstateApp.currentTab === 'dashboard') {
                this.renderTodoWidget();
            }
        }
    },

    scheduleNotification(todo) {
        if (!todo.dueDate || todo.completed) return;
        
        const dueDate = new Date(todo.dueDate);
        const now = new Date();
        
        // 1時間前に通知
        const notificationTime = new Date(dueDate.getTime() - 60 * 60 * 1000);
        
        if (notificationTime > now) {
            const timeUntilNotification = notificationTime.getTime() - now.getTime();
            
            const timerId = setTimeout(() => {
                this.showTodoNotification(todo);
                this.notificationTimers.delete(todo.id);
            }, timeUntilNotification);
            
            this.notificationTimers.set(todo.id, timerId);
        }
    },

    scheduleNotifications() {
        const todos = Storage.getTodos().filter(todo => !todo.completed && todo.dueDate);
        todos.forEach(todo => this.scheduleNotification(todo));
    },

    cancelNotification(todoId) {
        const timerId = this.notificationTimers.get(todoId);
        if (timerId) {
            clearTimeout(timerId);
            this.notificationTimers.delete(todoId);
        }
    },

    showTodoNotification(todo) {
        // ブラウザ通知
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('TODOリマインダー', {
                body: `${todo.title}\n期限: ${EstateApp.formatDate(todo.dueDate)}`,
                icon: 'icons/icon-192.png',
                tag: todo.id
            });
            
            notification.onclick = () => {
                window.focus();
                this.showTodoDetail(todo.id);
                notification.close();
            };
        }
        
        // アプリ内通知
        const alert = document.createElement('div');
        alert.className = 'todo-alert';
        alert.innerHTML = `
            <div class="todo-alert-content">
                <h4>📌 TODOリマインダー</h4>
                <p>${todo.title}</p>
                <p class="todo-alert-due">期限: ${EstateApp.formatDate(todo.dueDate)}</p>
                <div class="todo-alert-actions">
                    <button onclick="Todos.completeTodo('${todo.id}'); this.closest('.todo-alert').remove()">完了</button>
                    <button onclick="this.closest('.todo-alert').remove()">後で</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.classList.add('fade-out');
            setTimeout(() => alert.remove(), 500);
        }, 10000);
    },

    renderTodoWidget() {
        const container = document.getElementById('todo-widget');
        if (!container) return;
        
        const todos = Storage.getTodos()
            .filter(todo => !todo.completed)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 5);
        
        container.innerHTML = `
            <h3>📋 TODO</h3>
            <div class="todo-list">
                ${todos.length === 0 ? '<p class="no-data">TODOはありません</p>' : ''}
                ${todos.map(todo => `
                    <div class="todo-item priority-${todo.priority}">
                        <input type="checkbox" id="todo-${todo.id}" onchange="Todos.completeTodo('${todo.id}')">
                        <label for="todo-${todo.id}">
                            <span class="todo-title">${todo.title}</span>
                            <span class="todo-due">${this.formatDueDate(todo.dueDate)}</span>
                        </label>
                    </div>
                `).join('')}
            </div>
            <button class="add-todo-btn" onclick="Todos.showTodoModal()">+ TODO追加</button>
        `;
    },

    formatDueDate(dueDate) {
        const due = new Date(dueDate);
        const now = new Date();
        const diffTime = due - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            return `<span class="overdue">${Math.abs(diffDays)}日超過</span>`;
        } else if (diffDays === 0) {
            return '<span class="today">今日</span>';
        } else if (diffDays === 1) {
            return '<span class="tomorrow">明日</span>';
        } else if (diffDays <= 7) {
            return `${diffDays}日後`;
        } else {
            return EstateApp.formatDate(dueDate);
        }
    },

    showTodoModal(todoId = null) {
        const todo = todoId ? Storage.getTodo(todoId) : null;
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal-content">
                <h3>${todo ? 'TODO編集' : '新規TODO'}</h3>
                <form id="todo-form">
                    <div class="form-group">
                        <label for="todo-title">タイトル</label>
                        <input type="text" id="todo-title" required value="${todo?.title || ''}">
                    </div>
                    <div class="form-group">
                        <label for="todo-description">詳細</label>
                        <textarea id="todo-description" rows="3">${todo?.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="todo-due-date">期限</label>
                        <input type="datetime-local" id="todo-due-date" required 
                               value="${todo ? new Date(todo.dueDate).toISOString().slice(0, 16) : ''}">
                    </div>
                    <div class="form-group">
                        <label for="todo-priority">優先度</label>
                        <select id="todo-priority">
                            <option value="low" ${todo?.priority === 'low' ? 'selected' : ''}>低</option>
                            <option value="normal" ${todo?.priority === 'normal' ? 'selected' : ''}>中</option>
                            <option value="high" ${todo?.priority === 'high' ? 'selected' : ''}>高</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="todo-category">カテゴリ</label>
                        <select id="todo-category">
                            <option value="general">一般</option>
                            <option value="property" ${todo?.category === 'property' ? 'selected' : ''}>物件関連</option>
                            <option value="customer" ${todo?.category === 'customer' ? 'selected' : ''}>顧客関連</option>
                            <option value="document" ${todo?.category === 'document' ? 'selected' : ''}>書類関連</option>
                            <option value="other" ${todo?.category === 'other' ? 'selected' : ''}>その他</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="todo-repeat">繰り返し</label>
                        <select id="todo-repeat">
                            <option value="none">なし</option>
                            <option value="daily" ${todo?.repeat === 'daily' ? 'selected' : ''}>毎日</option>
                            <option value="weekly" ${todo?.repeat === 'weekly' ? 'selected' : ''}>毎週</option>
                            <option value="monthly" ${todo?.repeat === 'monthly' ? 'selected' : ''}>毎月</option>
                        </select>
                    </div>
                    <div class="modal-actions">
                        <button type="submit" class="primary-btn">${todo ? '更新' : '追加'}</button>
                        <button type="button" class="secondary-btn" onclick="this.closest('.modal').remove()">キャンセル</button>
                    </div>
                </form>
            </div>
        `;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        document.body.appendChild(modal);
        
        // フォームサブミット
        document.getElementById('todo-form').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const title = document.getElementById('todo-title').value;
            const description = document.getElementById('todo-description').value;
            const dueDate = document.getElementById('todo-due-date').value;
            const priority = document.getElementById('todo-priority').value;
            const category = document.getElementById('todo-category').value;
            const repeat = document.getElementById('todo-repeat').value;
            
            if (todo) {
                this.updateTodo(todo.id, {
                    title,
                    description,
                    dueDate,
                    priority,
                    category,
                    repeat
                });
            } else {
                this.saveTodo(title, description, dueDate, priority, category, repeat);
            }
            
            modal.remove();
        });
    },
    
    showTodoCompleteAnimation() {
        const animation = document.createElement('div');
        animation.className = 'todo-complete-animation';
        animation.innerHTML = '✅';
        document.body.appendChild(animation);
        
        setTimeout(() => animation.remove(), 1000);
    },
    
    loadTodos() {
        this.renderTodoWidget();
    },
    
    showTodoDetail(todoId) {
        this.showTodoModal(todoId);
    }
};
// グローバルスコープに公開
window.Todos = Todos;
