// reports.js - レポート機能
const Reports = {
    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        // 期間選択
        document.getElementById('report-period').addEventListener('change', (e) => {
            const customPeriod = document.getElementById('custom-period');
            if (e.target.value === 'custom') {
                customPeriod.style.display = 'flex';
            } else {
                customPeriod.style.display = 'none';
            }
        });

        // レポート生成
        document.getElementById('generate-report-btn').addEventListener('click', () => {
            this.generateReport();
        });
    },

    generateReport() {
        const period = document.getElementById('report-period').value;
        const { startDate, endDate } = this.getPeriodDates(period);
        
        // データ取得
        const sales = this.filterSalesByPeriod(Storage.getSales(), startDate, endDate);
        const properties = Storage.getProperties();
        
        // レポート生成
        const reportContent = document.getElementById('report-content');
        reportContent.innerHTML = `
            <div class="report-section">
                <h3>売上サマリー</h3>
                ${this.generateSalesSummary(sales, startDate, endDate)}
            </div>
            
            <div class="report-section">
                <h3>取引明細</h3>
                ${this.generateTransactionDetails(sales)}
            </div>
            
            <div class="report-section">
                <h3>在庫状況</h3>
                ${this.generateInventoryStatus(properties)}
            </div>
            
            <div class="report-section">
                <h3>物件別収益ランキング</h3>
                ${this.generatePropertyRanking(sales)}
            </div>
        `;
    },

    getPeriodDates(period) {
        const now = new Date();
        let startDate, endDate;
        
        switch (period) {
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), quarter * 3, 1);
                endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31);
                break;
            case 'custom':
                startDate = new Date(document.getElementById('report-start-date').value);
                endDate = new Date(document.getElementById('report-end-date').value);
                break;
        }
        
        return { startDate, endDate };
    },

    filterSalesByPeriod(sales, startDate, endDate) {
        return sales.filter(sale => {
            const saleDate = new Date(sale.date);
            return saleDate >= startDate && saleDate <= endDate;
        });
    },

    generateSalesSummary(sales, startDate, endDate) {
        const summary = {
            totalRevenue: 0,
            realEstateRevenue: 0,
            renovationRevenue: 0,
            otherRevenue: 0,
            dealCount: sales.length,
            realEstateCount: 0,
            renovationCount: 0,
            otherCount: 0
        };
        
        sales.forEach(sale => {
            const revenue = sale.profit || sale.amount || 0;
            summary.totalRevenue += revenue;
            
            switch (sale.type) {
                case 'realestate':
                    summary.realEstateRevenue += revenue;
                    summary.realEstateCount++;
                    break;
                case 'renovation':
                    summary.renovationRevenue += revenue;
                    summary.renovationCount++;
                    break;
                case 'other':
                    summary.otherRevenue += revenue;
                    summary.otherCount++;
                    break;
            }
        });
        
        const periodText = `${EstateApp.formatDate(startDate.toISOString())} 〜 ${EstateApp.formatDate(endDate.toISOString())}`;
        
        return `
            <p><strong>期間：</strong>${periodText}</p>
            <div class="report-summary">
                <div class="summary-card">
                    <span class="summary-label">総収益</span>
                    <span class="summary-value">${EstateApp.formatCurrency(summary.totalRevenue)}</span>
                </div>
                <div class="summary-card">
                    <span class="summary-label">取引件数</span>
                    <span class="summary-value">${summary.dealCount}件</span>
                </div>
                <div class="summary-card">
                    <span class="summary-label">売買収益</span>
                    <span class="summary-value">${EstateApp.formatCurrency(summary.realEstateRevenue)}</span>
                    <span class="summary-label">${summary.realEstateCount}件</span>
                </div>
                <div class="summary-card">
                    <span class="summary-label">リフォーム収益</span>
                    <span class="summary-value">${EstateApp.formatCurrency(summary.renovationRevenue)}</span>
                    <span class="summary-label">${summary.renovationCount}件</span>
                </div>
                <div class="summary-card">
                    <span class="summary-label">その他収益</span>
                    <span class="summary-value">${EstateApp.formatCurrency(summary.otherRevenue)}</span>
                    <span class="summary-label">${summary.otherCount}件</span>
                </div>
            </div>
        `;
    },

    generateTransactionDetails(sales) {
        if (sales.length === 0) {
            return '<p>該当期間の取引データがありません。</p>';
        }
        
        const rows = sales.map(sale => {
            let type = '';
            let description = '';
            let amount = 0;
            
            switch (sale.type) {
                case 'realestate':
                    type = '売買';
                    description = sale.propertyName || sale.customerName;
                    amount = sale.profit;
                    break;
                case 'renovation':
                    type = 'リフォーム';
                    description = sale.propertyName;
                    amount = sale.profit;
                    break;
                case 'other':
                    type = this.getOtherTypeText(sale.subType);
                    description = sale.customerName;
                    amount = sale.amount;
                    break;
            }
            
            return `
                <tr>
                    <td>${EstateApp.formatDate(sale.date)}</td>
                    <td>${type}</td>
                    <td>${description}</td>
                    <td style="text-align: right;">${EstateApp.formatCurrency(amount)}</td>
                </tr>
            `;
        }).join('');
        
        return `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>日付</th>
                        <th>種別</th>
                        <th>案件名</th>
                        <th style="text-align: right;">収益</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    },

    generateInventoryStatus(properties) {
        const statusCount = {
            active: 0,
            negotiating: 0,
            contracted: 0,
            completed: 0
        };
        
        let totalValue = 0;
        const activeProperties = [];
        
        properties.forEach(property => {
            statusCount[property.status]++;
            
            if (property.status === 'active' || property.status === 'negotiating') {
                totalValue += property.sellingPrice || 0;
                activeProperties.push(property);
            }
        });
        
        return `
            <div class="report-summary">
                <div class="summary-card">
                    <span class="summary-label">販売中</span>
                    <span class="summary-value">${statusCount.active}件</span>
                </div>
                <div class="summary-card">
                    <span class="summary-label">商談中</span>
                    <span class="summary-value">${statusCount.negotiating}件</span>
                </div>
                <div class="summary-card">
                    <span class="summary-label">契約済</span>
                    <span class="summary-value">${statusCount.contracted}件</span>
                </div>
                <div class="summary-card">
                    <span class="summary-label">取引完了</span>
                    <span class="summary-value">${statusCount.completed}件</span>
                </div>
                <div class="summary-card">
                    <span class="summary-label">在庫総額</span>
                    <span class="summary-value">${EstateApp.formatCurrency(totalValue)}</span>
                </div>
            </div>
            
            <h4>販売中・商談中物件一覧</h4>
            ${this.generateActivePropertiesTable(activeProperties)}
        `;
    },

    generateActivePropertiesTable(properties) {
        if (properties.length === 0) {
            return '<p>販売中・商談中の物件はありません。</p>';
        }
        
        const rows = properties.map(property => `
            <tr>
                <td>${property.code}</td>
                <td>${property.name}</td>
                <td>${Inventory.getPropertyTypeText(property.type)}</td>
                <td>${Inventory.getStatusText(property.status)}</td>
                <td style="text-align: right;">${EstateApp.formatCurrency(property.sellingPrice)}</td>
            </tr>
        `).join('');
        
        return `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>物件番号</th>
                        <th>物件名</th>
                        <th>種別</th>
                        <th>ステータス</th>
                        <th style="text-align: right;">価格</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    },

    generatePropertyRanking(sales) {
        // 物件別の収益を集計
        const propertyRevenue = {};
        
        sales.filter(sale => sale.type === 'realestate' && sale.propertyId).forEach(sale => {
            const property = Storage.getProperty(sale.propertyId);
            if (property) {
                if (!propertyRevenue[sale.propertyId]) {
                    propertyRevenue[sale.propertyId] = {
                        property,
                        revenue: 0,
                        count: 0
                    };
                }
                propertyRevenue[sale.propertyId].revenue += sale.profit;
                propertyRevenue[sale.propertyId].count++;
            }
        });
        
        // ランキング作成
        const ranking = Object.values(propertyRevenue)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        
        if (ranking.length === 0) {
            return '<p>該当期間の物件取引データがありません。</p>';
        }
        
        const rows = ranking.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${item.property.code}</td>
                <td>${item.property.name}</td>
                <td style="text-align: center;">${item.count}件</td>
                <td style="text-align: right;">${EstateApp.formatCurrency(item.revenue)}</td>
            </tr>
        `).join('');
        
        return `
            <table class="report-table">
                <thead>
                    <tr>
                        <th style="width: 50px;">順位</th>
                        <th>物件番号</th>
                        <th>物件名</th>
                        <th style="text-align: center;">取引数</th>
                        <th style="text-align: right;">収益</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    },

    getOtherTypeText(type) {
        const typeMap = {
            consulting: 'コンサルティング',
            referral: '紹介料',
            management: '管理料',
            other: 'その他'
        };
        return typeMap[type] || type;
    }
};

// グローバルスコープに公開
window.Reports = Reports;
