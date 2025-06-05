// calendar.js を修正

const Calendar = {
    currentYearMonth: '',
    
    init() {
        this.currentYearMonth = this.getCurrentYearMonth();
        this.setupEventListeners();
    },

    setupEventListeners() {
        document.addEventListener('showCalendarWithDate', (e) => {
            this.currentYearMonth = e.detail.yearMonth;
            this.render();
        });
    },

    getCurrentYearMonth() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    },

    render() {
        const calendarContainer = document.getElementById('calendar-view');
        if (!calendarContainer) return;
        
        const [year, month] = this.currentYearMonth.split('-').map(Number);
        const salesData = this.getMonthSalesData();
        const deadlineData = this.getMonthDeadlines();
        
        calendarContainer.innerHTML = `
            <div class="calendar-header">
                <button class="month-nav-btn" onclick="Calendar.changeMonth(-1)">←</button>
                <h3>${year}年${month}月</h3>
                <button class="month-nav-btn" onclick="Calendar.changeMonth(1)">→</button>
            </div>
            <div class="calendar-container">
                ${this.generateCalendarGrid(year, month, salesData, deadlineData)}
            </div>
        `;
    },

    changeMonth(direction) {
        const [year, month] = this.currentYearMonth.split('-').map(Number);
        const date = new Date(year, month - 1 + direction, 1);
        this.currentYearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        this.render();
    },

    generateCalendarGrid(year, month, salesData, deadlineData) {
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        const firstDayOfWeek = firstDay.getDay();
        const lastDate = lastDay.getDate();
        
        let html = `
            <div class="calendar-weekdays">
                <div class="weekday">日</div>
                <div class="weekday">月</div>
                <div class="weekday">火</div>
                <div class="weekday">水</div>
                <div class="weekday">木</div>
                <div class="weekday">金</div>
                <div class="weekday">土</div>
            </div>
            <div class="calendar-grid">
        `;
        
        // 前月の空白
        for (let i = 0; i < firstDayOfWeek; i++) {
            html += '<div class="calendar-day other-month"></div>';
        }
        
        // 当月の日付
        for (let day = 1; day <= lastDate; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const daySales = salesData[dateStr];
            const dayDeadlines = deadlineData[dateStr] || [];
            
            let dayClass = 'calendar-day';
            if (daySales) dayClass += ' has-sales';
            if (dayDeadlines.length > 0) dayClass += ' has-deadlines';
            
            html += `<div class="${dayClass}" onclick="Calendar.showDayDetail('${dateStr}')">
                        <div class="day-number">${day}</div>`;
            
            // 売上情報
            if (daySales) {
                html += `
                    <div class="day-sales">${this.formatCurrency(daySales.totalRevenue)}</div>
                    <div class="day-count">${daySales.count}件</div>
                `;
            }
            
            // 期日アイコン
            if (dayDeadlines.length > 0) {
                html += '<div class="day-deadlines">';
                dayDeadlines.forEach(deadline => {
                    html += `<span class="deadline-icon ${deadline.type}" title="${deadline.tooltip}">${deadline.icon}</span>`;
                });
                html += '</div>';
            }
            
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    },

    getMonthSalesData() {
        const [year, month] = this.currentYearMonth.split('-').map(Number);
        const sales = Storage.getSales();
        const monthSales = {};
        
        sales.forEach(sale => {
            // 売上日を正しく解析
            const [saleYear, saleMonth, saleDay] = sale.date.split('-').map(Number);
            
            if (saleYear === year && saleMonth === month) {
                const dateStr = sale.date;  // そのまま使用
                
                if (!monthSales[dateStr]) {
                    monthSales[dateStr] = {
                        date: dateStr,
                        sales: [],
                        totalRevenue: 0,
                        count: 0
                    };
                }
                
                const revenue = sale.profit || sale.amount || 0;
                monthSales[dateStr].sales.push(sale);
                monthSales[dateStr].totalRevenue += revenue;
                monthSales[dateStr].count++;
            }
        });
        
        return monthSales;
    },

    getMonthDeadlines() {
        const [year, month] = this.currentYearMonth.split('-').map(Number);
        const properties = Storage.getProperties();
        const sales = Storage.getSales();
        const deadlines = {};
        
        // 物件の期日チェック
        properties.forEach(property => {
            // 媒介契約満了日
            if (property.contractEndDate) {
                const endDate = new Date(property.contractEndDate + 'T00:00:00');
                if (endDate.getFullYear() === year && endDate.getMonth() + 1 === month) {
                    const dateStr = this.formatDateStr(endDate);
                    if (!deadlines[dateStr]) deadlines[dateStr] = [];
                    deadlines[dateStr].push({
                        type: 'contract-end',
                        icon: '📋',
                        tooltip: `媒介契約満了: ${property.name}`
                    });
                }
            }
            
            // レインズ登録期日
            if (property.reinsDeadline) {
                const reinsDate = new Date(property.reinsDeadline + 'T00:00:00');
                if (reinsDate.getFullYear() === year && reinsDate.getMonth() + 1 === month) {
                    const dateStr = this.formatDateStr(reinsDate);
                    if (!deadlines[dateStr]) deadlines[dateStr] = [];
                    deadlines[dateStr].push({
                        type: 'reins-deadline',
                        icon: '🏢',
                        tooltip: `レインズ登録期日: ${property.name}`
                    });
                }
            }
        });
        
        // 売上の期日チェック
        sales.forEach(sale => {
            if (sale.type !== 'realestate') return;
            
            // 決済期日
            if (sale.settlementDate) {
                const settlementDate = new Date(sale.settlementDate + 'T00:00:00');
                if (settlementDate.getFullYear() === year && settlementDate.getMonth() + 1 === month) {
                    const dateStr = this.formatDateStr(settlementDate);
                    if (!deadlines[dateStr]) deadlines[dateStr] = [];
                    deadlines[dateStr].push({
                        type: 'settlement',
                        icon: '💰',
                        tooltip: `決済期日: ${sale.propertyName || sale.dealName}`
                    });
                }
            }
            
            // 融資特約期日
            if (sale.loanConditionDate) {
                const loanDate = new Date(sale.loanConditionDate + 'T00:00:00');
                if (loanDate.getFullYear() === year && loanDate.getMonth() + 1 === month) {
                    const dateStr = this.formatDateStr(loanDate);
                    if (!deadlines[dateStr]) deadlines[dateStr] = [];
                    deadlines[dateStr].push({
                        type: 'loan-condition',
                        icon: '🏦',
                        tooltip: `融資特約期日: ${sale.propertyName || sale.dealName}`
                    });
                }
            }
        });
        
        return deadlines;
    },

    formatDateStr(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    formatCurrency(amount) {
        if (amount >= 10000) {
            return `${Math.floor(amount / 10000)}万`;
        }
        return amount.toLocaleString();
    },

    showDayDetail(dateStr) {
        const salesData = this.getMonthSalesData();
        const deadlineData = this.getMonthDeadlines();
        const daySales = salesData[dateStr];
        const dayDeadlines = deadlineData[dateStr] || [];
        
        if (!daySales && dayDeadlines.length === 0) {
            EstateApp.showToast('この日のデータはありません');
            return;
        }
        
        // モーダルで詳細表示
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>${new Date(dateStr + 'T00:00:00').toLocaleDateString('ja-JP')}の詳細</h3>
                
                ${daySales ? `
                    <div class="day-detail-section">
                        <h4>📊 売上情報</h4>
                        <div class="day-sales-list">
                            ${daySales.sales.map(sale => {
                                let description = '';
                                let amount = 0;
                                
                                switch (sale.type) {
                                    case 'realestate':
                                        description = sale.propertyName || sale.dealName || sale.customerName;
                                        amount = sale.profit;
                                        break;
                                    case 'renovation':
                                        description = sale.propertyName || sale.dealName;
                                        amount = sale.profit;
                                        break;
                                    case 'other':
                                        description = sale.customerName || sale.dealName;
                                        amount = sale.amount;
                                        break;
                                }
                                
                                return `
                                    <div class="day-detail-item">
                                        <div class="day-detail-title">${description}</div>
                                        <div class="day-detail-info">
                                            ${EstateApp.formatCurrency(amount)}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        <div class="day-total">
                            <span>売上合計：</span>
                            <span>${EstateApp.formatCurrency(daySales.totalRevenue)}</span>
                        </div>
                    </div>
                ` : ''}
                
                ${dayDeadlines.length > 0 ? `
                    <div class="day-detail-section">
                        <h4>📅 期日情報</h4>
                        <div class="deadline-list">
                            ${dayDeadlines.map(deadline => `
                                <div class="deadline-item">
                                    <span class="deadline-icon">${deadline.icon}</span>
                                    <span>${deadline.tooltip}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="modal-actions">
                    <button class="secondary-btn" onclick="this.closest('.modal').remove()">閉じる</button>
                </div>
            </div>
        `;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        document.body.appendChild(modal);
    }
};

// グローバルスコープに公開
window.Calendar = Calendar;
