/**
 * Способы получения, которых нет ни в рецептах, ни в таблицах добычи:
 * игра выдаёт эти предметы своим кодом. Список ведётся вручную и
 * проверяется отчётом покрытия — если у предмета появится настоящая
 * таблица, дубликат сразу будет виден.
 */

export interface SpecialSource {
  /** Идентификатор получаемого предмета. */
  result: string
  /** Ключ описания; перевод — в src/i18n/index.ts. */
  note: string
  /** Что показать в слоте источника. */
  icon?: string
}

/** Проверено для версий: */
export const VERIFIED_FOR = ['26.2', '26.1.2', '1.21.11']

export const SPECIAL_SOURCES: SpecialSource[] = [
  { result: 'nether_star', note: 'wither_drop', icon: 'wither_skeleton_skull' },
  { result: 'elytra', note: 'end_ship_frame', icon: 'item_frame' },
  { result: 'dragon_breath', note: 'bottle_dragon_breath', icon: 'glass_bottle' },

  // Ведро на существе или жидкости.
  { result: 'water_bucket', note: 'bucket_fill', icon: 'bucket' },
  { result: 'lava_bucket', note: 'bucket_fill', icon: 'bucket' },
  { result: 'powder_snow_bucket', note: 'bucket_fill', icon: 'bucket' },
  { result: 'milk_bucket', note: 'bucket_cow', icon: 'bucket' },
  { result: 'cod_bucket', note: 'bucket_mob', icon: 'bucket' },
  { result: 'salmon_bucket', note: 'bucket_mob', icon: 'bucket' },
  { result: 'pufferfish_bucket', note: 'bucket_mob', icon: 'bucket' },
  { result: 'tropical_fish_bucket', note: 'bucket_mob', icon: 'bucket' },
  { result: 'axolotl_bucket', note: 'bucket_mob', icon: 'bucket' },
  { result: 'tadpole_bucket', note: 'bucket_mob', icon: 'bucket' },
  { result: 'sulfur_cube_bucket', note: 'bucket_fill', icon: 'bucket' },

  // Кладут сами существа.
  { result: 'frogspawn', note: 'frog_lays', icon: 'frog_spawn_egg' },
  { result: 'blue_egg', note: 'chicken_lays', icon: 'chicken_spawn_egg' },
  { result: 'brown_egg', note: 'chicken_lays', icon: 'chicken_spawn_egg' },

  // Генерация мира и зловещие хранилища.
  { result: 'suspicious_sand', note: 'worldgen_only', icon: 'sand' },
  { result: 'suspicious_gravel', note: 'worldgen_only', icon: 'gravel' },
  { result: 'flow_pottery_sherd', note: 'ominous_vault', icon: 'trial_key' },
  { result: 'guster_pottery_sherd', note: 'ominous_vault', icon: 'trial_key' },
  { result: 'scrape_pottery_sherd', note: 'ominous_vault', icon: 'trial_key' },
]
