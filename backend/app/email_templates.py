"""Templates HTML de emails del Sistema Académico UCA.

Diseño responsivo, compatible con Gmail/Outlook (layout basado en tablas,
estilos inline, media queries para móvil). Sin dependencias externas de
imágenes: el logo es un monograma estilizado (texto) para que el email se
vea bien aunque los recursos externos estén bloqueados.

Usado por: app/email_utils.py (send_reset_link_email_bg y amigos).
"""

import html as _html

SYSTEM_NAME = "Sistema Académico UCA"
_PRIMARY = "#1a56db"
_PRIMARY_DARK = "#143fa8"


def _safe(value: object) -> str:
    return _html.escape(str(value))


def _shell(body_html: str, preheader: str) -> str:
    """Estructura base del email: header con monograma + body + footer."""
    return f"""<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>{_safe(SYSTEM_NAME)}</title>
  <style>
    @media only screen and (max-width: 600px) {{
      .container {{ width: 100% !important; }}
      .btn {{ display: block !important; width: 100% !important; box-sizing: border-box; }}
      .px {{ padding-left: 16px !important; padding-right: 16px !important; }}
    }}
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f3f5f9; font-family: Arial, Helvetica, sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden;">{_safe(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f5f9;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:100%; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(10,25,60,0.08);">

        <tr>
          <td align="center" style="background:#0d2137; padding:28px 24px 26px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" valign="middle">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                    <td width="46" height="46" align="center" style="width:46px; height:46px; background:{_PRIMARY}; border-radius:10px; font-size:0; line-height:0;">
                      <span style="display:inline-block; font-family:Arial, sans-serif; font-weight:bold; font-size:22px; color:#ffffff; line-height:46px;">U</span>
                    </td>
                    <td width="10" style="width:10px; font-size:0;">&nbsp;</td>
                    <td valign="middle">
                      <span style="font-family:Arial, sans-serif; font-size:18px; font-weight:bold; color:#ffffff; line-height:22px;">{_safe(SYSTEM_NAME)}</span><br>
                      <span style="font-family:Arial, sans-serif; font-size:11px; color:#7fa6c4; line-height:15px;">Universidad Católica &middot; Unidad Pedagógica Caacupé</span>
                    </td>
                  </tr></table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr><td class="px" style="padding:32px 36px 8px;">
          {body_html}
        </td></tr>

        <tr>
          <td class="px" style="padding:28px 36px 30px; border-top:1px solid #e6eaf1;">
            <p style="margin:0; font-family:Arial, sans-serif; font-size:11.5px; color:#8a94a6; line-height:18px; text-align:center;">
              {_safe(SYSTEM_NAME)} &middot; Universidad Católica Nuestra Señora de la Asunción<br>
              Este mensaje fue enviado automáticamente. No respondas a este correo.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def render_reset_password_email(
    nombre: str,
    reset_link: str,
    expira_minutos: int,
) -> str:
    """Email de recuperación de contraseña: botón + enlace alternativo +
    tiempo de expiración + aviso de seguridad."""
    expira_str = f"{expira_minutos} minutos" if expira_minutos < 60 else f"{expira_minutos // 60} hora(s)"
    body = f"""
<p style="margin:0 0 14px; font-family:Arial, sans-serif; font-size:15px; color:#22314e; line-height:22px;">
  Hola <strong>{_safe(nombre)}</strong>,
</p>
<p style="margin:0 0 18px; font-family:Arial, sans-serif; font-size:15px; color:#22314e; line-height:22px;">
  Recibimos una solicitud para restablecer tu contraseña en el {_safe(SYSTEM_NAME)}.
  Para continuar, hacé clic en el botón de abajo:
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
  <tr>
    <td align="center">
      <a class="btn" href="{_safe(reset_link)}"
         style="display:inline-block; padding:14px 32px; background:{_PRIMARY}; color:#ffffff; text-decoration:none; font-family:Arial,sans-serif; font-size:15px; font-weight:bold; border-radius:8px;">
        Restablecer contraseña
      </a>
    </td>
  </tr>
</table>
<p style="margin:0 0 14px; font-family:Arial, sans-serif; font-size:13px; color:#5b6b85; line-height:20px;">
  Si el botón no funciona, copiá y pegá este enlace en tu navegador:
</p>
<p style="margin:0 0 18px; font-family:Arial, sans-serif; font-size:12px; color:{_PRIMARY}; line-height:18px; word-break:break-all;">
  {_safe(reset_link)}
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px; background:#fff7ed; border:1px solid #fed7aa; border-radius:8px;">
  <tr><td style="padding:12px 16px; font-family:Arial, sans-serif; font-size:12.5px; color:#9a3412; line-height:19px;">
    <strong>Importante:</strong> este enlace expira en {expira_str} y solo puede usarse una vez.
    Si no solicitaste este cambio, ignorá este mensaje; tu contraseña no se modificará.
  </td></tr>
