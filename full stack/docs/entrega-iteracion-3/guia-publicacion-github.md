# Guía manual para preparar GitHub — no ejecutada

## Estado observado

La carpeta raíz del proyecto no contiene `.git`: `git rev-parse`, `git status` y `git remote -v` no encontraron repositorio. Por ello no hay rama, commits, remoto ni historial que inspeccionar. No se creó repositorio local o remoto durante esta etapa.

**Repositorio previsto; publicación pendiente de Brayan.**

- Nombre: `Disenio-de-sistema-de-informacion-iteracion-tres`
- URL prevista: <https://github.com/brayandurango-lgtm/Disenio-de-sistema-de-informacion-iteracion-tres>
- URL de clonación prevista: <https://github.com/brayandurango-lgtm/Disenio-de-sistema-de-informacion-iteracion-tres.git>

Las URLs son propuestas, no una publicación comprobada. No se conocen credenciales ni se configuran aquí.

## Revisión manual que debe hacer Brayan

1. Confirmar con el equipo el nombre, propietario y autorización para crear/publicar el remoto.
2. Revisar `.gitignore` y comprobar que los archivos `.env`, `.env.test`, variantes `.env.*` locales, `node_modules`, `dist`, `target`, coverage, caches, entornos virtuales, logs y CSV generados no se publiquen. Los `.env.example`, package-lock, pom, código, documentación, pruebas y fuentes UML deben seguir visibles.
3. Revisar individualmente datos de prueba, logs, posibles salidas CSV y archivos del directorio `.backup_polish/`. No se hizo limpieza de ese directorio porque su procedencia y valor no están confirmados.
4. Inspeccionar todas las fuentes por credenciales sin copiarlas a tickets o documentación. Las credenciales de `.env` son configuración local ignorada, no material de entrega. Una retirada posterior no revoca una exposición previa; si se confirma una filtración, rotar el secreto desde el sistema que lo emitió.
5. Crear el repositorio vacío desde GitHub, sin generar otro README/licencia si se va a subir esta raíz. Luego, en una copia/revisión local autorizada, inicializar Git en la raíz y revisar `git status`.
6. Agregar solamente archivos revisados, nunca `git add -A` a ciegas. Inspeccionar `git diff --cached --check`, `git diff --cached --stat` y el diff staged completo, verificando que no incluya `.env`, credenciales o datos personales.
7. Solo después de aprobar la revisión, hacer commit manual, configurar el remoto previsto y publicar desde la cuenta de Brayan. Verificar en GitHub la URL, árbol y contenido público antes de compartir el enlace.
8. Registrar la URL real únicamente después de verificar que la página exista y sea accesible. No afirmar cubiertos los 15 puntos de GitHub sin revisar la rúbrica y la evidencia publicada.

Ejemplo de secuencia **futura y manual**, no ejecutada. Sustituye la lista de
rutas staged por archivos individualmente revisados; no uses `git add -A`:

```bash
git init -b main
git status --short
git add <rutas-revisadas-una-por-una>
git diff --cached --check
git diff --cached --stat
git diff --cached
git commit -m "Preparar entrega técnica de iteración 3"
git remote add origin https://github.com/brayandurango-lgtm/Disenio-de-sistema-de-informacion-iteracion-tres.git
git push -u origin main
```

Autentícate únicamente mediante el método local autorizado por GitHub; nunca
incluyas tokens en comandos, documentación o historial de shell. Revisa de
nuevo el estado staged antes del commit y confirma que los ejemplos `.env` se
incluyan, pero que los archivos `.env` locales no estén staged.

Estos pasos son instrucciones para trabajo manual futuro. No se ejecutó `git init`, `git add`, `git commit`, `git remote`, `git push`, ni se configuraron ramas o credenciales.
