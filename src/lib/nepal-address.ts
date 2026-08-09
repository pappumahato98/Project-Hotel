/**
 * Nepal Provinces & Districts — Complete reference data
 *
 * Nepal has 7 Provinces (Pardesh) established by the 2015 Constitution,
 * and 77 Districts (Zilla) mapped to their respective provinces.
 *
 * Reference: Constitution of Nepal (2015), Article 56–61
 */

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface NepalDistrict {
  /** District name in English */
  name: string
  /** District name in Nepali (Devanagari) */
  nameNe?: string
}

export interface NepalProvince {
  /** Province number (1–7) */
  id: number
  /** Province name in English */
  name: string
  /** Province name in Nepali (Devanagari) */
  nameNe?: string
  /** Provincial capital (headquarter city) */
  capital: string
  /** Districts within this province */
  districts: NepalDistrict[]
}

// ═══════════════════════════════════════════════════════════════════════
// DATA — 7 Provinces, 77 Districts
// ═══════════════════════════════════════════════════════════════════════

/**
 * Complete list of Nepal's 7 provinces with all 77 districts.
 *
 * Notes:
 *  - Rukum was split: Rukum (East) → Lumbini, Rukum (West) → Karnali
 *  - Nawalparasi was split: Parasi → Lumbini, Nawalpur → Gandaki
 */
export const NEPAL_PROVINCES: NepalProvince[] = [
  // ───────────────────────────────────────────────────────────────────
  // Province 1 (formerly Eastern Development Region)
  // Capital: Dhankuta (provisional), Biratnagar is the largest city
  // ───────────────────────────────────────────────────────────────────
  {
    id: 1,
    name: 'Province 1',
    nameNe: 'प्रदेश १',
    capital: 'Dhankuta',
    districts: [
      { name: 'Bhojpur', nameNe: 'भोजपुर' },
      { name: 'Dhankuta', nameNe: 'धनकुटा' },
      { name: 'Ilam', nameNe: 'इलाम' },
      { name: 'Jhapa', nameNe: 'झापा' },
      { name: 'Khotang', nameNe: 'खोटाङ' },
      { name: 'Morang', nameNe: 'मोरङ' },
      { name: 'Okhaldhunga', nameNe: 'ओखलढुङ्गा' },
      { name: 'Panchthar', nameNe: 'पाँचथर' },
      { name: 'Sankhuwasabha', nameNe: 'सङ्खुवासभा' },
      { name: 'Solukhumbhu', nameNe: 'सोलुखुम्बु' },
      { name: 'Sunsari', nameNe: 'सुनसरी' },
      { name: 'Taplejung', nameNe: 'ताप्लेजुङ' },
      { name: 'Terhathum', nameNe: 'तेह्रथुम' },
      { name: 'Udayapur', nameNe: 'उदयपुर' },
    ],
  },

  // ───────────────────────────────────────────────────────────────────
  // Madhesh Province (formerly Central–Southern Terai region)
  // Capital: Janakpur
  // ───────────────────────────────────────────────────────────────────
  {
    id: 2,
    name: 'Madhesh Province',
    nameNe: 'मधेस प्रदेश',
    capital: 'Janakpur',
    districts: [
      { name: 'Bara', nameNe: 'बरा' },
      { name: 'Dhanusa', nameNe: 'धनुषा' },
      { name: 'Mahottari', nameNe: 'महोत्तरी' },
      { name: 'Parsa', nameNe: 'पर्सा' },
      { name: 'Rautahat', nameNe: 'रौतहट' },
      { name: 'Sarlahi', nameNe: 'सर्लाही' },
      { name: 'Saptari', nameNe: 'सप्तरी' },
      { name: 'Siraha', nameNe: 'सिराहा' },
    ],
  },

  // ───────────────────────────────────────────────────────────────────
  // Bagmati Province (Central Nepal including Kathmandu Valley)
  // Capital: Hetauda (provisional); Kathmandu is the largest city
  // ───────────────────────────────────────────────────────────────────
  {
    id: 3,
    name: 'Bagmati Province',
    nameNe: 'बागमती प्रदेश',
    capital: 'Hetauda',
    districts: [
      { name: 'Bhaktapur', nameNe: 'भक्तपुर' },
      { name: 'Chitwan', nameNe: 'चितवन' },
      { name: 'Dhading', nameNe: 'धादिङ' },
      { name: 'Dolakha', nameNe: 'दोलखा' },
      { name: 'Kavrepalanchok', nameNe: 'काभ्रेपलाञ्चोक' },
      { name: 'Kathmandu', nameNe: 'काठमाडौं' },
      { name: 'Lalitpur', nameNe: 'ललितपुर' },
      { name: 'Makwanpur', nameNe: 'मकवानपुर' },
      { name: 'Nuwakot', nameNe: 'नुवाकोट' },
      { name: 'Rasuwa', nameNe: 'रसुवा' },
      { name: 'Ramechhap', nameNe: 'रामेछाप' },
      { name: 'Sindhuli', nameNe: 'सिन्धुली' },
      { name: 'Sindhupalchok', nameNe: 'सिन्धुपाल्चोक' },
    ],
  },

  // ───────────────────────────────────────────────────────────────────
  // Gandaki Province (formerly Western Development Region)
  // Capital: Pokhara
  // ───────────────────────────────────────────────────────────────────
  {
    id: 4,
    name: 'Gandaki Province',
    nameNe: 'गण्डकी प्रदेश',
    capital: 'Pokhara',
    districts: [
      { name: 'Baglung', nameNe: 'बागलुङ' },
      { name: 'Gorkha', nameNe: 'गोरखा' },
      { name: 'Kaski', nameNe: 'कास्की' },
      { name: 'Lamjung', nameNe: 'लमजुङ' },
      { name: 'Manang', nameNe: 'मनाङ' },
      { name: 'Mustang', nameNe: 'मुस्ताङ' },
      { name: 'Myagdi', nameNe: 'म्याग्दी' },
      { name: 'Nawalpur', nameNe: 'नवलपुर' },
      { name: 'Parbat', nameNe: 'पर्वत' },
      { name: 'Syangja', nameNe: 'स्याङ्जा' },
      { name: 'Tanahu', nameNe: 'तनहुँ' },
    ],
  },

  // ───────────────────────────────────────────────────────────────────
  // Lumbini Province (formerly Mid-Western + parts of Western Terai)
  // Capital: Butwal (provisional); Siddharthanagar/Bhairahawa is nearby
  // ───────────────────────────────────────────────────────────────────
  {
    id: 5,
    name: 'Lumbini Province',
    nameNe: 'लुम्बिनी प्रदेश',
    capital: 'Butwal',
    districts: [
      { name: 'Arghakhanchi', nameNe: 'अर्घाखाँची' },
      { name: 'Banke', nameNe: 'बाँके' },
      { name: 'Bardiya', nameNe: 'बर्दिया' },
      { name: 'Dang', nameNe: 'दाङ' },
      { name: 'Gulmi', nameNe: 'गुल्मी' },
      { name: 'Kapilvastu', nameNe: 'कपिलवस्तु' },
      { name: 'Parasi', nameNe: 'परासी' },
      { name: 'Palpa', nameNe: 'पाल्पा' },
      { name: 'Pyuthan', nameNe: 'प्युठान' },
      { name: 'Rolpa', nameNe: 'रोल्पा' },
      { name: 'Rukum (East)', nameNe: 'रुकुम (पूर्वी)' },
      { name: 'Rupandehi', nameNe: 'रूपन्देही' },
    ],
  },

  // ───────────────────────────────────────────────────────────────────
  // Karnali Province (formerly Mid-Western mountain region)
  // Capital: Birendranagar, Surkhet
  // ───────────────────────────────────────────────────────────────────
  {
    id: 6,
    name: 'Karnali Province',
    nameNe: 'कर्णाली प्रदेश',
    capital: 'Birendranagar',
    districts: [
      { name: 'Dailekh', nameNe: 'दैलेख' },
      { name: 'Dolpa', nameNe: 'डोल्पा' },
      { name: 'Humla', nameNe: 'हुम्ला' },
      { name: 'Jajarkot', nameNe: 'जाजरकोट' },
      { name: 'Jumla', nameNe: 'जुम्ला' },
      { name: 'Kalikot', nameNe: 'कालिकोट' },
      { name: 'Mugu', nameNe: 'मुगु' },
      { name: 'Rukum (West)', nameNe: 'रुकुम (पश्चिम)' },
      { name: 'Salyan', nameNe: 'सल्यान' },
      { name: 'Surkhet', nameNe: 'सुर्खेत' },
    ],
  },

  // ───────────────────────────────────────────────────────────────────
  // Sudurpashchim Province (Far-Western)
  // Capital: Dhangadhi
  // ───────────────────────────────────────────────────────────────────
  {
    id: 7,
    name: 'Sudurpashchim Province',
    nameNe: 'सुदूरपश्चिम प्रदेश',
    capital: 'Dhangadhi',
    districts: [
      { name: 'Accham', nameNe: 'अछाम' },
      { name: 'Baitadi', nameNe: 'बैतडी' },
      { name: 'Bajhang', nameNe: 'बाझाङ' },
      { name: 'Bajura', nameNe: 'बाजुरा' },
      { name: 'Dadeldhura', nameNe: 'दाडेलधुरा' },
      { name: 'Darchula', nameNe: 'दार्चुला' },
      { name: 'Doti', nameNe: 'डोटी' },
      { name: 'Kailali', nameNe: 'कैलाली' },
      { name: 'Kanchanpur', nameNe: 'कञ्चनपुर' },
    ],
  },
]

