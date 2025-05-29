// Discord Moderation Bot - Slash Commands Version with Flexible Temporary Bans
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, SlashCommandBuilder, REST, Routes } = require('discord.js');

// Create the Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,           // See servers
        GatewayIntentBits.GuildMessages,    // Read messages
        GatewayIntentBits.MessageContent,   // Read message content
        GatewayIntentBits.GuildMembers,     // See members (for kick/ban)
        GatewayIntentBits.GuildModeration   // Moderation actions
    ]
});

// Simple storage for temporary bans (upgrade to database later)
const tempBans = new Map();

// Define all slash commands
const commands = [
    // PING COMMAND
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check if the bot is working'),
    
    // KICK COMMAND
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
    
    // BAN COMMAND (now supports temporary bans with flexible time units)
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
                .setMaxValue(525600)) // Max ~1 year in minutes
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
    
    // UNBAN COMMAND
    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user from the server')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('The user ID to unban (right-click user → Copy User ID)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the unban')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers),
    
    // CLEAR COMMAND
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
    
    // TIMEOUT COMMAND
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
                .setMaxValue(40320)) // 28 days max
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the timeout')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
    
    // HELP COMMAND
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all available commands')
];

// Helper function to create nice-looking embeds
function createEmbed(title, description, color = 0x5865F2) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: 'ModBot Pro' });
}

// Helper function to convert time to milliseconds
function convertToMilliseconds(duration, unit) {
    const multipliers = {
        'minutes': 60 * 1000,      // 1 minute = 60,000ms
        'hours': 60 * 60 * 1000,   // 1 hour = 3,600,000ms
        'days': 24 * 60 * 60 * 1000 // 1 day = 86,400,000ms
    };
    
    return duration * multipliers[unit];
}

// Helper function to format duration for display
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

// Function to validate duration limits
function validateDuration(duration, unit) {
    const limits = {
        'minutes': 525600, // ~1 year in minutes
        'hours': 8760,     // 1 year in hours  
        'days': 365        // 1 year in days
    };
    
    return duration <= limits[unit];
}

// Function to schedule automatic unban
function scheduleUnban(guildId, userId, duration, unit, reason) {
    const durationMs = convertToMilliseconds(duration, unit);
    const unbanTime = Date.now() + durationMs;
    
    // Store temp ban info
    tempBans.set(`${guildId}-${userId}`, {
        unbanTime,
        reason,
        guildId,
        userId,
        duration,
        unit
    });
    
    // Set timeout for automatic unban
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
        
        // Remove from temp bans
        tempBans.delete(`${guildId}-${userId}`);
    }, durationMs);
}

// Register slash commands
async function registerCommands() {
    try {
        console.log('🔄 Registering slash commands...');
        
        const rest = new REST().setToken(process.env.DISCORD_TOKEN);
        
        // Register commands globally (takes up to 1 hour to appear)
        // For faster testing, you can register for a specific guild instead
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands.map(command => command.toJSON()) }
        );
        
        console.log('✅ Slash commands registered successfully!');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
}

