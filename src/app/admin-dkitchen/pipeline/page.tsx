import { redirect } from 'next/navigation';

/** La maqueta «Proyectos» de la plantilla se sustituye por el CRM de prospección (0058). */
export default function Pipeline() {
  redirect('/admin-dkitchen/prospeccion');
}
