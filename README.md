# La Corona de Barro — El Libro de la Casa

Edición inicial: **v1.0.3**, reestructurada para publicación GitHub + Cloudflare Pages.

## Abrir la web

La página de entrada es `index.html`, sin compilación. Funciona con archivos estáticos y no requiere servidor de aplicación ni una base de datos.

## Publicar en Cloudflare Pages

1. Sube **todos los archivos y la carpeta `assets/`** a la raíz del repositorio GitHub, no el ZIP comprimido.
2. En Cloudflare: Workers & Pages → Create application → Pages → Connect to Git, y concede permiso a Cloudflare para acceder a este repositorio.
3. Selecciona la rama de producción `main`.
4. Framework preset: **None**. Build command: **dejar vacío** (o `exit 0` si la interfaz lo exige). Build output directory: **`.`** (raíz del repositorio).
5. Pulsa **Save and Deploy**.

Al subir nuevas versiones a `main`, Cloudflare Pages publicará el resultado automáticamente.

## Estructura

- `index.html`: entrada de la página.
- `styles.css`: identidad visual y estilos responsive.
- `book-data.js`: datos, capítulos, héroes y relaciones literarias.
- `art-manifest.js`: rutas de retratos y recursos gráficos.
- `app.js`: interfaz, navegación y controles.
- `assets/`: ilustraciones definitivas en WebP y escudos SVG.

## Notas importantes

- El repositorio privado **no hace privada la web** de Pages: la URL pública muestra todo lo publicado.
- No subas guardados privados ni credenciales, ni documentación que no quieras exponer.
- Mantén los IDs estables de los héroes y los retratos aprobados.
- El motor de crónicas se utiliza en ChatGPT; la web solo muestra las crónicas y datos publicados.
- Conserva copias de seguridad o etiquetas de versión para recuperar ediciones anteriores.
