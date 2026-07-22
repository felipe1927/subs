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
  CalendarDays,
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
}) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  if (src && !error) {
    return (
      <div
        className={`${size} ${redondeo} overflow-hidden flex items-center justify-center shrink-0 ${className}`}
        style={{ backgroundColor: bg }}
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
      style={{ backgroundColor: bg, color: texto }}
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
}: {
  s: Suscripcion;
  size?: string;
  textSize?: string;
  redondeo?: string;
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
            <p className="font-semibold truncate">{s.nombre}</p>
            <p className="text-white/50 text-sm">
              {formatCOP(s.precio)} / {freq === 'mensual' ? 'm' : freq === 'anual' ? 'a' : 's'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0 w-24">
            <span className={`text-sm font-medium ${colores.texto}`}>{etiquetaFecha(fechaPago)}</span>
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
  const [modalAbierto, setModalAbierto] = useState(false);
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

  const totalEsteMes = useMemo(() => {
    return subs
      .filter((s) => s.frecuencia === 'mensual')
      .reduce((acc, s) => acc + s.precio, 0);
  }, [subs]);

  const destacada = useMemo(() => {
    if (subs.length === 0) return null;
    return [...subs].sort(
      (a, b) => diasHasta(fechaEfectiva(a)) - diasHasta(fechaEfectiva(b))
    )[0];
  }, [subs]);

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
      <div className="max-w-md mx-auto px-5 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">
            Vista rápida
          </h1>
        </div>

        {/* Tarjeta destacada */}
        <div className="rounded-3xl p-5 bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 flex flex-col justify-between relative min-h-[220px] mb-3">
          {destacada && (
            <div className="flex-1 flex items-center justify-center">
              <LogoAvatar
                s={destacada}
                size="w-20 h-20"
                textSize="text-3xl"
                redondeo="rounded-full"
              />
            </div>
          )}
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold tracking-tight tabular-nums leading-none">
              {subs.length}
            </span>
            <p className="text-sm text-white/60">
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
              {formatCOP(totalEsteMes)}
            </p>
            <p className="text-sm text-white/60 flex items-center gap-1.5">
              <CalendarDays size={16} /> Este mes
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
              className="no-scrollbar flex gap-3 overflow-x-auto snap-x snap-mandatory"
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
                    className={`snap-start shrink-0 min-w-[190px] w-max rounded-3xl p-5 border overflow-hidden relative ${
                      dias <= 0 ? 'border-red-500/20' : 'border-white/10'
                    }`}
                    style={{
                      background: `radial-gradient(circle at 48px 48px, ${s.colorFondo}80, ${s.colorFondo}26 45%, transparent 75%)`,
                    }}
                  >
                    {otroMes && (
                      <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-white/70">
                        {etiquetaMes(fechaPago)}
                      </span>
                    )}
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

      {/* Barra de status bar difuminada, estilo nativo iOS: blur sólido y
          parejo, sin degradado, sin borde, para que se sienta continuo */}
      <div
        className="fixed left-0 right-0 top-0 z-10 pointer-events-none"
        style={{
          height: 'env(safe-area-inset-top)',
          backdropFilter: 'blur(2.8px) saturate(90%)',
          WebkitBackdropFilter: 'blur(2.8px) saturate(90%)',
          maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
        }}
      />

      {/* Difuminado estilo "glass" detrás del botón flotante: blur fuerte +
          saturación, con un desvanecido muy corto (casi de golpe) en el borde
          superior en vez de un degradado largo */}
      <div
        className="fixed left-0 right-0 bottom-0 z-10 pointer-events-none"
        style={{
          height: 'calc(110px + env(safe-area-inset-bottom))',
          backdropFilter: 'blur(2.8px) saturate(90%)',
          WebkitBackdropFilter: 'blur(2.8px) saturate(90%)',
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
                <div className="sticky top-0 z-10 px-6 pt-6 pb-4 bg-[#141416]">
                  <div className="flex items-center justify-between mb-5">
                    <button
                      onClick={cerrarModal}
                      className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white/70 shrink-0"
                      aria-label="Cerrar"
                    >
                      <X size={16} />
                    </button>
                    <h3 className="text-xl font-semibold flex-1 text-center tracking-tight">
                      {editando ? 'Cambiar marca' : 'Añadir suscripción'}
                    </h3>
                    <div className="w-9 shrink-0" />
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
                    <p className="text-white/40 text-sm font-medium mb-3">Populares</p>
                    <div className="flex flex-col gap-1 -mx-2 mb-6">
                      {MARCAS_POPULARES.map((p, i) => (
                        <FilaMarca key={`pop-${p.nombre}-${i}`} marca={p} onClick={() => elegirMarca(p)} />
                      ))}
                    </div>

                    <p className="text-white/40 text-sm font-medium mb-3">Todas las marcas</p>
                    <div className="flex flex-col gap-1 -mx-2">
                      {MARCAS_TODAS.map((p, i) => (
                        <FilaMarca key={`todas-${p.nombre}-${i}`} marca={p} onClick={() => elegirMarca(p)} />
                      ))}
                    </div>
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
