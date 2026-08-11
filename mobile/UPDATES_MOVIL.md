# Actualizaciones OTA (expo-updates)

La app soporta actualizaciones over-the-air: cambios de JS/asset llegan sin
instalar una versión nueva desde la Play/App Store.

## Requisitos

- Proyecto registrado en EAS (`projectId` ya configurado en `app.json`).
- Los cambios **nativos** (plugins, librerías compiladas, `app.json` con
  impacto nativo) requieren un nuevo build, NO OTA.

## Configuración

En `app.json`:

```json
"runtimeVersion": { "policy": "fingerprint" },
"updates": {
  "url": "https://u.expo.dev/<PROJECT_ID>",
  "enabled": true,
  "checkAutomatically": "ON_LOAD"
}
```

La app chequea al abrir (ON_LOAD) y también desde Perfil / modal "Información
de la app", que ofrece "Actualizar y recargar" cuando hay un update disponible.

## Publicar una actualización

Desde `mobile/`:

```sh
# Al canal de producción (branch default)
npx eas update --branch production --message "Fix login"

# Al canal de prueba
npx eas update --branch staging --message "Nuevo dashboard"
```

`--auto` publica en la branch asociada al proyecto EAS si no se especifica.

## Build nuevo (cambios nativos)

```sh
npx eas build --platform android --profile preview
```

El update OTA posterior corre sobre ese runtime; si cambias de librería nativa
o cambian los fingerprints de runtime, la version OTA se rechaza y hay que
recompilar.

## Flujo de la app

`services/updateService.ts`:

1. `checkForUpdate()` → informa si hay update OTA (`otaAvailable`) y/o versión
   nueva según backend (`backendNewer`).
2. `downloadAndReloadUpdate()` → descarga el nuevo bundle y recarga la app
   (botón "Actualizar y recargar" en InfoAppModal).
3. Badge "NUEVA VERSIÓN" en Perfil cuando `otaAvailable || backendNewer`.

Si el build no soporta OTA (dev build), `checkForUpdateAsync()` lanza y se
reduce al chequeo remoto de `/version` (enlace externo al `updateUrl`).