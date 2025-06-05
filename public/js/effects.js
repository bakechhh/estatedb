// effects.js - エフェクト機能
const Effects = {
    // 売上登録時のエフェクト
    showSaveEffect(amount, isExcludingTax = true) {
        // 金額ポップアップ
        this.showAmountPopup(amount, isExcludingTax);
        
        // シンプルな成功アニメーション
        this.showSuccessAnimation();
    },

    // 金額ポップアップ
    showAmountPopup(amount, isExcludingTax) {
        const popup = document.createElement('div');
        popup.className = 'amount-popup';
        
        // 税抜き表示
        const formattedAmount = EstateApp.formatCurrency(amount, isExcludingTax);
        popup.textContent = `+${formattedAmount}`;
        
        // ランダムな位置に配置
        const x = Math.random() * (window.innerWidth - 200) + 100;
        popup.style.left = `${x}px`;
        popup.style.bottom = '100px';
        
        document.body.appendChild(popup);
        
        // アニメーション後に削除
        setTimeout(() => popup.remove(), 2000);
    },

    // 成功アニメーション
    showSuccessAnimation() {
        const successIcon = document.createElement('div');
        successIcon.className = 'success-animation';
        successIcon.innerHTML = '✓';
        successIcon.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0);
            font-size: 80px;
            color: var(--success-color);
            animation: successPop 0.6s ease-out forwards;
            z-index: 10000;
        `;
        
        document.body.appendChild(successIcon);
        
        setTimeout(() => successIcon.remove(), 600);
    },

    // 目標達成エフェクト
    showAchievementEffect(message = '目標達成！') {
        const banner = document.createElement('div');
        banner.className = 'achievement-banner';
        banner.innerHTML = `
            <div class="achievement-content">
                <div class="achievement-icon">🎉</div>
                <div class="achievement-text">${message}</div>
                <div class="achievement-subtext">おめでとうございます！</div>
            </div>
        `;
        
        document.body.appendChild(banner);
        
        // 5秒後に削除
        setTimeout(() => {
            banner.classList.add('fade-out');
            setTimeout(() => banner.remove(), 500);
        }, 5000);
    },

    // 新記録エフェクト
    showNewRecordEffect(recordType) {
        const effect = document.createElement('div');
        effect.className = 'new-record-effect';
        effect.innerHTML = `
            <div class="new-record-content">
                <div class="new-record-stars">✨</div>
                <div class="new-record-text">NEW RECORD!</div>
                <div class="new-record-type">${recordType}</div>
            </div>
        `;
        
        document.body.appendChild(effect);
        
        // 3秒後に削除
        setTimeout(() => {
            effect.classList.add('fade-out');
            setTimeout(() => effect.remove(), 500);
        }, 3000);
    }
};

// アニメーション用CSS追加
const effectStyles = document.createElement('style');
effectStyles.textContent = `
    /* 金額ポップアップ */
    .amount-popup {
        position: fixed;
        font-size: 2rem;
        font-weight: bold;
        color: var(--success-color);
        animation: floatUp 2s ease-out forwards;
        pointer-events: none;
        z-index: 10000;
    }

    @keyframes floatUp {
        0% {
            transform: translateY(0) scale(0.5);
            opacity: 0;
        }
        20% {
            transform: translateY(-20px) scale(1.2);
            opacity: 1;
        }
        100% {
            transform: translateY(-150px) scale(1);
            opacity: 0;
        }
    }

    /* 成功アニメーション */
    @keyframes successPop {
        0% {
            transform: translate(-50%, -50%) scale(0) rotate(0deg);
            opacity: 0;
        }
        50% {
            transform: translate(-50%, -50%) scale(1.2) rotate(180deg);
            opacity: 1;
        }
        100% {
            transform: translate(-50%, -50%) scale(1) rotate(360deg);
            opacity: 0;
        }
    }

    /* 達成バナー */
    .achievement-banner {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #ffd700, #ffed4e);
        color: #333;
        padding: 3rem 4rem;
        border-radius: 20px;
        box-shadow: 0 10px 50px rgba(0, 0, 0, 0.3);
        z-index: 10001;
        animation: achievementPop 0.5s ease-out;
    }

    .achievement-content {
        text-align: center;
    }

    .achievement-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
    }

    .achievement-text {
        font-size: 2.5rem;
        font-weight: bold;
        margin-bottom: 0.5rem;
    }

    .achievement-subtext {
        font-size: 1.2rem;
    }

    @keyframes achievementPop {
        0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0;
        }
        50% {
            transform: translate(-50%, -50%) scale(1.1);
        }
        100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
        }
    }

    .achievement-banner.fade-out {
        animation: fadeOut 0.5s ease-out forwards;
    }

    @keyframes fadeOut {
        to {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
        }
    }

    /* 新記録エフェクト */
    .new-record-effect {
        position: fixed;
        top: 20%;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10002;
        animation: recordPop 0.5s ease-out;
    }

    .new-record-content {
        background: linear-gradient(135deg, #ff6b6b, #ee5a24);
        color: white;
        padding: 2rem 3rem;
        border-radius: 15px;
        text-align: center;
        box-shadow: 0 5px 30px rgba(0, 0, 0, 0.3);
    }

    .new-record-stars {
        font-size: 2rem;
        margin-bottom: 0.5rem;
    }

    .new-record-text {
        font-size: 1.8rem;
        font-weight: bold;
        margin-bottom: 0.5rem;
    }

    .new-record-type {
        font-size: 1.1rem;
    }

    @keyframes recordPop {
        0% {
            transform: translateX(-50%) translateY(-50px);
            opacity: 0;
        }
        100% {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
    }

    .new-record-effect.fade-out {
        animation: recordSlideDown 0.5s ease-out forwards;
    }

    @keyframes recordSlideDown {
        to {
            transform: translateX(-50%) translateY(50px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(effectStyles);

// グローバルスコープに公開
window.Effects = Effects;
