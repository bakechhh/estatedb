// goals.js - 目標管理・モチベーション
const Goals = {
    init() {
        this.setupEventListeners();
        this.loadCurrentGoals();
    },

    setupEventListeners() {
        // 目標設定モーダルのイベントなど
    },

    loadCurrentGoals() {
        const goals = Storage.getGoals();
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthlyGoal = goals.find(g => g.period === currentMonth && g.type === 'monthly');
        
        if (monthlyGoal) {
            this.updateGoalProgress(monthlyGoal);
        }
    },

    updateGoalProgress(goal) {
        const stats = Storage.getMonthlyStats(goal.period);
        const progress = (stats.totalRevenue / goal.targetAmount) * 100;
        
        // ダッシュボードに目標進捗を表示
        const progressElement = document.getElementById('goal-progress');
        if (progressElement) {
            progressElement.innerHTML = `
                <div class="goal-progress-container">
                    <div class="goal-info">
                        <span>月間目標: ${EstateApp.formatCurrency(goal.targetAmount)}</span>
                        <span class="progress-percentage">${Math.round(progress)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
                    </div>
                    ${progress >= 100 ? '<div class="goal-achieved">🎉 目標達成！</div>' : ''}
                </div>
            `;
        }
    },

    checkGoalAchievement(goal) {
        const achievements = Storage.getAchievements();
        const achievementId = `goal_achieved_${goal.period}`;
        
        if (!achievements.find(a => a.id === achievementId)) {
            const achievement = {
                id: achievementId,
                name: '目標達成者',
                description: `${goal.period}の月間目標を達成`,
                icon: '⭐',
                unlockedAt: new Date().toISOString()
            };
            
            Storage.saveAchievement(achievement);
            this.showAchievementUnlock(achievement);
        }
    },
    
    setGoal(type, period, targetAmount, targetContracts, targetMediations) {
        const goal = {
            id: Date.now().toString(),
            type,
            period,
            targetAmount,
            targetContracts,
            targetMediations,
            createdAt: new Date().toISOString()
        };
        
        Storage.saveGoal(goal);
        EstateApp.showToast('目標を設定しました');
    },

    showEnhancedSuccessAnimation(sale) {
        // 基本のエフェクト
        Effects.showSaveEffect(sale.profit || sale.amount, true);
        
        // 追加の豪華なアニメーション
        const celebration = document.createElement('div');
        celebration.className = 'celebration-container';
        celebration.innerHTML = `
            <div class="confetti-container">
                ${this.generateConfetti(50)}
            </div>
            <div class="celebration-message">
                <h1>🎊 成約おめでとうございます！ 🎊</h1>
                <p class="deal-name">${sale.dealName || sale.propertyName || sale.customerName}</p>
                <p class="deal-amount">${EstateApp.formatCurrency(sale.profit || sale.amount)}</p>
            </div>
        `;
        
        document.body.appendChild(celebration);
        
        
        setTimeout(() => {
            celebration.classList.add('fade-out');
            setTimeout(() => celebration.remove(), 1000);
        }, 5000);
        
    },

    showGoalModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        const currentMonth = new Date().toISOString().slice(0, 7);
        const currentGoal = Storage.getGoals().find(g => g.period === currentMonth && g.type === 'monthly');
        
        modal.innerHTML = `
            <div class="modal-content">
                <h3>🎯 月間目標設定</h3>
                <form id="goal-form">
                    <div class="form-group">
                        <label for="goal-amount">目標売上金額（円）</label>
                        <input type="number" id="goal-amount" required min="0" 
                               value="${currentGoal?.targetAmount || ''}" 
                               placeholder="例：5000000">
                    </div>
                    <div class="form-group">
                        <label for="goal-contracts">目標契約件数</label>
                        <input type="number" id="goal-contracts" min="0" 
                               value="${currentGoal?.targetContracts || ''}" 
                               placeholder="例：5">
                    </div>
                    <div class="form-group">
                        <label for="goal-mediations">目標媒介獲得数</label>
                        <input type="number" id="goal-mediations" min="0" 
                               value="${currentGoal?.targetMediations || ''}" 
                               placeholder="例：10">
                    </div>
                    <div class="modal-actions">
                        <button type="submit" class="primary-btn">設定</button>
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
        document.getElementById('goal-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const amount = parseInt(document.getElementById('goal-amount').value);
            const contracts = parseInt(document.getElementById('goal-contracts').value) || 0;
            const mediations = parseInt(document.getElementById('goal-mediations').value) || 0;
            
            this.setGoal('monthly', currentMonth, amount, contracts, mediations);
            modal.remove();
            Dashboard.updateGoalProgress();
        });
    },
    

    generateConfetti(count) {
        let confetti = '';
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500'];
        
        for (let i = 0; i < count; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const left = Math.random() * 100;
            const animationDuration = 3 + Math.random() * 2;
            const animationDelay = Math.random() * 2;
            
            confetti += `<div class="confetti" style="
                left: ${left}%;
                background-color: ${color};
                animation-duration: ${animationDuration}s;
                animation-delay: ${animationDelay}s;
            "></div>`;
        }
        
        return confetti;
    },

    playSuccessSound() {
        // 効果音を再生（音声ファイルが必要）
        // const audio = new Audio('sounds/success.mp3');
        // audio.volume = 0.5;
        // audio.play().catch(e => console.log('効果音の再生に失敗しました'));
    },

    showRanking(period = 'monthly') {
        const rankings = Storage.getRankings(period);
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal-content">
                <h3>🏆 ${period === 'monthly' ? '月間' : '年間'}ランキング</h3>
                <div class="ranking-list">
                    ${rankings.map((entry, index) => `
                        <div class="ranking-item ${index < 3 ? 'top-three' : ''}">
                            <div class="rank">${this.getRankIcon(index + 1)}</div>
                            <div class="rank-info">
                                <div class="rank-name">${entry.name}</div>
                                <div class="rank-stats">
                                    成約: ${entry.dealCount}件 / 
                                    売上: ${EstateApp.formatCurrency(entry.revenue)}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="modal-actions">
                    <button class="secondary-btn" onclick="this.closest('.modal').remove()">閉じる</button>
                </div>
            </div>
        `;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        document.body.appendChild(modal);
    },

    getRankIcon(rank) {
        switch (rank) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return `${rank}位`;
        }
    }
};

// グローバルスコープに公開
window.Goals = Goals;
