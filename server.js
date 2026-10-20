require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Serve Frontend Static Files
app.use(express.static(path.join(__dirname)));

const token = process.env.BOT_TOKEN;
const mongoUri = process.env.MONGODB_URI;

// Connection
mongoose.connect(mongoUri)
  .then(() => console.log('MongoDB Connected...'))
  .catch(err => console.log('MongoDB Connection Error:', err));

// MongoDB Schema for User
const userSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 }, // Sirf earned/mined balance
  ghs: { type: Number, default: 1 }     // Mining Power
});

const User = mongoose.model('User', userSchema);

const bot = new TelegramBot(token, { polling: true });

// ADMIN TELEGRAM ID
const ADMIN_ID = '7437877993';

// Start Command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Hello! Your bot is running successfully.');
});

// Admin Command: /addbalance <user_id> <amount>
// (Deposit karne par balance nahi, balki sirf GHS/Mining Power badhegi ya agar balance dena ho toh inc karega)
bot.onText(/\/addbalance (\d+) (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id.toString();

  if (senderId !== ADMIN_ID) {
    return bot.sendMessage(chatId, "⚠️ Only Admin can use this command.");
  }

  const targetUserId = match[1];
  const amount = parseFloat(match[2]);
  const ghsToAdd = amount; // $10 deposit = 10 GHS power

  try {
    const updatedUser = await User.findOneAndUpdate(
      { telegramId: targetUserId },
      { 
        $inc: { 
          ghs: ghsToAdd  // Deposit se sirf GHS power badhegi
        } 
      },
      { new: true, upsert: true }
    );

    bot.sendMessage(
      chatId, 
      `✅ **Success!**\n\nUser ID: \`${targetUserId}\` ko ${ghsToAdd} GHS mining power successfully add kar di gayi hai.`
    );

    bot.sendMessage(
      targetUserId, 
      `🎉 **Deposit Approved!**\n\nAapka deposit approve ho gaya hai.\n⚡ **Mining Power Added:** +${ghsToAdd} GHS`
    );

  } catch (error) {
    console.error("Error updating GHS:", error);
    bot.sendMessage(chatId, "❌ Error adding GHS to database.");
  }
});

// API ROUTE: Get User Data
app.get('/api/user/:telegramId', async (req, res) => {
  try {
    const telegramId = req.params.telegramId;
    let user = await User.findOne({ telegramId });
    
    if (!user) {
      user = await User.create({ telegramId, balance: 0, ghs: 1 });
    }

    res.json({
      success: true,
      balance: user.balance || 0,
      ghs: user.ghs || 1
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API ROUTE: Withdraw Balance (Deducts balance from DB)
app.post('/api/withdraw', async (req, res) => {
  try {
    const { telegramId, amount } = req.body;
    const withdrawAmount = parseFloat(amount);

    if (!telegramId || isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return res.status(400).json({ success: false, error: "Invalid data" });
    }

    const user = await User.findOne({ telegramId });
    if (!user || user.balance < withdrawAmount) {
      return res.status(400).json({ success: false, error: "Insufficient balance" });
    }

    // Deduct balance from database
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

