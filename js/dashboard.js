// dashboard.js - ダッシュボード機能
const Dashboard = {
    init() {
        this.refresh();
        if (typeof Calendar !== 'undefined') {
            Calendar.render();
        }
        // TODOウィジェットを表示
        if (typeof Todos !== 'undefined') {
            Todos.renderTodoWidget();
        }
    },

    refresh() {
        this.updateSummary();
        this.updateDeadlineAlerts();
        this.updateRecentTransactions();
        this.updateGoalProgress();
        this.updateMediationProperties(); // 実績の代わりに媒介獲得物件
    },

   updateSummary() {
       // 今月の統計を取得
       const now = new Date();
       const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
       const monthlyStats = Storage.getMonthlyStats(yearMonth);
       const propertyStats = Storage.getPropertyStats();
       
       // サマリー表示を更新
       document.getElementById('monthly-revenue').textContent = 
           EstateApp.formatCurrency(monthlyStats.totalRevenue);
       
       // 案件件数の詳細表示
       document.getElementById('monthly-deals').textContent = 
           `${monthlyStats.dealCount}件`;
       document.getElementById('deal-breakdown').innerHTML = `
           <span>売買: ${monthlyStats.realEstateCount}件</span><br>
           <span>リフォーム: ${monthlyStats.renovationCount}件</span><br>
           <span>その他: ${monthlyStats.otherCount}件</span>
       `;
       
       // 在庫物件数の詳細表示（取引様態ごと）
       document.getElementById('inventory-count').textContent = 
           `${propertyStats.activeCount}件`;
       document.getElementById('inventory-breakdown').innerHTML = `
           <span>売主: ${propertyStats.sellerCount}件</span><br>
           <span>専任媒介: ${propertyStats.exclusiveCount}件</span><br>
           <span>一般媒介: ${propertyStats.generalCount}件</span><br>
           <span>その他: ${propertyStats.otherModeCount}件</span>
       `;
       
       // 在庫総額（売主物件のみ）
       document.getElementById('inventory-value').textContent = 
           EstateApp.formatCurrency(propertyStats.sellerValue);
   },

   updateDeadlineAlerts() {
       const settings = Storage.getSettings();
       const deadlines = Storage.getUpcomingDeadlines(settings.notificationDays);
       const container = document.getElementById('deadline-alerts');
       
       if (deadlines.length === 0) {
           container.innerHTML = '<p class="no-data">期限が近い物件はありません</p>';
           return;
       }
       
       container.innerHTML = deadlines.slice(0, 5).map(deadline => `
        <div class="alert-item ${deadline.urgent ? 'urgent' : ''}">
            <div class="alert-property">${deadline.propertyName || deadline.property?.name || '不明'}</div>
            <div class="alert-message">${deadline.message}</div>
        </div>
    `).join('');
   },

   updateRecentTransactions() {
       const sales = Storage.getSales();
       const container = document.getElementById('recent-transactions');
       
       if (sales.length === 0) {
           container.innerHTML = '<p class="no-data">取引履歴がありません</p>';
           return;
       }
       // 日付でソートして最新5件を取得
       const sortedSales = sales.sort((a, b) => new Date(b.date) - new Date(a.date));
       container.innerHTML = sales.slice(0, 5).map(sale => {
           let displayName = '';
           let amount = 0;
           
           // 案件名があればそれを優先、なければ物件名または顧客名
           displayName = sale.dealName || sale.propertyName || sale.customerName;
           
           switch (sale.type) {
               case 'realestate':
                   amount = sale.profit;
                   break;
               case 'renovation':
                   amount = sale.profit;
                   break;
               case 'other':
                   amount = sale.amount;
                   break;
           }
           
           const collectionStatus = sale.collectionStatus || 'pending';
           const collectionIcon = collectionStatus === 'collected' ? '✓' : '⏳';
           const collectionClass = collectionStatus === 'collected' ? 'collected' : 'pending';
           
           return `
               <div class="transaction-item">
                   <div class="transaction-info">
                       <div class="transaction-property">${displayName}</div>
                       <div class="transaction-date">${EstateApp.formatDate(sale.date)}</div>
                   </div>
                   <div class="transaction-amount">
                       ${EstateApp.formatCurrency(amount)}
                       <span class="collection-status ${collectionClass}" title="${collectionStatus === 'collected' ? '回収済' : '未回収'}">${collectionIcon}</span>
                   </div>
               </div>
           `;
       }).join('');
   },

   updateGoalProgress() {
        const goals = Storage.getGoals();
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthlyGoal = goals.find(g => g.period === currentMonth && g.type === 'monthly');
        const progressElement = document.getElementById('goal-progress');
        
        if (!progressElement) return;
        
        const stats = Storage.getMonthlyStats(currentMonth);
        
        if (monthlyGoal) {
            const revenueProgress = (stats.totalRevenue / monthlyGoal.targetAmount) * 100;
            const contractProgress = monthlyGoal.targetContracts ? 
                (stats.contractCount / monthlyGoal.targetContracts) * 100 : 0;
            const mediationProgress = monthlyGoal.targetMediations ? 
                (stats.mediationCount / monthlyGoal.targetMediations) * 100 : 0;
            
            progressElement.innerHTML = `
                <div class="goal-progress-container">
                    <div class="goal-item">
                        <div class="goal-info">
                            <span>月間売上目標</span>
                            <span class="progress-percentage">${Math.round(revenueProgress)}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.min(revenueProgress, 100)}%"></div>
                        </div>
                        <div class="goal-detail">
                            ${EstateApp.formatCurrency(stats.totalRevenue)} / ${EstateApp.formatCurrency(monthlyGoal.targetAmount)}
                        </div>
                    </div>
                    
                    ${monthlyGoal.targetContracts ? `
                        <div class="goal-item">
                            <div class="goal-info">
                                <span>契約件数目標</span>
                                <span class="progress-percentage">${Math.round(contractProgress)}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min(contractProgress, 100)}%"></div>
                            </div>
                            <div class="goal-detail">
                                ${stats.contractCount}件 / ${monthlyGoal.targetContracts}件
                            </div>
                        </div>
                    ` : ''}
                    
                    ${monthlyGoal.targetMediations ? `
                        <div class="goal-item">
                            <div class="goal-info">
                                <span>媒介獲得目標</span>
                                <span class="progress-percentage">${Math.round(mediationProgress)}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min(mediationProgress, 100)}%"></div>
                            </div>
                            <div class="goal-detail">
                                ${stats.mediationCount}件 / ${monthlyGoal.targetMediations}件
                            </div>
                        </div>
                    ` : ''}
                    
                    ${revenueProgress >= 100 || contractProgress >= 100 || mediationProgress >= 100 ? 
                        '<div class="goal-achieved">🎉 目標達成項目があります！</div>' : ''}
                </div>
            `;
        } else {
            progressElement.innerHTML = `
                <div class="current-stats">
                    <div class="stat-row">
                        <span>今月の売上：</span>
                        <span>${EstateApp.formatCurrency(stats.totalRevenue)}</span>
                    </div>
                    <div class="stat-row">
                        <span>契約件数：</span>
                        <span>${stats.contractCount}件</span>
                    </div>
                    <div class="stat-row">
                        <span>媒介獲得数：</span>
                        <span>${stats.mediationCount}件</span>
                    </div>
                </div>
                <p class="no-data">目標が設定されていません</p>
            `;
        }
    },

   updateMediationProperties() {
           const currentMonth = new Date().toISOString().slice(0, 7);
           const mediationProperties = Storage.getMonthlyMediationProperties(currentMonth);
           const container = document.getElementById('mediation-properties');
           
           if (!container) return;
           
           if (mediationProperties.length === 0) {
               container.innerHTML = '<p class="no-data">今月の媒介獲得物件はありません</p>';
               return;
           }
           
           container.innerHTML = `
               <div class="mediation-table-container">
                   <table class="mediation-table">
                       <thead>
                           <tr>
                               <th>媒介種別</th>
                               <th>媒介日</th>
                               <th>物件種別</th>
                               <th>所在地</th>
                               <th>売出価格</th>
                           </tr>
                       </thead>
                       <tbody>
                           ${mediationProperties.map(property => `
                               <tr onclick="Inventory.showPropertyDetail('${property.id}')" style="cursor: pointer;">
                                   <td>${this.getMediationType(property.transactionMode)}</td>
                                   <td>${EstateApp.formatDate(property.contractDate)}</td>
                                   <td>${Inventory.getPropertyTypeText(property.type)}</td>
                                   <td class="address-cell">${property.address}</td>
                                   <td class="price-cell">${EstateApp.formatCurrency(property.sellingPrice)}</td>
                               </tr>
                           `).join('')}
                       </tbody>
                   </table>
               </div>
           `;
       },
   
       getMediationType(mode) {
           const modeMap = {
               'exclusive': '専属専任',
               'special': '専任',
               'general': '一般'
           };
           return modeMap[mode] || mode;
       }
   };

// グローバルスコープに公開
window.Dashboard = Dashboard;
