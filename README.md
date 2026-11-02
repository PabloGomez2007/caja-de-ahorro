# Mi Caja Familiar — prototipo móvil funcional

Incluye una aplicación web móvil instalable (PWA), sin servicios externos. Para probarla, sirve la carpeta con un servidor HTTP local: `python3 -m http.server 8000` y abre `http://localhost:8000`. Para instalar en Android, publícala en un sitio HTTPS de confianza, ábrela con Chrome y selecciona «Instalar aplicación» o «Agregar a pantalla principal».

**No es un APK**. No hay cuentas de usuario, cifrado local, auditoría segura, validación legal, conciliación de efectivo ni sincronización. Solo uso de prueba con datos ficticios. Los préstamos y pagos son simulaciones y no representan operaciones reales.

## Reglas
- Aportación mensual acordada: USD 20, con advertencia para otros montos.
- Límite de préstamo simulado: 40 % de aportaciones menos capital pendiente.
- Interés ilustrativo: 10 % mensual sobre capital pendiente, meses completos desde el último pago. Para un producto real hace falta un motor de amortización con fechas de corte, pagos parciales y redondeos definidos.
- Distribución ilustrativa: 50 % de intereses simulados cobrados a reinversión y 50 % a reparto teórico proporcional a aportaciones. No hay gastos ni pérdidas registrados, por lo que **no es utilidad neta**.
- Persistencia: localStorage del navegador; exportar/importar JSON manualmente. No guardar datos sensibles reales.

## Siguientes pasos para producción
Validar marco jurídico y tasas con un profesional en Ecuador; implementar base SQLite cifrada, autenticación, auditoría inmutable, conciliación de caja, gastos y pérdidas, motor financiero verificado, reportes y pruebas. Compilar en Flutter o empaquetar PWA para Android con herramientas Android.