</table>
"""
    return _shell(body, "Restablecé tu contraseña del Sistema Académico UCA")


def render_welcome_email(nombre: str) -> str:
    body = f"""
<p style="margin:0 0 14px; font-family:Arial, sans-serif; font-size:15px; color:#22314e; line-height:22px;">
  ¡Bienvenido/a <strong>{_safe(nombre)}</strong>!
</p>
<p style="margin:0 0 18px; font-family:Arial, sans-serif; font-size:15px; color:#22314e; line-height:22px;">
  Tu cuenta en el {_safe(SYSTEM_NAME)} fue creada correctamente.
</p>
<p style="margin:0 0 18px; font-family:Arial, sans-serif; font-size:15px; color:#22314e; line-height:22px;">
  Usá la opción <strong>"Recuperar contraseña"</strong> en la pantalla de inicio de sesión
  para establecer tu contraseña y comenzar a usar el sistema.
</p>
<p style="margin:0 0 6px; font-family:Arial, sans-serif; font-size:12.5px; color:#5b6b85; line-height:19px;">
  Si tenés dudas, contactá a la administración del sistema.
</p>
"""
    return _shell(body, "Tu cuenta fue creada en el Sistema Académico UCA")


def render_admin_password_reset_email(nombre: str) -> str:
    body = f"""
<p style="margin:0 0 14px; font-family:Arial, sans-serif; font-size:15px; color:#22314e; line-height:22px;">
  Hola {_safe(nombre)},
</p>
<p style="margin:0 0 18px; font-family:Arial, sans-serif; font-size:15px; color:#22314e; line-height:22px;">
  Un administrador restableció tu contraseña en el {_safe(SYSTEM_NAME)}.
</p>
<p style="margin:0 0 18px; font-family:Arial, sans-serif; font-size:15px; color:#22314e; line-height:22px;">
  Usá la opción <strong>"Recuperar contraseña"</strong> en la pantalla de inicio de sesión
  para establecer una nueva.
</p>
<p style="margin:0 0 6px; font-family:Arial, sans-serif; font-size:12.5px; color:#5b6b85; line-height:19px;">
  Si no solicitaste este cambio, contactá al administrador del sistema.
</p>
"""
    return _shell(body, "Tu contraseña fue restablecida por un administrador")


def render_new_grade_email(
    nombre: str, materia_name: str, tipo_nota: str, valor_nota: float
) -> str:
    body = f"""
<p style="margin:0 0 14px; font-family:Arial, sans-serif; font-size:15px; color:#22314e; line-height:22px;">
  Hola {_safe(nombre)},
</p>
<p style="margin:0 0 14px; font-family:Arial, sans-serif; font-size:15px; color:#22314e; line-height:22px;">
  Se cargó una nueva calificación:
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px; background:#f5f7fb; border:1px solid #e6eaf1; border-radius:8px;">
  <tr><td style="padding:14px 18px; font-family:Arial,sans-serif; font-size:13.5px; color:#22314e; line-height:22px;">
    Materia: <strong>{_safe(materia_name)}</strong><br>
    Evaluación: {_safe(tipo_nota)}<br>
    Calificación: <strong>{_safe(valor_nota)}</strong>
  </td></tr>
</table>
<p style="margin:0 0 6px; font-family:Arial, sans-serif; font-size:12.5px; color:#5b6b85; line-height:19px;">
  Consultá el detalle completo en el sistema.
</p>
"""
    return _shell(body, "Nueva calificación cargada")


def render_alerta_inasistencia_email(
    alumno_nombre: str, materia_nombre: str, porcentaje: float
) -> str:
    body = f"""
<p style="margin:0 0 14px; font-family:Arial, sans-serif; font-size:15px; color:#22314e; line-height:22px;">
  <strong>Alerta de inasistencia crítica</strong>
</p>
<p style="margin:0 0 14px; font-family:Arial, sans-serif; font-size:15px; color:#22314e; line-height:22px;">
  El alumno <strong>{_safe(alumno_nombre)}</strong> superó el 25% de faltas en
  <strong>{_safe(materia_nombre)}</strong>.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px; background:#fef2f2; border:1px solid #fecaca; border-radius:8px;">
  <tr><td style="padding:14px 18px; font-family:Arial,sans-serif; font-size:13.5px; color:#991b1b; line-height:22px;">
    Porcentaje de inasistencia actual: <strong>{_safe(porcentaje)}%</strong>
  </td></tr>
</table>
<p style="margin:0 0 6px; font-family:Arial, sans-serif; font-size:12.5px; color:#5b6b85; line-height:19px;">
  Según reglamento, esto puede implicar pérdida de regularidad en la materia.
</p>
"""
    return _shell(body, "Alerta de inasistencia crítica")