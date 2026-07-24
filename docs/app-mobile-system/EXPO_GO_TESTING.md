# Prueba en Expo Go — App Móvil UCA

## Requisitos

| Recurso | Detalle |
|---|---|
| Dispositivo físico | Android o iOS con Expo Go instalado |
| Expo Go | Descargar de Play Store / App Store |
| Backend | Debe estar desplegado y accesible desde la red del dispositivo |
| Red | Ambos en la misma red (para desarrollo local) o backend en producción |

## 1. Backend local (misma red WiFi)

El backend corre por defecto en `http://localhost:8000`. Para que Expo Go lo alcance:

1. Obtener IP local: `ipconfig` (en Windows) → IPv4 (ej. `192.168.1.50`)
2. Iniciar backend con esa IP:

```powershell
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

3. Configurar `API_URL` en la app móvil apuntando a `http://192.168.1.50:8000`

## 2. Iniciar la app móvil

```powershell
cd mobile
npx expo start
```

Esto levanta el servidor de desarrollo de Expo (puerto 8081 por defecto).

## 3. Escanear QR con Expo Go

- Android: abrir Expo Go → escanear QR del terminal
- iOS: abrir Cámara → escanear QR → abrir en Expo Go

## 4. Verificar conectividad

1. La app carga la pantalla de login.
2. Ingresar credenciales de prueba.
3. El login llama al backend vía `useAuth().login()`.
4. Dashboard muestra datos reales si el backend responde.

## Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| QR no escanea | Red diferente | Asegurar ambos en la misma WiFi |
| Error de conexión | Backend no accesible | Verificar `http://IP:8000` desde navegador en el mismo dispositivo |
| Pantalla en blanco | Error de bundle | Ejecutar `npx expo start -c` (limpiar caché) |
| Cámara no funciona | Permiso denegado | Conceder permiso de cámara en ajustes del dispositivo |

## 5. Backend de producción

Si ya hay un backend desplegado en `https://api.uca.edu.py`:

1. Configurar `API_URL` a la URL de producción
2. Asegurar que CORS permita el origen de Expo Go
3. Verificar que los certificados SSL sean válidos
