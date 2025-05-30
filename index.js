// Discord Moderation Bot - Complete with Logging System
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, SlashCommandBuilder, REST, Routes } = require('discord.js');

// Create the Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration
    ]
});

// Storage
const tempBans = new Map();
const serverConfigs = new Map();
const userMessageHistory = new Map();
const userWarnings = new Map();

// Default configuration
function getDefaultConfig() {
    return {
        autoMod: {
            enabled: true,
            maxCapsPercentage: 70,
            maxMentions: 5,
            maxRepeatedChars: 5,
            spamTimeWindow: 5000,
            maxMessagesInWindow: 4,
            punishmentType: 'delete'
        },
        warnings: {
            enabled: true,
            autoEscalation: true,
            thresholds: {
                timeout: 3,
                kick: 5,
                ban: 7
            },
            timeoutDuration: 60,
            warningExpiry: 30
        },
        logging: {
            enabled: true,
            channels: {
                moderation: null,
                automod: null,
                member: null,
                message: null
            },
            categories: {
                kicks: true,
                bans: true,
                unbans: true,
                timeouts: true,
                warnings: true,
                automod: true,
                memberJoin: true,
                memberLeave: true,
                messageDelete: false,
                messageEdit: false
            }
        },
        logChannel: null,
        bypassRoles: []
    };
}

function getServerConfig(guildId) {
    if (!serverConfigs.has(guildId)) {
        serverConfigs.set(guildId, getDefaultConfig());
    }
    return serverConfigs.get(guildId);
}

// Define all slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check if the bot is working'),
    
    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to kick')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the kick')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers),
    
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server (permanently or temporarily)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Ban duration (leave empty for permanent)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(525600))
        .addStringOption(option =>
            option.setName('unit')
                .setDescription('Time unit for the duration')
                .setRequired(false)
                .addChoices(
                    { name: 'Minutes', value: 'minutes' },
                    { name: 'Hours', value: 'hours' },
                    { name: 'Days', value: 'days' }
                ))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers),
    
    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user from the server')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('The user ID to unban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the unban')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers),
    
    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Delete multiple messages at once')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),
    
    new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout a member')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to timeout')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Duration in minutes')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the timeout')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
    
    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Issue a warning to a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to warn')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the warning')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('severity')
                .setDescription('Warning severity level')
                .setRequired(false)
                .addChoices(
                    { name: 'Minor', value: 'minor' },
                    { name: 'Moderate', value: 'moderate' },
                    { name: 'Severe', value: 'severe' }
                ))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),
    
    new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('View warnings for a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check warnings for')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),
    
    new SlashCommandBuilder()
        .setName('removewarn')
        .setDescription('Remove a specific warning from a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to remove warning from')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('warning_id')
                .setDescription('Warning ID to remove (get from /warnings)')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),
    
    new SlashCommandBuilder()
        .setName('clearwarnings')
        .setDescription('Clear all warnings for a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to clear warnings for')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for clearing warnings')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers),
    
    new SlashCommandBuilder()
        .setName('logs')
        .setDescription('Configure moderation logging')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set a logging channel')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of logs for this channel')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Moderation (kicks, bans, warnings)', value: 'moderation' },
                            { name: 'Auto-Moderation (spam detection)', value: 'automod' },
                            { name: 'Member Events (join/leave)', value: 'member' },
                            { name: 'Message Events (delete/edit)', value: 'message' }
                        ))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to send logs to')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('settings')
                .setDescription('View current logging settings'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Enable or disable specific log categories')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Log category to toggle')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Kicks', value: 'kicks' },
                            { name: 'Bans', value: 'bans' },
                            { name: 'Unbans', value: 'unbans' },
                            { name: 'Timeouts', value: 'timeouts' },
                            { name: 'Warnings', value: 'warnings' },
                            { name: 'Auto-Moderation', value: 'automod' },
                            { name: 'Member Join', value: 'memberJoin' },
                            { name: 'Member Leave', value: 'memberLeave' },
                            { name: 'Message Delete', value: 'messageDelete' },
                            { name: 'Message Edit', value: 'messageEdit' }
                        ))
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Enable or disable this log category')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Send a test log message')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of log to test')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Moderation', value: 'moderation' },
                            { name: 'Auto-Moderation', value: 'automod' },
                            { name: 'Member Events', value: 'member' }
                        )))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    
    new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Configure auto-moderation settings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Enable or disable auto-moderation')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Enable auto-moderation')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('settings')
                .setDescription('View current auto-moderation settings'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('caps')
                .setDescription('Set maximum caps percentage')
                .addIntegerOption(option =>
                    option.setName('percentage')
                        .setDescription('Maximum caps percentage (1-100)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(100)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('mentions')
                .setDescription('Set maximum mentions per message')
                .addIntegerOption(option =>
                    option.setName('count')
                        .setDescription('Maximum mentions allowed (1-20)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(20)))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all available commands')
];

// Helper functions
function createEmbed(title, description, color = 0x5865F2) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: 'ModBot Pro' });
}

function convertToMilliseconds(duration, unit) {
    const multipliers = {
        'minutes': 60 * 1000,
        'hours': 60 * 60 * 1000,
        'days': 24 * 60 * 60 * 1000
    };
    return duration * multipliers[unit];
}

function formatDuration(duration, unit) {
    if (unit === 'minutes') {
        if (duration >= 1440) {
            const days = Math.floor(duration / 1440);
            const remainingHours = Math.floor((duration % 1440) / 60);
            if (remainingHours > 0) {
                return `${days} day(s) and ${remainingHours} hour(s)`;
            }
            return `${days} day(s)`;
        } else if (duration >= 60) {
            const hours = Math.floor(duration / 60);
            const remainingMinutes = duration % 60;
            if (remainingMinutes > 0) {
                return `${hours} hour(s) and ${remainingMinutes} minute(s)`;
            }
            return `${hours} hour(s)`;
        } else {
            return `${duration} minute(s)`;
        }
    } else if (unit === 'hours') {
        if (duration >= 24) {
            const days = Math.floor(duration / 24);
            const remainingHours = duration % 24;
            if (remainingHours > 0) {
                return `${days} day(s) and ${remainingHours} hour(s)`;
            }
            return `${days} day(s)`;
        } else {
            return `${duration} hour(s)`;
        }
    } else if (unit === 'days') {
        return `${duration} day(s)`;
    }
    return `${duration} ${unit}`;
}