// Bot is ready!
client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} is online!`);
    console.log(`📊 Connected to ${client.guilds.cache.size} servers`);
    
    // Register slash commands
    await registerCommands();
    
    // Set bot's status
    client.user.setPresence({
        activities: [{ name: 'for rule breakers 👀', type: 3 }], // 3 = WATCHING
        status: 'online'
    });
});

// Handle slash command interactions
client.on('interactionCreate', async (interaction) => {
    // Only handle slash commands
    if (!interaction.isChatInputCommand()) return;
    
    const { commandName } = interaction;
    
    try {
        // PING COMMAND
        if (commandName === 'ping') {
            const embed = createEmbed(
                '🏓 Pong!', 
                `**Bot Latency:** ${client.ws.ping}ms\n**Response Time:** ${Date.now() - interaction.createdTimestamp}ms`, 
                0x00ff00
            );
            await interaction.reply({ embeds: [embed] });
        }
        
        // KICK COMMAND
        else if (commandName === 'kick') {
            const targetUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            
            // Get the member object
            const targetMember = interaction.guild.members.cache.get(targetUser.id);
            if (!targetMember) {
                const embed = createEmbed('❌ User Not Found', 'This user is not in the server!', 0xff0000);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            // Check if we can kick them
            if (!targetMember.kickable) {
                const embed = createEmbed('❌ Cannot Kick', 'I cannot kick this user! They might have higher permissions than me.', 0xff0000);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            // Kick the user
            await targetMember.kick(reason);
            
            const embed = createEmbed(
                '👢 User Kicked',
                `**User:** ${targetUser.tag} (${targetUser.id})\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`,
                0x00ff00
            );
            await interaction.reply({ embeds: [embed] });
        }
        
        // BAN COMMAND (now with flexible time units)
        else if (commandName === 'ban') {
            const targetUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            const duration = interaction.options.getInteger('duration');
            const unit = interaction.options.getString('unit');
            
            // Validate duration and unit logic
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
            
            // Validate duration limits
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
                // Ban the user
                await interaction.guild.members.ban(targetUser, { reason: reason });
                
                let banType = 'Permanent';
                let durationText = '';
                
                // If duration is specified, schedule automatic unban
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
        
        // UNBAN COMMAND
        else if (commandName === 'unban') {
            const userId = interaction.options.getString('userid');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            
            // Validate user ID format
            if (!/^\d{17,19}$/.test(userId)) {
                const embed = createEmbed(
                    '❌ Invalid User ID', 
                    'Please provide a valid Discord user ID (17-19 digits).\n\n**How to get User ID:**\n1. Enable Developer Mode in Discord\n2. Right-click the user → Copy User ID', 
                    0xff0000
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            try {
                // Try to unban the user
                const unbannedUser = await interaction.guild.members.unban(userId, reason);
                
                // Remove from temp bans if it was a temporary ban
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
        
        // CLEAR COMMAND
        else if (commandName === 'clear') {
            const amount = interaction.options.getInteger('amount');
            
            // Delete messages
            const deleted = await interaction.channel.bulkDelete(amount, true);
            
            const embed = createEmbed(
                '🧹 Messages Cleared', 
                `Successfully deleted ${deleted.size} messages!`, 
                0x00ff00
            );
            
            // Reply ephemerally (only the user who ran the command can see it)
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        // TIMEOUT COMMAND
        else if (commandName === 'timeout') {
            const targetUser = interaction.options.getUser('user');
            const duration = interaction.options.getInteger('duration'); // in minutes
            const reason = interaction.options.getString('reason') || 'No reason provided';
            
            const targetMember = interaction.guild.members.cache.get(targetUser.id);
            if (!targetMember) {
                const embed = createEmbed('❌ User Not Found', 'This user is not in the server!', 0xff0000);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            // Convert minutes to milliseconds
            const timeoutDuration = duration * 60 * 1000;
            
            // Timeout the user
            await targetMember.timeout(timeoutDuration, reason);
            
            // Format duration for display
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
        }
        
        // HELP COMMAND
        else if (commandName === 'help') {
            const embed = createEmbed(
                '📚 ModBot Pro Commands',
                '**Available Slash Commands:**\n\n' +
                '🏓 `/ping` - Test if bot is working\n' +
                '👢 `/kick <user> [reason]` - Kick a member\n' +
                '🔨 `/ban <user> [reason] [duration] [unit]` - Ban a member\n' +
                '✅ `/unban <userid> [reason]` - Unban a user by ID\n' +
                '🔇 `/timeout <user> <duration> [reason]` - Timeout a member\n' +
                '🧹 `/clear <amount>` - Delete messages (1-100)\n' +
                '📚 `/help` - Show this message\n\n' +
                '**Ban Examples:**\n' +
                '• `/ban @user` - Permanent ban\n' +
                '• `/ban @user Spamming 30 minutes` - 30-minute ban\n' +
                '• `/ban @user Toxic behavior 2 hours` - 2-hour ban\n' +
                '• `/ban @user Rule breaking 7 days` - 1-week ban\n' +
                '• `/ban @user Multiple violations 30 days` - 1-month ban\n\n' +
                '**Time Units Available:**\n' +
                '• **Minutes** - For short punishments (1-525,600)\n' +
                '• **Hours** - For medium punishments (1-8,760)\n' +
                '• **Days** - For long punishments (1-365)\n\n' +
                '**Features:**\n' +
                '• Flexible temporary ban system\n' +
                '• Automatic unban scheduling\n' +
                '• Professional error handling\n' +
                '• Easy-to-use slash commands\n\n' +
                '*Built for modern Discord servers*',
                0x5865F2
            );
            await interaction.reply({ embeds: [embed] });
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