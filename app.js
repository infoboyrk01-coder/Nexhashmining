// ----------------------------------------------------
// CONFIGURATION
// ----------------------------------------------------
const BOT_TOKEN = "8894336334:AAHCUnwN23CcYRmAclyYvNI105qhUy9Svjc";        
const ADMIN_CHAT_ID = "7437877993";

const WALLET_USDT_BEP20 = "0x6581e2127fa03399351ad949c9ADFc43cb009Ee1";
const WALLET_TRX_TRC20 = "TGfWMK6mUDgLd1MTHYWGvQgqHceV3WzTBK";

const tg = window.Telegram?.WebApp;

document.addEventListener("DOMContentLoaded", () => {
    let id = "5136435206"; // Default fallback ID for testing in browser
    let name = "imalex15";

    if (tg) {
        tg.ready();
        tg.expand();

        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            const user = tg.initDataUnsafe.user;
            name = user.username || user.first_name || "User";
            id = user.id ? user.id.toString() : "5136435206";
        }
    }

    document.getElementById('username').innerText = name;
    document.getElementById('user-id').innerText = id;

    const refInput = document.getElementById('ref-link');
    if (refInput) {
        refInput.value = `https://t.me/Nexhashminingbot?start=${id}`;
    }

    fetchUserData(id);
    handleReferralSystem();
});

// Backend API Se User Data Fetch Karne Ka Function
async function fetchUserData(telegramId) {
    try {
        const response = await fetch(`/api/user/${telegramId}`);
        const data = await response.json();

        if (data.success) {
            const balanceElem = document.getElementById('balance-val');
            const ghsElem = document.getElementById('ghs-value');
            const walletElem = document.getElementById('wallet-balance');

            if (balanceElem) balanceElem.innerText = data.balance.toFixed(8);
            if (ghsElem) ghsElem.innerText = data.ghs.toFixed(2);
            if (walletElem) walletElem.innerText = data.balance.toFixed(2);

            const calcGhs = document.getElementById('calc-ghs');
            const depositAmtInput = document.getElementById('deposit-amount');
            if (calcGhs && depositAmtInput) {
                depositAmtInput.value = data.ghs > 0 ? data.ghs : 10;
                calcProfit();
            }
        }
    } catch (err) {
        console.error("Error fetching user data from backend:", err);
    }
}

function sendAdminNotification(messageText) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: ADMIN_CHAT_ID,
            text: messageText,
            parse_mode: "HTML"
        })
    }).catch(err => console.error("Notification Error:", err));
}

function handleReferralSystem() {
    if (!tg) return;

    const user = tg.initDataUnsafe?.user;
    if (user && user.id) {
        const startParam = tg.initDataUnsafe?.start_param;
        if (startParam && startParam !== String(user.id)) {
            const hasBeenReferred = localStorage.getItem("nexhash_referred");
            if (!hasBeenReferred) {
                localStorage.setItem("nexhash_referred", "true");
                
                const referralMsg = 
                    `👥 <b>New Referral Joined!</b>\n\n` +
                    `🔗 <b>Inviter ID:</b> <code>${startParam}</code>\n` +
                    `👤 <b>New User:</b> ${user.first_name || "User"} (ID: <code>${user.id}</code>)`;
                
                sendAdminNotification(referralMsg);
            }
        }
    }
}

let selectedCoin = "USDT";
let depositAmt = 10;

function openCoinModal() {
    const amtInput = document.getElementById('deposit-amount');
    depositAmt = parseFloat(amtInput.value) || 10;
    document.getElementById('modal-pay-details').style.display = 'none';
    document.getElementById('payment-modal').style.display = 'flex';
}

function selectCoinAndPay(coin) {
    selectedCoin = coin;
    let addressToShow = WALLET_USDT_BEP20;
    let titleText = "USDT (BEP-20 BNB Smart Chain)";

    if (coin === 'TRX') {
        addressToShow = WALLET_TRX_TRC20;
        titleText = "TRX (TRC-20 TRON Network)";
    }

    document.getElementById('modal-title').innerText = titleText;
    document.getElementById('modal-deposit-amt').innerText = `${depositAmt.toFixed(2)} USDT`;
    document.getElementById('modal-wallet-addr').value = addressToShow;
    document.getElementById('modal-pay-details').style.display = 'block';
}

