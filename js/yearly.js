// yearly.js - 年間推移機能
const Yearly = {
    currentYear: new Date().getFullYear(),

    init() {
        this.setupEventListeners();
        this.setupYearSelector();
        this.renderYearlyReport();
    },

    setupEventListeners() {
        const refreshBtn = document.getElementById('refresh-yearly-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.renderYearlyReport();
            });
        }

        const yearSelector = document.getElementById('yearly-year');
        if (yearSelector) {
            yearSelector.addEventListener('change', (e) => {
                this.currentYear = parseInt(e.target.value);
                this.renderYearlyReport();
            });
        }
    },

    setupYearSelector() {
        const yearSelector = document.getElementById('yearly-year');
        if (!yearSelector) return;

        const currentYear = new Date().getFullYear();
        const years = [];
        
        // 過去5年から来年までの選択肢を作成
        for (let year = currentYear - 5; year <= currentYear + 1; year++) {
            years.push(`<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}年</option>`);
        }
        
        yearSelector.innerHTML = years.join('');
    },

    renderYearlyReport() {
        const container = document.getElementById('yearly-content');
        if (!container) return;

        const yearData = this.calculateYearlyData();
        
        container.innerHTML = `
            <div class="yearly-summary">
                <div class="summary-row">
                    <div class="summary-card large">
                        <h3>年間累計</h3>
                        <div class="summary-item">
                            <span class="summary-label">売上</span>
                            <span class="summary-value">${EstateApp.formatCurrency(yearData.yearTotal.sales)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">回収</span>
                            <span class="summary-value">${EstateApp.formatCurrency(yearData.yearTotal.collected)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">回収率</span>
                            <span class="summary-value">${yearData.yearTotal.collectionRate}%</span>
                        </div>
                    </div>
                    
                    <div class="summary-card">
                        <h3>上半期（1-6月）</h3>
                        <div class="summary-item">
                            <span class="summary-label">売上</span>
                            <span class="summary-value">${EstateApp.formatCurrency(yearData.firstHalf.sales)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">回収</span>
                            <span class="summary-value">${EstateApp.formatCurrency(yearData.firstHalf.collected)}</span>
                        </div>
                    </div>
                    
                    <div class="summary-card">
                        <h3>下半期（7-12月）</h3>
                        <div class="summary-item">
                            <span class="summary-label">売上</span>
                            <span class="summary-value">${EstateApp.formatCurrency(yearData.secondHalf.sales)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">回収</span>
                            <span class="summary-value">${EstateApp.formatCurrency(yearData.secondHalf.collected)}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="monthly-breakdown">
                <h3>月別推移</h3>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>月</th>
                            <th style="text-align: right;">売上</th>
                            <th style="text-align: right;">回収</th>
                            <th style="text-align: right;">回収率</th>
                            <th style="text-align: right;">累計売上</th>
                            <th style="text-align: right;">累計回収</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.generateMonthlyRows(yearData.monthly)}
                    </tbody>
                </table>
            </div>
            
            <div class="yearly-chart">
                <h3>売上・回収推移グラフ</h3>
                <canvas id="yearly-chart"></canvas>
            </div>
        `;
        
        // グラフを描画
        this.renderChart(yearData.monthly);
    },

    calculateYearlyData() {
        const sales = Storage.getSales();
        const yearData = {
            monthly: {},
            yearTotal: { sales: 0, collected: 0, collectionRate: 0 },
            firstHalf: { sales: 0, collected: 0 },
            secondHalf: { sales: 0, collected: 0 }
        };
        
        // 月別データの初期化
        for (let month = 1; month <= 12; month++) {
            yearData.monthly[month] = {
                sales: 0,
                collected: 0,
                collectionRate: 0,
                cumulativeSales: 0,
                cumulativeCollected: 0
            };
        }
        
        // 売上データを集計
        sales.forEach(sale => {
            const saleDate = new Date(sale.date);
            const saleYear = saleDate.getFullYear();
            const saleMonth = saleDate.getMonth() + 1;
            
            if (saleYear !== this.currentYear) return;
            
            const amount = sale.profit || sale.amount || 0;
            
            // 売上として計上
            yearData.monthly[saleMonth].sales += amount;
            yearData.yearTotal.sales += amount;
            
            if (saleMonth <= 6) {
                yearData.firstHalf.sales += amount;
            } else {
                yearData.secondHalf.sales += amount;
            }
            
            // 回収日が設定されている場合は回収として計上
            if (sale.collectionDate) {
                const collectionDate = new Date(sale.collectionDate);
                const collectionYear = collectionDate.getFullYear();
                const collectionMonth = collectionDate.getMonth() + 1;
                
                if (collectionYear === this.currentYear) {
                    yearData.monthly[collectionMonth].collected += amount;
                    yearData.yearTotal.collected += amount;
                    
                    if (collectionMonth <= 6) {
                        yearData.firstHalf.collected += amount;
                    } else {
                        yearData.secondHalf.collected += amount;
                    }
                }
            }
        });
        
        // 累計と回収率を計算
        let cumulativeSales = 0;
        let cumulativeCollected = 0;
        
        for (let month = 1; month <= 12; month++) {
            const monthData = yearData.monthly[month];
            cumulativeSales += monthData.sales;
            cumulativeCollected += monthData.collected;
            
            monthData.cumulativeSales = cumulativeSales;
            monthData.cumulativeCollected = cumulativeCollected;
            
            if (monthData.sales > 0) {
                monthData.collectionRate = Math.round((monthData.collected / monthData.sales) * 100);
            }
        }
        
        // 年間回収率
        if (yearData.yearTotal.sales > 0) {
            yearData.yearTotal.collectionRate = Math.round((yearData.yearTotal.collected / yearData.yearTotal.sales) * 100);
        }
        
        return yearData;
    },

    generateMonthlyRows(monthlyData) {
        const rows = [];
        
        for (let month = 1; month <= 12; month++) {
            const data = monthlyData[month];
            const monthName = new Date(2024, month - 1, 1).toLocaleDateString('ja-JP', { month: 'long' });
            
            rows.push(`
                <tr>
                    <td>${monthName}</td>
                    <td style="text-align: right;">${EstateApp.formatCurrency(data.sales)}</td>
                    <td style="text-align: right;">${EstateApp.formatCurrency(data.collected)}</td>
                    <td style="text-align: right;">${data.collectionRate}%</td>
                    <td style="text-align: right;">${EstateApp.formatCurrency(data.cumulativeSales)}</td>
                    <td style="text-align: right;">${EstateApp.formatCurrency(data.cumulativeCollected)}</td>
                </tr>
            `);
        }
        
        return rows.join('');
    },

    renderChart(monthlyData) {
        const canvas = document.getElementById('yearly-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.parentElement.offsetWidth;
        const height = 400;
        
        canvas.width = width;
        canvas.height = height;
        
        // グラフのデータを準備
        const months = [];
        const salesData = [];
        const collectedData = [];
        
        for (let month = 1; month <= 12; month++) {
            months.push(new Date(2024, month - 1, 1).toLocaleDateString('ja-JP', { month: 'short' }));
            salesData.push(monthlyData[month].sales);
            collectedData.push(monthlyData[month].collected);
        }
        
        // 簡易的なグラフ描画（実際のプロジェクトではChart.jsなどを使用推奨）
        const maxValue = Math.max(...salesData, ...collectedData) || 1;
        const chartHeight = height - 60;
        const chartWidth = width - 80;
        const barWidth = chartWidth / (months.length * 2 + months.length + 1);
        const scale = chartHeight / maxValue;
        
        // 背景
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, width, height);
        
        // 軸
        ctx.strokeStyle = '#666';
        ctx.beginPath();
        ctx.moveTo(40, height - 40);
        ctx.lineTo(width - 40, height - 40);
        ctx.moveTo(40, height - 40);
        ctx.lineTo(40, 20);
        ctx.stroke();
        
        // データを描画
        months.forEach((month, index) => {
            const x = 60 + index * (barWidth * 3);
            
            // 売上
            const salesHeight = salesData[index] * scale;
            ctx.fillStyle = '#1a73e8';
            ctx.fillRect(x, height - 40 - salesHeight, barWidth, salesHeight);
            
            // 回収
            const collectedHeight = collectedData[index] * scale;
            ctx.fillStyle = '#34a853';
            ctx.fillRect(x + barWidth + 5, height - 40 - collectedHeight, barWidth, collectedHeight);
            
            // 月ラベル
            ctx.fillStyle = '#666';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(month, x + barWidth, height - 20);
        });
        
        // 凡例
        ctx.fillStyle = '#1a73e8';
        ctx.fillRect(width - 150, 30, 20, 15);
        ctx.fillStyle = '#666';
        ctx.fillText('売上', width - 120, 42);
        
        ctx.fillStyle = '#34a853';
        ctx.fillRect(width - 150, 55, 20, 15);
        ctx.fillStyle = '#666';
        ctx.fillText('回収', width - 120, 67);
    }
};

// グローバルスコープに公開
window.Yearly = Yearly;
