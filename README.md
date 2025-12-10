# 🎮 SkillBlocks Backend - Strapi CMS

Backend API para SkillBlocks, una plataforma gamificada de aprendizaje de código con sistema de challenges, proyectos y votación comunitaria.

## 🚀 Inicio Rápido

### Instalación

```bash
npm install
# o
yarn install
```

### Desarrollo

```bash
npm run develop
# o
yarn develop
```

El servidor estará disponible en `http://localhost:1337`

### Producción

```bash
# Build
npm run build

# Start
npm run start
```

## 🆕 Novedades Recientes

### Sistema de Comentarios (Nuevo)
- Sistema completo de comentarios con soporte de replies
- Visualización jerárquica de comentarios y respuestas
- Control de acceso: solo el autor puede eliminar sus comentarios
- Límite de 1000 caracteres por comentario

### Mejoras en Proyectos
- Campo `hasVoted` para verificar si el usuario ya votó en un challenge
- Optimización de consultas SQL para likes y votos
- Mejor manejo de contadores de likes (nunca negativos)

### Mejoras en Perfiles
- Nuevo campo `likedProjectsCount` en respuestas de perfil
- Filtros mejorados para proyectos publicados
- Endpoints optimizados para creators y perfiles de creators

### Actualización de Usuario
- Endpoint para actualizar email y username del usuario
- Validación de unicidad de email y username
- Sanitización de respuestas (no se devuelven passwords)

## 📚 Documentación de APIs

Toda la documentación de las APIs está disponible en los siguientes archivos:

- **[API_SUMMARY.md](API_SUMMARY.md)** - Resumen completo de todas las APIs
- **[QUICK_START_GUIDE.md](QUICK_START_GUIDE.md)** - Guía de inicio rápido del sistema de challenges
- **[CHALLENGE_SYSTEM_IMPLEMENTATION.md](CHALLENGE_SYSTEM_IMPLEMENTATION.md)** - Sistema de challenges y votación completo
- **[PROJECTS_API_DOCUMENTATION.md](PROJECTS_API_DOCUMENTATION.md)** - API de proyectos
- **[PROFILE_API_DOCUMENTATION.md](PROFILE_API_DOCUMENTATION.md)** - API de perfil de usuario
- **[FRONTEND_LIKE_EXAMPLES.md](FRONTEND_LIKE_EXAMPLES.md)** - Ejemplos de implementación de likes en frontend

## 🎯 Características Principales

### Sistema de Challenges
- Lifecycle completo: draft → submissions → voting → completed
- Sistema de votación independiente de likes
- Determinación automática de ganadores (Top 3)
- Awards de XP automáticos

### Sistema de Proyectos
- Proyectos públicos y privados
- Sistema de likes con toggle automático
- Sistema de votación en challenges
- Campo `hasVoted` para verificar si el usuario votó
- Ordenamiento avanzado (newest, popular, most viewed)
- Submissions a challenges
- Contador de vistas optimizado

### Sistema de Comentarios
- Comentarios en proyectos con soporte de replies (hilos)
- CRUD completo (crear, leer, eliminar)
- Sistema jerárquico (comentarios padre e hijos)
- Solo el autor puede eliminar sus comentarios
- Visualización pública sin autenticación

### Gamificación
- Sistema de XP y niveles
- Badges con rareza y categorías
- Challenges completados y ganados
- Sistema de rachas (streaks)

### Gestión de Usuarios y Perfiles
- Autenticación JWT
- Perfiles personalizables (bio, GitHub user)
- Actualización de email/username
- Integración con GitHub
- Campo `likedProjectsCount` en respuestas de perfil
- Filtros para proyectos publicados en perfil

## 🏗️ Estructura del Proyecto

```
src/
├── api/
│   ├── challenge/          # Sistema de challenges
│   ├── challenge-category/ # Categorías de challenges
│   ├── project/            # Proyectos de usuarios
│   ├── profile/            # Perfiles de usuario
│   ├── badge/              # Sistema de badges
│   ├── comment/            # Comentarios (con replies)
│   ├── tag/                # Tags para proyectos
│   └── about/              # Información general
└── extensions/
    └── users-permissions/  # Extensión de usuarios (actualizar email/username)
```

