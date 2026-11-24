/**
 * Vistas previas automáticas (WhatsApp, Facebook, Telegram…) y rastreadores: abren el enlace al pegarlo
 * en un chat, segundos después de enviarlo. No son aperturas del local y no deben sumar vistas en el CRM.
 */
const ROBOT = /whatsapp|facebookexternalhit|facebookcatalog|meta-external|telegrambot|twitterbot|linkedinbot|slackbot|discordbot|skypeuripreview|googlebot|google-read-aloud|bingbot|applebot|yandex|duckduckbot|petalbot|bytespider|headlesschrome|bot[ ;)+-]|crawler|spider|curl|wget|python-|node-fetch|undici|axios|go-http/i;
export const esRobot = (agente: string | null | undefined) => !agente || ROBOT.test(agente);
