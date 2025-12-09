# 📚 Resumen de APIs Implementadas

Este documento resume todas las APIs implementadas y documentadas en el proyecto.

---

## 📋 Índice de Documentación

1. **[PROJECTS_API_DOCUMENTATION.md](PROJECTS_API_DOCUMENTATION.md)** - API de Proyectos
2. **[PROFILE_API_DOCUMENTATION.md](PROFILE_API_DOCUMENTATION.md)** - API de Perfil de Usuario
3. **[CHALLENGE_SYSTEM_IMPLEMENTATION.md](CHALLENGE_SYSTEM_IMPLEMENTATION.md)** - Sistema de Challenges y Votación
4. **[QUICK_START_GUIDE.md](QUICK_START_GUIDE.md)** - Guía de Inicio Rápido

---

## 🎮 API de Challenges

### Endpoints Disponibles

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/challenges` | GET | No | Todos los challenges |
| `/api/challenges/:id` | GET | No | Un challenge específico |
| `/api/challenges/:id/submit` | POST | ✅ | Enviar proyecto al challenge |
| `/api/challenges/:id/start-voting` | POST | No | Iniciar período de votación |
| `/api/challenges/:id/end-voting` | POST | No | Finalizar votación y determinar ganadores |

### Sistema de Votación

- **Estados del Challenge**: draft → submissions_open → voting → completed → archived
- **Votación**: Durante el período de votación, los usuarios pueden votar por proyectos
- **Ganadores**: Top 3 proyectos reciben XP bonus (1st: 200, 2nd: 100, 3rd: 50)
- **Privacidad**: Proyectos enviados son privados hasta que comienza la votación

### Características Especiales
- ✅ Sistema de votación separado de los likes regulares
- ✅ Transiciones automáticas de estado con hooks de ciclo de vida
- ✅ Publicación automática de proyectos al iniciar votación
- ✅ Determinación automática de ganadores y otorgamiento de XP
- ✅ Categorías de challenges para mejor organización

---

## 🎯 API de Proyectos

### Endpoints Disponibles

| Endpoint | Método | Auth | Sorting | Descripción |
|----------|--------|------|---------|-------------|
| `/api/projects` | GET | No | ✅ | Todos los proyectos públicos |
| `/api/projects/:id` | GET | No | ❌ | Un proyecto específico |
| `/api/projects/:id/like` | POST | ✅ | ❌ | Toggle like/unlike |
| `/api/projects/:id/vote` | POST | ✅ | ❌ | Votar en challenge |
| `/api/projects/my-projects` | GET | ✅ | ✅ | Mis proyectos |
| `/api/projects/liked` | GET | ✅ | ✅ | Proyectos que me gustan |
| `/api/projects/challenge/:challengeId` | GET | No | ✅ | Proyectos de un challenge |

### Opciones de Ordenamiento
- `createdAt:desc` - Más recientes primero (Newest) - **DEFAULT**
- `createdAt:asc` - Más antiguos primero (Oldest)
- `likes:desc` - Más populares primero (Most Popular)
- `views:desc` - Más vistos primero (Most Viewed)

### Características Especiales
- ✅ Campo `hasLiked` cuando el usuario está autenticado
- ✅ Paginación completa en todos los endpoints
- ✅ Support para populate de relaciones
- ✅ Optimización con queries SQL directas para mejor performance

---

## 👤 API de Perfil

### Endpoints Disponibles

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/profiles/me` | GET | ✅ | Obtener mi perfil |
| `/api/profiles/me` | PUT | ✅ | Actualizar mi perfil |

### Campos Actualizables
- `bio` - Biografía del usuario (richtext)
- `githubUser` - Nombre de usuario de GitHub (string)

### Estadísticas de Gamificación
- `totalXP` - XP acumulado total
- `level` - Nivel del usuario (basado en XP)
- `challengesCompleted` - Challenges completados
- `challengesWon` - Challenges ganados (top 3)
- `streak` - Racha de días activos

---

## 👥 API de Usuario

### Endpoints Disponibles

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/auth/local/register` | POST | No | Registrar nuevo usuario |
| `/api/auth/local` | POST | No | Login (obtener JWT) |
| `/api/user/me` | PUT | ✅ | Actualizar email/username |

### Actualizar Usuario
Permite actualizar email y/o username del usuario autenticado.

**Request:**
```json
{
  "email": "nuevo@email.com",
  "username": "nuevo_usuario"
}
```

**Validaciones:**
- Email único en el sistema
- Username único en el sistema
- Al menos uno de los campos debe estar presente


---

## 🔑 Autenticación

Todos los endpoints marcados con 🔐 requieren autenticación JWT:

```javascript
// 1. Obtener token
const response = await fetch('http://localhost:1337/api/auth/local', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    identifier: 'user@example.com',
    password: 'password123'
  })
});

const { jwt } = await response.json();

