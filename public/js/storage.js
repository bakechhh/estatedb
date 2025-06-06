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
        const properties = JSON.parse(localStorage.getItem(this.KEYS.PROPERTIES) || '[]');
        const index = properties.findIndex(p => p.id === id);
        
        if (index !== -1) {
            // 削除フラグを立てる
            properties[index].deleted = true;
            properties[index].deletedAt = new Date().toISOString();
            properties[index].updatedAt = new Date().toISOString();
            
            localStorage.setItem(this.KEYS.PROPERTIES, JSON.stringify(properties));
            
            // 関連する売上データのpropertyIdをクリア
            const sales = JSON.parse(localStorage.getItem(this.KEYS.SALES) || '[]');
            let updated = false;
            sales.forEach(sale => {
                if (sale.propertyId === id && !sale.deleted) {
                    sale.propertyId = null;
                    sale.propertyDeleted = true;
                    sale.updatedAt = new Date().toISOString();
                    updated = true;
                }
            });
            
            if (updated) {
                localStorage.setItem(this.KEYS.SALES, JSON.stringify(sales));
            }
            
            return true;
        }
        return false;
    },

   // getSales も修正
    getSales() {
        const data = localStorage.getItem(this.KEYS.SALES);
        const allSales = data ? JSON.parse(data) : [];
        
        // デバッグログを削除
        const filtered = allSales.filter(s => !s.deleted);
        
        return filtered;
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
   
   // メモ管
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
        } else if (period === 'yearly') {
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
        }

        // スタッフ別に集計
        const staffStats = {};
        
        sales.forEach(sale => {
            const saleDate = new Date(sale.date);
            if (saleDate >= startDate && saleDate <= endDate) {
                const staffId = sale.staffId || 'unknown';
                
                if (!staffStats[staffId]) {
                    staffStats[staffId] = {
                        staffId,
                        dealCount: 0,
                        revenue: 0
                    };
                }
                
                staffStats[staffId].dealCount++;
                staffStats[staffId].revenue += sale.profit || sale.amount || 0;
            }
        });
        
        // 配列に変換してソート
        const rankings = Object.values(staffStats)
            .sort((a, b) => b.revenue - a.revenue)
            .map(stat => ({
                staffId: stat.staffId,
                name: Staff.getStaffNameSync(stat.staffId),
                dealCount: stat.dealCount,
                revenue: stat.revenue
            }));
        
        return rankings;
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

   // ストレージ使用量を確認
    getStorageSize() {
        let totalSize = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += localStorage[key].length + key.length;
            }
        }
        return totalSize;
    },

    // ストレージ使用率を取得（％）
    getStorageUsagePercentage() {
        // LocalStorageの制限は通常5MB（5,242,880バイト）
        const maxSize = 5 * 1024 * 1024;
        const currentSize = this.getStorageSize();
        return Math.round((currentSize / maxSize) * 100);
    },


    // 同期済みの削除データをクリーンアップ（ローカルのみ）
    cleanupSyncedDeletedData(daysToKeep = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        
        let cleanedCount = 0;
        
        // 最後の同期時刻を確認
        const lastSyncTime = localStorage.getItem('last_sync_time');
        if (!lastSyncTime) {
            console.log('No sync history found, skipping cleanup');
            return 0;
        }
        
        const lastSync = new Date(lastSyncTime);
        const hoursSinceSync = (new Date() - lastSync) / (1000 * 60 * 60);
        
        // 24時間以内に同期していない場合はクリーンアップしない
        if (hoursSinceSync > 24) {
            console.log('Last sync too old, skipping cleanup');
            return 0;
        }
        
        ['PROPERTIES', 'SALES', 'MEMOS', 'TODOS'].forEach(key => {
            const dataKey = this.KEYS[key];
            const allData = JSON.parse(localStorage.getItem(dataKey) || '[]');
            const originalLength = allData.length;
            
            const filtered = allData.filter(item => {
                if (item.deleted && item.deletedAt) {
                    const deletedDate = new Date(item.deletedAt);
                    
                    // 削除日が古く、かつ最後の同期より前の場合のみ物理削除
                    if (deletedDate < cutoffDate && deletedDate < lastSync) {
                        return false; // ローカルから物理削除
                    }
                }
                return true; // 保持
            });
            
            cleanedCount += originalLength - filtered.length;
            
            if (originalLength !== filtered.length) {
                localStorage.setItem(dataKey, JSON.stringify(filtered));
            }
        });
        
        return cleanedCount;
    },
    // より積極的なクリーンアップ（同期確認後のみ実行）
    aggressiveCleanup() {
        // 最後の同期が成功していることを確認
        const lastSyncSuccess = localStorage.getItem('last_sync_success');
        if (lastSyncSuccess !== 'true') {
            console.warn('Last sync was not successful, aborting aggressive cleanup');
            return 0;
        }
        
        // 最後の同期から十分な時間が経過していることを確認（5分以上）
        const lastSyncTime = localStorage.getItem('last_sync_time');
        if (lastSyncTime) {
            const timeSinceSync = new Date() - new Date(lastSyncTime);
            if (timeSinceSync < 5 * 60 * 1000) {
                console.warn('Too soon after last sync, aborting aggressive cleanup');
                return 0;
            }
        }
        
        let cleanedCount = 0;
        
        ['PROPERTIES', 'SALES', 'MEMOS', 'TODOS'].forEach(key => {
            const dataKey = this.KEYS[key];
            const allData = JSON.parse(localStorage.getItem(dataKey) || '[]');
            
            // 削除フラグが立っているものをローカルから物理削除
            const filtered = allData.filter(item => !item.deleted);
            
            cleanedCount += allData.length - filtered.length;
            
            if (allData.length !== filtered.length) {
                localStorage.setItem(dataKey, JSON.stringify(filtered));
            }
        });
        
        // クリーンアップ履歴を記録
        localStorage.setItem('last_cleanup', JSON.stringify({
            cleanedCount,
            cleanedAt: new Date().toISOString()
        }));
        
        console.log(`Aggressively cleaned ${cleanedCount} deleted items from local storage`);
        return cleanedCount;
    },

    // ストレージの健全性チェック
    checkStorageHealth() {
        const usage = this.getStorageUsagePercentage();
        
        if (usage > 80) {
            // 80%以上使用している場合は古いデータをクリーンアップ
            this.cleanupSyncedDeletedData(7); // 7日以上前の同期済み削除データを物理削除
            
            if (usage > 90) {
                EstateApp.showToast('ストレージ容量が不足しています。不要なデータを削除してください。', 'danger');
            }
        }
        
        return {
            usage: usage,
            size: this.getStorageSize(),
            healthy: usage < 80
        };
    },

    // ストレージの最適化
    optimizeStorage() {
        // 各データを再パースして最適化
        ['PROPERTIES', 'SALES', 'MEMOS', 'TODOS', 'GOALS', 'NOTIFICATIONS'].forEach(key => {
            const dataKey = this.KEYS[key];
            const data = localStorage.getItem(dataKey);
            
            if (data) {
                try {
                    // パース＆再文字列化で無駄な空白を削除
                    const parsed = JSON.parse(data);
                    const optimized = JSON.stringify(parsed);
                    
                    // サイズが削減された場合のみ更新
                    if (optimized.length < data.length) {
                        localStorage.setItem(dataKey, optimized);
                    }
                } catch (e) {
                    console.error(`Failed to optimize ${key}:`, e);
                }
            }
        });
        
        console.log('Storage optimized');
    },

    // ストレージ使用状況の詳細を取得
    getStorageDetails() {
        const details = {};
        let totalSize = 0;
        
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                const size = localStorage[key].length + key.length;
                details[key] = {
                    size: size,
                    sizeKB: (size / 1024).toFixed(2) + ' KB',
                    percentage: 0 // 後で計算
                };
                totalSize += size;
            }
        }
        
        // パーセンテージを計算
        for (let key in details) {
            details[key].percentage = ((details[key].size / totalSize) * 100).toFixed(1) + '%';
        }
        
        return {
            total: totalSize,
            totalKB: (totalSize / 1024).toFixed(2) + ' KB',
            totalMB: (totalSize / 1024 / 1024).toFixed(2) + ' MB',
            details: details
        };
    },

    // 削除の取り消し（復元）機能
    restoreProperty(id) {
        const properties = JSON.parse(localStorage.getItem(this.KEYS.PROPERTIES) || '[]');
        const property = properties.find(p => p.id === id && p.deleted);
        
        if (property) {
            delete property.deleted;
            delete property.deletedAt;
            property.updatedAt = new Date().toISOString();
            property.restoredAt = new Date().toISOString();
            localStorage.setItem(this.KEYS.PROPERTIES, JSON.stringify(properties));
            return true;
        }
        return false;
    },

    restoreSale(id) {
        const sales = JSON.parse(localStorage.getItem(this.KEYS.SALES) || '[]');
        const sale = sales.find(s => s.id === id && s.deleted);
        
        if (sale) {
            delete sale.deleted;
            delete sale.deletedAt;
            sale.updatedAt = new Date().toISOString();
            sale.restoredAt = new Date().toISOString();
            localStorage.setItem(this.KEYS.SALES, JSON.stringify(sales));
            return true;
        }
        return false;
    },

    // 最近削除されたアイテムを取得
    getRecentlyDeleted(type = 'all', days = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        const result = [];
        
        if (type === 'all' || type === 'properties') {
            const properties = JSON.parse(localStorage.getItem(this.KEYS.PROPERTIES) || '[]');
            properties.filter(p => p.deleted && new Date(p.deletedAt) > cutoffDate)
                .forEach(p => result.push({ type: 'property', data: p }));
        }
        
        if (type === 'all' || type === 'sales') {
            const sales = JSON.parse(localStorage.getItem(this.KEYS.SALES) || '[]');
            sales.filter(s => s.deleted && new Date(s.deletedAt) > cutoffDate)
                .forEach(s => result.push({ type: 'sale', data: s }));
        }
        
        return result.sort((a, b) => 
            new Date(b.data.deletedAt) - new Date(a.data.deletedAt)
        );
    },

   // エクスポート/インポート
   exportData() {
       // 削除フラグ付きも含めて全データを取得
       const allProperties = JSON.parse(localStorage.getItem(this.KEYS.PROPERTIES) || '[]');
       const allSales = JSON.parse(localStorage.getItem(this.KEYS.SALES) || '[]');
       const allMemos = JSON.parse(localStorage.getItem(this.KEYS.MEMOS) || '[]');
       const allTodos = JSON.parse(localStorage.getItem(this.KEYS.TODOS) || '[]');
       
       return {
           properties: allProperties, // 削除フラグ付きも含める
           sales: allSales, // 削除フラグ付きも含める
           settings: this.getSettings(),
           notifications: this.getNotifications(),
           goals: this.getGoals(),
           memos: allMemos, // 削除フラグ付きも含める
           todos: allTodos, // 削除フラグ付きも含める
           exportDate: new Date().toISOString(),
           version: '1.1'
       };
   },

   importData(data) {
        try {
            // 既存のローカルデータを取得（削除フラグを保持するため）
            const existingData = {
                properties: JSON.parse(localStorage.getItem(this.KEYS.PROPERTIES) || '[]'),
                sales: JSON.parse(localStorage.getItem(this.KEYS.SALES) || '[]'),
                goals: JSON.parse(localStorage.getItem(this.KEYS.GOALS) || '[]'),
                memos: JSON.parse(localStorage.getItem(this.KEYS.MEMOS) || '[]'),
                todos: JSON.parse(localStorage.getItem(this.KEYS.TODOS) || '[]'),
                notifications: JSON.parse(localStorage.getItem(this.KEYS.NOTIFICATIONS) || '[]')
            };
            
            // 削除フラグのあるIDを記録
            const deletedIds = {
                properties: new Set(existingData.properties.filter(p => p.deleted).map(p => p.id)),
                sales: new Set(existingData.sales.filter(s => s.deleted).map(s => s.id)),
                memos: new Set(existingData.memos.filter(m => m.deleted).map(m => m.id)),
                todos: new Set(existingData.todos.filter(t => t.deleted).map(t => t.id))
            };
            
            // プロパティのインポート（削除フラグを復元）
            if (data.properties && Array.isArray(data.properties)) {
                data.properties = data.properties.map(p => {
                    if (deletedIds.properties.has(p.id)) {
                        const deleted = existingData.properties.find(ep => ep.id === p.id);
                        return { ...p, deleted: deleted.deleted, deletedAt: deleted.deletedAt, updatedAt: deleted.updatedAt };
                    }
                    return p;
                });
                localStorage.setItem(this.KEYS.PROPERTIES, JSON.stringify(data.properties));
            }
            
            // 売上のインポート（削除フラグを復元）
            if (data.sales && Array.isArray(data.sales)) {
                data.sales = data.sales.map(s => {
                    if (deletedIds.sales.has(s.id)) {
                        const deleted = existingData.sales.find(es => es.id === s.id);
                        return { ...s, deleted: deleted.deleted, deletedAt: deleted.deletedAt, updatedAt: deleted.updatedAt };
                    }
                    return s;
                });
                localStorage.setItem(this.KEYS.SALES, JSON.stringify(data.sales));
            }
            
            // 目標のインポート
            if (data.goals && Array.isArray(data.goals)) {
                localStorage.setItem(this.KEYS.GOALS, JSON.stringify(data.goals));
            }
            
            // メモのインポート（削除フラグを復元）
            if (data.memos && Array.isArray(data.memos)) {
                data.memos = data.memos.map(m => {
                    if (deletedIds.memos.has(m.id)) {
                        const deleted = existingData.memos.find(em => em.id === m.id);
                        return { ...m, deleted: deleted.deleted, deletedAt: deleted.deletedAt, updatedAt: deleted.updatedAt };
                    }
                    return m;
                });
                localStorage.setItem(this.KEYS.MEMOS, JSON.stringify(data.memos));
            }
            
            // TODOのインポート（削除フラグを復元）
            if (data.todos && Array.isArray(data.todos)) {
                data.todos = data.todos.map(t => {
                    if (deletedIds.todos.has(t.id)) {
                        const deleted = existingData.todos.find(et => et.id === t.id);
                        return { ...t, deleted: deleted.deleted, deletedAt: deleted.deletedAt, updatedAt: deleted.updatedAt };
                    }
                    return t;
                });
                localStorage.setItem(this.KEYS.TODOS, JSON.stringify(data.todos));
            }
            
            // 通知のインポート（通知は削除フラグなし）
            if (data.notifications && Array.isArray(data.notifications)) {
                localStorage.setItem(this.KEYS.NOTIFICATIONS, JSON.stringify(data.notifications));
            }
            
            // 設定のインポート
            if (data.settings && typeof data.settings === 'object') {
                localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(data.settings));
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