function validateDuration(duration, unit) {
    const limits = {
        'minutes': 525600,
        'hours': 8760,
        'days': 365
    };
    return duration <= limits[unit];
}

function scheduleUnban(guildId, userId, duration, unit, reason) {
    const durationMs = convertToMilliseconds(duration, unit);
    const unbanTime = Date.now() + durationMs;
    
    tempBans.set(`${guildId}-${userId}`, {
        unbanTime,
        reason,
        guildId,
        userId,
        duration,
        unit
    });
    
    setTimeout(async () => {
        try {
            const guild = client.guilds.cache.get(guildId);
            if (guild) {
                await guild.members.unban(userId, `Automatic unban: ${reason}`);
                console.log(`✅ Auto-unbanned user ${userId} from ${guild.name}`);
            }
        } catch (error) {
            console.error(`❌ Failed to auto-unban user ${userId}:`, error);
        }
        tempBans.delete(`${guildId}-${userId}`);
    }, durationMs);
}

// Logging system functions
async function logModerationAction(guild, config, logData) {
    if (!config.logging.enabled) {
        console.log(`🔇 Logging disabled for ${guild.name}`);
        return;
    }
    
    const { type, action, moderator, target, reason, details = {} } = logData;
    
    // Determine which channel to use
    let channelId = null;
    let categoryEnabled = true;
    
    switch (type) {
        case 'kick':
            channelId = config.logging.channels.moderation;
            categoryEnabled = config.logging.categories.kicks;
            break;
        case 'ban':
            channelId = config.logging.channels.moderation;
            categoryEnabled = config.logging.categories.bans;
            break;
        case 'unban':
            channelId = config.logging.channels.moderation;
            categoryEnabled = config.logging.categories.unbans;
            break;
        case 'timeout':
            channelId = config.logging.channels.moderation;
            categoryEnabled = config.logging.categories.timeouts;
            break;
        case 'warning':
            channelId = config.logging.channels.moderation;
            categoryEnabled = config.logging.categories.warnings;
            break;
        case 'automod':
            channelId = config.logging.channels.automod || config.logging.channels.moderation;
            categoryEnabled = config.logging.categories.automod;
            console.log(`🤖 Auto-mod log attempt: channelId=${channelId}, categoryEnabled=${categoryEnabled}, type=${details.detectionType}`);
            break;
        case 'member_join':
            channelId = config.logging.channels.member;
            categoryEnabled = config.logging.categories.memberJoin;
            break;
        case 'member_leave':
            channelId = config.logging.channels.member;
            categoryEnabled = config.logging.categories.memberLeave;
            break;
        default:
            channelId = config.logging.channels.moderation || config.logChannel;
            console.log(`⚠️ Unknown log type: ${type}, using fallback channel: ${channelId}`);
    }
    
    // Check if this category is enabled and we have a channel
    if (!categoryEnabled) {
        console.log(`🔇 Category ${type} is disabled`);
        return;
    }
    
    if (!channelId) {
        console.log(`❌ No channel configured for ${type} logs`);
        return;
    }
    
    const logChannel = guild.channels.cache.get(channelId);
    if (!logChannel) {
        console.log(`❌ Log channel ${channelId} not found in ${guild.name}`);
        return;
    }
    
    // Create the log embed
    const embed = await createLogEmbed(type, action, moderator, target, reason, details);
    
    try {
        await logChannel.send({ embeds: [embed] });
        console.log(`✅ Log sent successfully: ${type} - ${logChannel.name}`);
    } catch (error) {
        console.error(`❌ Failed to send log message to ${logChannel.name}: ${error.message}`);
    }
}

async function createLogEmbed(type, action, moderator, target, reason, details) {
    const colors = {
        kick: 0xe74c3c,
        ban: 0x8b0000,
        unban: 0x27ae60,
        timeout: 0xf39c12,
        warning: 0xff8c00,
        automod: 0x9b59b6,
        member_join: 0x2ecc71,
        member_leave: 0x95a5a6
    };
    
    const icons = {
        kick: '👢',
        ban: '🔨',
        unban: '✅',
        timeout: '🔇',
        warning: '⚠️',
        automod: '🤖',
        member_join: '📥',
        member_leave: '📤'
    };
    
    const titles = {
        kick: 'Member Kicked',
        ban: 'Member Banned',
        unban: 'Member Unbanned',
        timeout: 'Member Timed Out',
        warning: 'Warning Issued',
        automod: 'Auto-Moderation Action',
        member_join: 'Member Joined',
        member_leave: 'Member Left'
    };
    
    let description = '';
    
    if (type === 'member_join' || type === 'member_leave') {
        description = `**User:** ${target.tag} (${target.id})\n**Account Created:** <t:${Math.floor(target.createdTimestamp / 1000)}:R>`;
        
        if (type === 'member_join') {
            description += `\n**Member Count:** ${details.memberCount || 'Unknown'}`;
        }
    } else {
        description = `**User:** ${target.tag || target} (${target.id || 'Unknown'})\n**Moderator:** ${moderator.tag} (${moderator.id})\n**Reason:** ${reason}`;
        
        if (type === 'timeout' && details.duration) {
            description += `\n**Duration:** ${details.duration}`;
        }
        
        if (type === 'ban' && details.duration) {
            description += `\n**Duration:** ${details.duration}\n**Type:** Temporary Ban`;
        }
        
        if (type === 'warning') {
            description += `\n**Severity:** ${details.severity || 'moderate'}\n**Warning ID:** ${details.warningId}`;
            if (details.totalWarnings) {
                description += `\n**Total Warnings:** ${details.totalWarnings}`;
            }
            if (details.escalation) {
                description += `\n\n🔄 **Auto-Escalation:** ${details.escalation.action} (${details.escalation.threshold} warnings)`;
            }
        }
        
        if (type === 'automod') {
            description += `\n**Detection Type:** ${details.detectionType}\n**Action:** Message Deleted`;
            if (details.channel) {
                description += `\n**Channel:** ${details.channel}`;
            }
        }
    }
    
    const embed = new EmbedBuilder()
        .setTitle(`${icons[type]} ${titles[type]}`)
        .setDescription(description)
        .setColor(colors[type])
        .setTimestamp();
    
    if (target && target.displayAvatarURL) {
        embed.setThumbnail(target.displayAvatarURL());
    }
    
    const caseId = `#${Date.now().toString().slice(-6)}`;
    embed.setFooter({ text: `ModX Logs • Case ${caseId}` });
    
    return embed;
}