// 2. Usar en peticiones
const profile = await fetch('http://localhost:1337/api/profiles/me', {
  headers: {
    'Authorization': `Bearer ${jwt}`
  }
});
```

---

## 🛠️ Archivos Principales

### Challenge System
- `src/api/challenge/controllers/challenge.ts` - Controlador con métodos:
  - `submitProject` - Enviar proyecto al challenge
  - `startVoting` - Iniciar período de votación
  - `endVoting` - Finalizar votación y determinar ganadores
- `src/api/challenge/content-types/challenge/lifecycles.ts` - Hooks de ciclo de vida
- `src/api/challenge/routes/custom-routes.ts` - Rutas personalizadas
- `src/api/challenge-category/` - Colección de categorías de challenges

### Proyectos
- `src/api/project/controllers/project.ts` - Controlador con métodos:
  - `find` - Con sorting validado
  - `findOne` - Con hasLiked
  - `toggleLike` - Like/unlike
  - `vote` - Votar en challenge
  - `myProjects` - Proyectos del usuario con sorting
  - `likedProjects` - Proyectos que le gustan al usuario con sorting
  - `projectsByChallenge` - Proyectos de un challenge con sorting
- `src/api/project/routes/custom-routes.ts` - Rutas personalizadas

### Perfil
- `src/api/profile/controllers/profile.ts` - Controlador con métodos:
  - `me` - Obtener perfil (solo versiones publicadas)
  - `updateMe` - Actualizar perfil (con auto-publish)
- `src/api/profile/routes/custom-routes.ts` - Rutas personalizadas

### Usuario
- `src/extensions/users-permissions/strapi-server.ts` - Extensión del plugin de usuarios
  - `updateMe` - Actualizar email/username del usuario

---

## 📊 Esquemas de Base de Datos

### Challenges
```typescript
{
  title: string
  description: richtext
  difficulty: enum (beginner, intermediate, advanced)
  xpReward: integer
  currentStatus: enum (draft, submissions_open, voting, completed, archived)
  startDate: datetime
  votingStartDate: datetime
  votingEndDate: datetime
  endDate: datetime
  submissionCount: integer (default: 0)
  featured: boolean (default: false)
  viewCount: integer (default: 0)
  winners: relation (manyToMany -> Project)
  category: relation (manyToOne -> ChallengeCategory)
  tags: relation (manyToMany -> Tag)
}
```

### Projects
```typescript
{
  name: string
  htmlCode: richtext
  cssCode: richtext
  jsCode: richtext
  status: enum (draft, private, public)
  isPublic: boolean // deprecated, usar 'status'
  likes: integer (default: 0)
  views: integer (default: 0)
  viewCount: integer (default: 0)
  rating: integer
  votesReceived: integer (default: 0) // votos en challenges
  featured: boolean (default: false)
  featuredAt: datetime
  submittedToChallengeAt: datetime
  author: relation (manyToOne -> User)
  tag: relation (oneToOne -> Tag)
  challenge: relation (manyToOne -> Challenge)
  likedBy: relation (manyToMany -> User)
  votedBy: relation (manyToMany -> User) // votos en challenges
  comments: relation (oneToMany -> Comment)
  profile: relation (manyToOne -> Profile)
}
```

### Profiles
```typescript
{
  bio: richtext
  githubUser: string
  totalXP: integer
  level: integer (default: 1)
  challengesCompleted: integer
  challengesWon: integer (default: 0)
  streak: integer (default: 0)
  lastActivityDate: datetime
  user: relation (oneToOne -> User)
  badges: relation (manyToMany -> Badge)
  completedChallenges: relation (manyToMany -> Challenge)
  projects: relation (oneToMany -> Project)
}
```

### Badges
```typescript
{
  name: string
  slug: UID
  description: text
  icon: string (emoji o nombre de icono)
  requirement: text
  xpRequired: integer
  challengesRequired: integer
  category: enum (milestone, skill, streak, social)
  rarity: enum (common, rare, epic, legendary)
}
```

### ChallengeCategory
```typescript
{
  name: string (unique)
  slug: UID
  description: text
  icon: string (emoji o nombre de icono)
  color: string (hex color)
  challenges: relation (oneToMany -> Challenge)
}
```

### Comments
```typescript
{
  content: richtext
  author: relation (manyToOne -> User)
  project: relation (manyToOne -> Project)
  parentComment: relation (manyToOne -> Comment) // para respuestas
  replies: relation (oneToMany -> Comment)
}
```

---

## 🚀 Ejemplos Rápidos

### Registrar e iniciar sesión
```javascript
// Registro
const register = await fetch('http://localhost:1337/api/auth/local/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'usuario',
    email: 'user@example.com',
    password: 'password123'
  })
});