// ═══════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get all districts belonging to a province by province name (English).
 *
 * @example
 * getDistrictsByProvince('Bagmati Province')
 * // → [{ name: 'Bhaktapur', ... }, { name: 'Chitwan', ... }, ...]
 *
 * getDistrictsByProvince('Bagmati')  // partial match works too
 * // → same result
 */
export function getDistrictsByProvince(provinceName: string): NepalDistrict[] {
  const nameLower = provinceName.toLowerCase().trim()
  const province = NEPAL_PROVINCES.find(
    (p) => p.name.toLowerCase() === nameLower || p.name.toLowerCase().includes(nameLower)
  )
  return province?.districts ?? []
}

/**
 * Get a flat list of all 77 district names across all provinces.
 *
 * @example
 * getAllDistricts()
 * // → ['Bhojpur', 'Dhankuta', 'Ilam', ..., 'Kanchanpur']
 */
export function getAllDistricts(): string[] {
  return NEPAL_PROVINCES.flatMap((p) => p.districts.map((d) => d.name))
}

/**
 * Find the province that contains a given district.
 * Returns `undefined` if the district name is not found.
 *
 * @example
 * getProvinceByDistrict('Pokhara')  // undefined (Pokhara is a city, not a district)
 * getProvinceByDistrict('Kaski')     // { id: 4, name: 'Gandaki Province', ... }
 */
export function getProvinceByDistrict(districtName: string): NepalProvince | undefined {
  const nameLower = districtName.toLowerCase().trim()
  return NEPAL_PROVINCES.find((p) =>
    p.districts.some((d) => d.name.toLowerCase() === nameLower)
  )
}