async function handleMemberJoin(member) {
    const config = getServerConfig(member.guild.id);
    
    await logModerationAction(member.guild, config, {
        type: 'member_join',
        action: 'join',
        moderator: null,
        target: member.user,
        reason: 'User joined the server',
        details: {
            memberCount: member.guild.memberCount
        }
    });
}

async function handleMemberLeave(member) {
    const config = getServerConfig(member.guild.id);
    
    await logModerationAction(member.guild, config, {
        type: 'member_leave',
        action: 'leave',
        moderator: null,
        target: member.user,
        reason: 'User left the server',
        details: {}
    });
}

// Warning system functions
function getUserWarnings(guildId, userId) {
    const key = `${guildId}-${userId}`;
    if (!userWarnings.has(key)) {
        userWarnings.set(key, []);
    }
    return userWarnings.get(key);
}

function addWarning(guildId, userId, moderatorId, reason, severity = 'moderate') {
    const warnings = getUserWarnings(guildId, userId);
    const warning = {
        id: `W${Date.now()}${Math.random().toString(36).substr(2, 4)}`,
        reason,
        severity,
        moderatorId,
        timestamp: Date.now(),
        active: true
    };
    
    warnings.push(warning);
    return warning;
}

function removeWarning(guildId, userId, warningId) {
    const warnings = getUserWarnings(guildId, userId);
    const index = warnings.findIndex(w => w.id === warningId && w.active);
    
    if (index !== -1) {
        warnings[index].active = false;
        warnings[index].removedAt = Date.now();
        return true;
    }
    return false;
}

function getActiveWarnings(guildId, userId) {
    const warnings = getUserWarnings(guildId, userId);
    return warnings.filter(w => w.active);
}

function clearAllWarnings(guildId, userId, moderatorId, reason = 'No reason provided') {
    const warnings = getUserWarnings(guildId, userId);
    const activeCount = warnings.filter(w => w.active).length;
    
    warnings.forEach(warning => {
        if (warning.active) {
            warning.active = false;
            warning.removedAt = Date.now();
            warning.removedBy = moderatorId;
            warning.removeReason = reason;
        }
    });
    
    return activeCount;
}

async function checkWarningEscalation(guild, user, config, newWarningCount) {
    if (!config.warnings.enabled || !config.warnings.autoEscalation) return null;
    
    const thresholds = config.warnings.thresholds;
    
    if (newWarningCount >= thresholds.ban) {
        try {
            await guild.members.ban(user.id, { reason: `Auto-escalation: ${thresholds.ban} warnings reached` });
            return { action: 'ban', threshold: thresholds.ban };
        } catch (error) {
            console.error('Failed to ban user for warning escalation:', error);
        }
    } else if (newWarningCount >= thresholds.kick) {
        try {
            const member = guild.members.cache.get(user.id);
            if (member && member.kickable) {
                await member.kick(`Auto-escalation: ${thresholds.kick} warnings reached`);
                return { action: 'kick', threshold: thresholds.kick };
            }
        } catch (error) {
            console.error('Failed to kick user for warning escalation:', error);
        }
    } else if (newWarningCount >= thresholds.timeout) {
        try {
            const member = guild.members.cache.get(user.id);
            if (member) {
                const timeoutDuration = config.warnings.timeoutDuration * 60 * 1000;
                await member.timeout(timeoutDuration, `Auto-escalation: ${thresholds.timeout} warnings reached`);
                return { action: 'timeout', threshold: thresholds.timeout, duration: config.warnings.timeoutDuration };
            }
        } catch (error) {
            console.error('Failed to timeout user for warning escalation:', error);
        }
    }
    
    return null;
}

async function logWarningAction(guild, action, user, moderator, warning, escalation = null, config) {
    const logData = {
        type: 'warning',
        action: action,
        moderator: moderator,
        target: user,
        reason: warning.reason || `${action} warning`,
        details: {
            severity: warning.severity,
            warningId: warning.id,
            totalWarnings: warning.count,
            escalation: escalation
        }
    };
    
    await logModerationAction(guild, config, logData);
}

async function logAutoModAction(guild, detection, user, config, messageChannel) {
    const logData = {
        type: 'automod',
        action: 'message_delete',
        moderator: { tag: 'AutoMod', id: 'system' },
        target: user,
        reason: detection.reason,
        details: {
            detectionType: detection.type,
            channel: messageChannel ? `<#${messageChannel.id}>` : 'Unknown Channel'
        }
    };
    
    try {
        await logModerationAction(guild, config, logData);
        console.log(`✅ Auto-mod action logged: ${detection.type} - ${user.tag}`);
    } catch (error) {
        console.error(`❌ Failed to log auto-mod action: ${error.message}`);
    }
}

// Auto-moderation functions
function hasBypassPermissions(member, config) {
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return true;
    }
    return config.bypassRoles.some(roleId => member.roles.cache.has(roleId));
}

