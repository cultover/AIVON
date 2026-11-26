import type { FacilityCategory, GuestEmotion, VisualProfile } from '../types';

export const HOTEL_LOBBY_HERO_IMAGE = '/src/assets/images/hotel_lobby_hero_1795671116041.jpg';

export const FACILITY_CATEGORY_IMAGES: Record<
  FacilityCategory,
  { src: string; objectPosition: string }
> = {
  rooms: {
    src: '/src/assets/images/facility_rooms_front_1795690532898.jpg',
    objectPosition: '50% 55%',
  },
  fnb: {
    src: '/src/assets/images/facility_fnb_dining_1795690533613.jpg',
    objectPosition: '50% 60%',
  },
  culinary: {
    src: '/src/assets/images/facility_culinary_kitchen_1795690534675.jpg',
    objectPosition: '50% 52%',
  },
  convention: {
    src: '/src/assets/images/facility_convention_hall_1795690571543.jpg',
    objectPosition: '50% 55%',
  },
  pool: {
    src: '/src/assets/images/facility_pool_wellness_1795690535812.jpg',
    objectPosition: '50% 58%',
  },
  rank: {
    src: '/src/assets/images/rank_intern_furious_1795685674401.jpg',
    objectPosition: '52% 20%',
  },
};

interface EmotionVisualAsset {
  src: string;
  objectPosition: string;
  scaleClass: string;
}

