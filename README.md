# Unfound Pays

Panel personal para registrar ingresos, gastos y balance. Está hecho con Vite, React y TypeScript; los datos se guardan localmente en el navegador.

## Ejecutar localmente

```powershell
npm ci
npm run dev
```

## Funciones

- Balance acumulado con fondo inicial y movimientos de meses anteriores.
- Resumen mensual, gráfico de flujo y distribución por categoría.
- Registro, edición, búsqueda, filtros, eliminación y exportación CSV.
- En móvil, formulario de gasto/ingreso con teclado numérico y gesto para guardar.
- Almacenamiento local con `localStorage`; no hay cuenta, servidor ni sincronización.

Los datos viven en el almacenamiento del navegador de cada dispositivo. Instalar la app en otro dispositivo no transfiere los movimientos. Borrar los datos del sitio o desinstalar y limpiar el almacenamiento puede eliminarlos.