function detectSpam(message, config) {
    const content = message.content;
    const author = message.author;
    
    if (!config.autoMod.enabled) return null;
    if (hasBypassPermissions(message.member, config)) return null;
    
    if (content.length > 10) {
        const capsCount = (content.match(/[A-Z]/g) || []).length;
        const capsPercentage = (capsCount / content.length) * 100;
        
        if (capsPercentage > config.autoMod.maxCapsPercentage) {
            return {
                type: 'caps',
                reason: `Excessive caps (${Math.round(capsPercentage)}% caps)`,
                severity: 1
            };
        }
    }
    
    const totalMentions = message.mentions.users.size + message.mentions.roles.size;
    if (totalMentions > config.autoMod.maxMentions) {
        return {
            type: 'mentions',
            reason: `Too many mentions (${totalMentions}/${config.autoMod.maxMentions})`,
            severity: 2
        };
    }
    
    const repeatedPattern = new RegExp(`(.)\\1{${config.autoMod.maxRepeatedChars},}`, 'g');
    if (repeatedPattern.test(content)) {
        return {
            type: 'spam',
            reason: 'Repeated character spam',
            severity: 1
        };
    }
    
    const userId = author.id;
    const now = Date.now();
    
    if (!userMessageHistory.has(userId)) {
        userMessageHistory.set(userId, []);
    }
    
    const userMessages = userMessageHistory.get(userId);
    const recentMessages = userMessages.filter(timestamp => 
        now - timestamp < config.autoMod.spamTimeWindow
    );
    
    recentMessages.push(now);
    userMessageHistory.set(userId, recentMessages);
    
    if (recentMessages.length > config.autoMod.maxMessagesInWindow) {
        return {
            type: 'rapid',
            reason: `Too many messages (${recentMessages.length} in ${config.autoMod.spamTimeWindow/1000}s)`,
            severity: 3
        };
    }
    
    return null;
}

async function handleAutoModAction(message, detection, config) {
    try {
        await message.delete();
        
        const embed = createEmbed(
            '🛡️ Auto-Moderation',
            `${message.author}, your message was removed for: **${detection.reason}**`,
            0xf39c12
        );
        
        const warningMsg = await message.channel.send({ embeds: [embed] });
        setTimeout(() => warningMsg.delete().catch(() => {}), 5000);
        
        // Pass the message channel for proper logging
        await logAutoModAction(message.guild, detection, message.author, config, message.channel);
    } catch (error) {
        console.error('Auto-mod action failed:', error);
    }
}

// Register slash commands
async function registerCommands() {
    try {
        console.log('🔄 Registering slash commands...');
        const rest = new REST().setToken(process.env.DISCORD_TOKEN);
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands.map(command => command.toJSON()) }
        );
        console.log('✅ Slash commands registered successfully!');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
}

