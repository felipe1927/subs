'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  Settings,
  Maximize2,
  Plus,
  X,
  ArrowUpDown,
  ArrowLeft,
  Trash2,
  Search,
  ChevronRight,
  Check,
  Pencil,
  ChevronsUpDown,
  TrendingUp,
  CalendarRange,
  Clapperboard,
  Music,
  Gamepad2,
  Briefcase,
  Bot,
  GraduationCap,
  Dumbbell,
  Shield,
  Newspaper,
  Package,
  type LucideIcon,
} from 'lucide-react';
import { POPULARES, MARCAS_POPULARES, MARCAS_TODAS, normalizarTexto, type Marca } from './data/marcas';

// Agrupa MARCAS_TODAS (ya viene ordenado A-Z) por su letra inicial, para
// mostrarlo en el selector como una lista tipo "Contactos": cada grupo
// con su propio encabezado de letra que se queda fijo (sticky) mientras
// se hace scroll por ese grupo.
const MARCAS_POR_LETRA: { letra: string; marcas: Marca[] }[] = (() => {
  const grupos: { letra: string; marcas: Marca[] }[] = [];
  for (const m of MARCAS_TODAS) {
    const letra = normalizarTexto(m.nombre).charAt(0).toUpperCase();
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.letra === letra) {
      ultimo.marcas.push(m);
    } else {
      grupos.push({ letra, marcas: [m] });
    }
  }
  return grupos;
})();

const CATEGORIAS: { nombre: string; Icono: LucideIcon }[] = [
  { nombre: 'Streaming', Icono: Clapperboard },
  { nombre: 'Música', Icono: Music },
  { nombre: 'Videojuegos', Icono: Gamepad2 },
  { nombre: 'Productividad', Icono: Briefcase },
  { nombre: 'Inteligencia artificial', Icono: Bot },
  { nombre: 'Educación', Icono: GraduationCap },
  { nombre: 'Fitness', Icono: Dumbbell },
  { nombre: 'Seguridad', Icono: Shield },
  { nombre: 'Noticias', Icono: Newspaper },
  { nombre: 'Otros', Icono: Package },
];

type Frecuencia = 'mensual' | 'anual' | 'semanal';

type Suscripcion = {
  id: string;
  nombre: string;
  precio: number; // en COP
  frecuencia: Frecuencia;
  proximaFecha: string; // ISO yyyy-mm-dd
  colorFondo: string; // color hex de fondo del avatar (si no hay icono)
  colorTexto: string; // color hex de la inicial (si no hay icono)
  inicial: string;
  icono?: string; // ruta a un PNG en /public, ej: '/iconos/netflix.png'
  addOn?: string; // ej: 'Premium', 'Pro'
  categoria?: string;
};

const SEED: Suscripcion[] = [
  {
    id: 'netflix',
    nombre: 'Netflix',
    precio: 29900,
    frecuencia: 'mensual',
    proximaFecha: new Date().toISOString().slice(0, 10),
    colorFondo: '#000000',
    colorTexto: '#E50914',
    inicial: 'N',
    icono: '/iconos/netflix.png',
  },
];

const STORAGE_KEY = 'mis-suscripciones-v1';

function formatCOP(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })
    .format(valor)
    .replace('COP', '$')
    .trim();
}

function diasHasta(fechaISO: string) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(fechaISO + 'T00:00:00');
  const diff = Math.round((fecha.getTime() - hoy.getTime()) / 86400000);
  return diff;
}

// Avanza una fecha un período según la frecuencia (1 semana, 1 mes o 1 año),
// respetando fin de mes (ej. 31 ene + 1 mes -> 28/29 feb, no 3 mar).
function sumarPeriodo(fecha: Date, frecuencia: Frecuencia): Date {
  const resultado = new Date(fecha);
  if (frecuencia === 'semanal') {
    resultado.setDate(resultado.getDate() + 7);
    return resultado;
  }
  const meses = frecuencia === 'anual' ? 12 : 1;
  const diaOriginal = resultado.getDate();
  resultado.setMonth(resultado.getMonth() + meses);
  if (resultado.getDate() !== diaOriginal) {
    resultado.setDate(0); // el mes no tenía ese día, cae al último día del mes anterior
  }
  return resultado;
}

// La fecha guardada puede haber quedado en el pasado (ej. "8 de julio" y ya
// estamos a 20). Como las suscripciones se repiten, esto no significa que
// "venció": avanzamos período por período hasta encontrar el próximo cobro
// real, sea este o el mes/semana/año que sigue.
function fechaEfectiva(s: Suscripcion): string {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  let fecha = new Date(s.proximaFecha + 'T00:00:00');
  let tope = 0;
  while (fecha < hoy && tope < 600) {
    fecha = sumarPeriodo(fecha, s.frecuencia);
    tope++;
  }
  return fecha.toISOString().slice(0, 10);
}

// true si la fecha cae en un mes (o año) distinto al actual, para mostrar
// el pequeño badge con el nombre del mes (ej. "Ago").
function esDeOtroMes(fechaISO: string) {
  const hoy = new Date();
  const fecha = new Date(fechaISO + 'T00:00:00');
  return fecha.getMonth() !== hoy.getMonth() || fecha.getFullYear() !== hoy.getFullYear();
}

function etiquetaMes(fechaISO: string) {
  const fecha = new Date(fechaISO + 'T00:00:00');
  const mes = fecha.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '');
  return mes.charAt(0).toUpperCase() + mes.slice(1);
}

