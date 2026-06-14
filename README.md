# 🧩 Catálogo Web conectado a Google Sheets

## Arquitectura elegida

El sitio usa **HTML + CSS + JavaScript puro** (sin frameworks). Los datos se obtienen desde **Google Apps Script**, que actúa como una mini-API JSON conectada a tu hoja de cálculo. Cuando alguien visita el sitio, el navegador llama a esa URL, recibe la lista de productos en formato JSON y los muestra en pantalla.

```
Google Sheets → Apps Script (API JSON) → Navegador del visitante
```

Esta arquitectura es robusta, gratuita y no necesita servidor propio.

---

## Archivos del proyecto

| Archivo | Descripción |
|---------|-------------|
| `index.html` | Estructura de la página |
| `style.css`  | Diseño visual |
| `script.js`  | Lógica, conexión con Sheets, filtros y búsqueda |
| `README.md`  | Esta guía |

---

## GUÍA DE INSTALACIÓN (paso a paso)

### PASO 1 — Crear la hoja de Google Sheets

1. Ir a [sheets.google.com](https://sheets.google.com) e iniciar sesión.
2. Crear una hoja nueva (clic en el **+** de la parte inferior).
3. Renombrar esa hoja como **Productos** (doble clic en la pestaña).

---

### PASO 2 — Estructurar las columnas

En la **fila 1** escribí exactamente estos encabezados (en el mismo orden):

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Código | Producto | Descripción | Precio | Categoría | Imagen |

A partir de la **fila 2** cargás tus productos. Ejemplo:

| 001 | Torre de Hanoi | Juego de lógica clásico | 15000 | Lógica | https://... |
| 002 | Tantrix | Puzzle de patrones | 22000 | Puzzles | https://... |

> 💡 **Precio**: ingresá solo el número sin símbolo de moneda. Ej: `15000` (no `$15.000`)  
> 💡 **Imagen**: pegá la URL directa de la imagen (tiene que terminar en `.jpg`, `.png`, `.webp`, etc.)  
> 💡 Si un producto no tiene imagen, dejá la celda vacía. Se mostrará un ícono predeterminado.

---

### PASO 3 — Crear el Google Apps Script

1. Con tu hoja abierta, ir a **Extensiones → Apps Script**.
2. Se abre el editor. Borrá todo el código que hay (si hay algo).
3. Pegá exactamente este código:

```javascript
function doGet() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName('Productos'); // Nombre de tu hoja
  const data = hoja.getDataRange().getValues();
  const headers = data[0];

  const productos = data.slice(1)
    .filter(row => row[0]) // Ignorar filas vacías
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });

  return ContentService
    .createTextOutput(JSON.stringify({ productos }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

4. Guardá con **Ctrl + S** (o clic en el ícono 💾).

---

### PASO 4 — Publicar el script como Web App

1. Clic en **Implementar** (botón azul arriba a la derecha).
2. Seleccioná **Nueva implementación**.
3. En "Seleccionar tipo", elegí **Aplicación web**.
4. Completá los campos:
   - **Descripción**: Catálogo v1 (cualquier texto)
   - **Ejecutar como**: Yo (tu cuenta de Google)
   - **Quién tiene acceso**: **Cualquier persona**
5. Clic en **Implementar**.
6. Si te pide permisos, hacé clic en **Autorizar acceso** y aceptá.
7. **Copiá la URL** que aparece (empieza con `https://script.google.com/macros/s/...`).

---

### PASO 5 — Conectar la URL con el sitio web

1. Abrí el archivo `script.js`.
2. Al inicio del archivo encontrás la sección de configuración:

```javascript
const CONFIG = {
  SHEETS_URL: 'https://script.google.com/macros/s/TU_ID_AQUI/exec',
  // ...
};
```

3. Reemplazá `TU_ID_AQUI` (todo el texto entre comillas) con la URL que copiaste.
4. Guardá el archivo.

---

### PASO 6 — Configurar WhatsApp

En el mismo bloque `CONFIG` del `script.js`:

```javascript
WA_NUMBER: '5491100000000',
```

Reemplazá por tu número con el formato: **código de país + número sin espacios ni guiones**.  
Ejemplo para Argentina +54 9 11 1234-5678 → `541112345678`

---

### PASO 7 — Subir a un hosting

Subí los tres archivos (`index.html`, `style.css`, `script.js`) a cualquier servicio:

- **GitHub Pages** (gratuito): ideal para empezar
- **Netlify** (gratuito): arrastrá la carpeta y listo
- **Hostinger / SiteGround / etc.**: subí por FTP o panel de control

No se necesita base de datos ni servidor especial, es un sitio estático.

---

### PASO 8 — Probar que funciona

1. Abrí tu sitio en el navegador.
2. Deberías ver el spinner de carga y luego los productos.
3. Para verificar que la conexión funciona, podés abrir directamente la URL del Apps Script en el navegador. Debería mostrar un JSON con tus productos.

---

## GUÍA DE MANTENIMIENTO (sin conocimientos técnicos)

### ✅ Cómo agregar un producto nuevo

1. Abrí tu Google Sheets.
2. Ir a la última fila con datos.
3. En la siguiente fila en blanco completá: Código, Producto, Descripción, Precio, Categoría, Imagen.
4. ¡Listo! El sitio se actualizará automáticamente la próxima vez que alguien lo visite (o después de 5 minutos si ya está abierto).

### ✅ Cómo cambiar un precio

1. Abrí tu Google Sheets.
2. Buscá el producto en la columna B.
3. Editá el número en la columna D (solo el número, sin símbolo de moneda).
4. El cambio se verá reflejado en el sitio automáticamente.

### ✅ Cómo eliminar un producto

1. Seleccioná la fila completa del producto en Google Sheets.
2. Clic derecho → **Eliminar fila**.
3. El producto desaparecerá del sitio.

### ✅ Cómo agregar una nueva categoría

No hace falta hacer nada especial. Simplemente escribí el nombre de la nueva categoría en la columna E de algún producto. El botón de filtro aparecerá automáticamente en el sitio.

### ✅ Cómo cambiar el logo, banner o textos

Abrí `index.html` con un editor de texto (NotePad, VS Code, etc.) y buscá los comentarios que dicen `<!-- Para cambiar el logo -->` o `<!-- Para cambiar el banner -->`.

### ✅ Cómo cambiar los colores

Abrí `style.css` y modificá las variables al inicio del archivo:

```css
:root {
  --yellow:  #FFD600;  /* Color amarillo principal */
  --orange:  #FF6B2B;  /* Color naranja para botones */
}
```

---

## Actualización de precios en masa (tip)

Si necesitás actualizar muchos precios de una sola vez, podés:

1. Usar la función **Buscar y reemplazar** de Google Sheets (Ctrl+H).
2. O aplicar una fórmula temporal en otra columna: `=D2*1.1` (sube 10%) y luego pegar esos valores encima de la columna D.

---

## ⚠️ Problemas frecuentes

| Problema | Solución |
|----------|----------|
| "No se pudieron cargar los productos" | Verificá que la URL en `CONFIG.SHEETS_URL` sea correcta y que el acceso sea "Cualquier persona" |
| La página muestra el spinner eternamente | Revisá la consola del navegador (F12 → Console) para ver el error exacto |
| Los precios no se actualizan | Después de cambiar datos en Sheets esperá unos segundos. Si sigue igual, hacé **Ctrl+Shift+R** para recargar sin caché |
| Aparece un error de CORS | Asegurate de que el Apps Script esté publicado como "Cualquier persona" (no "Cualquier usuario autenticado") |
| Las imágenes no cargan | Verificá que las URLs sean directas (que terminen en `.jpg`, `.png`, etc.) y que sean públicas |

---

*Desarrollado con HTML5, CSS3 y JavaScript puro. Sin dependencias externas.*
