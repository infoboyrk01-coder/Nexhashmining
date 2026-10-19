require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const token = process.env.BOT_TOKEN;
const mongoUri = process.env.MONGODB_URI;

// Connection
mongoose.connect(mongoUri)
  .then(() => console.log('MongoDB Connected...'))
  .catch(err => console.log('MongoDB Connection Error:', err));

// MongoDB Schema for User
const userSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  ghs: { type: Number, default: 1 } // Default 1 GHS for new users
});

const User = mongoose.model('User', userSchema);

const bot = new TelegramBot(token, { polling: true });

// ADMIN TELEGRAM ID
const ADMIN_ID = '7437877993'; // Aapki Telegram ID

// Start Command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Hello! Your bot is running successfully.');
});

// Admin Command: /addbalance <user_id> <amount>
// Example: /addbalance 5136435206 10
bot.onText(/\/addbalance (\d+) (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id.toString();

  // Security Check: Only Admin can execute
  if (senderId !== ADMIN_ID) {
    return bot.sendMessage(chatId, "⚠️ Only Admin can use this command.");
  }

  const targetUserId = match[1];
  const amount = parseFloat(match[2]);
  
  // Conversion Rate: $1 = 1 GHS (Aapke UI calculator ke hisab se $10 = 10 GHS)
  const ghsToAdd = amount; 

  try {
    const updatedUser = await User.findOneAndUpdate(
      { telegramId: targetUserId },
      { 
        $inc: { 
          balance: amount, 
          ghs: ghsToAdd 
        } 
      },
      { new: true, upsert: true }
    );

    bot.sendMessage(
      chatId, 
      `✅ **Success!**\n\nUser ID: \`${targetUserId}\` ko $${amount} aur ${ghsToAdd} GHS successfullly add kar diya gaya hai.`
    );

    // Send notification to User
    bot.sendMessage(
      targetUserId, 
      `🎉 **Deposit Approved!**\n\nAapka $${amount} ka deposit approve ho gaya hai.\n⚡ **Mining Power Added:** +${ghsToAdd} GHS`
    );

  } catch (error) {
    console.error("Error updating balance:", error);
    bot.sendMessage(chatId, "❌ Error adding balance/GHS to database.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
