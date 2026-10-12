/** WhatsApp comercial de DKitchen (622 652 659): un solo sitio para los enlaces de la web. */
export const WHATSAPP_NUMERO = '34622652659';
export const wa = (texto: string) => `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(texto)}`;
export const WHATSAPP_DEMO = wa('Hola, quiero ver una demo de DKitchen con mi carta.');
export const WHATSAPP_INFO = wa('Hola, quiero más información sobre DKitchen.');