// Bot events
client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} is online!`);
    console.log(`📊 Connected to ${client.guilds.cache.size} servers`);
    
    client.guilds.cache.forEach(guild => {
        getServerConfig(guild.id);
    });
    
    await registerCommands();
    
    client.user.setPresence({
        activities: [{ name: 'for rule breakers 👀', type: 3 }],
        status: 'online'
    });
});

client.on('guildCreate', (guild) => {
    console.log(`Joined new server: ${guild.name}`);
    getServerConfig(guild.id);
});

client.on('guildMemberAdd', handleMemberJoin);
client.on('guildMemberRemove', handleMemberLeave);

// Auto-moderation message handler
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild || message.system) return;
    
    const config = getServerConfig(message.guild.id);
    const detection = detectSpam(message, config);
    if (detection) {
        console.log(`🚨 Spam detected: ${detection.type} - ${detection.reason} - User: ${message.author.tag}`);
        await handleAutoModAction(message, detection, config);
    }
});

// Handle slash command interactions
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    const { commandName } = interaction;
    
    try {
        if (commandName === 'ping') {
            const embed = createEmbed(
                '🏓 Pong!', 
                `**Bot Latency:** ${client.ws.ping}ms\n**Response Time:** ${Date.now() - interaction.createdTimestamp}ms`, 
                0x00ff00
            );
            await interaction.reply({ embeds: [embed] });
        }
        
        else if (commandName === 'kick') {
            const targetUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            
            const targetMember = interaction.guild.members.cache.get(targetUser.id);
            if (!targetMember) {
                const embed = createEmbed('❌ User Not Found', 'This user is not in the server!', 0xff0000);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            if (!targetMember.kickable) {
                const embed = createEmbed('❌ Cannot Kick', 'I cannot kick this user! They might have higher permissions than me.', 0xff0000);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            await targetMember.kick(reason);
            
            const embed = createEmbed(
                '👢 User Kicked',
                `**User:** ${targetUser.tag} (${targetUser.id})\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`,
                0x00ff00
            );
            await interaction.reply({ embeds: [embed] });
            
            const config = getServerConfig(interaction.guild.id);
            await logModerationAction(interaction.guild, config, {
                type: 'kick',
                action: 'kick',
                moderator: interaction.user,
                target: targetUser,
                reason: reason
            });
        }
        
        else if (commandName === 'ban') {
            const targetUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            const duration = interaction.options.getInteger('duration');
            const unit = interaction.options.getString('unit');
            
            if (duration && !unit) {
                const embed = createEmbed(
                    '❌ Missing Time Unit', 
                    'Please specify a time unit when setting a duration!\n\n**Examples:**\n• `/ban @user reason 30 minutes`\n• `/ban @user reason 2 hours`\n• `/ban @user reason 7 days`', 
                    0xff0000
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            if (!duration && unit) {
                const embed = createEmbed(
                    '❌ Missing Duration', 
                    'Please specify a duration when using a time unit!\n\n**Examples:**\n• `/ban @user reason 30 minutes`\n• `/ban @user reason 2 hours`\n• `/ban @user reason 7 days`', 
                    0xff0000
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            if (duration && unit && !validateDuration(duration, unit)) {
                const limits = {
                    'minutes': '525,600 minutes (~1 year)',
                    'hours': '8,760 hours (1 year)',
                    'days': '365 days (1 year)'
                };
                
                const embed = createEmbed(
                    '❌ Duration Too Long', 
                    `Maximum duration for ${unit} is ${limits[unit]}.\n\nPlease choose a shorter duration.`, 
                    0xff0000
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            try {
                await interaction.guild.members.ban(targetUser, { reason: reason });
                
                let banType = 'Permanent';
                let durationText = '';
                
                if (duration && unit) {
                    scheduleUnban(interaction.guild.id, targetUser.id, duration, unit, reason);
                    banType = 'Temporary';
                    durationText = `\n**Duration:** ${formatDuration(duration, unit)}`;
                }
                
                const embed = createEmbed(
                    `🔨 User ${banType}ly Banned`,
                    `**User:** ${targetUser.tag} (${targetUser.id})\n**Reason:** ${reason}${durationText}\n**Moderator:** ${interaction.user.tag}`,
                    0x00ff00
                );
                await interaction.reply({ embeds: [embed] });
                
                const config = getServerConfig(interaction.guild.id);
                await logModerationAction(interaction.guild, config, {
                    type: 'ban',
                    action: banType.toLowerCase(),
                    moderator: interaction.user,
                    target: targetUser,
                    reason: reason,
                    details: duration && unit ? { duration: formatDuration(duration, unit) } : {}
                });
                
            } catch (error) {
                console.error('Ban error:', error);
                let errorMessage = 'Something went wrong while banning the user!';
                
                if (error.code === 10013) {
                    errorMessage = 'User not found or already banned!';
                } else if (error.code === 50013) {
                    errorMessage = 'I don\'t have permission to ban this user!';
                }
                
                const embed = createEmbed('❌ Ban Failed', errorMessage, 0xff0000);
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
        
        else if (commandName === 'unban') {
            const userId = interaction.options.getString('userid');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            
            if (!/^\d{17,19}$/.test(userId)) {
                const embed = createEmbed(
                    '❌ Invalid User ID', 
                    'Please provide a valid Discord user ID (17-19 digits).\n\n**How to get User ID:**\n1. Enable Developer Mode in Discord\n2. Right-click the user → Copy User ID', 
                    0xff0000
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            try {
                const unbannedUser = await interaction.guild.members.unban(userId, reason);
                
                const tempBanKey = `${interaction.guild.id}-${userId}`;
                if (tempBans.has(tempBanKey)) {
                    tempBans.delete(tempBanKey);
                }
                
                const embed = createEmbed(
                    '✅ User Unbanned',
                    `**User:** ${unbannedUser.tag} (${userId})\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`,
                    0x00ff00
                );
                await interaction.reply({ embeds: [embed] });
                
                const config = getServerConfig(interaction.guild.id);
                await logModerationAction(interaction.guild, config, {
                    type: 'unban',
                    action: 'unban',
                    moderator: interaction.user,
                    target: unbannedUser,
                    reason: reason
                });
                
            } catch (error) {
                console.error('Unban error:', error);
                let errorMessage = 'Something went wrong while unbanning the user!';
                
                if (error.code === 10026) {
                    errorMessage = 'This user is not banned!';
                } else if (error.code === 10013) {
                    errorMessage = 'User not found! Make sure the User ID is correct.';
                } else if (error.code === 50013) {
                    errorMessage = 'I don\'t have permission to unban users!';
                }
                
                const embed = createEmbed('❌ Unban Failed', errorMessage, 0xff0000);
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
        
        else if (commandName === 'clear') {
            const amount = interaction.options.getInteger('amount');
            
            const deleted = await interaction.channel.bulkDelete(amount, true);
            
            const embed = createEmbed(
                '🧹 Messages Cleared', 
                `Successfully deleted ${deleted.size} messages!`, 
                0x00ff00
            );
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        else if (commandName === 'timeout') {
            const targetUser = interaction.options.getUser('user');
            const duration = interaction.options.getInteger('duration');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            
            const targetMember = interaction.guild.members.cache.get(targetUser.id);
            if (!targetMember) {
                const embed = createEmbed('❌ User Not Found', 'This user is not in the server!', 0xff0000);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            const timeoutDuration = duration * 60 * 1000;
            
            await targetMember.timeout(timeoutDuration, reason);
            
            let durationText = '';
            if (duration >= 1440) {
                durationText = `${Math.floor(duration / 1440)} day(s)`;
            } else if (duration >= 60) {
                durationText = `${Math.floor(duration / 60)} hour(s)`;
            } else {
                durationText = `${duration} minute(s)`;
            }
            
            const embed = createEmbed(
                '🔇 User Timed Out',
                `**User:** ${targetUser.tag} (${targetUser.id})\n**Duration:** ${durationText}\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`,
                0x00ff00
            );
            await interaction.reply({ embeds: [embed] });
            
            const config = getServerConfig(interaction.guild.id);
            await logModerationAction(interaction.guild, config, {
                type: 'timeout',
                action: 'timeout',
                moderator: interaction.user,
                target: targetUser,
                reason: reason,
                details: { duration: durationText }
            });
        }
        
        else if (commandName === 'warn') {
            const targetUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason');
            const severity = interaction.options.getString('severity') || 'moderate';
            
            const targetMember = interaction.guild.members.cache.get(targetUser.id);
            if (targetMember && hasBypassPermissions(targetMember, getServerConfig(interaction.guild.id))) {
                const embed = createEmbed(
                    '❌ Cannot Warn',
                    'You cannot warn administrators or users with bypass permissions.',
                    0xff0000
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            const warning = addWarning(
                interaction.guild.id,
                targetUser.id,
                interaction.user.id,
                reason,
                severity
            );
            
            const config = getServerConfig(interaction.guild.id);
            const activeWarnings = getActiveWarnings(interaction.guild.id, targetUser.id);
            const warningCount = activeWarnings.length;
            
            const escalation = await checkWarningEscalation(
                interaction.guild,
                targetUser,
                config,
                warningCount
            );
            
            const severityEmojis = { minor: '🟡', moderate: '🟠', severe: '🔴' };
            const severityColors = { minor: 0xffff00, moderate: 0xff8c00, severe: 0xff0000 };
            
            let description = `**User:** ${targetUser.tag} (${targetUser.id})\n**Reason:** ${reason}\n**Severity:** ${severityEmojis[severity]} ${severity}\n**Warning ID:** ${warning.id}\n**Total Warnings:** ${warningCount}`;
            
            if (escalation) {
                description += `\n\n🔄 **Auto-Escalation Triggered:**\n**Action:** ${escalation.action.toUpperCase()}\n**Threshold:** ${escalation.threshold} warnings reached`;
                if (escalation.duration) {
                    description += `\n**Timeout Duration:** ${escalation.duration} minutes`;
                }
            }
            
            const embed = createEmbed(
                '⚠️ Warning Issued',
                description,
                severityColors[severity]
            );
            
            await interaction.reply({ embeds: [embed] });
            
            try {
                const dmEmbed = createEmbed(
                    `⚠️ Warning Received - ${interaction.guild.name}`,
                    `You have received a **${severity}** warning.\n\n**Reason:** ${reason}\n**Total Warnings:** ${warningCount}\n\nPlease review the server rules to avoid further warnings.`,
                    severityColors[severity]
                );
                
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (error) {
                // User has DMs disabled
            }
            
            await logWarningAction(interaction.guild, 'warn', targetUser, interaction.user, {
                reason: reason,
                severity: severity,
                id: warning.id,
                count: warningCount
            }, escalation, config);
        }
        
        else if (commandName === 'warnings') {
            const targetUser = interaction.options.getUser('user');
            const warnings = getUserWarnings(interaction.guild.id, targetUser.id);
            const activeWarnings = warnings.filter(w => w.active);
            
            if (activeWarnings.length === 0) {
                const embed = createEmbed(
                    '✅ No Warnings',
                    `${targetUser.tag} has no active warnings.`,
                    0x00ff00
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            const config = getServerConfig(interaction.guild.id);
            const thresholds = config.warnings.thresholds;
            
            let description = `**User:** ${targetUser.tag} (${targetUser.id})\n**Active Warnings:** ${activeWarnings.length}\n\n`;
            
            description += `**Escalation Thresholds:**\n`;
            description += `• ${thresholds.timeout} warnings → Timeout\n`;
            description += `• ${thresholds.kick} warnings → Kick\n`;
            description += `• ${thresholds.ban} warnings → Ban\n\n`;
            
            description += `**Warning History:**\n`;
            activeWarnings.slice(0, 5).forEach((warning, index) => {
                const date = new Date(warning.timestamp).toLocaleDateString();
                const severityEmoji = { minor: '🟡', moderate: '🟠', severe: '🔴' }[warning.severity];
                description += `${index + 1}. ${severityEmoji} **${warning.reason}** (${date})\n   ID: \`${warning.id}\`\n`;
            });
            
            if (activeWarnings.length > 5) {
                description += `\n*... and ${activeWarnings.length - 5} more warnings*`;
            }
            
            const embed = createEmbed(
                '⚠️ User Warnings',
                description,
                activeWarnings.length >= thresholds.kick ? 0xff0000 : 
                activeWarnings.length >= thresholds.timeout ? 0xff8c00 : 0xf39c12
            );
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        else if (commandName === 'removewarn') {
            const targetUser = interaction.options.getUser('user');
            const warningId = interaction.options.getString('warning_id');
            
            const removed = removeWarning(interaction.guild.id, targetUser.id, warningId);
            
            if (!removed) {
                const embed = createEmbed(
                    '❌ Warning Not Found',
                    `Could not find an active warning with ID \`${warningId}\` for ${targetUser.tag}.\n\nUse \`/warnings @user\` to see available warning IDs.`,
                    0xff0000
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            const activeWarnings = getActiveWarnings(interaction.guild.id, targetUser.id);
            
            const embed = createEmbed(
                '✅ Warning Removed',
                `**User:** ${targetUser.tag} (${targetUser.id})\n**Warning ID:** \`${warningId}\`\n**Remaining Warnings:** ${activeWarnings.length}`,
                0x00ff00
            );
            
            await interaction.reply({ embeds: [embed] });
            
            const config = getServerConfig(interaction.guild.id);
            await logWarningAction(interaction.guild, 'remove', targetUser, interaction.user, { id: warningId }, null, config);
        }
        
        else if (commandName === 'clearwarnings') {
            const targetUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            
            const clearedCount = clearAllWarnings(interaction.guild.id, targetUser.id, interaction.user.id, reason);
            
            if (clearedCount === 0) {
                const embed = createEmbed(
                    '✅ No Warnings to Clear',
                    `${targetUser.tag} has no active warnings.`,
                    0x00ff00
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            const embed = createEmbed(
                '🧹 Warnings Cleared',
                `**User:** ${targetUser.tag} (${targetUser.id})\n**Warnings Cleared:** ${clearedCount}\n**Reason:** ${reason}`,
                0x3498db
            );
            
            await interaction.reply({ embeds: [embed] });
            
            const config = getServerConfig(interaction.guild.id);
            await logWarningAction(interaction.guild, 'clear', targetUser, interaction.user, { count: clearedCount }, null, config);
        }
        
        else if (commandName === 'logs') {
            const subcommand = interaction.options.getSubcommand();
            const config = getServerConfig(interaction.guild.id);
            
            if (subcommand === 'set') {
                const type = interaction.options.getString('type');
                const channel = interaction.options.getChannel('channel');
                
                if (channel.type !== 0) {
                    const embed = createEmbed(
                        '❌ Invalid Channel',
                        'Please select a text channel for logging.',
                        0xff0000
                    );
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
                
                config.logging.channels[type] = channel.id;
                
                const typeNames = {
                    moderation: 'Moderation Actions',
                    automod: 'Auto-Moderation',
                    member: 'Member Events',
                    message: 'Message Events'
                };
                
                const embed = createEmbed(
                    '✅ Logging Channel Set',
                    `**Type:** ${typeNames[type]}\n**Channel:** ${channel}\n\nThis channel will now receive ${typeNames[type].toLowerCase()} logs.`,
                    0x00ff00
                );
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            else if (subcommand === 'settings') {
                const logging = config.logging;
                
                let channelSettings = '**Log Channels:**\n';
                channelSettings += `• Moderation: ${logging.channels.moderation ? `<#${logging.channels.moderation}>` : 'Not set'}\n`;
                channelSettings += `• Auto-Moderation: ${logging.channels.automod ? `<#${logging.channels.automod}>` : 'Not set'}\n`;
                channelSettings += `• Member Events: ${logging.channels.member ? `<#${logging.channels.member}>` : 'Not set'}\n`;
                channelSettings += `• Message Events: ${logging.channels.message ? `<#${logging.channels.message}>` : 'Not set'}\n\n`;
                
                let categorySettings = '**Log Categories:**\n';
                const categories = logging.categories;
                categorySettings += `• Kicks: ${categories.kicks ? '✅' : '❌'}\n`;
                categorySettings += `• Bans: ${categories.bans ? '✅' : '❌'}\n`;
                categorySettings += `• Unbans: ${categories.unbans ? '✅' : '❌'}\n`;
                categorySettings += `• Timeouts: ${categories.timeouts ? '✅' : '❌'}\n`;
                categorySettings += `• Warnings: ${categories.warnings ? '✅' : '❌'}\n`;
                categorySettings += `• Auto-Moderation: ${categories.automod ? '✅' : '❌'}\n`;
                categorySettings += `• Member Join: ${categories.memberJoin ? '✅' : '❌'}\n`;
                categorySettings += `• Member Leave: ${categories.memberLeave ? '✅' : '❌'}\n`;
                categorySettings += `• Message Delete: ${categories.messageDelete ? '✅' : '❌'}\n`;
                categorySettings += `• Message Edit: ${categories.messageEdit ? '✅' : '❌'}\n\n`;
                
                const embed = createEmbed(
                    '📊 Logging Settings',
                    `**Status:** ${logging.enabled ? '✅ Enabled' : '❌ Disabled'}\n\n${channelSettings}${categorySettings}*Use \`/logs set\` to configure channels and \`/logs toggle\` to enable/disable categories.*`,
                    0x3498db
                );
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            else if (subcommand === 'toggle') {
                const category = interaction.options.getString('category');
                const enabled = interaction.options.getBoolean('enabled');
                
                config.logging.categories[category] = enabled;
                
                const categoryNames = {
                    kicks: 'Kicks',
                    bans: 'Bans',
                    unbans: 'Unbans',
                    timeouts: 'Timeouts',
                    warnings: 'Warnings',
                    automod: 'Auto-Moderation',
                    memberJoin: 'Member Join Events',
                    memberLeave: 'Member Leave Events',
                    messageDelete: 'Message Delete Events',
                    messageEdit: 'Message Edit Events'
                };
                
                const statusText = enabled ? 'enabled' : 'disabled';
                const embed = createEmbed(
                    '⚙️ Log Category Updated',
                    `**Category:** ${categoryNames[category]}\n**Status:** ${statusText}\n\n${categoryNames[category]} logs are now ${statusText}.`,
                    enabled ? 0x00ff00 : 0xff0000
                );
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            else if (subcommand === 'test') {
                const type = interaction.options.getString('type');
                const config = getServerConfig(interaction.guild.id);
                
                let testLogData = {};
                
                switch (type) {
                    case 'moderation':
                        testLogData = {
                            type: 'kick',
                            action: 'test',
                            moderator: interaction.user,
                            target: { tag: 'TestUser#1234', id: '123456789012345678' },
                            reason: 'This is a test log message',
                            details: {}
                        };
                        break;
                    case 'automod':
                        testLogData = {
                            type: 'automod',
                            action: 'test',
                            moderator: { tag: 'AutoMod', id: 'system' },
                            target: interaction.user,
                            reason: 'Test repeated character spam detection',
                            details: {
                                detectionType: 'spam',
                                channel: `<#${interaction.channel.id}>`
                            }
                        };
                        break;
                    case 'member':
                        testLogData = {
                            type: 'member_join',
                            action: 'test',
                            moderator: null,
                            target: { tag: 'TestUser#1234', id: '123456789012345678', createdTimestamp: Date.now() - 86400000 },
                            reason: 'Test member join event',
                            details: {
                                memberCount: interaction.guild.memberCount
                            }
                        };
                        break;
                }
                
                try {
                    await logModerationAction(interaction.guild, config, testLogData);
                    
                    const embed = createEmbed(
                        '✅ Test Log Sent',
                        `A test ${type} log has been sent to the configured logging channel.\n\n**Debug Info:**\n• Type: ${type}\n• Channel: ${config.logging.channels[type] || config.logging.channels.moderation || 'None'}\n• Category Enabled: ${type === 'automod' ? config.logging.categories.automod : 'N/A'}`,
                        0x00ff00
                    );
                    
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                } catch (error) {
                    const embed = createEmbed(
                        '❌ Test Failed',
                        `Failed to send test log. Make sure you have configured a logging channel for this type.\n\nError: ${error.message}`,
                        0xff0000
                    );
                    
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                }
            }
        }
        
        else if (commandName === 'automod') {
            const subcommand = interaction.options.getSubcommand();
            const config = getServerConfig(interaction.guild.id);
            
            if (subcommand === 'toggle') {
                const enabled = interaction.options.getBoolean('enabled');
                config.autoMod.enabled = enabled;
                
                const statusText = enabled ? 'enabled' : 'disabled';
                const embed = createEmbed(
                    '🛡️ Auto-Moderation Updated',
                    `Auto-moderation has been **${statusText}** for this server.`,
                    enabled ? 0x00ff00 : 0xff0000
                );
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            else if (subcommand === 'settings') {
                try {
                    const autoMod = config.autoMod;
                    
                    const safeConfig = {
                        enabled: autoMod.enabled ?? true,
                        maxCapsPercentage: autoMod.maxCapsPercentage ?? 70,
                        maxMentions: autoMod.maxMentions ?? 5,
                        maxRepeatedChars: autoMod.maxRepeatedChars ?? 5,
                        spamTimeWindow: autoMod.spamTimeWindow ?? 5000,
                        maxMessagesInWindow: autoMod.maxMessagesInWindow ?? 4,
                        punishmentType: autoMod.punishmentType ?? 'delete'
                    };
                    
                    const embed = createEmbed(
                        '⚙️ Auto-Moderation Settings',
                        `**Status:** ${safeConfig.enabled ? '✅ Enabled' : '❌ Disabled'}\n\n` +
                        `**Spam Detection:**\n` +
                        `• Max Caps: ${safeConfig.maxCapsPercentage}%\n` +
                        `• Max Mentions: ${safeConfig.maxMentions}\n` +
                        `• Max Repeated Chars: ${safeConfig.maxRepeatedChars}\n` +
                        `• Message Rate Limit: ${safeConfig.maxMessagesInWindow} messages in ${safeConfig.spamTimeWindow/1000} seconds\n\n` +
                        `**Logging:**\n` +
                        `• Auto-mod Logs: ${config.logging.categories.automod ? '✅ Enabled' : '❌ Disabled'}\n` +
                        `• Auto-mod Channel: ${config.logging.channels.automod ? `<#${config.logging.channels.automod}>` : (config.logging.channels.moderation ? `<#${config.logging.channels.moderation}> (fallback)` : 'Not set')}\n\n` +
                        `**Actions:**\n` +
                        `• Punishment Type: ${safeConfig.punishmentType}\n\n` +
                        `${!safeConfig.enabled ? '⚠️ *Auto-moderation is currently disabled. Use `/automod toggle true` to enable.*\n\n' : ''}` +
                        `*Use other automod commands to modify these settings*`,
                        safeConfig.enabled ? 0x3498db : 0xf39c12
                    );
                    
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    
                } catch (error) {
                    console.error('Error in automod settings command:', error);
                    
                    const errorEmbed = createEmbed(
                        '❌ Settings Error',
                        'There was an error retrieving auto-moderation settings. Please try again.',
                        0xff0000
                    );
                    
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            }
            
            else if (subcommand === 'caps') {
                const percentage = interaction.options.getInteger('percentage');
                config.autoMod.maxCapsPercentage = percentage;
                
                const embed = createEmbed(
                    '📝 Caps Limit Updated',
                    `Maximum caps percentage set to **${percentage}%**\n\nMessages with more than ${percentage}% capital letters will be automatically removed.${!config.autoMod.enabled ? '\n\n⚠️ *Auto-moderation is currently disabled.*' : ''}`,
                    0x00ff00
                );
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            else if (subcommand === 'mentions') {
                const count = interaction.options.getInteger('count');
                config.autoMod.maxMentions = count;
                
                const embed = createEmbed(
                    '👥 Mention Limit Updated',
                    `Maximum mentions per message set to **${count}**\n\nMessages with more than ${count} mentions will be automatically removed.${!config.autoMod.enabled ? '\n\n⚠️ *Auto-moderation is currently disabled.*' : ''}`,
                    0x00ff00
                );
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
        
        else if (commandName === 'help') {
            const embed = createEmbed(
                '📚 ModBot Pro Commands',
                '**Moderation Commands:**\n' +
                '🏓 `/ping` - Test if bot is working\n' +
                '👢 `/kick <user> [reason]` - Kick a member\n' +
                '🔨 `/ban <user> [reason] [duration] [unit]` - Ban a member\n' +
                '✅ `/unban <userid> [reason]` - Unban a user by ID\n' +
                '🔇 `/timeout <user> <duration> [reason]` - Timeout a member\n' +
                '🧹 `/clear <amount>` - Delete messages (1-100)\n\n' +
                '**Warning System:**\n' +
                '⚠️ `/warn <user> <reason> [severity]` - Issue a warning\n' +
                '📋 `/warnings <user>` - View user warnings\n' +
                '🗑️ `/removewarn <user> <id>` - Remove specific warning\n' +
                '🧹 `/clearwarnings <user> [reason]` - Clear all warnings\n\n' +
                '**Logging System:**\n' +
                '📊 `/logs set <type> <channel>` - Set logging channels\n' +
                '⚙️ `/logs settings` - View logging configuration\n' +
                '🔄 `/logs toggle <category> <enabled>` - Toggle log categories\n' +
                '🧪 `/logs test <type>` - Send test log messages\n\n' +
                '**Auto-Moderation Commands:**\n' +
                '🛡️ `/automod toggle <enabled>` - Enable/disable auto-mod\n' +
                '⚙️ `/automod settings` - View current auto-mod settings\n' +
                '📝 `/automod caps <percentage>` - Set caps limit (1-100%)\n' +
                '👥 `/automod mentions <count>` - Set mention limit (1-20)\n\n' +
                '**Logging Features:**\n' +
                '• **Comprehensive Tracking** - All moderation actions logged\n' +
                '• **Separate Channels** - Different log types in different channels\n' +
                '• **Member Events** - Track joins and leaves\n' +
                '• **Auto-Mod Logs** - Spam detection results\n' +
                '• **Rich Embeds** - Professional formatting with user avatars\n' +
                '• **Case IDs** - Unique tracking for each action\n\n' +
                '*ModX - Complete moderation solution for Discord*',
                0x5865F2
            );
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
    } catch (error) {
        console.error(`Error handling ${commandName}:`, error);
        
        const errorEmbed = createEmbed(
            '❌ Command Error', 
            'Something went wrong while executing this command!', 
            0xff0000
        );
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
});

// Handle errors gracefully
client.on('error', error => {
    console.error('Discord.js error:', error);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);