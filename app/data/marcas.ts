// Marcas populares que aparecen en el selector rápido de "Añadir suscripción".
//
// Cada marca puede tener su PNG (campo `icono`) o, si no lo tiene todavía,
// se muestra un cuadrito de color con la inicial. Pon los PNG en
// /public/iconos/ (ej: public/iconos/netflix.png -> icono: '/iconos/netflix.png').
//
// Cómo agregar una marca nueva: copia una línea, cambia el nombre y los
// colores (hex), y agrégala donde quieras dentro del arreglo — ese es el
// orden en que se muestran en la lista "Populares". Los comentarios de
// categoría (🎬, 🎵, etc.) son solo para que te ubiques al editar; no son
// un campo de datos, así que no afectan nada en la app.
//
// - nombre: texto que se muestra y que se usa como nombre de la suscripción.
// - bg:     color de fondo del cuadrito del logo (se usa si no hay icono,
//           o como fondo detrás del icono si su PNG tiene transparencia).
// - texto:  color de la inicial dentro del cuadrito (si no hay icono).
// - icono:  (opcional) ruta al PNG dentro de /public, ej: '/iconos/netflix.png'.
//           Si lo defines, se muestra esa imagen en vez del color + inicial.
export type Marca = {
  nombre: string;
  bg: string;
  texto: string;
  icono?: string;
  // Marca esta app como parte de las ~30 que se muestran por defecto en
  // "Populares" (ordenadas A-Z) antes de que el usuario busque algo.
  // El buscador siempre busca en TODA la lista, no solo en las populares.
  popular?: boolean;
};

