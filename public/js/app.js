// app.js - メインアプリケーション
const EstateApp = {
    currentTab: 'dashboard',
    notificationCheckInterval: null,

    init() {
        // 権限管理の初期化（最初に実行）
        Permissions.init();
        
        // スタッフ管理の初期化
        Staff.init();
        
        // 権限情報が確実に読み込まれてから移行処理を実行
        setTimeout(() => {
            try {
                if (!localStorage.getItem('data_migrated_with_staff')) {
                    if (typeof Storage.migrateDataWithStaffId === 'function' && Permissions.getCurrentStaffId()) {
                        Storage.migrateDataWithStaffId();
                        localStorage.setItem('data_migrated_with_staff', 'true');
                    }
                }
            } catch (error) {
                console.error('Migration error:', error);
            }
        }, 100);
        
        this.setupTheme();
        this.setupTabs();
        this.setupEventListeners();
        this.checkNotifications();
        
        // 各モジュールの初期化（Dashboardは非同期）
        Dashboard.init().catch(error => console.error('Dashboard init error:', error));
        Inventory.init();
        Sales.init();
        Transactions.init();
        Yearly.init();
        Reports.init();
        Export.init();
        Notifications.init();
        Calendar.init();
        Goals.init();
        Todos.init();
        Memos.init();
        
        // 定期的な通知チェック（5分ごと）
        this.notificationCheckInterval = setInterval(() => {
            this.checkNotifications();
        }, 5 * 60 * 1000);
        
        // 自動同期を設定
        this.setupAutoSync();
        
        // PWA対応
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(e => console.log('SW registration failed'));
        }
    },

    setupTheme() {
        const savedTheme = Storage.getTheme();
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        document.getElementById('theme-toggle').addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            Storage.setTheme(newTheme);
        });
    },

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                this.currentTab = targetTab;
                
                // ボタンのアクティブ状態を更新
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // タブコンテンツの表示を更新
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `${targetTab}-tab`) {
                        content.classList.add('active');
                    }
                });
                
                // タブ切り替え時の処理
                switch (targetTab) {
                    case 'dashboard':
                        Dashboard.refresh();
                        Calendar.render();
                        break;
                    case 'inventory':
                        Inventory.renderPropertyList();
                        break;
                    case 'sales':
                        Sales.updatePropertySelect();
                        break;
                    case 'transactions':
                        Transactions.renderTransactionList();
                        break;
                    case 'yearly':
                        Yearly.renderYearlyReport();
                        break;
                    case 'reports':
                        // 必要に応じて初期化
                        break;
                }
            });
        });
    },

    setupEventListeners() {
        // 通知ボタン
        document.getElementById('notification-btn').addEventListener('click', () => {
            Notifications.togglePanel();
        });
        
        // 設定の保存
        document.getElementById('notification-days').addEventListener('change', (e) => {
            const settings = Storage.getSettings();
            settings.notificationDays = parseInt(e.target.value);
            Storage.saveSettings(settings);
        });
        
        document.getElementById('default-tax-rate').addEventListener('change', (e) => {
            const settings = Storage.getSettings();
            settings.defaultTaxRate = parseInt(e.target.value);
            Storage.saveSettings(settings);
        });
        
        document.getElementById('enable-browser-notification').addEventListener('change', (e) => {
            const settings = Storage.getSettings();
            settings.enableBrowserNotification = e.target.checked;
            Storage.saveSettings(settings);
            
            if (e.target.checked) {
                this.requestNotificationPermission();
            }
        });
        
        // 設定の読み込み
        const settings = Storage.getSettings();
        document.getElementById('notification-days').value = settings.notificationDays;
        document.getElementById('default-tax-rate').value = settings.defaultTaxRate;
        document.getElementById('enable-browser-notification').checked = settings.enableBrowserNotification;
    },

    checkNotifications() {
        const settings = Storage.getSettings();
        const deadlines = Storage.getUpcomingDeadlines(settings.notificationDays);
        
        // 新しい通知を作成
        deadlines.forEach(deadline => {
            const existingNotifications = Storage.getNotifications();
            const today = new Date().toDateString();
            
            // 通知の一意性を確保するためのキー生成
            let notificationKey = '';
            if (deadline.property) {
                notificationKey = `${deadline.property.id}-${deadline.type}`;
            } else if (deadline.sale) {
                notificationKey = `${deadline.sale.id}-${deadline.type}`;
            }
            
            // 同じキーの通知が今日既に作成されているかチェック
            const alreadyNotified = existingNotifications.some(n => {
                const nKey = n.propertyId ? `${n.propertyId}-${n.type}` : `${n.saleId}-${n.type}`;
                return nKey === notificationKey && 
                       new Date(n.createdAt).toDateString() === today;
            });
            
            if (!alreadyNotified && notificationKey) {
                const notification = {
                    type: deadline.type,
                    propertyId: deadline.property?.id,
                    saleId: deadline.sale?.id,
                    propertyName: deadline.propertyName || deadline.property?.name,
                    message: deadline.message,
                    urgent: deadline.urgent
                };
                
                Storage.saveNotification(notification);
                
                // ブラウザ通知
                if (settings.enableBrowserNotification && 'Notification' in window) {
                    this.showBrowserNotification(notification);
                }
            }
        });
        
        // 通知バッジを更新
        this.updateNotificationBadge();
    },

    updateNotificationBadge() {
        const notifications = Storage.getNotifications();
        const unreadCount = notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notification-badge');
        
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    },

    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    EstateApp.showToast('ブラウザ通知を有効にしました');
                } else {
                    EstateApp.showToast('ブラウザ通知が拒否されました', 'danger');
                }
            } catch (error) {
                console.error('Notification permission error:', error);
            }
        }
    },

    showBrowserNotification(notification) {
        if (Notification.permission === 'granted') {
            const n = new Notification('不動産管理システム', {
                body: `${notification.propertyName}: ${notification.message}`,
                icon: 'icons/icon-192.png',
                badge: 'icons/icon-192.png',
                tag: notification.propertyId || notification.saleId
            });
            
            n.onclick = () => {
                window.focus();
                if (notification.propertyId) {
                    document.querySelector('[data-tab="inventory"]').click();
                } else if (notification.saleId) {
                    document.querySelector('[data-tab="transactions"]').click();
                }
                n.close();
            };
        }
    },

    // 自動同期機能
    async syncData(showMessage = true) {
        const token = sessionStorage.getItem('auth_token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        try {
            if (showMessage) {
                EstateApp.showToast('同期中...', 'info');
            }
            
            // 現在のデータバージョンを取得
            const currentVersion = localStorage.getItem('data_version') || '0';
            
            // データを保存
            const data = Storage.exportData();
            const response = await fetch('/.netlify/functions/sync-data', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'save',
                    data: data,
                    version: currentVersion
                })
            });

            const result = await response.json();
            if (result.success) {
                // 新しいバージョンを保存
                if (result.version) {
                    localStorage.setItem('data_version', result.version);
                }
                
                if (showMessage) {
                    EstateApp.showToast('データを同期しました');
                }
                
                // 他のユーザーの更新をチェック
                await this.checkForUpdates();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Sync error:', error);
            if (showMessage) {
                EstateApp.showToast('同期に失敗しました', 'danger');
            }
        }
    },

    // 更新チェック
    async checkForUpdates() {
        const token = sessionStorage.getItem('auth_token');
        if (!token) return;
        
        try {
            const response = await fetch('/.netlify/functions/sync-data', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    action: 'check',
                    lastSync: localStorage.getItem('last_sync_time') || '0'
                })
            });
            
            const result = await response.json();
            
            if (result.hasUpdate && result.updatedBy !== Permissions.getCurrentStaffId()) {
                // 他のユーザーによる更新がある場合
                this.showUpdateNotification();
            }
            
            localStorage.setItem('last_sync_time', new Date().toISOString());
        } catch (error) {
            console.error('Update check error:', error);
        }
    },

    // 自動同期の設定
    setupAutoSync() {
        // 3分ごとに同期（サイレント）
        setInterval(() => {
            if (navigator.onLine) {
                this.syncData(false); // メッセージなしで同期
            }
        }, 3 * 60 * 1000);
        
        // ページがアクティブになったときも同期
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && navigator.onLine) {
                this.syncData(false);
            }
        });
        
        // オンラインに戻ったとき
        window.addEventListener('online', () => {
            this.syncData(true);
        });
        
        // オフラインになったとき
        window.addEventListener('offline', () => {
            EstateApp.showToast('オフラインモードです。変更は次回接続時に同期されます', 'warning');
        });
    },

    // 更新通知の表示
    showUpdateNotification() {
        // 編集中のモーダルがある場合は通知しない
        if (document.querySelector('.modal[style*="display: flex"]')) {
            return;
        }
        
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <div class="update-notification-content">
                <span>📢 他のユーザーがデータを更新しました</span>
                <button class="secondary-btn" onclick="location.reload()">ページを更新</button>
                <button class="close-btn" onclick="this.closest('.update-notification').remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 10秒後に自動で消す
        setTimeout(() => {
            notification.remove();
        }, 10000);
    },

    // モーダル関連
    closePropertyModal() {
        document.getElementById('property-modal').style.display = 'none';
        document.getElementById('property-form').reset();
    },

    closeNotificationPanel() {
        document.getElementById('notification-panel').style.display = 'none';
    },

    // ユーティリティ関数
    formatCurrency(amount, showTaxLabel = true) {
        const formatted = new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY',
            minimumFractionDigits: 0
        }).format(amount);
        
        // 税抜き表示の場合
        if (showTaxLabel) {
            return formatted + '（税抜）';
        }
        return formatted;
    },

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP');
    },

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: ${type === 'success' ? 'var(--success-color)' : type === 'danger' ? 'var(--danger-color)' : 'var(--info-color)'};
            color: white;
            padding: 1rem 2rem;
            border-radius: var(--border-radius);
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 1000;
            animation: slideUp 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// アニメーション用CSS追加
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from {
            transform: translate(-50%, 100%);
            opacity: 0;
        }
        to {
            transform: translate(-50%, 0);
            opacity: 1;
        }
    }
    
    @keyframes slideDown {
        from {
            transform: translate(-50%, 0);
            opacity: 1;
        }
        to {
            transform: translate(-50%, 100%);
            opacity: 0;
        }
    }
    
    .toast {
        animation: slideUp 0.3s ease;
    }
