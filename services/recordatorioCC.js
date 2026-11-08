import cron from "node-cron";
import config from "../config.js";
import { ChannelType } from "discord.js";

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function enviarRecordatorios(client) {
    try {
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
                const mensajeInicial = await hilo.fetchStarterMessage();
                const usuario = mensajeInicial?.mentions.users.first();

                if (!usuario) {
                    omitidos++;
                    continue;
                }

                const member =
                    guild.members.cache.get(usuario.id) ??
                    await guild.members.fetch(usuario.id).catch(() => null);

                if (!member || !member.roles.cache.has(config.rolGenesis)) {
                    omitidos++;
                    continue;
                }

                await hilo.send(
                    `<@${usuario.id}> 🔔 ¡Recordatorio! No te olvides de enviar tu foto de CC, ` +
                    `ya sea acá en tu hilo o subiéndola al Drive${driveTexto}. ` +
                    `Cualquier duda, escribile a cualquier Subcapitan! Gracias.`
                );

                enviados++;
            } catch (err) {
                console.error(`⚠️ Recordatorio CC: falló el hilo "${hilo.name}":`, err.message);
            }

            await esperar(1500);
        }

        console.log(`✅ Recordatorio CC terminado: ${enviados} enviados, ${omitidos} omitidos.`);
    } catch (err) {
        console.error("❌ Error global en enviarRecordatorios:", err);
    }
}

export function iniciarRecordatorioCC(client) {
    const { dia, hora, minuto } = config.recordatorioCC;

    // Formato cron válido de 5 parámetros: Minuto Hora DíaMes Mes DíaSemana
    const expresionCron = `${minuto} ${hora} * * ${dia}`;

    cron.schedule(
        expresionCron,
        () => {
            enviarRecordatorios(client).catch((err) => {
                console.error("❌ Error ejecutando recordatorio CC:", err);
            });
        },
        { timezone: "America/Argentina/Buenos_Aires" }
    );

    console.log(`⏰ Recordatorio CC programado en la expresión cron: "${expresionCron}"`);
}