import config from "../config.js";
import { ChannelType } from "discord.js";

// ============================
// Verifica si el usuario ya tiene un hilo creado
// ============================

async function usuarioYaTieneHilo(forumChannel, username) {

    const activos = await forumChannel.threads.fetchActive();
    const archivados = await forumChannel.threads.fetchArchived();

    const todos = [
        ...activos.threads.values(),
        ...archivados.threads.values()
    ];

    return todos.some((hilo) => hilo.name === username);

}

// ============================
// Crea el hilo de CC para un miembro
// ============================

export async function crearHiloGenesis(member) {

    try {

        const forumChannel = member.guild.channels.cache.get(config.forumChannel);

        if (!forumChannel) {
            console.error("❌ No se encontró el canal forum configurado.");
            return;
        }

        if (forumChannel.type !== ChannelType.GuildForum) {
            console.error("❌ El canal configurado no es un Forum Channel.");
            return;
        }

        const username = member.user.username;

        const yaExiste = await usuarioYaTieneHilo(forumChannel, username);

        if (yaExiste) {
            console.log(`ℹ️ ${username} ya tiene un hilo, se omite.`);
            return;
        }

        await forumChannel.threads.create({
            name: username,
            message: {
                content:
                    `¡Hola <@${member.id}>! 👋\n\n` +
                    `Este es tu hilo personal de **CC**. Podés usarlo para:\n` +
                    `📸 Enviar la foto de tu CC\n` +
                    `❓ Hacer cualquier consulta relacionada\n\n` +
                    `¡Cualquier duda, preguntá tranquilo/a por acá!`
            }
        });

        console.log(`✅ Hilo creado para ${username}`);

    } catch (err) {

        console.error(`❌ Error creando hilo para ${member.user.username}:`);
        console.error(err);

    }

}