export const POPULARES: Marca[] = [
  // 🎬 Streaming de video (películas y series)
  { nombre: 'Netflix', bg: '#831010', texto: '#000000', icono: '/iconos/netflix.png', popular: true },
  { nombre: 'Disney+', bg: '#0C1836', texto: '#FFFFFF', icono: '/iconos/disneyplus.png', popular: true },
  { nombre: 'Max (HBO Max)', bg: '#002BE7', texto: '#FFFFFF', icono: '/iconos/max.png', popular: true },
  { nombre: 'Amazon Prime Video', bg: '#1F2E4A', texto: '#00A8E1', icono: '/iconos/amazonprimevideo.png', popular: true },
  { nombre: 'Apple TV+', bg: '#000000', texto: '#FFFFFF', icono: '/iconos/appletvplus.png', popular: true },
  { nombre: 'Paramount+', bg: '#0064FF', texto: '#FFFFFF', icono: '/iconos/paramountplus.png', popular: true },
  { nombre: 'Hulu', bg: '#1CE783', texto: '#000000', icono: '/iconos/hulu.png' },
  { nombre: 'Crunchyroll', bg: '#F47521', texto: '#FFFFFF', icono: '/iconos/crunchyroll.png' },
  { nombre: 'Discovery+', bg: '#0A1F44', texto: '#4CD3FF', icono: '/iconos/discoveryplus.png' },
  { nombre: 'ViX', bg: '#000000', texto: '#00E5B0', icono: '/iconos/vix.png' },

  // 🎵 Música
  { nombre: 'Spotify', bg: '#1DB954', texto: '#000000', icono: '/iconos/spotify.png', popular: true },
  { nombre: 'Apple Music', bg: '#FA243C', texto: '#FFFFFF', icono: '/iconos/applemusic.png', popular: true },
  { nombre: 'YouTube Music', bg: '#FF0000', texto: '#FFFFFF', icono: '/iconos/youtubemusic.png', popular: true },
  { nombre: 'Amazon Music', bg: '#1F2E4A', texto: '#00A8E1', icono: '/iconos/amazonmusic.png' },
  { nombre: 'Deezer', bg: '#A238FF', texto: '#FFFFFF', icono: '/iconos/deezer.png' },
  { nombre: 'Tidal', bg: '#000000', texto: '#FFFFFF', icono: '/iconos/tidal.png' },
  { nombre: 'SoundCloud Go+', bg: '#FF5500', texto: '#FFFFFF', icono: '/iconos/soundcloudgoplus.png' },

  // 📺 Streaming en vivo
  { nombre: 'Twitch', bg: '#9146FF', texto: '#FFFFFF', icono: '/iconos/twitch.png', popular: true },
  { nombre: 'YouTube', bg: '#FF0000', texto: '#FFFFFF', icono: '/iconos/youtube.png', popular: true },
  { nombre: 'Kick', bg: '#53FC18', texto: '#000000', icono: '/iconos/kick.png', popular: true },
  { nombre: 'Facebook Live', bg: '#1877F2', texto: '#FFFFFF', icono: '/iconos/facebooklive.png' },
  { nombre: 'TikTok Live', bg: '#010101', texto: '#25F4EE', icono: '/iconos/tiktoklive.png' },

  // 🎮 Suscripciones de videojuegos
  { nombre: 'PlayStation', bg: '#003791', texto: '#FFFFFF', icono: '/iconos/playstation.png' },
  { nombre: 'PlayStation Plus', bg: '#FFB800', texto: '#000000', icono: '/iconos/playstationplus.png', popular: true },
  { nombre: 'Xbox', bg: '#107C10', texto: '#FFFFFF', icono: '/iconos/xbox.png' },
  { nombre: 'Xbox Game Pass', bg: '#107C10', texto: '#FFFFFF', icono: '/iconos/xboxgamepass.png', popular: true },
  { nombre: 'PC Game Pass', bg: '#107C10', texto: '#FFFFFF', icono: '/iconos/pcgamepass.png' },
  { nombre: 'Nintendo', bg: '#E60012', texto: '#FFFFFF', icono: '/iconos/nintendo.png' },
  { nombre: 'Nintendo Switch Online', bg: '#E60012', texto: '#FFFFFF', icono: '/iconos/nintendoswitchonline.png', popular: true },
  { nombre: 'EA Play', bg: '#000000', texto: '#FFFFFF', icono: '/iconos/eaplay.png' },
  { nombre: 'Ubisoft+', bg: '#0D1B2A', texto: '#00D4FF', icono: '/iconos/ubisoftplus.png' },
  { nombre: 'GeForce NOW', bg: '#76B900', texto: '#000000', icono: '/iconos/geforcenow.png' },

  // 📚 Libros y audiolibros
  { nombre: 'Kindle Unlimited', bg: '#111111', texto: '#FF9900', icono: '/iconos/kindleunlimited.png', popular: true },
  { nombre: 'Audible', bg: '#000000', texto: '#F8991C', icono: '/iconos/audible.png', popular: true },
  { nombre: 'Everand', bg: '#1B5E3F', texto: '#FFFFFF', icono: '/iconos/everand.png' },
  { nombre: 'Storytel', bg: '#EB2B3B', texto: '#FFFFFF', icono: '/iconos/storytel.png' },
  { nombre: 'BookBeat', bg: '#00C9A7', texto: '#000000', icono: '/iconos/bookbeat.png' },

  // 🎓 Educación
  { nombre: 'Coursera Plus', bg: '#0056D2', texto: '#FFFFFF', icono: '/iconos/courseraplus.png' },
  { nombre: 'LinkedIn Learning', bg: '#0A66C2', texto: '#FFFFFF', icono: '/iconos/linkedinlearning.png' },
  { nombre: 'Udemy', bg: '#A435F0', texto: '#FFFFFF', icono: '/iconos/udemy.png' , popular: true },
  { nombre: 'Duolingo Super', bg: '#58CC02', texto: '#000000', icono: '/iconos/duolingosuper.png', popular: true },
  { nombre: 'Platzi', bg: '#00B14F', texto: '#FFFFFF', icono: '/iconos/platzi.png' , popular: true},

  // 💪 Fitness y bienestar
  { nombre: 'Apple Fitness+', bg: '#000000', texto: '#FE2C55', icono: '/iconos/applefitnessplus.png' },
  { nombre: 'Nike Training Club Premium', bg: '#000000', texto: '#FFFFFF', icono: '/iconos/niketrainingclubpremium.png' },
  { nombre: 'Strava Summit', bg: '#FC4C02', texto: '#FFFFFF', icono: '/iconos/stravasummit.png' , popular: true},

  // 🛡️ Seguridad y VPN
  { nombre: 'NordVPN', bg: '#4687FF', texto: '#FFFFFF', icono: '/iconos/nordvpn.png', popular: true },
  { nombre: 'ExpressVPN', bg: '#DA3940', texto: '#FFFFFF', icono: '/iconos/expressvpn.png' },
  { nombre: 'Bitdefender Premium', bg: '#ED1C24', texto: '#FFFFFF', icono: '/iconos/bitdefenderpremium.png' },
  { nombre: 'Malwarebytes Premium', bg: '#0D1B2A', texto: '#4285F4', icono: '/iconos/malwarebytespremium.png' },

  // 🤖 Inteligencia Artificial
  { nombre: 'ChatGPT Plus', bg: '#10A37F', texto: '#FFFFFF', icono: '/iconos/chatgptplus.png', popular: true },
  { nombre: 'Claude Pro', bg: '#D97757', texto: '#FFFFFF', icono: '/iconos/claudepro.png', popular: true },
  { nombre: 'Google AI Pro (Gemini)', bg: '#1A73E8', texto: '#FFFFFF', icono: '/iconos/googleaipro.png' },
  { nombre: 'Perplexity Pro', bg: '#20808D', texto: '#FFFFFF', icono: '/iconos/perplexitypro.png' },
  { nombre: 'Microsoft Copilot Pro', bg: '#0F6CBD', texto: '#FFFFFF', icono: '/iconos/microsoftcopilotpro.png' },
  { nombre: 'Midjourney', bg: '#000000', texto: '#FFFFFF', icono: '/iconos/midjourney.png' },
  { nombre: 'Runway', bg: '#000000', texto: '#00FF88', icono: '/iconos/runway.png' },
  { nombre: 'Leonardo AI', bg: '#1A1A2E', texto: '#B18CFF', icono: '/iconos/leonardoai.png' },

  // 💼 Productividad
  { nombre: 'Microsoft 365', bg: '#EB3C00', texto: '#FFFFFF', icono: '/iconos/microsoft365.png', popular: true },
  { nombre: 'Google Workspace', bg: '#4285F4', texto: '#FFFFFF', icono: '/iconos/googleworkspace.png' },
  { nombre: 'Notion Plus', bg: '#000000', texto: '#FFFFFF', icono: '/iconos/notionplus.png' },
  { nombre: 'Evernote Personal', bg: '#00A82D', texto: '#FFFFFF', icono: '/iconos/evernotepersonal.png' },
  { nombre: 'Dropbox Plus', bg: '#0061FF', texto: '#FFFFFF', icono: '/iconos/dropboxplus.png' },
  { nombre: 'iCloud+', bg: '#3693F3', texto: '#FFFFFF', icono: '/iconos/icloudplus.png', popular: true },
  { nombre: 'Adobe Creative Cloud', bg: '#DA1F26', texto: '#FFFFFF', icono: '/iconos/adobecreativecloud.png', popular: true },
  { nombre: 'Canva Pro', bg: '#00C4CC', texto: '#000000', icono: '/iconos/canvapro.png', popular: true },
  { nombre: 'Figma Professional', bg: '#1E1E1E', texto: '#A259FF', icono: '/iconos/figmaprofessional.png' },

  // 💻 Desarrollo de software
  { nombre: 'GitHub Copilot', bg: '#0D1117', texto: '#FFFFFF', icono: '/iconos/githubcopilot.png' },
  { nombre: 'Docker Pro', bg: '#0DB7ED', texto: '#000000', icono: '/iconos/dockerpro.png' },
  { nombre: 'Vercel Pro', bg: '#000000', texto: '#FFFFFF', icono: '/iconos/vercelpro.png' },
  { nombre: 'Render', bg: '#0A0A0A', texto: '#46E3B7', icono: '/iconos/render.png' },

  // ⚽ Deportes
  { nombre: 'DAZN', bg: '#F8F8F8', texto: '#000000', icono: '/iconos/dazn.png' },
  { nombre: 'NBA League Pass', bg: '#1D1160', texto: '#FDBB30', icono: '/iconos/nbaleaguepass.png' },
  { nombre: 'NFL Game Pass', bg: '#013369', texto: '#D50A0A', icono: '/iconos/nflgamepass.png' },
  { nombre: 'MLB.TV', bg: '#041E42', texto: '#BF0D3E', icono: '/iconos/mlbtv.png' },
  { nombre: 'NHL.TV', bg: '#000000', texto: '#FFFFFF', icono: '/iconos/nhltv.png' },
  { nombre: 'F1 TV', bg: '#E10600', texto: '#FFFFFF', icono: '/iconos/f1tv.png' },
  { nombre: 'UFC Fight Pass', bg: '#000000', texto: '#D20A0A', icono: '/iconos/ufcfightpass.png' },
  { nombre: 'Tennis TV', bg: '#00457C', texto: '#FFFFFF', icono: '/iconos/tennistv.png' },
  { nombre: 'PGA TOUR Live', bg: '#002D72', texto: '#FFFFFF', icono: '/iconos/pgatourlive.png' },
  { nombre: 'WWE Network', bg: '#000000', texto: '#FFFFFF', icono: '/iconos/wwenetwork.png' },
  { nombre: 'FIFA+', bg: '#03FF5E', texto: '#02122C', icono: '/iconos/fifaplus.png' },

  // 🎬 Contenido para creadores
  { nombre: 'Patreon', bg: '#FF424D', texto: '#FFFFFF', icono: '/iconos/patreon.png', popular: true },
  { nombre: 'YouTube Premium', bg: '#FF0000', texto: '#FFFFFF', icono: '/iconos/youtubepremium.png' },
  { nombre: 'OnlyFans', bg: '#00BFFF', texto: '#000000', icono: '/iconos/onlyfans.png', popular: true },

  // ☁️ Almacenamiento
  { nombre: 'Google One', bg: '#4285F4', texto: '#FFFFFF', icono: '/iconos/googleone.png' },
  { nombre: 'Dropbox', bg: '#0061FF', texto: '#FFFFFF', icono: '/iconos/dropbox.png', popular: true },
  { nombre: 'OneDrive', bg: '#0078D4', texto: '#FFFFFF', icono: '/iconos/onedrive.png' },
  { nombre: 'MEGA', bg: '#D9272E', texto: '#FFFFFF', icono: '/iconos/mega.png' },
];

// Normaliza texto para comparar sin importar mayúsculas/acentos, usado por
// el buscador de marcas.
export function normalizarTexto(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Las ~30 marcas que se muestran por defecto en "Populares" (antes de que el
// usuario escriba algo en el buscador), ordenadas alfabéticamente A-Z. Para
// agregar o quitar una de aquí, solo cambia su `popular: true/false` (o
// quítalo) arriba en POPULARES; el orden alfabético se calcula solo.
export const MARCAS_POPULARES: Marca[] = POPULARES.filter((m) => m.popular).sort((a, b) =>
  normalizarTexto(a.nombre).localeCompare(normalizarTexto(b.nombre))
);

// El catálogo completo (todas las marcas, incluidas las populares) ordenado
// A-Z, para mostrarlo debajo de "Populares" y que se pueda encontrar
// cualquier marca sin tener que escribir nada en el buscador.
export const MARCAS_TODAS: Marca[] = [...POPULARES].sort((a, b) =>
  normalizarTexto(a.nombre).localeCompare(normalizarTexto(b.nombre))
);