// Login
const login = await fetch('http://localhost:1337/api/auth/local', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    identifier: 'user@example.com',
    password: 'password123'
  })
});
const { jwt, user } = await login.json();
```

### Enviar proyecto a un challenge
```javascript
const response = await fetch(
  'http://localhost:1337/api/challenges/abc123xyz/submit',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Mi Solución',
      htmlCode: '<div>Hello World</div>',
      cssCode: 'body { margin: 0; }',
      jsCode: 'console.log("Hi");'
    })
  }
);
const { project, xpAwarded } = await response.json();
```

### Votar por un proyecto en un challenge
```javascript
const response = await fetch(
  'http://localhost:1337/api/projects/abc123xyz/vote',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
);
const { voted, votesReceived, likes } = await response.json();
```

### Obtener proyectos más populares
```javascript
const response = await fetch(
  'http://localhost:1337/api/projects?sort=likes:desc&pagination[pageSize]=10'
);
const { data } = await response.json();
```

### Dar like a un proyecto
```javascript
const response = await fetch(
  'http://localhost:1337/api/projects/abc123xyz/like',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
);
const { liked, likes } = await response.json();
```

### Actualizar mi perfil
```javascript
const response = await fetch(
  'http://localhost:1337/api/profiles/me',
  {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      githubUser: 'mi-usuario',
      bio: 'Mi biografía'
    })
  }
);
const profile = await response.json();
```

### Actualizar email/username
```javascript
const response = await fetch(
  'http://localhost:1337/api/user/me',
  {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'nuevo@email.com',
      username: 'nuevo_usuario'
    })
  }
);
const user = await response.json();
```

### Obtener proyectos de un challenge
```javascript
const response = await fetch(
  'http://localhost:1337/api/projects/challenge/abc123xyz?sort=votesReceived:desc'
);
const { data, meta } = await response.json();
```

---

## 💡 Notas Técnicas

### Strapi v5 Draft & Publish
- Todos los content types usan `draftAndPublish: true`
- Las actualizaciones se publican automáticamente
- Las consultas especifican `status: 'published'` para obtener solo versiones publicadas

### Sistema de Gamificación
- **XP por primera submission a challenge**: 50 XP (configurable por challenge)
- **XP por ganar challenges**: 1er lugar: +200, 2do lugar: +100, 3er lugar: +50
- **Niveles**: Calculados basándose en totalXP
- **Badges**: Sistema de insignias con rareza y categorías
- **Streaks**: Sistema de rachas (por implementar en frontend)

### Privacidad de Proyectos
- **draft**: Solo visible para el autor
- **private**: Solo visible para el autor (usado para submissions antes de voting)
- **public**: Visible para todos
- Submissions a challenges son automáticamente **private** hasta que comienza la votación
- Al iniciar votación, todos los proyectos se vuelven **public** automáticamente

### Sistema de Votación vs Likes
- **Likes regulares** (`project.likes`): Para cualquier proyecto, en cualquier momento
- **Votos de challenges** (`project.votesReceived`): Solo durante período de votación
- Al votar en un challenge, se incrementan **ambos** contadores
- Restricciones de votación:
  - Solo durante período de votación del challenge
  - Un voto por proyecto por usuario
  - No se puede votar por proyectos propios

### Optimizaciones
- Queries SQL directas para mejor performance en:
  - `myProjects`
  - `likedProjects`
  - `projectsByChallenge`
- Uso de `GROUP BY document_id` para manejar múltiples versiones (draft/published)
- Lifecycle hooks para automatizar transiciones de estado

### Seguridad
- Rate limiting en endpoints autenticados
- Validación de parámetros de sorting
- Solo usuarios autenticados pueden votar y dar like
- Validación de unicidad en email y username
- Usuarios no autenticados pueden ver proyectos públicos y challenges
- Sanitización de respuestas (no se devuelven passwords ni tokens)

---

## 📝 Códigos de Estado HTTP

| Código | Significado |
|--------|-------------|
| 200 | Operación exitosa |
| 400 | Bad request (parámetros inválidos) |
| 401 | No autenticado |
| 404 | Recurso no encontrado |
| 500 | Error interno del servidor |

---

## 🎨 Frontend Integration

Para integración con frontend, ver documentación completa en:
- **[PROJECTS_API_DOCUMENTATION.md](PROJECTS_API_DOCUMENTATION.md)** - Ejemplos completos de proyectos con React
- **[PROFILE_API_DOCUMENTATION.md](PROFILE_API_DOCUMENTATION.md)** - Ejemplos de perfil con React
- **[CHALLENGE_SYSTEM_IMPLEMENTATION.md](CHALLENGE_SYSTEM_IMPLEMENTATION.md)** - Sistema de challenges completo
- **[QUICK_START_GUIDE.md](QUICK_START_GUIDE.md)** - Guía de inicio rápido

Los ejemplos incluyen:
- Manejo de estado con hooks
- Paginación y ordenamiento
- Autenticación con JWT
- Manejo de errores
- Estados de carga
- Sistema de votación
- Submissions a challenges
- Gestión de gamificación (XP, niveles, badges)