function closeModal() {
    document.getElementById('payment-modal').style.display = 'none';
}

function copyWalletAddress() {
    const addrInput = document.getElementById('modal-wallet-addr');
    addrInput.select();
    document.execCommand('copy');
    alert('Wallet Address Copied!');
}

function submitDepositHash() {
    const txHash = document.getElementById('tx-hash-input').value.trim();
    if (!txHash) {
        alert('Please enter Transaction Hash (TxID) first!');
        return;
    }

    const userId = document.getElementById('user-id').innerText;
    const username = document.getElementById('username').innerText;

    const notificationMsg = 
        `🚨 <b>New Deposit Request</b>\n\n` +
        `👤 <b>User:</b> @${username} (ID: <code>${userId}</code>)\n` +
        `💵 <b>Amount:</b> ${depositAmt} USDT\n` +
        `🪙 <b>Coin:</b> ${selectedCoin}\n` +
        `🔗 <b>TxHash:</b>\n<code>${txHash}</code>`;

    sendAdminNotification(notificationMsg);

    alert('Payment request submitted to Admin! Power will be credited after verification.');
    closeModal();
    switchTab('mining');
}

// Withdraw Logic With Database Deduction
async function submitWithdraw() {
    const addr = document.getElementById('withdraw-addr').value.trim();
    const amt = parseFloat(document.getElementById('withdraw-amt').value) || 0;
    const userId = document.getElementById('user-id').innerText;
    const username = document.getElementById('username').innerText;

    const balElem = document.getElementById('balance-val');
    const currentBalance = parseFloat(balElem.innerText) || 0;

    if (!addr || amt < 0.5) {
        alert('Please enter valid address and minimum 0.5 USDT!');
        return;
    }

    if (amt > currentBalance) {
        alert('Insufficient balance for withdrawal!');
        return;
    }

    try {
        const response = await fetch('/api/withdraw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegramId: userId, amount: amt })
        });
        const data = await response.json();

        if (data.success) {
            balElem.innerText = data.newBalance.toFixed(8);
            document.getElementById('wallet-balance').innerText = data.newBalance.toFixed(2);

            const notificationMsg = 
                `⚠️ <b>New Withdraw Request</b>\n\n` +
                `👤 <b>User:</b> @${username} (ID: <code>${userId}</code>)\n` +
                `💰 <b>Amount:</b> ${amt} USDT\n` +
                `🏦 <b>Address:</b>\n<code>${addr}</code>`;

            sendAdminNotification(notificationMsg);

            alert('Withdrawal request submitted successfully!');
            document.getElementById('withdraw-amt').value = '';
            document.getElementById('withdraw-addr').value = '';
        } else {
            alert('Withdrawal failed: ' + (data.error || 'Unknown error'));
        }
    } catch (err) {
        console.error('Withdraw error:', err);
        alert('Server error during withdrawal.');
    }
}

let taskStatus = 'JOIN';
function handleTask(taskId, url) {
    const btn = document.getElementById(`btn-task-${taskId}`);
    if (!btn) return;

    if (taskStatus === 'JOIN') {
        window.open(url, '_blank');
        taskStatus = 'CHECK';
        btn.innerText = 'CHECK';
    } else if (taskStatus === 'CHECK') {
        taskStatus = 'CLAIM';
        btn.innerText = 'CLAIM';
    } else if (taskStatus === 'CLAIM') {
        alert('+0.01 GHS Power added successfully!');
        taskStatus = 'CLAIMED';
        btn.innerText = 'CLAIMED';
        btn.style.opacity = '0.5';
        btn.disabled = true;
        
        let ghsElem = document.getElementById('ghs-value');
        if (ghsElem) {
            let currentGhs = parseFloat(ghsElem.innerText) || 0;
            ghsElem.innerText = (currentGhs + 0.01).toFixed(2);
        }
    }
}

