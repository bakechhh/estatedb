// storage.js - LocalStorage管理
const Storage = {
   KEYS: {
       PROPERTIES: 'estate_properties',
       SALES: 'estate_sales',
       SETTINGS: 'estate_settings',
       THEME: 'estate_theme',
       NOTIFICATIONS: 'estate_notifications',
       GOALS: 'estate_goals',
       MEMOS: 'estate_memos',
       TODOS: 'estate_todos'
   },

   // getProperties も修正（削除されていないものだけ返す）
    getProperties() {
        const data = localStorage.getItem(this.KEYS.PROPERTIES);
        const allProperties = data ? JSON.parse(data) : [];
        // 削除フラグが立っていないものだけ返す
        return allProperties.filter(p => !p.deleted);
    },


    // 既存データに担当者IDを付与する移行処理
    migrateDataWithStaffId() {
        const currentStaffId = Permissions.getCurrentStaffId();
        
        if (!currentStaffId) {
            console.warn('Migration skipped: No staff ID found');
            return;
        }
        
        // 売上データの移行
        const sales = this.getSales();
        let salesUpdated = false;
        sales.forEach(sale => {
            if (!sale.staffId) {
                sale.staffId = currentStaffId;
                salesUpdated = true;
            }
        });
        if (salesUpdated) {
            localStorage.setItem(this.KEYS.SALES, JSON.stringify(sales));
            console.log('Sales data migrated with staff IDs');
        }
        
        // 物件データの移行
        const properties = this.getProperties();
        let propertiesUpdated = false;
        properties.forEach(property => {
            if (!property.staffId) {
                property.staffId = currentStaffId;
                propertiesUpdated = true;
            }
        });
        if (propertiesUpdated) {
            localStorage.setItem(this.KEYS.PROPERTIES, JSON.stringify(properties));
            console.log('Properties data migrated with staff IDs');
        }
        
        // 目標データの移行
        const goals = this.getGoals();
        let goalsUpdated = false;
        goals.forEach(goal => {
            // staffIdがundefinedの場合はnull（店舗目標）として扱う
            if (goal.staffId === undefined) {
                goal.staffId = null;
                goalsUpdated = true;
            }
        });
        if (goalsUpdated) {
            localStorage.setItem(this.KEYS.GOALS, JSON.stringify(goals));
            console.log('Goals data migrated');
        }
        
        console.log('Data migration completed');
    },

   saveProperty(property) {
       const properties = this.getProperties();
       
       if (!property.id) {
           property.id = Date.now().toString();
           property.createdAt = new Date().toISOString();
           property.staffId = Permissions.getCurrentStaffId(); // 自動で担当者IDを付与
           properties.unshift(property);
       } else {
           const index = properties.findIndex(p => p.id === property.id);
           if (index !== -1) {
               property.updatedAt = new Date().toISOString();
               // 既存データの場合、staffIdは変更しない（元の担当者を維持）
               properties[index] = { ...properties[index], ...property };
           }
       }
       
       localStorage.setItem(this.KEYS.PROPERTIES, JSON.stringify(properties));
       return property;
   },

   getProperty(id) {
       const properties = this.getProperties();
       return properties.find(p => p.id === id);
   },

   updateProperty(id, updates) {
       const properties = this.getProperties();
       const index = properties.findIndex(p => p.id === id);
       
       if (index !== -1) {
           properties[index] = { 
               ...properties[index], 
               ...updates,
               updatedAt: new Date().toISOString()
           };
           localStorage.setItem(this.KEYS.PROPERTIES, JSON.stringify(properties));
           return properties[index];
       }
       return null;
   },

   // storage.js の deleteProperty メソッドを修正
    deleteProperty(id) {
        const properties = this.getProperties();
        const index = properties.findIndex(p => p.id === id);
        
        if (index !== -1) {
            // 実際に削除せず、削除フラグを立てる
            properties[index].deleted = true;
            properties[index].deletedAt = new Date().toISOString();
            properties[index].updatedAt = new Date().toISOString();
            
            localStorage.setItem(this.KEYS.PROPERTIES, JSON.stringify(properties));
            return true;
        }
        return false;
    },

   // getSales も修正
    getSales() {
        const data = localStorage.getItem(this.KEYS.SALES);
        const allSales = data ? JSON.parse(data) : [];
        return allSales.filter(s => !s.deleted);
    },

   saveSale(sale) {
       const sales = this.getSales();
       sale.id = Date.now().toString();
       sale.createdAt = new Date().toISOString();
       sale.staffId = Permissions.getCurrentStaffId(); // 自動で担当者IDを付与
       sales.unshift(sale);
       localStorage.setItem(this.KEYS.SALES, JSON.stringify(sales));
       
       return sale;
   },

   updateSale(id, updates) {
       const sales = this.getSales();
       const index = sales.findIndex(s => s.id === id);
       
       if (index !== -1) {
           sales[index] = { 
               ...sales[index], 
               ...updates,
               updatedAt: new Date().toISOString()
           };
           localStorage.setItem(this.KEYS.SALES, JSON.stringify(sales));
           return sales[index];
       }
       return null;
   },

   // deleteSale も同様に修正
    deleteSale(id) {
        const sales = this.getSales();
        const index = sales.findIndex(s => s.id === id);
        
        if (index !== -1) {
            sales[index].deleted = true;
            sales[index].deletedAt = new Date().toISOString();
            sales[index].updatedAt = new Date().toISOString();
            
            localStorage.setItem(this.KEYS.SALES, JSON.stringify(sales));
            return true;
        }
        return false;
    },

   // 通知データ
   getNotifications() {
       const data = localStorage.getItem(this.KEYS.NOTIFICATIONS);
       return data ? JSON.parse(data) : [];
   },

   saveNotification(notification) {
       const notifications = this.getNotifications();
       notification.id = Date.now().toString();
       notification.createdAt = new Date().toISOString();
       notification.read = false;
       notifications.unshift(notification);
       
       // 最大100件まで保持
       if (notifications.length > 100) {
           notifications.splice(100);
       }
       
       localStorage.setItem(this.KEYS.NOTIFICATIONS, JSON.stringify(notifications));
       return notification;
   },

   markNotificationAsRead(id) {
       const notifications = this.getNotifications();
       const notification = notifications.find(n => n.id === id);
       
       if (notification) {
           notification.read = true;
           localStorage.setItem(this.KEYS.NOTIFICATIONS, JSON.stringify(notifications));
       }
   },

   clearNotifications() {
       localStorage.setItem(this.KEYS.NOTIFICATIONS, JSON.stringify([]));
   },

   // 設定
   getSettings() {
       const data = localStorage.getItem(this.KEYS.SETTINGS);
       return data ? JSON.parse(data) : {
           defaultTaxRate: 10,
           notificationDays: 30,
           enableBrowserNotification: false
       };
   },

   saveSettings(settings) {
       localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
       return settings;
   },

   // テーマ
   getTheme() {
       return localStorage.getItem(this.KEYS.THEME) || 'light';
   },

   setTheme(theme) {
       localStorage.setItem(this.KEYS.THEME, theme);
       return theme;
   },

   // 目標管理
   getGoals() {
       const data = localStorage.getItem(this.KEYS.GOALS);
       return data ? JSON.parse(data) : [];
   },
   
   saveGoal(goal) {
        const goals = this.getGoals();
        // 同じ期間・タイプ・スタッフIDの既存目標を探す
        const existingIndex = goals.findIndex(g => 
            g.type === goal.type && 
            g.period === goal.period &&
            g.staffId === goal.staffId  // nullの場合も正しく比較
        );
        
        if (existingIndex !== -1) {
            goals[existingIndex] = goal;
        } else {
            goals.push(goal);
        }
        
        localStorage.setItem(this.KEYS.GOALS, JSON.stringify(goals));
        return goal;
    },
   
   // メモ管理
   getMemos() {
       const data = localStorage.getItem(this.KEYS.MEMOS);
       return data ? JSON.parse(data) : [];
   },

   getMemos() {
        const data = localStorage.getItem(this.KEYS.MEMOS);
        const allMemos = data ? JSON.parse(data) : [];
        return allMemos.filter(m => !m.deleted);
    },

   saveMemo(memo) {
       const memos = this.getMemos();
       memos.unshift(memo);
       localStorage.setItem(this.KEYS.MEMOS, JSON.stringify(memos));
       return memo;
   },

   updateMemo(memo) {
       const memos = this.getMemos();
       const index = memos.findIndex(m => m.id === memo.id);
       if (index !== -1) {
           memos[index] = memo;
           localStorage.setItem(this.KEYS.MEMOS, JSON.stringify(memos));
       }
       return memo;
   },

   deleteMemo(id) {
        const memos = this.getMemos();
        const index = memos.findIndex(m => m.id === id);
        
        if (index !== -1) {
            memos[index].deleted = true;
            memos[index].deletedAt = new Date().toISOString();
            memos[index].updatedAt = new Date().toISOString();
            
            localStorage.setItem(this.KEYS.MEMOS, JSON.stringify(memos));
            return true;
        }
        return false;
    },

   // TODO管理
   getTodos() {
        const data = localStorage.getItem(this.KEYS.TODOS);
        const allTodos = data ? JSON.parse(data) : [];
        return allTodos.filter(t => !t.deleted);
    },

    getTodo(id) {
        const todos = this.getTodos();
        return todos.find(t => t.id === id);
    },

   saveTodo(todo) {
       const todos = this.getTodos();
       todos.push(todo);
       localStorage.setItem(this.KEYS.TODOS, JSON.stringify(todos));
       return todo;
   },

   updateTodo(todo) {
        const data = localStorage.getItem(this.KEYS.TODOS);
        const allTodos = data ? JSON.parse(data) : [];
        const index = allTodos.findIndex(t => t.id === todo.id);
        
        if (index !== -1) {
            allTodos[index] = todo;
            localStorage.setItem(this.KEYS.TODOS, JSON.stringify(allTodos));
        }
        return todo;
    },

   deleteTodo(id) {
        const todos = this.getTodos();
        const index = todos.findIndex(t => t.id === id);
        
        if (index !== -1) {
            todos[index].deleted = true;
            todos[index].deletedAt = new Date().toISOString();
            todos[index].updatedAt = new Date().toISOString();
            
            localStorage.setItem(this.KEYS.TODOS, JSON.stringify(todos));
            return true;
        }
        return false;
    },

   // ランキング取得
   getRankings(period = 'monthly') {
       const sales = this.getSales();
       const now = new Date();
       let startDate, endDate;

       if (period === 'monthly') {
           startDate = new Date(now.getFullYear(), now.getMonth(), 1);
           endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
       } else {
           startDate = new Date(now.getFullYear(), 0, 1);
           endDate = new Date(now.getFullYear(), 11, 31);
       }

       // 仮のランキングデータ（実際のプロジェクトでは売上データから計算）
       return [
           { name: 'あなた', dealCount: 15, revenue: 5000000 },
           { name: '営業A', dealCount: 12, revenue: 4500000 },
           { name: '営業B', dealCount: 10, revenue: 4000000 }
       ];
   },

   // データ分析用メソッド
   // 月次統計を拡張
   getMonthlyStats(yearMonth) {
       const [year, month] = yearMonth.split('-').map(Number);
       const startDate = new Date(year, month - 1, 1);
       const endDate = new Date(year, month, 0, 23, 59, 59);
       
       const sales = this.getSales().filter(sale => {
           const saleDate = new Date(sale.date);
           return saleDate >= startDate && saleDate <= endDate;
       });
       
       const properties = this.getProperties();
       
       // 媒介獲得数を計算
       const mediationCount = properties.filter(property => {
           if (!property.contractDate) return false;
           const contractDate = new Date(property.contractDate);
           return contractDate >= startDate && contractDate <= endDate &&
                  ['exclusive', 'special', 'general'].includes(property.transactionMode);
       }).length;
       
       // 契約件数（売買の成約数）
       const contractCount = sales.filter(sale => sale.type === 'realestate').length;
       
       const stats = {
           totalRevenue: 0,
           dealCount: 0,
           realEstateRevenue: 0,
           renovationRevenue: 0,
           otherRevenue: 0,
           realEstateCount: 0,
           renovationCount: 0,
           otherCount: 0,
           contractCount: contractCount,
           mediationCount: mediationCount
       };
       
       sales.forEach(sale => {
           stats.totalRevenue += sale.profit || 0;
           stats.dealCount++;
           
           switch (sale.type) {
               case 'realestate':
                   stats.realEstateRevenue += sale.profit || 0;
                   stats.realEstateCount++;
                   break;
               case 'renovation':
                   stats.renovationRevenue += sale.profit || 0;
                   stats.renovationCount++;
                   break;
               case 'other':
                   stats.otherRevenue += sale.amount || 0;
                   stats.otherCount++;
                   break;
           }
       });
       
       return stats;
   },

   // 個人の月次統計を取得
   getPersonalMonthlyStats(yearMonth) {
       const staffId = Permissions.getCurrentStaffId();
       const [year, month] = yearMonth.split('-').map(Number);
       const startDate = new Date(year, month - 1, 1);
       const endDate = new Date(year, month, 0, 23, 59, 59);
       
       const sales = this.getSales().filter(sale => {
           const saleDate = new Date(sale.date);
           return sale.staffId === staffId && 
                  saleDate >= startDate && 
                  saleDate <= endDate;
       });
       
       const properties = this.getProperties().filter(p => p.staffId === staffId);
       
       // 媒介獲得数を計算
       const mediationCount = properties.filter(property => {
           if (!property.contractDate) return false;
           const contractDate = new Date(property.contractDate);
           return contractDate >= startDate && contractDate <= endDate &&
                  ['exclusive', 'special', 'general'].includes(property.transactionMode);
       }).length;
       
       // 契約件数（売買の成約数）
       const contractCount = sales.filter(sale => sale.type === 'realestate').length;
       
       const stats = {
           totalRevenue: 0,
           dealCount: 0,
           realEstateRevenue: 0,
           renovationRevenue: 0,
           otherRevenue: 0,
           realEstateCount: 0,
           renovationCount: 0,
           otherCount: 0,
           contractCount: contractCount,
           mediationCount: mediationCount
       };
       
       sales.forEach(sale => {
           stats.totalRevenue += sale.profit || 0;
           stats.dealCount++;
           
           switch (sale.type) {
               case 'realestate':
                   stats.realEstateRevenue += sale.profit || 0;
                   stats.realEstateCount++;
                   break;
               case 'renovation':
                   stats.renovationRevenue += sale.profit || 0;
                   stats.renovationCount++;
                   break;
               case 'other':
                   stats.otherRevenue += sale.amount || 0;
                   stats.otherCount++;
                   break;
           }
       });
       
       return stats;
   },

   // 個人の売上データを取得
   getPersonalSales() {
       const sales = this.getSales();
       const staffId = Permissions.getCurrentStaffId();
       return sales.filter(sale => sale.staffId === staffId);
   },

   // 個人の物件データを取得
   getPersonalProperties() {
       const properties = this.getProperties();
       const staffId = Permissions.getCurrentStaffId();
       return properties.filter(property => property.staffId === staffId);
   },

   // 個人の物件統計を取得
   getPersonalPropertyStats() {
       const staffId = Permissions.getCurrentStaffId();
       const properties = this.getProperties().filter(p => p.staffId === staffId);
       
       const stats = {
           total: properties.length,
           activeCount: 0,
           sellerCount: 0,
           exclusiveCount: 0,
           generalCount: 0,
           otherModeCount: 0,
           sellerValue: 0
       };
       
       properties.forEach(property => {
           // アクティブな物件の統計
           if (property.status === 'active' || property.status === 'negotiating') {
               stats.activeCount++;
               
               // 取引様態ごとの統計
               switch (property.transactionMode) {
                   case 'seller':
                       stats.sellerCount++;
                       stats.sellerValue += property.sellingPrice || 0;
                       break;
                   case 'exclusive':
                   case 'special':
                       stats.exclusiveCount++;
                       break;
                   case 'general':
                       stats.generalCount++;
                       break;
                   default:
                       stats.otherModeCount++;
                       break;
               }
           }
       });
       
       return stats;
   },

   // 個人の期限通知を取得
   getPersonalUpcomingDeadlines(days = 30) {
       const staffId = Permissions.getCurrentStaffId();
       const allDeadlines = this.getUpcomingDeadlines(days);
       
       return allDeadlines.filter(deadline => {
           if (deadline.property) {
               return deadline.property.staffId === staffId;
           }
           if (deadline.sale) {
               return deadline.sale.staffId === staffId;
           }
           return false;
       });
   },

   // 個人の月次媒介獲得物件を取得
   getPersonalMonthlyMediationProperties(yearMonth) {
       const staffId = Permissions.getCurrentStaffId();
       const allProperties = this.getMonthlyMediationProperties(yearMonth);
       return allProperties.filter(property => property.staffId === staffId);
   },
   
   // 月次媒介獲得物件を取得
   getMonthlyMediationProperties(yearMonth) {
       const [year, month] = yearMonth.split('-').map(Number);
       const startDate = new Date(year, month - 1, 1);
       const endDate = new Date(year, month, 0, 23, 59, 59);
       
       return this.getProperties().filter(property => {
           if (!property.contractDate) return false;
           const contractDate = new Date(property.contractDate);
           return contractDate >= startDate && contractDate <= endDate &&
                  ['exclusive', 'special', 'general'].includes(property.transactionMode);
       }).sort((a, b) => new Date(b.contractDate) - new Date(a.contractDate));
   },
   
   getPropertyStats() {
       const properties = this.getProperties();
       const stats = {
           total: properties.length,
           active: 0,
           negotiating: 0,
           contracted: 0,
           completed: 0,
           totalValue: 0,
           activeCount: 0,
           sellerCount: 0,
           exclusiveCount: 0,
           generalCount: 0,
           otherModeCount: 0,
           sellerValue: 0
       };
       
       properties.forEach(property => {
           stats[property.status]++;
           
           // アクティブな物件の統計
           if (property.status === 'active' || property.status === 'negotiating') {
               stats.activeCount++;
               stats.totalValue += property.sellingPrice || 0;
               
               // 取引様態ごとの統計
               switch (property.transactionMode) {
                   case 'seller':
                       stats.sellerCount++;
                       stats.sellerValue += property.sellingPrice || 0;
                       break;
                   case 'exclusive':
                   case 'special':
                       stats.exclusiveCount++;
                       break;
                   case 'general':
                       stats.generalCount++;
                       break;
                   default:
                       stats.otherModeCount++;
                       break;
               }
           }
       });
       
       return stats;
   },

   getUpcomingDeadlines(days = 30) {
       const properties = this.getProperties();
       const sales = this.getSales(); // 売上データも取得
       const now = new Date();
       now.setHours(0, 0, 0, 0); // 時間をリセット
       const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
       const deadlines = [];
       
       // 物件関連の通知
       properties.forEach(property => {
           // 媒介契約満了日のチェック
           if (property.contractEndDate && 
               (property.status === 'active' || property.status === 'negotiating')) {
               const endDate = new Date(property.contractEndDate);
               
               if (endDate >= now && endDate <= futureDate) {
                   const daysRemaining = Math.ceil((endDate - now) / (24 * 60 * 60 * 1000));
                   deadlines.push({
                       property,
                       type: 'contract',
                       message: `媒介契約満了まで${daysRemaining}日`,
                       daysRemaining,
                       urgent: daysRemaining <= 7
                   });
               }
           }
           
           // レインズ登録期日のチェック（2日前から通知）
           if (property.reinsDeadline && 
               (property.status === 'active' || property.status === 'negotiating')) {
               const deadline = new Date(property.reinsDeadline);
               
               if (deadline >= now && deadline <= futureDate) {
                   const daysRemaining = Math.ceil((deadline - now) / (24 * 60 * 60 * 1000));
                   
                   if (daysRemaining <= 2) {
                       deadlines.push({
                           property,
                           type: 'reins-deadline',
                           message: `レインズ登録期日まで${daysRemaining}日`,
                           daysRemaining,
                           urgent: true
                       });
                   }
               }
           }
           
           // レインズ更新のチェック（専任媒介は7日、専属専任は5日）
           if (property.reinsDate && property.transactionMode && 
               (property.status === 'active' || property.status === 'negotiating')) {
               const updateDays = property.transactionMode === 'exclusive' ? 5 : 7;
               const lastUpdate = new Date(property.reinsDate);
               const nextUpdate = new Date(lastUpdate.getTime() + updateDays * 24 * 60 * 60 * 1000);
               
               if (nextUpdate >= now && nextUpdate <= futureDate) {
                   const daysRemaining = Math.ceil((nextUpdate - now) / (24 * 60 * 60 * 1000));
                   deadlines.push({
                       property,
                       type: 'reins',
                       message: `レインズ更新期限まで${daysRemaining}日`,
                       daysRemaining,
                       urgent: daysRemaining <= 2
                   });
               }
           }
       });
       
       // 売上データから決済期日と融資特約期日をチェック
       sales.forEach(sale => {
           if (sale.type !== 'realestate' || sale.collectionStatus === 'collected') return;
           
           // 決済期日のチェック（3週間前から通知）
           if (sale.settlementDate) {
               const settlementDate = new Date(sale.settlementDate);
               const daysUntilSettlement = Math.ceil((settlementDate - now) / (24 * 60 * 60 * 1000));
               
               if (daysUntilSettlement >= 0 && daysUntilSettlement <= 21) {
                   deadlines.push({
                       sale,
                       type: 'settlement',
                       message: `決済期日まで${daysUntilSettlement}日`,
                       propertyName: sale.propertyName || sale.dealName,
                       daysRemaining: daysUntilSettlement,
                       urgent: daysUntilSettlement <= 7
                   });
               }
           }
           
           // 融資特約期日のチェック（3週間前から通知）
           if (sale.loanConditionDate) {
               const loanDate = new Date(sale.loanConditionDate);
               const daysUntilLoan = Math.ceil((loanDate - now) / (24 * 60 * 60 * 1000));
               
               if (daysUntilLoan >= 0 && daysUntilLoan <= 21) {
                   deadlines.push({
                       sale,
                       type: 'loan-condition',
                       message: `融資特約期日まで${daysUntilLoan}日`,
                       propertyName: sale.propertyName || sale.dealName,
                       daysRemaining: daysUntilLoan,
                       urgent: daysUntilLoan <= 7
                   });
               }
           }
       });
       
       return deadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);
   },

   // エクスポート/インポート
   exportData() {
       return {
           properties: this.getProperties(),
           sales: this.getSales(),
           settings: this.getSettings(),
           notifications: this.getNotifications(),
           goals: this.getGoals(),
           memos: this.getMemos(),
           todos: this.getTodos(),
           exportDate: new Date().toISOString(),
           version: '1.1'
       };
   },

   importData(data) {
        try {
            // 各データタイプごとに存在チェックをしてから保存
            if (data.properties && Array.isArray(data.properties)) {
                localStorage.setItem(this.KEYS.PROPERTIES, JSON.stringify(data.properties));
            }
            if (data.sales && Array.isArray(data.sales)) {
                localStorage.setItem(this.KEYS.SALES, JSON.stringify(data.sales));
            }
            if (data.settings && typeof data.settings === 'object') {
                localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(data.settings));
            }
            if (data.notifications && Array.isArray(data.notifications)) {
                localStorage.setItem(this.KEYS.NOTIFICATIONS, JSON.stringify(data.notifications));
            }
            if (data.goals && Array.isArray(data.goals)) {
                localStorage.setItem(this.KEYS.GOALS, JSON.stringify(data.goals));
            }
            if (data.memos && Array.isArray(data.memos)) {
                localStorage.setItem(this.KEYS.MEMOS, JSON.stringify(data.memos));
            }
            if (data.todos && Array.isArray(data.todos)) {
                localStorage.setItem(this.KEYS.TODOS, JSON.stringify(data.todos));
            }
            return true;
        } catch (error) {
            console.error('Import error:', error);
            return false;
        }
    },

   // データクリア
   clearAllData() {
       const theme = this.getTheme();
       
       // テーマ以外をクリア
       Object.keys(this.KEYS).forEach(key => {
           if (key !== 'THEME') {
               localStorage.removeItem(this.KEYS[key]);
           }
       });
       
       return true;
   }
};

// グローバルスコープに公開
window.Storage = Storage;