export const GUEST_SCENE_IMAGES: Record<VisualProfile, Record<GuestEmotion, EmotionVisualAsset>> = {
  'rooms-male': {
    furious: {
      src: '/src/assets/images/male_guest_furious_1795671116581.jpg',
      objectPosition: '50% 22%',
      scaleClass: 'scale-[1.03]',
    },
    angry: {
      src: '/src/assets/images/male_guest_angry_1795671118207.jpg',
      objectPosition: '50% 20%',
      scaleClass: 'scale-[1.01]',
    },
    skeptical: {
      src: '/src/assets/images/male_guest_angry_1795671118207.jpg',
      objectPosition: '50% 22%',
      scaleClass: 'scale-[1.0]',
    },
    calm: {
      src: '/src/assets/images/male_guest_calm_1795671119038.jpg',
      objectPosition: '62% 20%',
      scaleClass: 'scale-[1.01]',
    },
    satisfied: {
      src: '/src/assets/images/male_guest_satisfied_1795671119913.jpg',
      objectPosition: '50% 18%',
      scaleClass: 'scale-[1.0]',
    },
  },
  'rooms-female': {
    furious: {
      src: '/src/assets/images/female_guest_furious_1795671120864.jpg',
      objectPosition: '50% 20%',
      scaleClass: 'scale-[1.03]',
    },
    angry: {
      src: '/src/assets/images/female_guest_angry_1795671120925.jpg',
      objectPosition: '50% 20%',
      scaleClass: 'scale-[1.01]',
    },
    skeptical: {
      src: '/src/assets/images/female_guest_angry_1795671120925.jpg',
      objectPosition: '50% 22%',
      scaleClass: 'scale-[1.0]',
    },
    calm: {
      src: '/src/assets/images/female_guest_calm_1795671122820.jpg',
      objectPosition: '50% 20%',
      scaleClass: 'scale-[1.01]',
    },
    satisfied: {
      src: '/src/assets/images/female_guest_satisfied_1795671123609.jpg',
      objectPosition: '50% 18%',
      scaleClass: 'scale-[1.0]',
    },
  },
  'rooms-noise': {
    furious: {
      src: '/src/assets/images/noise_guest_furious_1795676791143.jpg',
      objectPosition: '50% 22%',
      scaleClass: 'scale-[1.03]',
    },
    angry: {
      src: '/src/assets/images/noise_guest_furious_1795676791143.jpg',
      objectPosition: '50% 24%',
      scaleClass: 'scale-[1.0]',
    },
    skeptical: {
      src: '/src/assets/images/noise_guest_calm_1795676827080.jpg',
      objectPosition: '50% 22%',
      scaleClass: 'scale-[1.01]',
    },
    calm: {
      src: '/src/assets/images/noise_guest_calm_1795676827080.jpg',
      objectPosition: '50% 20%',
      scaleClass: 'scale-[1.0]',
    },
    satisfied: {
      src: '/src/assets/images/noise_guest_satisfied_1795676849852.jpg',
      objectPosition: '50% 20%',
      scaleClass: 'scale-[1.0]',
    },
  },
  'rooms-vip': {
    furious: {
      src: '/src/assets/images/vip_guest_furious_1795676825790.jpg',
      objectPosition: '50% 20%',
      scaleClass: 'scale-[1.03]',
    },
    angry: {
      src: '/src/assets/images/vip_guest_furious_1795676825790.jpg',
      objectPosition: '50% 22%',
      scaleClass: 'scale-[1.0]',
    },
    skeptical: {
      src: '/src/assets/images/vip_guest_calm_1795676850009.jpg',
      objectPosition: '50% 20%',
      scaleClass: 'scale-[1.01]',
    },
    calm: {
      src: '/src/assets/images/vip_guest_calm_1795676850009.jpg',
      objectPosition: '50% 18%',
      scaleClass: 'scale-[1.0]',
    },
    satisfied: {
      src: '/src/assets/images/vip_guest_satisfied_1795676850341.jpg',
      objectPosition: '50% 18%',
      scaleClass: 'scale-[1.0]',
    },
  },
  'fnb-delay': {
    furious: {
      src: '/src/assets/images/fnb_guest_furious_1795675761235.jpg',
      objectPosition: '50% 18%',
      scaleClass: 'scale-[1.03]',
    },
    angry: {
      src: '/src/assets/images/fnb_guest_furious_1795675761235.jpg',
      objectPosition: '50% 20%',
      scaleClass: 'scale-[1.0]',
    },
    skeptical: {
      src: '/src/assets/images/fnb_guest_calm_1795675763387.jpg',
      objectPosition: '50% 20%',
      scaleClass: 'scale-[1.01]',
    },
    calm: {
      src: '/src/assets/images/fnb_guest_calm_1795675763387.jpg',
      objectPosition: '50% 18%',
      scaleClass: 'scale-[1.0]',
    },
    satisfied: {
      src: '/src/assets/images/fnb_guest_satisfied_1795675764446.jpg',
      objectPosition: '50% 20%',
      scaleClass: 'scale-[1.0]',
    },
  },
  'fnb-corkage': {
    furious: {
      src: '/src/assets/images/corkage_guest_furious_1795676792934.jpg',
      objectPosition: '50% 22%',
      scaleClass: 'scale-[1.03]',
    },
    angry: {
      src: '/src/assets/images/corkage_guest_furious_1795676792934.jpg',
      objectPosition: '50% 24%',
      scaleClass: 'scale-[1.0]',
    },
    skeptical: {
      src: '/src/assets/images/corkage_guest_calm_1795676827867.jpg',
      objectPosition: '50% 22%',
      scaleClass: 'scale-[1.01]',
    },
    calm: {
      src: '/src/assets/images/corkage_guest_calm_1795676827867.jpg',
      objectPosition: '50% 20%',
      scaleClass: 'scale-[1.0]',
    },
    satisfied: {
      src: '/src/assets/images/corkage_guest_satisfied_1795676852615.jpg',
      objectPosition: '50% 20%',
      scaleClass: 'scale-[1.0]',
    },
  },
  'culinary-allergy': {
    furious: {
      src: '/src/assets/images/culinary_guest_furious_1795675764894.jpg',
      objectPosition: '50% 22%',
      scaleClass: 'scale-[1.03]',
    },
    angry: {
      src: '/src/assets/images/culinary_guest_furious_1795675764894.jpg',
      objectPosition: '50% 24%',
      scaleClass: 'scale-[1.0]',
    },
    skeptical: {
      src: '/src/assets/images/culinary_guest_calm_1795675764855.jpg',
      objectPosition: '50% 24%',
      scaleClass: 'scale-[1.01]',
    },
    calm: {
      src: '/src/assets/images/culinary_guest_calm_1795675764855.jpg',
      objectPosition: '50% 22%',
      scaleClass: 'scale-[1.0]',
    },
    satisfied: {
      src: '/src/assets/images/culinary_guest_satisfied_1795675765258.jpg',
      objectPosition: '50% 22%',
      scaleClass: 'scale-[1.0]',
    },
  },
  'culinary-grill': {
    furious: {
      src: '/src/assets/images/grill_guest_furious_1795676794736.jpg',
      objectPosition: '55% 18%',
      scaleClass: 'scale-[1.03]',
    },
    angry: {
      src: '/src/assets/images/grill_guest_furious_1795676794736.jpg',
      objectPosition: '55% 20%',
      scaleClass: 'scale-[1.0]',
    },
    skeptical: {
      src: '/src/assets/images/grill_guest_calm_1795676829152.jpg',
      objectPosition: '55% 20%',
      scaleClass: 'scale-[1.01]',
    },
    calm: {
      src: '/src/assets/images/grill_guest_calm_1795676829152.jpg',
      objectPosition: '55% 18%',
      scaleClass: 'scale-[1.0]',
    },
    satisfied: {
      src: '/src/assets/images/grill_guest_satisfied_1795676853024.jpg',
      objectPosition: '55% 18%',
      scaleClass: 'scale-[1.0]',
    },
  },
  'convention-av': {
    furious: {
      src: '/src/assets/images/convention_guest_furious_1795675767683.jpg',
      objectPosition: '54% 20%',
      scaleClass: 'scale-[1.03]',
    },
    angry: {
      src: '/src/assets/images/convention_guest_furious_1795675767683.jpg',
      objectPosition: '54% 22%',
      scaleClass: 'scale-[1.0]',
    },
    skeptical: {
      src: '/src/assets/images/convention_guest_calm_1795675769051.jpg',
      objectPosition: '50% 20%',
      scaleClass: 'scale-[1.01]',
    },
    calm: {
      src: '/src/assets/images/convention_guest_calm_1795675769051.jpg',
      objectPosition: '50% 18%',
      scaleClass: 'scale-[1.0]',
    },
    satisfied: {
      src: '/src/assets/images/convention_guest_satisfied_1795675770233.jpg',
      objectPosition: '50% 20%',
      scaleClass: 'scale-[1.0]',
    },
  },
  'convention-gala': {
    furious: {
      src: '/src/assets/images/gala_guest_furious_1795676796640.jpg',
      objectPosition: '50% 18%',
      scaleClass: 'scale-[1.03]',
    },
    angry: {
      src: '/src/assets/images/gala_guest_furious_1795676796640.jpg',
      objectPosition: '50% 20%',
      scaleClass: 'scale-[1.0]',
    },
    skeptical: {
      src: '/src/assets/images/gala_guest_calm_1795676829852.jpg',
      objectPosition: '50% 20%',
      scaleClass: 'scale-[1.01]',
    },
    calm: {
      src: '/src/assets/images/gala_guest_calm_1795676829852.jpg',
      objectPosition: '50% 18%',
      scaleClass: 'scale-[1.0]',
    },
    satisfied: {
      src: '/src/assets/images/gala_guest_satisfied_1795676856128.jpg',
      objectPosition: '50% 18%',
      scaleClass: 'scale-[1.0]',
    },
  },
  'pool-rules': {
    furious: {
      src: '/src/assets/images/pool_guest_furious_1795675770458.jpg',
      objectPosition: '50% 22%',
      scaleClass: 'scale-[1.03]',
    },
    angry: {
      src: '/src/assets/images/pool_guest_furious_1795675770458.jpg',
      objectPosition: '50% 24%',
      scaleClass: 'scale-[1.0]',
    },
    skeptical: {
      src: '/src/assets/images/pool_guest_calm_1795675772819.jpg',
      objectPosition: '50% 20%',
      scaleClass: 'scale-[1.01]',
    },
    calm: {
      src: '/src/assets/images/pool_guest_calm_1795675772819.jpg',
      objectPosition: '50% 18%',
      scaleClass: 'scale-[1.0]',
    },
    satisfied: {
      src: '/src/assets/images/pool_guest_satisfied_1795675773167.jpg',
      objectPosition: '50% 20%',
      scaleClass: 'scale-[1.0]',
    },
  },
  'pool-spa': {
    furious: {
      src: '/src/assets/images/spa_guest_furious_1795676796853.jpg',
      objectPosition: '54% 20%',
      scaleClass: 'scale-[1.03]',
    },
    angry: {
      src: '/src/assets/images/spa_guest_furious_1795676796853.jpg',
      objectPosition: '54% 22%',
      scaleClass: 'scale-[1.0]',
    },
    skeptical: {
      src: '/src/assets/images/spa_guest_calm_1795676830048.jpg',
      objectPosition: '54% 20%',
      scaleClass: 'scale-[1.01]',
    },
    calm: {
      src: '/src/assets/images/spa_guest_calm_1795676830048.jpg',
      objectPosition: '54% 18%',
      scaleClass: 'scale-[1.0]',
    },
    satisfied: {
      src: '/src/assets/images/spa_guest_satisfied_1795676855353.jpg',
      objectPosition: '54% 18%',
      scaleClass: 'scale-[1.0]',
    },
  },
  'rank-intern': {
    furious: {
      src: '/src/assets/images/rank_intern_furious_1795685674401.jpg',
      objectPosition: '52% 20%',
      scaleClass: 'scale-[1.03]',
    },
    angry: {
      src: '/src/assets/images/rank_intern_furious_1795685674401.jpg',
      objectPosition: '52% 22%',
      scaleClass: 'scale-[1.0]',
    },
    skeptical: {
      src: '/src/assets/images/rank_intern_calm_1795685632053.jpg',
      objectPosition: '52% 20%',
      scaleClass: 'scale-[1.01]',
    },
    calm: {
      src: '/src/assets/images/rank_intern_calm_1795685632053.jpg',
      objectPosition: '52% 18%',
      scaleClass: 'scale-[1.0]',
    },
    satisfied: {
      src: '/src/assets/images/rank_intern_satisfied_1795685623898.jpg',
      objectPosition: '50% 18%',
      scaleClass: 'scale-[1.0]',
    },
  },
  'rank-senior': {
    furious: {
      src: '/src/assets/images/rank_senior_furious_1795685625048.jpg',
      objectPosition: '50% 20%',
      scaleClass: 'scale-[1.03]',
    },
    angry: {
      src: '/src/assets/images/rank_senior_furious_1795685625048.jpg',
      objectPosition: '50% 22%',
      scaleClass: 'scale-[1.0]',
    },
    skeptical: {
      src: '/src/assets/images/rank_senior_calm_1795685674913.jpg',
      objectPosition: '50% 20%',
      scaleClass: 'scale-[1.01]',
    },
    calm: {
      src: '/src/assets/images/rank_senior_calm_1795685674913.jpg',
      objectPosition: '50% 18%',
      scaleClass: 'scale-[1.0]',
    },
    satisfied: {
      src: '/src/assets/images/rank_senior_satisfied_1795685675930.jpg',
      objectPosition: '50% 18%',
      scaleClass: 'scale-[1.0]',
    },
  },
  'rank-manager': {
    furious: {
      src: '/src/assets/images/rank_manager_furious_1795685678681.jpg',
      objectPosition: '50% 20%',
      scaleClass: 'scale-[1.03]',
    },
    angry: {
      src: '/src/assets/images/rank_manager_furious_1795685678681.jpg',
      objectPosition: '50% 22%',
      scaleClass: 'scale-[1.0]',
    },
    skeptical: {
      src: '/src/assets/images/rank_manager_calm_1795685712468.jpg',
      objectPosition: '50% 20%',
      scaleClass: 'scale-[1.01]',
    },
    calm: {
      src: '/src/assets/images/rank_manager_calm_1795685712468.jpg',
      objectPosition: '50% 18%',
      scaleClass: 'scale-[1.0]',
    },
    satisfied: {
      src: '/src/assets/images/rank_manager_satisfied_1795685714940.jpg',
      objectPosition: '50% 18%',
      scaleClass: 'scale-[1.0]',
    },
  },
  'rank-gm': {
    furious: {
      src: '/src/assets/images/rank_gm_furious_1795685716777.jpg',
      objectPosition: '56% 20%',
      scaleClass: 'scale-[1.03]',
    },
    angry: {
      src: '/src/assets/images/rank_gm_furious_1795685716777.jpg',
      objectPosition: '56% 22%',
      scaleClass: 'scale-[1.0]',
    },
    skeptical: {
      src: '/src/assets/images/rank_gm_calm_1795685743156.jpg',
      objectPosition: '56% 20%',
      scaleClass: 'scale-[1.01]',
    },
    calm: {
      src: '/src/assets/images/rank_gm_calm_1795685743156.jpg',
      objectPosition: '56% 18%',
      scaleClass: 'scale-[1.0]',
    },
    satisfied: {
      src: '/src/assets/images/rank_gm_satisfied_1795685744981.jpg',
      objectPosition: '56% 18%',
      scaleClass: 'scale-[1.0]',
    },
  },
};

