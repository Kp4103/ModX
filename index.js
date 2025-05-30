// Discord Moderation Bot - Complete with Interactive Configuration Interfaces (FULLY FIXED)
require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    PermissionsBitField, 
    SlashCommandBuilder, 
    REST, 
    Routes,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ComponentType,
    MessageFlags
} = require('discord.js');

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
            punishmentType: 'delete',
            linkFilter: {
                enabled: true,
                strictness: 'medium',
                allowWhitelisted: true,
                blockSuspicious: true,
                blockShorteners: true,
                checkNewDomains: true
            }
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
        bypassRoles: [],
        linkLists: {
            whitelist: [
                'discord.com',
                'discord.gg',
                'youtube.com',
                'youtu.be',
                'github.com',
                'reddit.com',
                'twitter.com',
                'x.com',
                'imgur.com',
                'giphy.com',
                'stackoverflow.com',
                'google.com'
            ],
            blacklist: [],
            shorteners: [
                'bit.ly',
                'tinyurl.com',
                't.co',
                'short.link',
                'tiny.cc',
                'ow.ly',
                'buff.ly',
                'goo.gl',
                'is.gd',
                'v.gd'
            ]
        }
    };
}

function getServerConfig(guildId) {
    if (!serverConfigs.has(guildId)) {
        serverConfigs.set(guildId, getDefaultConfig());
    }
    return serverConfigs.get(guildId);
}

// STREAMLINED SLASH COMMANDS - Core actions + Interactive configuration
const commands = [
    // Core Moderation Commands
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
        .setName('clear')
        .setDescription('Delete multiple messages at once')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),
    
    // INTERACTIVE CONFIGURATION COMMANDS
    new SlashCommandBuilder()
        .setName('config')
        .setDescription('🛠️ Interactive ModX configuration interface')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    
    new SlashCommandBuilder()
        .setName('automod')
        .setDescription('🛡️ Configure auto-moderation with interactive interface')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    
    new SlashCommandBuilder()
        .setName('logs')
        .setDescription('📊 Configure logging system with interactive interface')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    
    new SlashCommandBuilder()
        .setName('linkfilter')
        .setDescription('🔗 Configure link filtering with interactive interface')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    
    // Utility Commands
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check if the bot is working'),
    
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
        .setFooter({ text: 'ModX Pro' });
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

