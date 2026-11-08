import "dotenv/config";
import express from "express";
import { Client, GatewayIntentBits, ActivityType } from "discord.js";

import config from "./config.js";
import { crearHiloGenesis } from "./services/genesisThreads.js";
import { iniciarRecordatorioCC } from "./services/recordatorioCC.js";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// ======================
// EXPRESS (RENDER HEALTH CHECK)
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

// ======================
// BOT LISTO
// ======================
client.once("clientReady", async () => {
    console.log(`✅ ${client.user.tag} conectado correctamente.`);

    await client.user.setActivity("Gestionando hilos Genesis", {
        type: ActivityType.Watching
    });

    iniciarRecordatorioCC(client);

    // Se dispara de forma asíncrona en segundo plano sin congelar el login
    hacerBarridoInicial().catch(err => console.error("❌ Error en el barrido inicial:", err));
});

// ======================
// DETECTAR ROL GENESIS
// ======================
client.on("guildMemberUpdate", async (oldMember, newMember) => {
    try {
        console.log(`🔍 guildMemberUpdate detectado: ${newMember.user.username}`);

        if (newMember.guild.id !== config.guildId) return;

        const teniaRolAntes = oldMember.roles.cache.has(config.rolGenesis);
        const tieneRolAhora = newMember.roles.cache.has(config.rolGenesis);

        if (!teniaRolAntes && tieneRolAhora) {
            console.log(`🎉 ${newMember.user.username} recibió el rol Genesis.`);
            await crearHiloGenesis(newMember);
            console.log("✅ crearHiloGenesis finalizó.");
        }
    } catch (err) {
        console.error("❌ Error en guildMemberUpdate:", err);
    }
});

// ======================
// EVENTOS Y ERRORES
// ======================
client.on("error", (err) => console.error("❌ Error del cliente:", err));

client.on("shardDisconnect", (event, shardId) => {
    console.error(`❌ Shard ${shardId} desconectado. Código: ${event.code} | Motivo: ${event.reason}`);
});

client.on("shardReconnecting", (shardId) => console.log(`🔄 Shard ${shardId} intentando reconectar...`));
client.on("shardResume", (shardId) => console.log(`🔄 Shard ${shardId} reconectado.`));
client.on("shardReady", (shardId) => console.log(`✅ Shard ${shardId} conectado.`));
client.on("shardError", (error) => console.error("❌ Error del shard:", error));

process.on("unhandledRejection", (reason) => console.error("❌ Unhandled Rejection:", reason));
process.on("uncaughtException", (err) => console.error("❌ Uncaught Exception:", err));

// ======================
// BARRIDO INICIAL (ASÍNCRONO)
// ======================
async function hacerBarridoInicial() {
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
        console.error("❌ Error en el barrido inicial:", err);
    }
}

// ======================
// HEARTBEAT
// ======================
setInterval(() => {
    console.log(
        `❤️ Proceso vivo | Discord: ${
            client.isReady() ? "CONECTADO" : "DESCONECTADO"
        } | ${new Date().toLocaleString("es-AR", {
            timeZone: "America/Argentina/Buenos_Aires"
        })}`
    );
}, 60000);

// ======================
// ARRANQUE DEL SERVIDOR Y LOGIN
// ======================
app.listen(PORT, () => {
    console.log(`🌐 Servidor web listo en puerto ${PORT}`);
    
    const token = process.env.TOKEN?.trim();

    if (!token) {
        console.error("❌ TOKEN no está configurado en las variables de entorno.");
        return;
    }

    // Retardo de 2 segundos para estabilizar la red del contenedor antes de conectar el WebSocket
    setTimeout(() => {
        console.log("🔑 Iniciando sesión en Discord...");
        client.login(token).catch((err) => {
            console.error("❌ Error al iniciar sesión en Discord:", err);
        });
    }, 2000);
});