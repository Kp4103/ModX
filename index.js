// Discord Moderation Bot - Slash Commands Version
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
    
    // BAN COMMAND
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban')
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
        
        // BAN COMMAND
        else if (commandName === 'ban') {
            const targetUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            
            // Ban the user
            await interaction.guild.members.ban(targetUser, { reason: reason });
            
            const embed = createEmbed(
                '🔨 User Banned',
                `**User:** ${targetUser.tag} (${targetUser.id})\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`,
                0x00ff00
            );
            await interaction.reply({ embeds: [embed] });
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
                '🔨 `/ban <user> [reason]` - Ban a member\n' +
                '🔇 `/timeout <user> <duration> [reason]` - Timeout a member\n' +
                '🧹 `/clear <amount>` - Delete messages (1-100)\n' +
                '📚 `/help` - Show this message\n\n' +
                '**Features:**\n' +
                '• Auto-moderation coming soon!\n' +
                '• Professional logging\n' +
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