function etiquetaFecha(fechaISO: string) {
  const dias = diasHasta(fechaISO);
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  if (dias < 0) return 'Venció';
  if (dias <= 30) return `${dias} días`;
  const fecha = new Date(fechaISO + 'T00:00:00');
  return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

// Qué tan llena está la barra: cuantos más días falten, más llena;
// se va vaciando a medida que se acerca la fecha de pago.
function progresoRestante(dias: number) {
  const diasCap = Math.min(Math.max(dias, 0), 30);
  return Math.max(6, (diasCap / 30) * 100);
}

// Colores según urgencia: gris si faltan 4+ días, naranja si faltan 2-3,
// amarillo mostaza si es mañana, rojo/rosado si es hoy (o ya venció).
function coloresUrgencia(dias: number) {
  if (dias <= 0) {
    return { texto: 'text-red-400', barra: 'bg-red-500' };
  }
  if (dias === 1) {
    return { texto: 'text-amber-400', barra: 'bg-amber-500' };
  }
  if (dias <= 3) {
    return { texto: 'text-orange-400', barra: 'bg-orange-500' };
  }
  return { texto: 'text-white/60', barra: 'bg-white/40' };
}

function frecuenciaAMeses(f: Frecuencia) {
  if (f === 'mensual') return 1;
  if (f === 'anual') return 12;
  return 1 / 4.345; // semanal -> fracción de mes
}

// Calcula el diámetro (en px) de la burbuja según el precio, relativo al
// rango de precios de las suscripciones activas (la más cara = MAX_PX,
// la más barata = MIN_PX). Si todas cuestan igual, usa un tamaño medio.
const MIN_PX_BURBUJA = 34;
const MAX_PX_BURBUJA = 72;

// Alto del área de burbujas: SIEMPRE es este valor fijo, sin importar
// cuántas suscripciones haya o qué tan ancha esté la tarjeta. Lo que
// cambia es el ancho (ver `anchoBurbujas` en el componente), que se mide
// en tiempo real para aprovechar todo el espacio horizontal disponible.
const ALTO_CONTENEDOR_BURBUJAS_PX = 180;

// Qué tan "llena" (proporción del área elíptica del contenedor) puede
// verse la zona de burbujas antes de agrupar el resto en un "+X". Subir
// este valor deja que se vean más apretadas antes de agrupar; bajarlo
// agrupa antes. 0.62 da un balance entre "se ve lleno" y que no se
// encimen demasiado.
const FACTOR_LLENADO_MAX = 0.62;

function diametroBurbuja(precio: number, min: number, max: number) {
  if (max === min) return (MIN_PX_BURBUJA + MAX_PX_BURBUJA) / 2;
  const t = (precio - min) / (max - min);
  return Math.round(MIN_PX_BURBUJA + t * (MAX_PX_BURBUJA - MIN_PX_BURBUJA));
}

type PosicionBurbuja = { x: number; y: number; r: number };

// Acomoda círculos de radios variados dentro de un contenedor circular,
// tipo el grid de apps de watchOS: empieza en espiral áurea desde el
// centro y luego "empuja" los que se traslapan hasta que quedan
// acomodados tocándose entre sí, sin salirse del contenedor.
function empacarBurbujas(
  radios: number[],
  radioContenedorX: number,
  radioContenedorY: number
): PosicionBurbuja[] {
  const n = radios.length;
  const posiciones: PosicionBurbuja[] = radios.map((r, i) => {
    const angulo = i * 137.5 * (Math.PI / 180); // ángulo áureo
    const distancia = 7 * Math.sqrt(i);
    return {
      x: distancia * Math.cos(angulo),
      y: distancia * Math.sin(angulo),
      r,
    };
  });

  const SEPARACION = 3; // px de "aire" entre burbujas, como en watchOS

  for (let iter = 0; iter < 300; iter++) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = posiciones[i];
        const b = posiciones[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const minDist = a.r + b.r + SEPARACION;
        if (dist < minDist) {
          const empuje = (minDist - dist) / 2;
          const ux = dx / dist;
          const uy = dy / dist;
          a.x -= ux * empuje;
          a.y -= uy * empuje;
          b.x += ux * empuje;
          b.y += uy * empuje;
        }
      }
      // Mantiene la burbuja dentro de un contenedor elíptico (ancho
      // distinto al alto): normaliza su posición por el radio libre en
      // cada eje (radioContenedor - r) y, si esa distancia normalizada
      // se pasa de 1, la trae de vuelta al borde de la elipse.
      const p = posiciones[i];
      const limiteX = radioContenedorX - p.r;
      const limiteY = radioContenedorY - p.r;
      if (limiteX > 0 && limiteY > 0) {
        const nx = p.x / limiteX;
        const ny = p.y / limiteY;
        const distNorm = Math.sqrt(nx * nx + ny * ny);
        if (distNorm > 1) {
          p.x = p.x / distNorm;
          p.y = p.y / distNorm;
        }
      }
    }
  }

  return posiciones;
}

