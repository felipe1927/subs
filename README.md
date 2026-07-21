# Mis Suscripciones

App para administrar tus suscripciones, en español y con pesos colombianos (COP).

## Correr en local

```bash
npm install
npm run dev
```

Abre http://localhost:3000

## Desplegar en Vercel

**Opción A — Desde GitHub (recomendada)**
1. Crea un repositorio nuevo en GitHub y sube esta carpeta:
   ```bash
   git init
   git add .
   git commit -m "Primera version"
   git branch -M main
   git remote add origin TU_REPO_URL
   git push -u origin main
   ```
2. Entra a https://vercel.com/new, elige "Import Git Repository" y selecciona el repo.
3. Deja la configuración por defecto (Vercel detecta Next.js automáticamente) y dale a "Deploy".

**Opción B — Con Vercel CLI (sin GitHub)**
```bash
npm install -g vercel
vercel
```
Sigue las instrucciones en pantalla (te preguntará si quieres crear un proyecto nuevo, con qué cuenta, etc). Al finalizar te da una URL pública.

## Qué incluye esta primera versión
- Vistazo rápido: promedio mensual, total del mes, tarjeta destacada con el conteo de suscripciones.
- Próximo pago destacado con barra de progreso.
- Listado de todas las suscripciones agrupado por frecuencia (semanal/mensual/anual).
- Botón "Añadir nueva" para crear suscripciones (nombre, precio en COP, frecuencia, próxima fecha de cobro).
- Los datos se guardan en el navegador (localStorage), por ahora no hay backend ni login.

## Siguientes pasos (para cuando quieras seguir agregando cosas)
- Guardar los datos en una base de datos real (ej. Vercel Postgres, Supabase) en vez de localStorage.
- Notificaciones/recordatorios antes del cobro.
- Editar suscripciones existentes.
- Categorías, filtros y estadísticas por categoría.