`;
document.head.appendChild(style);

// DOMContentLoaded後に初期化
document.addEventListener('DOMContentLoaded', () => {
    EstateApp.init();
});

// グローバルスコープに公開
window.EstateApp = EstateApp;
window.syncData = () => EstateApp.syncData(true);
window.logout = function() {
    if (confirm('ログアウトしますか？')) {
        sessionStorage.clear();
        window.location.href = '/login.html';
    }
};

// 起動時にデータ読み込み
window.addEventListener('DOMContentLoaded', async () => {
    const token = sessionStorage.getItem('auth_token');
    if (token) {
        try {
            // ローカルデータのバックアップ
            const localBackup = {
                properties: Storage.getProperties(),
                sales: Storage.getSales(),
                goals: Storage.getGoals(),
                memos: Storage.getMemos(),
                todos: Storage.getTodos(),
                notifications: Storage.getNotifications()
            };
            
            const response = await fetch('/.netlify/functions/sync-data', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'load' })
            });

            const result = await response.json();
            if (result.success && result.data) {
                // サーバーデータが空の場合はローカルデータを保持
                const serverData = result.data;
                const mergedData = {
                    properties: serverData.properties?.length > 0 ? serverData.properties : localBackup.properties,
                    sales: serverData.sales?.length > 0 ? serverData.sales : localBackup.sales,
                    goals: serverData.goals?.length > 0 ? serverData.goals : localBackup.goals,
                    memos: serverData.memos?.length > 0 ? serverData.memos : localBackup.memos,
                    todos: serverData.todos?.length > 0 ? serverData.todos : localBackup.todos,
                    notifications: serverData.notifications || localBackup.notifications,
                    settings: serverData.settings || Storage.getSettings()
                };
                
                Storage.importData(mergedData);
                EstateApp.showToast('データを読み込みました');
                
                // バージョン情報を保存
                if (result.version) {
                    localStorage.setItem('data_version', result.version);
                }
            } else {
                // サーバーからデータが取得できない場合はローカルデータを維持
                console.log('サーバーデータが取得できないため、ローカルデータを使用します');
            }
        } catch (error) {
            console.error('データ読み込みエラー:', error);
            EstateApp.showToast('ローカルデータを使用します', 'info');
        }
    }
});

// グローバルスコープに公開
window.EstateApp = EstateApp;