// Hash simple y determinista (mismo id siempre da el mismo resultado), para
// que cada burbuja tenga su propio "estilo" de flote sin necesitar estado
// ni Math.random() en cada render (eso haría que el movimiento saltara
// cada vez que la app se vuelve a renderizar).
function hashTexto(texto: string) {
  let h = 0;
  for (let i = 0; i < texto.length; i++) {
    h = (h << 5) - h + texto.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// Parámetros del flote "sin gravedad": amplitud pequeña (4-9px), duración
// larga (8-13s) y un desfase de inicio distinto por burbuja, para que
// ninguna se mueva en sincronía con las demás.
function parametrosFlote(id: string) {
  const h = hashTexto(id);
  return {
    fx: 4 + (h % 6), // 4-9px en X
    fy: 4 + ((h >> 4) % 6), // 4-9px en Y
    duracion: 8 + ((h >> 8) % 6), // 8-13s
    retraso: -((h >> 12) % 100) / 10, // negativo: arranca "a mitad de camino"
  };
}

const COLORES_LOGO = [
  { bg: '#DC2626', text: '#FFFFFF' },
  { bg: '#059669', text: '#FFFFFF' },
  { bg: '#4F46E5', text: '#FFFFFF' },
  { bg: '#F59E0B', text: '#000000' },
  { bg: '#DB2777', text: '#FFFFFF' },
  { bg: '#0284C7', text: '#FFFFFF' },
];

// Cuadrito de logo con fallback automático: si `src` no existe o falla al
// cargar (ej. todavía no pusiste ese PNG en /public/iconos), muestra el
// cuadrito de color + inicial en su lugar, en vez de un ícono roto.
function AvatarImagen({
  src,
  bg,
  texto,
  inicial,
  alt,
  size = 'w-14 h-14',
  textSize = 'text-xl',
  redondeo = 'rounded-2xl',
  className = '',
  sizePx,
}: {
  src?: string;
  bg: string;
  texto: string;
  inicial: string;
  alt: string;
  size?: string;
  textSize?: string;
  redondeo?: string;
  className?: string;
  sizePx?: number;
}) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  const estiloTamano = sizePx ? { width: sizePx, height: sizePx } : undefined;

  if (src && !error) {
    return (
      <div
        className={`${size} ${redondeo} overflow-hidden flex items-center justify-center shrink-0 ${className}`}
        style={{ backgroundColor: bg, ...estiloTamano }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`${size} ${redondeo} flex items-center justify-center ${textSize} font-bold shrink-0 ${className}`}
      style={{ backgroundColor: bg, color: texto, ...estiloTamano }}
    >
      {inicial}
    </div>
  );
}

function LogoAvatar({
  s,
  size = 'w-14 h-14',
  textSize = 'text-xl',
  redondeo = 'rounded-2xl',
  sizePx,
}: {
  s: Suscripcion;
  size?: string;
  textSize?: string;
  redondeo?: string;
  sizePx?: number;
}) {
  return (
    <AvatarImagen
      src={s.icono}
      bg={s.colorFondo}
      texto={s.colorTexto}
      inicial={s.inicial}
      alt={`Logo de ${s.nombre}`}
      size={size}
      textSize={textSize}
      redondeo={redondeo}
      sizePx={sizePx}
    />
  );
}

const ANCHO_BOTON_EDITAR = 68;

// Fila reutilizable del selector de marcas (se usa en "Populares", "Todas
// las marcas" y en los "Resultados" de búsqueda).
function FilaMarca({ marca, onClick }: { marca: Marca; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-2 py-2 rounded-2xl active:bg-white/5 transition text-left"
    >
      <AvatarImagen
        src={marca.icono}
        bg={marca.bg}
        texto={marca.texto}
        inicial={marca.nombre.charAt(0)}
        alt={`Logo de ${marca.nombre}`}
      />
      <span className="flex-1 text-base">{marca.nombre}</span>
      <ChevronRight size={18} className="text-white/30 shrink-0" />
    </button>
  );
}

// Fila de la lista "Todas las suscripciones": desliza a la izquierda para
// revelar el botón azul de editar (en vez de un ícono de eliminar siempre
// visible que se podía tocar por accidente).
function FilaSuscripcion({
  s,
  freq,
  onEditar,
}: {
  s: Suscripcion;
  freq: Frecuencia;
  onEditar: (s: Suscripcion) => void;
}) {
  const [offset, setOffset] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const inicioRef = useRef<{ x: number; offsetInicio: number } | null>(null);

  const fechaPago = fechaEfectiva(s);
  const dias = diasHasta(fechaPago);
  const progreso = progresoRestante(dias);
  const colores = coloresUrgencia(dias);

  function onPointerDown(e: PointerEvent) {
    inicioRef.current = { x: e.clientX, offsetInicio: offset };
    setArrastrando(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!inicioRef.current) return;
    const delta = e.clientX - inicioRef.current.x;
    const nuevo = Math.min(0, Math.max(-ANCHO_BOTON_EDITAR, inicioRef.current.offsetInicio + delta));
    setOffset(nuevo);
  }

  function onPointerUp() {
    if (!inicioRef.current) return;
    inicioRef.current = null;
    setArrastrando(false);
    setOffset((actual) => (actual < -ANCHO_BOTON_EDITAR / 2 ? -ANCHO_BOTON_EDITAR : 0));
  }

  const progresoSwipe = Math.min(1, Math.abs(offset) / ANCHO_BOTON_EDITAR);

  return (
    <div className="relative">
      {offset < 0 && (
        <div className="absolute inset-y-0 right-0 flex items-center">
          <button
            onClick={() => {
              setOffset(0);
              onEditar(s);
            }}
            style={{
              transform: `scale(${progresoSwipe})`,
              opacity: progresoSwipe,
              transition: arrastrando ? 'none' : 'transform 0.2s ease-out, opacity 0.2s ease-out',
            }}
            className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0"
            aria-label={`Editar ${s.nombre}`}
          >
            <Pencil size={18} />
          </button>
        </div>
      )}
      <div
        className="flex items-center gap-4"
        style={{
          transform: `translateX(${offset}px)`,
          transition: arrastrando ? 'none' : 'transform 0.2s ease-out',
          touchAction: 'pan-y',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <LogoAvatar s={s} />
        <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-semibold truncate">{s.nombre}</p>
            <p className="text-white/50 text-base">
              {formatCOP(s.precio)} / {freq === 'mensual' ? 'm' : freq === 'anual' ? 'a' : 's'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0 w-32">
            <span className={`text-lg font-bold tracking-tight whitespace-nowrap ${colores.texto}`}>{etiquetaFecha(fechaPago)}</span>
            <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
              <div className={`h-full rounded-full ${colores.barra}`} style={{ width: `${progreso}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [subs, setSubs] = useState<Suscripcion[]>(SEED);

  // Mide en tiempo real el ancho disponible para las burbujas de "Vista
  // rápida", así el contenedor se llena a lo ancho de la tarjeta sin
  // importar el tamaño de pantalla. El alto NUNCA se toca: siempre es
  // ALTO_CONTENEDOR_BURBUJAS_PX.
  const burbujasContenedorRef = useRef<HTMLDivElement>(null);
  const [anchoBurbujas, setAnchoBurbujas] = useState(320);

  useEffect(() => {
    const el = burbujasContenedorRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setAnchoBurbujas(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const [modalAbierto, setModalAbierto] = useState(false);

  // Mide en tiempo real la altura del header pegajoso del modal de
  // "Añadir suscripción" (título + buscador), para que los encabezados
  // de "Populares" y de cada letra (A, B, C...) se peguen justo debajo,
  // nunca se monten sobre él.
  const headerModalRef = useRef<HTMLDivElement>(null);
  const [alturaHeaderModal, setAlturaHeaderModal] = useState(148);

  useEffect(() => {
    const el = headerModalRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      // Redondea hacia arriba y resta 1px a propósito: así el encabezado
      // sticky de "Populares"/letra queda 1px superpuesto con el header
      // fijo de arriba (mismo color de fondo, invisible al ojo) en vez
      // de dejar una línea de por medio por redondeos de subpíxel.
      if (h) setAlturaHeaderModal(Math.ceil(h) - 1);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const [cargado, setCargado] = useState(false);

  const [editando, setEditando] = useState<Suscripcion | null>(null);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [frecuencia, setFrecuencia] = useState<Frecuencia>('mensual');
  const [proximaFecha, setProximaFecha] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [pasoModal, setPasoModal] = useState<'elegir' | 'detalles'>('elegir');
  const [cicloAbierto, setCicloAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [addOn, setAddOn] = useState('');
  const [orden, setOrden] = useState<'proximos' | 'az' | 'barato' | 'caro'>('proximos');
  const [ordenAbierto, setOrdenAbierto] = useState(false);
  const [categoriaSel, setCategoriaSel] = useState(CATEGORIAS[0].nombre);
  const [colorSel, setColorSel] = useState<{ bg: string; texto: string; icono?: string }>({
    bg: '#DC2626',
    texto: '#FFFFFF',
  });

  const resultadosBusqueda = useMemo(() => {
    const q = normalizarTexto(busqueda);
    if (!q) return [];
    // Con texto en el buscador, se busca en TODO el catálogo.
    return POPULARES.filter((p) => normalizarTexto(p.nombre).includes(q));
  }, [busqueda]);

  const hayCoincidenciaExacta = resultadosBusqueda.some(
    (p) => normalizarTexto(p.nombre) === normalizarTexto(busqueda)
  );

  function elegirMarca(p: { nombre: string; bg: string; texto: string; icono?: string }) {
    setNombre(p.nombre);
    setColorSel({ bg: p.bg, texto: p.texto, icono: p.icono });
    setPasoModal('detalles');
  }

  function usarPersonalizado() {
    const valor = busqueda.trim();
    if (!valor) return;
    const color = COLORES_LOGO[subs.length % COLORES_LOGO.length];
    setNombre(valor);
    setColorSel({ bg: color.bg, texto: color.text, icono: undefined });
    setPasoModal('detalles');
  }

  function ciclarCategoria() {
    const i = CATEGORIAS.findIndex((c) => c.nombre === categoriaSel);
    setCategoriaSel(CATEGORIAS[(i + 1) % CATEGORIAS.length].nombre);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setPasoModal('elegir');
    setBusqueda('');
    setNombre('');
    setPrecio('');
    setFrecuencia('mensual');
    setProximaFecha(new Date().toISOString().slice(0, 10));
    setColorSel({ bg: '#DC2626', texto: '#FFFFFF', icono: undefined });
    setAddOn('');
    setCategoriaSel(CATEGORIAS[0].nombre);
    setCicloAbierto(false);
    setEditando(null);
  }

  function abrirEdicion(s: Suscripcion) {
    setEditando(s);
    setNombre(s.nombre);
    setPrecio(String(s.precio));
    setFrecuencia(s.frecuencia);
    setProximaFecha(s.proximaFecha);
    setAddOn(s.addOn ?? '');
    setCategoriaSel(s.categoria ?? CATEGORIAS[0].nombre);
    setColorSel({ bg: s.colorFondo, texto: s.colorTexto, icono: s.icono });
    setPasoModal('detalles');
    setModalAbierto(true);
  }

  useEffect(() => {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado) {
      try {
        setSubs(JSON.parse(guardado));
      } catch {}
    }
    setCargado(true);
  }, []);

  useEffect(() => {
    if (cargado) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
    }
  }, [subs, cargado]);

  const totalMensualEquivalente = useMemo(() => {
    return subs.reduce(
      (acc, s) => acc + s.precio / frecuenciaAMeses(s.frecuencia),
      0
    );
  }, [subs]);

  // Total anual proyectado: lo que gastarías en un año si mantienes
  // exactamente las suscripciones de hoy (promedio mensual x 12).
  const totalAnualProyectado = useMemo(() => {
    return totalMensualEquivalente * 12;
  }, [totalMensualEquivalente]);

  const proximas = useMemo(() => {
    return [...subs]
      .filter((s) => diasHasta(fechaEfectiva(s)) >= 0)
      .sort((a, b) => diasHasta(fechaEfectiva(a)) - diasHasta(fechaEfectiva(b)));
  }, [subs]);

  const porFrecuencia = useMemo(() => {
    const grupos: Record<Frecuencia, Suscripcion[]> = {
      mensual: [],
      anual: [],
      semanal: [],
    };
    for (const s of subs) grupos[s.frecuencia].push(s);

    const comparador = (a: Suscripcion, b: Suscripcion) => {
      if (orden === 'az') return a.nombre.localeCompare(b.nombre, 'es');
      if (orden === 'barato') return a.precio - b.precio;
      if (orden === 'caro') return b.precio - a.precio;
      return diasHasta(fechaEfectiva(a)) - diasHasta(fechaEfectiva(b));
    };

    for (const freq of Object.keys(grupos) as Frecuencia[]) {
      grupos[freq] = [...grupos[freq]].sort(comparador);
    }
    return grupos;
  }, [subs, orden]);

  const etiquetaOrden =
    orden === 'az' ? 'A-Z' : orden === 'barato' ? 'Barato' : orden === 'caro' ? 'Caro' : 'Próximos';

  function guardarSuscripcion() {
    if (!nombre.trim() || !precio) return;

    if (editando) {
      setSubs((prev) =>
        prev.map((s) =>
          s.id === editando.id
            ? {
                ...s,
                nombre: nombre.trim(),
                precio: Number(precio),
                frecuencia,
                proximaFecha,
                colorFondo: colorSel.bg,
                colorTexto: colorSel.texto,
                inicial: nombre.trim().charAt(0).toUpperCase(),
                icono: colorSel.icono,
                addOn: addOn.trim() || undefined,
                categoria: categoriaSel,
              }
            : s
        )
      );
    } else {
      const nueva: Suscripcion = {
        id: crypto.randomUUID(),
        nombre: nombre.trim(),
        precio: Number(precio),
        frecuencia,
        proximaFecha,
        colorFondo: colorSel.bg,
        colorTexto: colorSel.texto,
        inicial: nombre.trim().charAt(0).toUpperCase(),
        icono: colorSel.icono,
        addOn: addOn.trim() || undefined,
        categoria: categoriaSel,
      };
      setSubs((prev) => [...prev, nueva]);
    }
    cerrarModal();
  }

  function eliminarSuscripcion(id: string) {
    setSubs((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <main
      className="min-h-screen text-white overscroll-y-contain antialiased"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))',
      }}
    >
      {/* Barra de status bar difuminada, estilo nativo iOS: blur sólido y
          parejo, sin degradado ni tinte, para que se sienta continuo con
          el contenido que pasa por debajo al hacer scroll */}
      <div
        className="fixed left-0 right-0 top-0 z-10 pointer-events-none"
        style={{
          height: 'env(safe-area-inset-top)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        }}
      />

      <div className="max-w-md mx-auto px-5 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">
            Vista rápida
          </h1>
        </div>

        {/* Tarjeta destacada: burbujas empaquetadas tipo watchOS (tamaño
            relativo al precio), con tope de burbujas visibles y un
            círculo "+X" agrupando el resto */}
        <div className="rounded-3xl p-5 bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 flex flex-col justify-between relative min-h-[260px] mb-3">
          {subs.length > 0 && (() => {
            const precios = subs.map((s) => s.precio);
            const min = Math.min(...precios);
            const max = Math.max(...precios);
            const ordenadas = [...subs].sort((a, b) => b.precio - a.precio);

            // Contenedor elíptico: ancho = todo el espacio medido de la
            // tarjeta, alto = SIEMPRE fijo (nunca cambia).
            const radioContenedorX = Math.max(anchoBurbujas / 2 - 2, 40);
            const radioContenedorY = ALTO_CONTENEDOR_BURBUJAS_PX / 2;
            const radioBurbujaMas = MIN_PX_BURBUJA / 2 + 4;

            const radiosTotales = ordenadas.map(
              (s) => diametroBurbuja(s.precio, min, max) / 2
            );

            // En vez de un tope fijo de burbujas, se llena el ancho
            // disponible por ÁREA: mientras las burbujas quepan sin
            // superar FACTOR_LLENADO_MAX del área elíptica del
            // contenedor, se siguen mostrando. Solo cuando ya no caben
            // más (el contenedor está "realmente lleno a lo ancho")
            // aparece el "+X" agrupando el resto.
            const areaContenedor = Math.PI * radioContenedorX * radioContenedorY;
            const areaTotalReal = radiosTotales.reduce(
              (acc, r) => acc + Math.PI * r * r,
              0
            );

            let visiblesCount = radiosTotales.length;
            let restantes = 0;

            if (areaTotalReal > areaContenedor * FACTOR_LLENADO_MAX) {
              // No caben todas: reserva espacio para la burbuja "+X" y
              // ve agregando burbujas (de más cara a más barata) hasta
              // que agregar una más rompería el límite de llenado.
              const areaBurbujaMas = Math.PI * radioBurbujaMas * radioBurbujaMas;
              const presupuesto = areaContenedor * FACTOR_LLENADO_MAX - areaBurbujaMas;
              let acumulada = 0;
              visiblesCount = 0;
              for (let i = 0; i < radiosTotales.length; i++) {
                const areaBurbuja = Math.PI * radiosTotales[i] * radiosTotales[i];
                if (acumulada + areaBurbuja > presupuesto) break;
                acumulada += areaBurbuja;
                visiblesCount++;
              }
              // Nunca deja el bloque vacío: como mínimo se ve 1 burbuja.
              visiblesCount = Math.max(visiblesCount, 1);
              restantes = radiosTotales.length - visiblesCount;
            }

            const visibles = ordenadas.slice(0, visiblesCount);
            const radios = radiosTotales.slice(0, visiblesCount);
            if (restantes > 0) radios.push(radioBurbujaMas);

            const posiciones = empacarBurbujas(radios, radioContenedorX, radioContenedorY);

            return (
              <div
                ref={burbujasContenedorRef}
                className="flex-1 flex items-center justify-center"
              >
                <div
                  className="relative w-full"
                  style={{
                    height: ALTO_CONTENEDOR_BURBUJAS_PX,
                  }}
                >
                  {visibles.map((s, i) => {
                    const pos = posiciones[i];
                    const r = radios[i];
                    const flote = parametrosFlote(s.id);
                    return (
                      <div
                        key={s.id}
                        className="absolute drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)] burbuja-flotante"
                        style={{
                          width: r * 2,
                          height: r * 2,
                          left: `calc(50% + ${pos.x}px - ${r}px)`,
                          top: `calc(50% + ${pos.y}px - ${r}px)`,
                          animationDuration: `${flote.duracion}s`,
                          animationDelay: `${flote.retraso}s`,
                          ...({
                            '--fx': `${flote.fx}px`,
                            '--fy': `${flote.fy}px`,
                          } as React.CSSProperties),
                        }}
                      >
                        <LogoAvatar s={s} redondeo="rounded-full" sizePx={r * 2} />
                      </div>
                    );
                  })}

                  {restantes > 0 && (() => {
                    const pos = posiciones[visibles.length];
                    const r = radios[visibles.length];
                    const flote = parametrosFlote('mas-burbujas');
                    return (
                      <div
                        className="absolute rounded-full bg-white/10 border border-white/15 backdrop-blur-sm flex items-center justify-center text-white/70 font-semibold shrink-0 burbuja-flotante"
                        style={{
                          width: r * 2,
                          height: r * 2,
                          left: `calc(50% + ${pos.x}px - ${r}px)`,
                          top: `calc(50% + ${pos.y}px - ${r}px)`,
                          fontSize: r * 2 <= 36 ? 11 : 13,
                          animationDuration: `${flote.duracion}s`,
                          animationDelay: `${flote.retraso}s`,
                          ...({
                            '--fx': `${flote.fx}px`,
                            '--fy': `${flote.fy}px`,
                          } as React.CSSProperties),
                        }}
                      >
                        +{restantes}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold tracking-tight tabular-nums leading-none">
              {subs.length}
            </span>
            <p className="text-lg text-white/70">
              {subs.length === 1 ? 'Suscripción' : 'Suscripciones'}
            </p>
          </div>
        </div>

        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-3xl p-4 bg-gradient-to-br from-indigo-500/40 via-purple-600/30 to-purple-900/40 border border-white/10">
            <p className="text-3xl font-bold leading-none mb-3 tracking-tight tabular-nums">
              {formatCOP(totalMensualEquivalente)}
            </p>
            <p className="text-sm text-white/60 flex items-center gap-1.5">
              <TrendingUp size={16} /> Promedio mensual
            </p>
          </div>
          <div className="rounded-3xl p-4 bg-gradient-to-br from-slate-700/60 to-slate-800/60 border border-white/10">
            <p className="text-3xl font-bold leading-none mb-3 tracking-tight tabular-nums">
              {formatCOP(totalAnualProyectado)}
            </p>
            <p className="text-sm text-white/60 flex items-center gap-1.5">
              <CalendarRange size={16} /> Total anual
            </p>
          </div>
        </div>

        {/* Próximas */}
        {proximas.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white/90 mb-3 tracking-tight">
              Próximos pagos
            </h2>
            <div
              className="no-scrollbar flex gap-3 overflow-x-auto snap-x snap-mandatory pt-3 pr-3 -mt-3"
              style={{ scrollbarWidth: 'none' }}
            >
              {proximas.map((s) => {
                const fechaPago = fechaEfectiva(s);
                const dias = diasHasta(fechaPago);
                const progreso = progresoRestante(dias);
                const colores = coloresUrgencia(dias);
                const otroMes = esDeOtroMes(fechaPago);
                return (
                  <div
                    key={s.id}
                    className="relative snap-start shrink-0 min-w-[190px] w-max"
                  >
                    <div
                      className={`rounded-3xl p-5 border overflow-hidden relative ${
                        dias <= 0 ? 'border-red-500/20' : 'border-white/10'
                      }`}
                      style={{
                        background: `radial-gradient(circle at 48px 48px, ${s.colorFondo}80, ${s.colorFondo}30 58%, transparent 96%)`,
                      }}
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <LogoAvatar s={s} />
                        <div>
                          <p className="text-lg font-semibold whitespace-nowrap">{s.nombre}</p>
                          <p className="text-lg font-semibold whitespace-nowrap text-white/70">
                            {formatCOP(s.precio)} /{' '}
                            {s.frecuencia === 'mensual' ? 'm' : s.frecuencia === 'anual' ? 'a' : 's'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-medium shrink-0 ${colores.texto}`}>
                          {etiquetaFecha(fechaPago)}
                        </span>
                        <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${colores.barra}`}
                            style={{ width: `${progreso}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Burbuja tipo notificación con el mes: flota fuera de
                        la tarjeta (esquina superior derecha) en vez de vivir
                        dentro del flujo de texto, para que nunca se
                        sobreponga al nombre o al precio. */}
                    {otroMes && (
                      <div className="absolute -top-2.5 -right-2.5 z-10">
                        <span className="relative inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-white text-black text-xs font-bold shadow-[0_2px_8px_rgba(0,0,0,0.4)] whitespace-nowrap">
                          {etiquetaMes(fechaPago)}
                        </span>
                        <span className="absolute -bottom-1 right-4 w-2.5 h-2.5 bg-white rotate-45" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Todas las suscripciones */}
        <div className="flex items-center justify-between mb-4 relative">
          <h2 className="text-2xl font-semibold tracking-tight">Todas las suscripciones</h2>
          <button
            onClick={() => setOrdenAbierto((v) => !v)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white/70"
          >
            {etiquetaOrden} <ArrowUpDown size={14} />
          </button>

          {ordenAbierto && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOrdenAbierto(false)} />
              <div className="absolute right-0 top-[calc(100%+4px)] z-20 bg-[#1c1c1f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl min-w-[150px]">
                {(
                  [
                    { valor: 'proximos', etiqueta: 'Próximos' },
                    { valor: 'az', etiqueta: 'A-Z' },
                    { valor: 'barato', etiqueta: 'Barato' },
                    { valor: 'caro', etiqueta: 'Caro' },
                  ] as { valor: 'proximos' | 'az' | 'barato' | 'caro'; etiqueta: string }[]
                ).map((o) => (
                  <button
                    key={o.valor}
                    onClick={() => {
                      setOrden(o.valor);
                      setOrdenAbierto(false);
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-sm text-left active:bg-white/10 transition ${
                      orden === o.valor ? 'text-white' : 'text-white/60'
                    }`}
                  >
                    {o.etiqueta}
                    {orden === o.valor && <Check size={14} className="text-white/70 shrink-0" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {(['mensual', 'anual', 'semanal'] as Frecuencia[]).map((freq) =>
          porFrecuencia[freq].length > 0 ? (
            <div key={freq} className="mb-6">
              <p className="text-white/40 text-sm mb-3 capitalize">
                {freq === 'mensual' ? 'Mensual' : freq === 'anual' ? 'Anual' : 'Semanal'}
              </p>
              <div className="flex flex-col gap-4">
                {porFrecuencia[freq].map((s) => (
                  <FilaSuscripcion key={s.id} s={s} freq={freq} onEditar={abrirEdicion} />
                ))}
              </div>
            </div>
          ) : null
        )}

        {subs.length === 0 && (
          <div className="text-center py-16 text-white/40">
            <p>Aún no tienes suscripciones.</p>
            <p className="text-sm mt-1">Toca &quot;Añadir nueva&quot; para empezar.</p>
          </div>
        )}
      </div>

      {/* Difuminado estilo "glass" detrás del botón flotante: blur fuerte +
          saturación, con un desvanecido muy corto (casi de golpe) en el borde
          superior en vez de un degradado largo */}
      <div
        className="fixed left-0 right-0 bottom-0 z-10 pointer-events-none"
        style={{
          height: 'calc(110px + env(safe-area-inset-bottom))',
          backdropFilter: 'blur(2.3px) saturate(90%)',
          WebkitBackdropFilter: 'blur(2.3px) saturate(90%)',
          maskImage: 'linear-gradient(to top, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 85%, transparent 100%)',
        }}
      />

      {/* Botón flotante */}
      <div
        className="fixed left-0 right-0 flex justify-center px-5 z-20"
        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={() => setModalAbierto(true)}
          className="relative bg-white text-black font-semibold text-lg px-8 py-4 rounded-full flex items-center gap-2 shadow-[0_20px_40px_-8px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,1),inset_0_-2px_4px_rgba(0,0,0,0.06)] transition-all duration-200 ease-out active:scale-[0.96] active:brightness-95"
        >
          <Plus size={22} />
          Añadir nueva
        </button>
      </div>

      {/* Modal para agregar */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-5">
          <div className="animate-in w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-white/10 overflow-hidden">
            <div
              className="bg-[#141416] max-h-[90vh] overflow-y-auto"
              style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
            >
            {pasoModal === 'elegir' ? (
              <>
                <div ref={headerModalRef} className="sticky top-0 z-10 px-6 pt-6 pb-4 bg-[#141416]">
                  <div className="flex items-center justify-between mb-5">
                    <button
                      onClick={cerrarModal}
                      className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white/90 shrink-0 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_2px_rgba(0,0,0,0.2)] transition-transform duration-150 active:scale-90"
                      aria-label="Cerrar"
                    >
                      <X size={20} strokeWidth={2.25} />
                    </button>
                    <h3 className="text-xl font-semibold flex-1 text-center tracking-tight">
                      {editando ? 'Cambiar marca' : 'Añadir suscripción'}
                    </h3>
                    <div className="w-11 shrink-0" />
                  </div>

                  <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                    <Search size={18} className="text-white/40 shrink-0" />
                    <input
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Buscar una marca"
                      autoCapitalize="none"
                      autoCorrect="off"
                      className="flex-1 bg-transparent outline-none text-white text-base placeholder:text-white/30"
                    />
                  </div>
                </div>

                <div className="px-6 pb-6">
                {busqueda.trim() ? (
                  <>
                    <p className="text-white/40 text-sm font-medium mb-3">Resultados</p>
                    <div className="flex flex-col gap-1 -mx-2">
                      {resultadosBusqueda.map((p, i) => (
                        <FilaMarca key={`res-${p.nombre}-${i}`} marca={p} onClick={() => elegirMarca(p)} />
                      ))}

                      {!hayCoincidenciaExacta && (
                        <button
                          onClick={usarPersonalizado}
                          className="flex items-center gap-3 px-2 py-2 rounded-2xl active:bg-white/5 transition text-left"
                        >
                          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-xl font-bold shrink-0">
                            {busqueda.trim().charAt(0).toUpperCase()}
                          </div>
                          <span className="flex-1 text-base">
                            Agregar &quot;{busqueda.trim()}&quot;
                          </span>
                          <ChevronRight size={18} className="text-white/30 shrink-0" />
                        </button>
                      )}

                      {resultadosBusqueda.length === 0 && (
                        <p className="text-white/30 text-sm px-2 py-4">
                          No se encontraron marcas con ese nombre.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p
                      className="text-white/40 text-sm font-medium py-1.5 sticky bg-[#141416] z-[5]"
                      style={{ top: alturaHeaderModal }}
                    >
                      Populares
                    </p>
                    <div className="flex flex-col gap-1 -mx-2 mb-6">
                      {MARCAS_POPULARES.map((p, i) => (
                        <FilaMarca key={`pop-${p.nombre}-${i}`} marca={p} onClick={() => elegirMarca(p)} />
                      ))}
                    </div>

                    {MARCAS_POR_LETRA.map(({ letra, marcas }) => (
                      <div key={letra}>
                        <p
                          className="text-white/40 text-sm font-medium py-1.5 sticky bg-[#141416] z-[5]"
                          style={{ top: alturaHeaderModal }}
                        >
                          {letra}
                        </p>
                        <div className="flex flex-col gap-1 -mx-2 mb-4">
                          {marcas.map((p, i) => (
                            <FilaMarca key={`todas-${letra}-${p.nombre}-${i}`} marca={p} onClick={() => elegirMarca(p)} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}
                </div>
              </>
            ) : (
              <>
                <div
                  className="px-6 pt-6 pb-8 relative overflow-hidden"
                  style={{
                    background: `radial-gradient(ellipse closest-side at 50% 58%, ${colorSel.bg}cc, ${colorSel.bg}55 55%, transparent 100%)`,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => setPasoModal('elegir')}
                      className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/80 shrink-0"
                      aria-label="Volver"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <h3 className="text-lg font-semibold flex-1 text-center tracking-tight">
                      {editando ? 'Editar detalles' : 'Añadir detalles'}
                    </h3>
                    <button
                      onClick={guardarSuscripcion}
                      disabled={!nombre.trim() || !precio}
                      className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white shrink-0 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      aria-label="Guardar"
                    >
                      <Check size={18} />
                    </button>
                  </div>

                  <div className="flex justify-center mt-4">
                    <div className="relative">
                      <AvatarImagen
                        src={colorSel.icono}
                        bg={colorSel.bg}
                        texto={colorSel.texto}
                        inicial={(nombre.trim().charAt(0) || '?').toUpperCase()}
                        alt={`Logo de ${nombre}`}
                        size="w-28 h-28"
                        textSize="text-5xl"
                        redondeo="rounded-[28px]"
                        className="shadow-xl"
                      />
                      <button
                        onClick={() => setPasoModal('elegir')}
                        className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-black/80 border border-white/20 flex items-center justify-center"
                        aria-label="Cambiar marca"
                      >
                        <Pencil size={14} className="text-white" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 mt-5 px-6 pb-6">
                  {/* Nombre + Add-on */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between py-3.5 px-4 border-b border-white/10">
                      <span className="text-white/60 text-base shrink-0">Nombre</span>
                      <input
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Nombre del servicio"
                        className="flex-1 ml-4 bg-transparent text-right outline-none text-white text-base placeholder:text-white/30"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3.5 px-4">
                      <span className="text-white/60 text-base shrink-0">Add-on</span>
                      <input
                        value={addOn}
                        onChange={(e) => setAddOn(e.target.value)}
                        placeholder="ej. Premium, Pro"
                        className="flex-1 ml-4 bg-transparent text-right outline-none text-white text-base placeholder:text-white/30"
                      />
                    </div>
                  </div>

                  {/* Costo, moneda, ciclo, fecha */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl">
                    <div className="flex items-center justify-between py-3.5 px-4 border-b border-white/10">
                      <span className="text-white/60 text-base shrink-0">Costo</span>
                      <input
                        value={precio}
                        onChange={(e) => setPrecio(e.target.value.replace(/\D/g, ''))}
                        inputMode="numeric"
                        placeholder="0"
                        className="w-28 bg-transparent text-right outline-none text-white text-base placeholder:text-white/30"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3.5 px-4 border-b border-white/10">
                      <span className="text-white/60 text-base shrink-0">Moneda</span>
                      <span className="text-white/50 text-base flex items-center gap-1.5">
                        <svg
                          width="18"
                          height="13"
                          viewBox="0 0 18 13"
                          className="shrink-0"
                          aria-hidden="true"
                        >
                          <defs>
                            <clipPath id="bandera-co-clip">
                              <rect width="18" height="13" rx="2" />
                            </clipPath>
                          </defs>
                          <g clipPath="url(#bandera-co-clip)">
                            <rect width="18" height="13" fill="#CE1126" />
                            <rect width="18" height="9.75" fill="#003893" />
                            <rect width="18" height="6.5" fill="#FCD116" />
                          </g>
                        </svg>
                        COP · $
                      </span>
                    </div>
                    <div className="relative border-b border-white/10">
                      <button
                        onClick={() => setCicloAbierto((v) => !v)}
                        className="w-full flex items-center justify-between py-3.5 px-4"
                      >
                        <span className="text-white/60 text-base shrink-0">Ciclo de pago</span>
                        <span className="flex items-center gap-1.5 text-white text-base capitalize">
                          {frecuencia}
                          <ChevronsUpDown size={14} className="text-white/40" />
                        </span>
                      </button>

                      {cicloAbierto && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setCicloAbierto(false)}
                          />
                          <div className="absolute right-4 top-[calc(100%+4px)] z-20 bg-[#1c1c1f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl min-w-[150px]">
                            {(['semanal', 'mensual', 'anual'] as Frecuencia[]).map((f) => (
                              <button
                                key={f}
                                onClick={() => {
                                  setFrecuencia(f);
                                  setCicloAbierto(false);
                                }}
                                className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-base capitalize text-left active:bg-white/10 transition ${
                                  frecuencia === f ? 'text-white' : 'text-white/60'
                                }`}
                              >
                                {f}
                                {frecuencia === f && (
                                  <Check size={14} className="text-white/70 shrink-0" />
                                )}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center justify-between py-3.5 px-4">
                      <span className="text-white/60 text-base shrink-0">Primer cobro</span>
                      <input
                        type="date"
                        value={proximaFecha}
                        onChange={(e) => setProximaFecha(e.target.value)}
                        className="bg-white/10 rounded-full px-3 py-1.5 outline-none text-white text-sm [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  {/* Categoría */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-2">
                    <button
                      onClick={ciclarCategoria}
                      className="w-full flex items-center justify-between py-3.5 px-4"
                    >
                      <span className="text-white/60 text-base shrink-0">Categoría</span>
                      <span className="flex items-center gap-1.5 text-white text-base">
                        {(() => {
                          const IconoCategoria =
                            CATEGORIAS.find((c) => c.nombre === categoriaSel)?.Icono ?? Package;
                          return <IconoCategoria size={16} className="text-white/60" />;
                        })()}
                        {categoriaSel}
                        <ChevronsUpDown size={14} className="text-white/40" />
                      </span>
                    </button>
                  </div>

                  {editando && (
                    <button
                      onClick={() => {
                        eliminarSuscripcion(editando.id);
                        cerrarModal();
                      }}
                      className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-500/10 text-red-400 text-base font-medium active:bg-red-500/20 transition"
                    >
                      <Trash2 size={16} />
                      Eliminar suscripción
                    </button>
                  )}
                </div>
              </>
            )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </main>
  );
}
