import "dotenv/config";
import express from "express";
import { Client, GatewayIntentBits, ActivityType } from "discord.js";

import config from "./config.js";
import { crearHiloGenesis } from "./services/genesisThreads.js";
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers // necesario para detectar cambios de rol
    ]
});

// ======================
// BOT LISTO
// ======================

client.once("clientReady", async () => {

    console.log(`✅ ${client.user.tag} conectado.`);

    await client.user.setActivity("Gestionando hilos Genesis", {
        type: ActivityType.Watching
    });

    // ======================
    // BARRIDO INICIAL: crear hilos para quienes ya tienen el rol
    // ======================

    try {

        const guild = await client.guilds.fetch(config.guildId);

        await guild.members.fetch();

        const miembrosConRol = guild.members.cache.filter((member) =>
            member.roles.cache.has(config.rolGenesis)
        );

        console.log(`👥 ${miembrosConRol.size} miembros con el rol Genesis encontrados.`);

        for (const member of miembrosConRol.values()) {

            await crearHiloGenesis(member);

            await new Promise((resolve) => setTimeout(resolve, 1000));

        }

        console.log("✅ Barrido inicial completado.");

    } catch (err) {

        console.error("❌ Error en el barrido inicial:");
        console.error(err);

    }

});

// ======================
// DETECTAR ROL GENESIS
// ======================

client.on("guildMemberUpdate", async (oldMember, newMember) => {

    console.log(`🔍 guildMemberUpdate detectado: ${newMember.user.username}`);
    console.log(`🔍 Guild del evento: ${newMember.guild.id} | Guild configurado: ${config.guildId}`);

    if (newMember.guild.id !== config.guildId) {
        console.log("⚠️ El evento es de otro server, se ignora.");
        return;
    }

    const teniaRolAntes = oldMember.roles.cache.has(config.rolGenesis);
    const tieneRolAhora = newMember.roles.cache.has(config.rolGenesis);

    console.log(`🔍 Tenía rol antes: ${teniaRolAntes} | Tiene rol ahora: ${tieneRolAhora}`);

    if (!teniaRolAntes && tieneRolAhora) {

        console.log(`🎉 ${newMember.user.username} recibió el rol Genesis.`);

        await crearHiloGenesis(newMember);

    }

});

// ======================
// EVENTOS
// ======================

client.on("error", (err) => {
    console.error("❌ Error del cliente:");
    console.error(err);
});

client.on("shardDisconnect", (event, shardId) => {
    console.log(`❌ Shard ${shardId} desconectado.`);
    console.log(event);
});

client.on("shardResume", (shardId) => {
    console.log(`🔄 Shard ${shardId} reconectado.`);
});

client.on("shardError", (error) => {
    console.error("❌ Error del shard:");
    console.error(error);
});

// ======================
// ERRORES GLOBALES
// ======================

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:");
    console.error(reason);
});

process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:");
    console.error(err);
});

// ======================
// HEARTBEAT
// ======================

setInterval(() => {

    console.log(
        `❤️ Bot vivo | ${new Date().toLocaleString("es-AR", {
            timeZone: "America/Argentina/Buenos_Aires"
        })}`
    );

}, 60000);

// ======================
// LOGIN
// ======================

client.login(process.env.TOKEN);

// ======================
// EXPRESS (RENDER)
// ======================

const app = express();

app.get("/", (req, res) => {

    console.log(
        `🏓 Ping recibido | ${new Date().toLocaleString("es-AR", {
            timeZone: "America/Argentina/Buenos_Aires"
        })}`
    );

    res.send("Genesis Bot funcionando.");

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🌐 Servidor escuchando en puerto ${PORT}`);
});