## 🔑 Endpoints Principales

### Autenticación
- `POST /api/auth/local/register` - Registro
- `POST /api/auth/local` - Login
- `PUT /api/user/me` - Actualizar usuario

### Challenges
- `GET /api/challenges` - Listar challenges
- `POST /api/challenges/:id/submit` - Enviar proyecto
- `POST /api/challenges/:id/start-voting` - Iniciar votación
- `POST /api/challenges/:id/end-voting` - Finalizar votación

### Proyectos
- `GET /api/projects` - Proyectos públicos (con sorting)
- `POST /api/projects/:id/like` - Like/unlike
- `POST /api/projects/:id/vote` - Votar en challenge
- `GET /api/projects/my-projects` - Mis proyectos
- `GET /api/projects/challenge/:id` - Proyectos de un challenge

### Perfil
- `GET /api/profiles/me` - Mi perfil (incluye likedProjectsCount)
- `PUT /api/profiles/me` - Actualizar perfil

### Comentarios
- `GET /api/projects/:projectId/comments` - Obtener comentarios de un proyecto
- `POST /api/projects/:projectId/comments` - Crear comentario o reply
- `DELETE /api/comments/:id` - Eliminar comentario propio

## 🛠️ Tecnologías

- **Strapi v5** - Headless CMS
- **Node.js** - Runtime
- **PostgreSQL/SQLite** - Base de datos
- **TypeScript** - Lenguaje

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env` en la raíz:

```env
HOST=0.0.0.0
PORT=1337
APP_KEYS=your-app-keys
API_TOKEN_SALT=your-api-token-salt
ADMIN_JWT_SECRET=your-admin-jwt-secret
JWT_SECRET=your-jwt-secret
TRANSFER_TOKEN_SALT=your-transfer-token-salt

DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db
```

### Permisos

Configura los permisos en **Settings > Roles**:

**Public (no autenticado):**
- Ver challenges, proyectos públicos, perfiles, badges

**Authenticated:**
- Crear/actualizar/eliminar proyectos propios
- Enviar a challenges, votar, dar likes
- Actualizar perfil y usuario

## 📝 Ejemplos de Uso

### Enviar Proyecto a Challenge

```javascript
const response = await fetch('http://localhost:1337/api/challenges/abc123/submit', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Mi Solución',
    htmlCode: '<div>Hello World</div>',
    cssCode: 'body { margin: 0; }',
    jsCode: 'console.log("Hi");'
  })
});
```

### Votar por un Proyecto

```javascript
const response = await fetch('http://localhost:1337/api/projects/xyz456/vote', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer YOUR_JWT' }
});
```

### Dar Like a un Proyecto (Toggle)

```javascript
const response = await fetch('http://localhost:1337/api/projects/xyz456/like', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer YOUR_JWT' }
});

const { liked, likes, message } = await response.json();
// liked: true/false, likes: número total, message: descripción
```

### Crear Comentario

```javascript
// Comentario principal
const response = await fetch('http://localhost:1337/api/projects/xyz456/comments', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: 'Excelente proyecto!'
  })
});

// Reply a un comentario
const reply = await fetch('http://localhost:1337/api/projects/xyz456/comments', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: 'Gracias!',
    parentCommentId: 'abc123' // ID del comentario padre
  })
});
```

Ver más ejemplos en [API_SUMMARY.md](API_SUMMARY.md#🚀-ejemplos-rápidos) y [FRONTEND_LIKE_EXAMPLES.md](FRONTEND_LIKE_EXAMPLES.md)

## 🔒 Seguridad

- Rate limiting en endpoints autenticados
- Validación de datos de entrada
- Sanitización de respuestas (no se devuelven passwords)
- Validación de unicidad (email, username)
- Control de acceso basado en roles

## 📦 Scripts Disponibles

```bash
npm run develop    # Desarrollo con auto-reload
npm run start      # Producción
npm run build      # Build del admin panel
npm run strapi     # CLI de Strapi
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'feat: agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es privado y confidencial.

## 🔗 Links Útiles

- [Documentación de Strapi](https://docs.strapi.io)
- [API Reference Completa](API_SUMMARY.md)
- [Guía de Inicio Rápido](QUICK_START_GUIDE.md)
