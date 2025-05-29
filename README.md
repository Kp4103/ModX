# ModX - Professional Discord Moderation Bot

<div align="center">

![ModX pfp](https://github.com/user-attachments/assets/ce145d8f-dc2d-4394-80cb-8a571d057a24)

**A powerful, modern Discord moderation bot built with slash commands**

[![Discord.js](https://img.shields.io/badge/discord.js-v14-blue.svg)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/node.js-v18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-active-success.svg)]()

[Features](#features) • [Installation](#installation) • [Commands](#commands) • [Configuration](#configuration) • [Contributing](#contributing)

</div>

## 🌟 Features

### Core Moderation
- **Kick Members** - Remove disruptive users from your server
- **Advanced Ban System** - Permanent or temporary bans with flexible time units
- **Unban Users** - Easy user ID-based unbanning with reason tracking
- **Timeout Users** - Temporarily silence members (1 minute to 28 days)
- **Bulk Message Deletion** - Clean up spam with bulk delete (1-100 messages)

### Advanced Features
- **Flexible Temporary Bans** - Choose between minutes, hours, or days
- **Automatic Unban System** - Scheduled automatic unbans for temporary bans
- **Smart Ban Management** - Manual unban with temp ban cancellation
- **Rich Embeds** - Professional, color-coded responses
- **Permission Integration** - Commands only show for authorized users
- **Intelligent Validation** - Prevents invalid time combinations and user errors

### Modern Interface
- **Slash Commands** - Modern Discord UI with auto-completion and dropdowns
- **Ephemeral Responses** - Private error messages and confirmations
- **Input Validation** - Built-in Discord validation for user safety
- **Error Handling** - Graceful error management with helpful feedback

### Coming Soon
- 🛡️ **Auto-Moderation** - Automatic spam and toxicity detection
- 📊 **Moderation Logs** - Comprehensive action logging with channels
- ⚠️ **Warning System** - Progressive punishment system with escalation
- 🔧 **Web Dashboard** - Easy server configuration interface
- 📈 **Analytics** - Detailed moderation statistics and trends

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0 or higher
- A Discord Bot Token ([Get one here](https://discord.com/developers/applications))
- Basic knowledge of Discord permissions

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ModX.git
   cd ModX
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your bot token
   ```

4. **Start the bot**
   ```bash
   npm start
   
   # For development with auto-restart
   npm run dev
   ```

## 📋 Commands

### Moderation Commands

| Command | Description | Permissions Required |
|---------|-------------|---------------------|
| `/kick <user> [reason]` | Kick a member from the server | Kick Members |
| `/ban <user> [reason] [duration] [unit]` | Ban a member (permanent or temporary) | Ban Members |
| `/unban <userid> [reason]` | Unban a user by their Discord ID | Ban Members |
| `/timeout <user> <duration> [reason]` | Timeout a member (1-40320 minutes) | Moderate Members |
| `/clear <amount>` | Delete 1-100 messages at once | Manage Messages |

### Utility Commands

| Command | Description | Permissions Required |
|---------|-------------|---------------------|
| `/ping` | Check bot latency and status | None |
| `/help` | Display all available commands | None |

### Ban System Examples

```bash
# Permanent bans
/ban @spammer Excessive advertising
/ban @toxic_user Harassment and toxic behavior

# Temporary bans with flexible time units
/ban @rule_breaker Inappropriate content 30 minutes
/ban @disruptive_user Disrupting events 2 hours
/ban @repeat_offender Multiple violations 7 days
/ban @serious_violation Doxxing attempt 30 days

# Unban users
/unban 123456789012345678 Appeal approved
/unban 987654321098765432 Misunderstanding resolved

# Other moderation
/kick @troublemaker Warning ignored
/timeout @loud_user Excessive caps 10
/clear 50
```

### Time Unit Flexibility

| Unit | Use Case | Examples |
|------|----------|----------|
| **Minutes** | Quick cooldowns, immediate responses | 5, 15, 30, 60 minutes |
| **Hours** | Standard punishments, overnight bans | 2, 6, 12, 24 hours |
| **Days** | Serious violations, extended breaks | 1, 3, 7, 14, 30 days |

**Smart Duration Display:**
- `90 minutes` → Shows as "1 hour(s) and 30 minute(s)"
- `25 hours` → Shows as "1 day(s) and 1 hour(s)"
- `1500 minutes` → Shows as "1 day(s) and 1 hour(s)"

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Required: Your Discord bot token
DISCORD_TOKEN=your_bot_token_here

# Optional: Command prefix for legacy support
COMMAND_PREFIX=!
```

### Bot Permissions

Your bot needs these permissions in Discord:

**Essential Permissions:**
- View Channels
- Send Messages
- Use Slash Commands
- Embed Links
- Read Message History

**Moderation Permissions:**
- Manage Messages (for `/clear`)
- Kick Members (for `/kick`)
- Ban Members (for `/ban`)
- Moderate Members (for `/timeout`)

### Invite Link Generator

Use this template to generate your bot invite link:

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_CLIENT_ID&permissions=1099511627830&scope=bot%20applications.commands
```

Replace `YOUR_BOT_CLIENT_ID` with your bot's client ID from the Discord Developer Portal.

## 🔧 Development

### Project Structure

```
ModX/
├── index.js              # Main bot file
├── deploy-commands.js    # Command registration script
├── package.json          # Dependencies and scripts
├── .env.example         # Environment template
├── .env                 # Your environment (don't commit!)
└── README.md            # This file
```

``
### Testing Commands

For faster development, use guild-specific commands:

1. Get your server ID (Right-click server → Copy Server ID)
2. Update `GUILD_ID` in `deploy-commands.js`
3. Run `node deploy-commands.js` for instant updates

## 📊 Performance

- **Memory Usage**: ~50MB average
- **CPU Usage**: <1% during normal operation
- **Response Time**: <100ms for most commands
- **Uptime**: 99.9% with proper hosting

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines

- Follow existing code style
- Add comments for complex logic
- Test commands thoroughly
- Update documentation for new features

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

**General Issues:**

**Bot not responding?**
- Verify bot token in `.env`
- Check bot has necessary permissions
- Look for errors in console

**Permission errors?**
- Ensure bot role is above target roles
- Verify bot has moderation permissions
- Check Discord's role hierarchy

### Getting Help

- 📖 [Discord.js Guide](https://discordjs.guide/)
- 💬 [Discord.js Discord Server](https://discord.gg/djs)
- 🐛 [Report Issues](https://github.com/yourusername/ModX/issues)

## 🌟 Roadmap

### Version 2.0 (Coming Soon)
- [ ] Auto-moderation system with spam detection
- [ ] Warning system with escalation and history
- [ ] Comprehensive moderation logs with channel setup
- [ ] Custom word filters and automod rules
- [ ] Raid protection and mass action prevention
- [ ] Database integration for persistent data

### Version 3.0 (Future)
- [ ] Web dashboard for easy configuration
- [ ] Advanced analytics and moderation insights
- [ ] Multi-language support and localization
- [ ] Plugin system for custom extensions
- [ ] Appeal system integration
- [ ] Advanced role management tools

---

<div align="center">

**Made with ❤️ for the Discord community**

[⭐ Star this repo](https://github.com/yourusername/ModX) • [🐛 Report Bug](https://github.com/yourusername/ModX/issues) • [💡 Request Feature](https://github.com/yourusername/ModX/issues)

</div>