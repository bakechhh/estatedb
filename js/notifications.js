// notifications.js - 通知機能
const Notifications = {
    panelOpen: false,

    init() {
        this.renderNotifications();
    },

    togglePanel() {
        const panel = document.getElementById('notification-panel');
        this.panelOpen = !this.panelOpen;
        
        if (this.panelOpen) {
            panel.style.display = 'block';
            this.renderNotifications();
        } else {
            panel.style.display = 'none';
        }
    },

    renderNotifications() {
        const notifications = Storage.getNotifications();
        const container = document.getElementById('notification-list');
        
        if (notifications.length === 0) {
            container.innerHTML = '<p style="padding: 1rem; text-align: center; color: var(--text-secondary);">通知はありません</p>';
            return;
        }
        
        container.innerHTML = notifications.map(notification => {
            const typeClass = notification.urgent ? 'warning' : 'info';
            const readClass = notification.read ? '' : 'unread';
            const time = this.getRelativeTime(notification.createdAt);
            
            return `
                <div class="notification-item ${readClass}">
                    <div onclick="Notifications.handleNotificationClick('${notification.id}')">
                        <span class="notification-type ${typeClass}">
                            ${this.getNotificationTypeText(notification.type)}
                        </span>
                        <div class="notification-message">
                            <strong>${notification.propertyName}</strong><br>
                            ${notification.message}
                        </div>
                        <div class="notification-time">${time}</div>
                    </div>
                    <button class="notification-delete-btn" onclick="Notifications.deleteNotification('${notification.id}')">×</button>
                </div>
            `;
        }).join('');
        
        // 未読数を更新
        EstateApp.updateNotificationBadge();
    },

    handleNotificationClick(notificationId) {
        // 既読にする
        Storage.markNotificationAsRead(notificationId);
        
        // 通知の内容を取得
        const notifications = Storage.getNotifications();
        const notification = notifications.find(n => n.id === notificationId);
        
        if (notification) {
            // 通知パネルを閉じる
            this.togglePanel();
            
            if (notification.propertyId) {
                // 物件詳細を表示
                document.querySelector('[data-tab="inventory"]').click();
                
                // 少し待ってから物件詳細を開く
                setTimeout(() => {
                    Inventory.showPropertyDetail(notification.propertyId);
                }, 100);
            } else if (notification.saleId) {
                // 取引詳細を表示
                document.querySelector('[data-tab="transactions"]').click();
                
                // 少し待ってから取引詳細を開く（編集モーダル）
                setTimeout(() => {
                    Transactions.editTransaction(notification.saleId);
                }, 100);
            }
        }
        
        // 通知を再表示
        this.renderNotifications();
    },

    deleteNotification(notificationId) {
        const notifications = Storage.getNotifications();
        const filtered = notifications.filter(n => n.id !== notificationId);
        localStorage.setItem(Storage.KEYS.NOTIFICATIONS, JSON.stringify(filtered));
        
        this.renderNotifications();
        EstateApp.updateNotificationBadge();
    },

    getNotificationTypeText(type) {
        const typeMap = {
            contract: '契約期限',
            reins: 'レインズ更新',
            'reins-deadline': 'レインズ登録期日',
            settlement: '決済期日',
            'loan-condition': '融資特約期日'
        };
        return typeMap[type] || type;
    },

    getRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 60) {
            return `${minutes}分前`;
        } else if (hours < 24) {
            return `${hours}時間前`;
        } else if (days < 7) {
            return `${days}日前`;
        } else {
            return date.toLocaleDateString('ja-JP');
        }
    },

    clearAllNotifications() {
        if (confirm('すべての通知を削除しますか？')) {
            Storage.clearNotifications();
            this.renderNotifications();
        }
    }
};

// グローバルスコープに公開
window.Notifications = Notifications;
