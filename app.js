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
        // Backend API call to deduct balance from database
        const response = await fetch('/api/withdraw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegramId: userId, amount: amt })
        });
        const data = await response.json();

        if (data.success) {
            // Update UI balance immediately
            balElem.innerText = data.newBalance.toFixed(8);
            document.getElementById('wallet-balance').innerText = data.newBalance.toFixed(2);

            // Send Telegram Admin Notification
            const notificationMsg = 
                `⚠️ <b>New Withdraw Request</b>\n\n` +
                `👤 <b>User:</b> @${username} (ID: <code>${userId}</code>)\n` +
                `💰 <b>Amount:</b> ${amt} USDT\n` +
                `🏦 <b>Address:</b>\n<code>${addr}</code>`;

            sendAdminNotification(notificationMsg);

            alert('Withdrawal request submitted successfully! Balance deducted.');
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
