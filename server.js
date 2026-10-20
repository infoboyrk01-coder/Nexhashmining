require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Serve Static Frontend Files
app.use(express.static(path.join(__dirname)));

const token = process.env.BOT_TOKEN;
const mongoUri = process.env.MONGODB_URI;

// MongoDB Connection
mongoose.connect(mongoUri)
  .then(() => console.log('MongoDB Connected Successfully...'))
  .catch(err => console.log('MongoDB Connection Error:', err));

// Schema Definition
const userSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 }, // Mined/Claimed Balance
  ghs: { type: Number, default: 10 }     // Default 10 GHS
});

const User = mongoose.model('User', userSchema);

const bot = new TelegramBot(token, { polling: true });
const ADMIN_ID = '7437877993';

// Bot /start Command
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Welcome to Nexhash Mining Bot!');
});

// Admin Command: /addbalance <user_id> <amount>
// Example: /addbalance 5136435206 10
bot.onText(/\/addbalance (\d+) (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id.toString();

  if (senderId !== ADMIN_ID) {
    return bot.sendMessage(chatId, "⚠️ Only Admin can use this command.");
  }

  const targetUserId = match[1];
  const amount = parseFloat(match[2]);
  const ghsToAdd = amount; 

  try {
    const updatedUser = await User.findOneAndUpdate(
      { telegramId: targetUserId },
      { $inc: { ghs: ghsToAdd } },
      { new: true, upsert: true }
    );

    bot.sendMessage(
      chatId, 
      `✅ **Success!**\n\nUser ID: \`${targetUserId}\` ko +${ghsToAdd} GHS mining power add kar di gayi hai.`
    );

    bot.sendMessage(
      targetUserId, 
      `🎉 **Deposit Approved!**\n\nAapka deposit approve ho gaya hai.\n⚡ **Mining Power Added:** +${ghsToAdd} GHS`
    );
  } catch (error) {
    console.error("Error adding GHS:", error);
    bot.sendMessage(chatId, "❌ Error updating database.");
  }
});

// API: Fetch User Data
app.get('/api/user/:telegramId', async (req, res) => {
  try {
    const telegramId = req.params.telegramId;
    let user = await User.findOne({ telegramId });

    if (!user) {
      user = await User.create({ telegramId, balance: 0, ghs: 10 });
    }

    res.json({
      success: true,
      balance: user.balance || 0,
      ghs: user.ghs || 10
    });
  } catch (error) {
    console.error("API Fetch Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Claim Mining Reward
app.post('/api/claim', async (req, res) => {
  try {
    const { telegramId, claimedAmount } = req.body;
    const amount = parseFloat(claimedAmount);

    if (!telegramId || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: "Invalid amount" });
    }

    const user = await User.findOneAndUpdate(
      { telegramId },
      { $inc: { balance: amount } },
      { new: true }
    );

    res.json({ success: true, newBalance: user ? user.balance : 0 });
  } catch (error) {
    console.error("Claim API Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Withdraw Request (Deducts Balance from Database)
app.post('/api/withdraw', async (req, res) => {
  try {
    const { telegramId, amount } = req.body;
    const withdrawAmount = parseFloat(amount);

    if (!telegramId || isNaN(withdrawAmount) || withdrawAmount < 0.5) {
      return res.status(400).json({ success: false, error: "Invalid withdrawal request" });
    }

    const user = await User.findOne({ telegramId });
    if (!user || user.balance < withdrawAmount) {
      return res.status(400).json({ success: false, error: "Insufficient balance" });
    }

    user.balance -= withdrawAmount;
    await user.save();

    res.json({ success: true, newBalance: user.balance });
  } catch (error) {
    console.error("Withdraw API Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
