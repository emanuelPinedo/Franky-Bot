import cron from "node-cron";
import config from "../config.js";
import { ChannelType } from "discord.js";

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================
// Trae TODOS los hilos del forum (activos + archivados, con paginación)
// ============================

async function obtenerTodosLosHilos(forumChannel) {

    const hilos = new Map();

    const activos = await forumChannel.threads.fetchActive();
    activos.threads.forEach((hilo) => hilos.set(hilo.id, hilo));

    let before;
    let hayMas = true;

    while (hayMas) {

        const pagina = await forumChannel.threads.fetchArchived({
            type: "public",
            limit: 100,
            before
        });

        pagina.threads.forEach((hilo) => hilos.set(hilo.id, hilo));

        hayMas = pagina.hasMore;
        before = pagina.threads.last();

        if (!before) break;

    }

    return [...hilos.values()];

}

// ============================
// Escribe el recordatorio en cada hilo
// ============================

async function enviarRecordatorios(client) {

    const guild = await client.guilds.fetch(config.guildId);
    const forumChannel = await guild.channels.fetch(config.forumChannel);

    if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
        console.error("❌ Recordatorio CC: no se encontró el canal forum.");
        return;
    }

    const hilos = await obtenerTodosLosHilos(forumChannel);

    console.log(`📨 Recordatorio CC: ${hilos.length} hilos encontrados.`);

    const driveTexto = config.recordatorioCC.drive
        ? ` (${config.recordatorioCC.drive})`
        : "";

    let enviados = 0;
    let omitidos = 0;

    for (const hilo of hilos) {

        try {

            // El dueño del hilo es el bot, así que el usuario sale de la mención del mensaje inicial
            const mensajeInicial = await hilo.fetchStarterMessage();
            const usuario = mensajeInicial?.mentions.users.first();

            if (!usuario) {
                omitidos++;
                continue;
            }

            // Solo se lo mandamos a quienes siguen en el server con el rol Genesis
            const member =
                guild.members.cache.get(usuario.id) ??
                await guild.members.fetch(usuario.id).catch(() => null);

            if (!member || !member.roles.cache.has(config.rolGenesis)) {
                omitidos++;
                continue;
            }

            await hilo.send(
                `<@${usuario.id}> 🔔 ¡Recordatorio! No te olvides de enviar tu foto de CC, ` +
                `ya sea acá en tu hilo o subiéndola al Drive${driveTexto}. `
                + `Cualquier duda, escribile a cualquier Subcapitan! Gracias.`
            );

            enviados++;

        } catch (err) {

            console.error(`⚠️ Recordatorio CC: falló el hilo "${hilo.name}":`, err.message);

        }

        // Pausa para no chocar con los rate limits de Discord
        await esperar(1500);

    }

    console.log(`✅ Recordatorio CC terminado: ${enviados} enviados, ${omitidos} omitidos.`);

}

// ============================
// Programa el cron semanal
// ============================

export function iniciarRecordatorioCC(client) {

    const { dia, hora, minuto } = config.recordatorioCC;

    cron.schedule(
        `${minuto} ${hora} * * ${dia}`,
        () => {
            enviarRecordatorios(client).catch((err) => {
                console.error("❌ Error en el recordatorio CC:");
                console.error(err);
            });
        },
        { timezone: "America/Argentina/Buenos_Aires" }
    );

    console.log("⏰ Recordatorio CC programado.");

}