# ModX - Professional Discord Moderation Bot

<div align="center">

![ModX pfp](https://github.com/user-attachments/assets/ce145d8f-dc2d-4394-80cb-8a571d057a24)

**A powerful, modern Discord moderation bot with interactive configuration interfaces**

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

### Interactive Configuration System
- **🖱️ Button Controls** - Toggle settings with one-click buttons
- **📋 Dropdown Menus** - Easy option selection with visual feedback
- **📝 Modal Forms** - Clean text input forms for precise configuration
- **🔄 Real-time Updates** - See changes instantly in the interface
- **🎯 Guided Setup** - Step-by-step configuration for all features

### Warning System
- **Progressive Discipline** - Issue warnings with automatic escalation
- **Severity Levels** - Minor, Moderate, and Severe warning classifications
- **Auto-Escalation** - 3 warnings → timeout, 5 → kick, 7 → ban
- **Warning Management** - View, remove, or clear warnings with full audit trail
- **User Notifications** - DM users when warned with clear explanations
- **Unique Warning IDs** - Easy tracking and management of individual warnings

### Auto-Moderation System
- **Real-time Spam Detection** - Automatically catches and removes spam
- **Caps Filter** - Removes messages with excessive CAPITAL LETTERS
- **Mention Spam Protection** - Prevents mass @mention abuse
- **Character Spam Detection** - Stops repeated character spam (aaaaa)
- **Rate Limiting** - Prevents rapid message flooding
- **Smart Bypass System** - Admins and trusted roles skip auto-mod rules
- **Configurable Thresholds** - Customize limits for your server's needs

### Advanced Link Filtering
- **🔗 Domain Whitelist/Blacklist** - Control allowed and blocked domains
- **🛡️ Phishing Protection** - Detects Discord phishing and suspicious domains
- **⚡ Link Shortener Blocking** - Prevents malicious shortened URLs
- **🎚️ Strictness Levels** - Low, Medium, High filtering modes
- **🌐 TLD Analysis** - Blocks suspicious top-level domains
- **🔍 Real-time Scanning** - Instant link analysis and blocking

### Comprehensive Logging System
- **Multi-Channel Logging** - Separate channels for different log types
- **Complete Audit Trail** - Track every moderation action with timestamps
- **Rich Log Embeds** - Professional formatting with user avatars and case IDs
- **Member Event Tracking** - Monitor joins, leaves, and account ages
- **Auto-Mod Logging** - Detailed spam detection results with context
- **Granular Control** - Enable/disable specific log categories
- **Real-time Notifications** - Instant logging of all moderation events

### Advanced Features
- **Flexible Temporary Bans** - Choose between minutes, hours, or days
- **Automatic Unban System** - Scheduled automatic unbans for temporary bans
- **Smart Ban Management** - Manual unban with temp ban cancellation
- **Progressive Warning System** - Automated escalation from warnings to punishments
- **Multi-Channel Logging** - Separate log channels for different event types
- **Comprehensive Audit Trail** - Complete history of all moderation actions with case IDs
- **Member Event Tracking** - Monitor server joins, leaves, and account analytics
- **Ephemeral Admin Messages** - Private configuration messages for admins
- **Rich Embeds** - Professional, color-coded responses with user avatars
- **Permission Integration** - Commands only show for authorized users
- **Intelligent Validation** - Prevents invalid time combinations and user errors
- **Robust Error Handling** - Graceful error management with debugging support

### Modern Interface
- **Slash Commands** - Modern Discord UI with auto-completion and dropdowns
- **Interactive Components** - Buttons, select menus, and modals for easy configuration
- **Ephemeral Responses** - Private error messages and confirmations
- **Input Validation** - Built-in Discord validation for user safety
- **Error Handling** - Graceful error management with helpful feedback

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

### Interactive Configuration Commands

| Command | Description | Permissions Required |
|---------|-------------|---------------------|
| `/config` | 🛠️ Main interactive configuration panel | Administrator |
| `/automod` | 🛡️ Auto-moderation configuration interface | Administrator |
| `/logs` | 📊 Logging system configuration interface | Administrator |
| `/linkfilter` | 🔗 Link filtering management interface | Administrator |

### Moderation Commands

| Command | Description | Permissions Required |
|---------|-------------|---------------------|
| `/kick <user> [reason]` | Kick a member from the server | Kick Members |
| `/ban <user> [reason] [duration] [unit]` | Ban a member (permanent or temporary) | Ban Members |
| `/unban <userid> [reason]` | Unban a user by their Discord ID | Ban Members |
| `/timeout <user> <duration> [reason]` | Timeout a member (1-40320 minutes) | Moderate Members |
| `/clear <amount>` | Delete 1-100 messages at once | Manage Messages |

### Warning System Commands

| Command | Description | Permissions Required |
|---------|-------------|---------------------|
| `/warn <user> <reason> [severity]` | Issue a warning to a user | Manage Messages |
| `/warnings <user>` | View user's warning history | Manage Messages |
| `/removewarn <user> <warning_id>` | Remove specific warning | Manage Messages |
| `/clearwarnings <user> [reason]` | Clear all warnings for user | Kick Members |

### Utility Commands

| Command | Description | Permissions Required |
|---------|-------------|---------------------|
| `/ping` | Check bot latency and status | None |
| `/help` | Display all available commands | None |

### Interactive Configuration Examples

```bash
# Open main configuration panel with buttons and dropdowns
/config

# Configure auto-moderation with interactive interface
/automod

# Set up logging channels and categories
/logs

# Manage domain whitelist/blacklist
/linkfilter
```

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

### Warning System Usage

```bash
# Issue warnings with different severity levels
/warn @spammer Excessive advertising moderate
/warn @toxic_user Harassment and threats severe
/warn @rule_breaker Minor rule violation minor

# Check user's warning history
/warnings @user

# Manage warnings
/removewarn @user W1699123456abc  # Remove specific warning
/clearwarnings @user Clean slate  # Clear all warnings
```

### Warning Auto-Escalation

ModX automatically escalates punishments based on warning count:

| Warning Count | Action | Duration |
|---------------|--------|----------|
| 3 warnings | Automatic Timeout | 60 minutes |
| 5 warnings | Automatic Kick | Immediate |
| 7 warnings | Automatic Ban | Permanent |

**Escalation Features:**
- Real-time escalation when thresholds are reached
- DM notifications to users explaining their status
- Complete audit trail of all escalation actions
- Bypass protection for administrators

### Auto-Moderation Features

**What Gets Automatically Removed:**
- `"THIS IS ALL CAPS SPAM!!!"` (excessive capitals)
- `"@everyone @here @user1 @user2 @user3 @user4"` (too many mentions)
- `"hahahahahahahaha"` (repeated character spam)
- Multiple rapid messages from same user (rate limiting)
- Malicious links and phishing attempts

**Smart Duration Display:**
- `90 minutes` → Shows as "1 hour(s) and 30 minute(s)"
- `25 hours` → Shows as "1 day(s) and 1 hour(s)"
- `1500 minutes` → Shows as "1 day(s) and 1 hour(s)"

### Link Filtering System

**Protection Features:**
- **Discord Phishing Detection** - Blocks fake Discord sites
- **Suspicious Domain Analysis** - Detects character substitution and suspicious TLDs
- **Link Shortener Blocking** - Prevents bit.ly, tinyurl.com, etc.
- **Whitelist/Blacklist Management** - Custom domain control
- **Strictness Levels** - Low (basic threats) to High (whitelist only)

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
├── index.js              # Main bot file with all functionality
├── package.json          # Dependencies and scripts
├── .env.example         # Environment template
├── .env                 # Your environment (don't commit!)
└── README.md            # This file
```

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

**Bot not responding?**
- Verify bot token in `.env`
- Check bot has necessary permissions
- Look for errors in console

**Permission errors?**
- Ensure bot role is above target roles
- Verify bot has moderation permissions
- Check Discord's role hierarchy

**Interactive components not working?**
- Ensure bot has "Use Slash Commands" permission
- Check that commands are properly registered
- Verify no component width errors in console

### Getting Help

- 📖 [Discord.js Guide](https://discordjs.guide/)
- 💬 [Discord.js Discord Server](https://discord.gg/djs)
- 🐛 [Report Issues](https://github.com/yourusername/ModX/issues)

## 🌟 Roadmap

### Version 2.0 (Current - ✅ Complete)
- [x] Interactive configuration interfaces with buttons and dropdowns
- [x] Advanced link filtering with phishing protection
- [x] Comprehensive moderation logs with multi-channel setup
- [x] Progressive warning system with auto-escalation
- [x] Smart auto-moderation with configurable thresholds
- [x] Real-time spam detection and prevention
- [x] Role-based auto-mod bypass system
- [x] Temporary ban system with automatic scheduling

### Version 3.0 (Future)
- [ ] Web dashboard for remote configuration
- [ ] Advanced analytics and moderation insights
- [ ] Multi-language support and localization
- [ ] Plugin system for custom extensions
- [ ] Appeal system integration with ticket management
- [ ] Advanced role management and permission tools
- [ ] Integration with other Discord bots and services
- [ ] Custom word filters with regex support

---

<div align="center">

**Made with ❤️ for the Discord community**

[⭐ Star this repo](https://github.com/yourusername/ModX) • [🐛 Report Bug](https://github.com/yourusername/ModX/issues) • [💡 Request Feature](https://github.com/yourusername/ModX/issues)

</div>