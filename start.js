const { Client, Events, GatewayIntentBits } = require('discord.js');
const { ChannelType } = require('discord.js');
const config = require('./config.json');

const client = new Client({ intents: [ 
  GatewayIntentBits.DirectMessages,
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,] });


client.once(Events.ClientReady, readyClient => {
    console.clear()
	console.log(`

    ██╗███╗   ██╗████████╗███████╗██████╗ ███╗   ██╗ █████╗ ██╗         ██████╗  █████╗ ██╗██████╗ 
    ██║████╗  ██║╚══██╔══╝██╔════╝██╔══██╗████╗  ██║██╔══██╗██║         ██╔══██╗██╔══██╗██║██╔══██╗
    ██║██╔██╗ ██║   ██║   █████╗  ██████╔╝██╔██╗ ██║███████║██║         ██████╔╝███████║██║██║  ██║
    ██║██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗██║╚██╗██║██╔══██║██║         ██╔══██╗██╔══██║██║██║  ██║
    ██║██║ ╚████║   ██║   ███████╗██║  ██║██║ ╚████║██║  ██║███████╗    ██║  ██║██║  ██║██║██████╔╝
    ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝    ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═════╝ 
    > InternalRaid - v1.0.2                                                                                          
    > BOT: ${readyClient.user.tag}
    > Invite "${readyClient.user.username}" Link: https://discord.com/oauth2/authorize?client_id=${readyClient.user.id}&scope=bot+applications.commands&permissions=8

    > Frist time start detected! Use this command with your bot! "$ internal" to setup!
    `);

});

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

const fs = require('fs');
const configPath = './InternalSettings/InternalMode.json';

function SetInternalMode(Mode) {
    fs.readFile(configPath, 'utf8', (err, data) => {
        try {
          const config = JSON.parse(data);
          if (config.hasOwnProperty('SilenceMode')) {
            config.SilenceMode = Mode;
          }
          const updatedConfig = JSON.stringify(config, null, 2);
          fs.writeFile(configPath, updatedConfig, 'utf8', (err) => {
              console.log('Successfully updated config.json');
          });
        } catch (error) {
          console.error('Error parsing or modifying config:', error);
        }
      });
}

client.on('messageCreate', async (message) => {
    if (message.content === '$ internal') {
        message.delete()
        console.log('Start setting up...');
        message.channel.send('`InternalRaid - SETUP (v1.0.2)`\nDo you want to use silence attack mode?\n`Answer ONLY (yes/no)`');
    
        try {
            const collected = await message.channel.awaitMessages({
            filter: (m) => m.author.id === message.author.id,
            max: 1,
            time: 15000,
            errors: ['time'],
            });
    
            const userResponse = collected.first().content.toLowerCase();
            if (userResponse === 'yes') {
            message.channel.send('`InternalRaid - SETUP (v1.0.2)`\nCool! Now your attack will be silence.\nIf have some issue, You can use "$ help"');
            SetInternalMode(true)
            } else if (userResponse === 'no') {
            message.channel.send('`InternalRaid - SETUP (v1.0.2)`\nAlright, You can now use the InternalRaid normally!\nIf have some issue, You can use "$ help"');
            SetInternalMode(false)
            } else {
            message.channel.send('`$ Invalid input. Please try again.`');
            }
    
        } catch (error) {
            console.error('Error waiting for user input:', error);
            message.channel.send('`$ Timed out waiting for your response.`');
        }
    }

    if (message.content === '$ help') {
        console.log('Sent the help menu');
        message.channel.send('`InternalRaid - SETUP (v1.0.2)`\nIf you are using the silence mode, You need to setup at "`./InternalSettings/InternalSilence.json`"\nAnd if you are using the normal mode you have to set the config at "`./InternalSettings/InternalRaid.json`"\nIf you are ready to use the **InternalRaid** right now, you can terminate this process and run "`main.js`"\nThanks you for using InternalRaid :D\nDont forget to star on my github too!');
    }

  });


client.login(config.token);