export const EMOTION_META: Record<
  GuestEmotion,
  {
    label: string;
    description: string;
    accentColor: string;
    barColor: string;
    vignetteClass: string;
  }
> = {
  furious: {
    label: '격앙 · 분노',
    description: '고객이 매우 흥분하여 항의 중입니다',
    accentColor: 'text-rose-300',
    barColor: 'bg-rose-500',
    vignetteClass: 'shadow-[inset_0_0_120px_rgba(225,29,72,0.38)]',
  },
  angry: {
    label: '불만 · 날카로움',
    description: '고객의 불신이 깊고 방어적인 상태입니다',
    accentColor: 'text-orange-300',
    barColor: 'bg-orange-500',
    vignetteClass: 'shadow-[inset_0_0_90px_rgba(234,88,12,0.24)]',
  },
  skeptical: {
    label: '경계 · 관망',
    description: '고객이 응대 내용을 지켜보고 있습니다',
    accentColor: 'text-amber-200',
    barColor: 'bg-amber-400',
    vignetteClass: 'shadow-[inset_0_0_70px_rgba(245,158,11,0.14)]',
  },
  calm: {
    label: '진정 · 수긍',
    description: '고객의 화가 가라앉고 차분해졌습니다',
    accentColor: 'text-sky-200',
    barColor: 'bg-sky-400',
    vignetteClass: 'shadow-[inset_0_0_70px_rgba(56,189,248,0.12)]',
  },
  satisfied: {
    label: '만족 · 신뢰 회복',
    description: '고객이 프로페셔널한 응대에 만족했습니다',
    accentColor: 'text-emerald-300',
    barColor: 'bg-emerald-400',
    vignetteClass: 'shadow-[inset_0_0_90px_rgba(16,185,129,0.22)]',
  },
};