let minedUSDT = 0.00000000;
setInterval(() => {
    minedUSDT += 0.00000012;
    const minedElem = document.getElementById('mined-usdt');
    if (minedElem) {
        minedElem.innerText = minedUSDT.toFixed(8);
    }
}, 1000);

// Claim Reward API Call to Save Earned Balance to Database
async function claimReward() {
    if (minedUSDT <= 0) return;
    
    const userId = document.getElementById('user-id').innerText;
    const amountToClaim = minedUSDT;

    try {
        const response = await fetch('/api/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegramId: userId, claimedAmount: amountToClaim })
        });

        const data = await response.json();

        if (data.success) {
            let balElem = document.getElementById('balance-val');
            let wallElem = document.getElementById('wallet-balance');

            if (balElem) balElem.innerText = data.newBalance.toFixed(8);
            if (wallElem) wallElem.innerText = data.newBalance.toFixed(2);

            minedUSDT = 0.00000000;
            if (document.getElementById('mined-usdt')) {
                document.getElementById('mined-usdt').innerText = "0.00000000";
            }
            
            alert('USDT claimed and saved to database successfully!');
        }
    } catch (err) {
        console.error("Error claiming reward:", err);
    }
}

function generateRandomTicker() {
    const isDeposit = Math.random() > 0.3;
    const type = isDeposit ? 'DEPOSIT' : 'WITHDRAW';
    const tagClass = isDeposit ? 'deposit' : 'withdraw';
    const randomUser = Math.floor(1000 + Math.random() * 9000);
    const randomAmount = (Math.random() * 145 + 5).toFixed(2);

    const tickerHTML = `<span class="tag ${tagClass}">${type}</span> User...${randomUser} ${isDeposit ? 'deposited' : 'withdrew'} ${randomAmount} USDT`;

    const tickerElem = document.getElementById('ticker-text');
    if (tickerElem) {
        tickerElem.style.opacity = '0';
        setTimeout(() => {
            tickerElem.innerHTML = tickerHTML;
            tickerElem.style.opacity = '1';
        }, 300);
    }
}
setInterval(generateRandomTicker, 3000);

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    
    const targetTab = document.getElementById(`tab-${tabId}`);
    if (targetTab) targetTab.classList.add('active');
    
    const activeNav = Array.from(document.querySelectorAll('.nav-item')).find(btn => 
        btn.getAttribute('onclick')?.includes(tabId)
    );
    if (activeNav) activeNav.classList.add('active');
}

function calcProfit() {
    const amount = parseFloat(document.getElementById('deposit-amount').value) || 0;
    document.getElementById('calc-ghs').innerText = amount;
    document.getElementById('daily-profit').innerText = (amount * 0.30).toFixed(2) + " USDT";
    document.getElementById('total-profit').innerText = (amount * 0.30 * 15).toFixed(2) + " USDT";
}

function copyRef() {
    const refInput = document.getElementById('ref-link');
    if (refInput) {
        refInput.select();
        document.execCommand('copy');
        alert('Referral link copied!');
    }
}
async function submitYouTubeTask() {
    const videoLink = prompt("Apni YouTube video ka link yahan paste karein (Admin review ke baad $1 credit hoga):");
    if (!videoLink || (!videoLink.includes("youtube.com") && !videoLink.includes("youtu.be"))) {
        alert("Please enter a valid YouTube video link!");
        return;
    }

    const userId = document.getElementById('user-id').innerText;
    const username = document.getElementById('username').innerText;

    // Sirf Admin ko notification bhejega
    const notificationMsg = 
        `📺 <b>New YouTube Video Submission!</b>\n\n` +
        `👤 <b>User:</b> @${username} (ID: <code>${userId}</code>)\n` +
        `🔗 <b>Video Link:</b>\n${videoLink}\n\n` +
        `💡 <i>Review karke /addbalance command se balance add karein.</i>`;

    sendAdminNotification(notificationMsg);

    alert('YouTube video link submitted successfully to Admin for review!');
}