// Link filtering functions
function detectLinks(message, config) {
    const content = message.content;
    const author = message.author;
    
    if (!config.autoMod.enabled || !config.autoMod.linkFilter.enabled) return null;
    if (hasBypassPermissions(message.member, config)) return null;
    
    const urlRegex = /(?:https?:\/\/|www\.|(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;
    const urls = content.match(urlRegex);
    
    if (!urls) return null;
    
    const linkConfig = config.autoMod.linkFilter;
    const { whitelist, blacklist, shorteners } = config.linkLists;
    
    for (const url of urls) {
        const detection = analyzeUrl(url, linkConfig, whitelist, blacklist, shorteners);
        if (detection) {
            return {
                type: 'link',
                reason: detection.reason,
                severity: detection.severity,
                detectedUrl: url,
                detectionType: detection.type
            };
        }
    }
    
    return null;
}

function analyzeUrl(url, config, whitelist, blacklist, shorteners) {
    try {
        let cleanUrl = url.toLowerCase().trim();
        
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
            cleanUrl = 'https://' + cleanUrl;
        }
        
        const urlObj = new URL(cleanUrl);
        let domain = urlObj.hostname;
        
        if (domain.startsWith('www.')) {
            domain = domain.substring(4);
        }
        
        console.log(`🔍 Analyzing URL: ${url}`);
        console.log(`📍 Extracted domain: ${domain}`);
        
        // Check blacklist
        const isBlacklisted = blacklist.some(blocked => {
            return domain === blocked || domain.endsWith('.' + blocked) || blocked.includes(domain);
        });
        
        if (isBlacklisted) {
            console.log(`❌ BLOCKED: Blacklisted domain`);
            return {
                type: 'blacklisted',
                reason: `Blacklisted domain: ${domain}`,
                severity: 3
            };
        }
        
        // Check whitelist
        if (config.allowWhitelisted) {
            const isWhitelisted = whitelist.some(allowed => {
                return domain === allowed || domain.endsWith('.' + allowed);
            });
            
            if (isWhitelisted) {
                console.log(`✅ ALLOWED: Whitelisted domain (${domain})`);
                return null;
            }
        }
        
        // Check link shorteners
        if (config.blockShorteners) {
            const isShortener = shorteners.some(shortener => {
                return domain === shortener || domain.endsWith('.' + shortener);
            });
            
            if (isShortener) {
                console.log(`❌ BLOCKED: Link shortener`);
                return {
                    type: 'shortener',
                    reason: `Link shortener detected: ${domain}`,
                    severity: 2
                };
            }
        }
        
        // Suspicious domain detection
        const suspiciousChecks = checkSuspiciousDomain(domain, config.strictness);
        if (suspiciousChecks) {
            console.log(`❌ BLOCKED: Suspicious domain (${suspiciousChecks.type})`);
            return suspiciousChecks;
        }
        
        // High strictness check
        if (config.strictness === 'high' && config.allowWhitelisted) {
            const isWhitelisted = whitelist.some(allowed => {
                return domain === allowed || domain.endsWith('.' + allowed);
            });
            
            if (!isWhitelisted) {
                console.log(`❌ BLOCKED: Non-whitelisted domain on high strictness`);
                return {
                    type: 'non_whitelisted',
                    reason: `Non-whitelisted domain: ${domain}`,
                    severity: 1
                };
            }
        }
        
        console.log(`✅ ALLOWED: Passed all checks`);
        return null;
        
    } catch (error) {
        console.error(`❌ URL parsing error:`, error);
        if (url.includes('javascript:') || url.includes('data:')) {
            return {
                type: 'malformed',
                reason: 'Malformed or suspicious URL format',
                severity: 2
            };
        }
        return null;
    }
}

function checkSuspiciousDomain(domain, strictness) {
    const suspiciousPatterns = {
        discord_phishing: [
            'discrod', 'discorrd', 'disocrd', 'discod', 'disord',
            'steam-community', 'steamcommunity-', 'steamcomunity',
            'nitro-discord', 'discord-nitro', 'free-nitro'
        ],
        suspicious_tlds: {
            high: ['.tk', '.ml', '.ga', '.cf', '.click', '.download', '.top', '.win'],
            medium: ['.tk', '.ml', '.ga', '.cf', '.click'],
            low: ['.tk', '.ml', '.ga']
        },
        character_substitution: /[а-яё]|[αβγδεζηθικλμνξοπρστυφχψω]/i,
        excessive_subdomains: /^[^.]+\.[^.]+\.[^.]+\.[^.]+\./
    };
    
    for (const pattern of suspiciousPatterns.discord_phishing) {
        if (domain.includes(pattern)) {
            return {
                type: 'phishing',
                reason: `Potential phishing domain (${pattern}): ${domain}`,
                severity: 3
            };
        }
    }
    
    const suspiciousTlds = suspiciousPatterns.suspicious_tlds[strictness] || [];
    for (const tld of suspiciousTlds) {
        if (domain.endsWith(tld)) {
            return {
                type: 'suspicious_tld',
                reason: `Suspicious domain extension: ${domain}`,
                severity: strictness === 'high' ? 2 : 1
            };
        }
    }
    
    if (suspiciousPatterns.character_substitution.test(domain)) {
        return {
            type: 'character_substitution',
            reason: `Suspicious characters in domain: ${domain}`,
            severity: 2
        };
    }
    
    if (strictness !== 'low' && suspiciousPatterns.excessive_subdomains.test(domain)) {
        return {
            type: 'excessive_subdomains',
            reason: `Suspicious subdomain structure: ${domain}`,
            severity: 1
        };
    }
    
    return null;
}

// Logging system functions
async function logModerationAction(guild, config, logData) {
    if (!config.logging.enabled) {
        console.log(`🔇 Logging disabled for ${guild.name}`);
        return;
    }
    
    const { type, action, moderator, target, reason, details = {} } = logData;
    
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
    }
    
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
            if (details.detectedUrl) {
                description += `\n**Detected URL:** ${details.detectedUrl}`;
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
            channel: messageChannel ? `<#${messageChannel.id}>` : 'Unknown Channel',
            detectedUrl: detection.detectedUrl || null
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
    
    // Caps detection
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
    
    // Mentions detection
    const totalMentions = message.mentions.users.size + message.mentions.roles.size;
    if (totalMentions > config.autoMod.maxMentions) {
        return {
            type: 'mentions',
            reason: `Too many mentions (${totalMentions}/${config.autoMod.maxMentions})`,
            severity: 2
        };
    }
    
    // Character spam detection
    const repeatedPattern = new RegExp(`(.)\\1{${config.autoMod.maxRepeatedChars},}`, 'g');
    if (repeatedPattern.test(content)) {
        return {
            type: 'spam',
            reason: 'Repeated character spam',
            severity: 1
        };
    }
    
    // Rate limiting
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
    
    // Link detection
    const linkDetection = detectLinks(message, config);
    if (linkDetection) {
        return linkDetection;
    }
    
    return null;
}

async function handleAutoModAction(message, detection, config) {
    try {
        await message.delete();
        
        let embedTitle = '🛡️ Auto-Moderation';
        let embedColor = 0xf39c12;
        
        if (detection.type === 'link') {
            embedTitle = '🔗 Link Filter';
            embedColor = 0xe74c3c;
        }
        
        const embed = createEmbed(
            embedTitle,
            `${message.author}, your message was removed for: **${detection.reason}**`,
            embedColor
        );
        
        const warningMsg = await message.channel.send({ embeds: [embed] });
        setTimeout(() => warningMsg.delete().catch(() => {}), 5000);
        
        await logAutoModAction(message.guild, detection, message.author, config, message.channel);
    } catch (error) {
        console.error('Auto-mod action failed:', error);
    }
}

// ============================================================================
// INTERACTIVE CONFIGURATION INTERFACES (FULLY FIXED)
// ============================================================================

// Helper function to safely reply to interactions
async function safeReply(interaction, options) {
    try {
        if (interaction.replied || interaction.deferred) {
            return await interaction.editReply(options);
        } else {
            return await interaction.reply(options);
        }
    } catch (error) {
        console.error('Failed to reply to interaction:', error);
    }
}

// Main Config Interface
async function createMainConfigInterface(interaction) {
    const config = getServerConfig(interaction.guild.id);
    
    const embed = createEmbed(
        '🛠️ ModX Configuration Panel',
        `**Current Server Configuration:**\n\n` +
        `🛡️ **Auto-Moderation:** ${config.autoMod.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
        `📊 **Logging System:** ${config.logging.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
        `🔗 **Link Filter:** ${config.autoMod.linkFilter.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
        `⚠️ **Warning System:** ${config.warnings.enabled ? '✅ Enabled' : '❌ Disabled'}\n\n` +
        `**Choose a category to configure:**`,
        0x3498db
    );
    
    const row = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('config_category')
                .setPlaceholder('Select configuration category...')
                .addOptions([
                    {
                        label: 'Auto-Moderation',
                        description: 'Spam detection and filtering',
                        value: 'automod',
                        emoji: '🛡️'
                    },
                    {
                        label: 'Logging System',
                        description: 'Audit trails and logs',
                        value: 'logs',
                        emoji: '📊'
                    },
                    {
                        label: 'Link Filter',
                        description: 'Domain management',
                        value: 'linkfilter',
                        emoji: '🔗'
                    },
                    {
                        label: 'Warning System',
                        description: 'Escalation settings',
                        value: 'warnings',
                        emoji: '⚠️'
                    }
                ])
        );
    
    await safeReply(interaction, { embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
}

// FIXED: Auto-Mod Interface - Split into multiple rows to avoid width issues
async function createAutoModInterface(interaction) {
    const config = getServerConfig(interaction.guild.id);
    const autoMod = config.autoMod;
    const linkConfig = autoMod.linkFilter;
    
    const embed = createEmbed(
        '🛡️ Auto-Moderation Configuration',
        `**Current Settings:**\n\n` +
        `**Status:** ${autoMod.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
        `**Caps Limit:** ${autoMod.maxCapsPercentage}%\n` +
        `**Mention Limit:** ${autoMod.maxMentions} mentions\n` +
        `**Rate Limit:** ${autoMod.maxMessagesInWindow} msgs/${autoMod.spamTimeWindow/1000}s\n\n` +
        `**Link Filter:** ${linkConfig.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
        `**Strictness:** ${linkConfig.strictness.toUpperCase()}\n` +
        `**Block Shorteners:** ${linkConfig.blockShorteners ? '✅' : '❌'}\n\n` +
        `**Choose what to configure:**`,
        autoMod.enabled ? 0x00ff00 : 0xff0000
    );
    
    // FIXED: Row 1 - Main controls (shortened labels)
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('automod_toggle')
                .setLabel(autoMod.enabled ? 'Disable' : 'Enable')
                .setStyle(autoMod.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
                .setEmoji(autoMod.enabled ? '❌' : '✅'),
            new ButtonBuilder()
                .setCustomId('automod_caps')
                .setLabel('Caps Limit')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📝'),
            new ButtonBuilder()
                .setCustomId('automod_mentions')
                .setLabel('Mentions')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('👥')
        );
    
    // FIXED: Row 2 - Link filter controls
    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('linkfilter_toggle')
                .setLabel(linkConfig.enabled ? 'Disable Links' : 'Enable Links')
                .setStyle(linkConfig.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
                .setEmoji('🔗')
        );
    
    // FIXED: Row 3 - Strictness select (shortened descriptions)
    const row3 = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('linkfilter_strictness')
                .setPlaceholder('Select strictness level...')
                .addOptions([
                    {
                        label: 'Low',
                        description: 'Basic threats only',
                        value: 'low',
                        emoji: '🟢'
                    },
                    {
                        label: 'Medium',
                        description: 'Balanced filtering',
                        value: 'medium',
                        emoji: '🟡'
                    },
                    {
                        label: 'High',
                        description: 'Whitelist only',
                        value: 'high',
                        emoji: '🔴'
                    }
                ])
        );
    
    await safeReply(interaction, { embeds: [embed], components: [row1, row2, row3], flags: MessageFlags.Ephemeral });
}

// FIXED: Link Filter Interface
async function createLinkFilterInterface(interaction) {
    const config = getServerConfig(interaction.guild.id);
    const linkLists = config.linkLists;
    
    const embed = createEmbed(
        '🔗 Link Filter Domain Management',
        `**Current Domain Lists:**\n\n` +
        `**Whitelisted Domains:** ${linkLists.whitelist.length}\n` +
        `• ${linkLists.whitelist.slice(0, 5).join(', ')}${linkLists.whitelist.length > 5 ? '...' : ''}\n\n` +
        `**Blacklisted Domains:** ${linkLists.blacklist.length}\n` +
        `• ${linkLists.blacklist.length > 0 ? linkLists.blacklist.slice(0, 5).join(', ') : 'None'}${linkLists.blacklist.length > 5 ? '...' : ''}\n\n` +
        `**Known Shorteners:** ${linkLists.shorteners.length}\n` +
        `• ${linkLists.shorteners.slice(0, 5).join(', ')}...\n\n` +
        `**Choose an action:**`,
        0x3498db
    );
    
    // FIXED: Row 1 - Add/Remove controls (shortened labels)
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('whitelist_add')
                .setLabel('Add Whitelist')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId('blacklist_add')
                .setLabel('Add Blacklist')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🚫'),
            new ButtonBuilder()
                .setCustomId('whitelist_remove')
                .setLabel('Remove White')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🗑️')
        );
    
    // FIXED: Row 2 - View/Remove controls
    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('blacklist_remove')
                .setLabel('Remove Black')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🗑️'),
            new ButtonBuilder()
                .setCustomId('view_whitelist')
                .setLabel('View Whitelist')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📋'),
            new ButtonBuilder()
                .setCustomId('view_blacklist')
                .setLabel('View Blacklist')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📋')
        );
    
    await safeReply(interaction, { embeds: [embed], components: [row1, row2], flags: MessageFlags.Ephemeral });
}

// FIXED: Logs Interface - Split into multiple rows
async function createLogsInterface(interaction) {
    const config = getServerConfig(interaction.guild.id);
    const logging = config.logging;
    
    const embed = createEmbed(
        '📊 Logging System Configuration',
        `**Current Settings:**\n\n` +
        `**Status:** ${logging.enabled ? '✅ Enabled' : '❌ Disabled'}\n\n` +
        `**Log Channels:**\n` +
        `• Moderation: ${logging.channels.moderation ? `<#${logging.channels.moderation}>` : '❌ Not set'}\n` +
        `• Auto-Mod: ${logging.channels.automod ? `<#${logging.channels.automod}>` : '❌ Not set'}\n` +
        `• Member: ${logging.channels.member ? `<#${logging.channels.member}>` : '❌ Not set'}\n\n` +
        `**Active Categories:**\n` +
        `• Kicks: ${logging.categories.kicks ? '✅' : '❌'} • Bans: ${logging.categories.bans ? '✅' : '❌'}\n` +
        `• Warnings: ${logging.categories.warnings ? '✅' : '❌'} • Auto-Mod: ${logging.categories.automod ? '✅' : '❌'}\n\n` +
        `**Choose what to configure:**`,
        logging.enabled ? 0x00ff00 : 0xff0000
    );
    
    // FIXED: Row 1 - Toggle button only
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('logs_toggle')
                .setLabel(logging.enabled ? 'Disable Logging' : 'Enable Logging')
                .setStyle(logging.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
                .setEmoji(logging.enabled ? '❌' : '✅')
        );
    
    // FIXED: Row 2 - Channel selection (shortened descriptions)
    const row2 = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('logs_set_channel')
                .setPlaceholder('Set log channel...')
                .addOptions([
                    {
                        label: 'Moderation',
                        description: 'Kicks, bans, warnings',
                        value: 'moderation',
                        emoji: '🔨'
                    },
                    {
                        label: 'Auto-Mod',
                        description: 'Spam detection logs',
                        value: 'automod',
                        emoji: '🤖'
                    },
                    {
                        label: 'Member Events',
                        description: 'Join/leave events',
                        value: 'member',
                        emoji: '👥'
                    }
                ])
        );
    
    // FIXED: Row 3 - Category toggles (shortened descriptions)
    const row3 = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('logs_toggle_category')
                .setPlaceholder('Toggle categories...')
                .addOptions([
                    {
                        label: 'Kicks',
                        description: logging.categories.kicks ? 'Enabled' : 'Disabled',
                        value: 'kicks',
                        emoji: logging.categories.kicks ? '✅' : '❌'
                    },
                    {
                        label: 'Bans',
                        description: logging.categories.bans ? 'Enabled' : 'Disabled',
                        value: 'bans',
                        emoji: logging.categories.bans ? '✅' : '❌'
                    },
                    {
                        label: 'Warnings',
                        description: logging.categories.warnings ? 'Enabled' : 'Disabled',
                        value: 'warnings',
                        emoji: logging.categories.warnings ? '✅' : '❌'
                    },
                    {
                        label: 'Auto-Mod',
                        description: logging.categories.automod ? 'Enabled' : 'Disabled',
                        value: 'automod',
                        emoji: logging.categories.automod ? '✅' : '❌'
                    },
                    {
                        label: 'Member Join',
                        description: logging.categories.memberJoin ? 'Enabled' : 'Disabled',
                        value: 'memberJoin',
                        emoji: logging.categories.memberJoin ? '✅' : '❌'
                    }
                ])
        );
    
    await safeReply(interaction, { embeds: [embed], components: [row1, row2, row3], flags: MessageFlags.Ephemeral });
}

// Modal creators for text inputs
function createCapsModal() {
    const modal = new ModalBuilder()
        .setCustomId('caps_modal')
        .setTitle('Set Caps Percentage Limit');
    
    const capsInput = new TextInputBuilder()
        .setCustomId('caps_value')
        .setLabel('Maximum caps percentage (1-100)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 80')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(3);
    
    const firstActionRow = new ActionRowBuilder().addComponents(capsInput);
    modal.addComponents(firstActionRow);
    
    return modal;
}

function createMentionsModal() {
    const modal = new ModalBuilder()
        .setCustomId('mentions_modal')
        .setTitle('Set Mention Limit');
    
    const mentionsInput = new TextInputBuilder()
        .setCustomId('mentions_value')
        .setLabel('Maximum mentions per message (1-20)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 5')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(2);
    
    const firstActionRow = new ActionRowBuilder().addComponents(mentionsInput);
    modal.addComponents(firstActionRow);
    
    return modal;
}

function createDomainModal(action, listType) {
    const modal = new ModalBuilder()
        .setCustomId(`domain_modal_${action}_${listType}`)
        .setTitle(`${action === 'add' ? 'Add' : 'Remove'} Domain ${action === 'add' ? 'to' : 'from'} ${listType.charAt(0).toUpperCase() + listType.slice(1)}`);
    
    const domainInput = new TextInputBuilder()
        .setCustomId('domain_value')
        .setLabel(`Domain to ${action} (without https://)`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., example.com')
        .setRequired(true);
    
    const firstActionRow = new ActionRowBuilder().addComponents(domainInput);
    modal.addComponents(firstActionRow);
    
    return modal;
}

function createChannelModal(channelType) {
    const modal = new ModalBuilder()
        .setCustomId(`channel_modal_${channelType}`)
        .setTitle(`Set ${channelType.charAt(0).toUpperCase() + channelType.slice(1)} Log Channel`);
    
    const channelInput = new TextInputBuilder()
        .setCustomId('channel_value')
        .setLabel('Channel ID or mention (#channel)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., #mod-logs or 123456789012345678')
        .setRequired(true);
    
    const firstActionRow = new ActionRowBuilder().addComponents(channelInput);
    modal.addComponents(firstActionRow);
    
    return modal;
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
    console.log(`🖱️ Interactive Interfaces: Enabled`);
    
    client.guilds.cache.forEach(guild => {
        getServerConfig(guild.id);
    });
    
    await registerCommands();
    
    client.user.setPresence({
        activities: [{ name: 'with interactive configs 🖱️', type: 0 }],
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

// FIXED: Handle slash command interactions
client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            const { commandName } = interaction;
            
            if (commandName === 'ping') {
                const embed = createEmbed(
                    '🏓 Pong!', 
                    `**Bot Latency:** ${client.ws.ping}ms\n**Response Time:** ${Date.now() - interaction.createdTimestamp}ms\n**Interface Type:** Interactive Configuration`, 
                    0x00ff00
                );
                await interaction.reply({ embeds: [embed] });
            }
            
            // Interactive Configuration Commands
            else if (commandName === 'config') {
                await createMainConfigInterface(interaction);
            }
            
            else if (commandName === 'automod') {
                await createAutoModInterface(interaction);
            }
            
            else if (commandName === 'linkfilter') {
                await createLinkFilterInterface(interaction);
            }
            
            else if (commandName === 'logs') {
                await createLogsInterface(interaction);
            }
            
            else if (commandName === 'help') {
                const embed = createEmbed(
                    '📚 ModX Interactive Command System',
                    '**🔨 Quick Moderation Commands:**\n' +
                    '`/kick @user [reason]` - Kick a member\n' +
                    '`/ban @user [reason] [duration] [unit]` - Ban a member\n' +
                    '`/timeout @user <minutes> [reason]` - Timeout a member\n' +
                    '`/warn @user <reason> [severity]` - Issue a warning\n' +
                    '`/warnings @user` - View user warnings\n' +
                    '`/clear <amount>` - Delete messages\n\n' +
                    
                    '**🖱️ Interactive Configuration:**\n' +
                    '`/config` - 🛠️ Main configuration panel\n' +
                    '`/automod` - 🛡️ Auto-moderation interface\n' +
                    '`/linkfilter` - 🔗 Link filter management\n' +
                    '`/logs` - 📊 Logging system setup\n\n' +
                    
                    '**✨ Interactive Features:**\n' +
                    '• **Button Controls** - Toggle settings with one click\n' +
                    '• **Dropdown Menus** - Easy option selection\n' +
                    '• **Modal Forms** - Clean text input for values\n' +
                    '• **Real-time Updates** - See changes instantly\n' +
                    '• **Guided Setup** - Step-by-step configuration\n\n' +
                    
                    '**🚀 Pro Features:**\n' +
                    '• Advanced link filtering with phishing protection\n' +
                    '• Smart auto-moderation with configurable thresholds\n' +
                    '• Progressive warning system with auto-escalation\n' +
                    '• Multi-channel logging with category control\n' +
                    '• Temporary bans with automatic scheduling\n\n' +
                    
                    '**💡 Getting Started:**\n' +
                    'Use `/config` to open the main configuration panel and set up your server protection!',
                    0x5865F2
                );
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
            
            // Core Moderation Commands
            else if (commandName === 'kick') {
                const targetUser = interaction.options.getUser('user');
                const reason = interaction.options.getString('reason') || 'No reason provided';
                
                const targetMember = interaction.guild.members.cache.get(targetUser.id);
                if (!targetMember) {
                    const embed = createEmbed('❌ User Not Found', 'This user is not in the server!', 0xff0000);
                    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                }
                
                if (!targetMember.kickable) {
                    const embed = createEmbed('❌ Cannot Kick', 'I cannot kick this user! They might have higher permissions than me.', 0xff0000);
                    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
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
                
                const targetMember = interaction.guild.members.cache.get(targetUser.id);
                if (targetMember && !targetMember.bannable) {
                    const embed = createEmbed('❌ Cannot Ban', 'I cannot ban this user! They might have higher permissions than me.', 0xff0000);
                    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                }
                
                if (duration && unit) {
                    if (!validateDuration(duration, unit)) {
                        const embed = createEmbed('❌ Invalid Duration', 'Duration exceeds maximum allowed limit for the specified unit.', 0xff0000);
                        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                    }
                    
                    await interaction.guild.members.ban(targetUser.id, { reason });
                    scheduleUnban(interaction.guild.id, targetUser.id, duration, unit, reason);
                    
                    const formattedDuration = formatDuration(duration, unit);
                    const embed = createEmbed(
                        '🔨 User Temporarily Banned',
                        `**User:** ${targetUser.tag} (${targetUser.id})\n**Reason:** ${reason}\n**Duration:** ${formattedDuration}\n**Moderator:** ${interaction.user.tag}\n\n⏰ User will be automatically unbanned after the duration expires.`,
                        0xff8c00
                    );
                    await interaction.reply({ embeds: [embed] });
                    
                    const config = getServerConfig(interaction.guild.id);
                    await logModerationAction(interaction.guild, config, {
                        type: 'ban',
                        action: 'ban',
                        moderator: interaction.user,
                        target: targetUser,
                        reason: reason,
                        details: { duration: formattedDuration }
                    });
                } else {
                    await interaction.guild.members.ban(targetUser.id, { reason });
                    
                    const embed = createEmbed(
                        '🔨 User Permanently Banned',
                        `**User:** ${targetUser.tag} (${targetUser.id})\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`,
                        0x8b0000
                    );
                    await interaction.reply({ embeds: [embed] });
                    
                    const config = getServerConfig(interaction.guild.id);
                    await logModerationAction(interaction.guild, config, {
                        type: 'ban',
                        action: 'ban',
                        moderator: interaction.user,
                        target: targetUser,
                        reason: reason
                    });
                }
            }
            
            else if (commandName === 'unban') {
                const userId = interaction.options.getString('userid');
                const reason = interaction.options.getString('reason') || 'No reason provided';
                
                try {
                    const bannedUser = await interaction.guild.bans.fetch(userId);
                    await interaction.guild.members.unban(userId, reason);
                    
                    tempBans.delete(`${interaction.guild.id}-${userId}`);
                    
                    const embed = createEmbed(
                        '✅ User Unbanned',
                        `**User:** ${bannedUser.user.tag} (${userId})\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`,
                        0x00ff00
                    );
                    await interaction.reply({ embeds: [embed] });
                    
                    const config = getServerConfig(interaction.guild.id);
                    await logModerationAction(interaction.guild, config, {
                        type: 'unban',
                        action: 'unban',
                        moderator: interaction.user,
                        target: bannedUser.user,
                        reason: reason
                    });
                } catch (error) {
                    const embed = createEmbed('❌ User Not Found', 'This user is not banned or the user ID is invalid.', 0xff0000);
                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                }
            }
            
            else if (commandName === 'timeout') {
                const targetUser = interaction.options.getUser('user');
                const duration = interaction.options.getInteger('duration');
                const reason = interaction.options.getString('reason') || 'No reason provided';
                
                const targetMember = interaction.guild.members.cache.get(targetUser.id);
                if (!targetMember) {
                    const embed = createEmbed('❌ User Not Found', 'This user is not in the server!', 0xff0000);
                    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                }
                
                if (!targetMember.moderatable) {
                    const embed = createEmbed('❌ Cannot Timeout', 'I cannot timeout this user! They might have higher permissions than me.', 0xff0000);
                    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                }
                
                const timeoutDuration = duration * 60 * 1000;
                await targetMember.timeout(timeoutDuration, reason);
                
                const embed = createEmbed(
                    '🔇 User Timed Out',
                    `**User:** ${targetUser.tag} (${targetUser.id})\n**Duration:** ${duration} minute(s)\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`,
                    0xf39c12
                );
                await interaction.reply({ embeds: [embed] });
                
                const config = getServerConfig(interaction.guild.id);
                await logModerationAction(interaction.guild, config, {
                    type: 'timeout',
                    action: 'timeout',
                    moderator: interaction.user,
                    target: targetUser,
                    reason: reason,
                    details: { duration: `${duration} minute(s)` }
                });
            }
            
            else if (commandName === 'warn') {
                const targetUser = interaction.options.getUser('user');
                const reason = interaction.options.getString('reason');
                const severity = interaction.options.getString('severity') || 'moderate';
                
                const targetMember = interaction.guild.members.cache.get(targetUser.id);
                if (!targetMember) {
                    const embed = createEmbed('❌ User Not Found', 'This user is not in the server!', 0xff0000);
                    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                }
                
                const warning = addWarning(interaction.guild.id, targetUser.id, interaction.user.id, reason, severity);
                const activeWarnings = getActiveWarnings(interaction.guild.id, targetUser.id);
                const warningCount = activeWarnings.length;
                
                const config = getServerConfig(interaction.guild.id);
                const escalation = await checkWarningEscalation(interaction.guild, targetUser, config, warningCount);
                
                let escalationText = '';
                if (escalation) {
                    escalationText = `\n\n🔄 **Auto-Escalation:** ${escalation.action.toUpperCase()} (${escalation.threshold} warnings threshold reached)`;
                }
                
                const embed = createEmbed(
                    '⚠️ Warning Issued',
                    `**User:** ${targetUser.tag} (${targetUser.id})\n**Warning ID:** ${warning.id}\n**Severity:** ${severity.toUpperCase()}\n**Reason:** ${reason}\n**Total Warnings:** ${warningCount}\n**Moderator:** ${interaction.user.tag}${escalationText}`,
                    0xff8c00
                );
                await interaction.reply({ embeds: [embed] });
                
                try {
                    const dmEmbed = createEmbed(
                        '⚠️ Warning Received',
                        `You have received a **${severity}** warning in **${interaction.guild.name}**.\n\n**Reason:** ${reason}\n**Warning ID:** ${warning.id}\n**Total Active Warnings:** ${warningCount}\n\nPlease review the server rules to avoid further action.`,
                        0xff8c00
                    );
                    await targetUser.send({ embeds: [dmEmbed] });
                } catch (error) {
                    console.log(`Could not send DM to ${targetUser.tag}`);
                }
                
                await logWarningAction(interaction.guild, 'add', targetUser, interaction.user, { ...warning, count: warningCount }, escalation, config);
            }
            
            else if (commandName === 'warnings') {
                const targetUser = interaction.options.getUser('user');
                const warnings = getUserWarnings(interaction.guild.id, targetUser.id);
                const activeWarnings = warnings.filter(w => w.active);
                
                if (activeWarnings.length === 0) {
                    const embed = createEmbed('📋 No Warnings', `${targetUser.tag} has no active warnings.`, 0x00ff00);
                    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                }
                
                const warningsList = activeWarnings.map(w => {
                    const date = new Date(w.timestamp).toLocaleDateString();
                    const moderator = interaction.guild.members.cache.get(w.moderatorId);
                    return `**${w.id}** - ${w.severity.toUpperCase()} - ${date}\n└ ${w.reason}\n└ By: ${moderator ? moderator.user.tag : 'Unknown Moderator'}`;
                }).join('\n\n');
                
                const embed = createEmbed(
                    `⚠️ Warnings for ${targetUser.tag}`,
                    `**Active Warnings:** ${activeWarnings.length}\n\n${warningsList}`,
                    0xff8c00
                );
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
            
            else if (commandName === 'removewarn') {
                const targetUser = interaction.options.getUser('user');
                const warningId = interaction.options.getString('warning_id');
                
                const success = removeWarning(interaction.guild.id, targetUser.id, warningId);
                
                if (success) {
                    const embed = createEmbed(
                        '✅ Warning Removed',
                        `Warning **${warningId}** has been removed from ${targetUser.tag}.`,
                        0x00ff00
                    );
                    await interaction.reply({ embeds: [embed] });
                    
                    const config = getServerConfig(interaction.guild.id);
                    await logWarningAction(interaction.guild, 'remove', targetUser, interaction.user, { id: warningId, reason: 'Warning removed by moderator' }, null, config);
                } else {
                    const embed = createEmbed(
                        '❌ Warning Not Found',
                        `Warning **${warningId}** not found or already removed.`,
                        0xff0000
                    );
                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                }
            }
            
            else if (commandName === 'clearwarnings') {
                const targetUser = interaction.options.getUser('user');
                const reason = interaction.options.getString('reason') || 'No reason provided';
                
                const clearedCount = clearAllWarnings(interaction.guild.id, targetUser.id, interaction.user.id, reason);
                
                if (clearedCount > 0) {
                    const embed = createEmbed(
                        '✅ Warnings Cleared',
                        `**${clearedCount}** warning(s) have been cleared for ${targetUser.tag}.\n**Reason:** ${reason}`,
                        0x00ff00
                    );
                    await interaction.reply({ embeds: [embed] });
                    
                    const config = getServerConfig(interaction.guild.id);
                    await logWarningAction(interaction.guild, 'clear', targetUser, interaction.user, { reason, count: clearedCount }, null, config);
                } else {
                    const embed = createEmbed(
                        '⚠️ No Warnings',
                        `${targetUser.tag} has no active warnings to clear.`,
                        0xff8c00
                    );
                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                }
            }
            
            else if (commandName === 'clear') {
                const amount = interaction.options.getInteger('amount');
                
                try {
                    const messages = await interaction.channel.messages.fetch({ limit: amount });
                    await interaction.channel.bulkDelete(messages);
                    
                    const embed = createEmbed(
                        '🗑️ Messages Deleted',
                        `Successfully deleted **${messages.size}** message(s).`,
                        0x00ff00
                    );
                    const response = await interaction.reply({ embeds: [embed] });
                    
                    setTimeout(() => {
                        response.delete().catch(() => {});
                    }, 5000);
                } catch (error) {
                    const embed = createEmbed(
                        '❌ Delete Failed',
                        'Failed to delete messages. They might be older than 14 days or I lack permissions.',
                        0xff0000
                    );
                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                }
            }
        }
        
        // FIXED: Handle Button Interactions
        else if (interaction.isButton()) {
            const config = getServerConfig(interaction.guild.id);
            
            if (interaction.customId === 'automod_toggle') {
                config.autoMod.enabled = !config.autoMod.enabled;
                const status = config.autoMod.enabled ? 'enabled' : 'disabled';
                
                const embed = createEmbed(
                    '🛡️ Auto-Moderation Updated',
                    `Auto-moderation has been **${status}**.`,
                    config.autoMod.enabled ? 0x00ff00 : 0xff0000
                );
                
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
            
            else if (interaction.customId === 'automod_caps') {
                const modal = createCapsModal();
                await interaction.showModal(modal);
            }
            
            else if (interaction.customId === 'automod_mentions') {
                const modal = createMentionsModal();
                await interaction.showModal(modal);
            }
            
            else if (interaction.customId === 'linkfilter_toggle') {
                config.autoMod.linkFilter.enabled = !config.autoMod.linkFilter.enabled;
                const status = config.autoMod.linkFilter.enabled ? 'enabled' : 'disabled';
                
                const embed = createEmbed(
                    '🔗 Link Filter Updated',
                    `Link filtering has been **${status}**.`,
                    config.autoMod.linkFilter.enabled ? 0x00ff00 : 0xff0000
                );
                
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
            
            else if (interaction.customId === 'logs_toggle') {
                config.logging.enabled = !config.logging.enabled;
                const status = config.logging.enabled ? 'enabled' : 'disabled';
                
                const embed = createEmbed(
                    '📊 Logging Updated',
                    `Logging system has been **${status}**.`,
                    config.logging.enabled ? 0x00ff00 : 0xff0000
                );
                
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
            
            else if (interaction.customId.startsWith('whitelist_') || interaction.customId.startsWith('blacklist_')) {
                const [listType, action] = interaction.customId.split('_');
                
                if (action === 'add' || action === 'remove') {
                    const modal = createDomainModal(action, listType);
                    await interaction.showModal(modal);
                } else if (action === 'view') {
                    const list = config.linkLists[listType];
                    const embed = createEmbed(
                        `📋 ${listType.charAt(0).toUpperCase() + listType.slice(1)} Domains`,
                        list.length > 0 ? list.map(d => `• ${d}`).join('\n') : `No domains in ${listType}.`,
                        0x3498db
                    );
                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                }
            }
        }
        
        // FIXED: Handle Select Menu Interactions
        else if (interaction.isStringSelectMenu()) {
            const config = getServerConfig(interaction.guild.id);
            
            if (interaction.customId === 'config_category') {
                const category = interaction.values[0];
                
                await interaction.deferUpdate();
                
                switch (category) {
                    case 'automod':
                        await createAutoModInterface(interaction);
                        break;
                    case 'logs':
                        await createLogsInterface(interaction);
                        break;
                    case 'linkfilter':
                        await createLinkFilterInterface(interaction);
                        break;
                    case 'warnings':
                        const embed = createEmbed(
                            '⚠️ Warning Configuration',
                            'Warning system configuration interface coming soon!\n\nFor now, the warning system is fully functional with these settings:\n\n' +
                            `**Status:** ${config.warnings.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                            `**Auto-Escalation:** ${config.warnings.autoEscalation ? '✅ Enabled' : '❌ Disabled'}\n` +
                            `**Thresholds:** ${config.warnings.thresholds.timeout} → timeout, ${config.warnings.thresholds.kick} → kick, ${config.warnings.thresholds.ban} → ban`,
                            0xf39c12
                        );
                        await interaction.editReply({ embeds: [embed], components: [] });
                        break;
                }
            }
            
            else if (interaction.customId === 'linkfilter_strictness') {
                const strictness = interaction.values[0];
                config.autoMod.linkFilter.strictness = strictness;
                
                const embed = createEmbed(
                    '🎚️ Strictness Updated',
                    `Link filtering strictness set to **${strictness.toUpperCase()}**.`,
                    0x00ff00
                );
                
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
            
            else if (interaction.customId === 'logs_set_channel') {
                const channelType = interaction.values[0];
                const modal = createChannelModal(channelType);
                await interaction.showModal(modal);
            }
            
            else if (interaction.customId === 'logs_toggle_category') {
                const category = interaction.values[0];
                config.logging.categories[category] = !config.logging.categories[category];
                const status = config.logging.categories[category] ? 'enabled' : 'disabled';
                
                const embed = createEmbed(
                    '⚙️ Log Category Updated',
                    `**${category}** logs have been **${status}**.`,
                    config.logging.categories[category] ? 0x00ff00 : 0xff0000
                );
                
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
        }
        
        // FIXED: Handle Modal Submissions
        else if (interaction.isModalSubmit()) {
            const config = getServerConfig(interaction.guild.id);
            
            if (interaction.customId === 'caps_modal') {
                const capsValue = parseInt(interaction.fields.getTextInputValue('caps_value'));
                
                if (capsValue >= 1 && capsValue <= 100) {
                    config.autoMod.maxCapsPercentage = capsValue;
                    
                    const embed = createEmbed(
                        '📝 Caps Limit Updated',
                        `Maximum caps percentage set to **${capsValue}%**.`,
                        0x00ff00
                    );
                    
                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                } else {
                    const embed = createEmbed(
                        '❌ Invalid Value',
                        'Please enter a value between 1 and 100.',
                        0xff0000
                    );
                    
                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                }
            }
            
            else if (interaction.customId === 'mentions_modal') {
                const mentionsValue = parseInt(interaction.fields.getTextInputValue('mentions_value'));
                
                if (mentionsValue >= 1 && mentionsValue <= 20) {
                    config.autoMod.maxMentions = mentionsValue;
                    
                    const embed = createEmbed(
                        '👥 Mention Limit Updated',
                        `Maximum mentions per message set to **${mentionsValue}**.`,
                        0x00ff00
                    );
                    
                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                } else {
                    const embed = createEmbed(
                        '❌ Invalid Value',
                        'Please enter a value between 1 and 20.',
                        0xff0000
                    );
                    
                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                }
            }
            
            else if (interaction.customId.startsWith('domain_modal_')) {
                const [, , action, listType] = interaction.customId.split('_');
                const domain = interaction.fields.getTextInputValue('domain_value').toLowerCase().replace(/^https?:\/\/(www\.)?/, '');
                const list = config.linkLists[listType];
                
                if (action === 'add') {
                    if (!list.includes(domain)) {
                        list.push(domain);
                        const embed = createEmbed(
                            '✅ Domain Added',
                            `**${domain}** has been added to the ${listType}.`,
                            0x00ff00
                        );
                        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                    } else {
                        const embed = createEmbed(
                            '⚠️ Already Exists',
                            `**${domain}** is already in the ${listType}.`,
                            0xff8c00
                        );
                        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                    }
                } else if (action === 'remove') {
                    const index = list.indexOf(domain);
                    if (index !== -1) {
                        list.splice(index, 1);
                        const embed = createEmbed(
                            '✅ Domain Removed',
                            `**${domain}** has been removed from the ${listType}.`,
                            0x00ff00
                        );
                        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                    } else {
                        const embed = createEmbed(
                            '❌ Not Found',
                            `**${domain}** is not in the ${listType}.`,
                            0xff0000
                        );
                        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                    }
                }
            }
            
            else if (interaction.customId.startsWith('channel_modal_')) {
                const channelType = interaction.customId.split('_')[2];
                const channelValue = interaction.fields.getTextInputValue('channel_value');
                
                const channelId = channelValue.replace(/[<#>]/g, '');
                const channel = interaction.guild.channels.cache.get(channelId);
                
                if (channel && channel.type === 0) {
                    config.logging.channels[channelType] = channel.id;
                    
                    const embed = createEmbed(
                        '✅ Log Channel Set',
                        `${channelType.charAt(0).toUpperCase() + channelType.slice(1)} logs will be sent to ${channel}.`,
                        0x00ff00
                    );
                    
                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                } else {
                    const embed = createEmbed(
                        '❌ Invalid Channel',
                        'Please provide a valid text channel ID or mention.',
                        0xff0000
                    );
                    
                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                }
            }
        }
        
    } catch (error) {
        console.error('Interaction error:', error);
        
        // FIXED: Better error handling that checks reply status
        if (!interaction.replied && !interaction.deferred) {
            const errorEmbed = createEmbed(
                '❌ Error',
                'Something went wrong while processing your request.',
                0xff0000
            );
            
            try {
                await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            } catch (e) {
                console.error('Failed to send error response:', e);
            }
        }
    }
});

// Handle errors gracefully
client.on('error', error => {
    console.error('Discord.js error:', error);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);