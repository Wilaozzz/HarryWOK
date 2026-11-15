// ========================================
// supabase/functions/_shared/settings.ts
// Lectura cacheada de app_settings (§12)
// ========================================

// Importar tipo de Supabase
// Este módulo provee helpers para leer configuración global sin redeploy

/**
 * Obtiene un valor de configuración de app_settings
 * @param supabase Cliente Supabase
 * @param key Clave de configuración (ej. 'redemption_ttl_minutes')
 * @param defaultValue Valor por defecto si no existe
 * @returns Valor de configuración o default
 */
export const getAppSetting = async (
  supabase: any,
  key: string,
  defaultValue: string = ''
): Promise<string> => {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .single();
  
  if (error || !data) {
    return defaultValue;
  }
  
  return data.value;
};

/**
 * Obtiene el TTL de redención configurado (RF-19, default 10 min)
 * @param supabase Cliente Supabase
 * @returns TTL en minutos
 */
export const getRedemptionTtlMinutes = async (supabase: any): Promise<number> => {
  const ttlStr = await getAppSetting(supabase, 'redemption_ttl_minutes', '10');
  return parseInt(ttlStr, 10) || 10;
};

/**
 * Obtiene la duración del lockout de redención (ARQ §8.2, default 5 min)
 * @param supabase Cliente Supabase
 * @returns Duración en minutos
 */
export const getRedemptionLockoutMinutes = async (supabase: any): Promise<number> => {
  const lockoutStr = await getAppSetting(supabase, 'redemption_lockout_duration_minutes', '5');
  return parseInt(lockoutStr, 10) || 5;
};

/**
 * Verifica si el sistema está en modo mantenimiento
 * @param supabase Cliente Supabase
 * @returns Boolean modo mantenimiento
 */
export const isMaintenanceMode = async (supabase: any): Promise<boolean> => {
  const mode = await getAppSetting(supabase, 'maintenance_mode', 'false');
  return mode === 'true';
};

/**
 * Actualiza un valor de configuración (solo vía admin/Edge Functions)
 * @param supabase Cliente Supabase con service-role key
 * @param key Clave de configuración
 * @param value Nuevo valor
 * @param updatedBy ID del perfil que realiza el cambio
 */
export const updateAppSetting = async (
  supabase: any,
  key: string,
  value: string,
  updatedBy: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('app_settings')
    .upsert({
      key,
      value,
      updated_by: updatedBy,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
  
  return !error;
};

export const s = {
  getAppSetting,
  getRedemptionTtlMinutes,
  getRedemptionLockoutMinutes,
  isMaintenanceMode,
  updateAppSetting,
};